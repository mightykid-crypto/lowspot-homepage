// 라이브톡 실시간 서버 — lowspot.net/api/live/*
//
// 홈페이지(lowspot.net/live)가 부르는 뒤편 서버. 세미나 방 하나 = Durable Object 하나.
// 비밀값(wrangler secret)으로만 코드를 확인한다 — 페이지 소스에는 코드가 없다.
//   SEMINARS  : {"세미나코드": {"room": "hannam-2026-11", "title": "한남노회 AI 세미나", "endsAt": "2026-11-17T18:00:00+09:00"}}
//   TEACHERS  : {"강사코드": {"name": "민경우", "room": "hannam-2026-11"}}
//   TOKEN_KEY : 입장권 서명 키(아무 긴 문자열)
//   DEV_CORS  : "1" 이면 다른 주소(내 PC 시험)에서 부르는 것을 허용 — 실제 배포에는 넣지 않는다
import { DurableObject } from 'cloudflare:workers';

const KEEP_DAYS = 7;          // 세미나 끝나고 이만큼 뒤 방을 지운다
const LIMIT = { name: 20, church: 30, post: 8000, title: 120, question: 500 };
const KINDS = ['copy', 'open', 'like', 'done'];   // copy·open 은 한 번 누르면 끝, like·done 은 켜고 끄기
const TOGGLE = new Set(['like', 'done']);

// ── 공통 도구 ─────────────────────────────────────────────
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signToken(payload, secret) {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return body + '.' + b64u(sig);
}
async function readToken(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64u(sig), enc.encode(body));
  if (!ok) return null;
  const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
  return p.exp && Date.now() < p.exp ? p : null;
}
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });
const parseJSON = (s, fallback) => { try { return JSON.parse(s || ''); } catch { return fallback; } };

// ── 입구(Worker) ──────────────────────────────────────────
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = env.DEV_CORS === '1'
      ? { 'access-control-allow-origin': req.headers.get('origin') || '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
      : {};
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const path = url.pathname.replace(/^\/api\/live/, '');

    if (path === '/join' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const code = clean(body.code, 60);
      const seminars = parseJSON(env.SEMINARS, {});
      const teachers = parseJSON(env.TEACHERS, {});
      let who;
      if (teachers[code]) {
        const t = teachers[code];
        who = { role: 'teacher', name: t.name, room: t.room, church: '' };
      } else if (seminars[code]) {
        const name = clean(body.name, LIMIT.name);
        if (!name) return json({ error: '이름을 적어 주세요.' }, 400, cors);
        who = { role: 'user', name, room: seminars[code].room, church: clean(body.church, LIMIT.church) };
      } else {
        return json({ error: '코드를 다시 확인해 주세요. 세미나 화면에 띄워 드린 코드예요.' }, 403, cors);
      }
      const sem = Object.values(seminars).find((s) => s.room === who.room) || {};
      const ends = Date.parse(sem.endsAt || '') || Date.now() + 2 * 864e5;
      const token = await signToken({ ...who, uid: crypto.randomUUID(), exp: ends + KEEP_DAYS * 864e5 }, env.TOKEN_KEY);
      return json({ token, role: who.role, name: who.name, title: sem.title || '라이브톡' }, 200, cors);
    }

    if (path === '/ws' || path === '/export') {
      const me = await readToken(url.searchParams.get('token'), env.TOKEN_KEY);
      if (!me) return json({ error: '입장권이 만료되었어요. 다시 들어와 주세요.' }, 401, cors);
      if (path === '/ws' && req.headers.get('upgrade') !== 'websocket') return json({ error: 'websocket 전용' }, 426, cors);
      if (path === '/export' && me.role !== 'teacher') return json({ error: '강사만 내보낼 수 있어요.' }, 403, cors);
      const sem = Object.values(parseJSON(env.SEMINARS, {})).find((s) => s.room === me.room) || {};
      const stub = env.ROOM.get(env.ROOM.idFromName(me.room));
      const fwd = new Request(req.url, req);
      fwd.headers.set('x-live-user', encodeURIComponent(JSON.stringify(me)));
      fwd.headers.set('x-live-seminar', encodeURIComponent(JSON.stringify(sem)));
      const res = await stub.fetch(fwd);
      if (path === '/export') return new Response(res.body, { status: res.status, headers: { ...Object.fromEntries(res.headers), ...cors } });
      return res;
    }
    return json({ error: '없는 주소예요.' }, 404, cors);
  },
};

// ── 세미나 방(Durable Object) ─────────────────────────────
export class LiveRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.loaded = null;
    this.lastAsk = new Map();   // uid → 마지막 질문 시각(도배 방지)
  }

  async load() {
    if (this.loaded) return this.loaded;
    const all = await this.ctx.storage.list();
    const s = { meta: all.get('meta') || { locked: false }, posts: new Map(), questions: new Map(), drafts: new Map(), members: new Map(), blocked: all.get('blocked') || {} };
    for (const [k, v] of all) {
      if (k.startsWith('p:')) s.posts.set(v.id, v);
      else if (k.startsWith('q:')) s.questions.set(v.id, v);
      else if (k.startsWith('d:')) s.drafts.set(v.id, v);
      else if (k.startsWith('m:')) s.members.set(k.slice(2), v);
    }
    this.loaded = s;
    return s;
  }

  async fetch(req) {
    const me = JSON.parse(decodeURIComponent(req.headers.get('x-live-user')));
    const sem = JSON.parse(decodeURIComponent(req.headers.get('x-live-seminar') || '{}'));
    const s = await this.load();
    // 세미나 끝 + 7일 뒤 자동 삭제 알람
    const ends = Date.parse(sem.endsAt || '');
    if (ends && !(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(ends + KEEP_DAYS * 864e5);
    if (sem.title && s.meta.title !== sem.title) { s.meta.title = sem.title; await this.ctx.storage.put('meta', s.meta); }

    if (new URL(req.url).pathname.endsWith('/export')) {
      return new Response(this.exportText(s), {
        headers: { 'content-type': 'text/markdown; charset=utf-8', 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent('라이브톡_' + (s.meta.title || '세미나') + '.md')}` },
      });
    }
    if (s.blocked[me.uid]) return new Response('차단됨', { status: 403 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(me);
    if (me.role === 'user' && !s.members.has(me.uid)) {
      const m = { name: me.name, church: me.church, at: Date.now() };
      s.members.set(me.uid, m);
      await this.ctx.storage.put('m:' + me.uid, m);
    }
    server.send(JSON.stringify(this.snapshot(s, me)));
    this.broadcastPresence(s);
    return new Response(null, { status: 101, webSocket: client });
  }

  // ── 보내는 모양 ──
  publicPost(p, uid) {
    const counts = {}, mine = {};
    for (const k of KINDS) { const v = p.votes?.[k] || {}; counts[k] = Object.keys(v).length; mine[k] = !!v[uid]; }
    const { votes, ...rest } = p;
    return { ...rest, counts, mine };
  }
  online(s) {
    const seen = new Map();
    for (const ws of this.ctx.getWebSockets()) { if (ws.readyState !== 1) continue; const u = ws.deserializeAttachment(); if (u) seen.set(u.uid, u); }
    return [...seen.values()];
  }
  snapshot(s, me) {
    const posts = [...s.posts.values()].sort((a, b) => a.at - b.at).map((p) => this.publicPost(p, me.uid));
    const out = { t: 'hello', me: { name: me.name, role: me.role, uid: me.uid }, title: s.meta.title || '라이브톡', locked: !!s.meta.locked, posts };
    if (me.role === 'teacher') {
      out.questions = [...s.questions.values()].sort((a, b) => a.at - b.at);
      out.drafts = [...s.drafts.values()].sort((a, b) => (a.lesson - b.lesson) || (a.at - b.at));
      out.members = s.members.size;
    } else {
      out.myQuestions = [...s.questions.values()].filter((q) => q.uid === me.uid);
    }
    return out;
  }
  send(filter, msg) {
    const data = typeof msg === 'function' ? null : JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      const u = ws.deserializeAttachment();
      if (!u || !filter(u)) continue;
      try { ws.send(data ?? JSON.stringify(msg(u))); } catch {}
    }
  }
  broadcastPresence(s) {
    const on = this.online(s);
    const users = on.filter((u) => u.role === 'user');
    this.send(() => true, { t: 'presence', online: users.length });
    this.send((u) => u.role === 'teacher', { t: 'people', members: s.members.size, list: users.map((u) => ({ uid: u.uid, name: u.name, church: u.church })) });
  }
  sendPost(s, p) { this.send(() => true, (u) => ({ t: 'post', post: this.publicPost(p, u.uid) })); }

  // ── 받는 말 ──
  async webSocketMessage(ws, raw) {
    const me = ws.deserializeAttachment();
    const s = await this.load();
    if (!me || s.blocked[me.uid]) return ws.close(4003, '차단됨');
    const m = typeof raw === 'string' ? parseJSON(raw, {}) : {};
    const teacher = me.role === 'teacher';
    const reply = (msg) => ws.send(JSON.stringify(msg));
    const oops = (text) => reply({ t: 'error', text });

    switch (m.t) {
      case 'ping': return reply({ t: 'pong' });

      case 'react': {
        const p = s.posts.get(m.id);
        if (!p || !KINDS.includes(m.kind)) return;
        p.votes ||= {}; p.votes[m.kind] ||= {};
        const v = p.votes[m.kind];
        if (TOGGLE.has(m.kind) && v[me.uid]) delete v[me.uid];
        else if (!v[me.uid]) v[me.uid] = 1;
        else return;   // 복사·열기는 한 사람 한 번만 센다
        await this.ctx.storage.put('p:' + p.id, p);
        return this.sendPost(s, p);
      }

      case 'ask': {
        if (s.meta.locked) return oops('지금은 질문을 받지 않아요.');
        const text = clean(m.text, LIMIT.question);
        if (!text) return;
        const last = this.lastAsk.get(me.uid) || 0;
        if (Date.now() - last < 10_000) return oops('질문은 10초에 한 번씩 보낼 수 있어요.');
        this.lastAsk.set(me.uid, Date.now());
        const q = { id: 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), uid: me.uid, name: me.name, church: me.church, text, at: Date.now(), answered: false };
        s.questions.set(q.id, q);
        await this.ctx.storage.put('q:' + q.id, q);
        this.send((u) => u.role === 'teacher' || u.uid === me.uid, { t: 'question', question: q });
        return;
      }
    }

    if (!teacher) return oops('강사만 할 수 있어요.');

    switch (m.t) {
      case 'post': case 'edit': {
        const type = ['prompt', 'link', 'notice', 'answer'].includes(m.type) ? m.type : 'notice';
        const text = clean(m.text, LIMIT.post);
        if (!text) return oops('내용을 적어 주세요.');
        const base = m.t === 'edit' ? s.posts.get(m.id) : null;
        if (m.t === 'edit' && !base) return;
        const p = {
          ...(base || { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: Date.now(), votes: {}, author: me.name }),
          type, lesson: Math.max(0, Math.min(6, Number(m.lesson) || 0)), title: clean(m.title, LIMIT.title), text,
          pinned: !!(base?.pinned ?? m.pinned), edited: !!base,
        };
        if (m.question) p.question = clean(m.question, LIMIT.question);
        s.posts.set(p.id, p);
        await this.ctx.storage.put('p:' + p.id, p);
        if (m.fromDraft && s.drafts.has(m.fromDraft)) {
          const d = s.drafts.get(m.fromDraft); d.usedAt = Date.now();
          await this.ctx.storage.put('d:' + d.id, d);
          this.send((u) => u.role === 'teacher', { t: 'draft', draft: d });
        }
        if (m.answers && s.questions.has(m.answers)) {
          const q = s.questions.get(m.answers); q.answered = true; q.answerPost = p.id;
          await this.ctx.storage.put('q:' + q.id, q);
          this.send((u) => u.role === 'teacher' || u.uid === q.uid, { t: 'question', question: q });
        }
        return this.sendPost(s, p);
      }
      case 'pin': {
        const p = s.posts.get(m.id); if (!p) return;
        p.pinned = !p.pinned;
        await this.ctx.storage.put('p:' + p.id, p);
        return this.sendPost(s, p);
      }
      case 'delete': {
        if (!s.posts.delete(m.id)) return;
        await this.ctx.storage.delete('p:' + m.id);
        return this.send(() => true, { t: 'removed', id: m.id });
      }
      case 'draft_save': {
        const d = {
          ...(s.drafts.get(m.id) || { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: Date.now() }),
          type: ['prompt', 'link', 'notice'].includes(m.type) ? m.type : 'prompt',
          lesson: Math.max(0, Math.min(6, Number(m.lesson) || 0)), title: clean(m.title, LIMIT.title), text: clean(m.text, LIMIT.post), by: me.name,
        };
        if (!d.text) return oops('내용을 적어 주세요.');
        s.drafts.set(d.id, d);
        await this.ctx.storage.put('d:' + d.id, d);
        return this.send((u) => u.role === 'teacher', { t: 'draft', draft: d });
      }
      case 'draft_delete': {
        if (!s.drafts.delete(m.id)) return;
        await this.ctx.storage.delete('d:' + m.id);
        return this.send((u) => u.role === 'teacher', { t: 'draft_removed', id: m.id });
      }
      case 'question_done': {
        const q = s.questions.get(m.id); if (!q) return;
        q.answered = !q.answered;
        await this.ctx.storage.put('q:' + q.id, q);
        return this.send((u) => u.role === 'teacher' || u.uid === q.uid, { t: 'question', question: q });
      }
      case 'lock': {
        s.meta.locked = !s.meta.locked;
        await this.ctx.storage.put('meta', s.meta);
        return this.send(() => true, { t: 'locked', locked: s.meta.locked });
      }
      case 'block': {
        s.blocked[m.uid] = true;
        await this.ctx.storage.put('blocked', s.blocked);
        for (const w of this.ctx.getWebSockets()) if (w.deserializeAttachment()?.uid === m.uid) w.close(4003, '강사가 내보냈어요');
        return this.broadcastPresence(s);
      }
      case 'wipe': {
        if (m.confirm !== '지금 삭제') return oops('확인 문구가 맞지 않아요.');
        return this.wipe('강사가 방을 지웠어요');
      }
    }
  }

  async webSocketClose(ws) {
    try { ws.close(); } catch {}
    this.broadcastPresence(await this.load());
  }
  async webSocketError(ws) { await this.webSocketClose(ws); }

  async alarm() { await this.wipe('보관 기간(7일)이 지나 방을 지웠어요'); }

  async wipe(reason) {
    this.send(() => true, { t: 'wiped', reason });
    for (const ws of this.ctx.getWebSockets()) { try { ws.close(4000, 'wiped'); } catch {} }
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    this.loaded = null;
  }

  exportText(s) {
    const L = (n) => (n ? `${n}강` : '공통');
    const T = { prompt: '프롬프트', link: '링크', notice: '공지', answer: '답변' };
    const lines = [`# ${s.meta.title || '라이브톡'} — 라이브톡 자료 모음`, '', `> 내보낸 때: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · 참가 ${s.members.size}명`, ''];
    for (const p of [...s.posts.values()].sort((a, b) => (a.lesson - b.lesson) || (a.at - b.at))) {
      const c = (k) => Object.keys(p.votes?.[k] || {}).length;
      lines.push(`## [${L(p.lesson)} · ${T[p.type]}] ${p.title || ''}`.trimEnd(), '');
      if (p.question) lines.push(`> 질문: ${p.question}`, '');
      lines.push(p.type === 'prompt' ? '```\n' + p.text + '\n```' : p.text, '');
      lines.push(`복사 ${c('copy')} · 열기 ${c('open')} · 👍 ${c('like')} · ✅ ${c('done')}`, '');
    }
    const qs = [...s.questions.values()];
    if (qs.length) {
      lines.push('## 받은 질문', '');
      for (const q of qs.sort((a, b) => a.at - b.at)) lines.push(`- ${q.answered ? '✅' : '⬜'} ${q.name}${q.church ? ` (${q.church})` : ''}: ${q.text}`);
    }
    return lines.join('\n') + '\n';
  }
}
