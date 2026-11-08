"use strict";
/* ============================================================
   Web build boot (GitHub Pages): no Claude account needed.
   ?room=CODE&role=grandma|steven   one phone
   ?room=CODE                     pick a role / share the other link
   ?view=both  (or #both)         both phones on one screen
   (no params)                    start a new kitchen
   ============================================================ */
(function () {
  const root = document.getElementById('root');
  document.body.insertAdjacentHTML('afterbegin', Art.defs);
  const params = new URLSearchParams(location.search);
  const hashRole = (location.hash || '').replace('#', '');
  const L = 'en';
  const t = k => tr(L, k);
  const cleanRoom = s => String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24);
  const newRoom = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; const r = crypto.getRandomValues(new Uint32Array(8)); for (let i = 0; i < 8; i++) s += a[r[i] % a.length]; return s; };
  const baseUrl = location.origin + location.pathname;
  const linkFor = (room, role) => `${baseUrl}?room=${encodeURIComponent(room)}${role ? '&role=' + role : ''}`;
  const go = url => { location.href = url; };
  let brokers = null;
  if (params.get('brokers')) brokers = params.get('brokers').split(',').filter(Boolean); // for local testing only

  function qrSvg(text) {
    try {
      const q = window.qrcode(0, 'M'); q.addData(text); q.make();
      return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: 'QR code' });
    } catch (e) { return ''; }
  }
  async function shareOrCopy(url, btn, label) {
    try {
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) { await navigator.share({ title: 'PIP', text: label, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); btn.querySelector('span').textContent = 'Copied ✓'; }
    catch (e) { window.prompt && window.prompt('Copy this link', url); }
  }

  function landing() {
    root.innerHTML = `<main class="picker">
      <div class="hero-room" aria-hidden="true"><div class="world"><div class="scene-wrap">${Art.home('courtyard', 3)}</div><div class="hero-pip">${pipMarkup('happy')}</div></div></div>
      <h1>PIP</h1><p class="tag">Little moments, together</p>
      <h2>Cook together on two phones</h2>
      <p class="sub">Start a kitchen, then one phone plays Grandma and the other plays Steven. No sign-up.</p>
      <div class="role-cards">
        <button type="button" class="btn primary big" data-go="new"><span>Start a new kitchen</span></button>
      </div>
      <button type="button" class="link-btn" data-go="both">${esc(t('pickBoth'))}</button>
    </main>`;
    root.querySelector('[data-go="new"]').onclick = () => go(linkFor(newRoom()));
    root.querySelector('[data-go="both"]').onclick = () => go(baseUrl + '?view=both');
  }

  function roomPage(room) {
    const card = (role, av, name, sub) => {
      const url = linkFor(room, role);
      return `<section class="room-card">
        <div class="rc-head"><span class="av av-${role}" aria-hidden="true">${av}</span><span><b>${esc(name)}</b><span class="s">${esc(sub)}</span></span></div>
        <div class="rc-qr" aria-label="${esc(name)} QR">${qrSvg(url)}</div>
        <div class="rc-actions">
          <a class="btn primary" href="${esc(url)}"><span>Use this phone</span></a>
          <button type="button" class="btn soft" data-share="${role}"><span>Send link</span></button>
        </div></section>`;
    };
    root.innerHTML = `<main class="picker room">
      <div class="room-top">${miniPip('happy')}<b>PIP</b><span class="room-code">Kitchen <code>${esc(room)}</code></span></div>
      <h2>Each phone picks a person</h2>
      <p class="sub">Tap “Use this phone” here. On the other phone, scan its QR code or open the link you send.</p>
      <div class="room-cards">
        ${card('grandma', 'G', 'Grandma', 'Easy mode, bigger text')}
        ${card('steven', 'S', 'Steven', 'Standard mode')}
      </div>
      <button type="button" class="link-btn" data-go="new">Start a different kitchen</button>
    </main>`;
    root.querySelectorAll('[data-share]').forEach(b => b.addEventListener('click', () => {
      const r = b.dataset.share; shareOrCopy(linkFor(room, r), b, r === 'grandma' ? 'PIP: Grandma’s phone' : 'PIP: Steven’s phone');
    }));
    root.querySelector('[data-go="new"]').onclick = () => go(linkFor(newRoom()));
  }

  function phone(room, role) {
    const wrap = document.createElement('div'); wrap.style.height = '100%'; root.appendChild(wrap);
    const hub = new MqttHub(room, brokers ? { brokers } : {});
    const local = new LocalHub('web-' + room, { mode: 'tabs' });
    const app = new PipApp(wrap, {
      role, sync: new RoleSync(hub, role),
      onSwitch: h => go(h === 'both' ? baseUrl + '?view=both' : linkFor(room)),
      shareUrl: () => linkFor(room, otherRole(role)), room
    });
    hub.start().then(ok => {
      if (ok) return;
      // the sync server is unreachable on this network: keep the demo usable on this device and switch back when it connects
      local.start(); app.attach(new RoleSync(local, role)); app.offlineNote = true; app.update();
      const un = hub.subscribe(() => { if (hub.status === 'live') { un(); app.offlineNote = false; app.attach(new RoleSync(hub, role)); } });
    });
  }

  function split() {
    const hub = new LocalHub('web-split', { mode: 'same-screen' });
    root.innerHTML = `<div class="split">
      <header class="split-head"><h1>${miniPip('happy')}PIP</h1><p>Grandma’s Kitchen</p>
        <button type="button" class="btn soft" data-split="reset">Start over</button>
        <a class="btn soft" href="${esc(window.PIP_HOME_URL || baseUrl)}"${window.PIP_HOME_URL ? ' target="_blank" rel="noopener"' : ''}>Two real phones</a></header>
      <div class="phones">
        <div class="phone-col"><div class="phone-cap"><span class="av av-grandma" aria-hidden="true">G</span>Grandma’s phone (Easy mode)</div><div class="phone-holder"><div class="phone"><div class="phone-screen" data-p="grandma"></div></div></div></div>
        <div class="phone-col"><div class="phone-cap"><span class="av av-steven" aria-hidden="true">S</span>Steven’s phone (Standard mode)</div><div class="phone-holder"><div class="phone"><div class="phone-screen" data-p="steven"></div></div></div></div>
      </div>
      <p class="split-foot">Both phones run on this one screen. For two real phones, tap “Two real phones”, start a kitchen, and open one link on each phone.</p>
    </div>`;
    const apps = ['grandma', 'steven'].map(r => new PipApp(root.querySelector(`[data-p="${r}"]`), { role: r, sync: new RoleSync(hub, r), split: true }));
    const onResize = () => {
      const s = Math.max(0.42, Math.min(1, (window.innerHeight - 200) / 812, (window.innerWidth - 120) / (2 * 390 + 40)));
      root.querySelectorAll('.phone-holder').forEach(h => h.style.setProperty('--s', s.toFixed(3)));
      root.querySelector('.phones').style.setProperty('--gap', Math.round(46 * s) + 'px');
    };
    onResize(); window.addEventListener('resize', onResize);
    root.querySelector('[data-split="reset"]').addEventListener('click', () => {
      for (const r of ROLES) hub.write(r, { v: Math.max(((hub.docs[r] && hub.docs[r].v) || 0) + 1, Date.now()), role: r, at: Date.now() });
      hub.clearMoments();
      apps.forEach(a => { a.local.gScreen = 'home'; a.local.laterSaid = false; a.inviteDismissed = {}; a.update(); });
    });
  }

  const room = cleanRoom(params.get('room'));
  let role = params.get('role') || (hashRole === 'grandma' || hashRole === 'steven' || hashRole === 'emma' ? hashRole : '');
  if (role === 'emma') role = 'steven'; // links shared before the rename
  // embedded copies (for example inside Figma) can ask to open straight into the two-phones view
  if (window.PIP_FORCE_VIEW === 'both' || params.get('view') === 'both' || hashRole === 'both') return split();
  if (room && (role === 'grandma' || role === 'steven')) return phone(room, role);
  if (room) return roomPage(room);
  return landing();
})();
