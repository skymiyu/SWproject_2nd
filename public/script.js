// 뉴스 요약 (빠른 뉴스) 처리
// 뉴스 요약 (빠른 뉴스) 처리 - GPT 연동
async function handleSubmit() {
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

  summaryText.textContent = "요약 중입니다...";

  try {
    let contentToSummarize = text;

    // ✅ URL 입력 시 서버에서 뉴스 본문 가져오기
    if (url) {
      const res = await fetch("/api/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "본문 추출 실패");
      contentToSummarize = data.text;
    }

    articleText.textContent = contentToSummarize;

    // GPT 요청 (이전 방식 유지)
    const openAIKey = process.env.OPENAI_API_KEY;
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "너는 뉴스 기사를 요약하는 어시스턴트야." },
          { role: "user", content: `다음 뉴스 기사를 요약해줘:\n\n${contentToSummarize}` }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    const gptData = await gptRes.json();
    const gptSummary = gptData.choices[0].message.content.trim();
    summaryText.textContent = gptSummary;

  } catch (err) {
    summaryText.textContent = "[GPT 요약 실패] " + err.message;
  }
}

// 사이드바 숨기기 토글

const iconShow = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" />
  <line x1="6" y1="8" x2="10" y2="8" />
  <line x1="6" y1="12" x2="10" y2="12" />
  <line x1="12" y1="4" x2="12" y2="20" />
</svg>
`;
const iconhide =`
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" />
  <line x1="6" y1="8" x2="10" y2="8" />
  <line x1="6" y1="12" x2="10" y2="12" />
  <line x1="12" y1="4" x2="12" y2="20" />
</svg>
`;


function toggleSidebar(open = null) {
  const sidebar = document.querySelector(".sidebar");
  const toggleButton = document.querySelector("#hide-togle button");
  const mains = document.querySelectorAll(".main");

  let isHidden;
  if (open === null) {
    // 자동 토글
    isHidden = sidebar.classList.toggle("hidden");
  } else if (open === true) {
    sidebar.classList.remove("hidden");
    isHidden = false;
  } else {
    sidebar.classList.add("hidden");
    isHidden = true;
  }

  mains.forEach(main => {
    main.style.marginLeft = isHidden ? "0px" : "100px";
    main.style.marginRight = isHidden ? "200px" : "100px";
  });

  toggleButton.innerHTML = iconShow;


  if (isHidden) {
    createShowToggleButton();
  } else {
    removeShowToggleButton();
  }
}

function createShowToggleButton() {
  if (document.getElementById("show-sidebar-toggle")) return;

  const btn = document.createElement("button");
  btn.id = "show-sidebar-toggle";
  btn.innerHTML = iconhide;
  btn.style.position = "fixed";
  btn.style.top = "20px";
  btn.style.left = "20px";
  btn.style.zIndex = "1000";
  btn.style.padding = "8px";
  btn.style.background = "none";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "6px";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "20px";
  btn.className = "sidebar-toggle-btn";

  btn.onclick = () => {
    toggleSidebar(true); // 사이드바 열기 전용 호출
  };

  document.body.appendChild(btn);
}


function removeShowToggleButton() {
  const btn = document.getElementById("show-sidebar-toggle");
  if (btn) btn.remove();
}




function resetForm() {
  hideAllMain();
  document.getElementById('form-box').style.display = "block";
  document.getElementById('news-url').value = "";
  document.getElementById('news-text').value = "";
}

// 🔁 상태 변수
let currentCategory = "전체";
let currentPage = 0;
let pageCursors = [null]; // 각 페이지별 cursor
let totalPages = 1;
const pageSize = 6;

let fetchedNews = [];
let currentPageIndex = 0;
const ITEMS_PER_PAGE = 5; // 한 페이지에 5개씩 보여줄 예시


// (1) 카테고리  뉴스 보기
function handleMultipleSummary() {
  hideAllMain();
  const mainBox = document.getElementById('multi-form-box');
  mainBox.style.display = "block";
  mainBox.innerHTML = "";

  // 상단 제목
  const selectedCategory = document.createElement('h2');
  selectedCategory.id = 'selected-category';
  selectedCategory.style.textAlign = 'center';
  selectedCategory.style.marginBottom = '15px';
  selectedCategory.textContent = `📰 전체 뉴스`;
  mainBox.appendChild(selectedCategory);

  // 카테고리 버튼들
  const categories = ['전체', '정치', '경제', '사회', '생활/문화', 'IT/과학'];
  const buttonGroup = document.createElement('div');
  buttonGroup.style.display = 'flex';
  buttonGroup.style.flexWrap = 'nowrap';
  buttonGroup.style.gap = '10px';
  buttonGroup.style.marginBottom = '20px';

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'submit';
    btn.textContent = cat;
    btn.onclick = () => {
      document.getElementById('selected-category').textContent = `📰 ${cat} 뉴스`;
      loadCategoryNews(cat);
    };
    buttonGroup.appendChild(btn);
  });
  mainBox.appendChild(buttonGroup);

  // 뉴스 컨테이너
  const newsContainer = document.createElement('div');
  newsContainer.id = 'news-container';
  mainBox.appendChild(newsContainer);

  // 초기 로딩 (전체)
  loadCategoryNews("전체");
}

/**
 * (2) 서버에서 "최신 20개"만 받아오기
 * 서버쪽에서 desc 정렬 + limit(20)로 반환해야 함
 */
async function loadCategoryNews(category) {
  const container = document.getElementById("news-container");
  container.innerHTML = "<p>불러오는 중...</p>";

  try {
    // 서버: /api/naver_news?category=... → 최대 20개 반환
    const encodedCategory = encodeURIComponent(category);
    const res = await fetch(`/api/naver_news?category=${encodedCategory}`);
    const data = await res.json();

    if (!data.news || data.news.length === 0) {
      container.innerHTML = "<p>뉴스가 없습니다.</p>";
      return;
    }

    // 전역 배열에 저장
    fetchedNews = data.news; // 최대 20개
    currentPageIndex = 0;    // 첫 페이지부터

    // 첫 페이지 렌더링
    renderCurrentPage();

  } catch (err) {
    container.innerHTML = `<p>뉴스 불러오기 실패: ${err.message}</p>`;
  }
}

/**
 * (3) 현재 페이지 렌더링 (5개씩 잘라서 보여주기)
 */
function renderCurrentPage() {
  const container = document.getElementById("news-container");
  container.innerHTML = "";

  // 현재 페이지에서 보여줄 뉴스 계산
  const start = currentPageIndex * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = fetchedNews.slice(start, end);

  // 뉴스 표시
  pageItems.forEach(item => {
    const div = document.createElement("div");
    div.className = "summary-box";
    div.innerHTML = `<h3>${item.title}</h3><p>${item.summary || "요약 없음"}</p>`;
    div.onclick = () => window.open(item.url, '_blank');
    container.appendChild(div);
  });

  // 페이지 버튼 그리기
  renderPageButtons();
}

/**
 * (4) 페이지 버튼 (이전/다음 + 현재페이지 표시)
 */
function renderPageButtons() {
  const container = document.getElementById("news-container");
  const oldBox = document.querySelector(".page-buttons");
  if (oldBox) oldBox.remove();

  const pageBox = document.createElement("div");
  pageBox.className = "page-buttons";
  pageBox.style.display = "flex";
  pageBox.style.gap = "10px";
  pageBox.style.marginTop = "20px";

  // 전체 페이지 개수 = fetchedNews.length / ITEMS_PER_PAGE
  const totalPages = Math.ceil(fetchedNews.length / ITEMS_PER_PAGE);

  // 최대 표시할 버튼 개수 (e.g. 5)
  const maxVisible = 5;
  const half = Math.floor(maxVisible / 2);

  // 현재 페이지(currentPageIndex)를 중심으로 앞뒤로 몇 개 보여줄지 계산
  let startPage = Math.max(0, currentPageIndex - half);
  let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);

  // 만약 startPage가 너무 앞서면 조정
  if ((endPage - startPage) < (maxVisible - 1)) {
    startPage = Math.max(0, endPage - (maxVisible - 1));
  }

  // ◀ 이전 버튼
  // if (currentPageIndex > 0) {
  //   const prevBtn = document.createElement("button");
  //   prevBtn.textContent = "◀";
  //   prevBtn.className = "page-btn"; 
  //   prevBtn.onclick = () => {
  //     currentPageIndex--;
  //     renderCurrentPage();
  //   };
  //   pageBox.appendChild(prevBtn);
  // }

  // 숫자 버튼들 (startPage ~ endPage)
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = (i + 1); // 페이지 번호 (1-based)
    btn.className = "page-btn";  // ✅ 기본 버튼 스타일
    if (i === currentPageIndex) {
      btn.classList.add("active");  // ✅ 현재 페이지 강조
      btn.disabled = true;
    }
    btn.onclick = () => {
      currentPageIndex = i;
      renderCurrentPage();
    };
    pageBox.appendChild(btn);
  }

  // // ▶ 다음 버튼
  // if (currentPageIndex < totalPages - 1) {
  //   const nextBtn = document.createElement("button");
  //   nextBtn.textContent = "▶";
  //   nextBtn.onclick = () => {
  //     currentPageIndex++;
  //     renderCurrentPage();
  //   };
  //   pageBox.appendChild(nextBtn);
  // }

  container.appendChild(pageBox);
}



function resetMultiForm() {
  hideAllMain();
  document.getElementById('multi-form-box').style.display = "block";
  document.getElementById('multi-news-url').value = "";
}

// 도움말 및 제작자 연락처 페이지 처리
function showReservedSummaryBox() {
  hideAllMain();
  document.getElementById("reserved-summary-box").style.display = "block";
  loadReservedNews();
}


function openContactPage() {
  hideAllMain();
  document.getElementById('contact-box').style.display = "block";
}

function backToDefault() {
  hideAllMain();
  document.getElementById('form-box').style.display = "block";
}

// 모든 메인 영역 숨기기 (숨길 때 자동 스크롤)
function hideAllMain() {
  const mains = document.getElementsByClassName('main');
  for (let i = 0; i < mains.length; i++) {
    mains[i].style.display = "none";
  }
  window.scrollTo(0, 0);
}

// 요약 결과 복사하기 (단일 뉴스)
function copySummary() {
  const summary = document.getElementById("summary-text").innerText;
  navigator.clipboard.writeText(summary)
    .then(() => alert("요약이 클립보드에 복사되었습니다."))
    .catch(() => alert("복사에 실패했습니다."));
}

// 요약 결과 인쇄하기 (단일 뉴스)
function printSummary() {
  const printContents = document.getElementById("result-box").innerHTML;
  const originalContents = document.body.innerHTML;
  document.body.innerHTML = printContents;
  window.print();
  document.body.innerHTML = originalContents;
  location.reload();
}

// 단일 뉴스 요약 저장하기
async function saveCurrentSummary() {
  const article = document.getElementById("article-text").innerText;
  const summary = document.getElementById("summary-text").innerText;

  if (!summary || summary === "요약 중입니다...") {
    alert("저장할 요약 내용이 없습니다.");
    return;
  }

  const token = localStorage.getItem("authToken");
  if (!token) {
    alert("로그인 후 요약을 저장할 수 있습니다.");
    return;
  }

  const user = parseJwt(token); // JWT 토큰에서 사용자 정보 추출
  const email = user.id; // 이메일 사용

  try {
    const res = await fetch("http://localhost:3000/api/summaries/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ email, article, summary }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("요약이 저장되었습니다.");
    } else {
      alert("저장 실패: " + data.error);
    }
  } catch (err) {
    alert("서버 오류: " + err.message);
  }
}


// 다중 뉴스 요약 복사하기
function copyMultiSummary() {
  const container = document.getElementById("multi-summary-container");
  const text = container.innerText;
  navigator.clipboard.writeText(text)
    .then(() => alert("키워드 뉴스 요약이 클립보드에 복사되었습니다."))
    .catch(() => alert("복사에 실패했습니다."));
}

// 다중 뉴스 요약 인쇄하기
function printMultiSummary() {
  const printContents = document.getElementById("multi-result-box").innerHTML;
  const originalContents = document.body.innerHTML;
  document.body.innerHTML = printContents;
  window.print();
  document.body.innerHTML = originalContents;
  location.reload();
}

// 사이드바 저장된 요약 목록 불러오기
async function loadSavedSummaries() {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  const user = parseJwt(token);
  const email = user.id;

  try {
    const res = await fetch(`http://localhost:3000/api/summaries/${email}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (res.ok) {
      displaySavedSummaries(data.summaries); // 저장된 요약 표시 함수
    } else {
      alert("저장된 요약을 불러오는데 실패했습니다.");
    }
  } catch (err) {
    alert("서버 오류: " + err.message);
  }
}

function displaySavedSummaries(summaries) {
  const list = document.getElementById("saved-summary-list");
  list.innerHTML = ""; // 기존 리스트 초기화
  summaries.forEach((summary) => {
    let div = document.createElement("div");
    div.className = "history-item";
    div.innerText = `${summary.createdAt} - ${summary.summary.substring(0, 20)}...`;
    list.appendChild(div);
  });
}


// 다크 모드 전환
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const toggleBtn = document.querySelector("button.submit.dark-mode-toggle");
  if (document.body.classList.contains("dark-mode")) {
    toggleBtn.textContent = "라이트 모드 전환";
  } else {
    toggleBtn.textContent = "다크 모드 전환";
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
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!email || !password) {
    alert("모든 필드를 입력해주세요.");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      // alert("로그인 성공! 토큰: " + data.token);
      localStorage.setItem("authToken", data.token); // 저장
      closeAuthModal();

      checkLoginStatus();
      loadSavedSummaries();
    } else {
      alert("로그인 실패: " + data.error);
    }
  } catch (err) {
    alert("서버 오류: " + err.message);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  // 엔터 키 입력 시 로그인 실행
  [emailInput, passwordInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleLogin(); // ← 기존 로그인 버튼에서 쓰던 함수
      }
    });
  });
});

// 회원가입 처리 (1단계)
async function handleSignup() {
  const nickname = document.getElementById('signup-nickname').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  const confirm = document.getElementById('signup-confirm').value.trim();

  if (!nickname || !email || !password || !confirm) {
    alert("모든 필드를 입력해주세요.");
    return;
  }

  if (password !== confirm) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/auth/send-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nickname, email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("📧 인증번호가 전송되었습니다. 이메일을 확인해주세요!");
      showSignupAuthStep(); // 2단계로 이동
    } else {
      alert("전송 실패: " + data.error);
    }
  } catch (err) {
    alert("서버 오류: " + err.message);
  }
}



// 인증 코드 처리 (회원가입 2단계)
async function handleAuthCode() {
  const email = document.getElementById('signup-email').value.trim();
  const code = document.getElementById('auth-code-input').value.trim();

  if (!email || !code) {
    alert("이메일과 인증 코드를 모두 입력해주세요.");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/auth/verify-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("authToken", data.token); // ✅ 토큰 저장
      alert("🎉 회원가입 완료!");
      closeAuthModal();
      checkLoginStatus();
      loadSavedSummaries();
    } else {
      alert("인증 실패: " + data.error);
    }
  } catch (err) {
    alert("서버 오류: " + err.message);
  }
}

// 회원탈퇴 처리
// 모달 열기
function openDeleteAccountModal() {
  document.getElementById("delete-account-modal").style.display = "flex";
}

// 모달 닫기
function closeDeleteAccountModal() {
  document.getElementById("delete-account-modal").style.display = "none";
}

// 확인 눌렀을 때 비밀번호 포함 탈퇴 처리
async function confirmAccountDelete() {
  const password = document.getElementById("delete-password-input").value;
  const token = localStorage.getItem("authToken");
  if (!token || !password) {
    alert("비밀번호를 입력해주세요.");
    return;
  }

  const user = parseJwt(token);
  const email = user.id;

  try {
    const res = await fetch(`http://localhost:3000/api/user/delete/${email}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (res.ok) {
      alert("회원탈퇴가 완료되었습니다.");
      localStorage.removeItem("authToken");
      location.reload();
    } else {
      alert("탈퇴 실패: " + data.error);
    }
  } catch (err) {
    alert("서버 오류: " + err.message);
  }
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

// 사이드바 내 빠른 뉴스, 키워드 뉴스 요약 화면 전환
function handleQuickSummary() {
  hideAllMain();
  document.getElementById('form-box').style.display = "block";
}





// JWT 디코딩 함수 (Base64 파싱용) 한글글
// ✅ JWT 디코딩 함수 (Base64 처리 + 자동 로그아웃용)
function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// ✅ 자동 로그아웃 감지 함수
function checkTokenExpiration() {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  const payload = parseJwt(token);
  if (!payload || !payload.exp) return;

  const now = Math.floor(Date.now() / 1000); // 현재 시간 (초)
  if (now >= payload.exp) {
    localStorage.removeItem("authToken");
    alert("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
    location.reload(); // 새로고침으로 상태 반영
  }
}

// ✅ 로그인 상태 확인 함수 (기존 유지)
function checkLoginStatus() {
  const token = localStorage.getItem('authToken');
  const authBtn = document.getElementById('auth-btn');

  if (token) {
    const user = parseJwt(token);
    if (user && user.nickname) {
      authBtn.innerText = `${user.nickname} | 마이페이지`;
      authBtn.onclick = openMyPageModal;  // 기존: 로그아웃 함수
    } else {
      authBtn.innerText = "로그인 / 회원가입";
      authBtn.onclick = openAuthModal;
    }
  } else {
    authBtn.innerText = "로그인 / 회원가입";
    authBtn.onclick = openAuthModal;
  }
}

// 로그아웃 처리
function logout() {
  localStorage.removeItem("authToken");
  alert("로그아웃 되었습니다.");
  location.reload();
}


async function loadNaverNews(category = "전체", page = 0) {
  try {
    const res = await fetch(`http://localhost:3000/api/naver_news?category=${category}`);
    const data = await res.json();
    if (res.ok) {
      displayNewsList(data.news);
    } else {
      alert("뉴스 불러오기 실패: " + data.error);
    }
  } catch (err) {
    alert("서버 오류: " + err.message);
  }
}

function displaySavedSummaries(newsList) {
  const list = document.getElementById("saved-summary-list");
  list.innerHTML = "";

  newsList.forEach((news) => {
    let div = document.createElement("div");
    div.className = "history-item";
    div.innerText = `${news.title} - ${news.summary.substring(0, 30)}...`;

    // 🔽 클릭 시 기사 내용과 요약 보여주기
    div.onclick = () => {
      document.getElementById("article-text").innerText = news.article;
      document.getElementById("summary-text").innerText = news.summary;
      hideAllMain();
      document.getElementById("article-box").style.display = "block";
      document.getElementById("result-box").style.display = "block";
    };

    list.appendChild(div);
  });
}



function displayNewsList(newsList) {
  const list = document.getElementById("saved-summary-list");
  list.innerHTML = "";

  newsList.forEach((news) => {
    let div = document.createElement("div");
    div.className = "history-item";
    div.innerText = `${news.title} - ${news.summary?.substring(0, 30) || "..."}`;

    div.onclick = () => {
      document.getElementById("article-text").innerText = news.content;
      document.getElementById("summary-text").innerText = news.summary;
      hideAllMain();
      document.getElementById("article-box").style.display = "block";
      document.getElementById("result-box").style.display = "block";
    };

    list.appendChild(div);
  });
}


// 요약 스타일 라벨 반환 함수
function promptLabel(key) {
  switch (key) {
    case "friend": return "친구처럼";
    case "boss": return "상사처럼";
    case "king": return "왕처럼";
    default: return "비서처럼";
  }
}

// 로그인 상태에 따라 마이페이지 모달 열기
function openMypageTab(tabName, tabEl) {
  // 모든 탭 숨기기
  document.getElementById("mypage-tab-general").style.display = "none";
  document.getElementById("mypage-tab-summary").style.display = "none";

  // 선택한 탭 보여주기
  document.getElementById(`mypage-tab-${tabName}`).style.display = "block";

  // 탭 UI 스타일 토글
  document.querySelectorAll('.mypage-sidebar li').forEach(li => li.classList.remove('active'));
  if (tabEl) tabEl.classList.add('active');
}

// 마이페이지 열기
function openMyPageModal() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  const user = parseJwt(token);

  // 기본 탭 = 요약
  openMypageTab('general', document.querySelectorAll('.mypage-sidebar li')[0]);

  // 설정 불러오기
  fetch(`http://localhost:3000/api/user/settings/${user.id}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      const settings = data.settings || {};

      // 값 채우기
      document.getElementById("mypage-time").value = settings.notifyTime || "08:00";
      document.getElementById("mypage-keywords").value = (settings.keywords || []).join(", ");
      document.getElementById("mypage-style-select").value = settings.customPrompt || "default";

      // 👇 상태 텍스트 표시
      document.getElementById("mypage-status").innerText =
        `⏰ ${settings.notifyTime || "없음"} / 🏷️ ${(settings.keywords || []).join(", ") || "없음"} / 💡 ${promptLabel(settings.customPrompt)}`;
    })
    .catch(err => {
      console.warn("⚠️ 설정 불러오기 실패:", err.message);
      document.getElementById("mypage-status").innerText = "⚠️ 설정 불러오기 실패";
    });

  document.querySelector(".mypage-modal-backdrop").style.display = "flex";
}

function closeMyPageModal() {
  document.querySelector(".mypage-modal-backdrop").style.display = "none";
}

async function saveUserSettings() {
  const keywords = document.getElementById('mypage-keywords').value.trim().split(',').map(k => k.trim());
  const notifyTime = document.getElementById('mypage-time').value;
  const customPrompt = document.getElementById('mypage-style-select').value;

  const token = localStorage.getItem('authToken');
  if (!token) {
    alert("로그인이 필요합니다.");
    return;
  }

  const user = parseJwt(token);
  const email = user.id;

  try {
    const res = await fetch("http://localhost:3000/api/user/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ email, keywords, notifyTime, customPrompt})
    });

    const data = await res.json();
    if (res.ok) {
      alert("✅ 설정이 저장되었습니다.");
      closeMyPageModal();
    } else {
      alert("❌ 저장 실패: " + data.error);
    }
  } catch (err) {
    alert("❌ 서버 오류: " + err.message);
  }
}
/// 이메일 수신 설정 토글 처리
function handleEmailToggle() {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  const receiveEmail = document.getElementById("mypage-email-toggle").checked;
  const user = parseJwt(token);
  const email = user.id;

  fetch("http://localhost:3000/api/user/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ email, receiveEmail })  // 나머지는 기존값 유지되거나 덮어써도 됨
  })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        console.log("✅ 이메일 수신 설정 변경됨:", receiveEmail);
      } else {
        alert("⚠️ 설정 변경 실패: " + data.error);
      }
    })
    .catch(err => {
      alert("서버 오류: " + err.message);
    });
}


// 예약된 뉴스 요약 불러오기
async function loadReservedNews() {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  const user = parseJwt(token);
  const email = user.id;

  const container = document.getElementById("reserved-news");
  container.innerHTML = ""; // 초기화

  try {
    const res = await fetch(`http://localhost:3000/api/user/reserved-news/${email}`);
    const data = await res.json();

    console.log("✅ 예약 요약 응답:", data);

    // 👉 안전한 검사
    if (!data.articles || data.articles.length === 0) {
      container.innerHTML = "<p>⛔ 예약된 요약 결과가 없습니다.</p>";
      return;
    }

    data.articles.forEach((a, i) => {
      const el = document.createElement("div");
      el.className = "news-card";
      el.innerHTML = `
        <strong>${i + 1}. <a href="${a.url}" target="_blank">${a.title}</a></strong>
        <p>${a.summary}</p>
      `;
      container.appendChild(el);
    });

  } catch (err) {
    console.error("예약 요약 로딩 실패:", err);
    alert("예약 요약 로딩 실패: " + err.message);
  }
}



// ✅ 페이지 로드 시 자동 실행
window.onload = function () {
  loadSavedSummaries();
  checkLoginStatus();
  setInterval(checkTokenExpiration, 5000); // 5초마다 만료 여부 검사
};


