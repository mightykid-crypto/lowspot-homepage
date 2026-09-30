# Read current file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the missing body parts exactly
missing_html = """        <a href="#contact" class="nav-link">문의</a>
      </nav>
    </div>
  </header>

  <!-- 히어로 섹션 -->
  <section id="hero" class="hero">
    <div class="hero-bg-glow"></div>
    <div class="wrap">
      <div class="hero-content">

        <div class="hero-top-text">
          <div class="motto-badge">
            <span>🌱</span>
            <span>목회 현장을 섬기는 도구 제작 · lowspot.kr</span>
          </div>
          <h1>목회 현장의 고민을 담은 도구,<br class="pc-only">그리고 스스로 만드는 바이브 코딩</h1>
          <p>첫 화면에서 낮은자리가 나누는 두 기둥과 사역의 지혜를 시각적으로 살펴보세요.</p>
        </div>

        <!-- ★ 4대 요약 자동 슬라이드 배너 (설명 4 : 사진 6 비율 강조) ★ -->
        <div class="hero-slider-box" id="heroSlider" onmouseenter="pauseSlide()" onmouseleave="resumeSlide()">
          
          <!-- 슬라이드 1. 사역 도구 10종 -->
          <div class="slide-item g active">
            <div class="slide-text">
              <span class="slide-tag">MINISTRY TOOLS · 사역 도구 10종</span>
              <h2>기술은 종처럼, 묵상은 깊게 :<br class="pc-only">목회 현장의 10대 사역 도구</h2>
              <p>서피스 펜 햅틱을 지원하는 묵상 연구 '성경노트'부터, 소그룹 모임의 얼음을 깨는 '10초게임'과 '교회재정'까지 무료로 나눕니다.</p>
              <a href="#apps" class="slide-cta">🛠️ 10개 사역 도구 살펴보기 →</a>
            </div>
            <div class="slide-img-area">
              <img src="화면사진/성경노트 노트화면.png" alt="성경노트 화면">
            </div>
          </div>

          <!-- 슬라이드 2. 사역 자동화 -->
          <div class="slide-item">
            <div class="slide-text">
              <span class="slide-tag">AI WORKFLOW · 실무 자동화</span>
              <h2>주보 요약과 본문 주해 리서치<br class="pc-only">반복 행정 시간 80% 단축</h2>
              <p>매주 반복되는 주보 공지 3줄 심방문 요약, 성경 본문 원어 주해 대조 검색, 교적·재정 통계 정리를 AI 비서에게 안전하게 맡기세요.</p>
              <a href="#lectures" class="slide-cta s-cta">🎓 AI 목회 실전 커리큘럼 보기 →</a>
            </div>
            <div class="slide-img-area">
              <img src="화면사진/교회재정 헌금관리.png" alt="교회재정 장부 화면">
            </div>
          </div>

          <!-- 슬라이드 3. 바이브 코딩 -->
          <div class="slide-item g">
            <div class="slide-text">
              <span class="slide-tag">VIBE CODING · 사역자가 짓는 앱</span>
              <h2>외주 개발 없이, 사역자가<br class="pc-only">말로 직접 짓는 바이브 코딩</h2>
              <p>프로그래밍 문법을 한 줄도 몰라도 괜찮습니다. AI와 한국어로 대화하며 우리 교회 비전이 담긴 말씀 앱과 웹사이트를 짓습니다.</p>
              <a href="강의상세_커리큘럼.html?tab=3" class="slide-cta">🌱 3과정 12주 실습표 열람 →</a>
            </div>
            <div class="slide-img-area">
              <img src="화면사진/말씀뽑기 첫화면.png" alt="말씀뽑기 앱 화면">
            </div>
          </div>

          <!-- 슬라이드 4. 사역 비전 -->
          <div class="slide-item">
            <div class="slide-text">
              <span class="slide-tag">OUR MISSION · 사역 비전과 연대</span>
              <h2>"세상엔 강하고,<br class="pc-only">하나님껜 아이같길."</h2>
              <p>낮은자리는 도구 판매 사업자가 아닌, 한국 교회 목회자들과 함께 기술 사역의 바른 길과 겸손한 지혜를 모색하는 사역 연대입니다.</p>
              <a href="#contact" class="slide-cta s-cta">✉️ 세미나 출강 및 사역 문의 →</a>
            </div>
            <div class="slide-img-area">
              <img src="화면사진/찬양콘티_1_첫화면.png" alt="찬양콘티 앱 화면">
            </div>
          </div>

          <button class="slider-nav-btn slider-prev" onclick="prevSlide()" title="이전 슬라이드">&#10094;</button>
          <button class="slider-nav-btn slider-next" onclick="nextSlide()" title="다음 슬라이드">&#10095;</button>

          <div class="slider-dots" id="sliderDots">
            <div class="slider-dot active" onclick="gotoSlide(0)"></div>
            <div class="slider-dot" onclick="gotoSlide(1)"></div>
            <div class="slider-dot" onclick="gotoSlide(2)"></div>
            <div class="slider-dot" onclick="gotoSlide(3)"></div>
          </div>

        </div>

      </div>
    </div>
  </section>

  <!-- 소개 섹션 -->
  <section id="intro" class="intro-section">
    <div class="wrap">
      <div class="intro-box">
        <div class="intro-deco">❝</div>
        <div class="intro-motto">세상엔 강하고 하나님껜 아이같길.</div>
        <div class="intro-text">
          <p>사역 현장에서 마주하는 수많은 행정과 반복되는 실무들,<br class="pc-only">때로는 그것들이 우리의 깊은 묵상과 기도의 시간을 앗아가곤 합니다.</p>
          <p>이곳 '낮은자리'는 가장 겸손한 마음으로 사역을 감당하고자 하는 다짐에서 출발했습니다.<br class="pc-only">화려한 상업적 소프트웨어를 파는 곳이 아니라, 사역자들이 값비싼 프로그램에 끌려다니지 않고<br class="pc-only"><strong>"기술은 종처럼 다루고, 묵상은 더 깊게"</strong> 유지하도록 주체적인 사역의 지혜를 나누는 연대 공동체입니다.</p>
        </div>
        <div class="intro-signature">lowspot.kr</div>
      </div>
    </div>
  </section>

  <!-- 두 기둥 섹션 -->
  <section class="pillars-section">
    <div class="wrap">
      <div class="sec-header">
        <h2>낮은자리의 두 기둥</h2>
        <p>현장에서 검증된 도구를 나누고, 직접 만드는 사역의 힘을 기릅니다.</p>
      </div>
      <div class="pillars-grid">
        <a href="#apps" class="pillar-card g">
          <div>
            <span class="pillar-tag">MINISTRY TOOLS (10 APPS)</span>
            <h3>교회 친화 사역 도구 10종</h3>
            <p>
              성경 연구와 말씀 묵상, 교회 재정 회계, 설교 송출, 찬양 콘티, 주보 PDF 변환까지.
              목회 현장의 손끝에서 태어난 10대 도구를 무설치 웹앱과 데스크톱 앱으로 나눕니다.
            </p>
          </div>
          <div class="pillar-action">10개 도구 모두 보기 →</div>
        </a>
        <a href="#lectures" class="pillar-card s">
          <div>
            <span class="pillar-tag">AI MINISTRY ACADEMY</span>
            <h3>AI 목회 활용 · 바이브 코딩 강의</h3>
            <p>
              기술에 종속되지 않고 하나님 중심의 사역을 돕는 지혜.
              AI의 원리를 이해하고 우리 교회의 필요를 코드로 실현하는 3과정 커리큘럼입니다.
            </p>
          </div>
          <div class="pillar-action">강의 커리큘럼 살펴보기 →</div>
        </a>
      </div>
    </div>
  </section>

  <!-- ★ 10개 앱 도구 갤러리 (Bento + Tabs + 도구상세_통합.html?id=... 단일 틀 연결) ★ -->
  <section id="apps" class="showcase-section">
    <div class="wrap">
      <div class="sec-header">
        <h2>만든 도구들 (총 10종)</h2>
        <p>복잡한 설정 없이 현장에서 즉시 쓰실 수 있습니다. 각 카드의 <strong>[상세 페이지 보기]</strong> 클릭 시 실제 구동 사진과 안내가 담긴 통합 상세 페이지로 연결됩니다.</p>
      </div>

      <div class="tabs-bar">
        <button class="filter-tab active" onclick="filterApps('all', this)">전체 보기 (10)</button>
        <button class="filter-tab" onclick="filterApps('web', this)">🌿 바로 쓰는 웹앱 (3)</button>
        <button class="filter-tab" onclick="filterApps('win', this)">💻 윈도우 데스크톱 (7)</button>
      </div>

      <div class="apps-grid" id="appsGrid">
        <div class="app-card" data-category="win" style="border-color:var(--sprout);">
          <div>
            <div class="app-top">
              <div class="app-icon">✍️</div>
              <span class="app-badge badge-win">윈도우 .exe · 추천</span>
            </div>
            <h3>성경노트</h3>
            <p>서피스 펜과 햅틱을 완벽 지원하는 묵상 연구 노트입니다. 본문 주해와 기도를 한 장의 정결한 종이에 담습니다.</p>
          </div>
          <div class="app-bot">
            <span class="app-ver">v0.2.2 (19.7 MB)</span>
            <a href="도구상세_통합.html?id=bible-note" class="app-cta">상세 페이지 보기 →</a>
          </div>
        </div>

        <div class="app-card" data-category="web">
          <div>
            <div class="app-top">
              <div class="app-icon">🎮</div>
              <span class="app-badge badge-web">바로 쓰는 웹앱</span>
            </div>
            <h3>10초게임</h3>
            <p>보드게임을 폰 하나에 담았습니다. 성경 구절 맞추기 등 17개 놀이로 교회 소그룹 모임의 얼음을 깨뜨립니다.</p>
          </div>
          <div class="app-bot">
            <span class="app-ver">설치 불필요 · PWA</span>
            <a href="도구상세_통합.html?id=game10s" class="app-cta">상세 페이지 보기 →</a>
          </div>
        </div>

        <div class="app-card" data-category="web">
          <div>
            <div class="app-top">
              <div class="app-icon">📖</div>
              <span class="app-badge badge-web">바로 쓰는 웹앱</span>
            </div>
            <h3>낮은꼬들</h3>
            <p>설교 본문 단어를 힌트와 함께 맞추는 한글 워들(Wordle) 묵상 도구입니다. 44,937개 단어 사전을 지원합니다.</p>
          </div>
          <div class="app-bot">
            <span class="app-ver">설치 불필요 · PWA</span>
            <a href="도구상세_통합.html?id=wordle" class="app-cta">상세 페이지 보기 →</a>
          </div>
        </div>

        <div class="app-card" data-category="win">
          <div>
            <div class="app-top">
              <div class="app-icon">📊</div>
              <span class="app-badge badge-win">윈도우 .exe</span>
            </div>
            <h3>교회재정</h3>
            <p>복잡한 회계 프로그램 대신, 우리 교회에 꼭 맞는 직관적인 수입·지출 관리와 연간 결산 통계를 지원합니다.</p>
          </div>
          <div class="app-bot">
            <span class="app-ver">v1.0.0 (12.4 MB)</span>
            <a href="도구상세_통합.html?id=finance" class="app-cta s-btn">상세 페이지 보기 →</a>
          </div>
        </div>

        <div class="app-card" data-category="win">
          <div>
            <div class="app-top">
              <div class="app-icon">🖥️</div>
              <span class="app-badge badge-win">윈도우 .exe</span>
            </div>
            <h3>설교프레젠터</h3>
            <p>성경 구절과 찬양 가사, 설교 화면을 방송팀 스크린에 0.1초 만에 가볍고 안정적으로 송출하는 프레젠터입니다.</p>
          </div>
          <div class="app-bot">
            <span class="app-ver">v1.0.0 (2.4 MB)</span>
            <a href="도구상세_통합.html?id=presenter" class="app-cta s-btn">상세 페이지 보기 →</a>
          </div>
        </div>

        <div class="app-card" data-category="win">
          <div>
            <div class="app-top">
              <div class="app-icon">📄</div>
              <span class="app-badge badge-win">윈도우 .exe / 포터블</span>
            </div>
            <h3>PDF변환</h3>
            <p>주보 및 당회 행정 문서 PDF를 유료 프로그램 없이 즉시 병합, 페이지 분할, 워드·이미지로 변환해 줍니다.</p>
          </div>
          <div class="app-bot">
            <span class="app-ver">v1.0.0 (2.4MB / 무설치 8.9MB)</span>
            <a href="도구상세_통합.html?id=pdf" class="app-cta s-btn">상세 페이지 보기 →</a>
          </div>
        </div>

        <div class="app-card" data-category="win">
          <div>
            <div class="app-top">
              <div class="app-icon">🎵</div>
              <span class="app-badge badge-win">윈도우 .exe / 포터블</span>
            </div>
            <h3>찬양콘티</h3>
            <p>주일 예배 및 기도회 찬양 콘티 악보 4곡을 분할 화면으로 한눈에 보며 매끄럽게 넘기는 인도자용 도구입니다.</p>
          </div>
          <div class="app-bot">
            <span class="app-ver">v1.0.0 (1.9MB / 무설치 8.6MB)</span>
            <a href="도구상세_통합.html?id=worship" class="app-cta s-btn">상세 페이지 보기 →</a>
          </div>
        </div>

        <div class="app-card" data-category="win">
          <div>
            <div class="app-top">
              <div class="app-icon">📜</div>
              <span class="app-badge badge-win">윈도우 .exe</span>
            </div>
            <h3>말씀뽑기</h3>
            <p>신년 감사예배나 심방 시 성도님들에게 하나님이 주시는 위로와 축복의 말씀 카드를 아름다운 연출로 뽑습니다.</p>
          </div>
          <div class="app-bot">
            <span class="app-ver">v1.0.0 (1.8 MB)</span>
            <a href="도구상세_통합.html?id=draw" class="app-cta s-btn">상세 페이지 보기 →</a>
          </div>
        </div>

        <div class="app-card" data-category="win">
          <div>
            <div class="app-top">
              <div class="app-icon">📱</div>
              <span class="app-badge badge-win">윈도우 .exe</span>
            </div>
            <h3>QR메이커</h3>
            <p>교회 홈페이지, 헌금 계좌, 온라인 심방 신청서 링크를 주보와 현수막용 고해상도 인쇄용 QR코드로 변환합니다.</p>
          </div>
          <div class="app-bot">
            <span class="app-ver">v1.0.0 (1.5 MB)</span>
            <a href="도구상세_통합.html?id=qr" class="app-cta s-btn">상세 페이지 보기 →</a>
          </div>
        </div>

        <div class="app-card" data-category="web">
          <div>
            <div class="app-top">
              <div class="app-icon">⌨️</div>
              <span class="app-badge badge-web">바로 쓰는 웹앱 / .exe</span>
            </div>
            <h3>타자 말씀 암송</h3>
            <p>신구약 핵심 암송 구절 100선을 한 글자씩 키보드로 타자하며 묵상하는 타자 연습 및 암송 챌린지 도구입니다.</p>
          </div>
          <div class="app-bot">
            <span class="app-ver">웹 PWA / 윈도우 겸용</span>
            <a href="도구상세_통합.html?id=typing" class="app-cta">상세 페이지 보기 →</a>
          </div>
        </div>
      </div>

      <div class="sim-card">
        <div class="sim-header">
          <div class="sim-dots">
            <div class="sim-dot" style="background:#E6E1D5"></div>
            <div class="sim-dot" style="background:#E6E1D5"></div>
            <div class="sim-dot" style="background:#E6E1D5"></div>
          </div>
          <div class="sim-title">🌱 우리 교회 맞춤 도구를 직접 만들고 싶으신가요?</div>
          <div></div>
        </div>
        <div class="sim-body">
          <div class="sim-desc-top">
            <strong>"복잡한 프로그래밍 언어 없이, 일상적인 대화(Vibe Coding)로 만드는 사역 도구 체험하기"</strong>
          </div>
          <div class="sim-actions">
            <button class="sim-btn active" onclick="changePrompt(0)">🌿 성경 묵상 게임 만들기</button>
            <button class="sim-btn" onclick="changePrompt(1)">📋 주보·행정 자동화 도구</button>
            <button class="sim-btn" onclick="changePrompt(2)">🔍 심방 말씀 카드 생성기</button>
          </div>
          <div class="sim-prompt-box">
            <span class="sim-prompt-text" id="promptText">"부서 공과 모임에서 10초 동안 맞추는 말씀 퀴즈 앱을 만들어줘"</span>
            <span class="sim-prompt-tag">AI 생성 중...</span>
          </div>
          <div class="sim-output">
            <div class="sim-out-icon" id="outIcon">🎮</div>
            <div class="sim-out-text">
              <h4 id="outTitle">10초게임 앱 구현 완료 (웹 PWA)</h4>
              <p id="outDesc">스마트폰 하나로 청소년부·소그룹 전원이 함께 참여하는 17종 묵상 게임 도구</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>

  <!-- AI 강의 3과정 커리큘럼 아코디언 -->
  <section id="lectures" class="lecture-section">
    <div class="wrap">
      <div class="sec-header">
        <h2>AI 목회 활용 · 바이브 코딩 커리큘럼</h2>
        <p>기술을 두려워하지 않고, 우리 사역의 주도권을 지키는 3과정 안내입니다.</p>
      </div>

      <div class="curriculum-wrap">
        <div class="course-item open" onclick="toggleAccordion(this)">
          <div class="course-header">
            <div class="course-title-area">
              <div class="course-num">1</div>
              <h3>과정 1. 처음 만나는 AI — 목회적 이해와 기본 대화</h3>
            </div>
            <div class="course-toggle">▾</div>
          </div>
          <div class="course-body">
            <ul class="lecture-list">
              <li><span class="check-mark">✓</span> AI 시대의 목회적 영성과 신학적 전제 — 두려움과 과신을 넘어서기</li>
              <li><span class="check-mark">✓</span> 좋은 질문이 좋은 사역을 만든다 — 목회자를 위한 정교한 대화(프롬프트) 작성법</li>
              <li><span class="check-mark">✓</span> 심방, 묵상 나눔, 소그룹 나눔 질문을 보조하는 AI 대화 실습</li>
            </ul>
          </div>
        </div>

        <div class="course-item" onclick="toggleAccordion(this)">
          <div class="course-header">
            <div class="course-title-area">
              <div class="course-num">2</div>
              <h3>과정 2. 자료를 다루다 — 문서·행정·주해 리서치 자동화</h3>
            </div>
            <div class="course-toggle">▾</div>
          </div>
          <div class="course-body">
            <ul class="lecture-list">
              <li><span class="check-mark">✓</span> 주보 및 교회 행정 문서의 요약·초안 작성 시간 80% 줄이기</li>
              <li><span class="check-mark">✓</span> 성경 본문 주해와 신학 논문, 방대한 도서 자료 고속 리서치 분석</li>
              <li><span class="check-mark">✓</span> 교회 교적 자료 및 재정 데이터의 오류 없는 가공과 차트 시각화</li>
            </ul>
          </div>
        </div>

        <div class="course-item" onclick="toggleAccordion(this)">
          <div class="course-header">
            <div class="course-title-area">
              <div class="course-num">3</div>
              <h3>과정 3. 만들어 내다 — 사역자가 직접 하는 바이브 코딩 (Vibe Coding)</h3>
            </div>
            <div class="course-toggle">▾</div>
          </div>
          <div class="course-body">
            <ul class="lecture-list">
              <li><span class="check-mark">✓</span> 코드를 한 줄도 몰라도 괜찮습니다 — 자연어로 소프트웨어를 짓는 원리</li>
              <li><span class="check-mark">✓</span> 우리 교회 맞춤 심방 신청 및 기도 제목 공유 앱 실전 제작</li>
              <li><span class="check-mark">✓</span> 노회·전도기관 홈페이지 및 행사 안내 페이지 직접 배포하기</li>
            </ul>
          </div>
        </div>

        <div class="curriculum-more-box">
          <div>
            <h3>과정별 12주 상세 실습표 및 세미나 안내</h3>
            <p>과목별 상세 교안과 목회자 세미나 코호트 일정을 독립 전문 페이지에서 확인하실 수 있습니다.</p>
          </div>
          <a href="강의상세_커리큘럼.html" class="btn-main" style="text-decoration:none; display:inline-block;">과정별 상세 커리큘럼 페이지 열기 →</a>
        </div>
      </div>
    </div>
  </section>

  <!-- 활용사례 섹션 (추후 추가) -->
  <section id="usecases" class="usecase-section">
    <div class="wrap">
      <div class="sec-header">
        <h2>사역 현장의 이야기</h2>
        <p>실제 교회 현장에서 사용 중인 활용 사례와 추천사 (준비 중입니다)</p>
      </div>
      <div style="text-align: center; color: var(--sub); padding: 40px; background: var(--bg); border: 1px dashed var(--line); border-radius: var(--radius-lg);">
        🛠️ 활용사례 콘텐츠 업데이트 준비 중
      </div>
    </div>
  </section>

  <!-- FAQ 섹션 -->
  <section id="faq" class="faq-section">
    <div class="wrap">
      <div class="sec-header">
        <h2>자주 묻는 질문 (FAQ)</h2>
        <p>도구 사용과 AI 목회 활용에 대해 궁금하신 점들을 정리했습니다.</p>
      </div>
      <div class="faq-wrap">
        <div class="faq-item" onclick="toggleAccordion(this)">
          <div class="faq-q"><span>Q. 만드신 10개 앱들은 정말 다 무료인가요? 광고가 있나요?</span><span class="faq-icon">▾</span></div>
          <div class="faq-a"><br>완전 무료이며 배너 광고조차 없습니다. 하나님 나라를 위해 대가 없이 나눕니다.</div>
        </div>
        <div class="faq-item" onclick="toggleAccordion(this)">
          <div class="faq-q"><span>Q. 윈도우 앱 설치 시 'PC 보호' 파란 창이 뜹니다. 안전한가요?</span><span class="faq-icon">▾</span></div>
          <div class="faq-a"><br>개인 개발자 서명 때문이며 바이러스가 아닙니다. '추가 정보 -> 실행'을 누르시면 안전하게 구동됩니다.</div>
        </div>
        <div class="faq-item" onclick="toggleAccordion(this)">
          <div class="faq-q"><span>Q. AI(챗GPT 등)를 목회에 도입하는 것이 신학적으로 안전한가요?</span><span class="faq-icon">▾</span></div>
          <div class="faq-a"><br>기술을 맹신하는 것이 아니라 '도구를 종처럼 다루며 묵상은 더 깊게' 하는 것이 저희의 철학입니다. 강의를 통해 성경적인 AI 활용 기준을 배웁니다.</div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA / 문의 영역 -->
  <section id="contact" class="cta-section">
    <div class="wrap">
      <div class="cta-box">
        <h3>현장의 사역 도구와 강의, 편하게 요청해 주세요</h3>
        <p>
          교회나 노회 세미나, 사역자 모임에서의 강의 요청이나<br class="pc-only">
          우리 교회에 꼭 필요한 도구 아이디어가 있으시다면 귀 기울이겠습니다.
        </p>
        <div class="cta-buttons">
          <button class="btn-main" onclick="alert('강의 및 세미나 문의 창구로 연결됩니다.')">🌿 강의·세미나 문의하기</button>
          <button class="btn-sub" onclick="alert('문의 이메일: 문의@lowspot.kr')">✉️ 문의@lowspot.kr</button>
        </div>
      </div>
    </div>
  </section>

  <!-- 푸터 -->
  <footer>
    <div class="wrap">
      <p>© 2026 민경우 · 낮은자리 (lowspot.kr) — 세상엔 강하고 하나님껜 아이같길.</p>
    </div>
  </footer>
"""

pattern_to_replace = '        <a href="#usecases" class="nav-link">활용사례</a>\n        <a href="#faq" class="nav-link">FAQ</a>\n\n  <!-- ★ 우측 세로 플로팅 퀵 메뉴 바 ★ -->'

if pattern_to_replace in content:
    new_content = content.replace(pattern_to_replace, missing_html + '\n\n  <!-- ★ 우측 세로 플로팅 퀵 메뉴 바 ★ -->')
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("PATTERN NOT FOUND. Here is context:")
    idx = content.find('<a href="#usecases"')
    print(repr(content[idx:idx+100]))
