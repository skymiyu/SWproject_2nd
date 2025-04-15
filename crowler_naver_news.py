import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import time

# import sys
# import io
# sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')


import firebase_admin
from firebase_admin import credentials, firestore

import torch
from transformers import PreTrainedTokenizerFast, BartForConditionalGeneration

from datetime import datetime, timezone

from google.cloud.firestore_v1 import SERVER_TIMESTAMP

# 1. Firebase 초기화
cred = credentials.Certificate("asdf-be988-firebase-adminsdk-fbsvc-632c3f45b4.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# 2. KoBART 모델 로딩
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
tokenizer = PreTrainedTokenizerFast.from_pretrained("digit82/kobart-summarization")
model = BartForConditionalGeneration.from_pretrained("digit82/kobart-summarization").to(device)

def summarize_text(text, max_length=256, min_length=64):
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=512
    ).to(device)

    summary_ids = model.generate(
        inputs["input_ids"],
        max_length=max_length,
        min_length=min_length,
        num_beams=4,
        length_penalty=1.2,
        early_stopping=True
    )
    summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    return summary

# 3. 뉴스 크롤링 함수
def crawl_naver_news_auto(url):
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return {"error": f"요청 실패: {response.status_code}"}

        soup = BeautifulSoup(response.text, 'html.parser')

        title_candidates = [
            'h2#title_area span',
            'h3#articleTitle',
            'div.media_end_head_title',
        ]
        title = None
        for selector in title_candidates:
            title_tag = soup.select_one(selector)
            if title_tag:
                title = title_tag.get_text(strip=True)
                break
        if not title:
            title = "제목 추출 실패"

        content_candidates = [
            'article#dic_area',
            'div#articleBodyContents',
            'div#newsct_article',
        ]
        content = None
        for selector in content_candidates:
            content_tag = soup.select_one(selector)
            if content_tag:
                content = content_tag.get_text(separator="\n", strip=True)
                break
        if not content:
            content = "본문 추출 실패"

        return {
            "title": title,
            "content": content
        }

    except Exception as e:
        return {"error": str(e)}

# 4. 카테고리별 기사 URL
categories = {
    "정치": "https://news.naver.com/main/list.naver?mode=LSD&mid=shm&sid1=100",
    "경제": "https://news.naver.com/main/list.naver?mode=LSD&mid=shm&sid1=101",
    "사회": "https://news.naver.com/main/list.naver?mode=LSD&mid=shm&sid1=102",
    "생활/문화": "https://news.naver.com/main/list.naver?mode=LSD&mid=shm&sid1=103",
    "세계": "https://news.naver.com/main/list.naver?mode=LSD&mid=shm&sid1=104",
    "IT/과학": "https://news.naver.com/main/list.naver?mode=LSD&mid=shm&sid1=105"
}

# 5. 뉴스 URL 추출
def get_article_urls_from_category(category_url, limit=3):
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(category_url, headers=headers)
    soup = BeautifulSoup(res.text, 'html.parser')

    urls = []
    for a in soup.select("ul.type06_headline a") + soup.select("ul.type06 a"):
        href = a.get('href')
        if href and '/article/' in href:
            full_url = urljoin(category_url, href)
            if full_url not in urls:
                urls.append(full_url)
        if len(urls) >= limit:
            break
    return urls

# 6. 메인 실행
def main():
    for category, cat_url in categories.items():
        article_urls = get_article_urls_from_category(cat_url, limit=3)
        for url in article_urls:
            # 중복 확인
            existing = db.collection("naver_news").where("url", "==", url).get()
            if len(existing) > 0:
                continue

            article_data = crawl_naver_news_auto(url)
            if "error" not in article_data:
                title = article_data["title"]
                content = article_data["content"]

                summary = summarize_text(content) if content != "본문 추출 실패" else "본문 추출 실패"

                doc = {
                    "category": category,
                    "title": title,
                    "content": content,
                    "summary": summary,
                    "url": url,
                    "createdAt": datetime.now(timezone.utc)
                }

                db.collection("naver_news").add(doc)
            time.sleep(1)

    print(" 크롤링 완료")

if __name__ == "__main__":
    main()
    print("크롤링 완료", flush=True)