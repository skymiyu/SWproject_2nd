require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const express = require('express');
const authRouterFactory = require('./routes/auth');
const serviceAccount = require('./serviceAccountKey.json');

const cron = require('node-cron');
const { PythonShell } = require('python-shell');
const axios = require('axios');
const { JSDOM } = require('jsdom');

const app = express();
const PORT = process.env.PORT || 3000;

const dailyNotifier = require('./dailyNotifier');

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// 미들웨어
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 인증 라우터
app.use('/api/auth', authRouterFactory(db));

/** ------------------ ✅ 요약 저장 ------------------ **/
app.post('/api/summaries/save', async (req, res) => {
  const { email, article, summary } = req.body;
  if (!email || !article || !summary) {
    return res.status(400).json({ error: "이메일, 기사 본문, 요약 내용이 필요합니다." });
  }
  try {
    await db.collection('summaries').add({ email, article, summary, createdAt: new Date() });
    res.json({ message: "요약 저장 완료" });
  } catch (err) {
    console.error("저장 오류:", err);
    res.status(500).json({ error: "요약 저장 실패" });
  }
});

/** ------------------ ✅ 저장된 요약 불러오기 ------------------ **/
app.get('/api/summaries/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const snapshots = await db.collection('summaries').where('email', '==', email).get();
    const summaries = snapshots.docs.map(doc => doc.data());
    res.json({ summaries });
  } catch (err) {
    console.error("불러오기 오류:", err);
    res.status(500).json({ error: "저장된 요약 불러오기 실패" });
  }
});

/** ------------------ ♻ 캐시 객체 ------------------ **/
let newsCache = {};

/** ------------------ 🔥 20개만 보여주는 /api/naver_news ------------------ **/
app.get('/api/naver_news', async (req, res) => {
  const category = decodeURIComponent(req.query.category || "전체");
  const limit = 20;  // 👈 최대 20개

  // 캐시 키
  const cacheKey = `${category}_${limit}`;
  if (newsCache[cacheKey]) {
    console.log(`[cache hit] ${cacheKey}`);
    return res.json({ news: newsCache[cacheKey] });
  }

  try {
    let query = db.collection('naver_news').orderBy('createdAt','desc').limit(limit);
    if (category !== "전체") {
      query = query.where('category','==',category);
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.map(doc => doc.data());

    // 캐시에 저장
    newsCache[cacheKey] = docs;
    console.log(`[cache store] ${cacheKey}`);

    res.json({ news: docs });
  } catch (err) {
    console.error("뉴스 불러오기 실패:", err);
    res.status(500).json({ error: "뉴스 불러오기 실패" });
  }
});

/** ------------------ ✅ 본문 추출 ------------------ **/
app.post('/api/extract-text', async (req, res) => {
  const { url } = req.body;
  try {
    const response = await axios.get(url);
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    const contentElement = document.querySelector('#dic_area') || document.querySelector('article');
    const text = contentElement ? contentElement.textContent.trim() : "";
    if (!text) throw new Error("본문을 찾을 수 없습니다");
    res.json({ text });
  } catch (err) {
    console.error("본문 추출 실패:", err);
    res.status(500).json({ error: "뉴스 본문 추출 실패" });
  }
});

/** ------------------ ✅ 사용자 설정 ------------------ **/
const userSettingsRouter = require('./routes/userSettings')(db);
app.use('/api/user', userSettingsRouter);

// 만약 /api/naver_news_count, /api/naver_news_cursors 등 불필요한 API들은 지워버려도 됨

/** ------------------ ✅ 크롤링 + 캐시 초기화 ------------------ **/
cron.schedule('55,25 * * * *', () => {
  console.log("🕘 Python 크롤링 시작");
  PythonShell.run('crowler_naver_news.py',  { pythonOptions: ['-u'] , mode: 'text'}, async function (err, results) {
    if (err) {
      console.error("❌ Python 실행 오류:", err);
    } else {
      console.log("✅ 크롤링 완료:", results?.join('\n') || '결과 없음');
      clearNewsCache();  // ← 크롤링 후 캐시 초기화
    }
  });
});
// 캐시초기화
cron.schedule("0,30 * * * *", () => {
  clearNewsCache();
});

// emailNotifier 같은 거 필요하면 유지
// cron.schedule('0,6 * * * *', ... ) { ... }
cron.schedule('0,30 * * * *', async () => {
  console.log("📧 이메일 요약 전송 스케줄 실행");
  await dailyNotifier.run();
});

function clearNewsCache() {
  newsCache = {};
  console.log("🧹 [newsCache] 전체 캐시 초기화됨");
}

/** ------------------ ✅ 서버 실행 ------------------ **/
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
