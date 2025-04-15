const { parseStringPromise } = require('xml2js');
const fetch = require('node-fetch');
const nodemailer = require("nodemailer");

function mapStylePrompt(styleKeyword) {
    const style = (styleKeyword || "").trim();
  
    switch (style) {
      case "friend":
        return "친구처럼 뉴스 내용을 반말로, 친근하고 쉽게 설명해줘. 너무 딱딱하지 않게 부탁해.";
      case "boss":
        return "상사처럼 중요한 정보를 빠짐없이 짚어줘. 말투는 단정하고 압축적으로 정리해줘.";
      case "king":
        return "왕처럼 위엄 있고 고풍스럽게 말해줘. 명령하듯 단언하는 어투로 요약해줘.";
      default:
        return "비서처럼 뉴스의 핵심 정보를 간결하고 공손한 말투로 요약해줘. 최대한 깔끔하게 정리해줘.";
    }
  }
  

// ✅ 스타일 프롬프트 생성 (프롬프트 없으면 비서처럼)
function generatePrompt(userPrompt, newsItems) {
    const style = mapStylePrompt(userPrompt);

  const formatGuide = `
아래 형식을 반드시 지켜줘:

1. 제목  
요약  
https://링크

- 링크는 반드시 http로 시작하고 괄호 없이 적어줘.
- 기사마다 빈 줄로 구분해줘.
`;

  const intro = `다음 뉴스 기사들을 ${style} 스타일로 요약해줘.\n${formatGuide}`;
  const newsList = newsItems.map((item, i) => `${i + 1}. ${item.title}\n${item.link}`).join('\n\n');

  return `${intro}\n\n${newsList}`;
}

module.exports = async function runDailyEmailLogic(db) {
  const usersSnapshot = await db.collection('users').get();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const doc of usersSnapshot.docs) {
    const user = doc.data();

    // ❌ notifyTime 없으면 스킵
    if (!user.notifyTime) {
      console.log(`🚫 ${user.email} → notifyTime 없음 → 스킵`);
      continue;
    }

    // ❌ 키워드 없으면 스킵
    if (!Array.isArray(user.keywords) || user.keywords.length === 0) {
      console.log(`🚫 ${user.email} → 키워드 없음 → 스킵`);
      continue;
    }

    // ✅ 중복 실행 방지 (최근 실행 확인)
    if (user.lastNotified) {
      const last = new Date(user.lastNotified);
      const elapsed = (now - last) / (1000 * 60);
      if (elapsed < 30) {
        console.log(`⏳ ${user.email} 최근 실행됨 (${Math.floor(elapsed)}분 전) → 건너뜀`);
        continue;
      }
    }

    // ✅ notifyTime 일치 (±5분 허용)
    const [h, m] = user.notifyTime.split(':').map(Number);
    const userMinutes = h * 60 + m;
    if (Math.abs(nowMinutes - userMinutes) > 5) {
      continue;
    }

    try {
      console.log(`📨 ${user.email} 뉴스 요약 시작`);
    
      const allNews = [];
      for (const keyword of user.keywords) {
        const news = await scrapeGoogleNews(keyword);
        allNews.push(...news);
      }
    
      if (allNews.length === 0) {
        console.log(`⚠️ ${user.email} 뉴스 없음`);
        continue;
      }
    
      const prompt = generatePrompt(user.customPrompt, allNews.slice(0, 6));
      const gptReply = await askGPT(prompt);
      const articles = parseGPTReply(gptReply);
    
      if (articles.length === 0) {
        console.log(`⚠️ ${user.email} 요약 실패`);
        continue;
      }
    
      const detailedArticles = [];
    
      for (const article of articles) {
        detailedArticles.push({
          title: article.title,
          summary: article.summary,
          url: article.link,
          createdAt: new Date().toISOString()
        });
      }
    
      // ✅ 뉴스 DB 저장 (항상 저장)
      await db.collection('daily_news').add({
        email: user.email,
        date: new Date().toISOString().split('T')[0],
        articles: detailedArticles,
        createdAt: new Date()
      });
    
      console.log(`✅ ${user.email} 뉴스 저장 완료`);
    
      // ✅ 이메일 수신 여부 확인 후 전송
      if (user.receiveEmail !== false) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
    
        const mailText = detailedArticles.map((a, i) =>
          `${i + 1}. ${a.title}\n${a.summary}\n${a.url}\n`
        ).join('\n');
    
        await transporter.sendMail({
          from: `"IntelliText 뉴스" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "오늘의 뉴스 요약",
          text: mailText
        });
    
        console.log(`📧 ${user.email} 메일 발송 완료`);
      } else {
        console.log(`📭 ${user.email} → 메일 수신 거부 → 메일 발송 생략`);
      }
    
      // ✅ 마지막 실행 시간 기록
      await db.collection('users').doc(user.email).update({
        lastNotified: new Date()
      });
    
    } catch (err) {
      console.error(`❌ ${user.email} 처리 오류:`, err.message);
    }
    
  }
};

// 📚 뉴스 크롤링
async function scrapeGoogleNews(keyword) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko`;
  const xml = await fetch(url).then(res => res.text());
  const parsed = await parseStringPromise(xml);
  return (parsed.rss.channel[0].item || []).slice(0, 3).map(i => ({
    title: i.title[0],
    link: i.link[0]
  }));
}

// 🤖 GPT 호출
async function askGPT(prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      temperature: 0.7
    })
  });

  const json = await res.json();
  const content = json.choices[0].message.content.trim();
  console.log("🧠 GPT 응답:\n", content);
  return content;
}

// 🧠 GPT 응답 파싱
function parseGPTReply(reply) {
  const blocks = reply.split(/\n{2,}/);
  const articles = [];

  for (let block of blocks) {
    const lines = block.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) continue;

    let title = lines[0]
      .replace(/^\d+\.\s*/, '')
      .replace(/^\*\*(.*)\*\*:?.*$/, '$1')
      .trim();

    const linkMatch = block.match(/https?:\/\/[^\s)]+/);
    const link = linkMatch ? linkMatch[0] : null;

    const summaryLines = lines.filter(line => !line.includes('http'));
    const summary = summaryLines.slice(1).join(' ').trim();

    if (title && summary && link) {
      articles.push({ title, summary, link });
    }
  }

  return articles;
}



// 📧 이메일 전송
// async function sendEmail(to, articles) {
//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASSWORD
//     }
//   });

//   const today = new Date().toLocaleDateString('ko-KR');
//   let html = `<h2>${today} 뉴스 요약입니다.</h2>`;
//   articles.forEach((a, i) => {
//     html += `<p><strong>${i + 1}. <a href="${a.link}" target="_blank">${a.title}</a></strong><br>${a.summary}</p>`;
//   });

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to,
//     subject: `${today} 뉴스 요약`,
//     html
//   });
// }
