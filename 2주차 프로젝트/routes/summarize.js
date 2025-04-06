const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "텍스트가 필요합니다." });
  
  const prompt = `다음 기사를 요약해줘:\n\n${text}\n\n요약:`;
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/completions',
      {
         model: "text-davinci-003",
         prompt: prompt,
         max_tokens: 150,
      },
      {
         headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
         }
      }
    );
    const summary = response.data.choices[0].text.trim();
    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "요약 생성에 실패했습니다." });
  }
});

module.exports = router;
