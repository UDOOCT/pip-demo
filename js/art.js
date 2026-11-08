"use strict";
/* ============================================================
   PIP art: fluffy body (canvas), faces, ingredients, dishes, scenes
   All original drawings. Style: cozy storybook, rounded shapes,
   warm cocoa outlines, honey + cream + blush palette.
   ============================================================ */
const INK = '#5B3A2E';
const O = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;

function seeded(seed) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/* ---------- PIP body: hand-made fluff on canvas (cached data URL) ----------
   Drawn to match the team's sketch: a soft cream-white puff with a grainy,
   chalky edge, no outline, no legs. */
const Art = {};
Art._fluff = null;
Art.fluff = function () {
  if (Art._fluff) return Art._fluff;
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  if (!x) return '';
  const cx = S / 2, cy = S / 2 + 6, R = 200;
  const rnd = seeded(20261107);
  // soft halo: the puff melts into whatever is behind it
  const halo = x.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.05);
  halo.addColorStop(0, 'rgba(250,244,233,1)');
  halo.addColorStop(0.55, 'rgba(250,244,233,0.55)');
  halo.addColorStop(1, 'rgba(250,244,233,0)');
  x.fillStyle = halo; x.beginPath(); x.arc(cx, cy, R * 1.05, 0, Math.PI * 2); x.fill();
  // body: nearly flat cream, a touch warmer toward the rim
  const g = x.createRadialGradient(cx - 30, cy - 40, 10, cx, cy, R * 0.9);
  g.addColorStop(0, '#FFFEFA');
  g.addColorStop(0.7, '#FDF9F1');
  g.addColorStop(1, '#F9F1E4');
  x.fillStyle = g;
  x.beginPath(); x.arc(cx, cy, R * 0.88, 0, Math.PI * 2); x.fill();
  x.lineCap = 'round';
  // chalky fringe: short soft hairs pointing every which way
  for (let i = 0; i < 7000; i++) {
    const a = rnd() * Math.PI * 2;
    const r0 = R * (0.8 + rnd() * 0.2);
    const len = R * (0.015 + rnd() * rnd() * 0.06);
    const dir = a + (rnd() - 0.5) * 1.8;
    const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0;
    const k = rnd();
    x.strokeStyle = k < 0.7 ? `rgba(255,252,245,${0.35 + rnd() * 0.5})` : `rgba(246,236,220,${0.3 + rnd() * 0.4})`;
    x.lineWidth = 0.7 + rnd() * 1.2;
    x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + Math.cos(dir) * len, y0 + Math.sin(dir) * len); x.stroke();
  }
  // pastel dust that thins out past the edge
  for (let i = 0; i < 9000; i++) {
    const a = rnd() * Math.PI * 2, u = rnd();
    const r = R * (0.86 + u * 0.24);
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    x.fillStyle = rnd() < 0.85 ? `rgba(255,251,243,${(1 - u) * (0.4 + rnd() * 0.5)})` : `rgba(232,214,188,${(1 - u) * 0.35})`;
    const d = 0.8 + rnd() * 1.5;
    x.fillRect(px - d / 2, py - d / 2, d, d);
  }
  // faint paper grain inside
  for (let i = 0; i < 1800; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R * 0.84;
    x.fillStyle = `rgba(236,222,200,${0.05 + rnd() * 0.1})`;
    x.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.2, 1.2);
  }
  // just a whisper of volume
  x.globalCompositeOperation = 'source-atop';
  const sh = x.createRadialGradient(cx + 20, cy + R * 0.95, R * 0.1, cx, cy + R * 0.3, R * 1.1);
  sh.addColorStop(0, 'rgba(226,200,166,0.22)');
  sh.addColorStop(1, 'rgba(226,200,166,0)');
  x.fillStyle = sh; x.fillRect(0, 0, S, S);
  x.globalCompositeOperation = 'source-over';
  try { Art._fluff = c.toDataURL('image/png'); } catch (e) { Art._fluff = ''; }
  return Art._fluff;
};

/* paper grain overlay (tiny tile) */
Art._grain = null;
Art.grain = function () {
  if (Art._grain !== null) return Art._grain;
  try {
    const S = 160, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d'); const img = x.createImageData(S, S); const rnd = seeded(77);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 120 + rnd() * 80;
      img.data[i] = v; img.data[i + 1] = v * 0.9; img.data[i + 2] = v * 0.75; img.data[i + 3] = rnd() < 0.5 ? 10 : 0;
    }
    x.putImageData(img, 0, 0);
    Art._grain = c.toDataURL('image/png');
  } catch (e) { Art._grain = ''; }
  return Art._grain;
};

/* ---------- PIP face (viewBox 200x200, body centre 100,102, radius ~78) ----------
   Tiny upright oval eyes, soft pink cheeks and a bean-shaped smile, as in the sketch. */
const FACE_INK = '#4E3129';
const MOUTH_INK = '#5B3A31';
function eyeOval(cx, cy, s = 1) { return `<ellipse cx="${cx}" cy="${cy}" rx="${2.15 * s}" ry="${5.2 * s}" fill="${FACE_INK}"/>`; }
function arcUp(cx, cy) { return `<path d="M${cx - 5} ${cy + 2} Q${cx} ${cy - 4.6} ${cx + 5} ${cy + 2}" stroke="${FACE_INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`; }
function arcDown(cx, cy) { return `<path d="M${cx - 5} ${cy - 1.5} Q${cx} ${cy + 4} ${cx + 5} ${cy - 1.5}" stroke="${FACE_INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`; }
function heart(cx, cy, s, fill) {
  return `<path transform="translate(${cx} ${cy}) scale(${s})" d="M0 4 C-7 -2 -6 -9 -2.2 -9 C-.6 -9 0 -7.6 0 -6.6 C0 -7.6 .6 -9 2.2 -9 C6 -9 7 -2 0 4Z" fill="${fill}"/>`;
}
const MOUTH_D = `<path d="M88.6 108.6 C95 107.2 105 107.2 111.4 108.6 C110.9 116.4 106 120.4 100 120.4 C94 120.4 89.1 116.4 88.6 108.6Z" fill="${MOUTH_INK}"/>`;
const MOUTH_BIG = `<path d="M86.4 107.4 C95 105.6 105 105.6 113.6 107.4 C113 118.4 107.2 123.4 100 123.4 C92.8 123.4 87 118.4 86.4 107.4Z" fill="${MOUTH_INK}"/><path d="M93.4 119.6 Q100 114.8 106.6 119.6 Q103.6 123 100 123 Q96.4 123 93.4 119.6Z" fill="#EE8E95"/>`;
const SPARK = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2Z" fill="#FFD28E"/>`;

Art.face = function (expr) {
  const L = 79, R = 121, Y = 88;
  let eyes = '', mouth = MOUTH_D, cheeks = 'normal', extra = '';
  switch (expr) {
    case 'happy': eyes = arcUp(L, Y) + arcUp(R, Y); break;
    case 'joy': eyes = arcUp(L, Y) + arcUp(R, Y); mouth = MOUTH_BIG; cheeks = 'big'; extra = SPARK(44, 72, 0.9) + SPARK(156, 64, 0.7); break;
    case 'surprised':
      eyes = `<ellipse cx="${L}" cy="${Y}" rx="3.4" ry="4.2" fill="${FACE_INK}"/><ellipse cx="${R}" cy="${Y}" rx="3.4" ry="4.2" fill="${FACE_INK}"/>`;
      mouth = `<ellipse cx="100" cy="114" rx="5" ry="5.8" fill="${MOUTH_INK}"/>`; break;
    case 'yum':
      eyes = arcDown(L, Y) + arcDown(R, Y);
      mouth = `<path d="M90 110 Q100 119 110 110" stroke="${MOUTH_INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M104.5 113.6 q5 1 5.4 6.2 q-5 2.4 -7.8 -2.4z" fill="#EE8E95" stroke="${MOUTH_INK}" stroke-width="1.2"/>`;
      cheeks = 'big'; break;
    case 'chew':
      eyes = arcDown(L, Y) + arcDown(R, Y);
      mouth = `<path d="M93 113 q3.5 -3 7 0 q3.5 3 7 0" stroke="${MOUTH_INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      cheeks = 'puff'; break;
    case 'blehh':
      eyes = `<path d="M${L - 4.5} ${Y - 4.5} L${L + 3.5} ${Y} L${L - 4.5} ${Y + 4.5}" stroke="${FACE_INK}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${R + 4.5} ${Y - 4.5} L${R - 3.5} ${Y} L${R + 4.5} ${Y + 4.5}" stroke="${FACE_INK}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      mouth = `<path d="M88 110 q3 -4 6 0 q3 4 6 0 q3 -4 6 0 q3 4 6 0" stroke="${MOUTH_INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M96 111 q4 0 8 0 q1 10 -4 11 q-5 -1 -4 -11z" fill="#EE8E95" stroke="${MOUTH_INK}" stroke-width="1.3"/>`;
      cheeks = 'green';
      extra = `<path d="M150 62 q6 9 0 13 q-6 -4 0 -13z" fill="#BFE0F2" stroke="#7FA6C9" stroke-width="1.3"/>`;
      break;
    case 'sleepy':
      eyes = `<path d="M${L - 4.5} ${Y + 1} h9 M${R - 4.5} ${Y + 1} h9" stroke="${FACE_INK}" stroke-width="2.6" stroke-linecap="round"/>`;
      mouth = `<ellipse cx="100" cy="114" rx="3.4" ry="2.8" fill="${MOUTH_INK}"/>`;
      extra = `<text x="142" y="66" font-family="Fredoka, sans-serif" font-size="17" font-weight="600" fill="#B08A6A">z</text><text x="154" y="52" font-family="Fredoka, sans-serif" font-size="12" font-weight="600" fill="#C9A78A">z</text>`;
      break;
    case 'curious':
      eyes = `<g transform="translate(1.5 -1.5)">${eyeOval(L, Y, 1.12)}${eyeOval(R, Y, 1.12)}</g>`;
      mouth = `<path d="M94.5 112 Q100 116.6 105.5 112" stroke="${MOUTH_INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`; break;
    case 'love':
      eyes = heart(L, Y + 2, 0.82, '#E9654F') + heart(R, Y + 2, 0.82, '#E9654F'); mouth = MOUTH_BIG; cheeks = 'big'; break;
    case 'wave':
      eyes = arcUp(L, Y) + eyeOval(R, Y); break;
    default:
      eyes = eyeOval(L, Y) + eyeOval(R, Y);
  }
  const ck = cheeks === 'green' ? '#BFE3B4' : '#F7A9AE';
  const crx = cheeks === 'big' ? 9.4 : cheeks === 'puff' ? 11 : 8;
  const cry = cheeks === 'big' ? 7 : cheeks === 'puff' ? 8.2 : 6.2;
  return `<svg class="pip-face" viewBox="0 0 200 200" aria-hidden="true"><g class="pip-gaze">` +
    `<ellipse class="ck" cx="66" cy="104" rx="${crx}" ry="${cry}" fill="${ck}" opacity=".88" filter="url(#pipSoft)"/>` +
    `<ellipse class="ck" cx="134" cy="104" rx="${crx}" ry="${cry}" fill="${ck}" opacity=".88" filter="url(#pipSoft)"/>` +
    `<g class="pip-eyes">${eyes}</g>${mouth}${extra}</g></svg>`;
};

/* global <defs> used by every PIP face and scene */
Art.defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
  <filter id="pipSoft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="hand" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>
  <linearGradient id="skyWarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE8F4"/><stop offset=".7" stop-color="#FDEBC8"/><stop offset="1" stop-color="#FFE0B0"/></linearGradient>
  <linearGradient id="skyDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FB8E0"/><stop offset=".55" stop-color="#F6C3B4"/><stop offset="1" stop-color="#FFD9A6"/></linearGradient>
  <linearGradient id="wokGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E5552"/><stop offset="1" stop-color="#3E3633"/></linearGradient>
  <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2.2" fill="#F7DDB8"/><circle cx="19" cy="19" r="2.2" fill="#F7DDB8"/></pattern>
  <pattern id="tiles" width="22" height="22" patternUnits="userSpaceOnUse"><rect x="1" y="1" width="20" height="20" rx="5" fill="#E5F0DF"/></pattern>
  <clipPath id="wokMouth"><path d="M8 27 Q70 39 132 27 L132 4 L8 4Z"/></clipPath>
</defs></svg>`;

/* ---------- Ingredients (viewBox 0 0 64 64) ---------- */
function starPts(cx, cy, R, r, n) {
  const p = [];
  for (let k = 0; k < n * 2; k++) {
    const a = -Math.PI / 2 + k * Math.PI / n, rr = k % 2 ? r : R;
    p.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1));
  }
  return p.join(' ');
}
const ICON = {
  egg: `<ellipse cx="32" cy="35" rx="15.5" ry="19.5" fill="#F6E0C3" ${O}/><ellipse cx="25.6" cy="27" rx="3.6" ry="6.6" fill="#fff" opacity=".85" transform="rotate(-18 25.6 27)"/>`,
  tomato: `<path d="M32 20c10.8 0 18.5 7.2 18.5 16.8S42.6 54 32 54 13.5 46.4 13.5 36.8 21.2 20 32 20z" fill="#EE6B55" ${O}/><polygon points="${starPts(32, 21.5, 9.5, 3.6, 5)}" fill="#6FAE5A" ${O}/><path d="M32 16v-5" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="22.5" cy="33" rx="4.2" ry="2.6" fill="#fff" opacity=".5" transform="rotate(-35 22.5 33)"/>`,
  rice: `<path d="M14 33c1.4-9.6 8.8-14.8 18-14.8S48.6 23.4 50 33z" fill="#FFFFFF" ${O}/><g fill="#EDE3D2"><ellipse cx="24" cy="28" rx="1.8" ry="1"/><ellipse cx="31" cy="24.5" rx="1.8" ry="1"/><ellipse cx="38" cy="28.6" rx="1.8" ry="1"/><ellipse cx="29" cy="30" rx="1.8" ry="1"/><ellipse cx="43" cy="31" rx="1.6" ry=".9"/></g><path d="M11.5 33h41c-1 11.8-9.6 18.6-20.5 18.6S12.5 44.8 11.5 33z" fill="#FBF8F2" ${O}/><path d="M15.6 39.6c6 2 26.8 2 32.8 0" stroke="#7FA6D6" stroke-width="2.4" fill="none" stroke-linecap="round"/><rect x="25" y="50.5" width="14" height="4.2" rx="2" fill="#FBF8F2" ${O}/>`,
  garlic: `<path d="M32 12c2.2 6 8.6 9 13.6 13.2 6.2 5.4 6.2 15.4 0 21.4-3.4 3.4-8.2 5.2-13.6 5.2s-10.2-1.8-13.6-5.2c-6.2-6-6.2-16 0-21.4C23.4 21 29.8 18 32 12z" fill="#FBF4E8" ${O}/><path d="M32 22v29.5M23.4 31c-2.4 6-1.8 13 1.6 18.6M40.6 31c2.4 6 1.8 13-1.6 18.6" stroke="#DCC7AC" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M31 12.4c.6-3 1.6-5 3.6-6.8" stroke="#8DB36F" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  bokchoy: `<path d="M23.6 30.6C14 27.6 10.6 15.4 16.8 10.2c5.2-4.2 11.6 1.6 12.6 11z" fill="#7BC067" ${O}/><path d="M40.4 30.6C50 27.6 53.4 15.4 47.2 10.2c-5.2-4.2-11.6 1.6-12.6 11z" fill="#7BC067" ${O}/><path d="M32 31c-6.4-5.4-7.6-15.8-2.2-22 1.2-1.2 3.2-1.2 4.4 0 5.4 6.2 4.2 16.6-2.2 22z" fill="#91CF7A" ${O}/><path d="M25.4 55c-3.6-3-5.2-9.4-5.2-15.6 0-5.2 1.6-8.4 3.2-11.4h17.2c1.6 3 3.2 6.2 3.2 11.4 0 6.2-1.6 12.6-5.2 15.6z" fill="#F2F6E4" ${O}/><path d="M32 34v17M27 35c-1 5-.6 10 1 14M37 35c1 5 .6 10-1 14" stroke="#DCE6C6" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  sugar: `<path d="M13 31l12-6 12 6v14l-12 6-12-6z" fill="#FFFFFF" ${O}/><path d="M13 31l12 6 12-6M25 37v14" fill="none" ${O}/><path d="M33.5 21.5l9-4.5 9 4.5V32l-9 4.5-9-4.5z" fill="#FFFFFF" ${O}/><path d="M33.5 21.5l9 4.5 9-4.5M42.5 26v10.5" fill="none" ${O}/><path d="M48 44l1.6-4 1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6z" fill="#FFD28E"/>`,
  salt: `<path d="M22.5 27h19v21.5a6 6 0 0 1-6 6h-7a6 6 0 0 1-6-6z" fill="#FFFFFF" ${O}/><path d="M23.4 27c0-6.4 3.8-11.4 8.6-11.4S40.6 20.6 40.6 27z" fill="#C9D6E2" ${O}/><g fill="${INK}"><circle cx="28.6" cy="21.6" r="1.3"/><circle cx="32" cy="19.4" r="1.3"/><circle cx="35.4" cy="21.6" r="1.3"/></g><rect x="25.5" y="35" width="13" height="10" rx="3" fill="#BFE0F2"/>`,
  soy: `<path d="M27 13h10v6.5c4.6 3 7.6 7 7.6 12.6v17a6 6 0 0 1-6 6H25.4a6 6 0 0 1-6-6v-17c0-5.6 3-9.6 7.6-12.6z" fill="#6B3B2A" ${O}/><rect x="26" y="7.5" width="12" height="7" rx="2.4" fill="#E9654F" ${O}/><rect x="23.4" y="33" width="17.2" height="13.4" rx="3.4" fill="#FFF3DD" ${O}/><circle cx="32" cy="39.7" r="3.4" fill="#E9654F"/><path d="M24.6 25.5v5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".35"/>`,
  scallion: `<g ${O}><circle cx="22" cy="38" r="8" fill="#9AD27F"/><circle cx="40" cy="30" r="8" fill="#9AD27F"/><circle cx="41" cy="47" r="7" fill="#F2F6E4"/></g><circle cx="22" cy="38" r="3.2" fill="#E8F5DD"/><circle cx="40" cy="30" r="3.2" fill="#E8F5DD"/><circle cx="41" cy="47" r="2.8" fill="#DCE6C6"/>`,
  none: `<circle cx="32" cy="32" r="18" fill="#FFF8EC" ${O}/><path d="M24 33.5l5.5 5.5 11-12" stroke="#5E9B4F" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  chili: `<path d="M19 21c10 1.6 16.4 9.6 18.4 19.6 1.8 9 6 13.2 11 15.2-9 2.2-17.4-1.2-22.4-9.4-3.8-6.4-6-14-7-25.4z" fill="#E9483A" ${O}/><path d="M18.6 21.6c-1.2-4.6.2-8 3.6-10" stroke="#5E9B4F" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M14 22.4c3-3.4 7.6-3.6 10.2-.4" fill="#6FAE5A" ${O}/><path d="M24 27c1.6 5 2 9 3 13" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>`,
  honey: `<path d="M16.5 27h31v19.5a8 8 0 0 1-8 8h-15a8 8 0 0 1-8-8z" fill="#F7B640" ${O}/><rect x="17.5" y="18.5" width="29" height="9.5" rx="4" fill="#F29C7E" ${O}/><path d="M17.5 23.2h29" stroke="#fff" stroke-width="1.6" stroke-dasharray="2.4 2.4" opacity=".7"/><path d="M22.5 28v5.6a2.2 2.2 0 0 0 4.4 0V28" fill="#F7B640" ${O}/><path d="M32 35.5l5 2.9v5.8l-5 2.9-5-2.9v-5.8z" fill="#FFF3DD" stroke="${INK}" stroke-width="2"/>`,
  cheese: `<path d="M9 41L39 21l16 10.6V47H9z" fill="#FFD45C" ${O}/><path d="M9 41L39 21l16 10.6z" fill="#FFE59A" ${O}/><ellipse cx="22" cy="45" rx="3.6" ry="2.4" fill="#EFB63A"/><ellipse cx="38" cy="42" rx="2.6" ry="1.8" fill="#EFB63A"/><ellipse cx="47" cy="44" rx="2.2" ry="1.6" fill="#EFB63A"/><ellipse cx="36" cy="30" rx="3.2" ry="1.4" fill="#F3C64D"/>`,
  chocolate: `<g transform="rotate(-10 32 32)"><rect x="16" y="11" width="32" height="42" rx="4.5" fill="#7A4A35" ${O}/><path d="M16 25h32M16 39h32M32 11v28" stroke="#9A6449" stroke-width="2.4"/><path d="M15 37.5c6-2.6 11 2 17-.4s11-2.8 17 .6V49a4.5 4.5 0 0 1-4.5 4.5h-25A4.5 4.5 0 0 1 15 49z" fill="#F4A6A6" ${O}/></g>`,
  envelope: `<rect x="9" y="17" width="46" height="32" rx="5.5" fill="#FFF8EC" ${O}/><path d="M10.5 19.5L32 36l21.5-16.5" fill="none" ${O}/><path d="M32 41.5c-6.4-4.2-6-9.2-2.6-9.2 1.4 0 2.2.9 2.6 2 .4-1.1 1.2-2 2.6-2 3.4 0 3.8 5-2.6 9.2z" fill="#E9654F" stroke="${INK}" stroke-width="1.6"/>`,
  heart: `<path d="M32 51C14 39.6 13 26 22 22.4c4.6-1.8 8.4.6 10 4 1.6-3.4 5.4-5.8 10-4 9 3.6 8 17.2-10 28.6z" fill="#FF9EA2" ${O}/><ellipse cx="22.6" cy="28.6" rx="3" ry="2" fill="#fff" opacity=".6" transform="rotate(-30 22.6 28.6)"/>`,
  camera: `<rect x="10" y="20" width="44" height="30" rx="7" fill="#FFF8EC" ${O}/><rect x="22" y="14" width="14" height="8" rx="3" fill="#FFD28E" ${O}/><circle cx="32" cy="35" r="9" fill="#BFE0F2" ${O}/><circle cx="29.5" cy="32.5" r="2.4" fill="#fff"/>`,
  // game shelf
  cook: `<path d="M24 17c-2-3 2-5 0-8M32 16c-2-3 2-5 0-8M40 17c-2-3 2-5 0-8" fill="none" stroke="#CDB9A7" stroke-width="2.4" stroke-linecap="round"/><path d="M17 31c2-5 7-6 9-3 2-4 8-4 10 0 3-3 8-1 10 3z" fill="#FFD45E" ${O}/><circle cx="27" cy="27.5" r="3.2" fill="#E9654F" ${O}/><circle cx="38" cy="28" r="2.6" fill="#7DB85B" ${O}/><path d="M8 32h48c-2 11-11 17-24 17S10 43 8 32z" fill="#4A4542" ${O}/><path d="M56 33l7-2" fill="none" stroke="#B88356" stroke-width="5" stroke-linecap="round"/>`,
  garden: `<path d="M32 30V19" fill="none" stroke="#5E8A4A" stroke-width="3" stroke-linecap="round"/><path d="M32 22c-2-8-10-10-16-8 1 7 9 10 16 8z" fill="#8DBF6E" ${O}/><path d="M32 20c2-8 10-10 16-8-1 7-9 10-16 8z" fill="#A6D18A" ${O}/><path d="M19 36h26l-3 18H22z" fill="#D9895A" ${O}/><rect x="16" y="30" width="32" height="8" rx="3" fill="#E9A576" ${O}/>`,
  draw: `<path d="M32 10C18 10 9 20 9 31c0 12 9 21 19 21 4 0 5-3 4-6-1-3 1-6 5-6h7c7 0 11-5 11-11 0-11-11-19-23-19z" fill="#FFF3DF" ${O}/><circle cx="21" cy="25" r="4" fill="#E9654F"/><circle cx="32" cy="19" r="4" fill="#F2B84B"/><circle cx="43" cy="24" r="4" fill="#8FB4D9"/><circle cx="19" cy="37" r="4" fill="#8DBF6E"/>`,
  story: `<path d="M32 18c-6-4-14-5-22-3v32c8-2 16-1 22 3z" fill="#FFF8EC" ${O}/><path d="M32 18c6-4 14-5 22-3v32c-8-2-16-1-22 3z" fill="#FFE6C2" ${O}/><path d="M16 25h10M16 31h10M16 37h7M38 25h10M38 31h10M38 37h7" fill="none" stroke="#C9A98A" stroke-width="2" stroke-linecap="round"/>`,
  sing: `<path d="M18 28c0 9 6 14 14 14s14-5 14-14M32 42v9M25 53h14" fill="none" ${O}/><rect x="24" y="8" width="16" height="27" rx="8" fill="#F4BBB4" ${O}/><path d="M26 17h12M26 23h12" fill="none" stroke="#E29A92" stroke-width="2" stroke-linecap="round"/><circle cx="51" cy="27" r="3.2" fill="${INK}"/><path d="M53.8 27V14l5 2" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  chess: `<ellipse cx="32" cy="39" rx="20" ry="7" fill="#D9B27E" ${O}/><circle cx="32" cy="31" r="20" fill="#F6E1C0" ${O}/><circle cx="32" cy="31" r="14.5" fill="none" stroke="#D9634F" stroke-width="2.2"/><text x="32" y="38" text-anchor="middle" font-size="19" font-weight="700" fill="#D9634F" font-family="'Songti SC','Noto Serif SC',serif">帅</text>`,
  photos: `<rect x="10" y="15" width="34" height="28" rx="3" fill="#FFF8EC" ${O} transform="rotate(-9 27 29)"/><rect x="20" y="22" width="35" height="29" rx="3" fill="#FFFFFF" ${O}/><path d="M24 46l8-9 6 6 4-4 9 7z" fill="#8DBF6E"/><circle cx="45" cy="30" r="3.2" fill="#F2B84B"/>`,
  walk: `<path d="M9 41c0-7 3-13 7-15l8 6 10 2c7 1 15 3 19 8 2 2 1 5-1 5H12c-2 0-3-2-3-6z" fill="#9DC1E6" ${O}/><path d="M9 45h44" fill="none" ${O}/><path d="M25 35l4-3M30 37l4-3" fill="none" stroke="#FFF8EC" stroke-width="2.4" stroke-linecap="round"/>`,
  wave: `<text x="32" y="44" text-anchor="middle" font-size="34">👋</text>`
};
Art.icon = function (name, cls = '') {
  const body = ICON[name] || ICON.none;
  return `<svg class="ing ${cls}" viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
};

/* ---------- Dishes on a plate (viewBox 0 0 120 84) ---------- */
function blobs(list) { return list.join(''); }
const DISH_FOOD = {
  tomato_egg: () => blobs([
    `<path d="M34 46c-3-7 4-13 11-11 4-6 13-6 16 0 7-3 15 2 13 9 6 2 7 10 1 13-2 6-11 8-16 4-5 4-14 3-17-2-8 1-11-8-8-13z" fill="#FFD45C" ${O}/>`,
    `<path d="M44 40c3-3 8-2 9 2 1 4-3 7-7 6s-5-5-2-8z" fill="#EE6B55" ${O}/>`,
    `<path d="M62 47c3-3 9-2 9 2 0 5-6 6-9 4s-2-4 0-6z" fill="#EE6B55" ${O}/>`,
    `<path d="M50 52c2-3 7-3 8 0 1 3-2 6-5 5s-5-3-3-5z" fill="#E45743" ${O}/>`,
    `<path d="M69 37c2-2 6-1 6 2s-4 4-6 2-1-3 0-4z" fill="#EE6B55" ${O}/>`,
    `<g fill="#6FAE5A"><circle cx="40" cy="47" r="1.6"/><circle cx="58" cy="39" r="1.6"/><circle cx="66" cy="55" r="1.6"/><circle cx="76" cy="46" r="1.6"/><circle cx="48" cy="57" r="1.4"/></g>`
  ]),
  fried_rice: () => blobs([
    `<path d="M30 52c0-11 13-19 30-19s30 8 30 19c0 4-13 7-30 7s-30-3-30-7z" fill="#FCEFC8" ${O}/>`,
    `<g fill="#F2E3BE"><ellipse cx="42" cy="46" rx="2" ry="1.1"/><ellipse cx="52" cy="40" rx="2" ry="1.1"/><ellipse cx="66" cy="41" rx="2" ry="1.1"/><ellipse cx="74" cy="48" rx="2" ry="1.1"/><ellipse cx="58" cy="50" rx="2" ry="1.1"/><ellipse cx="47" cy="52" rx="2" ry="1.1"/></g>`,
    `<g stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"><path d="M45 44c1-3 5-3 6 0s-5 4-6 0z" fill="#FFD45C"/><path d="M62 47c1-3 6-3 6 0s-5 4-6 0z" fill="#FFD45C"/><path d="M68 39c1-2 4-2 5 0s-4 3-5 0z" fill="#FFD45C"/></g>`,
    `<g fill="#6FAE5A"><circle cx="55" cy="44" r="1.8"/><circle cx="72" cy="45" r="1.8"/><circle cx="40" cy="50" r="1.6"/><circle cx="63" cy="53" r="1.6"/></g>`,
    `<g fill="#F2994A"><rect x="50" y="48" width="3" height="3" rx="1"/><rect x="77" y="50" width="3" height="3" rx="1"/></g>`
  ]),
  bok_choy: () => blobs([
    `<g ${O}><path d="M34 52c-2-9 6-15 14-12 2 6-4 13-14 12z" fill="#7BC067"/><path d="M86 52c2-9-6-15-14-12-2 6 4 13 14 12z" fill="#7BC067"/><path d="M60 36c8 3 10 13 4 18-6 2-12-8-4-18z" fill="#91CF7A"/><path d="M44 54c4-6 12-7 16-3-3 5-10 7-16 3z" fill="#F2F6E4"/><path d="M76 54c-4-6-12-7-16-3 3 5 10 7 16 3z" fill="#F2F6E4"/></g>`,
    `<g fill="#FBF0DA" stroke="${INK}" stroke-width="1.2"><circle cx="52" cy="44" r="1.8"/><circle cx="68" cy="46" r="1.8"/><circle cx="58" cy="54" r="1.6"/></g>`
  ])
};
const TWIST_ON_PLATE = {
  chili: `<g fill="#E9483A" stroke="${INK}" stroke-width="1.2"><path d="M42 43l6-2 1 2-6 2z"/><path d="M66 51l6-1 0 2-6 1z"/><path d="M58 38l5 2-1 2-5-2z"/></g>`,
  honey: `<path d="M38 44c6 4 12-4 18 0s12-4 18 0 10-2 12 0" stroke="#F7B640" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".95"/>`,
  cheese: `<g stroke="#F2BE3A" stroke-width="3" stroke-linecap="round"><path d="M44 42l7 3"/><path d="M60 39l6 4"/><path d="M68 50l7-2"/><path d="M50 52l6-1"/></g>`,
  chocolate: `<path d="M36 44l6-4 6 4 6-4 6 4 6-4 6 4 6-4" stroke="#6B3B2A" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><g fill="#7A4A35" stroke="${INK}" stroke-width="1.2"><rect x="48" y="48" width="6" height="5" rx="1.4"/><rect x="66" y="45" width="6" height="5" rx="1.4"/></g>`
};
Art.dish = function (dish, twist) {
  const food = (DISH_FOOD[dish] || DISH_FOOD.tomato_egg)();
  const tw = twist && TWIST_ON_PLATE[twist] ? TWIST_ON_PLATE[twist] : '';
  return `<svg class="dish-art" viewBox="0 0 120 84" aria-hidden="true">` +
    `<ellipse cx="60" cy="56" rx="55" ry="24" fill="#E9D6BC" opacity=".55"/>` +
    `<ellipse cx="60" cy="51" rx="54" ry="24" fill="#FFFDF8" ${O}/>` +
    `<ellipse cx="60" cy="50" rx="45" ry="18.5" fill="none" stroke="#9DBFE3" stroke-width="2.2" stroke-dasharray="1 5" stroke-linecap="round"/>` +
    `<ellipse cx="60" cy="50" rx="39" ry="15.5" fill="#F6F0E6"/>` +
    `<g transform="translate(60 46) scale(1.16) translate(-60 -46)">` + food + tw + `</g></svg>`;
};

// faces for the video-call window: flat, no outlines, drawn in each person's own room.
// The mouth, eyes and head carry classes so CSS can make them talk, blink and nod.
Art.callFace = function (role) {
  const g = role === 'grandma';
  const room = g
    ? `<rect width="120" height="160" fill="#F4ECE3"/><rect x="-4" y="6" width="40" height="78" rx="3" fill="#FFF7EC"/><path d="M-4 4h20c-3 26 4 52-4 82h-16z" fill="#EFC5BB"/><rect x="84" y="14" width="26" height="30" rx="2" fill="#C69468"/><rect x="87" y="17" width="20" height="24" fill="#F6ECDF"/><path d="M92 37c1-8 6-13 12-14-1 7-6 12-12 14z" fill="#9FB79C"/>`
    : `<rect width="120" height="160" fill="#EBDDC9"/><rect x="-4" y="10" width="36" height="66" rx="2" fill="#F1D8C2"/><rect x="0" y="40" width="9" height="36" fill="#C9B19C"/><rect x="11" y="30" width="10" height="46" fill="#BCA58F"/><rect x="22" y="46" width="8" height="30" fill="#CBB59F"/><rect x="78" y="34" width="38" height="4" rx="2" fill="#7E5434"/><path d="M95 34c-3-9 2-14 6-16 2 5 1 12-6 16z" fill="#62704A"/><rect x="84" y="24" width="8" height="10" rx="1.5" fill="#D9944A"/>`;
  const body = g
    ? `<path d="M12 164c4-34 24-48 48-48s44 14 48 48z" fill="#9DB59A"/><path d="M48 117l12 18 12-18c-4-2-8-3-12-3s-8 1-12 3z" fill="#FFF8EE"/><circle cx="60" cy="146" r="2.4" fill="#F4EDE4"/><circle cx="60" cy="156" r="2.4" fill="#F4EDE4"/>`
    : `<path d="M12 164c4-34 24-48 48-48s44 14 48 48z" fill="#7FA4C9"/><path d="M44 118c4 8 10 12 16 12s12-4 16-12c-5-2-10-3-16-3s-11 1-16 3z" fill="#6E93B8"/><path d="M53 128v14M67 128v14" stroke="#F4EDE4" stroke-width="2.2" stroke-linecap="round"/>`;
  const hair = g
    ? `<circle cx="60" cy="38" r="11" fill="#D6D2CD"/><path d="M32 76C30 48 44 41 60 41s30 7 28 35c-3-15-13-22-28-22S35 61 32 76z" fill="#DAD6D1"/>`
    : `<path d="M33 72C30 46 45 37 61 37c18 0 28 11 26 34-3-12-11-19-26-18-10 0-18 4-24 11 0-6 2-10 5-14-5 4-8 12-9 22z" fill="#4A3A35"/>`;
  const glasses = g ? `<g fill="none" stroke="#7A5A48" stroke-width="1.8"><circle cx="49" cy="78" r="8"/><circle cx="71" cy="78" r="8"/><path d="M57 78h6"/></g>` : '';
  return `<svg class="call-face" viewBox="0 0 120 160" aria-hidden="true">${room}${body}` +
    `<g class="cf-head"><rect x="52" y="98" width="16" height="22" rx="6" fill="${g ? '#EFC6A6' : '#EDC3A2'}"/>` +
    `<ellipse cx="33" cy="80" rx="4" ry="6" fill="${g ? '#F0C4A3' : '#EBC09F'}"/><ellipse cx="87" cy="80" rx="4" ry="6" fill="${g ? '#F0C4A3' : '#EBC09F'}"/>` +
    `<ellipse cx="60" cy="76" rx="27" ry="31" fill="${g ? '#F6D3B5' : '#F2CDAE'}"/>${hair}` +
    `<g class="cf-eyes" fill="#4B2E24"><ellipse cx="49" cy="79" rx="2.3" ry="2.8"/><ellipse cx="71" cy="79" rx="2.3" ry="2.8"/></g>${glasses}` +
    `<g fill="#F4A8A0" opacity=".6"><ellipse cx="43" cy="90" rx="5" ry="3"/><ellipse cx="77" cy="90" rx="5" ry="3"/></g>` +
    `<path class="cf-mouth" d="M53 93q7 8 14 0q-7 3.5-14 0z" fill="#B5584A"/></g></svg>`;
};
