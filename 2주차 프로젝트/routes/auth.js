const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const router = express.Router();

const db = admin.firestore();

// 회원가입
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "이메일과 비밀번호 필요" });
  try {
    const userDoc = await db.collection('users').doc(email).get();
    if (userDoc.exists) return res.status(400).json({ error: "이미 존재하는 사용자입니다." });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { email, password: hashedPassword, createdAt: new Date().toISOString() };
    await db.collection('users').doc(email).set(newUser);
    res.json({ message: "회원가입 성공", user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "회원가입 실패" });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "이메일과 비밀번호 필요" });
  try {
    const userDoc = await db.collection('users').doc(email).get();
    if (!userDoc.exists) return res.status(400).json({ error: "사용자를 찾을 수 없습니다." });
    
    const user = userDoc.data();
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "비밀번호가 틀렸습니다." });
    
    const token = jwt.sign({ id: email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "로그인 성공", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "로그인 실패" });
  }
});

module.exports = router;
