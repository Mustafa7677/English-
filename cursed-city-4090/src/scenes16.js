// Chapter 16: METRO 404 — the metro becomes 5 stations (3 real Almaty metro stations + 2 fantasy tunnels),
// you ride a train between them, and the 14 memes are merged in on top of the 17 old anomalies:
//
// 7 MONSTERS (chase / hide / scream):
//   corridor anomalies: Snow Leopard Rapper (raps, then chases), Karate Cat (flies in, kicks the screen),
//   "Ойлашы!" (screams out of the dark), Code Rot (a glitching commuter), Bluti Fruti (two tiny attackers),
//   The Dad??? (a giant kangaroo); in the train: Remember November (a polar bear in the wagon)
// 7 INTERACTIVE MEMES:
//   corridor anomalies: "Әй, дүбәра!" (a cockroach jumps on the screen), GTA 6 disc (breaks when you look)
//   in the train: the clapping cat (the whole wagon claps), "Зыпылдаған 25" (talks insanely fast, then
//   screams), the dropped phone (he blames you), the Kaspi transfer gone wrong, the wedding cake disaster
// SECRET SCREAMERS: every run enables only a random part of the new monsters, and every train ride
// draws its event from a shuffled bag (sometimes nothing happens at all). No two runs feel the same.
import * as THREE from 'three';
import { makeHumanoid, pose, randomLook } from './characters.js';
import { ACH } from './scenes2.js';
import { mat, basic, box, cyl, canvasTex, rand, pick, shuffle } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const MY = -120, WX = 40, WZ0 = -29, WZ1 = -11; // the train wagon (separate room)

const STATIONS = {
  5: { name: 'Райымбек батыр', tint: '#e6d6b6' },
  4: { name: 'Жібек жолы', tint: '#b6c6e6' },
  3: { name: 'Абай', tint: '#e8e8e2' },
  2: { name: 'Туннель 404', tint: '#b07070' },
  1: { name: 'Шексіз бекет ∞', tint: '#9ad0a0' },
  0: { name: 'ЖЕР БЕТІ ↑', tint: '#d8dcd6' },
};
const OLD = ['faceless', 'backwards', 'stare', 'horse', 'poster', 'faces', 'red', 'door', 'crew67', 'ceiling',
  'bananas', 'sign', 'missing', 'manager', 'buddy', 'cart', 'cctv', 'steps'];
const NEW_MONSTERS = ['bars', 'karate', 'oylashy', 'coderot', 'bluti', 'dad'];
const NEW_MEMES = ['dubara', 'gta6'];
const WAGON_EVENTS = ['clap', 'bear', 'cake', 'kaspi', 'phone', 'zyp25'];

Object.assign(ACH, {
  m_bars: ['Барыс Freestyle', 'Survive the snow leopard rapper'],
  m_karate: ['ХИИИЯ!', 'Get kicked by the Karate Cat'],
  m_oylashy: ['Ойлашы!', 'Hear it from the dark'],
  m_coderot: ['Code Rot', 'Meet the glitching commuter'],
  m_bluti: ['Bluti Fruti', 'Get bitten by two tiny fruits'],
  m_dad: ['The Dad???', 'See the giant kangaroo'],
  m_bear: ['Remember November', 'Meet the bear in the train'],
  m_dubara: ['Әй, дүбәра!', 'A cockroach on your screen'],
  m_gta: ['Waited 10 Years', 'Break GTA 6 by looking at it'],
  m_clap: ['Standing Ovation', 'The whole wagon clapped'],
  m_zyp: ['Зыпылдаған 25', 'Survive the fastest talker in the metro'],
  m_phone: ['Not My Fault', 'Get blamed for a broken phone'],
  m_kaspi: ['Wrong Transfer', 'Get a Kaspi transfer gone wrong'],
  m_cake: ['Той бұзылды', 'Witness the wedding cake disaster'],
  m_allstations: ['Almaty Underground', 'Ride through all 5 stations'],
});

function fitText(ctx, text, maxW, size) {
  let s = size;
  do { ctx.font = `bold ${s}px Arial, sans-serif`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 10);
}

function makeCockroach() {
  const g = new THREE.Group();
  const M = (c) => new THREE.MeshBasicMaterial({ color: c, depthTest: false, fog: false });
  const add = (m, w, h, d, x, y, z, rz = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.z = rz; b.renderOrder = 1003; g.add(b); };
  const body = M(0x5a2c10), dark = M(0x2a1408);
  add(body, 0.07, 0.11, 0.02, 0, 0, 0); add(dark, 0.05, 0.035, 0.022, 0, 0.065, 0);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) add(dark, 0.06, 0.006, 0.006, s * 0.06, 0.03 - i * 0.035, 0, s * (0.5 - i * 0.5));
    add(dark, 0.004, 0.09, 0.004, s * 0.02, 0.12, 0, s * 0.35);
  }
  return g;
}

function makeFruit(color, leaf) {
  const g = new THREE.Group();
  g.add(box(0.42, 0.42, 0.4, mat(color, { emissive: color, emissiveIntensity: 0.25 }), 0, 0.42, 0));
  g.add(box(0.2, 0.08, 0.2, mat(leaf), 0, 0.66, 0));
  for (const s of [-1, 1]) { g.add(box(0.11, 0.11, 0.02, basic('#fff'), s * 0.09, 0.48, 0.21, false)); g.add(box(0.05, 0.06, 0.02, basic('#000'), s * 0.09, 0.47, 0.225, false)); }
  g.add(box(0.16, 0.05, 0.02, basic('#300'), 0, 0.33, 0.21, false));
  for (let i = 0; i < 5; i++) g.add(box(0.02, 0.04, 0.02, basic('#fff'), -0.06 + i * 0.03, 0.31, 0.22, false));
  const legs = [];
  for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * 0.1, 0.22, 0); l.add(box(0.05, 0.22, 0.05, mat('#222'), 0, -0.11, 0)); g.add(l); legs.push(l); }
  g.userData.legs = legs;
  return g;
}

export function extendDirector16(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initMetro404(); };

  P.stationTitle = function (level) { return level === 0 ? 'ЖЕР БЕТІ ЖАҚЫН! — THE SURFACE' : `${6 - level}/5 · ${STATIONS[level].name}`; };

  // ---------------------------------------------------------------- run setup (secret screamers)
  const origEnter = P.metroEnterTask;
  P.metroEnterTask = function* () {
    const M = this.metro;
    if (!M.active) {
      const secret = shuffle(NEW_MONSTERS.slice()).slice(0, 4); // only some monsters exist this run
      M.pool = [...OLD, ...secret, ...secret, ...NEW_MEMES, ...NEW_MEMES];
      M.wagonBag = []; M.freshStart = true; M.stationsSeen = 0;
    }
    yield* origEnter.call(this);
  };

  P.metroNewLoop = function () {
    const M = this.metro;
    M.loops++;
    let a = null;
    if (M.level > 0 && !M.freshStart && Math.random() < 0.6) { do { a = pick(M.pool || OLD); } while (a === M.prev); }
    M.freshStart = false;
    M.anomaly = a; M.prev = a || M.prev;
    this.metroReset();
    if (a) this.applyAnomaly(a);
  };

  P.drawMetroSigns = function (wrong) {
    const M = this.metro, st = STATIONS[M.level] || STATIONS[5];
    const draw = (ctx, tex, text, color, bg) => {
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fitText(ctx, text, 240, 30); ctx.fillText(text, 128, 34); tex.needsUpdate = true;
    };
    const name = wrong ? st.name.split('').reverse().join('') : st.name;
    draw(M.signCtx, M.signTex, name, '#ffffff', '#0a3a7a');
    const next = STATIONS[M.level - 1];
    draw(M.exitCtx, M.exitTex, wrong ? '← ← ШЫҒУ ЖОҚ ← ←' : M.level === 0 ? '→ ЖЕР БЕТІ ↑' : `→ ПОЕЗД: ${next ? next.name : ''}`, wrong ? '#ff4040' : '#30ff60', '#111');
  };

  // ---------------------------------------------------------------- build: wagon + corridor actors
  P.initMetro404 = function () {
    const G = this.G, W = G.world, M = this.metro, root = M.root;
    M.wallMesh = root.children[0];
    M.wallMesh.material = M.wallMesh.material.clone();
    M.panelDark = mat('#1c1e1c');
    // ---- the train wagon
    const wg = M.wagon = new THREE.Group(); G.scene.add(wg);
    const body = mat('#c8ccc4'), seat = mat('#2a5a8a'), rail = mat('#aaa');
    const L = WZ1 - WZ0, cz = (WZ0 + WZ1) / 2;
    const wbox = (w, h, d, m, x, y, z, solid) => { const b = box(w, h, d, m, x, y, z); wg.add(b); if (solid) W.addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, MY - 1, MY + 3); return b; };
    wbox(3.4, 0.1, L, mat('#4a4a46'), WX, MY - 0.04, cz, false);
    for (const s of [-1, 1]) {
      const x = WX + s * 1.55;
      wbox(0.1, 1.05, L, body, x, MY + 0.52, cz, true);
      wbox(0.1, 0.5, L, body, x, MY + 2.25, cz, false);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.95), new THREE.MeshBasicMaterial({ color: 0x0a1418, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
      glass.position.set(x, MY + 1.52, cz); glass.rotation.y = Math.PI / 2; wg.add(glass);
      wbox(0.1, 1, L, body, x, MY + 1.52, cz, true).visible = false; // invisible collider behind the glass
      wbox(0.5, 0.45, L - 1, seat, WX + s * 1.2, MY + 0.22, cz, true);
      wbox(0.1, 0.5, L - 1, seat, WX + s * 1.45, MY + 0.6, cz, false);
      wbox(0.2, 3, L + 6, mat('#2a2826'), WX + s * 3.1, MY + 1.5, cz, false); // tunnel wall outside
    }
    wbox(3.4, 2.6, 0.1, body, WX, MY + 1.3, WZ0, true); wbox(3.4, 2.6, 0.1, body, WX, MY + 1.3, WZ1, true);
    wbox(3.4, 0.08, L, mat('#e8ece4'), WX, MY + 2.52, cz, false);
    M.wagonPanelOn = basic('#f4fff8'); M.wagonPanels = [];
    for (let z = WZ0 + 2; z < WZ1; z += 3) { const p = box(0.4, 0.04, 2, M.wagonPanelOn, WX, MY + 2.47, z, false); wg.add(p); M.wagonPanels.push(p); }
    for (let z = WZ0 + 3; z < WZ1 - 1; z += 4) wg.add(cyl(0.025, 0.025, 2.5, 6, rail, WX, MY + 1.25, z));
    // LED strip "next station"
    const lc = document.createElement('canvas'); lc.width = 512; lc.height = 48; M.ledCtx = lc.getContext('2d'); M.ledTex = new THREE.CanvasTexture(lc);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.24), new THREE.MeshBasicMaterial({ map: M.ledTex })); led.position.set(WX, MY + 2.25, WZ0 + 0.07); wg.add(led);
    // passing tunnel lights
    M.tunnelLights = [];
    for (let i = 0; i < 10; i++) for (const s of [-1, 1]) { const b = box(0.1, 0.1, 0.6, basic('#ffd890'), WX + s * 2.95, MY + 1.7, WZ0 - 3 + i * 2.6, false); wg.add(b); M.tunnelLights.push(b); }
    M.wagonLight = new THREE.PointLight(0xf0fff4, 0, 14, 1.2); G.scene.add(M.wagonLight);
    // passengers
    M.pax = [];
    for (let i = 0; i < 6; i++) {
      const r = makeHumanoid({ ...randomLook(), outfit: pick(['jacket', 'hoodie', 'shirt', 'tshirt']) });
      const s = i % 2 ? 1 : -1;
      r.home = V(WX + s * 1.15, MY, WZ0 + 3 + Math.floor(i / 2) * 5.2 + rand(-0.5, 0.5));
      r.root.position.copy(r.home); r.root.rotation.y = -s * Math.PI / 2; r.mode = 'sit';
      wg.add(r.root); M.pax.push(r);
    }
    // special wagon actors
    M.cat = makeHumanoid({ animal: 'cat', skin: '#222', outfit: 'jacket', shirt: '#2a2a2a', pants: '#111' });
    M.bear = makeHumanoid({ animal: 'bear', skin: '#eeece4', shirt: '#eeece4', pants: '#eeece4', fat: 1.6, scale: 1.25 });
    M.bride = makeHumanoid({ shirt: '#ffffff', pants: '#ffffff', hair: 'long', hairColor: '#2a1a10', outfit: 'plain' });
    M.bride.hips.add(cyl(0.32, 0.55, 0.9, 10, mat('#ffffff'), 0, -0.45, 0));
    M.groom = makeHumanoid({ suit: true, shirt: '#1a1a1a', pants: '#1a1a1a', hair: 'short' });
    M.guests = [0, 1].map(() => makeHumanoid({ ...randomLook(), outfit: 'shirt' }));
    M.cake = new THREE.Group();
    M.cake.add(box(0.8, 0.75, 0.6, mat('#7a5a3a'), 0, 0.37, 0));
    const tiers = [[0.38, 0.28], [0.3, 0.26], [0.22, 0.24]].map(([r, h], i) => { const c = cyl(r, r, h, 12, mat(i === 2 ? '#fff0f4' : '#fffaf0'), 0, 0.75 + h / 2 + i * 0.27, 0); M.cake.add(c); return c; });
    M.cakeTiers = tiers;
    [M.cat, M.bear, M.bride, M.groom, ...M.guests].forEach((r) => { r.root.visible = false; wg.add(r.root); });
    M.cake.visible = false; wg.add(M.cake);
    M.phoneProp = box(0.08, 0.15, 0.015, mat('#111', { emissive: '#223' }), 0, -0.75, 0.08);

    // ---- corridor actors for the new anomalies
    M.roachDecor = new THREE.Group();
    for (let i = 0; i < 7; i++) { const c = box(0.06, 0.1, 0.02, mat('#4a2410'), -2.45, MY + rand(0.5, 2.6), rand(-30, -8)); c.rotation.set(0, Math.PI / 2, rand(0, 6)); M.roachDecor.add(c); }
    M.roachDecor.visible = false; root.add(M.roachDecor);
    const discTex = canvasTex(64, 80, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 64, 80); g.addColorStop(0, '#ff3a8a'); g.addColorStop(1, '#3a6aff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 80); ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.fillText('GTA', 32, 34); ctx.fillText('VI', 32, 56);
    });
    M.discCracked = canvasTex(64, 80, (ctx) => {
      ctx.drawImage(discTex.image, 0, 0); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(32, 40); let x = 32, y = 40; for (let k = 0; k < 4; k++) { x += rand(-14, 14); y += rand(-14, 14); ctx.lineTo(x, y); } ctx.stroke(); }
    });
    M.discTex = discTex;
    M.disc = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.02, 0.24), [mat('#222'), mat('#222'), new THREE.MeshLambertMaterial({ map: discTex }), mat('#222'), mat('#222'), mat('#222')]);
    M.disc.position.set(0.6, MY + 0.02, -19); M.disc.rotation.y = 0.4; M.disc.visible = false; root.add(M.disc);
    M.karate = makeHumanoid({ animal: 'cat', skin: '#d08a3a', shirt: '#f4f4f0', pants: '#f4f4f0', outfit: 'plain' });
    M.coderot = makeHumanoid({ suit: true, shirt: '#2a2a33', pants: '#22222a', hair: 'short' });
    M.oylashy = makeHumanoid({ faceless: true, skin: '#bab6aa', shirt: '#0a0a0a', pants: '#0a0a0a', hair: 'long', hairColor: '#000', scale: 1.15 });
    M.leopard = makeHumanoid({ animal: 'leopard', skin: '#e2d2a2', outfit: 'hoodie', shirt: '#1a1a1a', pants: '#2a2a4a', hat: 'cap', capColor: '#d02020' });
    M.leopard.root.add(box(0.6, 0.35, 0.25, mat('#222'), 0.6, 0.18, 0)); // boombox
    M.dad = makeHumanoid({ animal: 'kangaroo', skin: '#9a6a3a', shirt: '#9a6a3a', pants: '#9a6a3a', buff: true, scale: 2.1, fat: 1.15 });
    M.fruits = [makeFruit('#d82030', '#2a8a2a'), makeFruit('#5a3ad8', '#2a8a2a')];
    [M.karate, M.coderot, M.oylashy, M.leopard, M.dad].forEach((r) => { r.root.visible = false; root.add(r.root); });
    M.fruits.forEach((f) => { f.visible = false; root.add(f); });
  };

  // ---------------------------------------------------------------- reset / apply
  const origReset = P.metroReset;
  P.metroReset = function () {
    origReset.call(this);
    const M = this.metro;
    if (!M.wallMesh) return;
    M.wallMesh.material.color.set((STATIONS[M.level] || STATIONS[5]).tint);
    M.roachDecor.visible = false; M.disc.visible = false; M.disc.material[2].map = M.discTex; M.disc.material[2].needsUpdate = true;
    [M.karate, M.coderot, M.oylashy, M.leopard, M.dad].forEach((r) => { r.root.visible = false; r.root.position.y = MY; r.root.scale.setScalar(1); });
    M.fruits.forEach((f) => (f.visible = false));
    M.coderot.body.scale.setScalar(1); M.coderot.body.position.x = 0;
    M.dark = false; M.t16 = {};
    if (M.beat) { M.beat.stop(); M.beat = null; }
  };

  const origApply = P.applyAnomaly;
  P.applyAnomaly = function (a) {
    const M = this.metro;
    if (!NEW_MONSTERS.includes(a) && !NEW_MEMES.includes(a)) { origApply.call(this, a); return; }
    M.cctvFollow = false;
    const T = M.t16 = { state: 'wait' };
    switch (a) {
      case 'dubara': M.roachDecor.visible = true; break;
      case 'gta6': M.disc.visible = true; break;
      case 'karate': M.karate.root.visible = true; M.karate.root.position.set(1.6, MY, -21); M.karate.root.rotation.y = -Math.PI / 2; break;
      case 'coderot': M.walker.root.visible = false; M.coderot.root.visible = true; M.coderot.root.position.set(1.2, MY, -30); break;
      case 'oylashy': M.panels.material = M.panelDark; M.dark = true; M.oylashy.root.visible = true; M.oylashy.root.position.set(-1.6, MY, -24); M.walker.root.visible = false; break;
      case 'bars': M.leopard.root.visible = true; M.leopard.root.position.set(0, MY, -40); M.walker.root.visible = false; break;
      case 'dad': M.dad.root.visible = true; M.dad.root.position.set(0, MY, -40); M.walker.root.visible = false; break;
      case 'bluti': M.fruits.forEach((f, i) => { f.visible = true; f.position.set(i ? 0.8 : -0.8, MY, -41); }); break;
    }
    T.kind = a;
  };

  // ---------------------------------------------------------------- per frame (corridor)
  const origUpdate = P.updateMetro;
  P.updateMetro = function (dt) {
    origUpdate.call(this, dt);
    const G = this.G, M = this.metro, Pl = G.player;
    if (!M.active) return;
    if (M.riding) { this.updateRide(dt); return; }
    const st = STATIONS[M.level] || STATIONS[5];
    M.hud.innerHTML = `<b>METRO 404 · ${M.level === 0 ? 'ЖЕР БЕТІНЕ ШЫҒУ' : `${6 - M.level}/5 ${st.name}`}</b> · mistakes ${M.mistakes}<br><small>Nothing strange → forward to the train · Anything strange → turn back</small>`;
    if (M.dark) M.light.intensity = 2.2;
    const T = M.t16, a = M.anomaly;
    if (!T || !T.kind) return;
    const cam = G.camera, dz = (z) => Pl.pos.z - z;
    const caught = (msg, kind, dmg) => {
      if (T.done) return; T.done = true;
      this.metroCaught(kind, dmg, msg);
    };
    switch (a) {
      case 'dubara':
        if (T.state === 'wait' && Pl.pos.z < -14) {
          T.state = 'go'; T.t = 0;
          T.roach = makeCockroach(); T.roach.position.set(0.5, -0.32, -0.5); T.roach.scale.setScalar(1.15); cam.add(T.roach);
          G.audio.sting(0.45); G.audio.chalk(null);
          G.ui.big('ӘЙ, ДҮБӘРА!', 2, 'red'); G.audio.speak('Ей, дүбәра!', { pitch: 1.2, rate: 1.3 });
          Pl.scare(0.6); Pl.shake = 0.4; this.achieve('m_dubara');
        }
        if (T.state === 'go') {
          T.t += dt;
          const r = T.roach, k = Math.min(1, T.t / 0.45);
          if (T.t < 0.45) r.position.set(0.5 - 0.55 * k, -0.32 + 0.3 * k, -0.5);
          else if (T.t > 1.1) r.position.x -= dt * 1.6;
          r.rotation.z = Math.sin(T.t * 40) * 0.15 + (T.t > 1.1 ? 1.2 : 0.6);
          if (T.t > 1.8) { cam.remove(r); T.state = 'done'; this.metroCaught(null, 4, 'ТАРАҚАНДАР ЖЕҢДІ. (the roaches won)'); }
        }
        break;
      case 'gta6':
        if (T.state === 'wait' && M.disc.position.distanceTo(Pl.pos.clone().setY(MY)) < 2.6 && this.lookingAt(M.disc.position, 0.8)) {
          T.state = 'done';
          M.disc.material[2].map = M.discCracked; M.disc.material[2].needsUpdate = true;
          G.audio.crunch(M.disc.position, 0.7);
          G.ui.say('...НЕЕЕЕТ! ОНЫ ОН ЖЫЛ КҮТТІМ!', '(a voice from nowhere)', 3, '#f9c');
          this.achieve('m_gta');
          { const loop = M.loops; this.after(2.6, () => { if (M.active && M.loops === loop && !M.busy) { G.ui.big('...ОН ЖЫЛ КҮТТІМ...', 1.6, 'red'); this.metroCaught('pale', 8, 'GTA 6 FAN WAS WAITING TOO.'); } }); }
        }
        break;
      case 'karate': {
        const r = M.karate;
        if (T.state === 'wait') {
          pose(r, 'fight', dt, G.time, 0);
          if (Math.hypot(Pl.pos.x - 1.6, dz(-21)) < 6) { T.state = 'fly'; T.t = 0; T.from = r.root.position.clone(); G.ui.big('ХИИИИЯ!', 1.5, 'red'); G.audio.speak('Hiiiya!', { pitch: 1.6, rate: 1.4 }); }
        } else if (T.state === 'fly') {
          T.t += dt;
          const k = Math.min(1, T.t / 0.38), to = cam.position.clone().add(this.playerFwd().clone().multiplyScalar(0.6)).setY(MY);
          r.root.position.lerpVectors(T.from, to, k); r.root.position.y = MY + Math.sin(k * Math.PI) * 0.8;
          r.root.rotation.y = Math.atan2(Pl.pos.x - r.root.position.x, Pl.pos.z - r.root.position.z);
          r.legL.rotation.x = -1.6; r.legR.rotation.x = 0.4; r.armL.rotation.x = -1.2;
          if (k >= 1) {
            T.state = 'done'; r.root.visible = false;
            G.ui.crack(3); G.audio.thud(null, 1); G.audio.crunch(null, 0.7); G.audio.sting(0.5);
            Pl.shake = 1; Pl.scare(0.7); G.ui.hurt(10);
            this.achieve('m_karate');
            this.metroCaught(null, 10, 'ХИИИЯ! НОКАУТ. (knocked out)');
          }
        }
        break;
      }
      case 'coderot': {
        const r = M.coderot, d = Math.hypot(Pl.pos.x - r.root.position.x, dz(r.root.position.z));
        r.body.scale.set(rand(0.8, 1.3), rand(0.7, 1.4), rand(0.6, 1.6));
        r.body.position.x = rand(-0.15, 0.15);
        r.root.visible = Math.random() > 0.1;
        pose(r, 'tpose', dt, G.time, 0);
        if (Math.random() < dt * 8) G.audio.beep(r.root.position, rand(80, 3000), 0.03, 0.06, 'square');
        T.step = (T.step || 0) - dt;
        if (d < 12 && T.step <= 0) {
          T.step = 0.4; if (!T.seen) { T.seen = true; this.achieve('m_coderot'); G.ui.say('ERR̷OR: HUMAN.EXE NOT F̸OUND', 'Code Rot', 2.5, '#8af'); }
          r.root.position.x += (Pl.pos.x - r.root.position.x) / d * Math.min(1.3, d); r.root.position.z += (Pl.pos.z - r.root.position.z) / d * Math.min(1.3, d);
          r.root.rotation.y = Math.atan2(Pl.pos.x - r.root.position.x, Pl.pos.z - r.root.position.z);
        }
        if (d < 1.1) { r.root.visible = false; caught('', 'caretaker', 12); }
        break;
      }
      case 'oylashy': {
        const r = M.oylashy;
        pose(r, 'stare', dt, G.time, 0);
        r.root.rotation.y = Math.atan2(Pl.pos.x - r.root.position.x, Pl.pos.z - r.root.position.z);
        if (Math.random() < dt * 0.6) G.audio.reverseWhisper(r.root.position.clone().setY(MY + 1.6), 0.25);
        if (T.state === 'wait' && Math.hypot(Pl.pos.x - r.root.position.x, dz(r.root.position.z)) < 4) {
          T.state = 'done'; r.root.visible = false;
          G.ui.big('ОЙЛАШЫ!!!', 2, 'red'); G.audio.speak('Ойлашы!', { pitch: 0.4, rate: 1 });
          this.achieve('m_oylashy'); this.metroCaught('pale', 8, 'ОЙЛАШЫ!!!');
        }
        break;
      }
      case 'bars': {
        const r = M.leopard, d = Math.hypot(Pl.pos.x - r.root.position.x, dz(r.root.position.z));
        if (!M.beat && d < 40) M.beat = G.audio.loop('hiphop', r.root.position.clone().setY(MY + 1));
        if (M.beat) M.beat.setPos(r.root.position.clone().setY(MY + 1));
        T.line = (T.line || 0) - dt;
        if (T.line <= 0 && d < 35) {
          T.line = 2.6;
          const lines = ['Йо! Мен — барыс, Алатаудан түстім!', 'Метрода жүрсің бе? Билетің қайда, інім?', 'Ақшаң жоқ па? Kaspi-ге аудар, бауырым!', 'Қашпа, қашпа — бәрібір қуып жетем!', 'Бұл — туннель, бұл — менің ауданым!'];
          G.ui.say(lines[(T.li = (T.li || 0) + 1) % lines.length], 'Барыс MC', 2.5, '#fd6');
        }
        if (T.state === 'wait') {
          pose(r, 'rap', dt, G.time, 0); r.root.rotation.y = Math.atan2(Pl.pos.x - r.root.position.x, Pl.pos.z - r.root.position.z);
          if (Pl.pos.z < -12) { T.state = 'chase'; this.achieve('m_bars'); G.ui.toast('He is coming. TURN BACK!'); }
        } else if (T.state === 'chase') {
          const bsp = 6.4 * (M.speedMul || 1); r.root.position.x += (Pl.pos.x - r.root.position.x) / d * bsp * dt; r.root.position.z += (Pl.pos.z - r.root.position.z) / d * bsp * dt;
          r.root.rotation.y = Math.atan2(Pl.pos.x - r.root.position.x, Pl.pos.z - r.root.position.z);
          r.phase += dt * 14; pose(r, 'run', dt, G.time, 6.4);
          if (d < 1.1) { T.state = 'done'; if (M.beat) { M.beat.stop(); M.beat = null; } this.metroCaught('leopard', 12, 'ҰСТАДЫМ! ЕНДІ РЭП ТЫҢДА!'); }
        }
        break;
      }
      case 'dad': {
        const r = M.dad, d = Math.hypot(Pl.pos.x - r.root.position.x, dz(r.root.position.z));
        r.root.rotation.y = Math.atan2(Pl.pos.x - r.root.position.x, Pl.pos.z - r.root.position.z);
        if (T.state === 'wait') {
          pose(r, 'stare', dt, G.time, 0);
          if (Pl.pos.z < -8 && !T.said) { T.said = true; G.ui.big('THE DAD???', 2.2, 'glitch'); G.audio.vineBoom(0.9); this.achieve('m_dad'); }
          if (Pl.pos.z < -14) { T.state = 'hop'; T.hop = 0; }
        } else if (T.state === 'hop') {
          T.hop += dt * 2.6;
          const dsp = 5.6 * (M.speedMul || 1); r.root.position.x += (Pl.pos.x - r.root.position.x) / d * dsp * dt; r.root.position.z += (Pl.pos.z - r.root.position.z) / d * dsp * dt;
          r.root.position.y = MY + Math.abs(Math.sin(T.hop * Math.PI)) * 1.4;
          pose(r, 'fight', dt, G.time, 0);
          if (Math.sin(T.hop * Math.PI) * Math.sin((T.hop - dt * 2.6) * Math.PI) < 0) { G.audio.thud(r.root.position, 1); Pl.shake = Math.max(Pl.shake, 0.35); }
          if (d < 1.6) { T.state = 'done'; Pl.knock.set(0, 0, 10); G.audio.thud(null, 1); this.metroCaught('horse', 12, '*KANGAROO PUNCH*'); }
        }
        break;
      }
      case 'bluti': {
        T.go = T.go || (Pl.pos.z < -6);
        M.fruits.forEach((f, i) => {
          if (!f.visible) return;
          const d = Math.hypot(Pl.pos.x - f.position.x, dz(f.position.z));
          f.rotation.y = Math.atan2(Pl.pos.x - f.position.x, Pl.pos.z - f.position.z);
          if (T.go) {
            const fsp = (6.6 + i * 0.4) * (M.speedMul || 1); f.position.x += (Pl.pos.x - f.position.x) / d * fsp * dt; f.position.z += (Pl.pos.z - f.position.z) / d * fsp * dt;
            f.position.y = MY + Math.abs(Math.sin(G.time * 18 + i)) * 0.15;
            f.userData.legs.forEach((l, k) => (l.rotation.x = Math.sin(G.time * 24 + k * Math.PI) * 0.9));
            if (Math.random() < dt * 1.5) G.audio.laugh(f.position, 0.3, 2.2);
            if (d < 0.8) { f.visible = false; G.audio.crunch(null, 0.3); G.ui.say('*CHOMP*', i ? 'Fruti' : 'Bluti', 1.4, '#f6a'); this.achieve('m_bluti'); this.metroCaught('fruit', 8, 'BLUTI! FRUTI! CHOMP!'); }
          }
        });
        if (T.go && !T.said) { T.said = true; G.ui.say('BLUTI! FRUTI! BLUTI! FRUTI!', 'Bluti Fruti', 2.5, '#f6a'); }
        break;
      }
    }
  };

  // ---------------------------------------------------------------- the train ride between stations
  P.metroRide = function* (next) {
    const G = this.G, M = this.metro, Pl = G.player;
    M.riding = true; M.rideT = 0; M.rideNext = next;
    M.stationsSeen = (M.stationsSeen || 0) + 1;
    if (M.stationsSeen >= 5) this.achieve('m_allstations');
    // reset passengers
    M.pax.forEach((r) => { r.root.visible = true; r.root.position.copy(r.home); r.root.rotation.y = r.home.x > WX ? -Math.PI / 2 : Math.PI / 2; r.mode = 'sit'; r.body.rotation.set(0, 0, 0); });
    [M.cat, M.bear, M.bride, M.groom, ...M.guests].forEach((r) => { r.root.visible = false; });
    M.cake.visible = false; M.cakeTiers.forEach((c) => (c.visible = true));
    M.wagonPanels.forEach((p) => (p.material = M.wagonPanelOn));
    // the event for this ride (bag) — sometimes nothing happens
    if (!M.wagonBag.length) M.wagonBag = shuffle(WAGON_EVENTS.slice());
    M.event = Math.random() < 0.82 ? M.wagonBag.pop() : null;
    M.ev = { t: 0 };
    const nm = next === 0 ? 'ЖЕР БЕТІ' : STATIONS[next].name;
    const lc = M.ledCtx; lc.fillStyle = '#020'; lc.fillRect(0, 0, 512, 48); lc.fillStyle = '#ff9a20'; lc.textAlign = 'center'; lc.textBaseline = 'middle'; fitText(lc, `Келесі бекет: ${nm}`, 500, 28); lc.fillText(`Келесі бекет: ${nm}`, 256, 25); M.ledTex.needsUpdate = true;
    Pl.pos.set(WX, MY, WZ1 - 1.6); Pl.vel.set(0, 0, 0); Pl.yaw = 0; Pl.pitch = 0;
    M.train = G.audio.loop('train', null);
    yield 0.2;
    G.ui.fade(0, 0.6);
    G.audio.beep(null, 660, 0.3, 0.2, 'triangle'); setTimeout(() => G.audio.beep(null, 523, 0.5, 0.2, 'triangle'), 320);
    this.after(0.8, () => { G.ui.say(`Келесі бекет — ${nm}.`, '📢 Пойыз', 3.5, '#9cf'); G.audio.speak(`Next station: ${nm}`, { pitch: 1, rate: 1 }); });
    if (M.event) this.task(this.wagonEventTask);
    yield () => M.rideT > 15 && !M.evBusy;
    G.audio.beep(null, 300, 0.6, 0.15, 'sawtooth'); // brakes
    G.ui.say('Есіктер ашылады.', '📢 Пойыз', 2, '#9cf');
    yield 1;
    G.ui.fade(1, 0.3); yield 0.35;
    if (M.train) { M.train.stop(); M.train = null; }
    if (M.zypTalk) { M.zypTalk = null; }
    M.riding = false; M.wagonLight.intensity = 0;
    M.pax.forEach((r) => (r.root.visible = false));
  };

  P.updateRide = function (dt) {
    const G = this.G, M = this.metro, Pl = G.player;
    M.rideT += dt;
    M.hud.innerHTML = `<b>METRO 404 · ПОЕЗД → ${M.rideNext === 0 ? 'ЖЕР БЕТІ' : STATIONS[M.rideNext].name}</b><br><small>Hold on.</small>`;
    M.light.intensity = 0;
    M.wagonLight.position.set(Pl.pos.x, MY + 2.2, Pl.pos.z); M.wagonLight.intensity = M.wagonDark ? 0 : 7;
    for (const b of M.tunnelLights) { b.position.z -= 22 * dt; if (b.position.z < WZ0 - 4) b.position.z += 26; }
    Pl.shake = Math.max(Pl.shake, 0.05);
    for (const r of M.pax) { r.phase += dt * 3; pose(r, r.mode, dt, G.time + r.home.z, r.mode === 'walk' ? 1.5 : 0); }
    for (const r of [M.cat, M.bear, M.bride, M.groom, ...M.guests]) if (r.root.visible) pose(r, r.mode || 'idle', dt, G.time, r.mode === 'walk' ? 1.5 : 0);
  };

  P.jolt = function () {
    const G = this.G, M = this.metro;
    G.audio.thud(null, 1); G.audio.clank(null, 0.5); G.player.shake = 0.8;
    G.player.knock.set(0, 0, -4);
    M.pax.forEach((r) => { r.body.rotation.x = 0.3; this.after(0.4, () => r.body.rotation.set(0, 0, 0)); });
  };

  P.wagonEventTask = function* () {
    const G = this.G, M = this.metro, Pl = G.player, D2 = this;
    M.evBusy = true;
    const faceP = (r) => { r.root.rotation.y = Math.atan2(Pl.pos.x - r.root.position.x, Pl.pos.z - r.root.position.z); };
    yield 3.5;
    switch (M.event) {
      case 'clap': {
        const c = M.cat; c.root.visible = true; c.root.position.set(WX, MY, WZ0 + 6); c.mode = 'idle'; faceP(c);
        yield 2;
        c.mode = 'clap';
        let t = 0; while (t < 1.6) { t += G.dt; if (Math.sin(G.time * 12.6) > 0.95) G.audio.clap(0.3); yield 0; }
        M.pax.forEach((r) => { r.mode = 'clap'; r.root.position.x = r.home.x > WX ? WX + 0.75 : WX - 0.75; faceP(r); });
        G.ui.say('*the whole wagon starts clapping. at you.*', '', 3);
        t = 0; while (t < 4.5) { t += G.dt; M.pax.forEach(faceP); if (Math.random() < G.dt * 14) G.audio.clap(0.45); yield 0; }
        M.pax.forEach((r) => (r.mode = 'stare')); c.mode = 'stare';
        G.audio.setAmbient(0, 0.1); Pl.scare(0.5);
        yield 2;
        G.ui.say('...браво.', 'Мысық', 2.5, '#ccc'); G.audio.setAmbient(0.05, 1);
        this.achieve('m_clap');
        break;
      }
      case 'bear': {
        const b = M.bear; b.mode = 'stare';
        G.ui.say('...remember... november...', '(a whisper)', 3, '#9cf');
        for (const z of [WZ0 + 1.5, WZ0 + 6, WZ0 + 11]) {
          M.wagonDark = true; M.wagonPanels.forEach((p) => (p.material = M.panelDark)); G.audio.beep(null, 55, 0.4, 0.25, 'sawtooth');
          yield 0.9;
          b.root.visible = true; b.root.position.set(WX, MY, z); faceP(b);
          M.wagonDark = false; M.wagonPanels.forEach((p) => (p.material = M.wagonPanelOn)); Pl.scare(0.25);
          yield 1.6;
        }
        M.wagonDark = true; M.wagonPanels.forEach((p) => (p.material = M.panelDark));
        yield 0.5;
        b.root.visible = false;
        yield* this.lunge('pale', 10);
        M.wagonDark = false; M.wagonPanels.forEach((p) => (p.material = M.wagonPanelOn));
        this.achieve('m_bear');
        break;
      }
      case 'cake': {
        M.pax.forEach((r) => (r.root.visible = r.home.z > WZ0 + 10));
        M.cake.visible = true; M.cake.position.set(WX, MY, WZ0 + 7);
        const ppl = [[M.bride, -0.7, 6.4], [M.groom, 0.7, 6.4], [M.guests[0], -0.9, 8.2], [M.guests[1], 0.9, 8.2]];
        ppl.forEach(([r, x, z]) => { r.root.visible = true; r.root.position.set(WX + x, MY, WZ0 + z); r.mode = 'dance'; r.root.rotation.y = Math.atan2(-x, 7 - z); });
        const music = G.audio.loop('music', V(WX, MY + 1.5, WZ0 + 7));
        G.ui.say('Той! Той! Құтты болсын!', 'Қонақтар', 2.5, '#fc8');
        yield 4;
        this.jolt();
        music.stop();
        M.cakeTiers.forEach((c, i) => {
          c.visible = false;
          const wp = c.getWorldPosition(V());
          const p = G.props.spawn(cyl(c.geometry.parameters.radiusTop, c.geometry.parameters.radiusTop, c.geometry.parameters.height, 12, c.material), wp, V(rand(-0.6, 0.6), 1.5, 1.8 + i * 0.3), { kind: 'cake', r: 0.2, thrown: false });
          D2.after(25, () => G.props.remove(p));
        });
        yield 0.5; G.audio.crunch(M.cake.position, 0.8);
        ppl.forEach(([r]) => (r.mode = 'stare'));
        G.audio.setAmbient(0, 0.1);
        yield 1.5;
        let t = 0; while (t < 2.5) { t += G.dt; ppl.forEach(([r]) => faceP(r)); yield 0; } // they slowly turn to you
        Pl.scare(0.4);
        G.ui.say('...СЕН ИТЕРДІҢ БЕ?!', 'Күйеу жігіт', 3, '#fc8');
        yield 3;
        G.ui.say('Үш ай бойы жинаған ақшамыз еді...', 'Келін', 3, '#fcc');
        if (this.addAura) this.addAura(-400, 'ruined a wedding');
        G.audio.setAmbient(0.05, 1);
        this.achieve('m_cake');
        break;
      }
      case 'kaspi': {
        const nb = M.pax.reduce((a, r) => (r.root.position.distanceTo(Pl.pos) < a.root.position.distanceTo(Pl.pos) ? r : a), M.pax[0]);
        G.audio.beep(null, 1320, 0.1, 0.2, 'sine');
        G.ui.phone('Kaspi', 'Сізге 50 000 ₸ түсті 💸');
        yield 3;
        G.audio.beep(null, 1320, 0.1, 0.2, 'sine');
        G.ui.phone('Kaspi · Ерлан Б.', 'Бауырым, қате аударып жібердім 🙏 Қайтаршы өтінем');
        nb.mode = 'stare'; faceP(nb);
        yield 3.5;
        G.audio.beep(null, 1320, 0.1, 0.2, 'sine');
        G.ui.phone('Kaspi', 'Сіз 40 900 ₸ аудардыңыз → «Жылқы Т.» · Хабарлама: WHERE IS MY CART?');
        yield 3;
        nb.mode = 'idle'; G.ui.say('...бауырым, қайтарып жібер. Мен оның ағасымын.', 'Жолаушы', 3.5, '#ccc');
        this.achieve('m_kaspi');
        break;
      }
      case 'phone': {
        const r = M.pax[5]; r.mode = 'phone'; r.root.position.set(WX + 0.5, MY, WZ1 - 3.4); faceP(r);
        r.armR.add(M.phoneProp);
        yield 2.5;
        this.jolt();
        r.armR.remove(M.phoneProp);
        const ph = G.props.spawn(box(0.08, 0.015, 0.15, mat('#111')), r.root.position.clone().setY(MY + 1.2), V(0, 1, 0.5), { kind: 'phone', r: 0.03, thrown: false, onLand: (p) => { if (!p.cr) { p.cr = 1; G.audio.crunch(p.pos, 0.6); } } });
        this.after(20, () => G.props.remove(ph));
        yield 1.5;
        r.mode = 'stare'; faceP(r);
        G.ui.say('...СЕН ИТЕРДІҢ!', 'Жолаушы', 2.5, '#ccc');
        yield 2.6;
        G.ui.say('Жаңа телефон еді! НЕСИЕГЕ алғанмын! 24 айға!', 'Жолаушы', 3.5, '#ccc');
        r.mode = 'walk';
        let t = 0; while (t < 4) { t += G.dt; const d = Math.hypot(Pl.pos.x - r.root.position.x, Pl.pos.z - r.root.position.z); faceP(r); if (d > 1) { r.root.position.x += (Pl.pos.x - r.root.position.x) / d * 1.4 * G.dt; r.root.position.z += (Pl.pos.z - r.root.position.z) / d * 1.4 * G.dt; } yield 0; }
        r.mode = 'stare';
        if (this.addAura) this.addAura(-200, 'blamed for a phone');
        this.achieve('m_phone');
        break;
      }
      case 'zyp25': {
        const r = M.pax[2]; r.mode = 'walk';
        let t = 0; const target = Pl.pos.clone();
        while (t < 3.5) { t += G.dt; const d = Math.hypot(Pl.pos.x - r.root.position.x, Pl.pos.z - r.root.position.z); faceP(r); if (d > 1.1) { r.root.position.x += (Pl.pos.x - r.root.position.x) / d * 1.8 * G.dt; r.root.position.z += (Pl.pos.z - r.root.position.z) / d * 1.8 * G.dt; } else break; yield 0; }
        r.mode = 'stare';
        const chunks = ['Сәлем-бауырым-қалайсың-жақсысың-ба-мен-жақсымын-', 'бүгін-жұмыстан-шықтым-бастық-ақымақ-айлық-жоқ-', 'несие-бар-ипотека-бар-үйленемін-той-болады-', 'келесің-бе-келесің-ғой-бауырым-торт-болады-', 'метро-кешікті-автобус-кешікті-өмір-кешікті-', 'ал-сен-не-істейсің-мұнда-түнгі-үште-ЖАУАП-БЕР-'];
        G.audio.speak(chunks.join(' ').replace(/-/g, ' '), { pitch: 1.3, rate: 3.5 });
        for (const ch of chunks) { G.ui.say(ch, 'Зыпылдаған 25', 0.55, '#ff8'); yield 0.55; }
        G.audio.setAmbient(0, 0.05);
        yield 1.2;
        yield* this.lunge('pale', 8);
        G.audio.setAmbient(0.05, 1);
        r.mode = 'sit'; r.root.position.copy(r.home);
        this.achieve('m_zyp');
        break;
      }
    }
    M.evBusy = false;
  };

  // ---------------------------------------------------------------- quest text
  const origQuest = P.updateQuest;
  P.updateQuest = function () {
    const M = this.metro;
    if (M && M.active) {
      const st = STATIONS[M.level] || STATIONS[5];
      this.G.ui.quest(`<b>OBJECTIVE</b><br>Escape METRO 404: 5 stations, then the surface.<br><small>Now: ${M.level === 0 ? 'the exit hall' : `${6 - M.level}/5 · ${st.name}`}. No anomaly → forward to the train. Anomaly or monster → turn back.</small>`);
      return;
    }
    origQuest.call(this);
  };
}
