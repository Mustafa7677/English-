// Boot, settings, game state machine and the main loop.
import * as THREE from 'three';
import { psx } from './util.js';
import { GameAudio } from './audio.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Props } from './physics.js';
import { Lighting } from './lighting.js';
import { Director } from './scenes.js';
import { collideNPCs } from './npc.js';
import { FX } from './fx.js';

const QUALITY = {
  low: { scale: 0.5, lampLights: 3, shadows: false, shadowSize: 512, fogDensity: 0.04, far: 110 },
  medium: { scale: 0.75, lampLights: 6, shadows: true, shadowSize: 1024, fogDensity: 0.034, far: 150 },
  high: { scale: 1.0, lampLights: 10, shadows: true, shadowSize: 2048, fogDensity: 0.03, far: 200 },
};

const DEFAULTS = { quality: 'medium', psx: true, sensitivity: 1, volume: 0.8, horrorMinutes: 11, showFps: true, difficulty: 'normal' };
function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('cc4090-settings') || '{}') }; } catch (e) { return { ...DEFAULTS }; }
}
function saveSettings(s) { try { localStorage.setItem('cc4090-settings', JSON.stringify(s)); } catch (e) { /* storage blocked */ } }

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 150);

const params = new URLSearchParams(location.search);
const G = {
  scene, camera, renderer,
  npcs: [], time: 0, dt: 0, frame: 0, state: 'menu',
  gravityScale: 1, renderScaleMul: 1, godMode: params.has('god'),
  settings: loadSettings(),
};
window.G = G; // handy for debugging from the console

G.input = new Input(canvas);
G.ui = new UI();
G.audio = new GameAudio();
G.lighting = new Lighting(G);
G.world = new World(G);
G.props = new Props(G);
G.player = new Player(G);
G.director = new Director(G);
G.director.init();
G.fx = new FX(G);

// ---------------- settings ----------------
let appliedScale = -1;
function applySettings() {
  const s = G.settings, q = QUALITY[s.quality] || QUALITY.medium;
  G.quality = q;
  renderer.shadowMap.enabled = q.shadows;
  G.lighting.configure(q);
  G.player.setShadows(s.quality === 'high');
  camera.far = q.far; camera.updateProjectionMatrix();
  psx.snap.value = s.psx ? 120 : 0;
  if (G.fx) G.fx.setEnabled(s.quality !== 'low');
  canvas.classList.toggle('pixel', s.psx);
  G.input.sensitivity = s.sensitivity;
  G.audio.setVolume(s.volume);
  appliedScale = -1;
  scene.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true)); } });
  saveSettings(s);
}
function updateResolution() {
  const q = G.quality, s = G.settings;
  const scale = Math.min(window.devicePixelRatio, 1.5) * q.scale * (s.psx ? 0.6 : 1) * G.renderScaleMul * (G.rtxScale || 1);
  if (Math.abs(scale - appliedScale) > 0.01) { renderer.setPixelRatio(scale); renderer.setSize(window.innerWidth, window.innerHeight, false); appliedScale = scale; if (G.fx) G.fx.resize(); }
}

function bindSettings() {
  const s = G.settings;
  const q = document.getElementById('set-quality'), p = document.getElementById('set-psx'), sens = document.getElementById('set-sens'),
    vol = document.getElementById('set-vol'), hm = document.getElementById('set-horror'), fps = document.getElementById('set-fps');
  q.value = s.quality; p.checked = s.psx; sens.value = s.sensitivity; vol.value = s.volume; hm.value = String(s.horrorMinutes); fps.checked = s.showFps;
  q.onchange = () => { s.quality = q.value; applySettings(); };
  p.onchange = () => { s.psx = p.checked; applySettings(); };
  sens.oninput = () => { s.sensitivity = parseFloat(sens.value); applySettings(); };
  vol.oninput = () => { s.volume = parseFloat(vol.value); applySettings(); };
  hm.onchange = () => { s.horrorMinutes = parseFloat(hm.value); saveSettings(s); };
  fps.onchange = () => { s.showFps = fps.checked; saveSettings(s); };
  const diff = document.getElementById('set-diff'); diff.value = s.difficulty; diff.onchange = () => { s.difficulty = diff.value; saveSettings(s); };
}
bindSettings();
applySettings();

// ---------------- state machine ----------------
let hadLock = false;
function startGame() {
  G.audio.init();
  G.input.lock();
  G.ui.hideScreens();
  G.ui.show('hud');
  if (G.state === 'menu') { G.state = 'play'; G.player.yaw = 0; }
  else if (G.state === 'paused') G.state = 'play';
}
document.getElementById('btn-start').onclick = startGame;
document.getElementById('btn-resume').onclick = startGame;
document.querySelectorAll('.btn-restart').forEach((b) => (b.onclick = () => location.reload()));
document.querySelectorAll('.btn-settings').forEach((b) => (b.onclick = () => document.getElementById('settings').classList.toggle('hidden')));
document.getElementById('btn-close-settings').onclick = () => document.getElementById('settings').classList.add('hidden');
canvas.addEventListener('click', () => { if (G.state === 'play' && !G.input.locked) G.input.lock(); });

G.input.onLockChange = (locked) => {
  if (locked) { hadLock = true; return; }
  if (G.state === 'play' && hadLock) {
    G.state = 'paused';
    G.ui.show('pause');
    try { speechSynthesis.cancel(); } catch (e) { /* no speech */ }
  }
};

G.gameOver = () => {
  if (G.state !== 'play') return;
  G.state = 'dead';
  G.ui.screamer('horse', 1.2);
  G.audio.sting(1);
  setTimeout(() => {
    G.input.unlock();
    G.ui.hide('hud');
    const [cause, joke] = G.director.deathLine();
    document.getElementById('go-cause').textContent = cause;
    document.getElementById('go-joke').textContent = joke;
    document.getElementById('go-stats').textContent = `You survived ${fmtTime(G.time)} in 4090 City and witnessed ${G.director.eventsSeen} cursed events.`;
    const sr = G.director.scoreAndRank(false);
    document.getElementById('go-rank').textContent = `SCORE ${sr.score} · RANK: ${sr.rank}`;
    G.ui.show('gameover');
  }, 1300);
};
G.win = () => {
  G.state = 'won';
  G.input.unlock();
  document.getElementById('end-stats').textContent =
    `Escape time: ${fmtTime(G.time)} · Cursed events witnessed: ${G.director.eventsSeen} · Health left: ${Math.round(G.player.health)}%`;
  const sr = G.director.scoreAndRank(true);
  document.getElementById('end-rank').textContent = `SCORE ${sr.score} · RANK: ${sr.rank} · 💾 ${sr.disks}/10 · 🏆 ${sr.ach}`;
  G.ui.show('ending');
};
function fmtTime(t) { return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; }

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  appliedScale = -1;
});

// ---------------- main loop ----------------
const clock = new THREE.Clock();
let fpsAcc = 0, fpsFrames = 0, fpsShown = 60;
const tmp = new THREE.Vector3();

function pushPlayer() {
  const P = G.player;
  if (P.inVehicle || P.hiding) return;
  for (const n of G.npcs) {
    if (n.removed || n.hidden || n.attached || n.rd) continue;
    if (Math.abs(n.pos.y - P.pos.y) > 1.8) continue;
    const dx = P.pos.x - n.pos.x, dz = P.pos.z - n.pos.z, rr = n.radius + P.radius;
    const d2 = dx * dx + dz * dz;
    if (d2 > rr * rr || d2 < 1e-6) continue;
    const d = Math.sqrt(d2), push = rr - d;
    P.pos.x += (dx / d) * push * 0.8; P.pos.z += (dz / d) * push * 0.8;
    n.pos.x -= (dx / d) * push * 0.2; n.pos.z -= (dz / d) * push * 0.2;
  }
}

function updateNPCs(dt) {
  const P = G.player.pos;
  for (const n of G.npcs) {
    if (n.removed || (n.hidden && !n.mem.tickHidden)) continue;
    const d = Math.abs(n.pos.x - P.x) + Math.abs(n.pos.z - P.z);
    n.lod = d > 70 ? 1 : 0;
    n.update(dt);
  }
  collideNPCs(G.npcs, G);
}

let menuT = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta()) * (G.timeScale || 1);
  G.dt = dt; G.frame++;
  fpsAcc += dt; fpsFrames++;
  if (fpsAcc > 0.5) { fpsShown = Math.round(fpsFrames / fpsAcc); fpsAcc = 0; fpsFrames = 0; }

  if (G.fakeCrash || G.freezeT > 0) {
    if (G.freezeT > 0) G.freezeT -= dt;
    // "not responding": no simulation, no new frames
  } else if (G.state === 'play') {
    G.time += dt;
    G.player.update(dt);
    G.director.update(dt);
    updateNPCs(dt);
    pushPlayer();
    G.props.update(dt);
    G.world.update(dt, G);
    G.lighting.update(dt);
    const P = G.player;
    G.ui.setBars(P.health, P.stamina, P.fear);
    G.ui.inventory(`🧱 ${P.bricks} &nbsp; 🔦 ${Math.round(P.battery)}% ${P.flashOn ? 'ON' : 'OFF'}${P.hasRTX ? ' &nbsp; <span class="g">▣ RTX 4090</span>' : ''}`);
    // heartbeat when afraid
    G.heartT = (G.heartT || 0) - dt;
    if (P.fear > 0.45 && G.heartT <= 0) { G.heartT = 1.3 - P.fear * 0.8; G.audio.heartbeat(0.3 + P.fear * 0.5); }
  } else if (G.state === 'cutscene') {
    G.time += dt;
    G.director.update(dt);
    updateNPCs(dt);
    G.props.update(dt);
    G.world.update(dt, G);
    G.lighting.update(dt);
  } else if (G.state === 'menu') {
    menuT += dt * 0.05;
    camera.position.set(Math.sin(menuT) * 30, 14, 14 + Math.cos(menuT) * 30);
    camera.lookAt(10, 6, -20);
    G.world.update(dt, G);
    G.lighting.update(dt);
  }
  G.ui.update(dt);
  G.ui.realFps(fpsShown, G.settings.showFps && G.state !== 'menu');
  G.audio.updateListener(camera);
  updateResolution();
  if (!G.fakeCrash && !(G.freezeT > 0)) G.fx.render(dt);
  G.input.endFrame();
}
frame();
