// HTML overlay: HUD, subtitles, big text, screamers, glitch & alarm effects, screens.
const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.el = {};
    ['hud', 'hp', 'st', 'fr', 'quest', 'inv', 'prompt', 'subtitle', 'bigtext', 'fps', 'fakefps', 'warning', 'clock',
      'vignette', 'redflash', 'alarm', 'fade', 'screamer', 'glitch', 'events'].forEach((k) => (this.el[k] = $(k)));
    this.subQueue = [];
    this.subTimer = 0;
    this.bigTimer = 0;
    this.screamTimer = 0;
    this.flash = 0;
    this.toastTimer = 0;
  }

  show(id) { $(id).classList.remove('hidden'); }
  hide(id) { $(id).classList.add('hidden'); }
  hideScreens() { document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden')); }

  setBars(hp, st, fear) {
    this.el.hp.style.width = `${Math.max(0, hp)}%`;
    this.el.st.style.width = `${Math.max(0, st)}%`;
    this.el.fr.style.width = `${Math.max(0, fear * 100)}%`;
    this.el.vignette.style.opacity = String(Math.min(1, fear * 1.1));
  }

  quest(html) { this.el.quest.innerHTML = html; }
  inventory(html) { this.el.inv.innerHTML = html; }
  prompt(text) {
    if (text) { this.el.prompt.textContent = text; this.el.prompt.style.opacity = '1'; }
    else this.el.prompt.style.opacity = '0';
  }
  clock(text) { this.el.clock.textContent = text; }

  /** Queue a subtitle. who = speaker name (optional). */
  say(text, who = '', dur = 2.6, color = '#fff') {
    this.subQueue.push({ text, who, dur, color, at: performance.now() });
    if (this.subQueue.length > 4) this.subQueue.shift();
    if (this.subTimer <= 0) this._nextSub();
  }
  _nextSub() {
    let s = this.subQueue.shift();
    while (s && performance.now() - s.at > 4000) s = this.subQueue.shift(); // drop stale lines
    if (s && this.subQueue.length > 1) s.dur = Math.min(s.dur, 1.6);
    if (!s) { this.el.subtitle.style.opacity = '0'; return; }
    this.el.subtitle.innerHTML = (s.who ? `<b style="color:${s.color}">${s.who}:</b> ` : '') + escapeHtml(s.text);
    this.el.subtitle.style.opacity = '1';
    this.subTimer = s.dur;
  }

  big(text, dur = 3, cls = '') {
    const b = this.el.bigtext;
    b.className = cls;
    b.textContent = text;
    b.style.opacity = '1';
    this.bigTimer = dur;
  }

  /** Small event log line top-right ("Something happened..."). */
  toast(text) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = text;
    this.el.events.prepend(d);
    setTimeout(() => d.classList.add('out'), 4000);
    setTimeout(() => d.remove(), 5000);
  }

  achievement(title, desc) {
    const box = document.getElementById('achievements');
    const d = document.createElement('div');
    d.className = 'ach';
    d.innerHTML = `<span class="trophy">🏆</span><div><b>ACHIEVEMENT UNLOCKED</b><br>${escapeHtml(title)}<small>${escapeHtml(desc)}</small></div>`;
    box.appendChild(d);
    setTimeout(() => d.classList.add('out'), 4500);
    setTimeout(() => d.remove(), 5500);
  }

  /** Cracked-screen overlay (something kicked your monitor). */
  crack(dur = 3) {
    const c = document.getElementById('crack');
    c.width = window.innerWidth; c.height = window.innerHeight;
    const ctx = c.getContext('2d'), cx = c.width * (0.4 + Math.random() * 0.2), cy = c.height * (0.4 + Math.random() * 0.2);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      let x = cx, y = cy; const a = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += Math.cos(a + (Math.random() - 0.5) * 0.6) * (40 + Math.random() * 90); y += Math.sin(a + (Math.random() - 0.5) * 0.6) * (40 + Math.random() * 90); ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let r = 30; r < 160; r += 45) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke(); }
    c.style.transition = 'none'; c.style.opacity = '1';
    clearTimeout(this._crackT);
    this._crackT = setTimeout(() => { c.style.transition = 'opacity 1.2s'; c.style.opacity = '0'; }, dur * 1000);
  }

  /** Phone notification card (top of the screen). */
  phone(app, text, dur = 4) {
    const d = document.createElement('div');
    d.className = 'phonenote';
    d.innerHTML = `<div class="pn-app">🔔 ${escapeHtml(app)} · now</div><div class="pn-text">${escapeHtml(text)}</div>`;
    document.getElementById('phones').appendChild(d);
    setTimeout(() => d.classList.add('out'), dur * 1000);
    setTimeout(() => d.remove(), dur * 1000 + 800);
  }

  /** Fake "program not responding" dialog. stage 0 = hide, 1 = frozen, 2 = just kidding. */
  crashDialog(stage) {
    const c = document.getElementById('crash');
    if (!stage) { c.classList.add('hidden'); return; }
    c.classList.remove('hidden');
    document.getElementById('crash-title').textContent = stage === 1 ? '4090city.exe (Not Responding)' : '4090city.exe';
    document.getElementById('crash-body').innerHTML = stage === 1
      ? '4090city.exe is not responding.<br><br>If you close the program, you might lose your sanity.'
      : '<span style="color:#c00;font-size:28px">just kidding :)</span>';
  }

  hurt(amount) { this.flash = Math.min(this.maxFlash ?? 1, this.flash + amount / 30); }

  /** Full-screen procedural screamer. kind: 'horse' | 'robot' | 'ghost' | 'toilet' */
  screamer(kind = 'horse', dur = 0.9) {
    const c = this.el.screamer;
    c.width = 320; c.height = 240;
    const ctx = c.getContext('2d');
    drawScreamer(ctx, kind);
    c.style.display = 'block';
    this.screamTimer = dur;
  }

  /** Meme freeze-frame: sepia + caption (the game loop pauses rendering meanwhile). */
  memeFreeze(text, ms = 1600) {
    const m = document.getElementById('meme'), c = document.getElementById('game');
    m.textContent = text; m.classList.remove('hidden');
    c.style.filter = 'sepia(1) contrast(1.25) brightness(1.1)';
    clearTimeout(this._memeT);
    this._memeT = setTimeout(() => { m.classList.add('hidden'); c.style.filter = ''; }, ms);
  }
  whiteFlash() {
    const w = document.getElementById('whiteflash');
    w.style.transition = 'none'; w.style.opacity = '1';
    requestAnimationFrame(() => { w.style.transition = 'opacity 1.2s'; w.style.opacity = '0'; });
  }

  glitch(level) { // 0..1
    const g = this.el.glitch;
    g.style.opacity = String(level);
    document.body.classList.toggle('shake', level > 0.55);
  }
  fakeFps(v) {
    const f = this.el.fakefps;
    if (v == null) { f.style.display = 'none'; return; }
    f.style.display = 'block';
    f.textContent = `FPS: ${v}`;
    f.style.color = v > 45 ? '#7f7' : v > 20 ? '#ff0' : '#f33';
  }
  warning(text) {
    const w = this.el.warning;
    if (!text) { w.style.display = 'none'; return; }
    w.style.display = 'block'; w.textContent = text;
  }
  alarm(on) { this.el.alarm.classList.toggle('on', !!on); }
  fade(opacity, seconds = 1) {
    this.el.fade.style.transition = `opacity ${seconds}s`;
    this.el.fade.style.opacity = String(opacity);
  }
  realFps(v, show) {
    this.el.fps.style.display = show ? 'block' : 'none';
    this.el.fps.textContent = `${v} fps`;
  }

  update(dt) {
    if (this.subTimer > 0) { this.subTimer -= dt; if (this.subTimer <= 0) this._nextSub(); }
    if (this.bigTimer > 0) { this.bigTimer -= dt; if (this.bigTimer <= 0) this.el.bigtext.style.opacity = '0'; }
    if (this.screamTimer > 0) {
      this.screamTimer -= dt;
      const c = this.el.screamer;
      c.style.transform = `scale(${1.05 + Math.random() * 0.15}) translate(${(Math.random() - 0.5) * 30}px,${(Math.random() - 0.5) * 30}px)`;
      if (this.screamTimer <= 0) c.style.display = 'none';
    }
    this.flash = Math.max(0, this.flash - dt * 1.5);
    this.el.redflash.style.opacity = String(this.flash);
  }
}

function drawBuddySelfie(ctx, W, H) {
  ctx.fillStyle = '#fff8e0'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2 + 20);
  ctx.fillStyle = '#e0b58f'; ctx.beginPath(); ctx.ellipse(0, 0, 105, 120, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a8a2a'; ctx.fillRect(-110, -125, 220, 50); ctx.fillRect(-40, -85, 170, 18);
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(-38, -20, 13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(38, -20, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#300'; ctx.beginPath(); ctx.arc(0, 30, 62, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(-55, 30, 110, 16);
  ctx.restore();
  ctx.fillStyle = '#111'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
  ctx.fillText('SAY CHEESE!', W / 2, 28);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function drawScreamer(ctx, kind) {
  const W = 320, H = 240;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (kind === 'buddy') { drawBuddySelfie(ctx, W, H); return; }
  const skin = { horse: '#4a2c18', robot: '#2a3a2a', ghost: '#cfcfc4', toilet: '#e8e8e8', pale: '#d8d6cc', mannequin: '#cdb899', log: '#8a5a2c', shark: '#7a8a96', sock: '#3050c0', skull: '#e8e4d8' }[kind] || '#4a2c18';
  ctx.save();
  ctx.translate(W / 2, H / 2 + 10);
  // head shape
  ctx.fillStyle = skin;
  ctx.beginPath();
  if (kind === 'horse') {
    ctx.moveTo(-70, -110); ctx.lineTo(70, -110); ctx.lineTo(95, 20); ctx.lineTo(60, 130); ctx.lineTo(-60, 130); ctx.lineTo(-95, 20);
  } else if (kind === 'robot') {
    ctx.rect(-110, -100, 220, 210);
  } else if (kind === 'log') {
    ctx.rect(-80, -125, 160, 260);
  } else if (kind === 'shark') {
    ctx.moveTo(-150, 40); ctx.quadraticCurveTo(0, -170, 150, 40); ctx.quadraticCurveTo(0, 140, -150, 40);
  } else {
    ctx.ellipse(0, 0, 100, 125, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  // eyes
  const eye = kind === 'robot' ? '#76ff03' : (kind === 'ghost' || kind === 'pale' || kind === 'mannequin' || kind === 'skull') ? '#000' : kind === 'log' ? '#fff' : '#ff1a1a';
  ctx.shadowColor = eye; ctx.shadowBlur = 25; ctx.fillStyle = eye;
  if (kind === 'robot') { ctx.fillRect(-90, -50, 180, 26); }
  else {
    ctx.beginPath(); ctx.ellipse(-42, -40, 22, 30, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(42, -40, 22, 30, -0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  // mouth with teeth
  ctx.fillStyle = '#100'; ctx.beginPath(); ctx.ellipse(0, 60, 62, 48, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = kind === 'robot' ? '#9a9' : '#ddd8b0';
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath(); ctx.moveTo(i * 11 - 5, 22); ctx.lineTo(i * 11 + 5, 22); ctx.lineTo(i * 11, 48); ctx.fill();
    ctx.beginPath(); ctx.moveTo(i * 11 - 5, 100); ctx.lineTo(i * 11 + 5, 100); ctx.lineTo(i * 11, 76); ctx.fill();
  }
  ctx.restore();
  // scanline/noise
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 70;
    img.data[i] += n + 20; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}
