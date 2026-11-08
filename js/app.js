"use strict";
/* ============================================================
   PIP app: one phone's experience (Grandma or Steven)
   ============================================================ */
const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// speech-bubble text, one span per word so the words can drift in one after another
const wordSpans = (s, from = 0) => esc(s).split(' ').map((w, i) => `<span class="w" style="--i:${i + from}">${w}</span>`).join(' ');
let APP_SEQ = 0;

/* ---------- little synth for cozy sounds (no audio files) ---------- */
class Sfx {
  constructor() { this.ctx = null; this.on = lsGet('pip-sound', true) !== false; }
  unlock() {
    try {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => { });
    } catch (e) { this.ctx = null; }
  }
  setOn(v) { this.on = v; lsSet('pip-sound', v); }
  ok() { return this.on && this.ctx && this.ctx.state === 'running'; }
  tone(f, d, type = 'sine', vol = 0.14, when = 0, to = null) {
    const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
  }
  noise(d, vol, freq, type = 'bandpass', when = 0) {
    const c = this.ctx, t = c.currentTime + when, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = type; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  }
  play(name) {
    if (!this.ok()) return;
    try {
      switch (name) {
        case 'pop': this.tone(620, 0.09, 'triangle', 0.12, 0, 900); break;
        case 'hop': this.tone(320, 0.11, 'sine', 0.1, 0, 620); this.tone(340, 0.11, 'sine', 0.08, 0.32, 650); this.tone(360, 0.11, 'sine', 0.07, 0.64, 700); break;
        case 'plop': this.tone(240, 0.14, 'sine', 0.2, 0, 110); this.noise(0.12, 0.05, 900); break;
        case 'sizzle': this.noise(0.8, 0.05, 4200, 'highpass'); break;
        case 'sparkle': [1320, 1760, 2093].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.06, i * 0.06)); break;
        case 'chime': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, 'sine', 0.09, i * 0.09)); break;
        case 'yum': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.08, i * 0.08)); break;
        case 'blehh': this.tone(420, 0.45, 'sawtooth', 0.05, 0, 130); this.tone(300, 0.3, 'square', 0.03, 0.12, 110); break;
        case 'ding': this.tone(880, 0.18, 'sine', 0.1); this.tone(1320, 0.26, 'sine', 0.08, 0.1); break;
        case 'chew': this.noise(0.06, 0.06, 700, 'bandpass', 0); this.noise(0.06, 0.06, 650, 'bandpass', 0.18); this.noise(0.06, 0.06, 700, 'bandpass', 0.36); break;
        case 'crack': this.noise(0.05, 0.16, 2600, 'bandpass'); this.tone(1500, 0.04, 'square', 0.025); this.noise(0.04, 0.1, 3200, 'bandpass', 0.06); break;
        case 'chop': this.tone(190, 0.07, 'sine', 0.16, 0, 90); this.noise(0.04, 0.1, 1900, 'bandpass'); break;
        case 'pour': this.noise(0.55, 0.035, 1500, 'lowpass'); this.noise(0.45, 0.02, 3800, 'bandpass', 0.08); break;
        case 'toss': this.noise(0.3, 0.05, 3600, 'highpass'); this.tone(150, 0.12, 'sine', 0.06, 0, 85); break;
        case 'clink': this.tone(1900, 0.3, 'sine', 0.06); this.tone(2850, 0.22, 'sine', 0.035, 0.015); break;
        case 'shutter': this.noise(0.035, 0.14, 2800, 'bandpass'); this.noise(0.05, 0.1, 2000, 'bandpass', 0.09); break;
      }
    } catch (e) { }
  }
}
const SFX = new Sfx();

function speak(text, lang) {
  try {
    const s = window.speechSynthesis; if (!s || !window.SpeechSynthesisUtterance) return false;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.95;
    const v = (s.getVoices() || []).find(x => x.lang && x.lang.toLowerCase().indexOf('en') === 0);
    if (v) u.voice = v;
    s.speak(u); return true;
  } catch (e) { return false; }
}
const canSpeak = () => !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
const haptic = (ms = 12) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

function pipMarkup(expr = 'idle', cls = '') {
  return `<div class="pip ${cls}"><div class="pip-body" style="background-image:url(${Art.fluff()})"></div><div class="pip-face-wrap">${Art.face(expr)}</div></div>`;
}
function miniPip(expr = 'idle', cls = '') {
  return `<span class="mini-pip ${cls}" aria-hidden="true"><span class="mp-body" style="background-image:url(${Art.fluff()})"></span>${Art.face(expr)}</span>`;
}
function fmtDate(ms) {
  try { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(ms || Date.now())); }
  catch (e) { return ''; }
}

/* ============================================================ */
class PipApp {
  constructor(root, { role, sync, split, onSwitch, shareUrl, room }) {
    this.id = 'p' + (++APP_SEQ);
    this.root = root; this.role = role; this.split = !!split; this.onSwitch = onSwitch; this.shareUrl = shareUrl; this.roomCode = room;
    const defaults = role === 'grandma' ? { mode: 'easy' } : { mode: 'standard' };
    this.prefs = Object.assign(defaults, lsGet('pip-prefs-' + role, {}));
    this.prefs.lang = 'en'; // the demo runs in English throughout
    this.local = { gScreen: 'home', laterSaid: false, overlay: null, overlayArg: null };
    this.stir = 0; this.lastPres = 0; this.seenWave = {}; this.savedMoment = {}; this.timers = [];
    this.view = derive(null, null); this.shown = null; this.live = false;
    this.build();
    this.attach(sync);
  }
  t(k, v) { return tr(this.prefs.lang, k, v); }
  get other() { return otherRole(this.role); }
  name(r) { return this.t('name_' + r); }

  attach(sync) {
    if (this.unsub) this.unsub();
    this.sync = sync; this.hub = sync.hub;
    this.unsub = this.hub.subscribe(() => this.update());
    // remember waves already on record so only new ones toast
    for (const r of ROLES) { const d = this.hub.docs[r]; this.seenWave[r] = d && d.waveAt || 0; }
    this.live = false; this.shown = null;
    this.update();
  }
  destroy() {
    if (this.unsub) this.unsub();
    if (this.ro) this.ro.disconnect();
    if (this.cook) this.cook.stop(); if (this.mini) this.mini.stop(); if (this.cam) this.cam.stop();
    this.timers.forEach(clearTimeout); clearInterval(this.holdTimer); clearTimeout(this.gcTimer); clearTimeout(this.snapNowTimer);
    this.root.innerHTML = '';
  }
  later(fn, ms) { const id = setTimeout(fn, ms); this.timers.push(id); return id; }
  savePrefs() { lsSet('pip-prefs-' + this.role, this.prefs); }

  /* ---------------- shell ---------------- */
  build() {
    const r = this.root;
    r.innerHTML = `
    <div class="app" data-role="${this.role}">
      <header class="topbar" data-topbar>
        <div class="brand">${miniPip('idle')}<span class="wordmark">PIP</span></div>
        <div class="presence"><div class="partner" data-partner></div><span class="sync-pill" data-st></span></div>
        <div class="tb-actions">
          <button class="iconbtn" data-act="sound" type="button"></button>
          <button class="iconbtn" data-act="menu" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg></button>
        </div>
      </header>
      <div class="banner" data-banner hidden></div>
      <div class="toasts" data-toasts aria-live="polite"></div>
      <main class="stage" data-stage>
        <div class="world" data-world>
          <div class="scene-wrap" data-scene></div>
          <canvas class="cook-cv" data-cook aria-hidden="true" hidden></canvas>
          <div class="wok-hit" data-hit hidden><span class="drop-ring" aria-hidden="true"></span><svg class="stir-guide" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="100" cy="30" rx="97" ry="27"/></svg></div>
          <div class="pip-actor" data-pip>
            <div class="pip-mover" data-mover>
              <div class="carry" data-carry></div>
              ${pipMarkup('idle')}
            </div>
            <div class="bubble" data-bubble hidden></div>
          </div>
          <div class="away" data-away hidden></div>
          <canvas class="fx-cv" data-fx aria-hidden="true"></canvas>
        </div>
        <div class="porthole" data-port hidden></div>
        <div class="photo" data-photo hidden></div>
      </main>
      <section class="sheet" data-sheet>
        <div class="ribbon" data-ribbon hidden></div>
        <div class="panel" data-panel></div>
      </section>
      <div class="overlay" data-overlay hidden></div>
      <div class="sr-only" aria-live="polite" data-announce></div>
    </div>`;
    const q = s => r.querySelector(s);
    this.el = {
      app: q('.app'), st: q('[data-st]'), partner: q('[data-partner]'), banner: q('[data-banner]'), toasts: q('[data-toasts]'),
      stage: q('[data-stage]'), world: q('[data-world]'), scene: q('[data-scene]'), cookCv: q('[data-cook]'), fxCv: q('[data-fx]'), hit: q('[data-hit]'),
      pip: q('[data-pip]'), mover: q('[data-mover]'), carry: q('[data-carry]'), bubble: q('[data-bubble]'),
      away: q('[data-away]'), port: q('[data-port]'), photo: q('[data-photo]'), ribbon: q('[data-ribbon]'), panel: q('[data-panel]'),
      sheet: q('[data-sheet]'), overlay: q('[data-overlay]'), announce: q('[data-announce]'), snd: q('[data-act="sound"]'), menu: q('[data-act="menu"]'), topbar: q('[data-topbar]')
    };
    this.applyPrefs();
    // the cooking stage: Steven's stove and wok, plus effects drawn above PIP on both phones
    const play = n => SFX.play(n);
    this.cook = new CookStage(this.role === 'steven' ? this.el.cookCv : null, this.el.fxCv, { sfx: play });
    // Fit the illustrated world to the stage. It covers the stage like a background, but on short
    // screens it shrinks so PIP, the counter and room for a speech bubble stay below the top bar.
    // (The scene art keeps painting past its edges, so a smaller world never shows a gap.)
    const fit = () => {
      const s = this.el.stage.getBoundingClientRect();
      if (!s.width || !s.height) return;
      if (this.holdFit) { this.placePort(); return; } // the sheet is gliding: keep the room steady until it lands
      const cover = Math.min(Math.max(s.width, s.height * 390 / 420), s.width * 1.08);
      const room = s.height - this.topSafe();
      const w = Math.round(Math.max(s.width * 0.58, Math.min(cover, room * 390 / this.focusBand())));
      this.el.world.style.width = w + 'px';
      this.el.world.style.setProperty('--stage-h', s.height + 'px');
      this.el.world.style.setProperty('--wscale', (w / 390).toFixed(4));
      this.placeBubble(); this.placePort();
      if (this.cook) this.cook.resize();
    };
    this.fit = fit;
    fit();
    if (window.ResizeObserver) { this.ro = new ResizeObserver(fit); this.ro.observe(this.el.stage); }
    r.addEventListener('click', e => this.onClick(e));
    r.addEventListener('pointerdown', () => SFX.unlock(), { capture: true });
    r.addEventListener('keydown', e => { if (e.key === 'Escape' && this.local.overlay && !['card', 'invite', 'selfie'].includes(this.local.overlay)) this.closeOverlay(); });
    r.addEventListener('change', e => { if (e.target && e.target.matches && e.target.matches('[data-snapfile]') && e.target.files && e.target.files[0]) this.onSnapFile(e.target.files[0]); });
    this.setupDrag(); this.setupStir(); this.setupPipTouch();
  }
  applyPrefs() {
    const a = this.el.app;
    a.classList.toggle('mode-easy', this.prefs.mode === 'easy'); a.classList.toggle('mode-standard', this.prefs.mode !== 'easy');
    a.setAttribute('lang', 'en');
    this.el.menu.setAttribute('aria-label', this.t('menu'));
    this.renderSound();
  }
  renderSound() {
    const on = SFX.on;
    this.el.snd.setAttribute('aria-label', on ? this.t('soundOn') : this.t('soundOff'));
    this.el.snd.setAttribute('aria-pressed', on ? 'true' : 'false');
    this.el.snd.innerHTML = on
      ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
      : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }

  /* ---------------- state updates ---------------- */
  update() {
    const d = this.hub.docs;
    const v = derive(d.grandma, d.steven);
    if (v.phase !== 'idle') { this.local.gScreen = 'home'; this.local.laterSaid = false; }
    const prev = this.view; this.view = v;
    this.announceDiff(prev, v);
    this.handleWaves();
    this.renderTop();
    if (this.role === 'grandma') this.scribe(v);
    const key = this.keyOf(v);
    if (key !== this.lastKey || !this.live) { this.lastKey = key; this.schedule(); }
    else this.refreshLive(v);
    this.photoTick(v);
    this.photoGC(v);
  }
  // once the session has moved on, take this phone's selfie off the sync servers
  // (waits a moment so a half-loaded state never removes a photo that is still needed)
  photoGC(v) {
    const stale = vv => { const m = this.hub.photos && this.hub.photos[this.role]; return !!m && this.hub.ready && !(vv.phase === 'done' && m.sid === vv.sid && m.round === vv.round); };
    if (!stale(v)) { clearTimeout(this.gcTimer); this.gcTimer = null; return; }
    if (this.gcTimer) return;
    this.gcTimer = setTimeout(() => { this.gcTimer = null; if (stale(this.view)) this.hub.dropPhoto(this.role); }, 2500);
  }
  keyOf(v) {
    return [v.phase, v.sid, v.round, v.sub, v.twist, v.stirred, v.thanks, v.reply, this.local.gScreen, this.local.laterSaid,
      this.hub.moments.length, this.hub.ready, this.hub.status, this.prefs.lang, this.prefs.mode].join('|');
  }
  schedule() {
    if (this.running) { this.pending = true; return; }
    this.running = true;
    (async () => {
      try { do { this.pending = false; await this.apply(this.view); } while (this.pending); }
      catch (e) { console.error(e); }
      finally { this.running = false; }
    })();
  }
  pipHere(v) { return v.pipAt === 'both' || v.pipAt === this.role; }
  sceneOf(v) {
    if (v.phase === 'idle') return 'home';
    if (this.role === 'steven' && (v.phase === 'invited' || v.phase === 'declined')) return 'home';
    return 'kitchen';
  }

  async apply(v) {
    const prev = this.shown; const live = this.live && !!prev;
    const scene = this.sceneOf(v);
    const sceneKey = scene + (scene === 'home' ? ':' + Math.min(this.hub.moments.length, 5) : '');
    if (sceneKey !== this.sceneKey) { this.sceneKey = sceneKey; this.setScene(scene, live && prev && this.sceneOf(prev) !== scene); }
    const h0 = live ? this.el.sheet.getBoundingClientRect().height : 0;
    this.renderCook(v, live); this.renderRibbon(v); this.renderPort(v, live); this.renderPanel(v, prev);
    if (live) this.glideSheet(h0);
    // PIP travels between the two phones
    const here = this.pipHere(v);
    const wasHere = this.pipHereShown;
    this.setPipPos(v);
    if (!live || wasHere === undefined) {
      this.pipHereShown = here; this.el.pip.hidden = !here; this.setCarry(this.restCarry(v));
    } else if (wasHere && !here) {
      this.pipHereShown = false; this.hideBubble();
      if (this.flyPromise) { await this.flyPromise; this.flyPromise = null; }
      await this.travel('out', this.carryFor(prev, v));
    } else if (!wasHere && here) {
      this.pipHereShown = true;
      // PIP needs a moment to cross from the other phone
      if (!reduceMotion()) await sleep(this.hub.kind === 'cloud' ? 450 : 750);
      await this.travel('in', this.carryFor(prev, v));
    } else if (here) {
      this.setCarry(this.restCarry(v));
    }
    this.renderAway(v); this.renderWatch(v);
    this.setExpression(this.exprOf(v));
    this.renderBubble(v);
    await this.phaseEffects(prev, v, live);
    this.renderOverlay(v, prev, live);
    this.shown = v; this.live = true;
  }

  // the bottom sheet eases to its new height instead of jumping
  glideSheet(h0) {
    const sh = this.el.sheet, h1 = sh.getBoundingClientRect().height;
    if (reduceMotion() || !sh.animate || Math.abs(h1 - h0) < 6) return;
    if (this.sheetAnim) this.sheetAnim.cancel();
    this.holdFit = true; sh.classList.add('gliding');
    const a = this.sheetAnim = sh.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 440, easing: 'cubic-bezier(.22, .9, .26, 1)' });
    const done = () => { if (this.sheetAnim !== a) return; this.sheetAnim = null; this.holdFit = false; sh.classList.remove('gliding'); this.fit(); };
    a.finished.then(done, done);
  }

  refreshLive(v) {
    // presence-only changes: what Steven is adding right now, stirring progress, partner status
    if (this.role === 'grandma') { this.renderPort(v, true); if (v.phase === 'stir') this.renderServeState(v); }
    this.renderTop(); this.renderWatch(v);
  }

  /* ---------------- top bar, banners ---------------- */
  renderTop() {
    const h = this.hub, other = this.other;
    const st = h.kind === 'cloud' ? (h.status === 'live' ? (h.ready ? 'live' : 'connecting') : h.status) : (h.mode === 'same-screen' ? 'local' : 'tabs');
    const lbl = { live: this.t('st_live'), connecting: this.t('st_connecting'), reconnecting: this.t('st_reconnecting'), local: this.t('st_local'), tabs: this.offlineNote ? this.t('st_offline') : this.t('st_tabs'), view: this.t('st_view'), offline: this.t('st_offline') }[st] || '';
    if (this.el.st.dataset.v !== st + this.prefs.lang) { this.el.st.dataset.v = st + this.prefs.lang; this.el.st.className = 'sync-pill st-' + st; this.el.st.innerHTML = `<i></i><span class="sl">${esc(lbl)}</span>`; }
    const on = h.online(other);
    // while Steven cooks, the presence pill turns into "Grandma is watching" (no extra chip on the stage)
    const watching = on && this.role === 'steven' && this.view && ['add1', 'add2', 'twist', 'stir'].includes(this.view.phase);
    const ph = `<span class="av av-${other}" aria-hidden="true">${esc(this.t('avatar_' + other))}</span>` + (watching
      ? `<span class="pname pwatch">${esc(this.t('g_watching'))}</span><span class="eyes" aria-hidden="true">👀</span>`
      : `<span class="pname">${esc(this.name(other))}</span><span class="pdot ${on ? 'on' : ''}"></span><span class="pst">${esc(on ? this.t('here') : this.t('away'))}</span>`);
    this.el.partner.classList.toggle('is-watching', !!watching);
    if (this.el.partner.dataset.v !== ph) { this.el.partner.dataset.v = ph; this.el.partner.innerHTML = ph; }
    let banner = '';
    if (this.offlineNote) banner = this.t('offline_help');
    else if (h.status === 'view') banner = this.t('readonly');
    else if (h.dupRole && h.dupRole(this.role)) banner = this.t('dup_role', { name: this.name(this.role) });
    if (this.el.banner.textContent !== banner) { this.el.banner.textContent = banner; this.el.banner.hidden = !banner; }
  }
  toast(text, icon = '') {
    const t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = `${icon}<span>${esc(text)}</span>`;
    this.el.toasts.appendChild(t);
    this.later(() => t.classList.add('out'), 3000); this.later(() => t.remove(), 3500);
  }
  say(text) { this.el.announce.textContent = ''; this.later(() => { this.el.announce.textContent = text; }, 40); }

  announceDiff(p, v) {
    if (!this.live || !p) return;
    const L = this.prefs.lang;
    if (this.role === 'steven') {
      if (p.phase === 'pick1' && v.phase === 'add1') this.say(this.t('t_g_chose', { ing: ingName(v.order[0], L) }));
      if (v.reply && v.reply !== p.reply) { this.toast(this.t('t_g_reply', { r: '“' + REPLIES[v.reply].en + '”' }), Art.icon('heart', 'ti')); SFX.play('ding'); }
    } else {
      if ((p.phase === 'invited' || p.phase === 'declined') && v.phase === 'pick1') { this.say(this.t('t_e_joined')); SFX.play('ding'); }
      if (p.phase === 'add1' && v.phase === 'pick2') this.say(this.t('t_e_added', { ing: ingName(p.order[0], L) }));
      if (v.twist && v.twist !== 'none' && p.twist !== v.twist) { this.toast(this.t('t_e_twist', { t: ingName(v.twist, L) }), Art.icon(v.twist, 'ti')); SFX.play(v.twist === 'chocolate' ? 'blehh' : 'pop'); }
      if (v.thanks && !p.thanks && v.phase === 'done') SFX.play('chime');
    }
  }
  handleWaves() {
    const d = this.hub.docs[this.other]; const w = d && d.waveAt || 0;
    if (w && w > (this.seenWave[this.other] || 0)) {
      const first = !this.live; this.seenWave[this.other] = w;
      if (!first) {
        this.toast(this.t(this.other === 'grandma' ? 't_wave_g' : 't_wave_e'), miniPip('wave', 'ti'));
        SFX.play('ding'); haptic(30);
        if (this.pipHereShown) { this.setExpression('wave'); this.el.mover.classList.remove('wiggle'); void this.el.mover.offsetWidth; this.el.mover.classList.add('wiggle'); this.later(() => this.setExpression(this.exprOf(this.view)), 1800); }
      }
    }
  }

  /* ---------------- scene, PIP, wok ---------------- */
  setScene(scene, animate) {
    const world = this.role === 'grandma' ? 'courtyard' : 'city';
    const html = scene === 'home' ? Art.home(world, this.hub.moments.length) : Art.kitchen(world);
    const wrap = this.el.scene;
    if (animate && !reduceMotion()) {
      const old = wrap.firstElementChild;
      wrap.insertAdjacentHTML('beforeend', html);
      const nu = wrap.lastElementChild; nu.classList.add('fade-in');
      this.later(() => { if (old && old.parentNode) old.remove(); }, 450);
    } else wrap.innerHTML = html;
    this.el.world.dataset.scene = scene;
    if (this.fit) this.fit();
  }
  setPipPos(v) {
    const scene = this.sceneOf(v);
    let x = 44, y = 13.5, w = 30;
    if (scene === 'kitchen') { x = this.role === 'steven' ? 24 : 30; y = 27.6; w = 29; }
    if (v.phase === 'done' && this.role === 'steven') x = 25;
    const p = this.el.pip.style;
    p.setProperty('--x', x + '%'); p.setProperty('--y', y + '%'); p.setProperty('--w', w + '%');
  }
  exprOf(v) {
    const r = this.role, ph = v.phase;
    if (ph === 'idle') return this.local.laterSaid ? 'happy' : 'idle';
    if (ph === 'declined') return 'idle';
    if (ph === 'pick1' || ph === 'pick2') return 'curious';
    if (ph === 'add1' || ph === 'add2') return 'happy';
    if (ph === 'twist') return 'curious';
    if (ph === 'stir') return v.stirred ? 'yum' : 'happy';
    if (ph === 'done') return REACT[v.outcome] ? REACT[v.outcome].face : 'joy';
    return r === 'steven' ? 'happy' : 'idle';
  }
  setExpression(expr) {
    if (this.expr === expr) return; this.expr = expr;
    const w = this.el.mover.querySelector('.pip-face-wrap'); if (w) w.innerHTML = Art.face(expr);
  }
  carryFor(prev, v) {
    const p = prev ? prev.phase : 'idle', n = v.phase, r = this.role;
    if (n === 'invited' && (p === 'idle' || p === 'declined')) return 'envelope';
    if (n === 'pick1' && (p === 'invited' || p === 'declined')) return 'heart';
    if (n === 'add1') return v.order[0];
    if (n === 'pick2' && p === 'add1') return 'heart';
    if (n === 'add2' && (p === 'pick2')) return v.order[1];
    if (n === 'done' && r === 'grandma') return 'camera';
    return null;
  }
  restCarry(v) {
    if (this.role !== 'steven') return null;
    if (v.phase === 'add1') return v.order[0];
    if (v.phase === 'add2' && v.sub === 'add') return v.order[1];
    if (v.phase === 'add2' && v.sub === 'sprinkle') return v.secret;
    return null;
  }
  setCarry(name, sparkle) {
    this.carryName = name || null;
    this.el.pip.classList.toggle('has-carry', !!name);
    this.el.carry.innerHTML = name ? Art.icon(name) + (sparkle ? '<span class="spark" aria-hidden="true"></span>' : '') : '';
    this.el.carry.classList.toggle('grab', !!name && this.role === 'steven' && this.prefs.mode !== 'easy' && (this.view.phase === 'add1' || (this.view.phase === 'add2' && this.view.sub === 'add')));
  }
  async travel(dir, carry) {
    const mover = this.el.mover, pip = this.el.pip;
    const side = this.role === 'grandma' ? 1 : -1; // Grandma's phone sits on the left, Steven's on the right
    if (dir === 'in') { pip.hidden = false; this.el.away.hidden = true; this.setCarry(carry, carry === this.view.order?.[1] && this.view.secret && this.view.secret !== 'none'); }
    else this.setCarry(carry);
    const wr = this.el.world.getBoundingClientRect(), sr = this.el.stage.getBoundingClientRect(), pr = pip.getBoundingClientRect();
    const cx = pr.left + pr.width / 2;
    const dist = side > 0 ? (sr.right - cx + pr.width) : (cx - sr.left + pr.width);
    if (reduceMotion()) {
      const a = mover.animate(dir === 'out' ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'forwards' });
      await a.finished.catch(() => { });
    } else {
      SFX.play('hop');
      const hops = 3, N = 36, H = Math.max(28, pr.height * 0.38), kf = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, ph = (t * hops) % 1, land = i % (N / hops) === 0;
        const x = side * dist * (dir === 'out' ? t : 1 - t);
        const y = -H * Math.sin(Math.PI * ph);
        const s = land ? 'scale(1.1,.9)' : ph < 0.5 ? 'scale(.95,1.06)' : 'scale(1,1)';
        kf.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ${s}`, offset: t });
      }
      const a = mover.animate(kf, { duration: 1050, easing: 'linear', fill: 'forwards' });
      const foot = { x: pr.left - sr.left + pr.width / 2, y: pr.bottom - sr.top - pr.height * 0.05 };
      for (let i = 1; i <= hops; i++) {
        const t = i / hops, x = side * dist * (dir === 'out' ? t : 1 - t);
        if (dir === 'in' || i < hops) this.later(() => this.puff(foot.x + x, foot.y, i === hops ? 1.25 : 1), 1050 * t - 20);
      }
      await a.finished.catch(() => { });
      if (dir === 'in') this.sparkle();
    }
    if (dir === 'out') { pip.hidden = true; this.setCarry(null); }
    this.placePort();
    mover.getAnimations().forEach(a => a.cancel());
    if (dir === 'in') {
      this.squish();
      const rest = this.restCarry(this.view);
      if (!rest && carry) this.later(() => { if (this.carryName === carry && !this.restCarry(this.view)) this.setCarry(null); }, 1300);
    }
  }
  squish() { const m = this.el.mover; if (reduceMotion()) return; m.animate([{ transform: 'scale(1.12,.88)' }, { transform: 'scale(.96,1.05)' }, { transform: 'scale(1,1)' }], { duration: 380, easing: 'ease-out' }); }
  renderWatch(v) { this.renderTop(); }
  renderAway(v) {
    const here = this.pipHere(v);
    // on Grandma's phone the porthole already shows where PIP is helping
    const show = !here && v.phase !== 'idle' && !(this.role === 'grandma' && !this.el.port.hidden);
    this.el.away.hidden = !show;
    if (show) {
      const key = 'away' + this.prefs.lang;
      if (this.el.away.dataset.v !== key) {
        this.el.away.dataset.v = key;
        this.el.away.innerHTML = `<span class="steps" aria-hidden="true"><i></i><i></i><i></i></span><span class="away-chip">${miniPip('happy')}${esc(this.t(this.role === 'grandma' ? 'pip_with_e' : 'pip_with_g'))}</span>`;
      }
    }
  }
  hideBubble() { this.el.bubble.hidden = true; }
  renderBubble(v) {
    if (!this.pipHereShown) return this.hideBubble();
    const L = this.prefs.lang, r = this.role, ph = v.phase;
    let text = '', lines = [];
    if (r === 'grandma') {
      if (ph === 'idle' && this.local.gScreen === 'home') text = this.local.laterSaid ? this.t('later_bubble') : this.t('g_home_bubble');
      else if (ph === 'declined') text = this.t('declined_t');
      else if (ph === 'pick1') text = this.t('pick1_bubble');
      else if (ph === 'pick2') text = this.t('pick2_bubble', { ing: ingName(v.order[1], L) });
    } else {
      if (ph === 'idle') text = this.t('e_home_bubble');
      else if (ph === 'add1') { text = this.t('g_says_first', { ing: cap(ingName(v.order[0], L)) }); if (ING[v.order[0]].hint) lines.push(ING[v.order[0]].hint); }
      else if (ph === 'add2' && v.sub === 'add') { text = this.t('next_is', { ing: cap(ingName(v.order[1], L)) }); lines.push(v.secret === 'none' ? this.t('no_secret') : this.t('secret_is', { s: ingName(v.secret, L) })); }
      else if (ph === 'add2') text = this.t('secret_is', { s: ingName(v.secret, L) });
      else if (ph === 'twist') text = this.t('twist_bubble');
      else if (ph === 'stir') text = v.stirred ? this.t('stirred_bubble') : this.t('stir_bubble');
    }
    if (!text) return this.hideBubble();
    const b = this.el.bubble;
    const speakBtn = canSpeak() && (r === 'grandma' || this.prefs.mode === 'easy')
      ? `<button class="speak" type="button" data-act="speak" aria-label="${esc(this.t('listen'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>` : '';
    const nw = String(text).split(' ').length;
    const html = `<p>${wordSpans(text)}</p>${lines.map(l => `<p class="b2">${wordSpans(l, nw)}</p>`).join('')}${speakBtn}`;
    if (b.dataset.v !== html) {
      b.dataset.v = html; b.dataset.say = text; b.innerHTML = html;
      b.hidden = false; this.placeBubble(); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    } else { b.hidden = false; this.placeBubble(); }
  }
  // px from the top of the stage to just under the top bar
  topSafe() {
    const sr = this.el.stage.getBoundingClientRect(), tr = this.el.topbar.getBoundingClientRect();
    return Math.max(0, tr.bottom - sr.top) + 6;
  }
  // how much of the world (counted up from its bottom edge, in world units) must stay visible:
  // the counter or rug, PIP, and room above PIP for a short speech bubble
  focusBand() { return this.el.world.dataset.scene === 'home' ? 262 : 318; }
  placeBubble() {
    const b = this.el.bubble; if (!b || b.hidden) return;
    b.classList.remove('side', 'to-left'); b.style.removeProperty('max-width');
    b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px');
    const sr = this.el.stage.getBoundingClientRect(), top = sr.top + this.topSafe();
    let br = b.getBoundingClientRect();
    if (br.top < top) {
      // no room above PIP (short screen, or PIP is carrying something): speak from beside PIP,
      // on the side with more space, and never under the top bar
      const pr = this.el.pip.getBoundingClientRect();
      const toLeft = pr.left + pr.width / 2 > sr.left + sr.width / 2;
      const space = toLeft ? pr.left - sr.left : sr.right - pr.right;
      b.classList.add('side'); b.classList.toggle('to-left', toLeft);
      b.style.maxWidth = Math.round(Math.max(150, Math.min(260, space + pr.width * 0.24 - 10))) + 'px';
      br = b.getBoundingClientRect();
      if (br.top < top) { b.style.setProperty('--by', Math.round(top - br.top) + 'px'); br = b.getBoundingClientRect(); }
    }
    let dx = 0;
    if (br.left < sr.left + 10) dx = sr.left + 10 - br.left;
    else if (br.right > sr.right - 10) dx = sr.right - 10 - br.right;
    b.style.setProperty('--bx', Math.round(dx) + 'px');
  }
  /* ---------------- the cooking stage (Steven's stove and wok) ---------------- */
  cookItems(v) {
    const it = [];
    if (!v.order) return it;
    (v.added || []).forEach(a => it.push(a));
    if (v.secret && v.secret !== 'none' && v.secretIn) it.push(v.secret);
    if (v.twist && v.twist !== 'none') it.push(v.twist);
    return it;
  }
  cookPhase(v) { return ['pick1', 'add1', 'pick2', 'add2', 'twist', 'stir', 'done'].includes(v.phase); }
  renderCook(v, live) {
    if (this.role !== 'steven') return;
    const c = this.cook, on = this.sceneOf(v) === 'kitchen' && this.cookPhase(v);
    const cv = this.el.cookCv, hit = this.el.hit;
    if (cv.hidden === on) { cv.hidden = !on; hit.hidden = !on; if (on) c.resize(); }
    this.el.world.classList.toggle('cooking', on); // the stove has the stage: let the lamps rest
    if (!on) { if (c.items.size || c.plate.on) c.clear(); c.stop(); this.cookKey = null; hit.classList.remove('stirring'); return; }
    c.start();
    const key = v.sid + ':' + v.round;
    if (this.cookKey !== key) { this.cookKey = key; c.clear(); this.stirAcc = 0; }
    if (v.phase === 'done') {
      // the serving show runs in phaseEffects; opened part-way, just plate it up
      if (!live || this.tasted === key) { c.ensure(this.cookItems(v), false); if (!c.plate.on) c.plateNow(); }
      hit.classList.remove('stirring');
      return;
    }
    c.ensure(this.cookItems(v), false);
    c.setHeat(!!(v.added && v.added.length));
    c.setCook(v.phase === 'stir' ? (v.stirred ? 1 : 0.3 + 0.7 * this.stir) : 0.3);
    if (v.phase !== 'stir' || v.stirred) c.stirStop();
    hit.classList.toggle('stirring', v.phase === 'stir' && !v.stirred && this.prefs.mode !== 'easy');
  }
  worldToClient(x, y) { const wr = this.el.world.getBoundingClientRect(), s = wr.width / 390; return { x: wr.left + x * s, y: wr.top + y * s, s }; }
  pipPoint(fx, fy) {
    // a point inside PIP's box, in world units
    const wr = this.el.world.getBoundingClientRect(), pr = this.el.pip.getBoundingClientRect(), s = 390 / Math.max(1, wr.width);
    return { x: (pr.left - wr.left + pr.width * fx) * s, y: (pr.top - wr.top + pr.height * fy) * s };
  }

  /* ---------------- ribbon: whose turn it is ---------------- */
  renderRibbon(v) {
    const cooking = ['pick1', 'add1', 'pick2', 'add2', 'twist', 'stir', 'done'].includes(v.phase);
    this.el.ribbon.hidden = !cooking;
    if (!cooking) return;
    const L = this.prefs.lang;
    const prog = Math.max(0, Math.min(1, v.step / (STEPS.length - 1)));
    const html = `<ol class="steps-row" style="--prog:${prog.toFixed(3)}" aria-label="${esc(this.t('steps'))}">` + STEPS.map((s, i) => {
      const state = v.step > i ? 'done' : v.step === i ? 'now' : 'todo';
      const who = s.who === 'grandma' ? this.t('avatar_grandma') : this.t('avatar_steven');
      return `<li class="${state} who-${s.who}" ${state === 'now' ? 'aria-current="step"' : ''}><span class="node">${state === 'done' ? '✓' : esc(who)}</span><span class="lbl">${esc(s[L])}</span></li>`;
    }).join('') + `</ol>`;
    if (this.el.ribbon.dataset.v !== html) { this.el.ribbon.dataset.v = html; this.el.ribbon.innerHTML = html; }
  }

  /* ---------------- porthole: a window into the other kitchen ---------------- */
  renderPort(v, live) {
    const p = this.el.port, ph = v.phase;
    const serving = this.portHold || (ph === 'done' && live && this.tasted !== v.sid + ':' + v.round);
    let mode = null;
    if (this.role === 'grandma' && (['add1', 'add2', 'twist', 'stir'].includes(ph) || serving)) mode = 'wok';
    else if (this.role === 'steven' && (ph === 'pick1' || ph === 'pick2')) mode = 'g';
    p.hidden = !mode;
    if (!mode) {
      if (this.mini && !this.cookPhase(v)) { this.mini.stop(); this.mini.clear(); this.miniKey = null; }
      return;
    }
    if (p.dataset.mode !== mode) {
      p.dataset.mode = mode;
      if (mode === 'wok') {
        p.innerHTML = `<div class="port-ring" data-ring><div class="port-in w"><canvas class="port-cv" aria-hidden="true"></canvas><span class="flash" aria-hidden="true"></span></div></div><span class="port-lbl">${miniPip('happy')}<span data-pl></span></span>`;
        this.mini = new CookStage(p.querySelector('canvas'), null, { mini: true });
        this.miniKey = null;
      } else {
        p.innerHTML = `<div class="port-ring calm"><div class="port-in g">${miniPip('curious', 'port-pip')}<span class="av av-grandma big" aria-hidden="true">${esc(this.t('avatar_grandma'))}</span></div></div><span class="port-lbl">${esc(this.t('port_g'))}<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></span>`;
      }
    }
    this.placePort();
    if (mode === 'wok') this.portCook(v, live);
  }
  remoteStirLevel(v) {
    const pres = this.hub.peerPresence('steven');
    let prog = v.stirred ? 1 : 0;
    if (v.phase === 'stir' && pres && pres.sid === v.sid && pres.round === v.round && typeof pres.stir === 'number') prog = Math.max(prog, Math.min(1, pres.stir));
    return prog;
  }
  portCook(v, live) {
    const m = this.mini, p = this.el.port, ph = v.phase;
    const key = v.sid + ':' + v.round, pres = this.hub.peerPresence('steven');
    const mine = pres && pres.sid === v.sid && pres.round === v.round;
    if (this.miniKey !== key) { this.miniKey = key; m.clear(); this.seenAdd = mine && pres.addAt || 0; }
    m.start();
    if (this.portHold) return; // the serving show is playing
    // live: play what Steven is putting in right now (his taps arrive as presence)
    if (mine && pres.addK && pres.addAt && pres.addAt !== this.seenAdd) {
      this.seenAdd = pres.addAt;
      if (!m.items.has(pres.addK)) { m.setHeat(true); m.add(pres.addK); }
    }
    const items = this.cookItems(v);
    m.ensure(items, !!live && this.live);
    m.setHeat(items.length > 0 || m.items.size > 0);
    const prog = this.remoteStirLevel(v);
    if (ph === 'stir') { if (v.stirred) { m.setCook(1); m.stirStop(); } else m.remoteStir(prog); }
    else m.setCook(0.3);
    const ring = p.querySelector('[data-ring]'), lbl = p.querySelector('[data-pl]');
    if (ring) ring.style.setProperty('--deg', (ph === 'stir' ? Math.round(prog * 360) : 0) + 'deg');
    const txt = this.t('port_e') + (ph === 'stir' ? ` · ${Math.round(prog * 100)}%` : '');
    if (lbl && lbl.textContent !== txt) lbl.textContent = txt;
  }
  placePort() {
    const p = this.el.port; if (!p || p.hidden) return;
    const ring = p.querySelector('.port-ring'); if (!ring) return;
    const sr = this.el.stage.getBoundingClientRect(), sh = sr.height;
    const topSafe = this.topSafe() + 4, bottomSafe = 34, label = 34;
    const want = this.role === 'grandma' ? (this.prefs.mode === 'easy' ? 168 : 150) : (this.prefs.mode === 'easy' ? 132 : 112);
    const avail = sh - topSafe - bottomSafe;
    const size = Math.round(Math.max(76, Math.min(want, avail - label)));
    ring.style.width = size + 'px';
    p.style.top = Math.round(topSafe + Math.max(0, (avail - size - label) / 2)) + 'px';
    // centred on Grandma's phone, unless PIP is home and would sit behind it
    let center = this.role === 'grandma';
    if (center && !this.el.pip.hidden) {
      const pr = this.el.pip.getBoundingClientRect(), half = size / 2 + 8, mid = sr.left + sr.width / 2;
      if (pr.right > mid - half && pr.left < mid + half) center = false;
    }
    p.classList.toggle('center', center);
    if (this.mini && p.dataset.mode === 'wok') this.mini.resize();
  }

  /* ---------------- bottom sheet panels ---------------- */
  turnOf(v) {
    const ph = v.phase;
    if (ph === 'invited') return 'steven';
    if (ph === 'pick1' || ph === 'pick2') return 'grandma';
    if (ph === 'add1' || ph === 'add2' || ph === 'twist') return 'steven';
    if (ph === 'stir') return v.stirred ? 'grandma' : 'steven';
    return null;
  }
  turnChip(v) {
    const t = this.turnOf(v); if (!t) return '';
    const mine = t === this.role;
    return `<p class="turn-chip ${mine ? 'mine' : 'theirs'}"><span class="av av-${t}" aria-hidden="true">${t === 'grandma' ? 'G' : 'S'}</span><span>${esc(mine ? this.t('your_turn') : this.t('turn_of', { name: this.t('name_' + t) }))}</span>${mine ? '' : '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>'}</p>`;
  }
  renderPanel(v, prev) {
    const html = this.turnChip(v) + (this.role === 'grandma' ? this.panelGrandma(v) : this.panelSteven(v));
    if (this.el.panel.dataset.v === html) return;
    const phaseChanged = !prev || prev.phase !== v.phase || prev.sub !== v.sub || this.panelPhaseKey !== this.local.gScreen;
    this.panelPhaseKey = this.local.gScreen;
    this.el.panel.dataset.v = html; this.el.panel.innerHTML = html;
    if (phaseChanged && this.live) {
      this.el.panel.classList.remove('enter'); void this.el.panel.offsetWidth; this.el.panel.classList.add('enter');
      const h = this.el.panel.querySelector('.ptitle');
      if (h && !this.local.overlay && this.root.contains(document.activeElement)) h.focus({ preventScroll: true });
    }
    if (this.role === 'grandma' && v.phase === 'stir') this.renderServeState(v);
  }
  btn(label, act, opt = {}) {
    return `<button type="button" class="btn ${opt.cls || ''}" data-act="${act}"${opt.arg ? ` data-arg="${esc(opt.arg)}"` : ''}${opt.disabled ? ' disabled' : ''}${opt.label ? ` aria-label="${esc(opt.label)}"` : ''}>${opt.icon || ''}<span>${esc(label)}</span></button>`;
  }
  tile(icon, label, act, arg, sub) {
    return `<button type="button" class="tile" data-act="${act}" data-arg="${esc(arg)}">${icon}<span class="tl">${esc(label)}</span>${sub ? `<span class="ts">${esc(sub)}</span>` : ''}</button>`;
  }
  head(title, sub, extra = '') {
    return `<h2 class="ptitle" tabindex="-1">${esc(title)}${extra}</h2>${sub ? `<p class="psub">${esc(sub)}</p>` : ''}`;
  }
  dishChip(dish) {
    const L = this.prefs.lang;
    return `<div class="dish-chip">${Art.dish(dish)}<div><b>${esc(DISHES[dish].short[L])}</b><span>${esc(DISHES[dish].desc)}</span></div></div>`;
  }
  panelGrandma(v) {
    const L = this.prefs.lang, ph = v.phase, n = this.hub.moments.length;
    const dots = `<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>`;
    if (ph === 'idle') {
      if (this.local.gScreen === 'dishes') {
        return this.head(this.t('choose_dish')) + `<div class="dish-list">` + DISH_ORDER.map(k =>
          `<button type="button" class="dish-card" data-act="g-dish" data-arg="${k}">${Art.dish(k)}<span><b>${esc(dishName(k, L))}</b><small>${esc(DISHES[k].desc)}</small></span></button>`).join('') +
          `</div><div class="row-actions">${this.btn(this.t('back'), 'g-back', { cls: 'ghost' })}</div>`;
      }
      return this.head(this.t('g_home_title'), this.t('g_home_sub')) +
        `<div class="col-actions">${this.btn(this.t('yes_teach'), 'g-yes', { cls: 'primary big', icon: Art.icon('envelope', 'bi') })}${this.btn(this.t('later'), 'g-later', { cls: 'soft big' })}</div>` +
        `<div class="row-actions">${this.btn(this.t('moments') + (n ? ` (${n})` : ''), 'moments', { cls: 'ghost', icon: Art.icon('heart', 'bi') })}${this.btn(this.t(this.role === 'steven' ? 'wave_to_g' : 'wave_to_e'), 'wave', { cls: 'ghost', icon: '<span class="emo" aria-hidden="true">👋</span>' })}</div>`;
    }
    if (ph === 'invited') return this.head(this.t('waiting_t'), null, dots) + this.dishChip(v.dish) + `<div class="row-actions">${this.btn(this.t('cancel'), 'end', { cls: 'ghost' })}</div>`;
    if (ph === 'declined') return this.head(this.t('declined_t'), this.t('declined')) + this.dishChip(v.dish) + `<div class="row-actions">${this.btn(this.t('cancel'), 'end', { cls: 'ghost' })}</div>`;
    if (ph === 'pick1') {
      return this.head(this.t('pick1_t'), this.t('your_way')) + `<div class="tiles two">` +
        DISHES[v.dish].core.map(k => this.tile(Art.icon(k), cap(ingName(k, L)), 'g-first', k)).join('') + `</div>`;
    }
    if (ph === 'add1') return this.head(this.t('sent_t'), this.t('e_adding', { ing: ingName(v.order[0], L) })) + this.feed(v);
    if (ph === 'pick2') {
      return this.head(this.t('pick2_t') + ' 🤫', this.t('pick2_sub', { ing: ingName(v.order[1], L) })) + `<div class="tiles three">` +
        DISHES[v.dish].secrets.map(k => this.tile(Art.icon(k), ING[k].tile[L], 'g-secret', k)).join('') + `</div>`;
    }
    if (['add2', 'twist', 'stir'].includes(ph)) {
      return this.head(this.t('e_cooking_t'), null, ph !== 'stir' ? dots : '') + this.feed(v) +
        (ph === 'stir' ? `<div class="col-actions">${this.btn(this.t('serve_btn'), 'g-serve', { cls: 'primary big serve', disabled: true, icon: Art.dish(v.dish).replace('dish-art', 'dish-art bi') })}<p class="hint" data-serve-hint aria-live="polite"></p></div>` : '');
    }
    if (ph === 'done') return this.head(this.t('photo'), REACT[v.outcome][L]) + `<div class="row-actions">${this.btn(this.t('back_home'), 'end', { cls: 'ghost' })}</div>`;
    return '';
  }
  feed(v) {
    const L = this.prefs.lang, items = [];
    const done = (ok, text, icon) => `<li class="${ok ? 'ok' : 'wait'}">${icon ? Art.icon(icon, 'fi') : ''}<span>${esc(text)}</span>${ok ? '<b aria-hidden="true">✓</b>' : '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>'}</li>`;
    const [a, b] = v.order;
    items.push(done(v.added.includes(a), this.t('f_added', { ing: ingName(a, L) }), a));
    if (v.phase !== 'add1') {
      items.push(done(v.added.includes(b), this.t('f_added', { ing: ingName(b, L) }), b));
      if (v.secret && v.secret !== 'none') items.push(done(v.secretIn, this.t('f_secret') + ' · ' + ING[v.secret].tile[L], v.secret));
      if (v.phase === 'twist' || v.phase === 'stir') {
        if (!v.twist) items.push(done(false, this.t('f_twist_wait'), null));
        else items.push(done(true, v.twist === 'none' ? this.t('f_notwist') : this.t('f_twist', { t: ingName(v.twist, L) }), v.twist === 'none' ? 'none' : v.twist));
      }
      if (v.phase === 'stir') items.push(done(v.stirred, v.stirred ? this.t('f_stirred') : this.t('f_stir'), null));
    }
    return `<ul class="feed">${items.slice(-3).join('')}</ul>`;
  }
  renderServeState(v) {
    const b = this.el.panel.querySelector('[data-act="g-serve"]'); if (!b) return;
    const pres = this.hub.peerPresence('steven');
    let prog = v.stirred ? 1 : 0;
    if (pres && pres.sid === v.sid && pres.round === v.round && typeof pres.stir === 'number') prog = Math.max(prog, pres.stir);
    if (!this.stirSince || this.stirSince.sid !== v.sid + v.round) {
      this.stirSince = { sid: v.sid + v.round, at: Date.now() };
      this.later(() => this.renderServeState(this.view), 7200);
    }
    const ready = prog >= 0.7 || Date.now() - this.stirSince.at > 7000;
    b.disabled = !ready;
    const hint = this.el.panel.querySelector('[data-serve-hint]');
    const txt = ready ? '' : this.t('serve_wait');
    if (hint && hint.textContent !== txt) hint.textContent = txt;
    if (ready && !b.dataset.rd) { b.dataset.rd = '1'; b.classList.add('ready'); SFX.play('ding'); }
  }
  panelSteven(v) {
    const L = this.prefs.lang, ph = v.phase, n = this.hub.moments.length, easy = this.prefs.mode === 'easy';
    const dots = `<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>`;
    if (ph === 'idle') {
      return this.head(this.t('e_home_title'), this.t('e_home_sub')) +
        `<div class="row-actions">${this.btn(this.t('moments') + (n ? ` (${n})` : ''), 'moments', { cls: 'soft', icon: Art.icon('heart', 'bi') })}${this.btn(this.t(this.role === 'steven' ? 'wave_to_g' : 'wave_to_e'), 'wave', { cls: 'soft', icon: '<span class="emo" aria-hidden="true">👋</span>' })}</div>`;
    }
    if (ph === 'invited' || ph === 'declined') {
      return this.head(this.t('open_title'), this.t('open_sub')) + this.dishChip(v.dish) +
        `<div class="col-actions">${this.btn(this.t('joinNow'), 'e-join', { cls: 'primary big' })}</div>`;
    }
    const lesson = `<p class="eyebrow">${esc(this.t('lesson', { dish: DISHES[v.dish].short[L] }))}</p>`;
    if (ph === 'pick1') return lesson + this.head(this.t('wait_first_t'), this.t('wait_first'), dots);
    if (ph === 'pick2') return lesson + this.head(this.t('wait_secret_t'), this.t('wait_secret'), dots);
    if (ph === 'add1' || (ph === 'add2' && v.sub === 'add')) {
      const ing = ph === 'add1' ? v.order[0] : v.order[1];
      return lesson + this.head(this.t('add_t', { ing: ingName(ing, L) }), easy ? null : this.t('add_sub')) +
        `<div class="col-actions">${this.btn(this.t('add_btn', { ing: ingName(ing, L) }), 'e-add', { cls: 'primary big', arg: ing, icon: Art.icon(ing, 'bi') })}</div>`;
    }
    if (ph === 'add2') {
      return lesson + this.head(this.t('sprinkle_t'), this.t('sprinkle_sub', { s: cap(ingName(v.secret, L)) })) +
        `<div class="col-actions">${this.btn(this.t('sprinkle_btn'), 'e-sprinkle', { cls: 'primary big', icon: Art.icon(v.secret, 'bi') })}</div>`;
    }
    if (ph === 'twist') {
      return lesson + this.head(this.t('twist_t'), this.t('twist_sub')) +
        `<div class="tiles four">${TWISTS.map(k => this.tile(Art.icon(k), cap(ingName(k, L)), 'e-twist', k)).join('')}</div>` +
        `<div class="col-actions">${this.btn(this.t('no_twist'), 'e-twist', { cls: 'soft', arg: 'none', icon: Art.icon('none', 'bi') })}</div>`;
    }
    if (ph === 'stir') {
      if (v.stirred) return lesson + this.head(this.t('stir_done_t'), this.t('stir_done'), dots);
      return lesson + this.head(this.t('stir_t'), easy ? null : this.t('stir_sub')) +
        `<p class="tip">${this.t('tap_toss')}</p>` +
        `<div class="stirbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(this.stir * 100)}" aria-label="${esc(this.t('stir_t'))}"><i style="width:${Math.round(this.stir * 100)}%"></i></div>` +
        `<div class="col-actions">${this.btn(this.t('stir_btn'), 'e-stir', { cls: 'primary big stir-btn', icon: '<svg class="bi" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a8 8 0 1 0 8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' })}</div>`;
    }
    if (ph === 'done') return lesson + this.head(this.t('tasting'), null);
    return '';
  }

  /* ---------------- phase effects (tasting, photo) ---------------- */
  async phaseEffects(prev, v, live) {
    if (v.phase !== 'done') { this.el.photo.hidden = true; return; }
    const key = v.sid + ':' + v.round;
    if (this.tasted === key) return;
    this.tasted = key;
    if (!live) return; // opened part-way: go straight to the card
    const L = this.prefs.lang, rx = REACT[v.outcome];
    const say = t => { const b = this.el.bubble; b.hidden = false; b.dataset.v = ''; b.innerHTML = `<p>${wordSpans(t)}</p>`; this.placeBubble(); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); };
    if (this.role === 'steven') {
      const c = this.cook, mover = this.el.mover;
      SFX.play('ding'); this.setExpression('surprised'); say(this.t('served'));
      await c.serve();
      await sleep(160);
      // PIP leans over the plate and takes a few bites
      say(this.t('tasting'));
      const bites = v.outcome === 'blehh' ? 1 : v.outcome === 'odd' ? 2 : 3;
      const lean = reduceMotion() ? null : mover.animate([{ transform: 'none' }, { transform: 'translateX(6%) rotate(7deg)' }], { duration: 260, easing: 'ease-out', fill: 'forwards' });
      for (let i = 0; i < bites; i++) {
        this.setExpression('surprised');
        await sleep(i ? 120 : 260);
        const m = this.pipPoint(0.5, 0.58); m.x += 12;
        await c.bite(m, bites === 1 ? 2.6 : 3.2);
        this.setExpression('chew'); mover.classList.add('chewing'); SFX.play('chew'); haptic(10);
        await sleep(560);
        mover.classList.remove('chewing');
      }
      if (lean) lean.cancel();
      this.setExpression(rx.face); say(rx[L]);
      mover.classList.remove('wiggle', 'shake'); void mover.offsetWidth;
      mover.classList.add(v.outcome === 'blehh' ? 'shake' : 'wiggle');
      c.react(v.outcome, this.pipPoint(0.5, 0.05));
      SFX.play(v.outcome === 'blehh' ? 'blehh' : 'yum'); haptic(v.outcome === 'blehh' ? 60 : 20);
      await sleep(2000);
    } else {
      // Grandma watches Steven plate it up in the porthole; PIP snaps a photo and brings it home
      this.portHold = true; this.renderPort(v, true);
      const m = this.mini, port = this.el.port;
      if (m && !port.hidden) {
        m.ensure(this.cookItems(v), false);
        await m.serve();
        const fl = port.querySelector('.flash'); if (fl) { fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); }
        SFX.play('shutter'); await sleep(320);
      }
      this.portHold = false; this.renderPort(v, true);
      this.el.photo.innerHTML = `<div class="polaroid">${Art.dish(v.dish, v.twist !== 'none' ? v.twist : null)}${pipMarkup(rx.face, 'ph-pip')}<p>${esc(rx[L])}</p></div>`;
      this.el.photo.hidden = false; this.el.photo.classList.remove('in'); void this.el.photo.offsetWidth; this.el.photo.classList.add('in');
      SFX.play(v.outcome === 'blehh' ? 'blehh' : 'yum');
      await sleep(2500);
    }
    this.el.photo.hidden = true;
  }

  /* ---------------- overlays: invitation, keepsake card, moments, settings, about ---------------- */
  renderOverlay(v, prev, live) {
    const want = (this.role === 'steven' && v.phase === 'invited') ? 'invite' : (v.phase === 'done' ? (this.wantSelfie(v) ? 'selfie' : 'card') : null);
    const cur = this.local.overlay;
    if (want === 'selfie') {
      if (cur !== 'selfie' || !this.snap || this.snap.key !== this.snapKey(v)) this.openSelfie(v, live || cur !== 'selfie');
      return;
    }
    if (want === 'card') {
      if (cur !== 'card' || this.overlayKey !== this.cardKey(v)) this.openOverlay('card', null, live && cur !== 'card');
      return;
    }
    if (want === 'invite') {
      if (cur !== 'invite' && !this.inviteDismissed?.[v.sid]) this.openOverlay('invite', null, live);
      return;
    }
    if (cur === 'card' || cur === 'invite' || cur === 'selfie') this.closeOverlay(true);
  }
  cardKey(v) { return [v.sid, v.round, v.outcome, v.thanks, v.reply, this.prefs.lang].join('|'); }
  openOverlay(kind, arg, animate = true) {
    this.local.overlay = kind; this.local.overlayArg = arg;
    const o = this.el.overlay; const v = this.view; const L = this.prefs.lang;
    let html = '';
    if (kind === 'card') { this.overlayKey = this.cardKey(v); html = this.cardHTML(this.momentFromView(v), true); }
    else if (kind === 'moment') { const m = this.hub.moments.find(x => x.id === arg); html = m ? this.cardHTML(m, false) : ''; }
    else if (kind === 'invite') html = this.inviteHTML(v);
    else if (kind === 'moments') html = this.momentsHTML();
    else if (kind === 'menu') html = this.menuHTML();
    else if (kind === 'about') html = this.aboutHTML();
    const wasOpen = !o.hidden;
    o.innerHTML = html; o.hidden = !html;
    o.className = 'overlay ov-' + kind + (animate && !wasOpen ? ' enter' : '');
    if (!html) { this.local.overlay = null; return; }
    if (kind === 'card' && animate) { SFX.play('chime'); }
    const focusEl = o.querySelector('[data-autofocus]') || o.querySelector('h2');
    if (focusEl && (animate || kind !== 'card')) this.later(() => focusEl.focus({ preventScroll: true }), 60);
  }
  closeOverlay(silent) {
    if (this.cam) this.cam.stop();
    const back = this.local.overlay === 'moment' ? 'moments' : null;
    this.local.overlay = null; this.el.overlay.hidden = true; this.el.overlay.innerHTML = '';
    if (back && !silent) return this.openOverlay('moments', null, false);
    if (!silent) { const b = this.el.menu; if (b) b.focus({ preventScroll: true }); }
  }
  momentFromView(v) {
    return { id: v.sid + '-' + v.round, sid: v.sid, round: v.round, dish: v.dish, first: v.order[0], second: v.order[1], secret: v.secret, twist: v.twist, outcome: v.outcome, thanks: v.thanks, reply: v.reply, createdAt: v.serveAt || Date.now() };
  }
  scribe(v) {
    if (v.phase !== 'done') return;
    const m = this.momentFromView(v); const json = JSON.stringify(m);
    if (this.savedMoment[m.id] === json) return;
    this.savedMoment[m.id] = json;
    this.hub.saveMoment(m.id, m);
  }
  cardHTML(m, liveCard) {
    const L = this.prefs.lang, rx = REACT[m.outcome] || REACT.yum, d = DISHES[m.dish] || DISHES.tomato_egg;
    const blehh = m.outcome === 'blehh';
    const title = this.t('card_title', { dish: d.short[L] });
    const note = !blehh && m.outcome !== 'odd' && SECRET_NOTE[m.secret] ? ' ' + SECRET_NOTE[m.secret][L] : '';
    const thanks = m.thanks ? `<div class="msg from-e"><span class="av av-steven" aria-hidden="true">S</span><p>“${esc(this.t('e_thanks'))}”</p></div>` : '';
    const reply = m.reply && REPLIES[m.reply] ? `<div class="msg from-g"><span class="av av-grandma" aria-hidden="true">G</span><p>“${esc(REPLIES[m.reply].en)}”</p></div>` : '';
    const id = this.id + '-ct';
    let actions = '';
    if (liveCard) {
      if (this.role === 'steven') {
        actions = m.thanks ? `<p class="sent-note">💛 ${esc(this.t('thanked'))}${m.reply ? '' : ' · ' + esc(this.t('g_wait_reply'))}</p>` : this.btn(this.t('thank'), 'e-thank', { cls: 'primary big', icon: Art.icon('heart', 'bi') });
      } else {
        actions = m.reply ? `<p class="sent-note">✓ ${esc(this.t('replied'))}</p>` :
          `<p class="reply-t">${esc(this.t('reply_t'))}</p><div class="reply-row">${REPLY_ORDER.map(k => `<button type="button" class="btn chip" data-act="g-reply" data-arg="${k}"><span>${esc(REPLIES[k].en)}</span></button>`).join('')}</div>`;
      }
      if (this.groupFor(m)) actions += `<div class="row-actions">${this.btn(this.t('snap_save'), 'snap-save', { cls: 'soft' })}${navigator.share ? this.btn(this.t('snap_share'), 'snap-share', { cls: 'soft' }) : ''}</div>`;
      actions += `<div class="row-actions">${this.btn(this.t('cook_again'), 'again', { cls: blehh ? 'primary' : 'soft' })}${this.btn(this.t('back_home'), 'end', { cls: 'ghost' })}</div>`;
    } else actions = `<div class="row-actions">${this.btn(this.t('close'), 'close', { cls: 'soft' })}</div>`;
    return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <article class="kcard ${blehh ? 'blehh' : ''}">
        ${(gp => gp
          ? `<div class="kphoto has-group"><span class="tape l"></span><span class="tape r"></span><img class="kgroup" src="${gp}" alt="${esc(this.t('photo_alt'))}">${blehh ? `<span class="stamp">${esc(this.t('creative'))}</span>` : ''}</div>`
          : `<div class="kphoto"><span class="tape l"></span><span class="tape r"></span>${Art.dish(m.dish, m.twist && m.twist !== 'none' ? m.twist : null)}${pipMarkup(rx.face, 'sticker')}${blehh ? `<span class="stamp">${esc(this.t('creative'))}</span>` : ''}</div>`)(this.groupFor(m))}
        <div class="kbody">
          <h2 id="${id}" tabindex="-1" data-autofocus>${esc(title)}</h2>
          <p class="kmeta">${esc(this.t('card_meta', { date: fmtDate(m.createdAt, L) }))}${m.round > 1 ? ' · ' + esc(this.t('attempt', { n: m.round })) : ''}</p>
          <ul class="kcontrib">
            <li><span class="av av-grandma" aria-hidden="true">G</span><div><b>${esc(this.t('c_g'))}</b><span>${esc(this.t('c_way', { a: ingName(m.first, L), b: ingName(m.second, L) }))}</span><span>${esc(m.secret && m.secret !== 'none' ? this.t('c_secret', { s: ingName(m.secret, L) }) : this.t('c_nosecret'))}</span></div></li>
            <li><span class="av av-steven" aria-hidden="true">S</span><div><b>${esc(this.t('c_e'))}</b><span>${esc(this.t('c_cooked'))}</span><span>${esc(m.twist && m.twist !== 'none' ? this.t('c_twist', { t: ingName(m.twist, L) }) : this.t('c_notwist'))}</span></div></li>
          </ul>
          <p class="kpip">${miniPip(rx.face)}<span><b>${esc(this.t('pip_says'))}</b> “${esc(rx[L] + note)}”</span></p>
          ${thanks || reply ? `<div class="kmsgs">${thanks}${reply}</div>` : ''}
        </div>
      </article>
      <div class="kactions">${actions}</div>
    </div>`;
  }
  inviteHTML(v) {
    const L = this.prefs.lang, id = this.id + '-it';
    return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <article class="letter">
        <div class="letter-top">${Art.icon('envelope', 'env')}${pipMarkup('happy', 'letter-pip')}</div>
        <h2 id="${id}" tabindex="-1" data-autofocus>${esc(this.t('inv_title'))}</h2>
        <p class="kmeta">${esc(this.t('inv_lesson'))}</p>
        ${this.dishChip(v.dish)}
        <p class="letter-quote"><span class="av av-grandma" aria-hidden="true">G</span><span>“${esc(this.t('inv_quote', { dish: DISHES[v.dish].short[L] }))}”</span></p>
      </article>
      <div class="kactions"><div class="col-actions">${this.btn(this.t('join'), 'e-join', { cls: 'primary big' })}${this.btn(this.t('notNow'), 'e-decline', { cls: 'ghost' })}</div></div>
    </div>`;
  }
  momentsHTML() {
    const L = this.prefs.lang, id = this.id + '-mt', ms = this.hub.moments;
    const grid = ms.length ? `<div class="mgrid">${ms.map(m => {
      const d = DISHES[m.dish] || DISHES.tomato_egg, rx = REACT[m.outcome] || REACT.yum;
      const gp = this.groupFor(m);
      return `<button type="button" class="mcard" data-act="open-moment" data-arg="${esc(m.id)}">${gp ? `<img class="mthumb" src="${gp}" alt="">` : Art.dish(m.dish, m.twist && m.twist !== 'none' ? m.twist : null) + miniPip(rx.face, 'm-st')}<b>${esc(this.t('card_title', { dish: d.short[L] }))}</b><small>${esc(fmtDate(m.createdAt, L))}${m.outcome === 'blehh' ? ' · 😂' : ''}</small></button>`;
    }).join('')}</div>` : `<p class="empty">${miniPip('sleepy')}${esc(this.t('m_empty'))}</p>`;
    return `<div class="modal sheet-modal" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="mhead"><h2 id="${id}" tabindex="-1" data-autofocus>${esc(this.t('m_title'))}</h2>${this.btn(this.t('close'), 'close', { cls: 'ghost sm' })}</div>
      <p class="psub">${esc(this.t('m_sub'))}</p>${grid}</div>`;
  }
  menuHTML() {
    const L = this.prefs.lang, id = this.id + '-st', P = this.prefs;
    const seg = (name, val, opts) => `<div class="seg" role="group" aria-label="${esc(name)}">${opts.map(([k, lbl]) => `<button type="button" class="${val === k ? 'on' : ''}" aria-pressed="${val === k}" data-act="pref" data-arg="${name}:${k}">${esc(lbl)}</button>`).join('')}</div>`;
    const inSession = this.view.phase !== 'idle';
    const stl = this.el.st.textContent;
    return `<div class="modal sheet-modal" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="mhead"><h2 id="${id}" tabindex="-1" data-autofocus>${esc(this.t('settings'))}</h2>${this.btn(this.t('close'), 'close', { cls: 'ghost sm' })}</div>
      <div class="setrow"><span>${esc(this.t('mode'))}</span>${seg('mode', P.mode, [['easy', this.t('easy')], ['standard', this.t('standard')]])}</div>
      <div class="setrow"><span>${esc(this.t('sound'))}</span>${seg('sound', SFX.on ? 'on' : 'off', [['on', this.t('on')], ['off', this.t('off')]])}</div>
      <div class="setrow"><span>${esc(this.t('sync_status'))}</span><b class="stv">${esc(stl)}</b></div>
      ${this.roomCode ? `<div class="setrow"><span>${esc(this.t('kitchen_code'))}</span><b class="stv"><code>${esc(this.roomCode)}</code></b></div>` : ''}
      ${this.shareUrl ? this.btn(this.t('send_link', { name: this.name(this.other) }), 'share-other', { cls: 'primary' }) : ''}
      <div class="menu-list">
        ${inSession ? this.btn(this.t('end_session'), 'end', { cls: 'soft' }) : ''}
        ${this.btn(this.t('about'), 'about', { cls: 'soft' })}
        ${this.split ? '' : this.btn(this.t('switch_role'), 'switch', { cls: 'soft' })}
        ${this.split ? '' : this.btn(this.t('both_view'), 'both', { cls: 'soft' })}
        ${this.btn(this.t('reset'), 'reset', { cls: 'ghost danger' })}<p class="hint">${esc(this.t('reset_sub'))}</p>
      </div></div>`;
  }
  aboutHTML() {
    const id = this.id + '-ab';
    return `<div class="modal sheet-modal" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="mhead"><h2 id="${id}" tabindex="-1" data-autofocus>About this demo</h2>${this.btn(this.t('close'), 'close', { cls: 'ghost sm' })}</div>
      <div class="about" lang="en">
        <h3>Built and working</h3>
        <ul><li>${typeof PIP_BUILD !== 'undefined' && PIP_BUILD === 'web' ? 'Two phones share one PIP and one cooking session in real time, with no sign-up: updates travel through free public MQTT message servers. Selfies are encrypted with a key made from your kitchen code before they leave the phone, the code itself never appears on the servers, and selfies are removed from the servers when the session ends. Everything else is just dish choices and taps.' : 'Two phones share one PIP and one cooking session in real time (Claude artifact database + live room).'}</li>
        <li>Grandma leads: she invites, picks the dish, the order and her secret, and decides when it is ready. Steven cooks, adds a twist, stirs and says thank you.</li>
        <li>Every step of the cooking is animated live: Grandma watches Steven’s wok through a little window on her phone, and PIP tastes the dish on Steven’s.</li>
        <li>Easy and Standard modes, chosen per phone, both acting on the same shared state.</li>
        <li>After cooking, each phone takes its own selfie (or picks a photo, or skips), and both phones make the same group photo: the two selfies, PIP and the dish. It can be saved or shared.</li>
        <li>Keepsake cards in “Our Little Moments”, saved for both phones.</li></ul>
        <h3>Preset for the demo</h3>
        <ul><li>Grandma’s three dishes, her secrets and reply phrases are preset. In the product, the family adds her own recipes and sayings.</li>
        <li>Steven and Grandma are a demo scenario based on a teammate’s family, played by teammates.</li></ul>
        <h3>Ideas, not built here</h3>
        <ul><li>Voice answers (push-to-talk), the home-screen widget, video calls and the other shared activities.</li></ul>
        <h3>Credits</h3>
        <ul><li>PIP is based on our team’s own sketch. Illustrations are drawn in code for this demo.</li>
        <li>Fonts: Fredoka and Nunito (Google Fonts, SIL OFL). ${typeof PIP_BUILD !== 'undefined' && PIP_BUILD === 'web' ? 'Libraries: MQTT.js and qrcode-generator (MIT). ' : ''}Built with help from Claude (AI) for code.</li></ul>
      </div>
      </div>`;
  }

  /* ---------------- input ---------------- */
  onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || !this.root.contains(b) || b.disabled) return;
    const act = b.dataset.act, arg = b.dataset.arg;
    SFX.unlock();
    const hubBusy = this.hub.kind === 'cloud' && !this.hub.ready;
    const writes = !['sound', 'menu', 'close', 'about', 'moments', 'open-moment', 'pref', 'speak', 'switch', 'both', 'e-stir'].includes(act);
    if (writes && hubBusy) { this.toast(this.t('connecting_hold')); return; }
    if (writes && this.hub.status === 'view') { this.toast(this.t('readonly')); return; }
    haptic();
    const v = this.view, R = v.round || 1;
    const myR = (d) => { if (!d.r || d.r.round !== R) d.r = { round: R }; d.round = Math.max(d.round || 1, R); return d.r; };
    switch (act) {
      case 'sound': SFX.setOn(!SFX.on); this.renderSound(); if (SFX.on) SFX.play('pop'); break;
      case 'snap-shoot': this.snapShoot(); break;
      case 'snap-retake': if (this.snap) { this.snap.shot = null; this.snap.stage = 'camera'; this.renderSelfie(false); } break;
      case 'snap-use': if (this.snap && this.snap.shot) this.snapCommit({ data: this.snap.shot }); break;
      case 'snap-skip': if (this.snap) this.snapCommit({ skipped: true }); break;
      case 'snap-now': if (this.snap) { this.snap.now = true; this.snap.stage = 'reveal'; this.renderSelfie(false); } break;
      case 'snap-save': this.snapSave(); break;
      case 'snap-share': this.snapShare(); break;
      case 'snap-continue': {
        const v = this.view; if (this.snap) this.snap.stage = 'done'; lsSet('pip-snapdone-' + this.role, this.snapKey(v));
        this.closeOverlay(true); this.openOverlay('card', null, true); break;
      }
      case 'menu': this.openOverlay('menu'); break;
      case 'close': this.closeOverlay(); break;
      case 'about': this.openOverlay('about'); break;
      case 'moments': this.openOverlay('moments'); break;
      case 'open-moment': this.openOverlay('moment', arg, false); break;
      case 'speak': { const t = this.el.bubble.dataset.say; if (t) speak(t, this.prefs.lang); break; }
      case 'pref': {
        const [k, val] = arg.split(':');
        if (k === 'sound') { SFX.setOn(val === 'on'); this.renderSound(); }
        else { this.prefs[k] = val; this.savePrefs(); this.applyPrefs(); this.sceneKey = null; this.el.panel.dataset.v = ''; this.el.ribbon.dataset.v = ''; this.el.away.dataset.v = ''; this.el.bubble.dataset.v = ''; this.renderTop(); this.lastKey = null; this.update(); }
        this.openOverlay('menu', null, false); break;
      }
      case 'switch': if (this.onSwitch) this.onSwitch(null); break;
      case 'share-other': {
        const url = this.shareUrl && this.shareUrl(); if (!url) break;
        const label = 'PIP: ' + this.name(this.other);
        const done = () => { const sp = b.querySelector('span'); if (sp) sp.textContent = this.t('copied'); };
        if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) navigator.share({ title: 'PIP', text: label, url }).catch(() => { });
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => { });
        break;
      }
      case 'both': if (this.onSwitch) this.onSwitch('both'); break;
      case 'reset':
        this.closeOverlay(true);
        for (const r of ROLES) this.hub.write(r, { v: Math.max(((this.hub.docs[r] && this.hub.docs[r].v) || 0) + 1, Date.now()), role: r, at: Date.now() });
        this.hub.clearMoments(); this.local.gScreen = 'home'; this.local.laterSaid = false; this.inviteDismissed = {};
        break;
      case 'wave':
        this.sync.update(d => { d.waveAt = Date.now(); return d; });
        this.toast(this.t('waved')); this.setExpression('wave'); this.later(() => this.setExpression(this.exprOf(this.view)), 1500); break;
      // Grandma
      case 'g-yes': this.local.gScreen = 'dishes'; this.update(); SFX.play('pop'); break;
      case 'g-back': this.local.gScreen = 'home'; this.update(); break;
      case 'g-later': this.local.laterSaid = true; this.update(); break;
      case 'g-dish':
        SFX.play('pop');
        this.sync.update(d => ({ waveAt: d.waveAt, sid: uid('s'), dish: arg, inviteAt: Date.now(), round: 1, r: { round: 1 } }));
        break;
      case 'g-first': this.flyToPip(b); this.sync.update(d => { myR(d).first = arg; return d; }); break;
      case 'g-secret': this.flyToPip(b); this.sync.update(d => { myR(d).secret = arg; return d; }); break;
      case 'g-serve': SFX.play('chime'); this.sync.update(d => { myR(d).serveAt = Date.now(); return d; }); break;
      case 'g-reply': SFX.play('pop'); this.sync.update(d => { myR(d).reply = arg; return d; }); break;
      // Steven
      case 'e-join':
        SFX.play('pop'); this.closeOverlay(true);
        this.sync.update(d => ({ waveAt: d.waveAt, sid: v.sid, joinAt: Date.now(), round: 1, r: { round: 1 } }));
        break;
      case 'e-decline':
        this.inviteDismissed = Object.assign({}, this.inviteDismissed, { [v.sid]: true }); this.closeOverlay(true);
        this.sync.update(d => ({ waveAt: d.waveAt, sid: v.sid, declineAt: Date.now(), round: 1 }));
        break;
      case 'e-add': this.addToWok(arg); break;
      case 'e-sprinkle': this.sprinkle(); break;
      case 'e-twist': this.addTwist(arg, b); break;
      case 'e-thank': SFX.play('sparkle'); this.sync.update(d => { myR(d).thanks = true; return d; }); break;
      // both
      case 'again':
        SFX.play('pop'); this.closeOverlay(true); this.tasted = null;
        this.sync.update(d => { d.round = R + 1; d.r = { round: R + 1 }; if (this.role === 'steven') d.sid = v.sid; return d; });
        break;
      case 'end': this.closeOverlay(true); this.sync.update(d => { d.endSid = v.sid; return d; }); break;
    }
  }
  flyToPip(btn) {
    const icon = btn.querySelector('svg'); if (!icon) return;
    SFX.play('pop');
    const from = icon.getBoundingClientRect();
    const to = this.el.carry.getBoundingClientRect();
    const clone = icon.cloneNode(true); clone.classList.add('flyer');
    Object.assign(clone.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
    document.body.appendChild(clone);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const s = Math.max(0.4, to.width / Math.max(1, from.width));
    const name = btn.dataset.arg;
    if (reduceMotion()) { clone.remove(); this.setCarry(name); return; }
    const a = clone.animate([
      { transform: 'translate(0,0) scale(1)' },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(${(1 + s) / 2}) rotate(-8deg)` },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})` }
    ], { duration: 480, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
    this.flyPromise = a.finished.catch(() => { }).then(() => { clone.remove(); this.setCarry(name); this.squish(); });
  }
  async waitIdle() { let n = 0; while (this.running && n++ < 60) await sleep(50); }
  busyPanel(on) {
    this.el.panel.classList.toggle('busy', on);
    this.el.panel.querySelectorAll('button').forEach(b => { if (on) { if (!b.disabled) { b.disabled = true; b.dataset.busy = '1'; } } else if (b.dataset.busy) { b.disabled = false; delete b.dataset.busy; } });
  }
  /* ---------------- selfie + group photo ---------------- */
  snapKey(v) { return v.sid + ':' + v.round; }
  photoOf(role, v) { const p = this.hub.photos && this.hub.photos[role]; return p && p.sid === v.sid && p.round === v.round ? p : null; }
  wantSelfie(v) {
    if (v.phase !== 'done') return false;
    const key = this.snapKey(v);
    if (this.snap && this.snap.key === key && this.snap.stage === 'done') return false;
    return lsGet('pip-snapdone-' + this.role, '') !== key;
  }
  groupSig(v) {
    const g = this.photoOf('grandma', v), s = this.photoOf('steven', v);
    return v.sid + '-' + v.round + '|' + (g ? g.at : 0) + '|' + (s ? s.at : 0);
  }
  groupFor(m) {
    const id = (m.sid || '') + '-' + (m.round || 1);
    if (this.groupCache && this.groupCache.sig.indexOf(id + '|') === 0) return this.groupCache.url;
    return PhotoStore.get(id);
  }
  openSelfie(v, animate) {
    const key = this.snapKey(v);
    if (!this.snap || this.snap.key !== key) this.snap = { key, stage: null, shot: null, since: Date.now(), now: false };
    if (!this.snap.stage) this.snap.stage = this.photoOf(this.role, v) ? (this.photoOf(this.other, v) ? 'reveal' : 'wait') : 'camera';
    this.local.overlay = 'selfie';
    this.renderSelfie(animate);
  }
  snapStatus(v) {
    const name = this.t('name_' + this.other), p = this.hub.peerPresence(this.other);
    const mine = p && p.sid === v.sid && p.round === v.round;
    if (mine && p.snap === 'camera') return this.t('snap_wait_cam', { name });
    if (mine && p.snap === 'preview') return this.t('snap_wait_check', { name });
    return this.t('snap_wait_plain', { name });
  }
  shotSrc(rec, role) { return rec && rec.data ? rec.data : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Art.avatar(role).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); }
  renderSelfie(animate) {
    const v = this.view, s = this.snap, o = this.el.overlay, st = s.stage, id = this.id + '-sn';
    const other = this.t('name_' + this.other);
    let body = '';
    if (st === 'camera' || st === 'preview') {
      body = `<h2 id="${id}" tabindex="-1" data-autofocus>${esc(this.t('snap_t'))} <span aria-hidden="true">📸</span></h2>
        <p class="psub">${esc(this.t('snap_sub', { name: other }))}</p>
        <div class="viewfinder${st === 'preview' ? ' shot' : ''}">
          <video class="vf-video" playsinline muted autoplay aria-hidden="true"></video>
          ${s.shot ? `<img class="vf-img" alt="" src="${s.shot}">` : ''}
          <p class="vf-msg" data-vfmsg>${esc(this.t('snap_asking'))}</p>
          <span class="vf-count" data-count aria-live="assertive"></span>
          <span class="vf-flash" data-flash></span>
          <div class="vf-pip" aria-hidden="true">${pipMarkup('joy')}</div>
          <i class="vf-c tl"></i><i class="vf-c tr"></i><i class="vf-c bl"></i><i class="vf-c br"></i>
        </div>
        <div class="col-actions">${st === 'camera'
          ? this.btn(this.t('snap_btn'), 'snap-shoot', { cls: 'primary big shutter', icon: Art.icon('camera', 'bi') }) +
            `<div class="row-actions"><label class="btn soft filebtn"><input type="file" accept="image/*" capture="user" data-snapfile><span>${esc(this.t('snap_file'))}</span></label>${this.btn(this.t('snap_skip'), 'snap-skip', { cls: 'ghost' })}</div>`
          : `<div class="row-actions">${this.btn(this.t('snap_retake'), 'snap-retake', { cls: 'soft' })}${this.btn(this.t('snap_use'), 'snap-use', { cls: 'primary' })}</div>`}</div>`;
    } else if (st === 'wait') {
      const mine = this.photoOf(this.role, v);
      body = `<h2 id="${id}" tabindex="-1" data-autofocus>${esc(this.t('snap_wait_t', { name: other }))}</h2>
        <div class="snap-pair">
          <figure class="mini-pola l"><img src="${this.shotSrc(mine, this.role)}" alt=""><figcaption>${esc(this.t('snap_you'))}</figcaption></figure>
          <figure class="mini-pola r waiting"><span class="ph"><span class="av av-${this.other} big" aria-hidden="true">${this.other === 'grandma' ? 'G' : 'S'}</span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></span><figcaption>${esc(other)}</figcaption></figure>
        </div>
        <p class="psub" data-snapstatus aria-live="polite">${esc(this.snapStatus(v))}</p>
        <div class="col-actions" data-snapnow ${Date.now() - s.since > 10000 ? '' : 'hidden'}>${this.btn(this.t('snap_now'), 'snap-now', { cls: 'soft' })}</div>`;
      clearTimeout(this.snapNowTimer);
      this.snapNowTimer = setTimeout(() => { const el = this.el.overlay.querySelector('[data-snapnow]'); if (el) el.hidden = false; }, Math.max(0, 10000 - (Date.now() - s.since)));
    } else if (st === 'reveal') {
      body = `<h2 id="${id}" tabindex="-1" data-autofocus>${esc(this.t('snap_reveal_t'))} <span aria-hidden="true">✨</span></h2>
        <p class="psub">${esc(this.t('snap_reveal_sub', { dish: DISHES[v.dish].short.en }))}</p>
        <div class="reveal-frame" data-reveal><img class="group-photo" data-group alt="${esc(this.t('photo_alt'))}"><span class="developing">${miniPip('happy')}${esc(this.t('snap_developing'))}</span></div>
        <div class="col-actions"><div class="row-actions">${this.btn(this.t('snap_save'), 'snap-save', { cls: 'primary' })}${navigator.share ? this.btn(this.t('snap_share'), 'snap-share', { cls: 'soft' }) : ''}</div>${this.btn(this.t('snap_continue'), 'snap-continue', { cls: 'ghost' })}</div>`;
    }
    const wasOpen = !o.hidden;
    o.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}"><article class="snapcard st-${st}">${body}</article></div>`;
    o.hidden = false; o.className = 'overlay ov-selfie' + (animate && !wasOpen ? ' enter' : '');
    const f = o.querySelector('[data-autofocus]'); if (f) this.later(() => f.focus({ preventScroll: true }), 60);
    if (st === 'camera') this.startCam(); else if (this.cam) this.cam.stop();
    if (st === 'reveal') this.develop();
  }
  async startCam() {
    const o = this.el.overlay, vid = o.querySelector('.vf-video'), vf = o.querySelector('.viewfinder'), msg = o.querySelector('[data-vfmsg]');
    if (!vid) return;
    const v = this.view;
    this.sync.setPresence({ snap: 'camera', sid: v.sid, round: v.round });
    const fail = () => {
      if (msg) msg.textContent = this.t('snap_nocam'); if (vf) vf.classList.add('nocam');
      // no camera: the photo picker becomes the main button
      const b = o.querySelector('[data-act="snap-shoot"]'); if (b) b.hidden = true;
      const f = o.querySelector('.filebtn'); if (f) { f.classList.remove('soft'); f.classList.add('primary', 'big'); }
    };
    if (!SelfieCam.supported()) return fail();
    if (!this.cam) this.cam = new SelfieCam();
    try {
      await this.cam.start(vid);
      if (this.local.overlay !== 'selfie' || !this.snap || this.snap.stage !== 'camera' || !vid.isConnected) { this.cam.stop(); return; }
      vf.classList.add('live');
    } catch (e) { fail(); }
  }
  async snapShoot() {
    if (this.snapBusy || !this.cam || !this.cam.stream) return;
    const o = this.el.overlay, vid = o.querySelector('.vf-video'), cnt = o.querySelector('[data-count]'), fl = o.querySelector('[data-flash]');
    if (!vid) return;
    this.snapBusy = true;
    o.querySelectorAll('.snapcard button, .snapcard .filebtn').forEach(b => b.classList.add('dim'));
    try {
      for (const n of ['3', '2', '1']) {
        cnt.textContent = n; cnt.classList.remove('pop'); void cnt.offsetWidth; cnt.classList.add('pop'); SFX.play('pop'); haptic(8);
        await sleep(700);
        if (this.local.overlay !== 'selfie' || this.snap.stage !== 'camera') return;
      }
      cnt.textContent = this.t('snap_cheese'); cnt.classList.remove('pop'); void cnt.offsetWidth; cnt.classList.add('pop');
      await sleep(160);
      const shot = this.cam.capture(vid);
      if (fl) { fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); }
      SFX.play('shutter'); haptic(30);
      if (!shot) return;
      await sleep(260);
      this.snap.shot = shot; this.snap.stage = 'preview'; this.cam.stop();
      const v = this.view; this.sync.setPresence({ snap: 'preview', sid: v.sid, round: v.round });
      this.renderSelfie(false);
    } finally { this.snapBusy = false; }
  }
  async onSnapFile(file) {
    try { const shot = await fileToSquare(file); this.snap.shot = shot; this.snap.stage = 'preview'; if (this.cam) this.cam.stop(); this.renderSelfie(false); }
    catch (e) { this.toast(this.t('snap_nocam')); }
  }
  snapCommit(rec) {
    const v = this.view;
    this.hub.savePhoto(this.role, Object.assign({ sid: v.sid, round: v.round, role: this.role, at: Date.now() }, rec));
    this.sync.setPresence({ snap: 'done', sid: v.sid, round: v.round });
    this.snap.since = Date.now();
    this.snap.stage = this.photoOf(this.other, v) ? 'reveal' : 'wait';
    SFX.play('sparkle');
    this.renderSelfie(false);
  }
  photoTick(v) {
    if (v.phase !== 'done') return;
    const ov = this.local.overlay, s = this.snap;
    if (ov === 'selfie' && s && s.key === this.snapKey(v)) {
      if (s.stage === 'wait') {
        if (this.photoOf(this.other, v)) { s.stage = 'reveal'; this.renderSelfie(false); return; }
        const el = this.el.overlay.querySelector('[data-snapstatus]'); const t = this.snapStatus(v);
        if (el && el.textContent !== t) el.textContent = t;
      } else if (s.stage === 'reveal' && this.groupCache && this.groupCache.sig !== this.groupSig(v)) this.develop();
    } else if (ov === 'card' && this.groupCache && this.groupCache.sig.indexOf(v.sid + '-' + v.round + '|') === 0 && this.groupCache.sig !== this.groupSig(v)) {
      // the partner's selfie arrived after we moved on: redraw the photo and refresh the card
      this.develop().then(() => { if (this.local.overlay === 'card') this.openOverlay('card', null, false); });
    }
  }
  async develop() {
    const v = this.view, sig = this.groupSig(v), id = v.sid + '-' + v.round;
    let url = this.groupCache && this.groupCache.sig === sig ? this.groupCache.url : null;
    if (!url) {
      if (this.developing === sig) return; this.developing = sig;
      try {
        url = await GroupPhoto.render({ dish: v.dish, twist: v.twist, outcome: v.outcome, date: fmtDate(v.serveAt), photos: { grandma: this.photoOf('grandma', v), steven: this.photoOf('steven', v) } });
      } catch (e) { console.error(e); this.developing = null; return; }
      this.developing = null;
      this.groupCache = { sig, url }; PhotoStore.set(id, url);
    }
    const img = this.el.overlay.querySelector('[data-group]');
    if (!img) return;
    const fresh = img.src !== url;
    img.src = url;
    if (fresh) {
      requestAnimationFrame(() => { img.classList.add('in'); const f = this.el.overlay.querySelector('[data-reveal]'); if (f) f.classList.add('done'); this.confetti(img.closest('.snapcard')); });
      SFX.play('chime'); haptic(20);
    }
  }
  dataUrlBlob(url) {
    const [head, b64] = url.split(','), mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }
  photoFileName() { const v = this.view; return `PIP-${(DISHES[v.dish] ? DISHES[v.dish].short.en : 'dish').replace(/[^A-Za-z]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.jpg`; }
  async snapSave() {
    const url = this.groupFor(this.momentFromView(this.view)); if (!url) return;
    // inside Claude, files can only be handed over through the artifact's downloads capability
    const c = window.claude;
    if (c && typeof c.use === 'function') {
      let dl = null; try { dl = await c.use('downloads'); } catch (e) { dl = null; }
      if (dl && typeof dl.save === 'function') {
        try { await dl.save({ filename: this.photoFileName(), data: this.dataUrlBlob(url) }); this.toast(this.t('snap_saved'), Art.icon('camera', 'ti')); }
        catch (e) { if (!e || e.code !== 'declined') this.toast(this.t('snap_nosave')); }
        return;
      }
    }
    try {
      const a = document.createElement('a'); a.href = URL.createObjectURL(this.dataUrlBlob(url)); a.download = this.photoFileName();
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      this.toast(this.t('snap_saved'), Art.icon('camera', 'ti'));
    } catch (e) { window.open(url, '_blank'); }
  }
  async snapShare() {
    const url = this.groupFor(this.momentFromView(this.view)); if (!url || !navigator.share) return;
    try {
      const file = new File([this.dataUrlBlob(url)], this.photoFileName(), { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: this.t('photo_title') || 'Cooking with Grandma' });
      else this.snapSave();
    } catch (e) { /* the person closed the share sheet */ }
  }

  /* ---------------- PIP: touch, eyes, little life ---------------- */
  setupPipTouch() {
    const actor = this.el.pip; let down = null, taps = [], petTimer = null;
    const onPip = e => { const p = e.target.closest && e.target.closest('.pip'); return p && actor.contains(p) && !e.target.closest('.carry'); };
    actor.addEventListener('pointerdown', e => {
      if (!onPip(e)) return;
      down = { x: e.clientX, y: e.clientY, t: Date.now() };
      clearTimeout(petTimer);
      petTimer = setTimeout(() => { if (down) { down.pet = true; this.pipPet(true); } }, 550);
    });
    const up = e => {
      clearTimeout(petTimer);
      if (!down) return;
      const d = down; down = null;
      if (d.pet) { this.pipPet(false); return; }
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14 || Date.now() - d.t > 600) return;
      const now = Date.now(); taps = taps.filter(t => now - t < 1400); taps.push(now);
      this.pipTap(taps.length >= 3); if (taps.length >= 3) taps = [];
    };
    actor.addEventListener('pointerup', up); actor.addEventListener('pointercancel', () => { clearTimeout(petTimer); if (down && down.pet) this.pipPet(false); down = null; });
    // eyes follow the finger (or the mouse) a little
    let raf = 0, last = null;
    this.root.addEventListener('pointermove', e => { last = e; this.lastPointer = Date.now(); if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (last) this.lookAtClient(last.clientX, last.clientY); }); }, { passive: true });
    this.root.addEventListener('pointerdown', e => { this.lastPointer = Date.now(); this.lookAtClient(e.clientX, e.clientY); }, { passive: true });
    this.lookTimer = setInterval(() => {
      if (document.hidden || Date.now() - (this.lastPointer || 0) < 4000 || reduceMotion()) return;
      const r = Math.random();
      if (r < 0.45) this.setGaze(0, 0);
      else this.setGaze((Math.random() - 0.5) * 7, (Math.random() - 0.6) * 4);
    }, 3200);
  }
  setGaze(gx, gy) { const m = this.el.mover.style; m.setProperty('--gx', gx.toFixed(1) + 'px'); m.setProperty('--gy', gy.toFixed(1) + 'px'); }
  lookAtClient(cx, cy) {
    const f = this.el.mover.querySelector('.pip-face-wrap'); if (!f || this.el.pip.hidden) return;
    const r = f.getBoundingClientRect(); if (!r.width) return;
    const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height * 0.5), k = 1 / Math.max(60, r.width * 1.2);
    this.setGaze(Math.max(-1, Math.min(1, dx * k)) * 5, Math.max(-1, Math.min(1, dy * k)) * 3.5);
  }
  pipLine(lines) { return lines[Math.floor(Math.random() * lines.length)]; }
  pipTap(spin) {
    const v = this.view, mover = this.el.mover;
    SFX.play(spin ? 'sparkle' : 'pop'); haptic(spin ? 25 : 10);
    const prevExpr = this.expr;
    this.setExpression(spin ? 'joy' : 'happy');
    this.el.pip.querySelector('.pip')?.classList.add('glow');
    if (!reduceMotion()) {
      mover.getAnimations().filter(a => a.id === 'tap').forEach(a => a.cancel());
      const a = spin
        ? mover.animate([{ transform: 'none' }, { transform: 'translateY(-18%) rotate(180deg) scale(1.05)' }, { transform: 'translateY(0) rotate(360deg)' }], { duration: 720, easing: 'cubic-bezier(.3,.7,.3,1)' })
        : mover.animate([{ transform: 'none' }, { transform: 'scale(1.14,.86)' }, { transform: 'translateY(-10%) scale(.94,1.08)' }, { transform: 'none' }], { duration: 480, easing: 'ease-out' });
      a.id = 'tap';
    }
    this.pipHearts(spin ? 6 : 3);
    const lines = STR.en[v.phase === 'idle' || v.phase === 'declined' || v.phase === 'invited' ? 'tap_home' : (this.turnOf(v) && this.turnOf(v) !== this.role ? 'tap_wait' : 'tap_cook')];
    this.pipSay(spin ? this.t('tap_spin') : this.pipLine(lines));
    clearTimeout(this.tapTimer);
    this.tapTimer = setTimeout(() => { this.el.pip.querySelector('.pip')?.classList.remove('glow'); this.expr = null; this.setExpression(this.exprOf(this.view) || prevExpr); }, 1500);
  }
  pipPet(on) {
    const p = this.el.pip.querySelector('.pip');
    if (on) {
      SFX.play('chime'); haptic([10, 40, 10, 40, 10]);
      this.setExpression('yum'); p?.classList.add('glow', 'petting'); this.pipSay(this.t('tap_pet')); this.pipHearts(5);
    } else {
      p?.classList.remove('petting');
      clearTimeout(this.tapTimer);
      this.tapTimer = setTimeout(() => { p?.classList.remove('glow'); this.expr = null; this.setExpression(this.exprOf(this.view)); }, 900);
    }
  }
  pipSay(text) {
    const b = this.el.bubble; if (!b) return;
    const keep = b.hidden ? null : b.innerHTML;
    b.dataset.v = ''; b.hidden = false; b.innerHTML = `<p>${wordSpans(text)}</p>`; this.placeBubble();
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    clearTimeout(this.sayTimer);
    this.sayTimer = setTimeout(() => {
      // put back whatever PIP was saying for this step
      b.dataset.v = ''; if (keep) { b.innerHTML = keep; this.placeBubble(); } else b.hidden = true;
      this.renderBubble(this.view);
    }, 1700);
  }
  // a little dust cloud where PIP lands (stage coordinates)
  puff(x, y, s = 1) {
    if (reduceMotion()) return;
    const el = document.createElement('span'); el.className = 'puff'; el.setAttribute('aria-hidden', 'true');
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.setProperty('--s', s);
    el.innerHTML = '<i></i><i></i><i></i><i></i>';
    this.el.stage.appendChild(el); setTimeout(() => el.remove(), 900);
  }
  // twinkles around PIP when it arrives
  sparkle() {
    if (reduceMotion()) return;
    const el = document.createElement('span'); el.className = 'sparkle'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = Array.from({ length: 7 }, (_, i) => `<i style="--a:${(i * 51 + 10) % 360}deg;--d:${(i % 3) * 60}ms"></i>`).join('');
    this.el.pip.appendChild(el); setTimeout(() => el.remove(), 1200);
  }
  // a small celebration when the keepsake photo appears
  confetti(host) {
    if (reduceMotion() || !host) return;
    const el = document.createElement('div'); el.className = 'confetti'; el.setAttribute('aria-hidden', 'true');
    const cols = ['#F2A85A', '#E0684E', '#ADC7A5', '#F4BBB4', '#F7D58C', '#8FB4D9'];
    let h = '';
    for (let i = 0; i < 28; i++) {
      const x = (Math.random() * 2 - 1) * 170, y = -(70 + Math.random() * 130), r = Math.random() * 720 - 360;
      h += `<i style="--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--r:${r.toFixed(0)}deg;--d:${(Math.random() * 140).toFixed(0)}ms;background:${cols[i % cols.length]}${i % 3 ? '' : ';border-radius:50%'}"></i>`;
    }
    el.innerHTML = h; host.appendChild(el); setTimeout(() => el.remove(), 2300);
  }
  pipHearts(n) {
    if (reduceMotion()) return;
    for (let i = 0; i < n; i++) {
      const h = document.createElement('span'); h.className = 'pip-heart'; h.setAttribute('aria-hidden', 'true');
      h.innerHTML = '<svg viewBox="-9 -10 18 15"><path d="M0 4 C-7 -2 -6 -9 -2.2 -9 C-.6 -9 0 -7.6 0 -6.6 C0 -7.6 .6 -9 2.2 -9 C6 -9 7 -2 0 4Z"/></svg>';
      h.style.setProperty('--hx', ((Math.random() - 0.5) * 90).toFixed(0) + '%');
      h.style.setProperty('--hd', (i * 0.07).toFixed(2) + 's');
      h.style.setProperty('--hs', (0.7 + Math.random() * 0.6).toFixed(2));
      this.el.pip.appendChild(h);
      setTimeout(() => h.remove(), 1600 + i * 70);
    }
  }

  /* the ingredient flies from PIP (or a tile) to just above the wok; the cooking stage takes it from there */
  async flyToWok(fromRect, name) {
    const to = this.worldToClient(DROP.x, DROP.y), size = 44 * to.s;
    const node = document.createElement('div'); node.className = 'flyer'; node.innerHTML = Art.icon(name);
    Object.assign(node.style, { left: (to.x - size / 2) + 'px', top: (to.y - size / 2) + 'px', width: size + 'px', height: size + 'px' });
    document.body.appendChild(node);
    if (!reduceMotion()) {
      SFX.play('pop');
      const sx = fromRect.left + fromRect.width / 2 - to.x, sy = fromRect.top + fromRect.height / 2 - to.y, s0 = Math.max(0.5, fromRect.width / size);
      await node.animate([
        { transform: `translate(${sx}px, ${sy}px) scale(${s0})` },
        { transform: `translate(${sx * 0.45}px, ${Math.min(sy, 0) * 0.45 - 46}px) scale(${(s0 + 1) / 2}) rotate(-10deg)`, offset: 0.55 },
        { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' }
      ], { duration: 460, easing: 'cubic-bezier(.35,.7,.4,1)', fill: 'forwards' }).finished.catch(() => { });
    }
    node.remove();
  }
  async cookIn(k, v) {
    // tell Grandma's porthole right away, so both phones watch it go in together
    this.sync.setPresence({ addK: k, addAt: Date.now(), sid: v.sid, round: v.round });
    this.cook.setHeat(true); haptic(20);
    if (this.pipHereShown) this.setExpression('surprised');
    await this.cook.add(k, { handoff: true });
    if (this.pipHereShown) { this.setExpression('joy'); this.squish(); }
    await sleep(260);
  }
  async addToWok(name, fromRect) {
    if (this.adding) return; this.adding = true;
    try {
      await this.waitIdle();
      const v = this.view; const R = v.round || 1;
      if (!(v.phase === 'add1' || (v.phase === 'add2' && v.sub === 'add'))) return;
      const ing = v.phase === 'add1' ? v.order[0] : v.order[1];
      this.busyPanel(true);
      const rect = fromRect || this.el.carry.getBoundingClientRect();
      this.setCarry(null); this.hideBubble();
      await this.flyToWok(rect, ing);
      await this.cookIn(ing, v);
      this.sync.update(d => { if (!d.r || d.r.round !== R) d.r = { round: R }; const a = Array.isArray(d.r.added) ? d.r.added : []; if (!a.includes(ing)) a.push(ing); d.r.added = a; return d; });
    } finally { this.adding = false; this.busyPanel(false); }
  }
  async sprinkle() {
    if (this.adding) return; this.adding = true;
    try {
      await this.waitIdle();
      const v = this.view; const R = v.round || 1;
      if (!(v.phase === 'add2' && v.sub === 'sprinkle')) return;
      this.busyPanel(true);
      const rect = this.el.carry.getBoundingClientRect();
      this.setCarry(null); this.hideBubble();
      await this.flyToWok(rect, v.secret);
      await this.cookIn(v.secret, v);
      this.sync.update(d => { if (!d.r || d.r.round !== R) d.r = { round: R }; d.r.secretIn = true; return d; });
    } finally { this.adding = false; this.busyPanel(false); }
  }
  async addTwist(k, btn) {
    if (this.adding) return; this.adding = true;
    try {
      const v = this.view; const R = v.round || 1;
      if (v.phase !== 'twist') return;
      this.busyPanel(true);
      if (k !== 'none') {
        const icon = btn.querySelector('svg'); this.hideBubble();
        await this.flyToWok(icon ? icon.getBoundingClientRect() : btn.getBoundingClientRect(), k);
        await this.cookIn(k, v);
      } else { SFX.play('pop'); this.setExpression('happy'); }
      this.stir = 0; this.stirSent = null;
      this.sync.update(d => { if (!d.r || d.r.round !== R) d.r = { round: R }; d.r.twist = k; return d; });
    } finally { this.adding = false; this.busyPanel(false); }
  }
  /* drag the ingredient from PIP into the wok (Standard mode) */
  setupDrag() {
    const carry = this.el.carry, hitEl = this.el.hit;
    let ghost = null, start = null, over = false, pid = null;
    const wokHit = (x, y) => { const r = hitEl.getBoundingClientRect(); return r.width > 0 && x > r.left - 10 && x < r.right + 10 && y > r.top - 20 && y < r.bottom + 10; };
    carry.addEventListener('pointerdown', e => {
      if (!carry.classList.contains('grab') || this.adding) return;
      e.preventDefault(); pid = e.pointerId; try { carry.setPointerCapture(pid); } catch (er) { }
      const r = carry.getBoundingClientRect(); start = { x: e.clientX, y: e.clientY, r };
      ghost = document.createElement('div'); ghost.className = 'flyer drag'; ghost.innerHTML = carry.innerHTML;
      Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      document.body.appendChild(ghost); carry.style.visibility = 'hidden'; hitEl.classList.add('target');
    });
    carry.addEventListener('pointermove', e => {
      if (!ghost || e.pointerId !== pid) return;
      ghost.style.transform = `translate(${e.clientX - start.x}px, ${e.clientY - start.y}px) scale(1.12) rotate(-6deg)`;
      const o = wokHit(e.clientX, e.clientY); if (o !== over) { over = o; hitEl.classList.toggle('over', o); }
    });
    const end = e => {
      if (!ghost || (e && e.pointerId !== pid)) return;
      const g = ghost; ghost = null; hitEl.classList.remove('target', 'over');
      const hit = e && wokHit(e.clientX, e.clientY); over = false;
      if (hit) {
        const r = g.getBoundingClientRect(); g.remove(); carry.style.visibility = '';
        const v = this.view; this.addToWok(v.phase === 'add1' ? v.order[0] : v.order[1], r);
      } else {
        g.animate([{ transform: g.style.transform || 'none' }, { transform: 'translate(0,0)' }], { duration: 220, easing: 'ease-out' }).finished.catch(() => { }).then(() => { g.remove(); carry.style.visibility = ''; });
      }
    };
    carry.addEventListener('pointerup', end); carry.addEventListener('pointercancel', end);
  }
  /* stir: circle a finger around the wok (Standard) or hold the button (any mode) */
  setupStir() {
    const hitEl = this.el.hit; let last = null, pid = null;
    const angle = e => { const c = this.worldToClient(WOK.cx, WOK.rimY + 6); return Math.atan2((e.clientY - c.y) * 2, e.clientX - c.x); };
    let down = null;
    hitEl.addEventListener('pointerdown', e => {
      if (!hitEl.classList.contains('stirring')) return;
      e.preventDefault(); SFX.unlock(); pid = e.pointerId; try { hitEl.setPointerCapture(pid); } catch (er) { } last = angle(e);
      down = { t: performance.now(), x: e.clientX, y: e.clientY, moved: 0 };
    });
    hitEl.addEventListener('pointermove', e => {
      if (last == null || e.pointerId !== pid) return;
      if (down) down.moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y));
      const a = angle(e); let d = a - last; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; last = a;
      this.stirAcc = (this.stirAcc || 0) + d;
      this.addStir(Math.abs(d) / (Math.PI * 2 * 2.2), this.stirAcc);
    });
    const up = e => {
      // a quick tap (no drag) = a big toss: the food jumps and a little progress is made
      if (down && e && e.type === 'pointerup' && performance.now() - down.t < 300 && down.moved < 12) this.tapToss();
      last = null; pid = null; down = null;
    };
    hitEl.addEventListener('pointerup', up); hitEl.addEventListener('pointercancel', up);
    // hold-to-stir button lives in the panel (delegated)
    const startHold = e => {
      const b = e.target.closest('[data-act="e-stir"]'); if (!b || b.disabled) return;
      e.preventDefault(); SFX.unlock(); clearInterval(this.holdTimer);
      this.holdTimer = setInterval(() => { this.stirAcc = (this.stirAcc || 0) + 0.42; this.addStir(0.022, this.stirAcc); }, 60);
    };
    const stopHold = () => { clearInterval(this.holdTimer); this.holdTimer = null; };
    this.root.addEventListener('pointerdown', startHold);
    this.root.addEventListener('pointerup', stopHold); this.root.addEventListener('pointercancel', stopHold); this.root.addEventListener('pointerleave', stopHold);
    this.root.addEventListener('keydown', e => {
      if ((e.key === ' ' || e.key === 'Enter') && e.target.closest && e.target.closest('[data-act="e-stir"]')) { e.preventDefault(); this.stirAcc = (this.stirAcc || 0) + 0.9; this.addStir(0.1, this.stirAcc); }
    });
  }
  tapToss() {
    const v = this.view; if (v.phase !== 'stir' || v.stirred) return;
    const now = Date.now(); if (this.lastTap && now - this.lastTap < 220) return; this.lastTap = now;
    this.lastTossAt = now; this.cook.toss(1.35); haptic(12); SFX.play('toss');
    this.stirAcc = (this.stirAcc || 0) + 0.6; this.addStir(0.05, this.stirAcc);
    const tip = this.el.panel.querySelector('.tip'); if (tip) tip.classList.add('used');
  }
  addStir(amount, ang) {
    const v = this.view; if (v.phase !== 'stir' || v.stirred) return;
    this.stir = Math.min(1, this.stir + amount);
    const c = this.cook; c.stirTo(ang); c.setCook(0.3 + 0.7 * this.stir);
    const now = Date.now();
    if (!this.lastTossAt || now - this.lastTossAt > 620) { this.lastTossAt = now; c.toss(0.9); }
    const bar = this.el.panel.querySelector('.stirbar');
    if (bar) { bar.querySelector('i').style.width = Math.round(this.stir * 100) + '%'; bar.setAttribute('aria-valuenow', Math.round(this.stir * 100)); }
    if (!this.lastSizzle || now - this.lastSizzle > 900) { this.lastSizzle = now; SFX.play('sizzle'); }
    if (now - this.lastPres > 110 || this.stir >= 1) { this.lastPres = now; this.sync.setPresence({ stir: +this.stir.toFixed(3), sid: v.sid, round: v.round }); }
    if (this.stir >= 1 && !this.stirSent) {
      this.stirSent = v.sid + v.round; clearInterval(this.holdTimer);
      SFX.play('yum'); const R = v.round; c.toss(1.15);
      this.sync.update(d => { if (!d.r || d.r.round !== R) d.r = { round: R }; d.r.stirred = true; return d; });
    }
    if (this.stirSent && this.stirSent !== v.sid + v.round) this.stirSent = null;
  }
}
function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
