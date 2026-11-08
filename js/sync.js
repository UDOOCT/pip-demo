"use strict";
/* ============================================================
   Shared state + sync.
   Each phone writes ONLY its own role document (single writer,
   no conflicts). Both phones read both documents and derive the
   same cooking phase from them.
     cloud: Claude artifact `db` (persistent, realtime) + `room`
            (instant moments, presence for live stirring)
     local: one screen / same device (in-memory + BroadcastChannel)
   ============================================================ */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
const uid = (p = '') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be unavailable */ } };
const ROLES = ['grandma', 'steven'];
const otherRole = r => (r === 'grandma' ? 'steven' : 'grandma');
const STALE_MS = 3 * 60 * 60 * 1000;

function withTimeout(p, ms, fallback) {
  return Promise.race([Promise.resolve(p).catch(() => fallback), sleep(ms).then(() => fallback)]);
}
function validDoc(d) { return d && typeof d === 'object' && !Array.isArray(d) && typeof d.v === 'number'; }

class BaseHub {
  constructor() { this.subs = new Set(); this.docs = { grandma: null, steven: null }; this.moments = []; this.photos = { grandma: null, steven: null }; this._q = false; }
  subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  notify() {
    if (this._q) return; this._q = true;
    queueMicrotask(() => { this._q = false; this.subs.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); });
  }
  accept(role, doc) {
    if (!ROLES.includes(role) || !validDoc(doc)) return false;
    const cur = this.docs[role];
    if (cur && (cur.v || 0) >= doc.v) return false;
    this.docs[role] = doc; this.notify(); return true;
  }
  sortMoments() { this.moments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); }
  // selfies: one per role, for the latest cooked dish
  dropPhoto(role) { }
  acceptPhoto(role, rec) {
    if (!ROLES.includes(role)) return false;
    if (!rec) { if (this.photos[role]) { this.photos[role] = null; this.notify(); } return true; }
    if (typeof rec !== 'object' || typeof rec.at !== 'number') return false;
    const cur = this.photos[role];
    if (cur && cur.at >= rec.at) return false;
    this.photos[role] = rec; this.notify(); return true;
  }
}

/* ---------- Local hub: both phones on one screen, or two tabs on one device ---------- */
class LocalHub extends BaseHub {
  constructor(ns, opts = {}) {
    super();
    this.kind = 'local'; this.mode = opts.mode || 'same-screen'; this.ready = true; this.status = this.mode === 'same-screen' ? 'local' : 'tabs';
    this.key = 'pip-local-v1-' + ns;
    const saved = lsGet(this.key, null);
    if (saved && saved.docs) { this.docs = { grandma: saved.docs.grandma || null, steven: saved.docs.steven || null }; this.moments = saved.moments || []; }
    for (const r of ROLES) { const ph = lsGet(this.key + '-photo-' + r, null); if (ph) this.photos[r] = ph; }
    this.pres = {}; this.hosted = new Set(); this.remoteBeat = {}; this.self = uid('t');
    try { this.bc = new BroadcastChannel(this.key); this.bc.onmessage = e => this.onMsg(e.data); } catch (e) { this.bc = null; }
    this.beatTimer = setInterval(() => this.beat(), 2000);
  }
  host(role) { this.hosted.add(role); this.beat(); this.notify(); }
  post(m) { if (this.bc) try { this.bc.postMessage(Object.assign({ from: this.self }, m)); } catch (e) { } }
  persist() { lsSet(this.key, { docs: this.docs, moments: this.moments.slice(0, 40) }); }
  beat() { this.post({ type: 'beat', roles: [...this.hosted], pres: this.pres }); }
  onMsg(m) {
    if (!m || m.from === this.self) return;
    if (m.type === 'doc') { if (this.accept(m.role, m.doc)) this.persist(); }
    else if (m.type === 'beat') {
      (m.roles || []).forEach(r => { this.remoteBeat[r] = Date.now(); });
      if (m.pres) for (const r of ROLES) if (m.pres[r] && !this.hosted.has(r)) this.pres[r] = m.pres[r];
      this.notify();
    } else if (m.type === 'pres') { if (!this.hosted.has(m.role)) { this.pres[m.role] = m.p; this.notify(); } }
    else if (m.type === 'moment') { this.upsertMoment(m.data, false); }
    else if (m.type === 'clear') { this.moments = []; this.photos = { grandma: null, steven: null }; this.persist(); this.notify(); }
    else if (m.type === 'photo') { this.acceptPhoto(m.role, m.rec); }
    else if (m.type === 'hello') { this.beat(); for (const r of this.hosted) { if (this.docs[r]) this.post({ type: 'doc', role: r, doc: this.docs[r] }); if (this.photos[r]) this.post({ type: 'photo', role: r, rec: this.photos[r] }); } }
  }
  write(role, doc) { this.docs[role] = doc; this.persist(); this.post({ type: 'doc', role, doc }); this.notify(); }
  setPresence(role, p) { this.pres[role] = Object.assign({}, this.pres[role], p, { role }); this.post({ type: 'pres', role, p: this.pres[role] }); this.notify(); }
  peerPresence(role) { return this.pres[role] || null; }
  online(role) { return this.hosted.has(role) || (Date.now() - (this.remoteBeat[role] || 0) < 6000); }
  dupRole() { return false; }
  upsertMoment(data, broadcast = true) {
    if (!data || !data.id) return;
    const i = this.moments.findIndex(m => m.id === data.id);
    if (i >= 0) this.moments[i] = data; else this.moments.push(data);
    this.sortMoments(); this.persist(); if (broadcast) this.post({ type: 'moment', data }); this.notify();
  }
  saveMoment(id, data) { this.upsertMoment(Object.assign({}, data, { id })); }
  clearMoments() {
    this.moments = []; this.photos = { grandma: null, steven: null };
    for (const r of ROLES) { try { localStorage.removeItem(this.key + '-photo-' + r); } catch (e) { } }
    this.persist(); this.post({ type: 'clear' }); this.notify();
  }
  savePhoto(role, rec) { this.photos[role] = rec; lsSet(this.key + '-photo-' + role, rec); this.post({ type: 'photo', role, rec }); this.notify(); }
  dropPhoto(role) { if (!this.photos[role]) return; this.photos[role] = null; try { localStorage.removeItem(this.key + '-photo-' + role); } catch (e) { } this.post({ type: 'photo', role, rec: null }); this.notify(); }
  start() { this.post({ type: 'hello' }); return Promise.resolve(true); }
}

/* ---------- Cloud hub: Claude artifact db + room ---------- */
class CloudHub extends BaseHub {
  constructor(ns) {
    super();
    this.kind = 'cloud'; this.ns = ns; this.base = 'pip/' + ns; this.status = 'connecting'; this.ready = false;
    this.loaded = { grandma: false, steven: false }; this.writing = {}; this.dirty = {}; this.peers = []; this.myRole = null;
    this.canWrite = true; this.momentWrites = {};
  }
  async start() {
    const c = window.claude;
    if (!c || typeof c.use !== 'function') return false;
    const [db, room, user] = await Promise.all([
      withTimeout(c.use('db'), 11000, null), withTimeout(c.use('room'), 11000, null), withTimeout(c.use('user'), 11000, null)
    ]);
    this.db = db; this.room = room; this.user = user;
    if (!db && !room) { this.status = 'offline'; this.notify(); return false; }
    if (user && typeof user.can === 'function') {
      try { const can = await withTimeout(user.can('data.write'), 4000, null); if (can === false) this.canWrite = false; } catch (e) { }
    }
    if (db) this.subscribeDb(); else { this.loaded = { grandma: true, steven: true }; }
    if (room) await this.joinRoom();
    // never block the demo for long: after 4 s go ahead with what we have
    setTimeout(() => { if (!this.ready) { this.ready = true; this.notify(); } }, 4000);
    this.status = this.canWrite ? 'live' : 'view';
    this.checkReady(); this.notify();
    return true;
  }
  subscribeDb() {
    for (const r of ROLES) {
      try {
        this.db.doc(`${this.base}/roles/${r}`).onSnapshot(snap => {
          const d = snap.exists ? snap.data() : null;
          if (d) this.accept(r, clone(d));
          if (!snap.metadata || !snap.metadata.fromCache) { this.loaded[r] = true; this.checkReady(); }
        }, err => { this.loaded[r] = true; this.checkReady(); if (err && err.code === 'revoked') { this.status = 'offline'; this.notify(); } });
      } catch (e) { this.loaded[r] = true; }
    }
    for (const r of ROLES) {
      try { this.db.doc(`${this.base}/photos/${r}`).onSnapshot(snap => { this.acceptPhoto(r, snap.exists ? clone(snap.data()) : null); }, () => { }); } catch (e) { }
    }
    try {
      this.db.collection(`${this.base}/moments`).orderBy('createdAt', 'desc').limit(40).onSnapshot(qs => {
        this.moments = qs.docs.map(d => Object.assign({}, clone(d.data()), { id: d.id }));
        this.notify();
      }, () => { });
    } catch (e) { }
  }
  checkReady() { if (!this.ready && this.loaded.grandma && this.loaded.steven) { this.ready = true; this.notify(); } }
  async joinRoom() {
    let ch = null;
    try { ch = await withTimeout(this.room.join('pip-' + this.ns), 6000, null); } catch (e) { ch = null; }
    this.chan = ch || this.room;
    const onErr = () => { };
    this.chan.on('doc', msg => {
      if (!msg || msg.sameTab || !msg.data) return;
      const { role, doc } = msg.data;
      this.accept(role, doc);
    }, onErr);
    this.chan.on('moment', msg => {
      if (!msg || msg.sameTab || !msg.data || !msg.data.id) return;
      const i = this.moments.findIndex(m => m.id === msg.data.id);
      if (i >= 0) this.moments[i] = msg.data; else this.moments.push(msg.data);
      this.sortMoments(); this.notify();
    }, onErr);
    this.chan.onPeers(ch => {
      this.peers = (ch && ch.peers) ? ch.peers.slice() : [];
      if (ch && ch.joined && ch.joined.some(p => !p.sameTab)) this.rebroadcast();
      this.notify();
    }, onErr);
    if (this.myRole) this.chan.presence({ role: this.myRole }).catch(() => { });
  }
  setMyRole(role) { this.myRole = role; if (this.chan) this.chan.presence({ role }).catch(() => { }); }
  rebroadcast() { const r = this.myRole; if (r && this.docs[r] && this.chan) this.chan.emit('doc', { role: r, doc: this.docs[r] }).catch(() => { }); }
  write(role, doc) {
    this.docs[role] = doc; this.notify();
    if (this.chan) this.chan.emit('doc', { role, doc }).catch(() => { });
    if (this.db) this.flush(`${this.base}/roles/${role}`, () => this.docs[role]);
  }
  async flush(path, get, soft) {
    if (this.writing[path]) { this.dirty[path] = true; return; }
    this.writing[path] = true;
    try {
      let tries = 0;
      do {
        this.dirty[path] = false;
        const body = get();
        try { if (body) await this.db.doc(path).set(body); else await this.db.doc(path).delete(); tries = 0; }
        catch (e) {
          const code = e && e.code;
          if ((code === 'unavailable' || code === 'resource_exhausted') && tries < 4) { tries++; this.dirty[path] = true; await sleep(400 + Math.random() * 600 * tries); }
          else if (!soft && (code === 'invalid_argument' || code === 'revoked' || code === 'not_granted')) { this.canWrite = false; this.status = 'view'; this.notify(); }
        }
      } while (this.dirty[path]);
    } finally { this.writing[path] = false; }
  }
  setPresence(role, p) {
    this._pres = Object.assign({}, this._pres, p, { role });
    if (this.chan) this.chan.presence(this._pres).catch(() => { });
  }
  peerList(role) { return this.peers.filter(p => !p.sameTab && p.kind !== 'agent' && p.presence && p.presence.role === role); }
  peerPresence(role) { const l = this.peerList(role); return l.length ? l[l.length - 1].presence : null; }
  online(role) { return this.peerList(role).length > 0; }
  dupRole(role) { return this.peerList(role).length > 0; }
  saveMoment(id, data) {
    const body = Object.assign({}, data, { id });
    const i = this.moments.findIndex(m => m.id === id);
    if (i >= 0) this.moments[i] = body; else this.moments.push(body);
    this.sortMoments(); this.notify();
    this.momentWrites[id] = body;
    if (this.chan) this.chan.emit('moment', body).catch(() => { });
    if (this.db) this.flush(`${this.base}/moments/${id}`, () => this.momentWrites[id]);
  }
  savePhoto(role, rec) {
    this.photos[role] = rec; this.notify();
    this.photoWrites = Object.assign({}, this.photoWrites, { [role]: rec });
    if (this.db) this.flush(`${this.base}/photos/${role}`, () => this.photoWrites[role], true);
  }
  dropPhoto(role) {
    if (!this.photos[role]) return;
    this.photos[role] = null; this.notify();
    this.photoWrites = Object.assign({}, this.photoWrites, { [role]: null });
    if (this.db) this.flush(`${this.base}/photos/${role}`, () => null, true);
  }
  async clearMoments() {
    const ids = this.moments.map(m => m.id); this.moments = []; this.photos = { grandma: null, steven: null }; this.notify();
    if (!this.db) return;
    for (const r of ROLES) { this.photoWrites = Object.assign({}, this.photoWrites, { [r]: null }); this.flush(`${this.base}/photos/${r}`, () => null, true); }
    for (const id of ids) { this.momentWrites[id] = null; await this.flush(`${this.base}/moments/${id}`, () => null); }
  }
}

/* ---------- one phone's handle on the hub ---------- */
class RoleSync {
  constructor(hub, role) { this.hub = hub; this.role = role; if (hub.host) hub.host(role); if (hub.setMyRole) hub.setMyRole(role); }
  docs() { return this.hub.docs; }
  update(fn) {
    const cur = clone(this.hub.docs[this.role]) || {};
    const next = fn(cur) || cur;
    next.v = Math.max(((this.hub.docs[this.role] && this.hub.docs[this.role].v) || 0) + 1, Date.now());
    next.role = this.role; next.at = Date.now();
    this.hub.write(this.role, next);
  }
  setPresence(p) { this.hub.setPresence(this.role, p); }
}

/* ---------- the shared phase machine (pure) ---------- */
function roundRec(doc, round) { return doc && doc.r && doc.r.round === round ? doc.r : {}; }
function derive(g, e) {
  const V = { phase: 'idle', pipAt: 'both' };
  const latest = Math.max((g && g.at) || 0, (e && e.at) || 0);
  if (!g || !g.sid || g.endSid === g.sid || (e && e.endSid === g.sid) || (latest && Date.now() - latest > STALE_MS)) {
    V.lastSid = g && g.sid; return V;
  }
  const sid = g.sid; V.sid = sid; V.dish = DISHES[g.dish] ? g.dish : 'tomato_egg';
  const eIn = !!(e && e.sid === sid);
  if (!eIn || !e.joinAt) {
    V.phase = eIn && e.declineAt ? 'declined' : 'invited';
    V.pipAt = V.phase === 'invited' ? 'steven' : 'grandma';
    return V;
  }
  const round = Math.max(g.round || 1, e.round || 1); V.round = round;
  const gr = roundRec(g, round), er = roundRec(e, round);
  const core = DISHES[V.dish].core;
  const first = core.includes(gr.first) ? gr.first : null;
  V.order = first ? [first, core.find(c => c !== first)] : [];
  V.secret = DISHES[V.dish].secrets.includes(gr.secret) ? gr.secret : null;
  V.added = Array.isArray(er.added) ? er.added.filter(x => core.includes(x)) : [];
  V.secretIn = !!er.secretIn;
  V.twist = er.twist === 'none' || TWISTS.includes(er.twist) ? er.twist : null;
  V.stirred = !!er.stirred; V.serveAt = gr.serveAt || 0; V.thanks = !!er.thanks;
  V.reply = REPLIES[gr.reply] ? gr.reply : null;
  V.step = 0;
  if (!first) { V.phase = 'pick1'; V.pipAt = 'grandma'; return V; }
  V.step = 1;
  if (!V.added.includes(first)) { V.phase = 'add1'; V.pipAt = 'steven'; return V; }
  V.step = 2;
  if (!V.secret) { V.phase = 'pick2'; V.pipAt = 'grandma'; return V; }
  V.step = 3;
  const second = V.order[1];
  if (!V.added.includes(second) || (V.secret !== 'none' && !V.secretIn)) {
    V.phase = 'add2'; V.pipAt = 'steven'; V.sub = V.added.includes(second) ? 'sprinkle' : 'add'; return V;
  }
  if (!V.twist) { V.phase = 'twist'; V.pipAt = 'steven'; return V; }
  if (!V.serveAt) { V.phase = 'stir'; V.pipAt = 'steven'; V.step = V.stirred ? 4 : 3; return V; }
  V.step = 5; V.phase = 'done'; V.pipAt = 'both'; V.outcome = outcomeOf(V.dish, V.twist);
  return V;
}
