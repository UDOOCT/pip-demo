"use strict";
/* ============================================================
   Cooking stage (canvas)
   Stove and flames, the wok, food that falls, bounces, sizzles
   and browns, entrances for each ingredient (egg crack, chopping,
   pouring, sprinkling), stirring and wok tosses, steam and oil,
   plating, PIP's bites and reactions.
   Everything is drawn in world units (390 x 420), the same space
   as the illustrated kitchen behind it.
   ============================================================ */
const COOK_G = 980;
const WOK = { cx: 266, rimY: 248, rx: 68, ry: 13 };
const STOVE_RX = 54;
const PLATE = { cx: 186, cy: 301, rx: 46, ry: 11 };
const DROP = { x: 262, y: 211 };
const FOOD_LINE = 'rgba(70,46,38,.32)';
const INK_K = 'rgba(38,28,24,.42)'; // soft edges: the rooms are drawn without outlines
const rr = (a, b) => a + Math.random() * (b - a);
const EASE = {
  lin: t => t,
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
};
const HEX = {};
function hexRgb(c) { if (HEX[c]) return HEX[c]; const n = parseInt(c.slice(1), 16); return (HEX[c] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]); }
function hexMix(c1, c2, t) {
  t = Math.max(0, Math.min(1, t));
  const a = hexRgb(c1), b = hexRgb(c2);
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}
function rgbMix(c, h, t) {
  // c: 'rgb(r,g,b)' from hexMix, h: hex
  const m = c.match(/\d+/g).map(Number), b = hexRgb(h);
  return `rgb(${Math.round(m[0] + (b[0] - m[0]) * t)},${Math.round(m[1] + (b[1] - m[1]) * t)},${Math.round(m[2] + (b[2] - m[2]) * t)})`;
}
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function blob(ctx, r, sh, ox = 0, oy = 0, squash = 0.8) {
  const n = sh.length; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const r0 = r * (0.78 + sh[i] * 0.36), r1 = r * (0.78 + sh[(i + 1) % n] * 0.36);
    const x0 = ox + Math.cos(a0) * r0, y0 = oy + Math.sin(a0) * r0 * squash;
    const x1 = ox + Math.cos(a1) * r1, y1 = oy + Math.sin(a1) * r1 * squash;
    const am = (a0 + a1) / 2, rm = ((r0 + r1) / 2) * 1.14;
    if (i === 0) ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(ox + Math.cos(am) * rm, oy + Math.sin(am) * rm * squash, x1, y1);
  }
  ctx.closePath();
}
function heartPath(ctx, s) {
  ctx.beginPath(); ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.5, -s * 1.05, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.5, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35); ctx.closePath();
}
function starPath(ctx, s) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? s * 0.32 : s; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath();
}
function flamePath(ctx, x, y, w, h) {
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w / 2, y - h * 0.55, x, y - h); ctx.quadraticCurveTo(x + w / 2, y - h * 0.55, x + w / 2, y); ctx.closePath();
}

/* raw -> cooked colors, how many pieces, piece size */
const FOOD = {
  egg: { n: 9, raw: '#FFE57E', cooked: '#FFB82E', size: [8.5, 11.5] },
  tomato: { n: 8, raw: '#F45E45', cooked: '#D7412B', size: [9.5, 12] },
  rice: { n: 44, raw: '#FFFFFF', cooked: '#FCE7B0', size: [1, 1] },
  garlic: { n: 16, raw: '#FBF1DC', cooked: '#EEC56C', size: [2.6, 3.4] },
  bokchoy: { n: 6, raw: '#8CCD72', cooked: '#4E9E44', size: [10.5, 13.5], gmul: 0.38, sway: true },
  scallion: { n: 14, raw: '#9AD27F', cooked: '#6EB156', size: [2.4, 3.1] },
  chili: { n: 10, raw: '#EC4532', cooked: '#C9311F', size: [3.3, 4.3] },
  cheese: { n: 13, raw: '#FFD45C', cooked: '#FFE6A0', size: [7, 10] },
  chocolate: { n: 8, raw: '#7A4A35', cooked: '#4E2619', size: [4.8, 6.4] }
};
const GLAZE = { soy: '#7A4325', honey: '#F0A535' };
const IMG = {};
function iconImg(name) {
  if (IMG[name]) return IMG[name];
  const svg = Art.icon(name).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" ');
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  IMG[name] = img; return img;
}
function preloadCookIcons() { ['egg', 'tomato', 'rice', 'garlic', 'bokchoy', 'sugar', 'salt', 'soy', 'scallion', 'chili', 'honey', 'cheese', 'chocolate'].forEach(iconImg); }

class CookStage {
  constructor(cv, fx, opts = {}) {
    this.cv = cv; this.fx = fx || null; this.mini = !!opts.mini; this.sfx = opts.sfx || (() => { });
    // the porthole shows a close-up of the wok
    this.view = this.mini ? { x: 181, y: 150, w: 180, h: 180 } : { x: 0, y: 0, w: 390, h: 420 };
    this.reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.running = false; this.t = 0; this.last = 0;
    this.reset();
    this.loop = this.loop.bind(this);
    preloadCookIcons();
    this.resize();
  }
  reset() {
    (this.drops || []).forEach(d => d.res && d.res());
    (this.tweens || []).forEach(tw => tw.res && tw.res());
    this.pieces = []; this.oil = []; this.steam = []; this.fxs = []; this.sprites = []; this.shells = []; this.drops = []; this.streams = []; this.slashes = []; this.tweens = []; this.pools = [];
    this.items = new Set(); this.wok = { dx: 0, dy: 0, rot: 0 }; this.shake = 0; this.heat = 0; this.heatTarget = 0; this.flare = 0;
    this.spat = { on: false, a: -0.6, ta: -0.6, bx: null, by: null, auto: false, until: 0 };
    this.plate = { on: false, k: 0 }; this.cookTarget = 0; this.lastToss = -9; this.rl = 0;
    this.queue = Promise.resolve(); this.gen = (this.gen || 0) + 1;
  }
  clear() { this.reset(); this.drawNow(); }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [this.cv, this.fx]) {
      if (!c) continue;
      const w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) continue;
      const W = Math.round(w * dpr), H = Math.round(h * dpr);
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      c._dpr = dpr; c._w = w; c._h = h;
    }
    this.drawNow();
  }
  start() { if (this.running) return; this.running = true; this.last = performance.now(); requestAnimationFrame(this.loop); }
  stop() { this.running = false; }
  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now;
    this.update(dt); this.draw();
    requestAnimationFrame(this.loop);
  }
  drawNow() { try { this.draw(); } catch (e) { } }
  wait(ms) { const g = this.gen; return new Promise(r => setTimeout(() => r(g === this.gen), ms)); }
  tween(obj, key, from, to, ms, ease = EASE.out) {
    if (this.reduce) { obj[key] = to; return Promise.resolve(); }
    return new Promise(res => { obj[key] = from; this.tweens.push({ obj, key, from, to, t: 0, d: Math.max(0.001, ms / 1000), ease, res }); });
  }
  tweenWok(to, ms, ease = EASE.inOut) { return Promise.all(Object.keys(to).map(k => this.tween(this.wok, k, this.wok[k], to[k], ms, ease))); }
  /* where a point drawn inside the (moving) wok really is */
  poseXY(x, y) {
    const sh = this.shake, wob = Math.sin(this.t * 38) * sh;
    const px = WOK.cx, py = WOK.rimY + 20, a = this.wok.rot + wob * 0.05, c = Math.cos(a), s = Math.sin(a);
    const lx = x - px, ly = y - py;
    return { x: px + this.wok.dx + wob * 5 + lx * c - ly * s, y: py + this.wok.dy - Math.abs(wob) * 4 + lx * s + ly * c };
  }

  /* ---------------- food ---------------- */
  piece(kind, x, y, vx = 0, vy = 0, home = 'wok') {
    const f = FOOD[kind]; if (!f) return null;
    const sh = []; for (let i = 0; i < (kind === 'rice' ? 12 : 7); i++) sh.push(Math.random());
    const p = { kind, x, y, vx, vy, rot: rr(0, Math.PI * 2), vr: rr(-6, 6), s: rr(f.size[0], f.size[1]), shape: sh, cooked: 0, glaze: null, glazeAmt: 0,
      home, grounded: false, layer: rr(0, 7), gmul: f.gmul || 1, sway: !!f.sway, seed: rr(0, 10), alpha: 1, scale: 1, glint: 0 };
    this.pieces.push(p); return p;
  }
  floorY(p) {
    if (p.home === 'plate') {
      const u = Math.max(-1, Math.min(1, (p.x - PLATE.cx) / (PLATE.rx - 10)));
      return PLATE.cy - 2 - 8 * (1 - u * u) - p.layer * 0.8;
    }
    const u = Math.max(-1, Math.min(1, (p.x - WOK.cx) / (WOK.rx - 10)));
    return WOK.rimY + 6 + 4 * (1 - u * u) - p.layer * 0.9;
  }
  settle(kind) {
    const f = FOOD[kind]; if (!f) return;
    for (let i = 0; i < f.n; i++) {
      const p = this.piece(kind, WOK.cx + rr(-44, 44), 0); p.y = this.floorY(p); p.grounded = true; p.vr = 0; p.cooked = Math.min(this.cookTarget, 0.5);
    }
  }
  applyGlaze(kind, amt) { this.pieces.forEach(p => { if (p.home === 'wok') { p.glaze = GLAZE[kind]; p.glazeAmt = amt; } }); }
  /* put things in the wok without a show (opened mid-way, reduced motion) */
  ensure(items, animate) {
    for (const k of items) {
      if (this.items.has(k)) continue;
      if (animate && !this.reduce) { this.add(k); continue; }
      this.items.add(k);
      if (FOOD[k]) this.settle(k);
      else if (GLAZE[k]) this.applyGlaze(k, 0.4);
    }
  }
  /* an ingredient's entrance; resolves once it has landed */
  add(kind, o = {}) {
    if (this.items.has(kind)) return Promise.resolve();
    this.items.add(kind);
    const g = this.gen;
    const run = () => {
      if (g !== this.gen) return;
      if (this.reduce) { if (FOOD[kind]) this.settle(kind); else if (GLAZE[kind]) this.applyGlaze(kind, 0.4); this.sfx('plop'); return this.wait(120); }
      switch (kind) {
        case 'egg': return this.crackEgg(o);
        case 'rice': return this.pourRice(o);
        case 'sugar': case 'salt': return this.shake_in(kind, o);
        case 'soy': case 'honey': return this.pourLiquid(kind, o);
        case 'garlic': return this.chop(kind, o, 3);
        case 'chocolate': return this.chop(kind, o, 1, true);
        default: return FOOD[kind] ? this.chop(kind, o, 2) : this.wait(80);
      }
    };
    const p = this.queue.then(run);
    this.queue = p.catch(() => { });
    return p;
  }
  sprite(name, x, y, size, o = {}) {
    const s = { name, x, y, size, rot: 0, k: o.handoff ? 1 : 0.4, alpha: 1, wob: 0, crack: 0, dead: false };
    this.sprites.push(s); iconImg(name); return s;
  }
  async enter(sp, o) { if (!o.handoff) await this.tween(sp, 'k', 0.4, 1, 220, EASE.back); }
  // a point given in the 64-unit icon box, as it sits now in the world
  spPoint(sp, lx, ly) {
    const sc = (sp.size / 64) * sp.k, x = (lx - 32) * sc, y = (ly - 32) * sc, c = Math.cos(sp.rot), s = Math.sin(sp.rot);
    return { x: sp.x + x * c - y * s, y: sp.y + x * s + y * c };
  }
  async crackEgg(o) {
    const g = this.gen, ok = () => g === this.gen;
    const sp = this.sprite('egg', DROP.x, DROP.y, 44, o);
    await this.enter(sp, o); if (!ok()) return;
    sp.wob = 1; await this.wait(220); sp.wob = 0; if (!ok()) return;
    this.sfx('crack'); sp.crack = 1; await this.wait(150); if (!ok()) return;
    sp.dead = true;
    for (const side of [-1, 1]) this.shells.push({ x: DROP.x + side * 5, y: DROP.y - 4, vx: side * rr(70, 100), vy: rr(-130, -80), rot: 0, vr: side * rr(5, 8), side, t: 0, life: 0.85 });
    await new Promise(res => this.drops.push({ x: DROP.x, y: DROP.y + 4, vy: 60, res, stretch: 0 })); if (!ok()) return;
    this.sfx('sizzle'); this.flare = 0.6;
    this.oilBurst(WOK.cx, WOK.rimY + 6, 12);
    const pool = { x: DROP.x + 2, y: WOK.rimY + 7, t: 0, life: 0.5, sh: Array.from({ length: 9 }, () => Math.random()) };
    this.pools.push(pool);
    await this.wait(500); if (!ok()) return;
    this.pools.splice(this.pools.indexOf(pool), 1);
    // the egg sets and breaks into soft curds
    for (let i = 0; i < FOOD.egg.n; i++) {
      const p = this.piece('egg', pool.x + rr(-22, 22), WOK.rimY + rr(2, 8), rr(-50, 50), rr(-140, -60), 'wok');
      p.cooked = 0.1; p.vr = rr(-4, 4);
    }
    this.sfx('toss');
    await this.wait(260);
  }
  async chop(kind, o, cuts, crunch) {
    const g = this.gen, ok = () => g === this.gen;
    const sp = this.sprite(kind, DROP.x, DROP.y, 44, o);
    await this.enter(sp, o); if (!ok()) return;
    sp.wob = 1; await this.wait(170); sp.wob = 0; if (!ok()) return;
    const angles = [-0.7, 0.6, -0.1];
    for (let i = 0; i < cuts; i++) {
      this.sfx(crunch ? 'crack' : 'chop'); this.slashes.push({ x: DROP.x, y: DROP.y, a: angles[i % 3], t: 0 });
      sp.k = 0.94; this.tween(sp, 'k', 0.94, 1, 90);
      await this.wait(i === cuts - 1 ? 90 : 95); if (!ok()) return;
    }
    sp.dead = true;
    const f = FOOD[kind];
    for (let i = 0; i < f.n; i++) {
      const p = this.piece(kind, DROP.x + rr(-12, 12), DROP.y + rr(-10, 10), rr(-70, 70), rr(-130, -20), 'wok');
      p.vr = rr(-10, 10);
    }
    setTimeout(() => { if (ok()) { this.sfx('sizzle'); this.flare = Math.max(this.flare, 0.5); } }, kind === 'bokchoy' ? 520 : 300);
    await this.wait(kind === 'bokchoy' ? 1050 : 560);
  }
  async pourRice(o) {
    const g = this.gen, ok = () => g === this.gen;
    const sp = this.sprite('rice', DROP.x - 26, DROP.y + 6, 46, o);
    await this.enter(sp, o); if (!ok()) return;
    await this.tween(sp, 'rot', 0, 1.9, 300, EASE.inOut); if (!ok()) return;
    this.sfx('pour');
    const dirx = Math.sin(sp.rot), diry = -Math.cos(sp.rot);
    for (let i = 0; i < FOOD.rice.n; i++) {
      const l = this.spPoint(sp, rr(30, 46), rr(20, 27));
      this.piece('rice', l.x, l.y, dirx * rr(40, 95), diry * rr(20, 60) + rr(-10, 25), 'wok');
      if (i % 3 === 2 && !(await this.wait(24))) return;
    }
    if (!(await this.wait(160))) return;
    this.sfx('sizzle'); this.flare = Math.max(this.flare, 0.5);
    this.tween(sp, 'rot', sp.rot, 0.6, 220, EASE.inOut);
    await this.tween(sp, 'alpha', 1, 0, 240);
    sp.dead = true; await this.wait(260);
  }
  async shake_in(kind, o) {
    const g = this.gen, ok = () => g === this.gen;
    const sp = this.sprite(kind, DROP.x, DROP.y - 4, 42, o);
    await this.enter(sp, o); if (!ok()) return;
    await this.tween(sp, 'rot', 0, kind === 'salt' ? 2.6 : 0.5, 220, EASE.inOut); if (!ok()) return;
    this.sfx('sparkle');
    const base = sp.rot;
    for (let i = 0; i < 9; i++) {
      sp.rot = base + (i % 2 ? 0.22 : -0.22); sp.y = DROP.y - 4 + (i % 2 ? -3 : 3);
      const m = this.spPoint(sp, 32, kind === 'salt' ? 16 : 30);
      for (let k = 0; k < 5; k++) this.fxs.push({ type: 'grain', x: m.x + rr(-5, 5), y: m.y + rr(-3, 3), vx: rr(-30, 30), vy: rr(20, 80), t: 0, life: 1.2, size: rr(1.1, 2), col: '#FFFFFF', base: true });
      if (!(await this.wait(62))) return;
    }
    sp.rot = base; sp.y = DROP.y - 4;
    if (!(await this.wait(260))) return;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.fxs.push({ type: 'star', x: WOK.cx + Math.cos(a) * 10, y: WOK.rimY + 4 + Math.sin(a) * 3, vx: Math.cos(a) * 95, vy: Math.sin(a) * 30 - 45, t: 0, life: 0.9, size: rr(3, 5), col: '#FFE7A8', base: true });
    }
    this.pieces.forEach(p => { if (p.home === 'wok') p.glint = 1; });
    this.sfx('sparkle');
    this.tween(sp, 'alpha', 1, 0, 260);
    await this.wait(360); sp.dead = true;
  }
  async pourLiquid(kind, o) {
    const g = this.gen, ok = () => g === this.gen;
    const soy = kind === 'soy';
    const sp = this.sprite(kind, DROP.x - 18, DROP.y - 6, 46, o);
    await this.enter(sp, o); if (!ok()) return;
    await this.tween(sp, 'rot', 0, soy ? 2.0 : 1.7, 300, EASE.inOut); if (!ok()) return;
    this.sfx('pour');
    const st = { kind, sp, t: 0, life: soy ? 0.8 : 1.0, col: GLAZE[kind], w: soy ? 2.6 : 4.4, lip: soy ? [32, 8] : [32, 19] };
    this.streams.push(st);
    if (!(await this.wait(st.life * 1000))) return;
    await this.tween(sp, 'rot', sp.rot, 0, 240, EASE.inOut); if (!ok()) return;
    await this.tween(sp, 'alpha', 1, 0, 200);
    sp.dead = true;
  }
  oilBurst(x, y, n) {
    for (let i = 0; i < n; i++) this.oil.push({ x: x + rr(-30, 30), y, vx: rr(-70, 70), vy: rr(-230, -90), t: 0, life: rr(0.3, 0.55), s: rr(0.9, 1.8) });
  }

  /* ---------------- heat, stirring ---------------- */
  setHeat(on) { this.heatTarget = on ? 1 : 0; }
  setCook(level) { this.cookTarget = Math.max(0, Math.min(1, level)); }
  stirTo(a) { this.spat.on = true; this.spat.ta = a; }
  stirStop() { this.spat.on = false; this.spat.auto = false; }
  toss(strength = 1) {
    if (this.reduce || this.t - this.lastToss < 0.34) return; this.lastToss = this.t;
    if (!this.pieces.some(p => p.home === 'wok')) return;
    this.sfx('toss'); this.shake = 1; this.flare = 1;
    for (const p of this.pieces) {
      if (p.home !== 'wok') continue;
      p.vy = -rr(150, 280) * strength * (p.kind === 'bokchoy' ? 0.7 : 1); p.vx = rr(-50, 50) + (WOK.cx - p.x) * 0.9; p.vr = rr(-9, 9); p.grounded = false;
    }
    this.oilBurst(WOK.cx, WOK.rimY + 6, 6);
  }
  // Grandma's porthole mirrors Steven's stirring
  remoteStir(level) {
    if (level > this.rl + 0.004) { this.spat.on = true; this.spat.auto = true; this.spat.until = this.t + 0.8; }
    this.rl = Math.max(this.rl, level);
    this.setCook(0.3 + 0.7 * level);
  }

  /* ---------------- serving, tasting, reactions ---------------- */
  async serve() {
    const g = this.gen, ok = () => g === this.gen;
    this.heatTarget = 0; this.stirStop();
    if (this.reduce) { this.plateNow(); return; }
    if (!this.mini) { this.plate.on = true; this.sfx('clink'); await this.tween(this.plate, 'k', 0, 1, 360, EASE.back); if (!ok()) return; }
    const tilt = this.tweenWok(this.mini ? { dx: -14, dy: -20, rot: -0.62 } : { dx: -44, dy: -40, rot: -0.6 }, 440, EASE.inOut);
    if (!(await this.wait(220))) return; this.sfx('pour');
    const inWok = this.pieces.filter(p => p.home === 'wok').sort((a, b) => a.x - b.x);
    const step = Math.max(6, Math.min(14, 520 / Math.max(1, inWok.length)));
    inWok.forEach((p, i) => setTimeout(() => {
      if (!ok() || p.home !== 'wok') return;
      const w = this.poseXY(p.x, p.y); p.x = w.x; p.y = w.y; p.rot += this.wok.rot;
      if (this.mini) { p.home = 'gone'; p.grounded = false; p.vx = rr(-170, -100); p.vy = rr(-200, -120); }
      else { p.layer = rr(0, 9); this.launch(p, PLATE.cx + rr(-28, 28), PLATE.cy - 8 + rr(-3, 2), 'plate', rr(0.34, 0.46)); }
    }, i * step));
    await tilt; if (!ok()) return;
    if (!(await this.wait(inWok.length * step + 360))) return;
    await this.tweenWok({ dx: 0, dy: 0, rot: 0 }, 380, EASE.out);
  }
  plateNow() {
    this.heatTarget = 0; this.heat = 0; this.stirStop(); this.wok = { dx: 0, dy: 0, rot: 0 };
    if (this.mini) { this.pieces = []; return; }
    this.plate.on = true; this.plate.k = 1;
    for (const p of this.pieces) { p.home = 'plate'; p.layer = rr(0, 9); p.x = PLATE.cx + rr(-28, 28); p.grounded = true; p.y = this.floorY(p); p.cooked = Math.max(p.cooked, 0.9); }
  }
  launch(p, tx, ty, home, T) {
    p.home = home; p.grounded = false;
    p.vx = (tx - p.x) / T; p.vy = (ty - p.y) / T - 0.5 * COOK_G * p.gmul * T; p.vr = rr(-7, 7);
  }
  plateCount() { return this.pieces.filter(p => p.home === 'plate').length; }
  async bite(mouth, share = 3.2) {
    const on = this.pieces.filter(p => p.home === 'plate').sort((a, b) => a.x - b.x);
    if (!on.length) return;
    const take = on.slice(0, Math.max(2, Math.ceil(on.length / share)));
    take.forEach((p, i) => {
      p.home = 'mouth'; p.grounded = false; p.T = 0.24 + i * 0.01; p.tt = 0;
      p.vx = (mouth.x - p.x) / p.T; p.vy = (mouth.y - p.y) / p.T - 0.5 * COOK_G * p.T; p.vr = rr(-8, 8);
    });
    if (!(await this.wait(280))) return;
    const col = FOOD[take[0].kind] ? FOOD[take[0].kind].cooked : '#FFC63A';
    for (let i = 0; i < 6; i++) this.fxs.push({ type: 'crumb', x: mouth.x + rr(4, 12), y: mouth.y + rr(-2, 4), vx: rr(10, 80), vy: rr(-110, -30), t: 0, life: rr(0.5, 0.8), size: rr(1.2, 2.2), col });
  }
  react(kind, at) {
    const push = o => this.fxs.push(Object.assign({ t: 0, delay: 0 }, o));
    const side = () => (Math.random() < 0.5 ? -1 : 1);
    if (kind === 'yum') {
      for (let i = 0; i < 8; i++) { const s = i % 2 ? 1 : -1; push({ type: 'heart', x: at.x + s * rr(48, 64), y: at.y + rr(10, 40), vx: s * rr(6, 18), vy: rr(-60, -38), life: rr(1.3, 1.8), size: rr(5, 8), col: i % 3 ? '#FF8E93' : '#FFB3B5', delay: i * 0.08 }); }
      for (let i = 0; i < 12; i++) { const a = rr(0, Math.PI * 2); push({ type: 'star', x: at.x + Math.cos(a) * 52, y: at.y + 30 + Math.sin(a) * 46, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 - 20, life: rr(0.6, 1), size: rr(3, 5), col: '#FFD28E' }); }
    } else if (kind === 'spicy') {
      for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1; push({ type: 'flame', x: at.x + s * rr(44, 58), y: at.y + rr(28, 48), vx: s * rr(4, 12), vy: rr(-55, -35), life: rr(0.9, 1.3), size: rr(6, 9), delay: i * 0.08 }); }
      for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1; push({ type: 'puff', x: at.x + s * 50, y: at.y + 20, vx: s * rr(25, 45), vy: rr(-45, -25), life: 1.1, size: rr(9, 13), delay: i * 0.14 }); }
      for (let i = 0; i < 4; i++) push({ type: 'heart', x: at.x + side() * rr(46, 60), y: at.y + 30, vx: rr(-8, 8), vy: rr(-60, -45), life: 1.4, size: 6, col: '#FF6B5B', delay: 0.35 + i * 0.12 });
    } else if (kind === 'odd') {
      for (let i = 0; i < 3; i++) push({ type: 'q', x: at.x + 52 + i * 15, y: at.y + 26 - (i % 2) * 10, vx: 0, vy: -20, life: 1.7, size: 18 + (i % 2) * 5, delay: i * 0.2 });
    } else if (kind === 'blehh') {
      for (let i = 0; i < 4; i++) { const s = i % 2 ? 1 : -1; push({ type: 'stink', x: at.x + s * (48 + (i > 1 ? 12 : 0)), y: at.y + 34, vx: 0, vy: -32, life: 1.7, size: 16, delay: i * 0.14 }); }
      for (let i = 0; i < 7; i++) push({ type: 'bubble', x: at.x + side() * rr(42, 60), y: at.y + rr(24, 50), vx: rr(-10, 10), vy: rr(-45, -22), life: rr(1, 1.5), size: rr(2.5, 4.5), delay: i * 0.09 });
    }
  }

  /* ---------------- simulation ---------------- */
  update(dt) {
    this.t += dt;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.d);
      tw.obj[tw.key] = tw.from + (tw.to - tw.from) * tw.ease(k);
      if (k >= 1) { this.tweens.splice(i, 1); tw.res(); }
    }
    const anyWok = this.pieces.some(p => p.home === 'wok') || this.pools.length > 0;
    const target = anyWok ? this.heatTarget : 0;
    this.heat += (target - this.heat) * Math.min(1, dt * 3);
    this.flare *= Math.pow(0.05, dt); this.shake *= Math.pow(0.004, dt);
    // spatula: auto (hold button, porthole) or following a finger
    const sp = this.spat;
    if (sp.auto) { sp.ta += dt * 7.5; if (this.t - this.lastToss > 0.6) this.toss(0.85); if (sp.until && this.t > sp.until) { sp.auto = false; sp.until = 0; } }
    let da = sp.ta - sp.a; sp.a += da * Math.min(1, dt * 18);
    const bx = WOK.cx + Math.cos(sp.a) * 40, by = WOK.rimY + 7 + Math.sin(sp.a) * 6;
    if (sp.on && sp.bx != null) {
      const vx = (bx - sp.bx) / Math.max(dt, 0.001), vy = (by - sp.by) / Math.max(dt, 0.001), v = Math.hypot(vx, vy);
      if (v > 30) for (const p of this.pieces) {
        if (p.home !== 'wok' || !p.grounded) continue;
        if (Math.hypot(p.x - bx, p.y - by) < 16) { p.vx = Math.max(-80, Math.min(80, vx * 0.25)); p.vy = -rr(40, 95); p.grounded = false; p.vr += rr(-6, 6); }
      }
    }
    sp.bx = bx; sp.by = by;
    // food
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (p.home === 'mouth') {
        p.tt += dt; p.vy += COOK_G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        p.scale = Math.max(0.2, 1 - (p.tt / p.T) * 0.8);
        if (p.tt >= p.T) this.pieces.splice(i, 1);
        continue;
      }
      if (p.home === 'gone') { p.vy += COOK_G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.alpha -= dt * 2.4; if (p.alpha <= 0) this.pieces.splice(i, 1); continue; }
      if (!p.grounded) {
        p.vy += COOK_G * p.gmul * dt;
        if (p.sway) p.vx += Math.sin(this.t * 7 + p.seed) * 150 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.home === 'wok') {
          const lim = WOK.rx - 12;
          if (Math.abs(p.vx) > 120) p.vx = Math.sign(p.vx) * 120;
          if (p.y > WOK.rimY - 4 && Math.abs(p.x - WOK.cx) > lim) { p.x = WOK.cx + Math.sign(p.x - WOK.cx) * lim; p.vx *= -0.35; }
        } else if (p.home === 'plate') {
          const lim = PLATE.rx - 9;
          if (p.y > PLATE.cy - 14 && Math.abs(p.x - PLATE.cx) > lim) { p.x = PLATE.cx + Math.sign(p.x - PLATE.cx) * lim; p.vx *= -0.3; }
        }
        const fy = this.floorY(p);
        if (p.vy > 0 && p.y >= fy) {
          p.y = fy;
          if (p.vy > 160) {
            p.vy = -p.vy * 0.25; p.vx *= 0.55; p.vr *= 0.5;
            if (p.home === 'wok' && this.heat > 0.3 && Math.random() < 0.3) this.oilBurst(p.x, p.y, 2);
          } else { p.vy = 0; p.grounded = true; }
        }
      } else {
        // resting: slide a little toward the middle; keep a bit of life while it sizzles
        p.vx *= Math.pow(0.02, dt); p.vr *= Math.pow(0.02, dt);
        p.x += p.vx * dt;
        if (p.home === 'wok') { const off = p.x - WOK.cx, lim = 44; if (Math.abs(off) > lim) p.x -= (off - Math.sign(off) * lim) * Math.min(1, dt * 2.5); }
        p.rot += p.vr * dt; p.y = this.floorY(p);
        if (p.home === 'wok' && this.heat > 0.6 && Math.random() < dt * 0.5) { p.vy = -rr(25, 60); p.grounded = false; }
      }
      if (p.home === 'wok' && this.heat > 0.2) p.cooked += (this.cookTarget - p.cooked) * Math.min(1, dt * 1.2);
      if (p.glint) p.glint = Math.max(0, p.glint - dt * 0.7);
    }
    for (const pl of this.pools) pl.t += dt;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]; d.vy += COOK_G * dt; d.y += d.vy * dt; d.stretch = Math.min(0.6, d.vy / 900);
      if (d.y >= WOK.rimY + 4) { this.drops.splice(i, 1); d.res(); }
    }
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i]; s.t += dt; s.vy += COOK_G * 0.8 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
      if (s.t > s.life) this.shells.splice(i, 1);
    }
    for (let i = this.slashes.length - 1; i >= 0; i--) { const s = this.slashes[i]; s.t += dt; if (s.t > 0.26) this.slashes.splice(i, 1); }
    this.sprites = this.sprites.filter(s => !s.dead);
    for (let i = this.streams.length - 1; i >= 0; i--) {
      const st = this.streams[i]; st.t += dt;
      const amt = st.kind === 'soy' ? 0.45 : 0.42;
      this.pieces.forEach(p => { if (p.home === 'wok') { p.glaze = st.col; p.glazeAmt = Math.min(amt, p.glazeAmt + dt * 0.7); } });
      if (Math.random() < dt * 20) this.oil.push({ x: WOK.cx + rr(-14, 14), y: WOK.rimY + 6, vx: rr(-40, 40), vy: rr(-120, -50), t: 0, life: 0.35, s: rr(1, 1.8), col: st.col });
      if (st.t >= st.life) this.streams.splice(i, 1);
    }
    // little oil pops while it sizzles
    if (this.heat > 0.5 && anyWok && Math.random() < dt * 7) this.oil.push({ x: WOK.cx + rr(-40, 40), y: WOK.rimY + rr(2, 10), vx: rr(-25, 25), vy: rr(-140, -70), t: 0, life: rr(0.25, 0.4), s: rr(0.8, 1.4) });
    for (let i = this.oil.length - 1; i >= 0; i--) {
      const o = this.oil[i]; o.t += dt; o.vy += COOK_G * 0.7 * dt; o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.t > o.life) this.oil.splice(i, 1);
    }
    // steam from the wok, then from the plate
    const plateHot = this.plate.on && this.pieces.some(p => p.home === 'plate');
    const rate = (anyWok ? 2.2 * this.heat : 0) + this.flare * 6 + (plateHot ? 1.6 : 0);
    if (!this.reduce && Math.random() < rate * dt) {
      const fromPlate = plateHot && (!anyWok || Math.random() < 0.5);
      this.steam.push({ x: fromPlate ? PLATE.cx + rr(-26, 26) : WOK.cx + rr(-40, 40), y: fromPlate ? PLATE.cy - 12 : WOK.rimY - 2, t: 0, life: rr(1.5, 2.2), len: rr(16, 24), amp: rr(2.5, 4.5), ph: rr(0, 6), vy: rr(-30, -22) });
    }
    for (let i = this.steam.length - 1; i >= 0; i--) {
      const s = this.steam[i]; s.t += dt; s.y += s.vy * dt;
      if (s.t > s.life) this.steam.splice(i, 1);
    }
    for (let i = this.fxs.length - 1; i >= 0; i--) {
      const f = this.fxs[i];
      if (f.delay > 0) { f.delay -= dt; continue; }
      f.t += dt;
      if (f.type === 'grain') { f.vy += COOK_G * 0.55 * dt; if (f.y > WOK.rimY + 6) f.t = f.life; }
      else if (f.type === 'crumb') f.vy += COOK_G * 0.7 * dt;
      else if (f.type === 'star') { f.vx *= Math.pow(0.15, dt); f.vy *= Math.pow(0.15, dt); }
      f.x += f.vx * dt + (f.type === 'heart' ? Math.sin(f.t * 5 + i) * 10 * dt : 0); f.y += f.vy * dt;
      if (f.t >= f.life) this.fxs.splice(i, 1);
    }
  }

  /* ---------------- drawing ---------------- */
  setup(ctx, c) {
    const dpr = c._dpr || 1, w = c._w || c.width / dpr, h = c._h || c.height / dpr, v = this.view;
    let s, ox = 0, oy = 0;
    if (this.mini) { s = Math.max(w / v.w, h / v.h); ox = (w - v.w * s) / 2; oy = (h - v.h * s) / 2; }
    else s = w / v.w;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (ox - v.x * s), dpr * (oy - v.y * s));
  }
  draw() {
    const c = this.cv, ctx = c && c.width ? c.getContext('2d') : null;
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
      this.setup(ctx, c);
      if (this.mini) this.drawBackdrop(ctx);
      this.drawStove(ctx);
      this.drawWok(ctx, 'back');
      this.drawWokFood(ctx);
      this.drawWok(ctx, 'front');
      if (this.spat.on) this.drawSpatula(ctx);
      this.drawPlate(ctx);
      this.drawLoose(ctx);
      this.drawStreams(ctx); this.drawSprites(ctx); this.drawOil(ctx); this.drawFx(ctx, true); this.drawSteam(ctx);
      if (!this.fx) { this.drawMouth(ctx); this.drawFx(ctx, false); }
    }
    const fc = this.fx, f = fc && fc.width ? fc.getContext('2d') : null;
    if (f) {
      f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, fc.width, fc.height);
      this.setup(f, fc); this.drawMouth(f); this.drawFx(f, false);
    }
  }
  drawBackdrop(ctx) {
    const v = this.view, x0 = v.x - 40, y0 = v.y - 40, x1 = v.x + v.w + 40, y1 = v.y + v.h + 40;
    ctx.fillStyle = '#ECE6DA'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = '#EAD3C1'; ctx.fillRect(x0, 196, x1 - x0, 92);
    ctx.strokeStyle = '#DDC2AE'; ctx.lineWidth = 1.1; ctx.beginPath();
    for (let y = 196; y < 288; y += 28) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    for (let x = 0; x < x1; x += 14) { if (x < x0) continue; ctx.moveTo(x, 196); ctx.lineTo(x, 288); }
    ctx.stroke();
    // chimney hood over the wok
    ctx.fillStyle = '#D9D5CF'; ctx.fillRect(254, y0, 24, 80 - y0);
    ctx.fillStyle = '#E2DFD9'; ctx.beginPath(); ctx.moveTo(250, 80); ctx.lineTo(282, 80); ctx.lineTo(318, 128); ctx.lineTo(214, 128); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#CFCAC3'; rrect(ctx, 212, 126, 108, 12, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,222,.9)'; ctx.fillRect(220, 138, 92, 2.4);
    // oak counter, sage cabinets, the oven under the cooktop
    ctx.fillStyle = '#DDB68C'; ctx.fillRect(x0, 284, x1 - x0, 9);
    ctx.fillStyle = '#C99E71'; ctx.fillRect(x0, 292, x1 - x0, 13);
    ctx.fillStyle = '#93A68B'; ctx.fillRect(x0, 305, x1 - x0, y1 - 305);
    ctx.fillStyle = '#F3EFE8'; rrect(ctx, 198, 307, 136, 96, 4); ctx.fill();
    ctx.fillStyle = '#3E3A37'; rrect(ctx, 212, 334, 108, 58, 7); ctx.fill();
  }
  pose(ctx) {
    const sh = this.shake, wob = Math.sin(this.t * 38) * sh;
    const px = WOK.cx, py = WOK.rimY + 20;
    ctx.translate(px + this.wok.dx + wob * 5, py + this.wok.dy - Math.abs(wob) * 4);
    ctx.rotate(this.wok.rot + wob * 0.05);
    ctx.translate(-px, -py);
  }
  drawStove(ctx) {
    const cx = WOK.cx, y = 296, h0 = this.heat * (1 + this.flare * 0.9);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // built-in cooktop panel on the counter
    ctx.fillStyle = '#3F3B38';
    ctx.beginPath(); ctx.moveTo(cx - 66, 292); ctx.lineTo(cx + 66, 292); ctx.lineTo(cx + 70, 304); ctx.lineTo(cx - 70, 304); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2F2C2A'; ctx.fillRect(cx - 70, 302, 140, 2.5);
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 62, 294.4); ctx.lineTo(cx + 62, 294.4); ctx.stroke();
    // knobs
    for (const kx of [cx - 58, cx + 58]) {
      ctx.fillStyle = '#EDE6DC'; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(kx, 299, 3.6, 2.6, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(kx, 298); ctx.lineTo(kx + (this.heat > 0.1 ? 2 : 0), 300); ctx.stroke();
    }
    // burner cap
    ctx.fillStyle = '#2E2624'; ctx.beginPath(); ctx.ellipse(cx, y, 24, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4A4240'; ctx.beginPath(); ctx.ellipse(cx, y - 0.6, 12, 1.6, 0, 0, 7); ctx.fill();
    // flames: blue at the base, warm tips
    if (h0 > 0.03) {
      for (let k = 0; k < 15; k++) {
        const u = k / 14, x = cx - 28 + u * 56, yy = y - 0.5 + Math.sin(u * Math.PI) * 1.2;
        const fl = (6 + 3 * Math.sin(this.t * 23 + k * 1.7) + 2 * Math.sin(this.t * 14 + k)) * h0;
        ctx.fillStyle = 'rgba(247,162,58,.9)'; flamePath(ctx, x, yy, 5.6, fl * 1.25); ctx.fill();
        ctx.fillStyle = 'rgba(126,182,232,.95)'; flamePath(ctx, x, yy, 4.2, fl * 0.62); ctx.fill();
        ctx.fillStyle = 'rgba(255,233,140,.9)'; flamePath(ctx, x, yy - fl * 0.5, 2.2, fl * 0.5); ctx.fill();
      }
      const g = ctx.createRadialGradient(cx, y - 6, 2, cx, y - 6, 48);
      g.addColorStop(0, `rgba(255,170,80,${0.3 * Math.min(1, h0)})`); g.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, y - 6, 48, 16, 0, 0, 7); ctx.fill();
    }
    // cast-iron grate the wok sits on
    ctx.strokeStyle = '#2B2321'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.ellipse(cx, y + 0.5, 40, 4.6, 0, 0.05, Math.PI - 0.05); ctx.stroke();
    for (const [x0, x1] of [[-38, -27], [-15, -11], [15, 11], [38, 27]]) { ctx.beginPath(); ctx.moveTo(cx + x0, y + (Math.abs(x0) > 20 ? 1 : 4.4)); ctx.lineTo(cx + x1, 291.5); ctx.stroke(); }
  }
  drawWok(ctx, part) {
    const { cx, rimY, rx, ry } = WOK;
    ctx.save(); this.pose(ctx);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (part === 'back') {
      // long handle: steel stem, riveted to the wall, then a wooden grip with a hanging ring
      const hx0 = cx + rx - 5, hy0 = rimY + 5, ang = -0.2, ca = Math.cos(ang), sa = Math.sin(ang);
      const P = (u, v) => [hx0 + u * ca - v * sa, hy0 + u * sa + v * ca];
      const poly = (pts, fill, w = 2.2) => { ctx.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK_K; ctx.lineWidth = w; ctx.stroke(); };
      poly([[0, -2.6], [18, -2], [18, 2], [0, 2.8]], '#8F8580');
      poly([[17, -3.6], [22, -3.8], [22, 3.8], [17, 3.6]], '#C8CDCF', 1.8);
      poly([[22, -3.6], [50, -3.2], [53, -1.8], [53, 1.8], [50, 3.2], [22, 3.6]], '#C98E5A');
      ctx.strokeStyle = '#A9703F'; ctx.lineWidth = 1.1;
      for (const v of [-1.2, 1]) { const a = P(25, v), b = P(46, v * 0.8); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      const ring = P(56, 0); ctx.strokeStyle = INK_K; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(ring[0] + 1.5, ring[1], 2.6, 0, 7); ctx.stroke();
      // little loop handle on the left
      ctx.strokeStyle = INK_K; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.arc(cx - rx - 3, rimY + 6, 7.5, Math.PI * 0.62, Math.PI * 1.42); ctx.stroke();
      ctx.strokeStyle = '#8F8580'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx - rx - 3, rimY + 6, 7.5, Math.PI * 0.66, Math.PI * 1.38); ctx.stroke();
      // bowl
      const g = ctx.createLinearGradient(0, rimY, 0, rimY + 46); g.addColorStop(0, '#6A605B'); g.addColorStop(1, '#38302D');
      ctx.fillStyle = g; ctx.strokeStyle = INK_K; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(cx - rx, rimY);
      ctx.bezierCurveTo(cx - rx + 4, rimY + 30, cx - 36, rimY + 46, cx, rimY + 46);
      ctx.bezierCurveTo(cx + 36, rimY + 46, cx + rx - 4, rimY + 30, cx + rx, rimY);
      ctx.ellipse(cx, rimY, rx, ry, 0, 0, Math.PI, false);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // hammered dimples and a soft highlight
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.2;
      for (const [dx, dy] of [[-44, 16], [-30, 26], [-12, 33], [8, 34], [26, 28], [42, 18], [-22, 14], [18, 20], [0, 24]]) { ctx.beginPath(); ctx.arc(cx + dx, rimY + dy, 2.4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - rx + 12, rimY + 18); ctx.quadraticCurveTo(cx - 40, rimY + 38, cx - 16, rimY + 42); ctx.stroke();
      // rivets where the handle meets the wall
      ctx.fillStyle = '#B9B2AD'; ctx.strokeStyle = INK_K; ctx.lineWidth = 1;
      for (const [dx, dy] of [[rx - 9, 9], [rx - 8, 15]]) { ctx.beginPath(); ctx.arc(cx + dx, rimY + dy, 1.5, 0, 7); ctx.fill(); ctx.stroke(); }
      // the opening
      const gi = ctx.createRadialGradient(cx, rimY + 4, 6, cx, rimY, rx);
      gi.addColorStop(0, '#3D3432'); gi.addColorStop(1, '#201A18');
      ctx.fillStyle = gi; ctx.beginPath(); ctx.ellipse(cx, rimY, rx - 2, ry - 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, rimY - 1, rx - 10, ry - 5, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      if (this.heat > 0.05) { ctx.fillStyle = `rgba(255,160,80,${0.1 * this.heat})`; ctx.beginPath(); ctx.ellipse(cx, rimY + 2, rx - 16, ry - 4, 0, 0, Math.PI * 2); ctx.fill(); }
    } else {
      // rolled front lip
      ctx.strokeStyle = INK_K; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(cx, rimY, rx, ry, 0, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#968C87'; ctx.lineWidth = 3.8; ctx.beginPath(); ctx.ellipse(cx, rimY, rx - 1.6, ry - 1, 0, 0.04, Math.PI - 0.04); ctx.stroke();
      ctx.strokeStyle = INK_K; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, rimY + 0.5, rx + 0.5, ry + 0.9, 0, 0.02, Math.PI - 0.02); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, rimY - 0.6, rx - 3, ry - 2, 0, 0.35, 1.25); ctx.stroke();
    }
    ctx.restore();
  }
  drawWokFood(ctx) {
    const list = this.pieces.filter(p => p.home === 'wok');
    if (!list.length && !this.pools.length && !this.drops.length) return;
    const { cx, rimY, rx, ry } = WOK;
    ctx.save(); this.pose(ctx);
    ctx.beginPath(); ctx.ellipse(cx, rimY, rx - 3, ry - 1.4, 0, 0, Math.PI * 2); ctx.rect(cx - 400, rimY - 400, 800, 400); ctx.clip();
    if (list.length) {
      // a glossy bed of oil and sauce under the food
      const gl = list.find(p => p.glazeAmt > 0.05);
      ctx.globalAlpha = 0.6; ctx.fillStyle = gl ? hexMix('#4A3B35', gl.glaze, 0.55) : '#4D3D36';
      ctx.beginPath(); ctx.ellipse(cx, rimY + 4, rx - 16, ry - 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    for (const pl of this.pools) this.drawPool(ctx, pl);
    list.sort((a, b) => a.y - b.y);
    for (const p of list) this.drawPiece(ctx, p);
    for (const d of this.drops) this.drawDrop(ctx, d);
    ctx.restore();
  }
  drawLoose(ctx) {
    const list = this.pieces.filter(p => p.home === 'plate' || p.home === 'gone');
    list.sort((a, b) => a.y - b.y);
    for (const p of list) this.drawPiece(ctx, p);
  }
  drawMouth(ctx) { for (const p of this.pieces) if (p.home === 'mouth') this.drawPiece(ctx, p); }
  drawPool(ctx, pl) {
    const k = Math.min(1, pl.t / 0.12), rx = 24 * (0.6 + 0.4 * k), sq = 0.42;
    ctx.save(); ctx.translate(pl.x, pl.y);
    blob(ctx, rx, pl.sh, 0, 0, sq); ctx.fillStyle = '#FFFDF4'; ctx.fill(); ctx.strokeStyle = FOOD_LINE; ctx.lineWidth = 1; ctx.stroke();
    // lacy brown edge starting to form
    ctx.strokeStyle = `rgba(214,150,70,${0.5 * Math.min(1, pl.t / pl.life)})`; ctx.lineWidth = 2; blob(ctx, rx * 0.92, pl.sh, 0, 0, sq); ctx.stroke();
    ctx.fillStyle = '#FFC93C'; ctx.strokeStyle = FOOD_LINE; ctx.beginPath(); ctx.ellipse(-2, -1.5, 6.2, 4.6, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-4, -3, 1.8, 1.2, 0, 0, 7); ctx.fill();
    // bubbles
    for (let i = 0; i < 5; i++) { const a = i * 1.3 + pl.t * 3, r = rx * 0.75; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * sq, 1 + (i % 2), 0, 7); ctx.fill(); }
    ctx.restore();
  }
  drawDrop(ctx, d) {
    ctx.save(); ctx.translate(d.x, d.y); const st = 1 + d.stretch;
    ctx.fillStyle = '#FFFBEC'; ctx.strokeStyle = FOOD_LINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 9 / st, 7.5 * st, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFC93C'; ctx.beginPath(); ctx.arc(0, 1.5, 4.6, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(-1.4, 0, 1.3, 0, 7); ctx.fill();
    ctx.restore();
  }
  drawPiece(ctx, p) {
    const f = FOOD[p.kind]; if (!f) return;
    const t = p.cooked; let col = hexMix(f.raw, f.cooked, t);
    if (p.glazeAmt > 0 && p.glaze) col = rgbMix(col, p.glaze, p.glazeAmt);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); if (p.scale !== 1) ctx.scale(p.scale, p.scale); ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.lineWidth = 0.9; ctx.strokeStyle = FOOD_LINE; ctx.lineJoin = 'round';
    const s = p.s;
    switch (p.kind) {
      case 'egg':
        blob(ctx, s, p.shape); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
        ctx.globalAlpha *= 0.5 - 0.32 * t; blob(ctx, s * 0.5, p.shape, -s * 0.22, -s * 0.14); ctx.fillStyle = '#FFFBEA'; ctx.fill();
        ctx.globalAlpha = p.alpha;
        if (t > 0.45) { ctx.strokeStyle = `rgba(200,120,40,${Math.min(0.7, (t - 0.45) * 1.3)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, s * 0.78, 0.3, 1.7); ctx.stroke(); }
        break;
      case 'tomato':
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, s, -0.65, 0.65); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.18, 0); ctx.arc(0, 0, s * 0.72, -0.5, 0.5); ctx.closePath(); ctx.fillStyle = hexMix('#FF967D', f.cooked, 0.35 + t * 0.4); ctx.fill();
        ctx.fillStyle = '#FFE3A0'; ctx.beginPath(); ctx.ellipse(s * 0.5, -s * 0.16, 1.1, 0.7, 0.3, 0, 7); ctx.ellipse(s * 0.52, s * 0.18, 1.1, 0.7, -0.3, 0, 7); ctx.fill();
        if (t > 0.3) { ctx.strokeStyle = `rgba(255,255,255,${0.5 * t})`; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(0, 0, s * 0.88, -0.45, -0.08); ctx.stroke(); }
        break;
      case 'rice':
        ctx.strokeStyle = 'rgba(120,90,60,.6)'; ctx.lineWidth = 0.6; ctx.fillStyle = col;
        for (let i = 0; i < p.shape.length; i += 3) {
          ctx.beginPath(); ctx.ellipse(p.shape[i] * 6 - 3, p.shape[i + 1] * 4 - 2, 2.5, 1.4, p.shape[i + 2] * 3, 0, 7); ctx.fill(); ctx.stroke();
        }
        break;
      case 'garlic':
        rrect(ctx, -s / 2, -s / 2, s, s, s * 0.3); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(150,120,90,.7)'; ctx.lineWidth = 0.6; ctx.stroke(); break;
      case 'bokchoy':
        ctx.beginPath(); ctx.ellipse(0, -s * 0.25, s * 0.52, s * 0.8, 0, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
        rrect(ctx, -s * 0.17, s * 0.2, s * 0.34, s * 0.62, s * 0.12); ctx.fillStyle = hexMix('#F1F6E2', '#DDEBB8', t); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, s * 0.3); ctx.lineTo(0, -s * 0.85); ctx.stroke(); break;
      case 'scallion':
        ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, 7); ctx.fillStyle = '#E6F4D8'; ctx.fill(); break;
      case 'chili':
        ctx.beginPath(); ctx.arc(0, 0, s, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, s * 0.55, 0, 7); ctx.fillStyle = '#FFB59A'; ctx.fill();
        ctx.fillStyle = '#FFE7A0'; ctx.beginPath(); ctx.arc(-s * 0.2, 0, 0.8, 0, 7); ctx.arc(s * 0.2, 0.4, 0.8, 0, 7); ctx.fill(); break;
      case 'cheese':
        rrect(ctx, -s / 2, -s * 0.14 - t * 1.2, s * (1 - t * 0.15), s * 0.28 + t * 2.2, 1.6); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); break;
      case 'chocolate':
        if (t < 0.5) { rrect(ctx, -s / 2, -s / 2, s, s, 1.4); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-s / 2 + 1, -s / 2 + 1, s - 2, s * 0.28); }
        else { blob(ctx, s * 0.8, p.shape); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); }
        break;
    }
    if (p.glint > 0) { ctx.globalAlpha = p.glint; ctx.fillStyle = '#FFFFFF'; ctx.translate(s * 0.3, -s * 0.4); starPath(ctx, 2.6); ctx.fill(); }
    ctx.restore();
  }
  drawSpatula(ctx) {
    // a proper wok turner: wide steel blade, thin neck, wooden grip with a hanging hole
    const a = this.spat.a, bx = WOK.cx + Math.cos(a) * 40, by = WOK.rimY + 7 + Math.sin(a) * 6;
    const hx = bx + 30 + Math.cos(a) * 6, hy = by - 62, ang = Math.atan2(hy - by, hx - bx);
    ctx.save(); this.pose(ctx); ctx.translate(bx, by); ctx.rotate(ang);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK_K;
    // neck
    ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(7, 0); ctx.quadraticCurveTo(16, -1.5, 27, 0); ctx.stroke();
    ctx.strokeStyle = '#C8CDCF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(7.5, 0); ctx.quadraticCurveTo(16, -1.5, 26.5, 0); ctx.stroke();
    // ferrule
    ctx.fillStyle = '#C8CDCF'; ctx.strokeStyle = INK_K; ctx.lineWidth = 1.6; rrect(ctx, 26, -3.2, 6, 6.4, 1.4); ctx.fill(); ctx.stroke();
    // wooden grip
    ctx.fillStyle = '#C98E5A'; ctx.lineWidth = 1.8; rrect(ctx, 31.5, -3.6, 38, 7.2, 3.4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#A9703F'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(35, -1); ctx.lineTo(52, -1.2); ctx.moveTo(40, 1.5); ctx.lineTo(60, 1.3); ctx.stroke();
    ctx.fillStyle = '#F3F7EF'; ctx.strokeStyle = INK_K; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(64.5, 0, 1.6, 0, 7); ctx.fill(); ctx.stroke();
    // blade: wide, slightly scooped, with a raised back edge
    ctx.fillStyle = '#E3E8EA'; ctx.strokeStyle = INK_K; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-7, -11); ctx.quadraticCurveTo(-9.5, 0, -7, 11); ctx.lineTo(6, 8.5); ctx.quadraticCurveTo(8.5, 0, 6, -8.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#B9C1C5'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(4, -6.5); ctx.quadraticCurveTo(6, 0, 4, 6.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4.5, -7); ctx.lineTo(-4.8, -1); ctx.stroke();
    ctx.restore();
  }
  drawPlate(ctx) {
    if (!this.plate.on || this.mini) return;
    const k = Math.max(0.01, this.plate.k), { cx, cy, rx, ry } = PLATE;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(110,70,40,.18)'; ctx.beginPath(); ctx.ellipse(3, 6, rx + 2, ry + 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFDF8'; ctx.strokeStyle = '#5B3A2E'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.setLineDash([1, 4.6]); ctx.lineCap = 'round'; ctx.strokeStyle = '#9DBFE3'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(0, -0.5, rx * 0.84, ry * 0.74, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#F4EEE4'; ctx.beginPath(); ctx.ellipse(0, -0.6, rx * 0.68, ry * 0.58, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  drawStreams(ctx) {
    for (const st of this.streams) {
      const m = this.spPoint(st.sp, st.lip[0], st.lip[1]);
      const tx = WOK.cx - 4, ty = WOK.rimY + 6;
      const fade = Math.min(1, st.t / 0.1) * Math.min(1, (st.life - st.t) / 0.15 + 0.15);
      ctx.save(); ctx.globalAlpha = Math.max(0, fade); ctx.strokeStyle = st.col; ctx.lineCap = 'round'; ctx.lineWidth = st.w;
      ctx.beginPath(); ctx.moveTo(m.x, m.y);
      ctx.quadraticCurveTo(m.x + 10 + Math.sin(this.t * 18) * 1.5, m.y + (ty - m.y) * 0.3, tx + Math.sin(this.t * 25) * 1.2, ty); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(0.8, st.w * 0.28); ctx.stroke();
      ctx.restore();
    }
  }
  drawSprites(ctx) {
    for (const s of this.sprites) {
      const img = IMG[s.name]; if (!img || !img.complete || !img.naturalWidth) continue;
      ctx.save(); ctx.globalAlpha = Math.max(0, s.alpha);
      const wob = s.wob ? Math.sin(this.t * 40) * 0.12 : 0;
      ctx.translate(s.x, s.y); ctx.rotate(s.rot + wob); ctx.scale(s.k, s.k);
      ctx.drawImage(img, -s.size / 2, -s.size / 2, s.size, s.size);
      if (s.crack) { ctx.strokeStyle = '#5B3A2E'; ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-10, 1); ctx.lineTo(-5, -3); ctx.lineTo(-1, 2); ctx.lineTo(3, -3); ctx.lineTo(7, 2); ctx.lineTo(10, -1); ctx.stroke(); }
      ctx.restore();
    }
    for (const s of this.shells) {
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - s.t / s.life); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      ctx.fillStyle = '#F6E0C3'; ctx.strokeStyle = '#5B3A2E'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 12, 0, s.side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, s.side < 0 ? Math.PI * 1.5 : Math.PI * 0.5);
      ctx.lineTo(s.side * -1.5, -6); ctx.lineTo(s.side * 2, -2); ctx.lineTo(s.side * -1.5, 2); ctx.lineTo(s.side * 2, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    for (const s of this.slashes) {
      const a = 1 - s.t / 0.26; ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
      ctx.translate(s.x, s.y); ctx.rotate(s.a);
      ctx.strokeStyle = 'rgba(91,58,46,.35)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-28 * (1 - a * 0.3), 0); ctx.lineTo(28, 0); ctx.stroke();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
  }
  drawOil(ctx) {
    for (const o of this.oil) {
      ctx.globalAlpha = Math.max(0, 1 - o.t / o.life); ctx.fillStyle = o.col || '#FFF3C4';
      ctx.beginPath(); ctx.arc(o.x, o.y, o.s, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  drawSteam(ctx) {
    ctx.lineCap = 'round';
    for (const s of this.steam) {
      const k = s.t / s.life, a = Math.sin(Math.PI * k);
      const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([s.x + Math.sin(s.ph + this.t * 2.4 + u * 4) * s.amp * (0.5 + k), s.y - u * s.len * (0.7 + k * 0.6)]); }
      const path = () => {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
        ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      };
      ctx.globalAlpha = a * 0.14; ctx.strokeStyle = '#B98C66'; ctx.lineWidth = 7; path(); ctx.stroke();
      ctx.globalAlpha = a * 0.85; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4.4; path(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  drawFx(ctx, base) {
    for (const f of this.fxs) {
      if (!!f.base !== base || f.delay > 0) continue;
      const k = f.t / f.life, a = Math.max(0, Math.min(1, k < 0.15 ? k / 0.15 : (1 - k) / 0.5));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(f.x, f.y);
      const pop = k < 0.2 ? EASE.back(k / 0.2) : 1;
      if (f.type === 'heart') { ctx.scale(pop, pop); heartPath(ctx, f.size); ctx.fillStyle = f.col; ctx.fill(); ctx.strokeStyle = '#5B3A2E'; ctx.lineWidth = 1; ctx.stroke(); }
      else if (f.type === 'star') { ctx.rotate(f.t * 3); starPath(ctx, f.size); ctx.fillStyle = f.col; ctx.fill(); }
      else if (f.type === 'grain') { ctx.fillStyle = f.col; ctx.strokeStyle = 'rgba(150,120,90,.5)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(0, 0, f.size, 0, 7); ctx.fill(); ctx.stroke(); }
      else if (f.type === 'crumb') { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(0, 0, f.size, 0, 7); ctx.fill(); }
      else if (f.type === 'flame') { ctx.scale(pop, pop); ctx.fillStyle = 'rgba(244,92,58,.95)'; flamePath(ctx, 0, f.size, f.size * 1.1, f.size * 2.2); ctx.fill(); ctx.fillStyle = 'rgba(255,214,110,.95)'; flamePath(ctx, 0, f.size, f.size * 0.55, f.size * 1.3); ctx.fill(); }
      else if (f.type === 'puff') { const r = f.size * (1 + k); ctx.globalAlpha = a * 0.85; ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = 'rgba(185,140,102,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.arc(r * 0.8, r * 0.3, r * 0.7, 0, 7); ctx.fill(); }
      else if (f.type === 'q') { ctx.scale(pop, pop); ctx.font = `700 ${f.size}px Fredoka, Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.fillStyle = '#5B3A2E'; ctx.strokeStyle = '#FFFDF8'; ctx.lineWidth = 4; ctx.strokeText('?', 0, 0); ctx.fillText('?', 0, 0); }
      else if (f.type === 'stink') { ctx.strokeStyle = 'rgba(112,160,72,.9)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 12; i++) { const yy = -i * 1.6, xx = Math.sin(i * 0.9 + f.t * 6) * 3.5; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
      else if (f.type === 'bubble') { ctx.strokeStyle = 'rgba(100,160,72,.9)'; ctx.fillStyle = 'rgba(190,227,180,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, f.size, 0, 7); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
  }
}
