const express = require('express');
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports = (db) => {
  const router = express.Router();

  // ✅ 1. 인증코드 전송 + 유저 정보 임시 저장
  router.post('/send-code', async (req, res) => {
    const { email, nickname, password } = req.body;
    if (!email || !nickname || !password) {
      return res.status(400).json({ error: "이메일, 닉네임, 비밀번호가 필요합니다." });
    }

    // 이메일 중복 확인
    const existingUser = await db.collection("users").doc(email).get();
    if (existingUser.exists) {
      return res.status(400).json({ error: "이미 가입된 이메일입니다." });
    }


    const code = crypto.randomInt(100000, 999999).toString();

    try {
      // 인증코드 + 유저 정보 Firestore에 임시 저장
      await db.collection("email_verifications").doc(email).set({
        code,
        nickname,
        password, // ⚠️ 임시 저장이므로 인증 성공 후에 해시 처리
        createdAt: new Date().toISOString()
      });

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: `"IntelliText 뉴스" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "회원가입 인증 코드",
        text: `아래 인증 코드를 입력해주세요:\n\n${code}\n\n(5분 내에 입력해주세요)`
      });

      res.json({ message: "인증 코드가 전송되었습니다." });
    } catch (err) {
      console.error("코드 전송 오류:", err);
      res.status(500).json({ error: "이메일 전송 실패" });
    }
  });

  // ✅ 2. 인증 코드 확인 + 실제 회원가입 처리
  router.post('/verify-code', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "이메일과 코드가 필요합니다." });

    try {
      const docRef = db.collection("email_verifications").doc(email);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(400).json({ error: "인증 요청이 없습니다." });

      const data = doc.data();
      const now = new Date();
      const createdAt = new Date(data.createdAt);
      const diffMinutes = (now - createdAt) / (1000 * 60);

      if (diffMinutes > 5) {
        return res.status(400).json({ error: "인증 코드가 만료되었습니다." });
      }

      if (code !== data.code) {
        return res.status(400).json({ error: "인증 코드가 일치하지 않습니다." });
      }

      // ✅ 여기서 회원가입 실행
      const hashedPassword = await bcrypt.hash(data.password, 10);
      await db.collection("users").doc(email).set({
        email,
        nickname: data.nickname,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      });

      // ✅ 인증 정보 삭제
      await docRef.delete();

      res.json({ message: "회원가입이 완료되었습니다." });
    } catch (err) {
      console.error("인증 오류:", err);
      res.status(500).json({ error: "서버 오류" });
    }
  });

  // ✅ 3. 로그인 처리
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const userRef = await db.collection("users").doc(email).get();
    if (!userRef.exists) return res.status(400).json({ error: "가입된 이메일이 아닙니다." });
  
    const userData = userRef.data();
    const match = await bcrypt.compare(password, userData.password);
    if (!match) return res.status(400).json({ error: "비밀번호가 틀렸습니다." });
  
    const token = jwt.sign({ id: email, nickname: userData.nickname }, process.env.JWT_SECRET, {
      expiresIn: "30m"
    });
  
    res.json({ token });
  });


  // routes/userSettings.js 또는 routes/auth.js 등에서
router.delete('/delete/:email', async (req, res) => {
  const { email } = req.params;

  try {
    // 🔐 사용자 삭제 (users 컬렉션에서 제거)
    await db.collection('users').doc(email).delete();

    // 🔐 인증 관련 문서 제거 (선택적)
    await db.collection('email_verifications').doc(email).delete();

    // 🔐 사용자 요약 데이터 등 추가 삭제 (예시)
    const summaries = await db.collection('summaries').where('email', '==', email).get();
    summaries.forEach(doc => doc.ref.delete());

    res.json({ message: '회원탈퇴가 완료되었습니다.' });
  } catch (err) {
    console.error('회원탈퇴 오류:', err);
    res.status(500).json({ error: '회원탈퇴에 실패했습니다.' });
  }
});
  

  return router;
};
