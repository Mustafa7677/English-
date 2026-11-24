// Chapter 15: METRO 4090 — a separate meme-horror location (anomaly-loop genre; all content original).
// You are lost on underground floor B6 of the city metro. The passage loops forever.
// RULES: nothing strange -> keep walking forward. ANYTHING strange (an anomaly) -> turn back at once.
// Right choice: one floor up. Wrong choice: back to B6. Reach B0 to get to the surface.
// 17 anomalies: memes (horse commuter, the 67 crew, Buddy on the bench, banana peels, the cart),
// scary ones (faceless commuter, staring commuter, an eye behind the door, all posters become a face,
// red lights, the Manager rushing at you) and subtle ones (the bench is gone, the camera follows you,
// the ceiling is lower, the sign is wrong, footsteps behind you, one poster changed).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeHumanoid, pose } from './characters.js';
import { makeShopCart, ACH } from './scenes2.js';
import { faceTextures } from './scenes10.js';
import { mat, basic, box, cyl, facadeBox, canvasTex, rand, pick } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const MY = -120, H = 3.2, START_LEVEL = 5;
const ENTRANCE = V(-12, 0, -9.5); // metro entrance in the city (by the starting crossroads)
const ANOMALIES = ['faceless', 'backwards', 'stare', 'horse', 'poster', 'faces', 'red', 'door', 'crew67', 'ceiling',
  'bananas', 'sign', 'missing', 'manager', 'buddy', 'cart', 'cctv', 'steps'];

Object.assign(ACH, {
  metro: ['Surface', 'Escape METRO 404'],
  metroWrong: ['Missed It', 'Make a wrong choice in the metro'],
  metroPerfect: ['Eagle Eye', 'Escape the metro without a single mistake'],
});

function posterTex(title, sub, bg, fg) {
  return canvasTex(160, 112, (ctx) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 160, 112);
    ctx.fillStyle = fg; ctx.font = 'bold 20px Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(title, 80, 44);
    ctx.font = '11px monospace'; ctx.fillText(sub, 80, 70);
    ctx.strokeStyle = fg; ctx.lineWidth = 3; ctx.strokeRect(4, 4, 152, 104);
  });
}

export function extendDirector15(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initMetro(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateMetro(dt); };

  const origQuest = P.updateQuest;
  P.updateQuest = function () {
    if (this.metro && this.metro.active) {
      const M = this.metro;
      this.G.ui.quest(`<b>OBJECTIVE</b><br>Escape METRO 4090: reach <span class="g">B0</span>.<br><small>Now on ${M.level === 0 ? 'B0' : 'B' + M.level}. No anomaly: go forward. Anomaly: turn back. Read the RULES on the wall.</small>`);
      return;
    }
    origQuest.call(this);
  };

  P.initMetro = function () {
    const G = this.G, W = G.world;
    const M = this.metro = { active: false, level: START_LEVEL, anomaly: null, prev: null, mistakes: 0, done: false, loops: 0 };
    const root = M.root = new THREE.Group(); G.scene.add(root);
    // ---------------- walls (merged, white tiles)
    const tile = canvasTex(64, 64, (ctx) => {
      ctx.fillStyle = '#d8dcd6'; ctx.fillRect(0, 0, 64, 64); ctx.strokeStyle = '#9aa09a'; ctx.lineWidth = 2;
      for (let i = 0; i <= 64; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 64); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(64, i); ctx.stroke(); }
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(60,60,40,${Math.random() * 0.08})`; ctx.fillRect(Math.random() * 64, Math.random() * 64, 4, 4); }
    });
    tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
    const geos = [];
    const wall = (x0, x1, z0, z1) => {
      const w = Math.max(0.3, x1 - x0), d = Math.max(0.3, z1 - z0);
      const g = facadeBox(w, H, d, 2, 2); g.translate((x0 + x1) / 2, MY + H / 2, (z0 + z1) / 2); geos.push(g);
      W.addCollider((x0 + x1) / 2 - w / 2, (x0 + x1) / 2 + w / 2, (z0 + z1) / 2 - d / 2, (z0 + z1) / 2 + d / 2, MY - 1, MY + H + 1);
    };
    wall(-2.8, -2.5, -46, 1.5); wall(-2.8, -2.5, 4.5, 6);          // left wall (opening to the backward connector)
    wall(2.5, 2.8, -46, -44.5); wall(2.5, 2.8, -41.5, 6);          // right wall (opening to the forward connector)
    wall(-2.8, 2.8, 6, 6.3); wall(-2.8, 2.8, -46.3, -46);          // room A back wall, room B end wall
    wall(-7.3, -2.5, 1.2, 1.5); wall(-7.3, -2.5, 4.5, 4.8); wall(-7.6, -7.3, 1.2, 4.8);       // backward connector
    wall(2.5, 7.3, -44.8, -44.5); wall(2.5, 7.3, -41.5, -41.2); wall(7.3, 7.6, -44.8, -41.2); // forward connector
    root.add(new THREE.Mesh(mergeGeometries(geos), mat('#ffffff', { map: tile }))); geos.forEach((g) => g.dispose());
    const floorT = canvasTex(32, 32, (ctx) => { ctx.fillStyle = '#5a5c58'; ctx.fillRect(0, 0, 32, 32); for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.2})`; ctx.fillRect(Math.random() * 32, Math.random() * 32, 2, 2); } });
    floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(10, 30);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 60), mat('#ffffff', { map: floorT })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, MY + 0.01, -20); root.add(floor);
    root.add(box(0.18, 0.02, 46, basic('#c8a000'), -1.6, MY + 0.03, -20, false)); // tactile yellow line
    // ceiling + lights in a group (the "lower ceiling" anomaly moves it)
    const ceil = M.ceil = new THREE.Group(); root.add(ceil);
    const cp = new THREE.Mesh(new THREE.PlaneGeometry(20, 60), mat('#b8bcb4')); cp.rotation.x = Math.PI / 2; cp.position.set(0, MY + H, -20); ceil.add(cp);
    M.panelOn = basic('#f4fff4'); M.panelRed = basic('#ff2020');
    const pg = []; for (let z = 4; z >= -44; z -= 4) { const g = new THREE.BoxGeometry(0.5, 0.06, 2.2); g.translate(0, MY + H - 0.05, z); pg.push(g); }
    M.panels = new THREE.Mesh(mergeGeometries(pg), M.panelOn); ceil.add(M.panels); pg.forEach((g) => g.dispose());
    M.light = new THREE.PointLight(0xf0fff0, 0, 22, 1.3); G.scene.add(M.light);
    // ---------------- posters (left wall)
    M.posterBase = [
      posterTex('4090 COLA', 'now with 0% sleep', '#c01818', '#fff'),
      posterTex('VOTE HORSE', 'he wants his cart back', '#1a3a7a', '#ffd'),
      posterTex('NEVER SKIP', 'leg day · 4090 GYM', '#111', '#ffd020'),
      posterTex('LOST: 1 SOCK', 'blue. emotional. call 4090', '#e8e4d0', '#222'),
      posterTex('BRAINROT', 'ENERGY · +25% speed', '#0a2a0a', '#76ff03'),
    ];
    M.turnBack = posterTex('TURN BACK', 'TURN BACK TURN BACK', '#300', '#ff3030');
    M.cartPoster = posterTex('WHERE IS', 'MY CART?  — the horse', '#2a1408', '#ff8040');
    M.posters = [-6, -13, -20, -27, -34].map((z, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.12), new THREE.MeshBasicMaterial({ map: M.posterBase[i] }));
      m.position.set(-2.47, MY + 1.65, z); m.rotation.y = Math.PI / 2; root.add(m); return m;
    });
    // ---------------- doors (right wall)
    M.doors = [-10, -22, -34].map((z, i) => {
      const g = new THREE.Group(); g.position.set(2.42, MY, z - 0.55); root.add(g);
      g.add(box(0.06, 2.2, 1.1, mat('#2a4a3a'), 0, 1.1, 0.55));
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.18), basic('#fff', { map: posterTex(['STAFF', 'WC', 'NO ENTRY'][i], '', '#eee', '#222') }));
      lab.position.set(-0.04, 1.8, 0.55); lab.rotation.y = -Math.PI / 2; g.add(lab);
      return g;
    });
    root.add(box(0.02, 2.2, 1.1, basic('#000'), 2.485, MY + 1.1, -22, false)); // darkness behind door 2
    M.eye = new THREE.Group(); M.eye.position.set(2.465, MY + 1.6, -21.55);
    M.eye.add(box(0.02, 0.07, 0.12, basic('#f4f4f0'), 0, 0, 0, false), box(0.025, 0.05, 0.05, basic('#000'), -0.005, 0, 0, false));
    root.add(M.eye);
    // bench, extinguisher, CCTV
    M.bench = new THREE.Group(); M.bench.position.set(-2.1, MY, -15);
    M.bench.add(box(0.5, 0.06, 1.8, mat('#5a4a3a'), 0, 0.45, 0), box(0.08, 0.45, 0.08, mat('#333'), 0, 0.22, -0.8), box(0.08, 0.45, 0.08, mat('#333'), 0, 0.22, 0.8));
    root.add(M.bench);
    root.add(cyl(0.12, 0.12, 0.55, 8, mat('#c01010'), 2.25, MY + 0.4, -28));
    M.cctv = new THREE.Group(); M.cctv.position.set(2.1, MY + H - 0.35, -39);
    M.cctv.add(box(0.2, 0.18, 0.4, mat('#ddd'), 0, 0, 0.1), box(0.08, 0.08, 0.04, basic('#f22'), 0, 0, -0.12, false));
    root.add(M.cctv);
    // signs (redrawn every loop)
    const sc = document.createElement('canvas'); sc.width = 256; sc.height = 64; M.signCtx = sc.getContext('2d'); M.signTex = new THREE.CanvasTexture(sc);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: M.signTex })); sign.position.set(0, MY + 2.6, -1); root.add(sign);
    const ec = document.createElement('canvas'); ec.width = 256; ec.height = 64; M.exitCtx = ec.getContext('2d'); M.exitTex = new THREE.CanvasTexture(ec);
    const es = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: M.exitTex })); es.position.set(0, MY + 2.6, -40.2); es.rotation.y = 0; root.add(es);
    const rules = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.3), basic('#fff', { map: canvasTex(200, 172, (ctx) => {
      ctx.fillStyle = '#f2eedc'; ctx.fillRect(0, 0, 200, 172); ctx.fillStyle = '#a00'; ctx.font = 'bold 18px monospace'; ctx.fillText('RULES', 70, 24);
      ctx.fillStyle = '#111'; ctx.font = '11px monospace';
      ['1. If nothing is strange,', '   keep walking forward.', '2. If ANYTHING is strange,', '   turn back immediately.', '3. A wrong choice sends', '   you back to the 1st station.', '4. Reach the surface. Turn', '   back from ANY monster.'].forEach((l, i) => ctx.fillText(l, 10, 48 + i * 15));
    }) }));
    rules.position.set(2.46, MY + 1.6, 3); rules.rotation.y = -Math.PI / 2; root.add(rules);
    // stairs to the surface (only on B0)
    M.stairs = new THREE.Group(); M.stairs.position.set(5, MY, -43);
    for (let i = 0; i < 8; i++) M.stairs.add(box(0.5, 0.2 + i * 0.25, 3, mat('#777'), i * 0.3 - 1.5, (0.2 + i * 0.25) / 2, 0));
    M.stairs.visible = false; root.add(M.stairs);
    // ---------------- actors for the anomalies
    M.commuter = makeHumanoid({ suit: true, shirt: '#2a2a33', pants: '#22222a', hair: 'short', glasses: true });
    M.commuter.armR.add(box(0.1, 0.32, 0.4, mat('#3a2a1a'), 0, -0.8, 0.05));
    M.faceless = makeHumanoid({ suit: true, shirt: '#2a2a33', pants: '#22222a', faceless: true, skin: '#e2e0d6', hair: 'short' });
    M.horse = makeHumanoid({ horse: true, skin: '#5a3418', suit: true, shirt: '#2a2a33', pants: '#22222a' });
    [M.commuter, M.faceless, M.horse].forEach((r) => { r.root.visible = false; root.add(r.root); });
    M.crew = [0, 1, 2, 3].map((i) => { const r = makeHumanoid({ outfit: 'hoodie', hair: pick(['buzz', 'mohawk', 'short']) }); r.root.position.set(-1.2 + i * 0.8, MY, -19 - (i % 2) * 0.7); r.root.visible = false; root.add(r.root); return r; });
    M.buddy = makeHumanoid({ shirt: '#e0e0e0', pants: '#2a4a2a', hat: 'cap', capColor: '#2a8a2a', fat: 1.05, outfit: 'tshirt' });
    for (let k = 0; k < 3; k++) pose(M.buddy, 'sit', 1, 0, 0);
    M.buddy.root.position.set(-2.1, MY, -15); M.buddy.root.rotation.y = Math.PI / 2; M.buddy.root.visible = false; root.add(M.buddy.root);
    M.cart = makeShopCart(); M.cart.visible = false; root.add(M.cart);
    M.peels = [];
    for (let i = 0; i < 12; i++) { const p = box(0.32, 0.03, 0.16, mat('#f2d21b'), rand(-2, 2), MY + 0.02, rand(-36, -8), false); p.rotation.y = rand(0, 6); p.visible = false; root.add(p); M.peels.push(p); }
    M.mgr = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.7), new THREE.MeshBasicMaterial({ map: this.zone.mgrTex, transparent: true, side: THREE.DoubleSide }));
    M.mgr.visible = false; root.add(M.mgr);
    M.faceTex = faceTextures('pale')[0];
    // ---------------- the entrance in the city
    const ent = new THREE.Group(); ent.position.copy(ENTRANCE);
    ent.add(box(3.2, 0.9, 0.2, mat('#3a3d40'), 0, 0.45, -1.6), box(0.2, 0.9, 3.2, mat('#3a3d40'), -1.6, 0.45, 0), box(0.2, 0.9, 3.2, mat('#3a3d40'), 1.6, 0.45, 0));
    ent.add(box(3, 0.05, 3, basic('#050505'), 0, 0.06, 0, false));
    for (let i = 0; i < 5; i++) ent.add(box(2.8, 0.05, 0.4, mat('#555'), 0, 0.04 - i * 0.002, -1 + i * 0.5, false));
    const msign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), basic('#fff', { map: posterTex('METRO 404', '↓ PLATFORMS ↓', '#0a2a5a', '#ffcc00') }));
    msign.position.set(0, 2.6, 1.7); msign.rotation.y = Math.PI; ent.add(msign);
    ent.add(cyl(0.05, 0.05, 2.6, 6, mat('#555'), 0.7, 1.3, 1.7), cyl(0.05, 0.05, 2.6, 6, mat('#555'), -0.7, 1.3, 1.7));
    // METRO 404 is a separate map now (chosen on the map select screen), so the city has no entrance to it
    W.addInteract({ pos: V(-2.4, MY + 1.4, 3), r: 2.2, label: 'Give up: back to the map select', enabled: () => M.active, act: () => location.reload() });
    M.hud = document.getElementById('metrohud');
  };

  // ---------------------------------------------------------------- loop management
  P.metroReset = function () {
    const M = this.metro, G = this.G;
    M.posters.forEach((p, i) => { p.material.map = M.posterBase[i]; p.material.needsUpdate = true; });
    M.panels.material = M.panelOn; M.light.color.set(0xf0fff0);
    M.ceil.position.y = 0;
    M.doors[1].rotation.y = 0; M.eye.visible = false;
    M.bench.visible = true;
    [M.faceless, M.horse, M.buddy.root ? M.buddy : null].forEach((r) => r && (r.root.visible = false));
    M.crew.forEach((r) => (r.root.visible = false));
    M.cart.visible = false; M.peels.forEach((p) => (p.visible = false));
    M.mgr.visible = false; M.mgrState = null;
    if (M.mgrMusic) { M.mgrMusic.stop(); M.mgrMusic = null; }
    M.cctv.rotation.set(0, 0, 0);
    M.walker = M.commuter; M.walker.root.visible = true; M.walkZ = -38; M.walkMode = 'walk';
    M.stairs.visible = M.level === 0;
    M.doorScared = false; M.crewChant = 0; M.stepsT = 4;
    this.drawMetroSigns(false);
    this.peels = (this.peels || []).filter((p) => !p.metro);
  };

  P.drawMetroSigns = function (wrong) {
    const M = this.metro;
    const draw = (ctx, tex, text, color) => {
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = color; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.fillText(text, 128, 44); tex.needsUpdate = true;
    };
    const lvl = M.level === 0 ? 'B0 SURFACE' : `B${M.level}`;
    draw(M.signCtx, M.signTex, wrong ? `B${M.level} B${M.level} B̷${M.level}` : lvl, '#ffcc00');
    draw(M.exitCtx, M.exitTex, wrong ? '← ← EXIT ← ←' : M.level === 0 ? '→ SURFACE ↑' : `→ EXIT  ${lvl}`, wrong ? '#ff4040' : '#30ff60');
  };

  P.metroNewLoop = function () {
    const M = this.metro;
    M.loops++;
    let a = null;
    if (M.level < START_LEVEL && M.level > 0 && Math.random() < 0.55) { do { a = pick(ANOMALIES); } while (a === M.prev); }
    M.anomaly = a; M.prev = a || M.prev;
    this.metroReset();
    if (a) this.applyAnomaly(a);
  };

  P.applyAnomaly = function (a) {
    const M = this.metro, G = this.G;
    switch (a) {
      case 'faceless': M.walker.root.visible = false; M.walker = M.faceless; M.walker.root.visible = true; break;
      case 'horse': M.walker.root.visible = false; M.walker = M.horse; M.walker.root.visible = true; break;
      case 'backwards': M.walkMode = 'backwards'; break;
      case 'stare': M.walkMode = 'stare'; break;
      case 'poster': { const p = pick(M.posters); p.material.map = Math.random() < 0.5 ? M.turnBack : M.cartPoster; p.material.needsUpdate = true; break; }
      case 'faces': M.posters.forEach((p) => { p.material.map = M.faceTex; p.material.needsUpdate = true; }); break;
      case 'red': M.panels.material = M.panelRed; M.light.color.set(0xff3020); break;
      case 'door': M.doors[1].rotation.y = -0.4; M.eye.visible = true; break;
      case 'crew67': M.crew.forEach((r) => (r.root.visible = true)); M.walker.root.visible = false; break;
      case 'ceiling': M.ceil.position.y = -0.9; break;
      case 'bananas': M.peels.forEach((p) => { p.visible = true; this.peels.push({ pos: p.getWorldPosition(V()), mesh: p, metro: true }); }); break;
      case 'sign': this.drawMetroSigns(true); break;
      case 'missing': M.bench.visible = false; break;
      case 'manager': M.mgr.visible = true; M.mgr.position.set(0, MY + 1.45, -43); M.mgrState = 'wait'; M.walker.root.visible = false; break;
      case 'buddy': M.buddy.root.visible = true; M.buddyTalked = false; break;
      case 'cart': M.cart.visible = true; M.cart.position.set(1, MY, -30); break;
      case 'cctv': M.cctvFollow = true; break;
      case 'steps': M.stepsT = 3; break;
    }
    if (a !== 'cctv') M.cctvFollow = false;
  };

  // ---------------------------------------------------------------- enter / leave / transitions
  P.metroEnterTask = function* () {
    const G = this.G, M = this.metro, Pl = G.player, L = G.lighting;
    if (M.active) return;
    G.ui.fade(1, 0.4); G.audio.step(0.3); yield 0.25; G.audio.step(0.3); yield 0.3;
    M.active = true; M.level = START_LEVEL; M.mistakes = 0; M.prev = null;
    M.saved = { fog: L.fog.color.clone(), density: L.fog.density, hemi: L.hemi.intensity };
    L.fog.color.set('#0e1214'); L.fog.density = 0.02; L.moon.visible = false; L.hemi.intensity = 0.5;
    M.buzz = G.audio.loop('buzz', null); G.audio.setAmbient(0.05, 0.5);
    this.metroNewLoop();
    Pl.pos.set(0, MY, 3); Pl.vel.set(0, 0, 0); Pl.yaw = 0; Pl.pitch = 0;
    if (this.buddy && !this.buddy.removed) { this.buddy.pos.set(-1, MY, 4.5); }
    yield 0.2;
    G.ui.fade(0, 1);
    G.ui.big('METRO 404', 3, 'clock');
    G.ui.toast('Read the RULES on the wall. Nothing strange: go forward. Anything strange: turn back.');
    M.hud.classList.remove('hidden');
  };

  P.metroShutdown = function () {
    const G = this.G, M = this.metro, L = G.lighting;
    M.active = false; M.hud.classList.add('hidden');
    if (M.saved) { L.fog.color.copy(M.saved.fog); L.fog.density = M.saved.density; L.hemi.intensity = M.saved.hemi; }
    L.moon.visible = true; M.light.intensity = 0;
    if (M.buzz) { M.buzz.stop(); M.buzz = null; }
    if (M.mgrMusic) { M.mgrMusic.stop(); M.mgrMusic = null; }
    this.peels = (this.peels || []).filter((p) => !p.metro);
    G.audio.setAmbient(this.horror ? 0.5 : 1, 1.5);
    const b = this.buddy;
    if (b && !b.removed && M.hidBuddy) { M.hidBuddy = false; b.pos.set(ENTRANCE.x + 1.5, 0, ENTRANCE.z + 3.5); this.show(b); }
    if (!this.buddy && G.startMode === 'metro') this.after(6, () => { if (!this.buddy) this.spawnBuddy(); });
    this.after(0.1, () => this.updateQuest());
  };

  P.metroLeaveTask = function* () {
    const G = this.G, Pl = G.player;
    G.ui.fade(1, 0.4); yield 0.5;
    this.metroShutdown();
    Pl.pos.set(ENTRANCE.x, 0, ENTRANCE.z + 3); Pl.yaw = Math.PI; Pl.vel.set(0, 0, 0);
    if (this.buddy && !this.buddy.removed) this.buddy.pos.set(ENTRANCE.x + 1.5, 0, ENTRANCE.z + 3.5);
    yield 0.2; G.ui.fade(0, 1);
  };

  P.metroTransition = function* (direction) {
    const G = this.G, M = this.metro, Pl = G.player;
    if (M.busy) return;
    M.busy = true;
    const hadAnomaly = !!M.anomaly;
    const correct = direction === 'back' ? hadAnomaly : !hadAnomaly;
    G.ui.fade(1, 0.25); yield 0.3;
    if (M.level === 0 && direction === 'forward' && G.map === 'metro') { // escaped the metro map
      M.done = true; M.busy = false;
      this.achieve('metro'); if (!M.mistakes) this.achieve('metroPerfect');
      if (this.addAura) this.addAura(2000, 'escaped the metro');
      G.audio.choir(3);
      this.metroMapWin();
      return;
    }
    if (M.level === 0 && direction === 'forward') { // the surface!
      this.metroShutdown();
      Pl.pos.set(ENTRANCE.x, 0, ENTRANCE.z + 3); Pl.yaw = Math.PI;
      M.done = true; M.busy = false;
      yield 0.2; G.ui.fade(0, 1.5);
      G.ui.big('YOU ESCAPED METRO 404', 4, 'green'); G.audio.choir(3);
      this.achieve('metro'); if (!M.mistakes) this.achieve('metroPerfect');
      if (this.addAura) this.addAura(2000, 'escaped the metro');
      return;
    }
    if (correct) { M.level = Math.max(0, M.level - 1); if (this.metroRide) yield* this.metroRide(M.level); }
    else {
      M.mistakes++; M.level = START_LEVEL; M.freshStart = true; this.achieve('metroWrong');
      G.audio.sting(0.4);
      if (this.addAura) this.addAura(-150, 'missed an anomaly');
    }
    this.metroNewLoop();
    Pl.pos.set(0, MY, 3); Pl.vel.set(0, 0, 0); Pl.yaw = 0;
    yield 0.15;
    G.ui.fade(0, 0.6);
    G.ui.big(correct ? (this.stationTitle ? this.stationTitle(M.level) : `B${M.level}`) : 'WRONG. BACK TO RAIYMBEK BATYR.', 2.6, correct ? 'clock' : 'red');
    M.busy = false;
  };

  // ---------------------------------------------------------------- per frame
  P.updateMetro = function (dt) {
    const G = this.G, M = this.metro, Pl = G.player;
    if (!M.active) return;
    if (Pl.pos.y > -90) { this.metroShutdown(); return; }
    M.light.position.set(Pl.pos.x, MY + 2.6, Pl.pos.z); M.light.intensity = 9;
    this.timeAway = (this.timeAway || 0) + dt;
    const b = this.buddy;
    if (b && !b.removed && !b.hidden) { this.hide(b); M.hidBuddy = true; }
    if (G.frame % 20 === 0) this.updateQuest();
    M.hud.innerHTML = `<b>METRO 4090 · FLOOR ${M.level === 0 ? 'B0 (SURFACE)' : 'B' + M.level}</b> · mistakes ${M.mistakes}<br><small>Nothing strange → forward · Anything strange → turn back</small>`;
    // transitions
    if (!M.busy) {
      if (Pl.pos.x < -4.6 && Pl.pos.z > 1.2 && Pl.pos.z < 4.8) this.task(function* () { yield* this.metroTransition('back'); });
      else if (Pl.pos.x > 4.6 && Pl.pos.z < -41.2 && Pl.pos.z > -44.8) this.task(function* () { yield* this.metroTransition('forward'); });
    }
    // the commuter
    const w = M.walker;
    if (w && w.root.visible) {
      if (M.walkMode === 'stare' && M.walkZ > -24) {
        w.root.position.set(1.3, MY, M.walkZ);
        w.root.rotation.y = Math.atan2(Pl.pos.x - 1.3, Pl.pos.z - M.walkZ);
        pose(w, 'stare', dt, G.time, 0);
      } else {
        M.walkZ += 1.15 * dt;
        if (M.walkZ > 0) M.walkZ = -38;
        w.root.position.set(1.3, MY, M.walkZ);
        w.root.rotation.y = M.walkMode === 'backwards' ? Math.PI : 0;
        w.phase += dt * (M.walkMode === 'backwards' ? -4.3 : 4.3);
        pose(w, 'walk', dt, G.time, 1.15);
      }
    }
    // anomaly behaviours
    const a = M.anomaly;
    if (a === 'crew67') {
      M.crew.forEach((r) => pose(r, 'sixseven', dt, G.time, 0));
      if (Pl.pos.z < -12 && G.time - M.crewChant > 6) { M.crewChant = G.time; G.ui.say('...six... seven...', '67 Crew', 2.5, '#fd6'); G.audio.speak('six. seven.', { pitch: 0.5, rate: 0.6 }); }
    }
    if (a === 'door' && !M.doorScared && Pl.pos.x > 0.6 && Math.abs(Pl.pos.z + 22) < 2.2) {
      M.doorScared = true;
      this.task(function* () { yield* this.lunge('pale', 8); });
    }
    if (a === 'buddy' && !M.buddyTalked && Pl.pos.z < -10) {
      M.buddyTalked = true;
      G.ui.say("HEY!! There you are! I've been walking this corridor for three days. Is that... normal?", 'Buddy?', 4.5, '#7f7');
    }
    if (a === 'cart') {
      const c = M.cart, d = Math.hypot(Pl.pos.x - c.position.x, Pl.pos.z - c.position.z);
      if (d > 1.6 && !this.lookingAt(c.position.clone().setY(MY + 0.8), 0.4)) {
        c.position.x += (Pl.pos.x - c.position.x) / d * 2 * dt; c.position.z += (Pl.pos.z - c.position.z) / d * 2 * dt;
        c.rotation.y = Math.atan2(Pl.pos.x - c.position.x, Pl.pos.z - c.position.z);
      }
    }
    if (M.cctvFollow) M.cctv.rotation.y = Math.atan2(Pl.pos.x - M.cctv.position.x, Pl.pos.z - M.cctv.position.z) + Math.PI;
    if (a === 'steps') {
      M.stepsT -= dt;
      if (M.stepsT <= 0) { M.stepsT = rand(2.5, 4); const f = this.playerFwd(); for (let i = 0; i < 3; i++) setTimeout(() => G.audio.thud(Pl.pos.clone().addScaledVector(f, -3 + i * 0.4).setY(MY + 0.1), 0.35), i * 380); }
    }
    if (a === 'manager') {
      const mm = M.mgr;
      mm.lookAt(G.camera.position.x, mm.position.y, G.camera.position.z);
      if (M.mgrState === 'wait' && Pl.pos.z < -14) { M.mgrState = 'rush'; M.mgrMusic = G.audio.loop('nextbot', mm.position); G.ui.say('YOU ARE LATE FOR YOUR TRAIN.', 'THE MANAGER', 2.5, '#ffd040'); }
      if (M.mgrState === 'rush') {
        const dx = Pl.pos.x - mm.position.x, dz = Pl.pos.z - mm.position.z, d = Math.hypot(dx, dz);
        mm.position.x += dx / d * 6.9 * dt; mm.position.z += dz / d * 6.9 * dt;
        M.mgrMusic.setPos(mm.position);
        if (d < 1.1) {
          M.mgrState = 'done'; mm.visible = false; M.mgrMusic.stop(); M.mgrMusic = null;
          this.task(function* () {
            yield* this.lunge('caretaker', 20);
            M.mistakes++; M.level = START_LEVEL;
            G.ui.big('CAUGHT. BACK TO RAIYMBEK BATYR.', 2.5, 'red');
            this.metroNewLoop(); Pl.pos.set(0, MY, 3); Pl.yaw = 0;
          });
        }
      }
    }
  };
}
