"use strict";
/* ============================================================
   Selfies and the group photo.
   Each phone takes its own selfie (front camera, or a picked photo),
   shares it through the same sync hub as everything else, and then
   draws the same keepsake picture: both selfies, PIP, and the dish.
   ============================================================ */
const PHOTO_PX = 320;
// keep each selfie small (it travels through the free sync servers): lower the quality until it fits
function encodeSmall(c, max = 64000) {
  let q = 0.82, u = c.toDataURL('image/jpeg', q);
  while (u.length > max && q > 0.4) { q -= 0.12; u = c.toDataURL('image/jpeg', q); }
  return u;
}

class SelfieCam {
  constructor() { this.stream = null; }
  static supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  async start(video) {
    this.stop();
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
    this.stream = s;
    video.muted = true; video.setAttribute('playsinline', ''); video.srcObject = s;
    try { await video.play(); } catch (e) { }
    return s;
  }
  stop() { if (this.stream) { this.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) { } }); this.stream = null; } }
  capture(video) {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;
    const side = Math.min(w, h), c = document.createElement('canvas');
    c.width = c.height = PHOTO_PX;
    const x = c.getContext('2d');
    x.translate(PHOTO_PX, 0); x.scale(-1, 1); // mirrored, the way the person saw themselves
    x.drawImage(video, (w - side) / 2, (h - side) / 2, side, side, 0, 0, PHOTO_PX, PHOTO_PX);
    return encodeSmall(c);
  }
}
function fileToSquare(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const side = Math.min(img.width, img.height), c = document.createElement('canvas');
        c.width = c.height = PHOTO_PX;
        // portrait photos: faces usually sit in the upper part, so crop a little above the middle
        const sy = img.height > img.width ? (img.height - side) * 0.3 : (img.height - side) / 2;
        c.getContext('2d').drawImage(img, (img.width - side) / 2, sy, side, side, 0, 0, PHOTO_PX, PHOTO_PX);
        res(encodeSmall(c));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

/* ---------- drawing helpers ---------- */
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function svgImg(svg, w, h) {
  let s = svg.replace(/^<svg /, `<svg xmlns="http://www.w3.org/2000/svg"${w ? ` width="${w}" height="${h}"` : ''} `);
  return loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
}
Art.faceStandalone = function (expr) {
  return Art.face(expr).replace('<svg class="pip-face" viewBox="0 0 200 200" aria-hidden="true">',
    '<svg viewBox="0 0 200 200"><defs><filter id="pipSoft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>');
};
// a drawn stand-in when someone skips the selfie
Art.avatar = function (role) {
  const g = role === 'grandma';
  const hair = g
    ? `<path d="M52 104 q48 -66 96 0 q-8 -26 -48 -30 q-40 4 -48 30z" fill="#DAD7D3" stroke="#3A2A24" stroke-width="4"/><circle cx="100" cy="48" r="17" fill="#DAD7D3" stroke="#3A2A24" stroke-width="4"/>`
    : `<path d="M52 108 q-4 -58 48 -56 q52 -2 48 56 q-14 -30 -48 -28 q-34 -2 -48 28z" fill="#4A3A35" stroke="#3A2A24" stroke-width="4"/>`;
  const glasses = g ? `<g fill="none" stroke="#3A2A24" stroke-width="3.4"><circle cx="82" cy="112" r="11"/><circle cx="118" cy="112" r="11"/><path d="M93 112 h14"/></g>` : '';
  return `<svg viewBox="0 0 200 200"><rect width="200" height="200" fill="${g ? '#FFE3E0' : '#DCEBF7'}"/>` +
    `<circle cx="40" cy="40" r="10" fill="#fff" opacity=".6"/><circle cx="168" cy="54" r="6" fill="#fff" opacity=".6"/>` +
    `<path d="M40 200 q60 -70 120 0z" fill="${g ? '#9DBFE3' : '#F4A6A6'}" stroke="#3A2A24" stroke-width="4"/>` +
    `<circle cx="100" cy="112" r="44" fill="#F8D9BE" stroke="#3A2A24" stroke-width="4"/>${hair}` +
    `<g fill="#3A2A24"><circle cx="82" cy="112" r="4.2"/><circle cx="118" cy="112" r="4.2"/></g>${glasses}` +
    `<path d="M88 130 q12 12 24 0" fill="none" stroke="#3A2A24" stroke-width="4" stroke-linecap="round"/>` +
    `<g fill="#F6A7A6" opacity=".75"><circle cx="70" cy="128" r="7"/><circle cx="130" cy="128" r="7"/></g></svg>`;
};
function roundRect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
async function fontsReady() {
  try { await withTimeout(Promise.all([document.fonts.load('600 60px Fredoka'), document.fonts.load('800 30px Nunito')]), 1500, null); } catch (e) { }
}

/* ---------- the group photo ---------- */
const GroupPhoto = {
  W: 1080, H: 1350,
  async render({ dish, twist, outcome, date, photos }) {
    const W = this.W, H = this.H, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    await fontsReady();
    const ink = '#4B2E24', K = '#3A2A24';
    const disp = "Fredoka, 'Nunito', sans-serif", body = "Nunito, sans-serif";
    // paper + dots
    x.fillStyle = '#FFF4E2'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#F9E2C2';
    for (let yy = 26; yy < H; yy += 52) for (let xx = (yy / 52) % 2 ? 52 : 26; xx < W; xx += 52) { x.beginPath(); x.arc(xx, yy, 4.6, 0, 7); x.fill(); }
    // wooden counter along the bottom: the dish sits on it
    const CT = 1010, CF = 1236;
    x.save(); roundRect(x, 30, 30, W - 60, H - 60, 34); x.clip();
    x.fillStyle = '#EED3AA'; x.fillRect(0, CT, W, CF - CT);
    x.strokeStyle = 'rgba(190,140,90,.35)'; x.lineWidth = 3; x.lineCap = 'round';
    for (let i = 0; i < 7; i++) { const gy = CT + 26 + i * 30; x.beginPath(); x.moveTo(60 + (i * 137) % 260, gy); x.bezierCurveTo(300, gy - 6, 640, gy + 6, W - 60 - (i * 89) % 220, gy); x.stroke(); }
    x.fillStyle = '#D9A86F'; x.fillRect(0, CF, W, H - CF);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, CF + 6, W, 5);
    x.strokeStyle = K; x.lineWidth = 4; x.beginPath(); x.moveTo(0, CT); x.lineTo(W, CT); x.moveTo(0, CF); x.lineTo(W, CF); x.stroke();
    x.restore();
    // bunting
    x.strokeStyle = K; x.lineWidth = 4; x.beginPath(); x.moveTo(40, 64); x.quadraticCurveTo(W / 2, 150, W - 40, 64); x.stroke();
    const flags = ['#F4A6A6', '#FFD28E', '#A9CF9F', '#9DBFE3'];
    for (let i = 0; i < 11; i++) {
      const t = (i + 0.5) / 11, fx = 40 + t * (W - 80), fy = (1 - t) * (1 - t) * 64 + 2 * (1 - t) * t * 150 + t * t * 64;
      x.fillStyle = flags[i % 4]; x.beginPath(); x.moveTo(fx - 30, fy); x.lineTo(fx + 30, fy); x.lineTo(fx, fy + 52); x.closePath(); x.fill(); x.lineWidth = 3.4; x.stroke();
    }
    // title
    x.textAlign = 'center'; x.fillStyle = ink;
    x.font = `600 74px ${disp}`; x.fillText('Cooking with Grandma', W / 2, 238);
    x.font = `800 34px ${body}`; x.fillStyle = '#8A5A44';
    x.fillText(`${dishName(dish)} · ${date}`, W / 2, 290);
    // the two polaroids
    // any picture that fails to load is simply left out, so the photo is always made
    const safe = pr => pr.catch(() => null);
    const imgFor = async role => {
      const p = photos[role];
      if (p && p.data) { try { return await loadImg(p.data); } catch (e) { } }
      return safe(svgImg(Art.avatar(role), 400, 400));
    };
    const [gImg, sImg] = await Promise.all([imgFor('grandma'), imgFor('steven')]);
    const polaroid = (img, cx, cy, rot, label, tape) => {
      x.save(); x.translate(cx, cy); x.rotate(rot);
      x.fillStyle = 'rgba(110,70,40,.18)'; roundRect(x, -182, -205, 380, 450, 16); x.fill();
      x.fillStyle = '#FFFDF8'; x.strokeStyle = K; x.lineWidth = 4; roundRect(x, -190, -215, 380, 450, 16); x.fill(); x.stroke();
      x.save(); roundRect(x, -164, -189, 328, 328, 8); x.clip(); x.fillStyle = '#FCEBD2'; x.fillRect(-164, -189, 328, 328); if (img) x.drawImage(img, -164, -189, 328, 328); x.restore();
      x.strokeStyle = K; x.lineWidth = 3; roundRect(x, -164, -189, 328, 328, 8); x.stroke();
      x.fillStyle = ink; x.font = `600 46px ${disp}`; x.textAlign = 'center'; x.fillText(label, 0, 200);
      x.fillStyle = tape; x.globalAlpha = 0.85; x.rotate(-0.08); x.fillRect(-64, -238, 128, 42); x.globalAlpha = 1;
      x.restore();
    };
    polaroid(gImg, 296, 548, -0.09, 'Grandma', '#F7B9B4');
    polaroid(sImg, 784, 540, 0.08, 'Steven', '#BCD8EE');
    // PIP in front of the photos, sitting on the counter behind the dish
    const face = (REACT[outcome] || REACT.yum).face;
    const [fluff, faceImg, dishImg] = await Promise.all([
      safe(loadImg(Art.fluff())), safe(svgImg(Art.faceStandalone(face === 'blehh' ? 'blehh' : face), 400, 400)),
      safe(svgImg(Art.dish(dish, twist && twist !== 'none' ? twist : null), 600, 420))
    ]);
    const PX = 540, PY = 876, PS = 380;
    const glow = x.createRadialGradient(PX, PY, 60, PX, PY, 250);
    glow.addColorStop(0, 'rgba(255,214,150,.55)'); glow.addColorStop(1, 'rgba(255,214,150,0)');
    x.fillStyle = glow; x.beginPath(); x.arc(PX, PY, 250, 0, 7); x.fill();
    x.save(); x.shadowColor = 'rgba(122,78,40,.28)'; x.shadowBlur = 28; x.shadowOffsetY = 10;
    if (fluff) x.drawImage(fluff, PX - PS / 2, PY - PS / 2, PS, PS); x.restore();
    if (faceImg) x.drawImage(faceImg, PX - PS / 2, PY - PS / 2, PS, PS);
    // the dish on the counter
    x.fillStyle = 'rgba(110,70,40,.18)'; x.beginPath(); x.ellipse(540, 1196, 236, 30, 0, 0, 7); x.fill();
    if (dishImg) x.drawImage(dishImg, 280, 900, 520, 364);
    // hearts and sparkles
    const heartAt = (hx, hy, s, col) => { x.save(); x.translate(hx, hy); x.scale(s, s); x.beginPath(); x.moveTo(0, 4); x.bezierCurveTo(-7, -2, -6, -9, -2.2, -9); x.bezierCurveTo(-0.6, -9, 0, -7.6, 0, -6.6); x.bezierCurveTo(0, -7.6, 0.6, -9, 2.2, -9); x.bezierCurveTo(6, -9, 7, -2, 0, 4); x.closePath(); x.fillStyle = col; x.fill(); x.lineWidth = 0.7; x.strokeStyle = K; x.stroke(); x.restore(); };
    heartAt(156, 900, 4.4, '#F4A6A6'); heartAt(930, 880, 3.8, '#FF8E93'); heartAt(850, 968, 2.6, '#F4A6A6'); heartAt(234, 968, 2.4, '#FF8E93');
    const spark = (sx, sy, s) => { x.save(); x.translate(sx, sy); x.scale(s, s); x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 3 : 10; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fillStyle = '#FFD28E'; x.fill(); x.restore(); };
    spark(92, 352, 3); spark(994, 362, 2.6); spark(546, 318, 2); spark(118, 1118, 2.4); spark(968, 1110, 2.8); spark(330, 1000, 1.7); spark(756, 992, 2);
    // footer on the counter edge, then the frame
    x.fillStyle = '#FFF4E2'; x.font = `800 30px ${body}`; x.textAlign = 'center';
    x.fillText('made together with PIP  ♥', W / 2, 1294);
    x.strokeStyle = '#F2C98C'; x.lineWidth = 12; roundRect(x, 24, 24, W - 48, H - 48, 40); x.stroke();
    return c.toDataURL('image/jpeg', 0.88);
  }
};

/* ---------- keep finished photos on this phone (newest few) ---------- */
const PhotoStore = {
  key: id => 'pip-photo-v1-' + id,
  get(id) { try { return localStorage.getItem(this.key(id)); } catch (e) { return null; } },
  set(id, data) {
    try {
      const idx = lsGet('pip-photo-index', []).filter(k => k !== id);
      idx.unshift(id);
      while (idx.length > 6) { const old = idx.pop(); localStorage.removeItem(this.key(old)); }
      localStorage.setItem(this.key(id), data); lsSet('pip-photo-index', idx);
    } catch (e) { /* storage full: keep it in memory only */ }
  }
};
