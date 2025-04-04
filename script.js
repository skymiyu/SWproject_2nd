function handleSubmit() {
  const url = document.getElementById('news-url').value.trim();
  const text = document.getElementById('news-text').value.trim();

  const articleText = document.getElementById("article-text");
  const summaryText = document.getElementById("summary-text");

  if (!url && !text) {
    alert("URL 또는 뉴스 본문 중 하나는 입력해야 합니다.");
    return;
  }

  // 입력 영역 숨기고 결과 영역 표시
  document.getElementById('form-box').style.display = "none";
  document.getElementById('result-box').style.display = "block";

  // 기사 본문 표시
  if (url) {
    articleText.textContent = "[크롤링한 뉴스 기사 본문입니다 - 예시]";
  } else {
    articleText.textContent = text;
  }

  // 요약 처리 (가짜 요약)
  summaryText.textContent = "요약 중입니다...";
  setTimeout(() => {
    summaryText.textContent = "삼성전자는 1분기 사상 최대 실적을 기록하며 글로벌 시장에서 주목받고 있습니다.";
  }, 1000);
}

function resetForm() {
  document.getElementById('form-box').style.display = "block";
  document.getElementById('result-box').style.display = "none";
  document.getElementById('news-url').value = "";
  document.getElementById('news-text').value = "";
}

function openAuthModal() {
  document.getElementById('auth-modal').style.display = 'flex';
  switchToLogin();
}

function closeAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

function switchToSignup(event) {
  event.preventDefault();
  document.getElementById('modal-title').textContent = '회원가입';
  document.querySelector('.modal-content button').textContent = '회원가입';
  document.querySelector('.modal-content p').innerHTML = `
    이미 계정이 있으신가요?
    <a href="#" onclick="switchToLogin(event)">로그인</a>
  `;
}

function switchToLogin(event) {
  if (event) event.preventDefault();
  document.getElementById('modal-title').textContent = '로그인';
  document.querySelector('.modal-content button').textContent = '로그인';
  document.querySelector('.modal-content p').innerHTML = `
    계정이 없으신가요?
    <a href="#" onclick="switchToSignup(event)">회원가입</a>
  `;
}
