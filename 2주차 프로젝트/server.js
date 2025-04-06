require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const summarizeRouter = require('./routes/summarize');
const authRouter = require('./routes/auth');

// Firebase Admin SDK 초기화 (serviceAccountKey.json 파일 경로를 맞춰주세요)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // public 폴더에 프론트엔드 파일 보관

// API 라우터
app.use('/api/summarize', summarizeRouter);
app.use('/api/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
