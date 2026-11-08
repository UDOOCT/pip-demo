"use strict";
/* ============================================================
   Web build sync: no accounts needed.
   Both phones talk through free public MQTT brokers (real-time
   message servers). Each phone connects to two brokers at once
   and sends every update through both, so one blocked network
   path does not break the demo. Role documents and keepsake
   cards are "retained" on the broker, so a phone that reloads
   gets the current state back immediately.
   ============================================================ */
const PIP_BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];

/* Privacy for selfies on public servers.
   From the kitchen code we slowly derive (PBKDF2) two things: the channel name used on the servers,
   and an AES-GCM key. Selfies are encrypted with that key before they leave the phone, so someone
   watching the public servers sees neither the kitchen code nor anyone's face. Only phones that have
   the kitchen link can read them. */
const PipCrypt = {
  ok() { return !!(window.crypto && crypto.subtle && window.TextEncoder); },
  b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); },
  unb64(str) { const b = atob(str), u8 = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i); return u8; },
  async derive(room) {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode('pip-kitchen:' + room), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode('pip-demo-v2'), iterations: 100000, hash: 'SHA-256' }, base, 384));
    const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
    const id = Array.from(bits.slice(32, 44), b => b.toString(16).padStart(2, '0')).join('');
    return { key, id };
  },
  async seal(key, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
    return { box: 2, iv: this.b64(iv), ct: this.b64(ct) };
  },
  async open(key, sealed) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.unb64(sealed.iv) }, key, this.unb64(sealed.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
};

class MqttHub extends BaseHub {
  constructor(room, opts = {}) {
    super();
    this.kind = 'cloud'; this.transport = 'mqtt'; this.status = 'connecting'; this.ready = false; this.canWrite = true;
    this.room = room; this.prefix = 'pipdemo/v1/' + room + '/'; this.key = null; this.sealedMine = null;
    this.brokers = opts.brokers || PIP_BROKERS;
    this.clients = []; this.pres = {}; this.presAt = {}; this.presFrom = {}; this.momentsMap = {};
    this.myRole = null; this.myPres = {}; this.self = uid('c'); this.everUp = false;
  }
  setMyRole(role) { this.myRole = role; this.myPres = Object.assign({}, this.myPres, { role }); this.beat(); }
  start() {
    if (this._start) return this._start;
    this._start = new Promise(async resolve => {
      if (!window.mqtt || typeof window.mqtt.connect !== 'function') { this.status = 'offline'; this.notify(); return resolve(false); }
      // private channel + photo key from the kitchen code (without WebCrypto: old channel, and no selfies are sent)
      if (PipCrypt.ok()) {
        try { const d = await PipCrypt.derive(this.room); this.key = d.key; this.prefix = 'pipdemo/v2/' + d.id + '/'; } catch (e) { this.key = null; }
      }
      let settled = false;
      const done = ok => { if (!settled) { settled = true; resolve(ok); } };
      this.brokers.forEach((url, i) => {
        let c;
        try {
          c = window.mqtt.connect(url, { clientId: 'pip_' + this.self + '_' + i, clean: true, keepalive: 20, reconnectPeriod: 2500, connectTimeout: 8000, protocolVersion: 4 });
        } catch (e) { return; }
        const rec = { url, c, up: false };
        this.clients.push(rec);
        c.on('connect', () => {
          rec.up = true; this.everUp = true; this.updateStatus();
          c.subscribe([this.prefix + 'role/+', this.prefix + 'moment/+', this.prefix + 'pres/+', this.prefix + 'photo/+', this.prefix + 'hello'], { qos: 1 }, () => { });
          // put our own state back on this broker (it may have missed writes while it was down)
          this.republish(rec);
          this.sendTo(rec, 'hello', { from: this.self }, false, 0);
          setTimeout(() => { if (!this.ready) { this.ready = true; this.notify(); } }, 900);
          done(true);
        });
        c.on('message', (topic, payload) => this.onMessage(topic, payload));
        c.on('close', () => { if (rec.up) { rec.up = false; this.updateStatus(); } });
        c.on('offline', () => { if (rec.up) { rec.up = false; this.updateStatus(); } });
        c.on('error', () => { });
      });
      setTimeout(() => { const up = this.clients.some(r => r.up); if (!up) { this.status = 'offline'; this.notify(); } done(up); }, 9500);
    });
    this.beatTimer = setInterval(() => this.beat(), 2000);
    return this._start;
  }
  updateStatus() {
    const up = this.clients.some(r => r.up);
    this.status = up ? 'live' : (this.everUp ? 'reconnecting' : 'connecting');
    this.notify();
  }
  sendTo(rec, topic, obj, retain, qos = 1) {
    if (!rec.up) return;
    try { rec.c.publish(this.prefix + topic, obj == null ? '' : JSON.stringify(obj), { qos, retain: !!retain }); } catch (e) { }
  }
  pub(topic, obj, retain, qos = 1) { this.clients.forEach(r => this.sendTo(r, topic, obj, retain, qos)); }
  republish(rec) {
    if (this.myRole && this.docs[this.myRole]) this.sendTo(rec, 'role/' + this.myRole, this.docs[this.myRole], true);
    if (this.myRole && this.sealedMine && this.photos[this.myRole] && this.photos[this.myRole].from === this.self) this.sendTo(rec, 'photo/' + this.myRole, this.sealedMine, true);
  }
  onMessage(topic, payload) {
    if (topic.indexOf(this.prefix) !== 0) return;
    const rest = topic.slice(this.prefix.length);
    const s = payload ? payload.toString() : '';
    let data = null;
    if (s) { try { data = JSON.parse(s); } catch (e) { return; } }
    if (rest.indexOf('role/') === 0) {
      const role = rest.slice(5);
      if (data) this.accept(role, data);
    } else if (rest.indexOf('moment/') === 0) {
      const id = rest.slice(7);
      if (!data) delete this.momentsMap[id];
      else if (typeof data === 'object' && DISHES[data.dish]) this.momentsMap[id] = Object.assign({}, data, { id });
      this.moments = Object.values(this.momentsMap); this.sortMoments(); this.notify();
    } else if (rest.indexOf('pres/') === 0) {
      const role = rest.slice(5);
      if (!data || data.from === this.self || !ROLES.includes(role)) return;
      this.pres[role] = data; this.presAt[role] = Date.now(); this.presFrom[role] = data.from; this.notify();
    } else if (rest.indexOf('photo/') === 0) {
      const role = rest.slice(6);
      if (!data) { this.acceptPhoto(role, null); return; }
      if (typeof data !== 'object') return;
      // plain records may only say "skipped" (no face); faces only arrive sealed
      if (data.box !== 2) { if (data.skipped === true && data.role === role && !data.data) this.acceptPhoto(role, data); return; }
      if (!this.key) return;
      PipCrypt.open(this.key, data).then(rec => {
        if (rec && typeof rec === 'object' && rec.role === role && (rec.skipped || (typeof rec.data === 'string' && rec.data.indexOf('data:image/') === 0))) this.acceptPhoto(role, rec);
      }).catch(() => { /* not our kitchen's key: ignore */ });
    } else if (rest === 'hello') {
      if (data && data.from !== this.self) { this.beat(); }
    }
  }
  write(role, doc) { this.docs[role] = doc; this.notify(); this.pub('role/' + role, doc, true); }
  beat() { if (this.myRole) this.pub('pres/' + this.myRole, Object.assign({}, this.myPres, { from: this.self, t: Date.now() }), false, 0); }
  setPresence(role, p) { this.myPres = Object.assign({}, this.myPres, p, { role }); this.pub('pres/' + role, Object.assign({}, this.myPres, { from: this.self, t: Date.now() }), false, 0); }
  fresh(role) { return Date.now() - (this.presAt[role] || 0) < 6500; }
  peerPresence(role) { return this.fresh(role) ? this.pres[role] : null; }
  online(role) { return this.fresh(role); }
  dupRole(role) { return role === this.myRole && this.fresh(role) && this.presFrom[role] && this.presFrom[role] !== this.self; }
  saveMoment(id, data) {
    const body = Object.assign({}, data, { id });
    this.momentsMap[id] = body; this.moments = Object.values(this.momentsMap); this.sortMoments(); this.notify();
    this.pub('moment/' + id, body, true);
  }
  savePhoto(role, rec) {
    // without a key (no WebCrypto) the face never leaves this phone: the other phone sees the drawn portrait
    const r = Object.assign({}, rec, { from: this.self }); this.photos[role] = r; this.notify();
    if (!this.key) { const plain = { sid: r.sid, round: r.round, role: r.role, at: r.at, skipped: true, from: r.from }; this.sealedMine = plain; this.pub('photo/' + role, plain, true); return; }
    PipCrypt.seal(this.key, r).then(sealed => {
      if (this.photos[role] !== r) return; // replaced or dropped meanwhile
      this.sealedMine = sealed; this.pub('photo/' + role, sealed, true);
    }).catch(() => { });
  }
  // the session moved on: take our selfie off the servers (the finished group photo stays on each phone)
  dropPhoto(role) {
    const p = this.photos[role];
    if (!p || role !== this.myRole) return;
    this.sealedMine = null; this.photos[role] = null; this.notify();
    this.pub('photo/' + role, null, true);
  }
  clearMoments() {
    const ids = Object.keys(this.momentsMap);
    this.momentsMap = {}; this.moments = []; this.photos = { grandma: null, steven: null }; this.notify();
    ids.forEach(id => this.pub('moment/' + id, null, true));
    ROLES.forEach(r => this.pub('photo/' + r, null, true));
  }
}
