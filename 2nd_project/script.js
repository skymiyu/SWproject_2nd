// 뉴스 요약 (빠른 뉴스) 처리
function handleSubmit() {
    const url = document.getElementById('news-url').value.trim();
    const text = document.getElementById('news-text').value.trim();
    const articleText = document.getElementById("article-text");
    const summaryText = document.getElementById("summary-text");
    
    if (!url && !text) {
      alert("URL 또는 뉴스 본문 중 하나는 입력해야 합니다.");
      return;
    }
    
    hideAllMain();
    document.getElementById('article-box').style.display = "block";
    document.getElementById('result-box').style.display = "block";
    
    if (url) {
      articleText.textContent = "[크롤링한 뉴스 기사 본문입니다 - 예시]";
    } else {
      articleText.textContent = text;
    }
    
    summaryText.textContent = "요약 중입니다...";
    setTimeout(() => {
      summaryText.textContent = "삼성전자는 1분기 사상 최대 실적을 기록하며 글로벌 시장에서 주목받고 있습니다.";
    }, 1000);
  }
  
  function resetForm() {
    hideAllMain();
    document.getElementById('form-box').style.display = "block";
    document.getElementById('news-url').value = "";
    document.getElementById('news-text').value = "";
  }
  
  // 여러 뉴스 요약 처리
  function handleMultiSubmit() {
    const multiNewsUrls = document.getElementById('multi-news-url').value.trim();
    if (!multiNewsUrls) {
      alert("뉴스 URL을 입력하세요.");
      return;
    }
    hideAllMain();
    document.getElementById('multi-result-box').style.display = "block";
    let container = document.getElementById('multi-summary-container');
    container.innerHTML = "";
    let urls = multiNewsUrls.split(/[\n,]+/);
    urls.forEach((url, index) => {
      let div = document.createElement('div');
      div.className = "summary-box";
      div.innerHTML = `<h3>기사 ${index + 1} 원문</h3>
                       <p>[기사 본문 예시]</p>
                       <h3>요약 결과</h3>
                       <p>[요약 내용 예시]</p>`;
      container.appendChild(div);
    });
  }
  
  function resetMultiForm() {
    hideAllMain();
    document.getElementById('multi-form-box').style.display = "block";
    document.getElementById('multi-news-url').value = "";
  }
  
  // 도움말 및 제작자 연락처 페이지 처리
  function openHelpPage() {
    hideAllMain();
    document.getElementById('help-box').style.display = "block";
  }
  
  function openContactPage() {
    hideAllMain();
    document.getElementById('contact-box').style.display = "block";
  }
  
  function backToDefault() {
    hideAllMain();
    document.getElementById('form-box').style.display = "block";
  }
  
  // 모든 메인 영역 숨기기
  function hideAllMain() {
    const mains = document.getElementsByClassName('main');
    for (let i = 0; i < mains.length; i++) {
      mains[i].style.display = "none";
    }
  }
  
  // 로그인/회원가입/계정 복구 모달 처리
  function openAuthModal() {
    document.getElementById('auth-modal').style.display = 'flex';
    showLoginStep(); // 기본은 로그인 화면
  }
  
  function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
  }
  
  // 모달 내 단계 전환
  function showLoginStep() {
    document.getElementById('login-step').style.display = 'block';
    document.getElementById('signup-step1').style.display = 'none';
    document.getElementById('signup-step2').style.display = 'none';
    document.getElementById('recover-step').style.display = 'none';
  }
  
  function showSignupStep() {
    document.getElementById('login-step').style.display = 'none';
    document.getElementById('signup-step1').style.display = 'block';
    document.getElementById('signup-step2').style.display = 'none';
    document.getElementById('recover-step').style.display = 'none';
  }
  
  function showSignupAuthStep() {
    document.getElementById('login-step').style.display = 'none';
    document.getElementById('signup-step1').style.display = 'none';
    document.getElementById('signup-step2').style.display = 'block';
    document.getElementById('recover-step').style.display = 'none';
  }
  
  function showRecoverStep() {
    document.getElementById('login-step').style.display = 'none';
    document.getElementById('signup-step1').style.display = 'none';
    document.getElementById('signup-step2').style.display = 'none';
    document.getElementById('recover-step').style.display = 'block';
  }
  
  // 로그인 처리
  function handleLogin() {
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value.trim();
    if (!email || !password) {
      alert("모든 필드를 입력해주세요.");
      return;
    }
    alert("로그인 시도!");
    closeAuthModal();
  }
  
  // 회원가입 처리 (1단계)
  function handleSignup() {
    var email = document.getElementById('signup-email').value.trim();
    var password = document.getElementById('signup-password').value.trim();
    var confirm = document.getElementById('signup-confirm').value.trim();
    if (!email || !password || !confirm) {
      alert("모든 필드를 입력해주세요.");
      return;
    }
    if (password !== confirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    showSignupAuthStep();
  }
  
  // 인증 코드 처리 (회원가입 2단계)
  function handleAuthCode() {
    var code = document.getElementById('auth-code-input').value.trim();
    if (!code) {
      alert("인증 코드를 입력하세요.");
      return;
    }
    alert("인증이 완료되었습니다. 회원가입이 완료되었습니다!");
    closeAuthModal();
  }
  
  // 계정 복구 처리
  function handleRecover() {
    var email = document.getElementById('recover-email').value.trim();
    if (!email) {
      alert("이메일을 입력해주세요.");
      return;
    }
    alert("계정 복구 이메일이 전송되었습니다. 이메일을 확인해주세요.");
    closeAuthModal();
  }
  
  // 모달 내 화면 전환
  function switchToSignup(event) {
    event.preventDefault();
    showSignupStep();
  }
  
  function switchToLogin(event) {
    event.preventDefault();
    showLoginStep();
  }
  
  function switchToRecover(event) {
    event.preventDefault();
    showRecoverStep();
  }
  
  // 사이드바 내 빠른 뉴스, 여러 뉴스 요약 화면 전환
  function handleQuickSummary() {
    hideAllMain();
    document.getElementById('form-box').style.display = "block";
  }
  
  function handleMultipleSummary() {
    hideAllMain();
    document.getElementById('multi-form-box').style.display = "block";
  }
  
