(function () {
  const vscode = acquireVsCodeApi();
  const root = document.documentElement;
  const app = document.getElementById('app');

  let sessions = [];
  let config = { layout: 'cards', density: 'comfortable', purrMode: true, vibration: 'subtle' };

  const STATES = {
    working:            { label: 'Trabajando',      emoji: '🟢', order: 2 },
    waiting_input:      { label: 'Espera tu input', emoji: '🟠', order: 0 },
    waiting_permission: { label: 'Posible permiso', emoji: '⏸', order: 1 },
    idle:               { label: 'Ociosa / lista',  emoji: '⚪', order: 3 },
  };
  const isAttention = (s) => s.status === 'waiting_input' || s.status === 'waiting_permission';

  function fmt(ms) {
    const sec = Math.max(0, Math.floor(ms / 1000));
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.floor(sec / 60) + 'm';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h';
    return Math.floor(sec / 86400) + 'd';
  }

  // ===================== PURR MODE — gato pixel-art =====================
  const CAT = [
    "................", ".....O....O.....", "....OPO..OPO....", "...OBBBBBBBBO...",
    "...OBBBBBBBBO...", "...OBBBBBBBBO...", "...OBBBPPBBBO...", "...OBBBBBBBBO...",
    "....OBBBBBBO....", "....OBLLLLBO....", "....OBLLLLBO....", "....OBLLLLBO....",
    "....OBBBBBBO....", "....OOBBBBOO....", ".....OO..OO.....", "................",
  ];
  const CAT_LYING = [
    "................", "................", "................", "................",
    "................", "...O.....O......", "..OPO...OPO.....", ".OBBBBBBBBBBO...",
    "OBBBBBBBBBBBBBO.", "OBEBBEBBBBBBBBO.", "OBBPBBBBBBBBBBO.", "OBLLLBBBBBBBBBO.",
    "OBBBBBBBBBBBBBO.", ".OOOOOOOOOOOOO..", "................", "................",
  ];
  function hashHue(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h % 360; }
  function drawGrid(P, grid, col, EYE) {
    for (let y = 0; y < 16; y++) { const row = grid[y]; for (let x = 0; x < 16; x++) { const t = row[x]; if (t === 'E') P(x, y, 1, 1, EYE); else if (col[t]) P(x, y, 1, 1, col[t]); } }
  }
  function drawTail(P, phase, B, O) {
    if (phase === 1) { [[12,11],[13,11],[14,10],[14,9]].forEach(([x,y]) => P(x,y,1,1,B)); [[15,9],[15,10],[14,8]].forEach(([x,y]) => P(x,y,1,1,O)); }
    else { [[12,11],[13,10],[13,9],[13,8]].forEach(([x,y]) => P(x,y,1,1,B)); [[14,8],[14,9],[14,10],[13,7]].forEach(([x,y]) => P(x,y,1,1,O)); }
  }
  function drawGlasses(P) {
    const F = '#23262e';
    [[4,4],[5,4],[6,4],[4,5],[6,5],[4,6],[5,6],[6,6],[9,4],[10,4],[11,4],[9,5],[11,5],[9,6],[10,6],[11,6]].forEach(([x,y]) => P(x,y,1,1,F));
    P(7,4,2,1,F); P(5,5,1,1,'#bfe9ff'); P(10,5,1,1,'#bfe9ff');
  }
  function drawLaptop(P, f) {
    const SCR = '#2f3744', TOP = '#6f86b3', BASE = '#c7ccd6', OL = '#15181e';
    P(2,8,12,5,SCR); P(2,8,12,1,TOP); P(2,8,1,5,OL); P(13,8,1,5,OL);
    P(4 + (f % 4),10,1,1,TOP); P(7,10,2,1,'#9aa3b5'); P(1,13,14,1,BASE); P(1,14,14,1,OL);
  }
  function drawYarn(P, f) {
    const Y = '#7c5cff', YO = '#352663', YL = '#bcaeff';
    const hop = (f % 2) ? -1 : 0, bx = 11, by = 12 + hop;
    P(bx,by,4,4,Y);
    [[bx,by],[bx+3,by],[bx,by+3],[bx+3,by+3]].forEach(([x,y]) => P(x,y,1,1,YO));
    const o = f % 2;
    P(bx+1+o,by,1,1,YL); P(bx+(o?0:2),by+1,1,1,YL); P(bx+1,by+2,1,1,YL); P(bx+2,by+3,1,1,YL);
    P(bx-1,by+2,1,1,Y); P(bx-2,by+3,1,1,Y);
  }
  function drawZ(P) { const G = '#9aa0a6'; P(11,2,3,1,G); P(13,3,1,1,G); P(11,4,3,1,G); }
  function drawQuestion(P) { const c = '#a371f7'; P(12,1,2,1,c); P(14,2,1,1,c); P(13,3,1,1,c); P(13,5,1,1,c); }
  function drawCat(ctx, S, hue, state, fr) {
    const W = 16; ctx.clearRect(0, 0, W * S, W * S);
    const col = { O: `hsl(${hue} 45% 17%)`, B: `hsl(${hue} 40% 62%)`, L: `hsl(${hue} 30% 92%)`, P: '#e891a8' };
    const PATCH = `hsl(${(hue + 150) % 360} 52% 58%)`, EYE = `hsl(${hue} 45% 14%)`;
    const f = fr % 4;
    if (state === 'idle') {
      const dy = (f < 2) ? 0 : 1;
      const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * S, (y + dy) * S, w * S, h * S); };
      [[14,7],[14,6],[15,6],[15,5]].forEach(([x, y]) => P(x, y, 1, 1, col.B));
      drawGrid(P, CAT_LYING, col, EYE);
      [[9,8],[10,8]].forEach(([x, y]) => P(x, y, 1, 1, PATCH));
      drawZ(P);
      return;
    }
    const tailPhase = (f < 2) ? 0 : 1;
    const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * S, y * S, w * S, h * S); };
    drawTail(P, tailPhase, col.B, col.O);
    drawGrid(P, CAT, col, EYE);
    [[4,3],[5,3],[10,9],[10,10]].forEach(([x, y]) => P(x, y, 1, 1, PATCH));
    P(5, 5, 1, 2, EYE); P(10, 5, 1, 2, EYE);
    if (state === 'working') { drawGlasses(P); drawLaptop(P, f); }
    else if (state === 'waiting_input') { drawYarn(P, f); }
    else { drawQuestion(P); }
  }
  function catOrIcon(s, st) {
    if (config.purrMode)
      return `<canvas class="purrcat" width="48" height="48" data-id="${s.id}" data-hue="${hashHue(s.id + s.project)}" data-state="${s.status}"></canvas>`;
    return `<span class="emoji">${st.emoji}</span><span class="dot"></span>`;
  }
  let catFrame = 0;
  function drawAllCats() {
    document.querySelectorAll('canvas.purrcat').forEach((c) => {
      const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
      drawCat(ctx, 3, +c.dataset.hue, c.dataset.state, catFrame);
    });
  }
  setInterval(() => { if (!config.purrMode) return; catFrame++; drawAllCats(); }, 150);

  // ===================== sonido + vibración =====================
  let audioCtx = null;
  // Desbloqueo de autoplay: el webview deja el AudioContext suspendido hasta un gesto del
  // usuario. Lo creamos/reanudamos con el primer clic o tecla en el panel, así las alertas
  // posteriores (que llegan sin gesto) sí suenan.
  function unlockAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* sin audio disponible */ }
  }
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  function tone(ctx, freq, type, t0, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function playSound(name) {
    if (!name || name === 'off') return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { return; }
    const ctx = audioCtx, v = 0.13, t = ctx.currentTime;
    switch (name) {
      case 'ping':    tone(ctx, 880, 'sine', t, 0.28, v); break;
      case 'chime':   tone(ctx, 659.25, 'sine', t, 0.22, v); tone(ctx, 987.77, 'sine', t + 0.10, 0.30, v); break;
      case 'marimba': [523.25, 659.25, 783.99].forEach((fr, i) => tone(ctx, fr, 'triangle', t + i * 0.07, 0.16, v)); break;
      case 'blip':    tone(ctx, 1100, 'square', t, 0.06, v * 0.7); tone(ctx, 1450, 'square', t + 0.09, 0.06, v * 0.7); break;
      case 'glass':   tone(ctx, 1568, 'triangle', t, 0.26, v); tone(ctx, 3136, 'sine', t, 0.18, v * 0.4); break;
      case 'knock':   tone(ctx, 200, 'sine', t, 0.10, v * 1.25); tone(ctx, 160, 'sine', t + 0.12, 0.12, v * 1.25); break;
      case 'alert':   [700, 900, 1150].forEach((fr, i) => tone(ctx, fr, 'square', t + i * 0.10, 0.09, v * 0.75)); break;
      case 'success': [523.25, 659.25, 783.99, 1046.50].forEach((fr, i) => tone(ctx, fr, 'triangle', t + i * 0.08, 0.18, v)); break;
      case 'tada':    tone(ctx, 783.99, 'triangle', t, 0.12, v); tone(ctx, 1046.50, 'triangle', t + 0.10, 0.20, v); tone(ctx, 1568, 'sine', t + 0.10, 0.22, v * 0.5); break;
    }
  }
  function buzz(card, accent) {
    if (!card) return;
    const amp = config.vibration || 'subtle';
    const shake = accent !== 'done' && amp !== 'off';
    const glow = accent === 'perm' ? '#a371f7' : accent === 'done' ? '#3fb950' : '#e3a008';
    card.style.setProperty('--amp', amp === 'medium' ? '5px' : '2px');
    card.style.setProperty('--glowc', glow);
    card.classList.remove('buzz', 'glowonly'); void card.offsetWidth;
    card.classList.add(shake ? 'buzz' : 'glowonly');
    card.addEventListener('animationend', () => card.classList.remove('buzz', 'glowonly'), { once: true });
  }

  // ===================== render =====================
  function visibleSessions() {
    return config.hideIdle ? sessions.filter((s) => s.status !== 'idle') : sessions;
  }
  function sorted() {
    return [...visibleSessions()].sort((a, b) => STATES[a.status].order - STATES[b.status].order || b.lastActivityMs - a.lastActivityMs);
  }
  function card(s) {
    const st = STATES[s.status] || STATES.idle;
    const cls = 's-' + s.status + (isAttention(s) ? ' attention' : '');
    const icon = catOrIcon(s, st);
    const layout = config.layout;
    const elapsed = fmt(Date.now() - s.lastActivityMs);
    const win = s.local === false ? '<span class="otherwin" title="Esta conversación está en otra ventana de VS Code">⧉ otra ventana</span>' : '';
    if (layout === 'list') {
      return `<div class="session ${cls}" data-id="${s.id}" data-cwd="${esc(s.cwd)}">
        ${icon}<div class="main"><div class="title">${esc(s.title)}</div>
        <div class="meta">${esc(s.project)} · ${st.label}</div></div>
        <div class="elapsed" data-act="${s.lastActivityMs}">${elapsed}</div>${win}</div>`;
    }
    if (layout === 'kanban') {
      return `<div class="session ${cls}" data-id="${s.id}" data-cwd="${esc(s.cwd)}">
        ${config.purrMode ? '<div class="kcat">' + icon + '</div>' : ''}
        <div class="proj">${esc(s.project)}${win}</div><div class="title">${esc(s.title)}</div>
        <div class="elapsed" data-act="${s.lastActivityMs}">⏱ ${elapsed}</div></div>`;
    }
    return `<div class="session ${cls}" data-id="${s.id}" data-cwd="${esc(s.cwd)}">
      <div class="row1">${icon}<span class="proj">${esc(s.project)}</span><span class="badge">${st.label}</span>${win}</div>
      <div class="title">${esc(s.title)}</div>
      ${s.status === 'working' ? '<div class="work-bar"></div>' : ''}
      <div class="row2"><span class="elapsed" data-act="${s.lastActivityMs}">⏱ ${elapsed}</span></div></div>`;
  }
  function render() {
    root.setAttribute('data-layout', config.layout);
    root.setAttribute('data-density', config.density);
    if (!sessions.length) { app.innerHTML = '<div class="empty">No hay sesiones de Claude recientes.</div>'; return; }
    if (!visibleSessions().length) { app.innerHTML = '<div class="empty">Todas las sesiones están ociosas (ocultas con 👁).</div>'; return; }
    const layout = config.layout;
    if (layout === 'kanban') {
      const order = config.hideIdle
        ? ['waiting_input', 'waiting_permission', 'working']
        : ['waiting_input', 'waiting_permission', 'working', 'idle'];
      app.className = 'kanban';
      app.innerHTML = '<div class="cols">' + order.map((k) => {
        const items = sessions.filter((s) => s.status === k).sort((a, b) => b.lastActivityMs - a.lastActivityMs);
        const st = STATES[k];
        return `<div class="col"><div class="col-head"><span>${st.emoji}</span><span>${st.label}</span><span class="n">${items.length}</span></div>${items.map(card).join('') || '<div class="empty">—</div>'}</div>`;
      }).join('') + '</div>';
    } else if (layout === 'list') {
      app.className = 'list';
      app.innerHTML = sorted().map(card).join('');
    } else {
      app.className = 'cards';
      app.innerHTML = '<div class="grid">' + sorted().map(card).join('') + '</div>';
    }
    app.querySelectorAll('.session').forEach((el) => el.addEventListener('click', () => {
      vscode.postMessage({ type: 'open', id: el.dataset.id, cwd: el.dataset.cwd });
    }));
    if (config.purrMode) drawAllCats();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // refresca solo los "elapsed" cada segundo (sin re-render completo)
  setInterval(() => {
    document.querySelectorAll('.elapsed[data-act]').forEach((el) => {
      const pre = el.textContent.trim().startsWith('⏱') ? '⏱ ' : '';
      el.textContent = pre + fmt(Date.now() - (+el.dataset.act));
    });
  }, 1000);

  // ===================== mensajes desde la extensión =====================
  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg.type === 'update') {
      sessions = msg.sessions || [];
      config = Object.assign(config, msg.config || {});
      render();
    } else if (msg.type === 'alert') {
      playSound(msg.sound);
      const cardEl = document.querySelector('.session[data-id="' + msg.sessionId + '"]');
      buzz(cardEl, msg.accent);
    }
  });

  vscode.postMessage({ type: 'ready' });
})();
