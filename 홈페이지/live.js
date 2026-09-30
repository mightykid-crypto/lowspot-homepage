// 라이브톡 — 세미나 실시간 자료 나눔방 (lowspot.net/live)
// 서버: 라이브톡/worker (lowspot.net/api/live/*). 내 PC 시험: live.html?api=http://127.0.0.1:8787
(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  const API = (qs.get('api') || '') + '/api/live';
  const WS_BASE = (qs.get('api') || location.origin).replace(/^http/, 'ws') + '/api/live/ws';
  const BEAM = qs.get('view') === 'beam' || location.hash === '#beam';
  // 체험판: 서버 없이 이 브라우저 안에서 돈다(미리보기 사본은 window.LIVE_DEMO, 또는 ?demo=1). 같은 브라우저의 탭끼리는 실시간으로 이어진다
  const DEMO = qs.get('demo') === '1' || window.LIVE_DEMO === true;
  const NS = DEMO ? 'livedemo.' : 'live.';
  const LESSONS = ['공통', '1강', '2강', '3강', '4강', '5강', '6강'];
  const TYPE = { prompt: '프롬프트', link: '링크·파일', notice: '공지', answer: '답변' };
  const $ = (sel, root = document) => root.querySelector(sel);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(NS + k); } catch {} },
  };

  // ── 상태 ──
  const S = {
    token: null, me: null, title: '라이브톡', locked: false,
    posts: new Map(), questions: new Map(), drafts: new Map(), myQuestions: new Map(),
    online: 0, members: 0, people: [], filter: store.get('filter', 'all'),
    tab: 'feed', editing: null, answering: null, unread: 0, ws: null, retry: 0, alive: false,
  };
  const saves = () => store.get('saved', {});
  // 입장권: 체험판은 탭마다 따로(한 탭은 강사, 한 탭은 참가자) — 실제 사이트는 이 브라우저에 기억
  const tok = {
    get() { try { return DEMO ? sessionStorage.getItem('livedemo.token') : store.get('token', null); } catch { return null; } },
    set(v) { try { DEMO ? sessionStorage.setItem('livedemo.token', v) : store.set('token', v); } catch {} },
    del() { try { DEMO ? sessionStorage.removeItem('livedemo.token') : tok.del(); } catch {} },
  };
  S.token = tok.get();

  // ── 작은 도구 ──
  function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(kid));
    return n;
  }
  const time = (t) => new Date(t).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
  const isDrive = (u) => /(drive|docs)\.google\.com\//.test(u);
  function richText(text) {   // 글 속 주소를 링크로 (나머지는 그대로 글자)
    const frag = document.createDocumentFragment();
    text.split(URL_RE).forEach((part, i) => {
      if (i % 2) frag.append(el('a', { href: part, target: '_blank', rel: 'noopener', class: 'inline-link' }, part));
      else frag.append(part);
    });
    return frag;
  }
  let toastTimer;
  function toast(msg) {
    const t = $('#liveToast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    const ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text; document.body.append(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
  // 확인 상자 — 브라우저 confirm/prompt 대신 페이지 안에 띄운다(미리보기 화면에서는 confirm 이 막혀 있음)
  function confirmBox(message, { ok = '확인', danger = false, input = null } = {}) {
    return new Promise((resolve) => {
      const field = input ? el('input', { class: 'dlg-input', placeholder: input, 'aria-label': input }) : null;
      const done = (v) => { wrap.remove(); resolve(v); };
      const wrap = el('div', { class: 'dlg-wrap', role: 'dialog', 'aria-modal': 'true', onclick: (e) => { if (e.target === wrap) done(null); } },
        el('div', { class: 'dlg' },
          el('p', { class: 'dlg-msg' }, message),
          field,
          el('div', { class: 'dlg-btns' },
            el('button', { type: 'button', class: 'dlg-cancel', onclick: () => done(null) }, '취소'),
            el('button', { type: 'button', class: 'dlg-ok' + (danger ? ' danger' : ''), onclick: () => done(field ? field.value : true) }, ok))));
      wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(null); if (e.key === 'Enter' && field) done(field.value); });
      document.body.append(wrap);
      (field || $('.dlg-ok', wrap)).focus();
    });
  }
  const send = (m) => { if (S.ws && S.ws.readyState === 1) { S.ws.send(JSON.stringify(m)); return true; } toast('연결이 잠시 끊겼어요. 다시 붙는 중이에요.'); return false; };


  // ── 체험판 서버 (브라우저 안) — 실제 서버(라이브톡/worker)와 같은 규칙을 흉내 낸다 ──
  const Demo = DEMO ? (() => {
    const ch = 'BroadcastChannel' in window ? new BroadcastChannel('lowspot-live-demo') : null;
    const sockets = new Set();
    const names = ['김은혜 목사', '박소망 전도사', '이믿음 목사', '최사랑 강도사', '정기쁨 목사', '한평안 전도사', '오충성 목사', '윤온유 목사', '장절제 전도사', '임화평 목사', '서인내 목사', '강자비 전도사', '조양선 목사', '신성실 목사', '문겸손 전도사', '배지혜 목사', '노진리 목사', '하생명 전도사', '구빛나 목사', '남소금 목사', '편새싹 전도사', '황하늘 목사'];
    const fake = names.map((_, i) => 'demo' + i);
    const vote = (n, from = 0) => Object.fromEntries(fake.slice(from, from + n).map((u) => [u, 1]));
    function fresh() {
      const t0 = Date.now();
      const mk = (id, min, o) => ({ id, at: t0 - min * 60000, votes: {}, author: '민경우', pinned: false, lesson: 1, title: '', ...o });
      return {
        title: '한남노회 AI 세미나 · 체험판', locked: false, blocked: {},
        members: Object.fromEntries(fake.map((u, i) => [u, { name: names[i], church: '' }])),
        posts: [
          mk('p1', 95, { type: 'notice', lesson: 0, title: '라이브톡에 오신 것을 환영합니다', text: '강의 중에 쓰실 프롬프트와 자료가 여기에 올라와요. [📋 복사하기]로 복사해 제미나이 창에 붙여 넣으세요.\n오전 쉬는 시간은 10:50 – 11:00 입니다.', pinned: true, votes: { like: vote(12) } }),
          mk('p2', 80, { type: 'prompt', title: '여는 실습 — 주보 광고문 다듬기', text: '이번 주 주보에 실을 광고문입니다. 제가 급하게 메모해 둔 것이라 문장이 거칠고 딱딱합니다. 성도들에게 따뜻하게 읽히도록 다듬어 주세요.\n"다음 주 토요일 교회 대청소 함. 9시까지 나와야 됨. 지난번에 몇 명 안 나와서 힘들었음. 이번엔 다들 꼭 나오기 바람. 점심 제공."', votes: { copy: vote(19), done: vote(17), like: vote(8) } }),
          mk('p3', 60, { type: 'prompt', title: '기법 1 — 역할 부여', text: "당신은 아동부 전문 사역자입니다. 초등학교 1, 2학년 어린이들에게 '하나님의 임재하심'을 직관적으로 가르쳐 줄 시각 도구 예화를 기획해 주세요.", votes: { copy: vote(15), done: vote(11) } }),
          mk('p4', 40, { type: 'link', title: '1강 실습 자료 (예시 링크)', text: '오늘 실습에 쓰는 자료예요. 체험판이라 실제 파일은 아니에요.\nhttps://drive.google.com/', votes: { open: vote(14) } }),
          mk('p5', 20, { type: 'answer', question: '제미나이 무료 계정으로도 실습할 수 있나요?', text: '네, 오늘 실습은 무료 계정으로도 모두 해 보실 수 있어요.', votes: { like: vote(6) } }),
        ],
        questions: [{ id: 'q1', uid: fake[3], name: names[3], church: '', text: '메타 프롬프팅은 몇 강에서 다루나요?', at: t0 - 5 * 60000, answered: false }],
        drafts: [
          { id: 'd1', type: 'prompt', lesson: 2, title: '기법 2 — 구체적 맥락', text: '고용 불안을 겪는 40대 가장들에게 마태복음 6장(염려하지 말라)의 현실적 적용점 3가지를 제안해 주세요.', at: t0 },
          { id: 'd2', type: 'prompt', lesson: 2, title: '기법 3 — 단계별 대화', text: '새가족 환영 만찬 프로그램의 2시간 타임라인 초안을 기획해 주세요.', at: t0 + 1 },
        ],
      };
    }
    let room = store.get('room', null) || fresh();
    const pushAll = () => sockets.forEach((s) => s.push());
    const persist = () => { store.set('room', room); if (ch) ch.postMessage(1); pushAll(); };
    if (ch) ch.onmessage = () => { room = store.get('room', room); pushAll(); };
    const pub = (p, uid) => {
      const counts = {}, mine = {};
      for (const k of ['copy', 'open', 'like', 'done']) { const v = p.votes?.[k] || {}; counts[k] = Object.keys(v).length; mine[k] = !!v[uid]; }
      const { votes, ...rest } = p; return { ...rest, counts, mine };
    };
    class DemoSocket {
      constructor(me) { this.me = me; this.readyState = 1; sockets.add(this); setTimeout(() => { if (this.onopen) this.onopen(); this.push(true); }, 150); }
      emit(m) { if (this.onmessage) this.onmessage({ data: JSON.stringify(m) }); }
      push(first) {
        const me = this.me;
        const hello = { t: 'hello', soft: !first, me, title: room.title, locked: room.locked, posts: [...room.posts].sort((a, b) => a.at - b.at).map((p) => pub(p, me.uid)) };
        if (me.role === 'teacher') { hello.questions = room.questions; hello.drafts = room.drafts; hello.members = Object.keys(room.members).length; }
        else hello.myQuestions = room.questions.filter((q) => q.uid === me.uid);
        this.emit(hello);
        this.emit({ t: 'presence', online: 17 + sockets.size });
        if (me.role === 'teacher') this.emit({ t: 'people', members: Object.keys(room.members).length, list: Object.entries(room.members).slice(0, 17).map(([uid, m]) => ({ uid, name: m.name, church: m.church || '' })) });
      }
      close() { sockets.delete(this); this.readyState = 3; }
      send(raw) { act(this, JSON.parse(raw)); }
    }
    const nid = (c) => c + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    function act(sock, m) {
      room = store.get('room', room);   // 다른 탭이 방금 바꾼 것 위에 고친다(덮어쓰기 방지)
      const me = sock.me, oops = (text) => sock.emit({ t: 'error', text });
      const P = (id) => room.posts.find((p) => p.id === id);
      if (m.t === 'ping') return;
      if (m.t === 'react') {
        const p = P(m.id); if (!p) return;
        p.votes[m.kind] ||= {}; const v = p.votes[m.kind];
        if ((m.kind === 'like' || m.kind === 'done') && v[me.uid]) delete v[me.uid];
        else if (!v[me.uid]) v[me.uid] = 1; else return;
        return persist();
      }
      if (m.t === 'ask') {
        if (room.locked) return oops('지금은 질문을 받지 않아요.');
        const text = String(m.text || '').trim().slice(0, 500); if (!text) return;
        room.questions.push({ id: nid('q'), uid: me.uid, name: me.name, church: me.church || '', text, at: Date.now(), answered: false });
        return persist();
      }
      if (me.role !== 'teacher') return oops('강사만 할 수 있어요.');
      switch (m.t) {
        case 'post': case 'edit': {
          const text = String(m.text || '').trim(); if (!text) return oops('내용을 적어 주세요.');
          let p = m.t === 'edit' ? P(m.id) : null;
          if (m.t === 'edit' && !p) return;
          const isNew = !p;
          if (isNew) { p = { id: nid('p'), at: Date.now(), votes: {}, author: me.name, pinned: false }; room.posts.push(p); }
          Object.assign(p, { type: m.type || 'notice', lesson: Number(m.lesson) || 0, title: m.title || '', text, edited: !isNew });
          if (m.question) p.question = m.question;
          if (m.fromDraft) { const d = room.drafts.find((x) => x.id === m.fromDraft); if (d) d.usedAt = Date.now(); }
          if (m.answers) { const q = room.questions.find((x) => x.id === m.answers); if (q) { q.answered = true; q.answerPost = p.id; } }
          persist(); if (isNew) crowd(p.id); return;
        }
        case 'pin': { const p = P(m.id); if (p) { p.pinned = !p.pinned; persist(); } return; }
        case 'delete': room.posts = room.posts.filter((p) => p.id !== m.id); return persist();
        case 'draft_save': {
          let d = room.drafts.find((x) => x.id === m.id);
          if (!d) { d = { id: nid('d'), at: Date.now() }; room.drafts.push(d); }
          Object.assign(d, { type: m.type || 'prompt', lesson: Number(m.lesson) || 0, title: m.title || '', text: m.text || '' });
          return persist();
        }
        case 'draft_delete': room.drafts = room.drafts.filter((d) => d.id !== m.id); return persist();
        case 'question_done': { const q = room.questions.find((x) => x.id === m.id); if (q) { q.answered = !q.answered; persist(); } return; }
        case 'lock': room.locked = !room.locked; return persist();
        case 'block': delete room.members[m.uid]; return persist();
        case 'wipe':
          room = fresh(); store.set('room', room); if (ch) ch.postMessage(1);
          sockets.forEach((s) => s.emit({ t: 'wiped', reason: '체험판을 처음 상태로 되돌렸어요' }));
          return;
      }
    }
    // 새 자료가 올라가면 가짜 참가자들이 몇 초에 걸쳐 복사·열기·따라 했어요를 누른다
    function crowd(id) {
      let i = 0; const n = 9 + Math.floor(Math.random() * 10);
      const tick = () => {
        room = store.get('room', room);
        const p = room.posts.find((x) => x.id === id); if (!p || i >= n) return;
        const u = fake[i++];
        p.votes.copy ||= {}; p.votes.open ||= {}; p.votes.done ||= {};
        if (p.type === 'prompt') p.votes.copy[u] = 1;
        if (/https?:\/\//.test(p.text)) p.votes.open[u] = 1;
        if (p.type !== 'notice' && i > 3) p.votes.done[fake[i - 4]] = 1;
        persist(); setTimeout(tick, 600 + Math.random() * 1200);
      };
      setTimeout(tick, 1500);
    }
    function exportText() {
      const L = (n) => (n ? `${n}강` : '공통'), T = { prompt: '프롬프트', link: '링크', notice: '공지', answer: '답변' };
      const out = [`# ${room.title} — 라이브톡 자료 모음`, ''];
      for (const p of [...room.posts].sort((a, b) => (a.lesson - b.lesson) || (a.at - b.at))) {
        out.push(`## [${L(p.lesson)} · ${T[p.type]}] ${p.title || ''}`.trimEnd(), '');
        if (p.question) out.push(`> 질문: ${p.question}`, '');
        out.push(p.type === 'prompt' ? '```\n' + p.text + '\n```' : p.text, '');
      }
      return out.join('\n');
    }
    return { DemoSocket, exportText };
  })() : null;

  // ── 입장 ──
  function showJoin(msg) {
    $('#liveJoin').hidden = false; $('#liveApp').hidden = true; $('#beam').hidden = true;
    document.body.classList.remove('beam');
    if (msg) $('#joinError').textContent = msg;
    document.title = '라이브톡 — 낮은자리';
  }
  async function join(e) {
    e.preventDefault();
    const f = e.target, btn = $('button[type=submit]', f);
    $('#joinError').textContent = '';
    btn.disabled = true; btn.textContent = '들어가는 중…';
    try {
      if (DEMO) {   // 체험판 입장: DEMO(참가자) · DEMO-T(강사)
        const code = f.elements.code.value.trim().toUpperCase(), name = f.elements.name.value.trim(), church = f.elements.church.value.trim();
        const uid = Math.random().toString(36).slice(2, 10);
        let me;
        if (code === 'DEMO-T') me = { role: 'teacher', name: '민경우', uid: 't-' + uid, church: '' };
        else if (code === 'DEMO') { if (!name) throw new Error('이름을 적어 주세요.'); me = { role: 'user', name, church, uid: 'u-' + uid }; }
        else throw new Error('체험판 코드는 DEMO(참가자) 또는 DEMO-T(강사)예요.');
        S.token = JSON.stringify(me); tok.set(S.token);
        store.set('lastName', name); store.set('lastChurch', church);
        return connect();
      }
      const res = await fetch(API + '/join', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: f.elements.code.value.trim(), name: f.elements.name.value.trim(), church: f.elements.church.value.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '들어가지 못했어요. 잠시 뒤 다시 해 주세요.');
      S.token = data.token; tok.set(data.token);
      store.set('lastName', f.elements.name.value.trim()); store.set('lastChurch', f.elements.church.value.trim());
      connect();
    } catch (err) {
      $('#joinError').textContent = err.message.includes('fetch') ? '서버에 닿지 않아요. 인터넷 연결을 확인해 주세요.' : err.message;
    } finally { btn.disabled = false; btn.textContent = '입장하기'; }
  }
  async function leave() {
    const ok = await confirmBox('라이브톡에서 나갈까요? 다시 들어오려면 코드를 넣어야 해요.', { ok: '나가기' });
    if (!ok) return;
    tok.del(); S.token = null;
    if (S.ws) { S.ws.onclose = null; S.ws.close(); }
    showJoin();
  }

  // ── 연결 ──
  function setConn(state) {
    const c = $('#connState');
    c.dataset.state = state;
    c.textContent = { on: '연결됨', wait: '다시 연결 중…', off: '연결 끊김' }[state];
  }
  function connect() {
    if (!S.token) return showJoin();
    if (S.ws) { S.ws.onclose = null; try { S.ws.close(); } catch {} }
    const ws = DEMO ? new Demo.DemoSocket(JSON.parse(S.token)) : new WebSocket(WS_BASE + '?token=' + encodeURIComponent(S.token));
    S.ws = ws; setConn('wait');
    ws.onopen = () => { S.retry = 0; setConn('on'); };
    ws.onmessage = (e) => handle(JSON.parse(e.data));
    ws.onclose = (e) => {
      if (e.code === 4003) { tok.del(); S.token = null; return showJoin('강사님이 이 방에서 내보냈어요.'); }
      if (e.code === 4000) return;
      setConn('wait');
      const wait = Math.min(10000, 1000 * 2 ** S.retry++);
      setTimeout(async () => {
        // 입장권이 만료됐는지 한 번 확인
        if (S.retry > 2) {
          try {
            const r = await fetch(API + '/export?token=' + encodeURIComponent(S.token), { method: 'GET' });
            if (r.status === 401) { tok.del(); S.token = null; return showJoin('입장 시간이 지났어요. 다시 들어와 주세요.'); }
          } catch {}
        }
        connect();
      }, wait);
    };
  }
  setInterval(() => { if (S.ws && S.ws.readyState === 1) S.ws.send('{"t":"ping"}'); }, 25000);

  function handle(m) {
    switch (m.t) {
      case 'hello': {
        const before = new Set(S.posts.keys());
        S.me = m.me; S.title = m.title; S.locked = m.locked;
        S.posts = new Map(m.posts.map((p) => [p.id, p]));
        S.questions = new Map((m.questions || []).map((q) => [q.id, q]));
        S.drafts = new Map((m.drafts || []).map((d) => [d.id, d]));
        S.myQuestions = new Map((m.myQuestions || []).map((q) => [q.id, q]));
        if (m.members != null) S.members = m.members;
        $('#liveJoin').hidden = true; $('#liveApp').hidden = false;
        document.body.classList.toggle('is-teacher', S.me.role === 'teacher');
        if (m.soft) {
          const added = m.posts.filter((p) => !before.has(p.id));
          const last = added[added.length - 1];
          renderAll(false, last?.id);
          if (last && !(S.me.role === 'teacher' && last.author === S.me.name) && (document.hidden || !nearBottom())) bumpUnread();
        } else renderAll(true);
        break;
      }
      case 'post': {
        const isNew = !S.posts.has(m.post.id);
        S.posts.set(m.post.id, m.post);
        if (BEAM) return renderBeam();
        renderFeed(isNew ? m.post.id : null);
        const mineNew = S.me?.role === 'teacher' && m.post.author === S.me.name;
        if (isNew && !mineNew && (document.hidden || !nearBottom())) bumpUnread();
        break;
      }
      case 'removed': S.posts.delete(m.id); BEAM ? renderBeam() : renderFeed(); break;
      case 'presence': S.online = m.online; renderCounts(); break;
      case 'people': S.members = m.members; S.people = m.list; renderCounts(); renderPeople(); break;
      case 'question':
        if (S.me.role === 'teacher') { S.questions.set(m.question.id, m.question); renderQuestions(); }
        else { S.myQuestions.set(m.question.id, m.question); renderMyQuestions(); }
        if (S.me.role === 'teacher' && !m.question.answered && document.hidden) bumpUnread();
        break;
      case 'draft': S.drafts.set(m.draft.id, m.draft); renderDrafts(); break;
      case 'draft_removed': S.drafts.delete(m.id); renderDrafts(); break;
      case 'locked': S.locked = m.locked; renderLock(); break;
      case 'error': toast(m.text); break;
      case 'wiped':
        tok.del(); S.token = null;
        showJoin(m.reason + '. 함께해 주셔서 고맙습니다.');
        break;
    }
  }

  // ── 새 글 알림 ──
  const nearBottom = () => window.innerHeight + window.scrollY > document.body.scrollHeight - 240;
  function bumpUnread() {
    S.unread++;
    document.title = `(${S.unread}) 라이브톡 — ${S.title}`;
    const pill = $('#newPill'); pill.hidden = false; pill.textContent = `새 자료 ${S.unread}개 ↓`;
  }
  function clearUnread() {
    S.unread = 0; document.title = `라이브톡 — ${S.title}`; $('#newPill').hidden = true;
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && nearBottom()) clearUnread(); });
  window.addEventListener('scroll', () => { if (S.unread && nearBottom()) clearUnread(); }, { passive: true });

  // ── 그리기 ──
  function renderAll(first, flashId) {
    if (BEAM) return renderBeam();
    $('#roomTitle').textContent = S.title;
    $('#meName').textContent = S.me.role === 'teacher' ? `${S.me.name} 강사` : S.me.name;
    document.title = `라이브톡 — ${S.title}`;
    renderFilters(); renderFeed(flashId); renderCounts(); renderLock(); renderTabs(); renderSaved();
    if (S.me.role === 'teacher') { renderQuestions(); renderDrafts(); renderPeople(); }
    else renderMyQuestions();
    if (first) setTimeout(() => window.scrollTo({ top: document.body.scrollHeight }), 50);
  }
  function renderCounts() {
    $('#onlineCount').textContent = S.me?.role === 'teacher' ? `지금 ${S.online}명 · 모두 ${S.members}명` : `지금 ${S.online}명 함께`;
    if (BEAM) { const b = $('#beamOnline'); if (b) b.textContent = `지금 ${S.online}명 함께하고 있어요`; }
  }
  function renderLock() {
    const box = $('#askBox'); if (!box) return;
    box.classList.toggle('locked', S.locked);
    $('#askText').disabled = S.locked; $('#askSend').disabled = S.locked;
    $('#askNote').textContent = S.locked ? '지금은 질문을 받지 않아요.' : '질문은 강사님께만 보여요. 답은 자료 목록에 올라와요.';
    const lb = $('#lockBtn'); if (lb) lb.textContent = S.locked ? '🔓 질문 다시 받기' : '🔒 질문 받기 멈추기';
  }

  function renderFilters() {
    const box = $('#lessonFilter'); box.replaceChildren();
    const count = (fn) => [...S.posts.values()].filter(fn).length;
    const items = [['all', '전체', S.posts.size], ...LESSONS.map((l, i) => [String(i), l, count((p) => p.lesson === i)]),
      ['pin', '📌 고정', count((p) => p.pinned)], ['saved', '⭐ 보관함', Object.keys(saves()).length]];
    for (const [key, label, n] of items) {
      if (/^[0-6]$/.test(key) && !n && key !== '0') continue;   // 자료 없는 강의는 숨김
      if (key === '0' && !n) continue;
      box.append(el('button', { type: 'button', class: 'chip' + (S.filter === key ? ' on' : ''), 'aria-pressed': S.filter === key ? 'true' : 'false',
        onclick: () => { S.filter = key; store.set('filter', key); renderFilters(); renderFeed(); } }, label, el('span', { class: 'chip-n' }, String(n))));
    }
  }

  function visiblePosts() {
    const all = [...S.posts.values()].sort((a, b) => a.at - b.at);
    const saved = saves();
    let list = all;
    if (S.filter === 'pin') list = all.filter((p) => p.pinned);
    else if (S.filter === 'saved') list = all.filter((p) => saved[p.id]);
    else if (S.filter !== 'all') list = all.filter((p) => String(p.lesson) === S.filter);
    const pinned = S.filter === 'all' ? list.filter((p) => p.pinned) : [];
    return { pinned, list: S.filter === 'all' ? list.filter((p) => !p.pinned) : list };
  }

  function renderFeed(flashId) {
    const feed = $('#feed'); const stick = nearBottom();
    feed.replaceChildren();
    const { pinned, list } = visiblePosts();
    if (!pinned.length && !list.length) {
      feed.append(el('div', { class: 'empty' },
        el('div', { class: 'empty-mark' }, '🌱'),
        el('p', {}, S.filter === 'saved' ? '⭐ 를 누른 자료가 여기에 모여요.' : S.me?.role === 'teacher' ? '아직 올린 자료가 없어요. 오른쪽(또는 [올리기])에서 첫 자료를 올려 보세요.' : '강사님이 자료를 올리면 여기에 바로 나타나요.')));
    }
    if (pinned.length) feed.append(el('div', { class: 'feed-label' }, '📌 고정된 자료'), ...pinned.map((p) => card(p)), el('div', { class: 'feed-label' }, '시간순'));
    feed.append(...list.map((p) => card(p, p.id === flashId)));
    renderFilters();
    if (flashId && stick) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  function card(p, flash) {
    const teacher = S.me?.role === 'teacher';
    const saved = saves()[p.id];
    const urls = p.text.match(URL_RE) || [];
    const react = (kind) => () => send({ t: 'react', id: p.id, kind });
    const head = el('div', { class: 'card-head' },
      el('span', { class: 'badge b-' + p.type }, TYPE[p.type]),
      el('span', { class: 'lesson' }, LESSONS[p.lesson] || '공통'),
      p.pinned ? el('span', { class: 'pin' }, '📌') : null,
      el('span', { class: 'when' }, time(p.at) + (p.edited ? ' · 고침' : '')));
    const body = [];
    if (p.title) body.push(el('h3', { class: 'card-title' }, p.title));
    if (p.type === 'answer' && p.question) body.push(el('blockquote', { class: 'q-quote' }, el('b', {}, 'Q. '), p.question));
    if (p.type === 'prompt') body.push(el('pre', { class: 'prompt-box' }, p.text));
    else {
      const rest = p.text.replace(URL_RE, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      if (rest) body.push(el('div', { class: 'card-text' }, rest));
      for (const u of urls) {
        const drive = isDrive(u);
        let host = ''; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch {}
        body.push(el('a', { class: 'file-card' + (drive ? ' drive' : ''), href: u, target: '_blank', rel: 'noopener', onclick: react('open') },
          el('span', { class: 'file-ico' }, drive ? '📄' : '🔗'),
          el('span', { class: 'file-meta' }, el('b', {}, drive ? '구글 드라이브 파일' : (p.title || host)), el('small', {}, host)),
          el('span', { class: 'file-go' }, '열기 →')));
      }
    }
    const c = p.counts, mine = p.mine;
    const acts = el('div', { class: 'card-actions' });
    if (p.type === 'prompt') {
      acts.append(el('button', { type: 'button', class: 'act act-copy', onclick: async () => {
        if (await copyText(p.text)) { toast('복사했어요 — 제미나이 창에 붙여 넣으세요 (Ctrl+V)'); if (!mine.copy) react('copy')(); }
        else toast('복사하지 못했어요. 글을 길게 눌러 직접 복사해 주세요.');
      } }, '📋 복사하기', el('span', { class: 'n' }, String(c.copy))));
    }
    if (urls.length) acts.append(el('span', { class: 'act-stat', title: '열어 본 사람' }, `🔗 ${c.open}명 열어 봄`));
    acts.append(...[
      el('button', { type: 'button', class: 'act' + (mine.like ? ' on' : ''), 'aria-pressed': mine.like ? 'true' : 'false', onclick: react('like') }, '👍', el('span', { class: 'n' }, String(c.like))),
      p.type !== 'notice' ? el('button', { type: 'button', class: 'act act-done' + (mine.done ? ' on' : ''), 'aria-pressed': mine.done ? 'true' : 'false', onclick: react('done') }, mine.done ? '✅ 따라 했어요' : '☑️ 따라 했어요', el('span', { class: 'n' }, String(c.done))) : null,
      el('button', { type: 'button', class: 'act act-save' + (saved ? ' on' : ''), title: '내 보관함', 'aria-pressed': saved ? 'true' : 'false', onclick: () => toggleSave(p) }, saved ? '⭐' : '☆'),
    ].filter(Boolean));
    const kids = [head, ...body, acts];
    if (teacher) {
      const total = Math.max(S.members, 1);
      if (p.type !== 'notice') kids.push(el('div', { class: 'progress', title: '따라 했어요 누른 사람 / 들어온 사람' },
        el('div', { class: 'bar' }, el('i', { style: `width:${Math.round((c.done / total) * 100)}%` })),
        el('span', {}, `✅ ${c.done} / ${S.members}명 · 복사 ${c.copy} · 열기 ${c.open}`)));
      kids.push(el('div', { class: 'teacher-tools' },
        el('button', { type: 'button', onclick: () => send({ t: 'pin', id: p.id }) }, p.pinned ? '고정 풀기' : '📌 고정'),
        el('button', { type: 'button', onclick: () => startEdit(p) }, '✏️ 고치기'),
        el('button', { type: 'button', class: 'danger', onclick: async () => { if (await confirmBox('이 자료를 지울까요? 참가자 화면에서도 사라져요.', { ok: '지우기', danger: true })) send({ t: 'delete', id: p.id }); } }, '🗑 지우기')));
    }
    return el('article', { class: 'card t-' + p.type + (flash ? ' flash' : ''), id: 'post-' + p.id }, ...kids);
  }

  function toggleSave(p) {
    const s = saves();
    if (s[p.id]) delete s[p.id];
    else s[p.id] = { id: p.id, type: p.type, lesson: p.lesson, title: p.title, text: p.text, at: p.at };
    store.set('saved', s);
    renderFeed(); renderSaved();
  }
  function renderSaved() {
    const s = Object.values(saves()).sort((a, b) => a.at - b.at);
    $('#savedCount').textContent = s.length ? `${s.length}개` : '';
    $('#savedEmpty').hidden = !!s.length;
  }
  function savedText() {
    return Object.values(saves()).sort((a, b) => a.at - b.at)
      .map((p) => `[${LESSONS[p.lesson]} · ${TYPE[p.type]}] ${p.title || ''}\n${p.text}`).join('\n\n────────\n\n');
  }
  function download(name, text, type = 'text/plain') {
    const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' })), download: name });
    document.body.append(a); a.click(); a.remove();
  }

  // ── 참가자: 질문 ──
  function renderMyQuestions() {
    const box = $('#myQuestions'); if (!box) return;
    box.replaceChildren(...[...S.myQuestions.values()].sort((a, b) => b.at - a.at).map((q) =>
      el('li', { class: q.answered ? 'done' : '' },
        el('span', { class: 'q-state' }, q.answered ? '답변 완료' : '보냄'),
        el('span', {}, q.text),
        q.answerPost && S.posts.has(q.answerPost) ? el('a', { href: '#post-' + q.answerPost, onclick: () => { S.filter = 'all'; renderFeed(); showTab('feed'); } }, '답 보기 →') : null)));
  }
  function ask(e) {
    e.preventDefault();
    const t = $('#askText'); const text = t.value.trim();
    if (!text) return;
    if (send({ t: 'ask', text })) { t.value = ''; toast('질문을 보냈어요. 강사님께만 보여요.'); }
  }

  // ── 강사: 올리기 · 준비함 · 질문함 · 참가자 ──
  function composerValues() {
    const f = $('#composer');
    return { type: f.elements.type.value, lesson: Number(f.elements.lesson.value), title: f.elements.title.value.trim(), text: f.elements.text.value.trim() };
  }
  function resetComposer() {
    const f = $('#composer');
    f.elements.title.value = ''; f.elements.text.value = '';
    S.editing = null; S.answering = null; S.fromDraft = null;
    $('#composerMode').hidden = true; $('#answerOf').hidden = true;
    $('#postBtn').textContent = '지금 올리기';
    updateComposerHint();
  }
  function updateComposerHint() {
    const f = $('#composer');
    $('#driveHint').hidden = !(f.elements.type.value === 'link' || /drive\.google|docs\.google/.test(f.elements.text.value));
  }
  function postNow(e) {
    e.preventDefault();
    const v = composerValues();
    if (!v.text) return toast('내용을 적어 주세요.');
    const msg = { t: S.editing ? 'edit' : 'post', id: S.editing, ...v };
    if (S.answering) { msg.type = 'answer'; msg.question = S.questions.get(S.answering)?.text; msg.answers = S.answering; }
    if (S.fromDraft) msg.fromDraft = S.fromDraft;
    if (send(msg)) { toast(S.editing ? '고쳤어요.' : '올렸어요. 참가자 화면에 바로 나타나요.'); resetComposer(); showTab('feed'); }
  }
  function saveDraft() {
    const v = composerValues();
    if (!v.text) return toast('내용을 적어 주세요.');
    if (send({ t: 'draft_save', id: S.draftEditing, ...v })) { toast('준비함에 넣었어요.'); S.draftEditing = null; resetComposer(); }
  }
  function fillComposer(src) {
    const f = $('#composer');
    f.elements.type.value = src.type === 'answer' ? 'notice' : src.type; f.elements.lesson.value = String(src.lesson || 0);
    f.elements.title.value = src.title || ''; f.elements.text.value = src.text || '';
    updateComposerHint(); showTab('compose'); f.elements.text.focus();
  }
  function startEdit(p) {
    fillComposer(p); S.editing = p.id; S.answering = null;
    $('#composerMode').hidden = false; $('#composerModeText').textContent = '올린 자료를 고치는 중';
    $('#postBtn').textContent = '고친 내용 올리기';
  }
  function renderDrafts() {
    const box = $('#draftList'); if (!box) return;
    const list = [...S.drafts.values()].sort((a, b) => (a.lesson - b.lesson) || (a.at - b.at));
    $('#draftCount').textContent = list.length ? `${list.filter((d) => !d.usedAt).length}/${list.length}` : '';
    box.replaceChildren();
    if (!list.length) return box.append(el('p', { class: 'muted' }, '강의 전에 프롬프트를 넣어 두면, 강의 중엔 [올리기] 한 번이면 돼요.'));
    let last = -1;
    for (const d of list) {
      if (d.lesson !== last) { box.append(el('div', { class: 'draft-lesson' }, LESSONS[d.lesson])); last = d.lesson; }
      box.append(el('div', { class: 'draft' + (d.usedAt ? ' used' : '') },
        el('div', { class: 'draft-top' }, el('span', { class: 'badge b-' + d.type }, TYPE[d.type]), el('b', {}, d.title || d.text.slice(0, 40)), d.usedAt ? el('span', { class: 'used-mark' }, '올림 ✓') : null),
        el('p', {}, d.text.slice(0, 140) + (d.text.length > 140 ? '…' : '')),
        el('div', { class: 'draft-tools' },
          el('button', { type: 'button', class: 'go', onclick: () => { send({ t: 'post', ...d, fromDraft: d.id }); toast('올렸어요.'); } }, '지금 올리기'),
          el('button', { type: 'button', onclick: () => { fillComposer(d); S.draftEditing = d.id; S.fromDraft = null; } }, '고치기'),
          el('button', { type: 'button', class: 'danger', onclick: async () => { if (await confirmBox('준비함에서 지울까요?', { ok: '지우기', danger: true })) send({ t: 'draft_delete', id: d.id }); } }, '지우기'))));
    }
  }
  function renderQuestions() {
    const box = $('#questionList'); if (!box) return;
    const list = [...S.questions.values()].sort((a, b) => (a.answered - b.answered) || (a.at - b.at));
    const open = list.filter((q) => !q.answered).length;
    $('#questionCount').textContent = open ? String(open) : '';
    const tabN = $('#tabQuestionsN'); if (tabN) tabN.textContent = open ? String(open) : '';
    box.replaceChildren();
    if (!list.length) return box.append(el('p', { class: 'muted' }, '참가자가 보낸 질문이 여기에 모여요. 다른 참가자에겐 보이지 않아요.'));
    for (const q of list) box.append(el('div', { class: 'question' + (q.answered ? ' done' : '') },
      el('div', { class: 'q-who' }, el('b', {}, q.name), q.church ? ` · ${q.church}` : '', el('span', { class: 'when' }, time(q.at))),
      el('p', {}, q.text),
      el('div', { class: 'draft-tools' },
        el('button', { type: 'button', class: 'go', onclick: () => {
          const f = $('#composer'); resetComposer(); S.answering = q.id;
          f.elements.type.value = 'notice'; f.elements.text.value = ''; $('#answerOf').hidden = false; $('#answerOfText').textContent = q.text;
          $('#postBtn').textContent = '모두에게 답하기'; showTab('compose'); f.elements.text.focus();
        } }, '모두에게 답하기'),
        el('button', { type: 'button', onclick: () => send({ t: 'question_done', id: q.id }) }, q.answered ? '다시 열기' : '확인함'))));
  }
  function renderPeople() {
    const box = $('#peopleList'); if (!box) return;
    $('#peopleCount').textContent = `${S.online}/${S.members}`;
    box.replaceChildren(...S.people.map((u) => el('li', {},
      el('span', {}, u.name, u.church ? el('small', {}, ' · ' + u.church) : null),
      el('button', { type: 'button', class: 'link-danger', onclick: async () => { if (await confirmBox(`${u.name} 님을 내보낼까요? 이 입장권으로는 다시 못 들어와요.`, { ok: '내보내기', danger: true })) send({ t: 'block', uid: u.uid }); } }, '내보내기'))));
  }

  // ── 좁은 창: 탭 ──
  function renderTabs() {
    const teacher = S.me.role === 'teacher';
    const tabs = teacher ? [['feed', '자료'], ['compose', '올리기'], ['drafts', '준비함'], ['questions', '질문함'], ['room', '방 관리']] : [['feed', '자료'], ['ask', '질문·보관함']];
    const bar = $('#tabBar'); bar.replaceChildren(...tabs.map(([k, label]) => el('button', { type: 'button', role: 'tab', 'data-tab': k, 'aria-selected': S.tab === k ? 'true' : 'false', onclick: () => showTab(k) },
      label, k === 'questions' ? el('span', { class: 'tab-n', id: 'tabQuestionsN' }) : null)));
    showTab(S.tab);
  }
  function showTab(k) {
    S.tab = k;
    document.body.dataset.tab = k;
    document.querySelectorAll('#tabBar [role=tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === k ? 'true' : 'false'));
    if (k !== 'feed' && window.innerWidth < 900) window.scrollTo({ top: $('#liveApp').offsetTop - 8 });
  }

  // ── 빔 화면 ──
  function renderBeam() {
    document.body.classList.add('beam');
    $('#liveJoin').hidden = true; $('#liveApp').hidden = true; $('#beam').hidden = false;
    $('#beamTitle').textContent = S.title;
    const code = store.get('beamCode', '');
    $('#beamCode').textContent = code || '아래에 코드를 적어 주세요';
    $('#beamCode').classList.toggle('empty', !code);
    renderCounts();
    const posts = [...S.posts.values()].sort((a, b) => b.at - a.at);
    const p = posts[0]; const box = $('#beamPost'); box.replaceChildren();
    if (!p) return box.append(el('p', { class: 'beam-empty' }, '곧 첫 자료가 올라와요.'));
    box.append(...[
      el('div', { class: 'beam-head' }, el('span', { class: 'badge b-' + p.type }, TYPE[p.type]), ' ', LESSONS[p.lesson]),
      p.title ? el('h2', {}, p.title) : null,
      p.type === 'answer' && p.question ? el('blockquote', { class: 'beam-q' }, 'Q. ' + p.question) : null,
      p.type === 'prompt' ? el('pre', {}, p.text) : el('p', {}, p.text),
      el('div', { class: 'beam-stats' }, `📋 복사 ${p.counts.copy}  ·  ✅ 따라 했어요 ${p.counts.done}  ·  👍 ${p.counts.like}`),
    ].filter(Boolean));
  }

  // ── 시작 ──
  document.addEventListener('DOMContentLoaded', () => {
    $('#joinForm').addEventListener('submit', join);
    $('#joinForm').elements.name.value = store.get('lastName', '');
    $('#joinForm').elements.church.value = store.get('lastChurch', '');
    if (qs.get('code')) $('#joinForm').elements.code.value = qs.get('code');
    $('#leaveBtn').addEventListener('click', leave);
    $('#newPill').addEventListener('click', () => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); clearUnread(); });
    $('#askForm').addEventListener('submit', ask);
    $('#askText').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ask(e); });
    $('#savedCopy').addEventListener('click', async () => { const t = savedText(); if (!t) return toast('⭐ 보관함이 비어 있어요.'); if (await copyText(t)) toast('보관함을 모두 복사했어요.'); });
    $('#savedDown').addEventListener('click', () => { const t = savedText(); if (!t) return toast('⭐ 보관함이 비어 있어요.'); download(`라이브톡_보관함_${S.title}.txt`, t); });
    $('#savedShow').addEventListener('click', () => { S.filter = 'saved'; store.set('filter', 'saved'); renderFeed(); showTab('feed'); });
    // 강사
    $('#composer').addEventListener('submit', postNow);
    $('#composer').addEventListener('change', updateComposerHint);
    $('#composer').elements.text.addEventListener('input', updateComposerHint);
    $('#draftBtn').addEventListener('click', saveDraft);
    $('#cancelEdit').addEventListener('click', resetComposer);
    $('#cancelAnswer').addEventListener('click', resetComposer);
    $('#lockBtn').addEventListener('click', () => send({ t: 'lock' }));
    $('#exportBtn').addEventListener('click', async () => {
      if (DEMO) { download(`라이브톡_${S.title}.md`, Demo.exportText(), 'text/markdown'); return toast('내보냈어요(체험판). 미리보기 화면에서는 파일 받기가 막혀 있을 수 있어요.'); }
      const r = await fetch(API + '/export?token=' + encodeURIComponent(S.token));
      if (!r.ok) return toast('내보내지 못했어요.');
      download(`라이브톡_${S.title}.md`, await r.text(), 'text/markdown');
    });
    $('#wipeBtn').addEventListener('click', async () => {
      const v = await confirmBox('방의 모든 자료·질문이 지워지고 되돌릴 수 없어요. 먼저 [전체 내보내기]를 해 두셨나요? 지우려면 아래에 "지금 삭제"라고 적어 주세요.', { ok: '지우기', danger: true, input: '지금 삭제' });
      if (v === null) return;
      if (v.trim() === '지금 삭제') send({ t: 'wipe', confirm: '지금 삭제' });
      else toast('확인 문구가 달라서 지우지 않았어요.');
    });
    $('#beamBtn').href = location.pathname + (qs.get('api') ? '?api=' + encodeURIComponent(qs.get('api')) : (qs.get('demo') ? '?demo=1' : '')) + '#beam';
    $('#beamCodeForm').addEventListener('submit', (e) => { e.preventDefault(); store.set('beamCode', e.target.elements.code.value.trim()); renderBeam(); });
    if (BEAM) { document.body.classList.add('beam'); $('#beam').hidden = false; }
    if (DEMO) {
      $('.join-card .lead').after(el('div', { class: 'demo-note' },
        el('b', {}, '체험판이에요 '), '— 서버 없이 이 브라우저 안에서만 돌아요. 참가자 코드 ', el('code', {}, 'DEMO'), ' · 강사 코드 ', el('code', {}, 'DEMO-T'),
        el('br'), '탭 두 개를 열어 한쪽은 강사, 한쪽은 참가자로 들어가 보세요. 가짜 참가자 20여 명이 함께 반응해요.'));
      if (!store.get('lastName', '')) $('#joinForm').elements.name.value = '홍길동 목사';
    }
    S.token ? connect() : showJoin();
  });
})();
