const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');

// 회원가입
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "이메일과 비밀번호 필요" });
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "이미 존재하는 사용자입니다." });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, password: hashedPassword });
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
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "사용자를 찾을 수 없습니다." });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "비밀번호가 틀렸습니다." });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "로그인 성공", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "로그인 실패" });
  }
});

module.exports = router;
