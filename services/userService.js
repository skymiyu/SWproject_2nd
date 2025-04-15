// services/userService.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = (db) => ({
  signup: async (req, res) => {
    const { nickname, email, password } = req.body;

    // 이메일 인증 여부 확인
    const verification = await db.collection("email_verifications").doc(email).get();
    if (!verification.exists || verification.data().verified !== true) {
      return res.status(400).json({ error: "이메일 인증을 완료해야 가입할 수 있습니다." });
}


    if (!email || !password)
      return res.status(400).json({ error: "닉네임, 이메일, 비밀번호 필요" });

    try {
      const userDoc = await db.collection('users').doc(email).get();
      if (userDoc.exists)
        return res.status(400).json({ error: "이미 존재하는 사용자입니다." });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        nickname,
        email,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      };
      await db.collection('users').doc(email).set(newUser);

      const { password: _, ...safeUser } = newUser;
      res.json({ message: "회원가입 성공", user: safeUser });
    } catch (err) {
      console.error("회원가입 오류:", err);
      res.status(500).json({ error: "회원가입 실패" });
    }
  
    console.log("✅ Firestore 저장 완료:", email);

  },

  login: async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "이메일과 비밀번호 필요" });

    try {
      const userDoc = await db.collection('users').doc(email).get();
      if (!userDoc.exists)
        return res.status(400).json({ error: "사용자를 찾을 수 없습니다." });

      const user = userDoc.data();
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ error: "비밀번호가 틀렸습니다." });

      const token = jwt.sign({ nickname: user.nickname,id: email }, process.env.JWT_SECRET, { expiresIn: "30m" });
      res.json({ message: "로그인 성공", token });
    } catch (err) {
      console.error("로그인 오류:", err);
      res.status(500).json({ error: "로그인 실패" });
    console.log("🔑 JWT_SECRET:", process.env.JWT_SECRET);
    }
    console.log("🔑 JWT_SECRET:", process.env.JWT_SECRET);
  },
});