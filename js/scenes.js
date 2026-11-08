"use strict";
/* ============================================================
   Scenes: Grandma's and Steven's kitchens and living rooms.
   Flat storybook interiors (no outlines): soft tonal shading,
   a muted earthy palette (sage, olive, terracotta, blush, linen,
   warm wood), big-leaf plants, pendant lamps, subway tiles.
   viewBox 0 0 390 420. Kitchens: counter top at y=292, Steven's
   cooktop on x 196-336 (drawn by cook.js). Living rooms: floor
   line at y=292, PIP stands on the rug around x 172.
   The art keeps painting far past the box (wall, floor, ceiling),
   so a narrow or tall stage never shows an edge.
   Moving bits (lamps, steam, dust in the light) live in a second,
   tiny SVG layer so the big static picture never repaints.
   ============================================================ */
(function () {
  const f = n => Math.round(n * 10) / 10;
  const rect = (x, y, w, h, fill, rx = 0, more = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${rx}"` : ''} fill="${fill}"${more}/>`;
  const path = (d, fill, more = '') => `<path d="${d}" fill="${fill}"${more}/>`;
  const ell = (cx, cy, rx, ry, fill, more = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${more}/>`;
  const circ = (cx, cy, r, fill, more = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${more}/>`;
  const line = (d, stroke, w = 1.2, more = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${more}/>`;
  const X0 = -1400, XW = 3190; // paint well past the world box
  let rnd = seeded(1);
  const rr = (a, b) => a + rnd() * (b - a);
  let fx = [];      // animated bits for the overlay layer
  let fxDefs = '';  // gradients used by that layer

  /* ---------- small building blocks ---------- */
  // flat leaf along +x, then rotated; optional midrib in a nearby tone
  function leaf(x, y, len, wid, ang, fill, rib) {
    const d = `M0 0C${f(len * .22)} ${f(-wid)} ${f(len * .68)} ${f(-wid * .95)} ${f(len)} 0C${f(len * .68)} ${f(wid * .95)} ${f(len * .22)} ${f(wid)} 0 0Z`;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})">${path(d, fill)}${rib ? line(`M${f(len * .05)} 0Q${f(len * .5)} ${f(-wid * .12)} ${f(len * .9)} 0`, rib, Math.max(.7, wid * .08)) : ''}</g>`;
  }
  function pot(cx, base, w, h, fill, shade, rim) {
    const t = w / 2, b = w * .38;
    return path(`M${f(cx - t)} ${f(base - h)}H${f(cx + t)}L${f(cx + b)} ${f(base)}H${f(cx - b)}Z`, fill) +
      path(`M${f(cx + t * .3)} ${f(base - h)}H${f(cx + t)}L${f(cx + b)} ${f(base)}H${f(cx + b * .2)}Z`, shade, ' opacity=".5"') +
      rect(cx - t - 2, base - h - 1, w + 4, Math.max(4, h * .2), rim || shade, 2);
  }
  // big-leaf plant: leaves = [angleDeg (-90 = up), stemLen, leafLen, leafWid, colourIndex]
  function bigPlant(x, base, s, o) {
    const ph = (o.potH || 40) * s, top = base - ph;
    let stems = '', leaves = '';
    for (const [a, sl, ll, lw, ci] of o.leaves) {
      const r = a * Math.PI / 180, sx = x + Math.cos(r) * sl * s, sy = top + Math.sin(r) * sl * s;
      stems += line(`M${f(x)} ${f(top + 3)}Q${f(x + Math.cos(r) * sl * s * .25)} ${f(top - sl * s * .55)} ${f(sx)} ${f(sy)}`, o.stem, 2.4 * s);
      leaves += leaf(sx, sy, ll * s, lw * s, a + (o.tilt || 0) * (Math.cos(r) < 0 ? -1 : 1), o.c[ci], o.rib);
    }
    return stems + leaves + pot(x, base, (o.potW || 40) * s, ph, o.pot, o.potS, o.rim);
  }
  // small potted herb / succulent
  function herb(cx, base, kind, potC, potS) {
    let g = '';
    if (kind === 'succulent') {
      for (const [a, l] of [[-90, 13], [-130, 12], [-50, 12], [-160, 10], [-20, 10], [-110, 9], [-70, 9]]) g += leaf(cx, base - 12, l, 4.4, a, a % 20 ? '#8FAA86' : '#7C9874', null);
    } else if (kind === 'cactus') {
      g += rect(cx - 5, base - 34, 10, 26, '#7F9C6E', 5) + rect(cx + 4, base - 26, 8, 5, '#7F9C6E', 2.5) + rect(cx + 9, base - 32, 5, 10, '#7F9C6E', 2.5) + circ(cx, base - 35, 2.6, '#F2A8A0');
    } else if (kind === 'basil') {
      for (const [a, l] of [[-95, 16], [-130, 14], [-60, 14], [-155, 12], [-30, 12], [-112, 11], [-78, 12]]) g += leaf(cx, base - 12, l, 5.6, a, l > 13 ? '#7DA163' : '#93B677', null);
    } else { // chives / grass
      for (let i = -3; i <= 3; i++) g += line(`M${cx + i * 1.6} ${base - 10}q${i * 1.5} -10 ${i * 3} -${18 + (3 - Math.abs(i)) * 3}`, i % 2 ? '#7E9E62' : '#93B377', 2.2);
    }
    return g + pot(cx, base, 20, 13, potC || '#C9825A', potS || '#B06C47');
  }
  function jar(x, base, w, h, lid, label) {
    return rect(x, base - h, w, h, '#F7F2EA', 4) + rect(x + w * .55, base - h + 3, w * .45 - 2, h - 6, '#EDE5D9', 3) +
      rect(x - .5, base - h - 4, w + 1, 6, lid, 2.4) + (label ? rect(x + 3, base - h * .6, w - 6, h * .32, label, 2) : '') +
      rect(x + 3, base - h + 4, 2, h - 9, '#FFFFFF', 1, ' opacity=".8"');
  }
  function mug(x, base, w, h, fill, shade) {
    return line(`M${f(x + w - 1)} ${f(base - h * .72)}c${f(w * .45)} 0 ${f(w * .45)} ${f(h * .5)} 0 ${f(h * .5)}`, shade, 2.4) + rect(x, base - h, w, h, fill, 3) + rect(x + w * .62, base - h, w * .38, h, shade, 3, ' opacity=".35"');
  }
  function book(x, base, w, h, fill, band, tilt = 0) {
    const g = rect(x, base - h, w, h, fill, 1.5) + rect(x, base - h * .78, w, 2.4, band) + rect(x, base - h * .3, w, 2.4, band);
    return tilt ? `<g transform="rotate(${tilt} ${f(x)} ${f(base)})">${g}</g>` : g;
  }
  function shelf(x, y, w, top, front) { return rect(x, y - 3, w, 4, top, 1) + rect(x, y + 1, w, 6, front, 1) + rect(x + 1, y + 7, w - 2, 3, '#000', 1, ' opacity=".06"'); }
  // a soft shadow pooled under furniture
  const pool = (cx, y, rx, ry = 5, a = .14) => ell(cx, y, rx, ry, '#5A3A26', ` opacity="${a}"`);

  /* ---------- window views ---------- */
  function courtyardView(id, x, y, w, h) {
    const roofY = y + h * .62;
    return `<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F9E7D3"/><stop offset="1" stop-color="#F2CDB9"/></linearGradient>` +
      rect(x, y, w, h, `url(#${id}-sky)`) + circ(x + w * .74, y + h * .22, 11, '#FCEEDA') + circ(x + w * .74, y + h * .22, 17, '#FCEEDA', ' opacity=".35"') +
      // far tree, courtyard wall, tiled roof with its curled ends, a red lantern
      ell(x + w * .2, roofY - 8, 22, 20, '#A6B48C') + ell(x + w * .05, roofY - 2, 16, 15, '#93A47C') +
      rect(x, roofY + 8, w, h, '#EBD7C4') + rect(x, roofY + 8, w, 4, '#E0C8B2') +
      path(`M${f(x - 6)} ${f(roofY + 10)}Q${f(x + 8)} ${f(roofY + 2)} ${f(x + 14)} ${f(roofY - 10)}H${f(x + w - 14)}Q${f(x + w - 8)} ${f(roofY + 2)} ${f(x + w + 6)} ${f(roofY + 10)}Z`, '#8F9BA5') +
      line(Array.from({ length: 9 }, (_, i) => `M${f(x + 18 + i * (w - 36) / 8)} ${f(roofY - 8)}v15`).join(''), '#7F8B96', 1.6) +
      rect(x + 12, roofY - 13, w - 24, 4, '#7F8B96', 2) +
      rect(x + w * .3, roofY + 18, w * .4, h, '#D9C1AA', 3) + rect(x + w * .3 + 4, roofY + 22, w * .4 - 8, h, '#C9AD93', 2) +
      line(`M${f(x + w * .82)} ${f(y)}v${f(h * .14)}`, '#7A5A48', 1) + rect(x + w * .82 - 6, y + h * .14, 12, 15, '#D9634F', 5) + rect(x + w * .82 - 5, y + h * .14 + 1.5, 10, 2, '#E9B44C', 1) + rect(x + w * .82 - 5, y + h * .14 + 11.5, 10, 2, '#E9B44C', 1) + line(`M${f(x + w * .82)} ${f(y + h * .14 + 15)}v5`, '#E9B44C', 1.4);
  }
  function cityView(id, x, y, w, h) {
    rnd = seeded(77);
    let b = '';
    const back = [[0, .5, .26], [.22, .38, .2], [.4, .56, .24], [.62, .3, .18], [.78, .48, .26]];
    for (const [bx, bh, bw] of back) b += rect(x + w * bx, y + h * bh, w * bw, h, '#DCC7B4');
    const front = [[-.04, .66, .3, '#C2AC97'], [.24, .52, .22, '#B7A08A'], [.44, .72, .28, '#CBB59F'], [.7, .58, .34, '#BCA58F']];
    for (const [bx, bh, bw, c] of front) {
      b += rect(x + w * bx, y + h * bh, w * bw, h, c);
      for (let wy = y + h * bh + 6; wy < y + h - 4; wy += 9) for (let wx = x + w * bx + 4; wx < x + w * (bx + bw) - 5; wx += 8) if (rnd() < .55) b += rect(wx, wy, 4, 5, rnd() < .5 ? '#F7E1BE' : '#E9D2BA', .8);
    }
    return `<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DFC6"/><stop offset="1" stop-color="#EEC6AF"/></linearGradient>` +
      rect(x, y, w, h, `url(#${id}-sky)`) + circ(x + w * .26, y + h * .26, 12, '#FBE6C6') + circ(x + w * .26, y + h * .26, 19, '#FBE6C6', ' opacity=".35"') +
      b;
  }
  // window with frame, panes, glass glint and a sill; o.view = 'courtyard' | 'city'
  function windowBox(id, x, y, w, h, o) {
    const fw = o.fw || 6, ix = x + fw, iy = y + fw, iw = w - fw * 2, ih = h - fw * 2;
    const view = o.view === 'city' ? cityView(id, ix, iy, iw, ih) : courtyardView(id, ix, iy, iw, ih);
    let panes = '';
    for (let c = 1; c < (o.cols || 2); c++) panes += rect(ix + iw * c / o.cols - 2, iy, 4, ih, o.frame);
    for (let r = 1; r < (o.rows || 2); r++) panes += rect(ix, iy + ih * r / o.rows - 2, iw, 4, o.frame);
    const glint = path(`M${f(ix + iw * .1)} ${f(iy + ih)}L${f(ix + iw * .42)} ${f(iy)}H${f(ix + iw * .52)}L${f(ix + iw * .2)} ${f(iy + ih)}Z`, '#FFFFFF', ' opacity=".14"');
    return `<clipPath id="${id}-clip"><rect x="${f(ix)}" y="${f(iy)}" width="${f(iw)}" height="${f(ih)}"/></clipPath>` +
      rect(x - 2, y - 2, w + 4, h + 6, '#000', o.r || 4, ' opacity=".05"') +
      rect(x, y, w, h, o.frame, o.r || 4) + `<g clip-path="url(#${id}-clip)">${view}${glint}</g>` + panes +
      (o.lattice ? lattice(ix, iy, iw, ih, o.frame) : '') +
      (o.sill !== false ? rect(x - 8, y + h - 1, w + 16, 8, o.sill || o.frame, 2) + rect(x - 6, y + h + 7, w + 12, 3, '#000', 1, ' opacity=".06"') : '');
  }
  // Chinese window-lattice corners (Grandma's touch)
  function lattice(x, y, w, h, c) {
    const k = 13; let d = '';
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]])
      d += `M${f(cx)} ${f(cy + sy * k)}H${f(cx + sx * k * .45)}V${f(cy + sy * k * .45)}H${f(cx + sx * k)}V${f(cy)}`;
    return line(d, c, 2.4);
  }

  /* ---------- the moving layer ---------- */
  function lamp(id, cx, y, w, h, fill, inner, glow) {
    fxDefs += `<radialGradient id="${id}-glow"><stop offset="0" stop-color="${glow}" stop-opacity=".55"/><stop offset=".55" stop-color="${glow}" stop-opacity=".16"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>`;
    fx.push(`<ellipse class="glow" cx="${cx}" cy="${f(y + h + 40)}" rx="${f(w * 1.9)}" ry="${f(w * 1.5)}" fill="url(#${id}-glow)"/>` +
      `<g class="lamp" style="transform-origin:${cx}px ${f(y - 260)}px">` + line(`M${cx} -1400V${y}`, '#55463C', 1.3) + rect(cx - 4.5, y - 5, 9, 7, '#55463C', 2) +
      path(`M${f(cx - w / 2)} ${f(y + h)}C${f(cx - w / 2)} ${f(y + 3)} ${f(cx - w * .22)} ${y} ${cx} ${y}C${f(cx + w * .22)} ${y} ${f(cx + w / 2)} ${f(y + 3)} ${f(cx + w / 2)} ${f(y + h)}Z`, fill) +
      path(`M${f(cx + w * .1)} ${f(y + 3)}C${f(cx + w * .3)} ${f(y + 4)} ${f(cx + w / 2 - 2)} ${f(y + 8)} ${f(cx + w / 2 - 1)} ${f(y + h)}H${f(cx + w * .22)}Z`, '#000', ' opacity=".1"') +
      ell(cx, y + h, w / 2, 3, inner) + circ(cx, y + h + 2.6, 4.6, '#FFF4DA') + `</g>`);
  }
  function globeLamp(id, cx, y, r, glow) {
    fxDefs += `<radialGradient id="${id}-glow"><stop offset="0" stop-color="${glow}" stop-opacity=".5"/><stop offset=".6" stop-color="${glow}" stop-opacity=".12"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>`;
    fx.push(`<ellipse class="glow" cx="${cx}" cy="${f(y + r)}" rx="${f(r * 4)}" ry="${f(r * 3.4)}" fill="url(#${id}-glow)"/>` +
      `<g class="lamp slow" style="transform-origin:${cx}px ${f(y - 240)}px">` + line(`M${cx} -1400V${y - r}`, '#4B443F', 1.2) + rect(cx - 4, y - r - 5, 8, 6, '#B8894F', 2) +
      circ(cx, y, r, '#FFF1D8') + circ(cx, y, r, '#F8DDB0', ' opacity=".5"') + circ(cx - r * .35, y - r * .35, r * .28, '#FFFFFF', ' opacity=".8"') + `</g>`);
  }
  function motes(x, y, w, h, n, seed) {
    const r = seeded(seed);
    for (let i = 0; i < n; i++) fx.push(`<circle class="mote" cx="${f(x + r() * w)}" cy="${f(y + r() * h)}" r="${f(.8 + r() * 1.3)}" fill="#FFF9EE" style="animation-delay:${f(-r() * 9)}s;animation-duration:${f(7 + r() * 5)}s"/>`);
  }
  function steam(x, y, small) {
    fx.push(`<g class="scene-steam" transform="translate(${x} ${y})${small ? ' scale(.6)' : ''}" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"><path class="w1" d="M-10 0c-6-8 6-12 0-21s4-12 1-19"/><path class="w2" d="M2 -2c-6-8 6-12 0-21s4-12 1-19"/><path class="w3" d="M14 0c-6-8 6-12 0-21s4-12 1-19"/></g>`);
  }
  function pack(main) {
    const layer = fx.length ? `<svg class="scene scene-fx" viewBox="0 0 390 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>${fxDefs}</defs>${fx.join('')}</svg>` : '';
    fx = []; fxDefs = '';
    return `<div class="scene-pack">${main}${layer}</div>`;
  }
  const svg = (inner) => `<svg class="scene" viewBox="0 0 390 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${inner}</svg>`;

  /* ---------- kitchen parts ---------- */
  function tilePattern(id, y0, tile, grout, stack) {
    // subway tiles (brick bond), or a vertical stack bond for Steven's modern kitchen
    return stack
      ? `<pattern id="${id}" x="0" y="${y0}" width="14" height="28" patternUnits="userSpaceOnUse"><rect width="14" height="28" fill="${tile}"/><path d="M0 .5H14M.5 0V28" stroke="${grout}" stroke-width="1.1"/></pattern>`
      : `<pattern id="${id}" x="0" y="${y0}" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="${tile}"/><path d="M0 .5H28M0 14.5H28M.5 0V14M14.5 14V28" stroke="${grout}" stroke-width="1.1"/></pattern>`;
  }
  function counter(top, edge, shadow) {
    return rect(X0, 284, XW, 9, top) + rect(X0, 284, XW, 1.6, '#FFFFFF', 0, ' opacity=".45"') + rect(X0, 292, XW, 13, edge) + rect(X0, 305, XW, 4, shadow);
  }
  // lower cabinets: [x, w, 'door'|'drawers'|'oven'] runs; style: Grandma's slatted wood or Steven's sage panels
  function cabinets(runs, st) {
    let g = rect(X0, 305, XW, 104, st.body) + rect(X0, 404, XW, 9, st.kick) + rect(X0, 413, XW, 200, st.floor) + rect(X0, 413, XW, 2, '#000', 0, ' opacity=".08"');
    for (const [x, w, kind] of runs) {
      if (kind === 'oven') continue;
      if (kind === 'drawers') {
        for (let i = 0; i < 3; i++) {
          const y = 311 + i * 31;
          g += rect(x + 5, y, w - 10, 27, st.panel, 4) + rect(x + 5, y + 21, w - 10, 6, st.shade, 3, ' opacity=".35"');
          g += st.bar ? rect(x + w / 2 - 12, y + 9, 24, 3.4, st.knob, 1.7) : circ(x + w / 2, y + 12, 3.4, st.knob) + circ(x + w / 2, y + 12, 1.4, st.knobDot);
        }
      } else {
        g += rect(x + 5, 311, w - 10, 88, st.panel, 5) + rect(x + 5, 391, w - 10, 8, st.shade, 4, ' opacity=".35"');
        if (st.slats) for (let sx = x + 16; sx < x + w - 12; sx += 8) g += rect(sx, 320, 2.2, 70, st.slats, 1.1);
        else g += rect(x + 13, 319, w - 26, 72, st.inset, 3);
        const kx = (runs.indexOf(runs.find(r => r[0] === x)) % 2) ? x + 13 : x + w - 13;
        g += st.bar ? rect(kx - 1.7, 330, 3.4, 24, st.knob, 1.7) : circ(kx, 336, 3.6, st.knob) + circ(kx, 336, 1.5, st.knobDot);
      }
    }
    return g;
  }
  function crock(x, base, c, s) {
    return line(`M${x + 6} ${base - 26}l-5 -22M${x + 11} ${base - 26}l2 -26M${x + 16} ${base - 26}l7 -20`, '#B88356', 2.6) +
      ell(x + 1, base - 49, 3.4, 5.5, '#C9935F', ' transform="rotate(-14 ' + (x + 1) + ' ' + (base - 49) + ')"') + rect(x + 10, base - 56, 6, 8, '#9DB09A', 2) +
      path(`M${x} ${base - 28}h22l-2 28h-18z`, c) + path(`M${x + 13} ${base - 28}h9l-2 28h-7z`, s, ' opacity=".45"') + rect(x - 1, base - 29, 24, 4, s, 2);
  }
  function cuttingBoard(x, y, w, h, c, s) {
    return rect(x, y, w, h, c, 10) + rect(x + w * .58, y, w * .42, h, s, 10, ' opacity=".35"') + circ(x + w / 2, y + 9, 3.4, '#000', ' opacity=".18"');
  }
  function greensBowl(cx, base) {
    let g = '';
    for (const [dx, a, c] of [[-12, -120, '#7FA367'], [-4, -95, '#93B77A'], [6, -70, '#6F9358'], [12, -45, '#93B77A'], [0, -85, '#A7C68D']]) g += leaf(cx + dx * .6, base - 12, 17, 6.5, a, c, null);
    return g + path(`M${cx - 22} ${base - 14}h44q-2 14-22 14t-22-14z`, '#F2E6D6') + path(`M${cx + 4} ${base - 14}h18q-2 13-18 14z`, '#E3D3BF') + rect(cx - 23, base - 16, 46, 3.5, '#E8D8C4', 1.7);
  }

  // fine paper grain shared by every scene: a small noise tile made once on a canvas
  let grainDone = false;
  function grain() {
    if (grainDone || typeof document === 'undefined') return; grainDone = true;
    try {
      const c = document.createElement('canvas'); c.width = c.height = 96;
      const x = c.getContext('2d'), im = x.createImageData(96, 96), r = seeded(9);
      for (let i = 0; i < im.data.length; i += 4) { const v = 120 + r() * 100; im.data[i] = v; im.data[i + 1] = v * .92; im.data[i + 2] = v * .82; im.data[i + 3] = r() < .5 ? r() * 34 : 0; }
      x.putImageData(im, 0, 0);
      document.documentElement.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
    } catch (e) { }
  }

  /* ---------- KITCHENS ---------- */
  Art.kitchen = function (world) {
    grain(); rnd = seeded(4242); fx = []; fxDefs = '';
    return world === 'courtyard' ? grandmaKitchen() : stevenKitchen();
  };

  function grandmaKitchen() {
    const id = 'gk';
    let s = `<defs>${tilePattern(id + '-tile', 196, '#DCE4D3', '#CAD5BF', false)}</defs>`;
    s += rect(X0, -1400, XW, 1700, '#F2DFD4');                      // blush wall
    s += rect(X0, 196, XW, 92, `url(#${id}-tile)`) + rect(X0, 194, XW, 3, '#E8D3C7');
    // window onto the courtyard (lattice corners), herbs on the sill
    s += windowBox(id + '-win', 16, 34, 120, 138, { frame: '#FBF6EF', view: 'courtyard', cols: 2, rows: 2, lattice: true, sill: '#F7EEE4' });
    s += herb(34, 174, 'chives', '#CF8B62', '#B9744F') + herb(118, 174, 'succulent', '#E3B866', '#C99C4D');
    // floating shelves with jars, bowls and cups
    s += jar(150, 114, 18, 26, '#7E9A6B', '#DCE4D3') + jar(172, 114, 16, 20, '#E3B04B', '#F6E3B3') + jar(192, 114, 18, 28, '#D27B57', '#F4D6C7');
    s += herb(222, 114, 'basil', '#F4EDE4', '#E3D7C8');
    s += shelf(144, 114, 92, '#D9A473', '#C68E5D');
    s += path('M150 162h30q-2 9-15 9t-15-9z', '#E7A27C') + path('M152 156h26q-2 8-13 8t-13-8z', '#F3E6D6') + path('M154 151h22q-2 7-11 7t-11-7z', '#9DB09A');
    s += mug(190, 162, 14, 14, '#E9B95A', '#D29E3F') + mug(212, 162, 14, 14, '#9DB09A', '#839A80');
    s += shelf(144, 162, 92, '#D9A473', '#C68E5D');
    // range hood
    s += rect(284, -1400, 32, 1476, '#D5CCC2') + rect(306, -1400, 10, 1476, '#C8BEB3');
    s += path('M268 74h64l22 64h-108z', '#DED6CD') + path('M306 74h26l22 64h-36z', '#CFC6BB') + rect(242, 136, 116, 11, '#CBC2B7', 3) + rect(250, 147, 100, 2.5, '#FFF4DE', 1.2, ' opacity=".9"');
    // counter, Grandma's gas range with a mustard pot and a blue kettle
    s += cuttingBoard(208, 232, 30, 54, '#D7A975', '#BF8F5C');
    s += counter('#F5EDE3', '#E5D5C4', '#D4BFA9');
    s += crock(184, 288, '#E6B886', '#CF9C68');
    s += greensBowl(26, 288);
    s += rect(240, 279, 116, 7, '#ECE6DE', 3) + rect(240, 284, 116, 3, '#D7CFC5', 1.5) + ell(274, 279, 22, 2.6, '#4C4643') + ell(330, 279, 18, 2.4, '#4C4643');
    s += path('M248 250h52v24q0 6-6 6h-40q-6 0-6-6z', '#E7B847') + path('M281 250h19v24q0 6-6 6h-13z', '#D19F33') + rect(244, 245, 60, 7, '#D9A63A', 3.5) + rect(268, 239, 12, 6, '#C99430', 3) + rect(240, 256, 10, 4, '#D19F33', 2) + rect(298, 256, 10, 4, '#D19F33', 2);
    s += path('M314 256q0-14 16-14t16 14v16q0 6-6 6h-20q-6 0-6-6z', '#6E92AE') + path('M332 242q14 0 14 14v16q0 6-6 6h-8z', '#5D7F99') + path('M346 262q10-2 12-12', 'none', ' stroke="#6E92AE" stroke-width="4" stroke-linecap="round"') + line('M320 246q10-16 20 0', '#4D6A82', 2.4) + circ(330, 240, 2.6, '#4D6A82');
    steam(274, 236);
    // retro fridge (shows on wide stages), lower cabinets, floor
    s += cabinets([[-30, 88, 'door'], [58, 88, 'door'], [146, 76, 'drawers'], [222, 78, 'door'], [300, 78, 'door'], [378, 78, 'door'], [456, 78, 'door']],
      { body: '#DDBB92', panel: '#E8CBA4', shade: '#C9A47A', slats: '#DDBE96', knob: '#FFF6EA', knobDot: '#D2AE85', kick: '#B98F67', floor: '#B4875F' });
    s += path('M-128 54q0-16 16-16h96q16 0 16 16v350h-128z', '#CADBD2') + rect(-128, 150, 128, 3, '#B3C8BD') + rect(-40, 74, 10, 54, '#F5F8F6', 5) + rect(-40, 168, 10, 70, '#F5F8F6', 5) + rect(-24, 40, 24, 364, '#B9CDC2', 0, ' opacity=".45"');
    s += herb(-64, 38, 'basil', '#D4895F', '#BC744C');
    s += bigPlant(430, 404, 1.2, { stem: '#6E8357', c: ['#6F8B5E', '#87A270', '#5D7750'], rib: '#9DB487', pot: '#D9A35A', potS: '#C48B43', leaves: [[-95, 70, 52, 16, 0], [-120, 56, 48, 15, 1], [-70, 62, 50, 15, 2], [-140, 40, 42, 13, 0], [-45, 44, 44, 14, 1]] });
    lamp(id, 194, 40, 40, 24, '#6E92AE', '#56778F', '#FFE2B0');
    motes(20, 40, 130, 150, 6, 11);
    return pack(svg(s));
  }

  function stevenKitchen() {
    const id = 'sk';
    let s = `<defs>${tilePattern(id + '-tile', 196, '#EAD3C1', '#DDC2AE', true)}</defs>`;
    s += rect(X0, -1400, XW, 1700, '#ECE6DA');                      // linen wall
    s += rect(X0, 196, XW, 92, `url(#${id}-tile)`) + rect(X0, 194, XW, 3, '#DCCFBF');
    // window onto the city, cactus on the sill
    s += windowBox(id + '-win', 16, 38, 118, 134, { frame: '#5A514B', view: 'city', cols: 2, rows: 2, fw: 5, sill: '#5A514B' });
    s += herb(112, 174, 'cactus', '#D9A35A', '#C08A43');
    // open walnut shelves: mugs, a trailing pothos, spice jars
    s += mug(150, 120, 14, 13, '#9FB197', '#869A80') + mug(169, 120, 14, 13, '#D18A61', '#B9704B');
    s += shelf(144, 120, 64, '#9B6C4C', '#7E5538') + rect(150, 127, 3, 10, '#3F3A36', 1) + rect(198, 127, 3, 10, '#3F3A36', 1);
    s += jar(150, 168, 12, 18, '#3F3A36', '#EAD3C1') + jar(165, 168, 12, 15, '#3F3A36', null) + jar(180, 168, 12, 18, '#3F3A36', '#9FB197');
    s += shelf(144, 168, 64, '#9B6C4C', '#7E5538');
    // trailing pothos at the end of the shelf
    s += line('M200 112q8 26 2 50t6 40', '#6E8B5A', 1.3) + line('M196 113q-4 18 2 34', '#6E8B5A', 1.2);
    rnd = seeded(31);
    for (let i = 0; i < 9; i++) { const vx = 201 + rr(-4, 7), vy = 118 + i * 9.5; s += leaf(vx, vy, 9, 4.2, rr(20, 160), i % 2 ? '#6E8B5A' : '#88A472', null); }
    for (const [a, c] of [[-130, '#88A472'], [-60, '#6E8B5A'], [-95, '#7D9A66'], [-160, '#6E8B5A'], [-20, '#88A472']]) s += leaf(199, 108, 11, 5, a, c, null);
    s += pot(199, 120, 18, 14, '#F3EBDD', '#DCD0BF');
    // chimney hood over the wok
    s += rect(254, -1400, 24, 1482, '#D9D5CF') + rect(270, -1400, 8, 1482, '#C9C4BD');
    s += path('M250 80h32l36 48h-104z', '#E2DFD9') + path('M270 80h12l36 48h-24z', '#D2CEC7') + rect(212, 126, 108, 12, '#CFCAC3', 3) + rect(220, 138, 92, 2.4, '#FFF4DE', 1.2, ' opacity=".9"');
    // counter: oak butcher block; utensils, cutting board and basil
    s += cuttingBoard(340, 230, 32, 58, '#D9AE7E', '#C29462');
    s += counter('#DDB68C', '#C99E71', '#B0855A');
    s += crock(156, 288, '#EFE9DF', '#D8CFC2');
    s += herb(362, 288, 'basil', '#F1ECE4', '#DCD3C6');
    s += cabinets([[-30, 90, 'door'], [60, 70, 'door'], [130, 66, 'drawers'], [196, 140, 'oven'], [336, 74, 'door'], [410, 74, 'door']],
      { body: '#93A68B', panel: '#A2B39A', shade: '#7F9277', inset: '#ABBBA3', bar: true, knob: '#C9A05A', knobDot: '#C9A05A', kick: '#6E8066', floor: '#C8A27A' });
    // built-in oven under the cooktop (the cooktop itself is drawn by the cooking stage)
    s += rect(198, 307, 136, 96, '#F3EFE8', 4) + rect(198, 307, 136, 14, '#E7E1D7', 3) + rect(214, 326, 104, 4, '#CFC8BE', 2);
    for (const kx of [212, 226, 306, 320]) s += circ(kx, 314, 3.2, '#4A4542');
    s += rect(212, 334, 108, 58, '#3E3A37', 7) + path('M226 334h18l-22 58h-10z', '#FFFFFF', ' opacity=".08"') + rect(216, 338, 100, 50, '#000', 5, ' opacity=".12"');
    s += bigPlant(-40, 404, 1.25, { stem: '#55613F', c: ['#4F5A3C', '#62704A', '#7A8A5C'], rib: '#8A9A6A', pot: '#D49A55', potS: '#B97F3D', leaves: [[-96, 78, 56, 15, 0], [-118, 60, 50, 14, 1], [-72, 66, 52, 14, 2], [-140, 44, 44, 13, 0], [-50, 48, 46, 13, 1], [-108, 96, 40, 12, 2]] });
    globeLamp(id, 172, 46, 13, '#FFE4B5');
    motes(20, 44, 120, 140, 5, 21);
    return pack(svg(s));
  }

  /* ---------- LIVING ROOMS ---------- */
  // flower pots on the sill: one for every memory made together
  function memoryPots(x0, base, n, gap) {
    const petals = ['#E9654F', '#F2B84B', '#F2A6B0', '#8FB4D9', '#C3A2D9'];
    let g = '';
    for (let i = 0; i < n; i++) {
      const px = x0 + i * gap, c = petals[i % petals.length];
      g += `<g class="pot">` + line(`M${px} ${base - 10}v-12`, '#6F9358', 2) + leaf(px, base - 15, 8, 3, -150, '#7FA367', null) + leaf(px, base - 13, 7, 2.8, -30, '#93B77A', null);
      for (let k = 0; k < 5; k++) { const a = k * 72 * Math.PI / 180; g += circ(px + Math.cos(a) * 3.6, base - 25 + Math.sin(a) * 3.6, 3, c); }
      g += circ(px, base - 25, 2.2, '#FFF3DD') + pot(px, base, 14, 10, '#CF8B62', '#B9744F') + `</g>`;
    }
    return g;
  }
  function floorBoards(c1, c2, seam) {
    let d = '', g = rect(X0, 292, XW, 400, c1);
    for (let y = 292, r = 0; y < 460; y += 16, r++) {
      if (r % 2) g += rect(X0, y, XW, 16, c2);
      for (let x = -400 + (r % 3) * 41; x < 800; x += 124) d += `M${x} ${y}v16`;
      d += `M${X0} ${y}H1790`;
    }
    return g + `<path d="${d}" stroke="${seam}" stroke-width="1.1" fill="none"/>`;
  }
  function sofa(x, y, w, c) {
    // y = top of the backrest; seat around y+44; floor at y+90
    return pool(x + w / 2, y + 92, w * .52, 6, .16) +
      rect(x + 10, y, w - 20, 58, c.back, 22) + rect(x + w * .55, y, w * .45 - 10, 58, c.shade, 22, ' opacity=".35"') +
      rect(x + 18, y + 40, w - 36, 32, c.seat, 10) + rect(x + 18, y + 62, w - 36, 10, c.shade, 6, ' opacity=".4"') +
      rect(x, y + 26, 30, 58, c.arm, 14) + rect(x + w - 30, y + 26, 30, 58, c.arm, 14) + rect(x + w - 14, y + 26, 14, 58, c.shade, 7, ' opacity=".35"') +
      rect(x + 4, y + 70, w - 8, 18, c.base, 8) +
      rect(x + 14, y + 86, 6, 10, c.leg, 2) + rect(x + w - 20, y + 86, 6, 10, c.leg, 2);
  }
  const cushion = (cx, cy, w, h, fill, rot, shade) => `<g transform="rotate(${rot} ${cx} ${cy})">${rect(cx - w / 2, cy - h / 2, w, h, fill, 9)}${rect(cx - w / 2, cy + h * .1, w, h * .4, shade, 9, ' opacity=".35"')}</g>`;
  function frame(x, y, w, h, wood, mat, art) { return rect(x - 1.5, y + 1.5, w + 3, h + 3, '#000', 3, ' opacity=".07"') + rect(x, y, w, h, wood, 2) + rect(x + 5, y + 5, w - 10, h - 10, mat, 1) + art; }

  Art.home = function (world, pots) {
    grain(); rnd = seeded(5151); fx = []; fxDefs = '';
    const n = Math.min(pots || 0, 5);
    return world === 'courtyard' ? grandmaRoom(n) : stevenRoom(n);
  };

  function grandmaRoom(n) {
    const id = 'gr';
    let s = rect(X0, -1400, XW, 1700, '#F4ECE3');                     // warm off-white wall
    s += floorBoards('#DCC3A5', '#D6BB9C', '#CBAE8D') + rect(X0, 284, XW, 9, '#EFE4D7') + rect(X0, 292, XW, 2, '#000', 0, ' opacity=".05"');
    // light from the window, on the floor
    s += path('M62 296H170L214 344H100Z', '#FFFFFF', ' opacity=".2"');
    // window with blush curtains, memory flowers on the sill
    s += windowBox(id + '-win', 50, 44, 112, 158, { frame: '#FFFAF4', view: 'courtyard', cols: 2, rows: 3, lattice: true, sill: '#FBF3EA' });
    s += memoryPots(70, 203, n, 18);
    s += rect(24, 32, 164, 4, '#C9A57A', 2) + circ(24, 34, 4.4, '#B98F60') + circ(188, 34, 4.4, '#B98F60');
    const curtain = (x, flip) => {
      const k = flip ? -1 : 1, tie = 128;
      return path(`M${x} 36h${k * 34}c${-k * 4} 34 ${-k * 18} 64 ${-k * 10} ${tie - 36}c${k * 6} 30 ${k * 14} 70 ${k * 10} 108h${-k * 34}z`, '#EFC5BB') +
        line(`M${x + k * 9} 38c${k * 2} 30 ${k * 6} 58 ${k * 10} 90M${x + k * 19} 38c${-k} 30 ${-k * 4} 60 ${-k} 90M${x + k * 10} ${tie + 6}c${k * 3} 34 ${k * 6} 64 ${k * 4} 100`, '#E5B1A6', 2) +
        rect(x + k * 2 - (flip ? 24 : 0), tie - 4, 24, 8, '#F3D9A4', 4);
    };
    s += curtain(26, false) + curtain(186, true);
    // pictures: a leaf print and the family photo
    s += frame(244, 80, 54, 72, '#C69468', '#F6ECDF', leaf(258, 136, 34, 9, -64, '#9FB79C', '#87A284') + leaf(270, 140, 26, 7, -110, '#B7CBB4', null));
    s += frame(314, 98, 50, 42, '#E6C79F', '#F9E6DA', circ(330, 120, 6.5, '#F2D6C2') + path('M322 117q8-12 16 0', '#B9B2AE') + circ(330, 109, 3.6, '#B9B2AE') + circ(348, 121, 6, '#F2D6C2') + path('M341 118q7-10 14 0', '#5A4038') + rect(320, 128, 38, 8, '#C3D4BE', 3));
    // sage sofa with cushions
    s += sofa(206, 212, 190, { back: '#A9BDA5', seat: '#B5C8B1', arm: '#9FB49B', shade: '#879E84', base: '#93AA90', leg: '#B88B60' });
    s += cushion(254, 238, 40, 34, '#F2C3BE', -8, '#E2A9A2') + cushion(300, 236, 40, 34, '#F4D6AF', 3, '#E3BE90') + cushion(346, 240, 36, 32, '#CAD9C6', 9, '#B0C3AB');
    // tall plant by the window, a plant on a stand past the sofa
    s += bigPlant(4, 300, 1.25, { stem: '#6E8B6C', c: ['#8FAE8C', '#6F8F6E', '#A5C1A0'], rib: '#B4CBB0', pot: '#C77B52', potS: '#AC6643', leaves: [[-92, 74, 54, 17, 0], [-116, 58, 50, 16, 1], [-66, 62, 50, 16, 2], [-138, 38, 42, 14, 0], [-44, 40, 44, 14, 1], [-104, 98, 38, 12, 2]] });
    s += rect(412, 262, 34, 6, '#C69468', 2) + rect(416, 268, 4, 30, '#B07E55', 1) + rect(438, 268, 4, 30, '#B07E55', 1) + herb(429, 262, 'basil', '#E6C79F', '#D1AE84');
    // pink rug, knitting basket
    s += path('M48 322H304L340 398H10Z', '#F2CBC3') + path('M58 328H296L326 392H24Z', 'none', ' stroke="#E4B0A7" stroke-width="2"') + path('M70 334H288L314 386H40Z', 'none', ' stroke="#F7DCD5" stroke-width="1.5"');
    s += pool(356, 352, 30, 4, .12) + path('M330 322h52l-5 30h-42z', '#D9B07C') + line('M333 330h46M332 338h46M334 346h42', '#C49A68', 1.6) + circ(346, 318, 9, '#F2A6B0') + circ(363, 320, 8, '#9DB59A') + line('M341 314l24-14M352 312l20-8', '#B88B60', 1.6);
    motes(56, 50, 110, 220, 7, 41);
    return pack(svg(s));
  }

  function stevenRoom(n) {
    const id = 'sr';
    let s = rect(X0, -1400, XW, 1700, '#EBDDC9');                     // warm beige wall
    // ceiling with dark beams (shows on tall phones)
    s += rect(X0, -1400, XW, 1390, '#E2D0B7') + rect(X0, -14, XW, 14, '#7C5638') + rect(X0, -16, XW, 3, '#5F412A');
    for (let x = -399; x < 800; x += 84) { const t = (x - 195) * .7; s += path(`M${x - 6} -14h12l${f(t * .9 + 11)} -150h${f(-34)}z`, '#7C5638') + path(`M${x + 2} -14h4l${f(t * .9 + 11)} -150h-12z`, '#000', ' opacity=".12"'); }
    s += floorBoards('#E2CFB3', '#DCC7A9', '#D1BA99') + rect(X0, 284, XW, 9, '#F1E6D6') + rect(X0, 292, XW, 2, '#000', 0, ' opacity=".05"');
    s += path('M40 296H134L172 336H74Z', '#FFFFFF', ' opacity=".2"');
    // window onto the city, memory flowers on the sill
    s += windowBox(id + '-win', 22, 56, 108, 140, { frame: '#F8F2E9', view: 'city', cols: 2, rows: 2, sill: '#F3EADF' });
    s += memoryPots(38, 198, n, 18);
    // wall art, beige sofa, olive armchair, side table with books
    s += frame(260, 88, 70, 58, '#7C5638', '#F3E8D6', circ(282, 112, 11, '#D9944A') + path('M290 136q8-24 26-18q-4 16-26 18z', '#62704A') + rect(272, 128, 30, 4, '#C9A87A', 2));
    s += sofa(206, 214, 190, { back: '#D9BE93', seat: '#E3CBA4', arm: '#D2B585', shade: '#BE9F72', base: '#C9AB7D', leg: '#6B4429' });
    s += cushion(352, 240, 38, 32, '#F3E7D1', 9, '#DCCBAE') + cushion(252, 240, 36, 30, '#6F7A4E', -8, '#5A643E');
    s += pool(22, 324, 50, 6, .16) + rect(-36, 238, 90, 62, '#4F5A3C', 26) + rect(-28, 276, 76, 26, '#5E6A46', 10) + rect(-44, 262, 22, 44, '#46512F', 11) + rect(44, 262, 22, 44, '#46512F', 11) + rect(-24, 300, 5, 18, '#5B3B26', 2) + rect(38, 300, 5, 18, '#5B3B26', 2);
    s += pool(88, 302, 26, 4, .14) + rect(64, 238, 48, 6, '#7E5434', 2) + rect(68, 244, 4, 56, '#6B4429', 1.5) + rect(104, 244, 4, 56, '#6B4429', 1.5) + rect(68, 270, 40, 3, '#6B4429', 1.5);
    s += book(70, 238, 34, 7, '#4F5A3C', '#46512F') + book(72, 231, 30, 7, '#EFE3CB', '#DCCBAE') + book(68, 224, 34, 7, '#C98E4A', '#B07A3A') + herb(96, 224, 'succulent', '#D49A55', '#B97F3D');
    // round dark-wood coffee table with a little plant
    s += pool(306, 352, 46, 5, .16) + rect(286, 322, 5, 28, '#5B3B26', 2) + rect(322, 322, 5, 28, '#5B3B26', 2) + ell(306, 320, 46, 9, '#6B4429') + ell(306, 317, 46, 9, '#7E5434') + herb(306, 317, 'basil', '#D49A55', '#B97F3D');
    // big strelitzia behind the armchair, another plant past the sofa
    s += bigPlant(-56, 300, 1.4, { stem: '#55613F', c: ['#4F5A3C', '#62704A', '#7A8A5C'], rib: '#8A9A6A', pot: '#D49A55', potS: '#B97F3D', tilt: 6, leaves: [[-88, 84, 60, 17, 0], [-112, 66, 54, 16, 1], [-64, 70, 56, 16, 2], [-134, 46, 46, 14, 0], [-40, 50, 48, 14, 1], [-98, 108, 42, 13, 2]] });
    s += bigPlant(430, 300, 1.1, { stem: '#55613F', c: ['#62704A', '#4F5A3C', '#7A8A5C'], rib: '#8A9A6A', pot: '#C8834F', potS: '#AE6C3C', leaves: [[-92, 70, 50, 15, 0], [-120, 54, 46, 14, 1], [-64, 58, 46, 14, 2], [-142, 36, 40, 12, 0]] });
    // cream rug with a dotted border
    s += path('M54 324H318L352 400H16Z', '#EFE2CC') + path('M64 330H310L338 394H30Z', 'none', ' stroke="#E2D0B4" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"');
    lamp(id, 172, 46, 46, 28, '#D9944A', '#BF7B35', '#FFD9A0');
    motes(30, 60, 110, 230, 6, 51);
    return pack(svg(s));
  }
})();
