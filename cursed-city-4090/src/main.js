// Boot, settings, map select and the main loop.
// The two maps are two separate games: nothing 3D is built until a map is chosen, and then ONLY that map is
// built (4090 CITY never builds the metro, METRO 404 never builds the city).
// Links: ?map=city and ?map=metro open a map directly, ?maps opens the map select.
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
import { mapCardStats } from './scenes19.js';

const QUALITY = {
  low: { scale: 0.5, lampLights: 3, shadows: false, shadowSize: 512, fogDensity: 0.04, far: 110 },
  medium: { scale: 0.75, lampLights: 6, shadows: true, shadowSize: 1024, fogDensity: 0.034, far: 150 },
  high: { scale: 1.0, lampLights: 10, shadows: true, shadowSize: 2048, fogDensity: 0.03, far: 200 },
};

const DEFAULTS = { quality: 'medium', psx: true, sensitivity: 1, volume: 0.8, horrorMinutes: 11, showFps: true, difficulty: 'normal', scare: 'normal' };
function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('cc4090-settings') || '{}') }; } catch (e) { return { ...DEFAULTS }; }
}
function saveSettings(s) { try { localStorage.setItem('cc4090-settings', JSON.stringify(s)); } catch (e) { /* storage blocked */ } }

const CONTROLS_CITY = [['WASD', 'move'], ['MOUSE', 'look'], ['SHIFT', 'run'], ['SPACE', 'jump'], ['CTRL / C', 'crouch'], ['E', 'interact'],
  ['F', 'flashlight'], ['R / RMB', 'throw brick'], ['LEFT CLICK', 'kick'], ['M', 'map'], ['J', 'journal'], ['P', 'photo'], ['ESC', 'pause']];
const CONTROLS_METRO = [['WASD', 'move'], ['MOUSE', 'look'], ['SHIFT', 'run'], ['E', 'skip intro'], ['F', 'flashlight'],
  ['J', 'meme book'], ['ESC', 'pause']];
const controlsHTML = (list) => `<div class="controls">${list.map(([k, v]) => `<div><b>${k}</b> ${v}</div>`).join('')}</div>`;
const MAPS = {
  city: {
    kicker: 'MAP 1 · КАРТА 1', title: '4090 CITY',
    tag: 'Wake up at 3:33 AM in a cursed city. Steal the RTX 4090, survive the horror shift, beat the giant robot and escape through the gate.',
    rules: `${controlsHTML(CONTROLS_CITY)}<p class="tc-note">The horror shift begins after the time set in SETTINGS.</p>`,
  },
  metro: {
    kicker: 'MAP 2 · КАРТА 2', title: 'METRO 404',
    tag: 'You fell asleep in the last wagon of a very long train under Almaty. The Kazakh memes came alive in it.',
    rules: '<ol class="tc-list"><li>14 wagons. In every wagon, real Kazakh TikTok memes happen just like in their videos, only in the metro.</li>' +
      '<li>Walk up to people: a meme starts when you come close, plays once, then they sit like normal passengers.</li>' +
      '<li>Walk freely: every door opens, forward or back.</li>' +
      '<li>At the end: the driver\'s cab, the exit, the escalator...</li></ol>' +
      `${controlsHTML(CONTROLS_METRO)}<p class="tc-note">📒 Every meme you see goes into the meme book.</p>`,
  },
};

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 150);

const params = new URLSearchParams(location.search);
const G = {
  scene, camera, renderer,
  npcs: [], time: 0, dt: 0, frame: 0, state: 'menu', map: null, booted: false,
  gravityScale: 1, renderScaleMul: 1, godMode: params.has('god'),
  settings: loadSettings(),
};
window.G = G; // handy for debugging from the console

G.input = new Input(canvas);
G.ui = new UI();
G.audio = new GameAudio();
G.quality = QUALITY[G.settings.quality] || QUALITY.medium;

/** Build the chosen map, and nothing else. */
function boot(map) {
  if (G.booted) return;
  G.map = map; G.startMode = map;
  G.lighting = new Lighting(G);
  G.world = new World(G, { minimal: map === 'metro' });
  G.props = new Props(G);
  G.player = new Player(G);
  G.director = new Director(G);
  G.director.init();
  G.fx = new FX(G);
  G.booted = true;
  applySettings();
  if (map === 'metro') G.director.prepareMetroBackdrop();
  G.state = 'ready';
}

// ---------------- settings ----------------
let appliedScale = -1;
function applySettings() {
  const s = G.settings, q = QUALITY[s.quality] || QUALITY.medium;
  G.quality = q;
  renderer.shadowMap.enabled = q.shadows;
  camera.far = q.far; camera.updateProjectionMatrix();
  psx.snap.value = s.psx ? 120 : 0;
  G.audio.scareScale = { mild: 0.45, normal: 1, extreme: 1.25 }[s.scare] || 1;
  G.ui.maxFlash = s.scare === 'mild' ? 0.35 : 1;
  canvas.classList.toggle('pixel', s.psx);
  G.input.sensitivity = s.sensitivity;
  G.audio.setVolume(s.volume);
  if (G.booted) {
    G.lighting.configure(G.map === 'metro' ? { ...q, lampLights: 0 } : q); // the metro has no street lamps
    G.player.setShadows(s.quality === 'high');
    G.fx.setEnabled(s.quality !== 'low');
    scene.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true)); } });
  }
  appliedScale = -1;
  saveSettings(s);
}
function updateResolution() {
  const q = G.quality, s = G.settings;
  const scale = Math.min(window.devicePixelRatio, 1.5) * q.scale * (s.psx ? 0.6 : 1) * G.renderScaleMul * (G.rtxScale || 1);
  if (Math.abs(scale - appliedScale) > 0.01) { renderer.setPixelRatio(scale); renderer.setSize(window.innerWidth, window.innerHeight, false); appliedScale = scale; if (G.fx) G.fx.resize(); }
}

function bindSettings() {
  const s = G.settings;
  const q = $('set-quality'), p = $('set-psx'), sens = $('set-sens'), vol = $('set-vol'), hm = $('set-horror'), fps = $('set-fps');
  q.value = s.quality; p.checked = s.psx; sens.value = s.sensitivity; vol.value = s.volume; hm.value = String(s.horrorMinutes); fps.checked = s.showFps;
  q.onchange = () => { s.quality = q.value; applySettings(); };
  p.onchange = () => { s.psx = p.checked; applySettings(); };
  sens.oninput = () => { s.sensitivity = parseFloat(sens.value); applySettings(); };
  vol.oninput = () => { s.volume = parseFloat(vol.value); applySettings(); };
  hm.onchange = () => { s.horrorMinutes = parseFloat(hm.value); saveSettings(s); };
  fps.onchange = () => { s.showFps = fps.checked; saveSettings(s); };
  const diff = $('set-diff'); diff.value = s.difficulty; diff.onchange = () => { s.difficulty = diff.value; saveSettings(s); };
  const sc = $('set-scare'); sc.value = s.scare; sc.onchange = () => { s.scare = sc.value; applySettings(); };
}
bindSettings();
applySettings();

// ---------------- screens: landing → map select → title card → game ----------------
let hadLock = false;
function startGame() {
  if (!G.booted) return;
  if (G.state === 'ready') {
    G.audio.init();
    G.input.lock();
    G.ui.hideScreens();
    G.ui.show('hud');
    G.state = 'play';
    G.player.yaw = 0;
    if (G.map === 'metro') G.director.startMetroMap();
  } else if (G.state === 'paused') {
    G.input.lock();
    G.ui.hideScreens();
    G.ui.show('hud');
    G.state = 'play';
  }
}

function selectMap(map) {
  const info = MAPS[map];
  if (!info || G.booted) return;
  // the URL remembers the map: a reload (or "try again") restarts the same map, and the link can be shared
  const q = new URLSearchParams(location.search); q.delete('maps'); q.set('map', map);
  try { history.replaceState(null, '', `${location.pathname}?${q.toString().replace(/=(&|$)/g, '$1')}`); } catch (e) { /* sandboxed page */ }
  $('tc-kicker').textContent = info.kicker;
  $('tc-title').textContent = info.title;
  $('tc-tag').textContent = info.tag;
  $('tc-rules').innerHTML = info.rules;
  G.ui.hideScreens();
  $('titlecard').className = `screen tc-${map}`;
  const go = $('btn-go');
  go.disabled = true; go.textContent = 'LOADING… · ЖҮКТЕЛУДЕ…';
  requestAnimationFrame(() => setTimeout(() => {
    try { boot(map); } catch (e) { go.textContent = 'ERROR — please reload'; console.error(e); return; }
    go.disabled = false; go.textContent = '▶ CLICK TO START · БАСТАУ';
  }, 30));
}

$('btn-start').onclick = () => { G.ui.hide('menu'); G.ui.show('mapselect'); };
$('btn-back').onclick = () => { G.ui.hide('mapselect'); G.ui.show('menu'); };
$('map-city').onclick = () => selectMap('city');
$('map-metro').onclick = () => selectMap('metro');
$('btn-go').onclick = startGame;
$('btn-resume').onclick = startGame;
document.querySelectorAll('.btn-restart').forEach((b) => (b.onclick = () => location.reload()));
document.querySelectorAll('.btn-maps').forEach((b) => (b.onclick = () => { location.href = `${location.pathname}?maps${G.godMode ? '&god' : ''}`; }));
document.querySelectorAll('.btn-settings').forEach((b) => (b.onclick = () => $('settings').classList.toggle('hidden')));
$('btn-close-settings').onclick = () => $('settings').classList.add('hidden');
canvas.addEventListener('click', () => { if (G.state === 'play' && !G.input.locked) G.input.lock(); });
window.addEventListener('keydown', (e) => { if (e.code === 'Enter' && G.state === 'ready' && !$('btn-go').disabled) startGame(); });

{ // best results on the cards, then open the right screen
  const st = mapCardStats();
  $('best-city').textContent = st.city; $('best-metro').textContent = st.metro; $('menu-stats').textContent = st.menu;
  const want = params.get('map');
  if (MAPS[want]) selectMap(want);
  else if (params.has('maps')) { G.ui.hide('menu'); G.ui.show('mapselect'); }
}

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
    let r;
    if (G.map === 'metro') r = G.director.metroDeathReport();
    else {
      const [cause, joke] = G.director.deathLine(), sr = G.director.scoreAndRank(false);
      r = { title: 'YOU DIED IN 4090 CITY', cause, joke, stats: `You survived ${fmtTime(G.time)} in 4090 City and witnessed ${G.director.eventsSeen} cursed events.`, rank: `SCORE ${sr.score} · RANK: ${sr.rank}`, memes: '' };
    }
    document.querySelector('#gameover h2').textContent = r.title;
    $('go-cause').textContent = r.cause;
    $('go-joke').textContent = r.joke;
    $('go-stats').textContent = r.stats;
    $('go-rank').textContent = r.rank;
    $('go-memes').innerHTML = r.memes || '';
    G.ui.show('gameover');
  }, 1300);
};
G.win = () => {
  G.state = 'won';
  G.input.unlock();
  $('end-stats').textContent = `Escape time: ${fmtTime(G.time)} · Cursed events witnessed: ${G.director.eventsSeen} · Health left: ${Math.round(G.player.health)}%`;
  const sr = G.director.scoreAndRank(true);
  $('end-rank').textContent = `SCORE ${sr.score} · RANK: ${sr.rank} · 💾 ${sr.disks}/10 · 🏆 ${sr.ach}`;
  $('end-memes').innerHTML = '';
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

function pushPlayer() {
  if (G.map === 'metro') return;
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
  if (G.map === 'metro') return; // there are no citizens on the metro map
  const P = G.player.pos;
  for (const n of G.npcs) {
    if (n.removed || (n.hidden && !n.mem.tickHidden)) continue;
    const d = Math.abs(n.pos.x - P.x) + Math.abs(n.pos.z - P.z);
    n.lod = d > 70 ? 1 : 0;
    n.update(dt);
  }
  collideNPCs(G.npcs, G);
}

let readyT = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta()) * (G.timeScale || 1);
  if (!G.booted) { G.input.endFrame(); return; } // the landing page and the map select have no 3D at all
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
  } else if (G.state === 'dead') {
    // death cam: you collapse to the ground while the world keeps going
    G.time += dt;
    const P = G.player, k = Math.min(1, dt * 3.5);
    camera.position.y += (P.pos.y + 0.22 - camera.position.y) * k;
    camera.rotation.z += (1.25 - camera.rotation.z) * k * 0.8;
    camera.rotation.x += (-0.25 - camera.rotation.x) * k * 0.5;
    updateNPCs(dt);
    G.props.update(dt);
    G.world.update(dt, G);
    G.lighting.update(dt);
  } else if (G.state === 'cutscene') {
    G.time += dt;
    G.director.update(dt);
    updateNPCs(dt);
    G.props.update(dt);
    G.world.update(dt, G);
    G.lighting.update(dt);
  } else if (G.state === 'ready') {
    // behind the title card: a slow camera move through the chosen map (also warms up the shaders)
    readyT += dt;
    if (G.map === 'metro') G.director.metroBackdrop(readyT);
    else {
      const a = readyT * 0.05;
      camera.position.set(Math.sin(a) * 30, 14, 14 + Math.cos(a) * 30);
      camera.lookAt(10, 6, -20);
    }
    G.world.update(dt, G);
    G.lighting.update(dt);
  }
  G.ui.update(dt);
  G.ui.realFps(fpsShown, G.settings.showFps && G.state !== 'ready');
  G.audio.updateListener(camera);
  updateResolution();
  if (!G.fakeCrash && !(G.freezeT > 0)) G.fx.render(dt);
  if (G.photoRequest && !G.fakeCrash) {
    G.photoRequest = false;
    try {
      const pc = document.createElement('canvas'); pc.width = 320; pc.height = 180;
      pc.getContext('2d').drawImage(renderer.domElement, 0, 0, 320, 180);
      G.director.takePhoto(pc.toDataURL('image/jpeg', 0.75));
    } catch (e) { /* capture failed */ }
  }
  G.input.endFrame();
}
frame();
