const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // ✅ 사용자 설정 저장
  router.post('/settings', async (req, res) => {
    const { email, keywords, notifyTime, customPrompt, receiveEmail } = req.body;
  
    console.log("📥 받은 설정 데이터:", req.body);
  
    if (!email) return res.status(400).json({ error: "이메일이 필요합니다." });
  
    try {
      await db.collection('users').doc(email).set({
        ...(keywords !== undefined && { keywords }),
        ...(notifyTime !== undefined && { notifyTime }),
        ...(customPrompt !== undefined && { customPrompt }),
        ...(receiveEmail !== undefined && { receiveEmail }),
        updatedAt: new Date().toISOString()
      }, { merge: true });
  
      res.json({ message: "설정 저장 완료" });
    } catch (err) {
      console.error("🔥 설정 저장 오류:", err);
      res.status(500).json({ error: "설정 저장 실패" });
    }
  });
  

  // ✅ 사용자 설정 불러오기
  router.get('/settings/:email', async (req, res) => {
    const email = req.params.email;
    try {
      const doc = await db.collection('users').doc(email).get();
      if (!doc.exists) {
        return res.status(404).json({ error: "사용자 설정이 없습니다." });
      }
      res.json({ settings: doc.data() });
    } catch (err) {
      console.error("설정 불러오기 오류:", err);
      res.status(500).json({ error: "설정 불러오기 실패" });
    }
  });

    // GET /api/user/reserved-news/:email
    router.get('/reserved-news/:email', async (req, res) => {
        const { email } = req.params;
        try {
        const snapshot = await db.collection('daily_news')
            .where('email', '==', email)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
    
        if (snapshot.empty) return res.json({ articles: [] });
    
        const doc = snapshot.docs[0].data();
        res.json({ articles: doc.articles });
        } catch (err) {
        res.status(500).json({ error: err.message });
        }
    });
    

    
    // routes/userSettings.js 또는 routes/auth.js 등에서
    const bcrypt = require("bcrypt");

    router.delete('/delete/:email', async (req, res) => {
      const { email } = req.params;
      const { password } = req.body;
    
      if (!password) {
        return res.status(400).json({ error: "비밀번호가 필요합니다." });
      }
    
      try {
        const userRef = db.collection("users").doc(email);
        const userSnap = await userRef.get();
    
        if (!userSnap.exists) {
          return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
        }
    
        const userData = userSnap.data();
        const passwordMatch = await bcrypt.compare(password, userData.password);
    
        if (!passwordMatch) {
          return res.status(401).json({ error: "비밀번호가 일치하지 않습니다." });
        }
    
        // ✅ 탈퇴 처리
        await userRef.delete();
    
        res.json({ message: "회원탈퇴 완료" });
      } catch (err) {
        console.error("회원탈퇴 오류:", err);
        res.status(500).json({ error: "서버 오류" });
      }
    });
    

  return router;
};
