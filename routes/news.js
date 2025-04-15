// news.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // 전체 뉴스 불러오기
  router.get('/news', async (req, res) => {
    try {
      const snapshot = await db.collection('naver_news')
        .orderBy('title').limit(50).get();
      const newsList = snapshot.docs.map(doc => doc.data());
      res.json({ news: newsList });
    } catch (err) {
      console.error('전체 뉴스 불러오기 실패:', err);
      res.status(500).json({ error: '전체 뉴스 불러오기 실패' });
    }
  });

  // 카테고리별 뉴스 불러오기
  router.get('/news/:category', async (req, res) => {
    const category = req.params.category;
    try {
      const snapshot = await db.collection('naver_news')
        .where('category', '==', category)
        .orderBy('title').limit(50).get();
      const newsList = snapshot.docs.map(doc => doc.data());
      res.json({ news: newsList });
    } catch (err) {
      console.error('카테고리 뉴스 불러오기 실패:', err);
      res.status(500).json({ error: '카테고리 뉴스 불러오기 실패' });
    }
  });

  return router;
};
