// Chapter 7: real location-bound screamers + location-bound memes.
//
// SCREAMERS (each lives in one place and happens once):
//   Kindergarten classroom: chalk writes "WHO IS STILL HERE?" ... "TURN AROUND" -> the Caretaker
//   Hidden basement: start the generator, the lights die, something breathes behind you -> the Crawler
//   Supermarket: the STAFF ONLY door at the back -> the Butcher
//   Bus stop: a poster whose eyes follow you -> it comes out of the poster
// A "lunge" screamer is a real 3D face that flies into the camera, with a distorted
// layered scream, red flash, glitch, FOV punch and ringing ears afterwards.
//
// MEMES (each lives in one place):
//   NVIDIA plaza: the RTX ON / RTX OFF button
//   Bus stop: a skeleton waiting for the 3 AM bus (and what happens when the bus finally comes)
//   Supermarket front: an abandoned shopping cart you can return (a heavenly reward)
import * as THREE from 'three';
import { makeHumanoid } from './characters.js';
import { makeShopCart, ACH } from './scenes2.js';
import { psx, basic, box, mat, canvasTex, textTex, rand, pick } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

Object.assign(ACH, {
  chalk: ['Detention', 'Read the chalkboard in the kindergarten'],
  crawler: ['Do Not Turn Around', 'Meet what lives in the basement'],
  butcher: ['Staff Only', 'Open the STAFF ONLY door'],
  poster: ['Eye Contact', 'Stare at the bus stop poster'],
  rtx: ['RTX ON', 'Press the RTX button'],
  waiting: ['Worth The Wait', 'See the skeleton finally catch the bus'],
  cart: ['Good Person', 'Return the shopping cart'],
});

// ------------------------------------------------------------------ 3D screamer faces
const SCARE = {
  caretaker: { skin: '#cbc8ba', dark: '#4a4840', eye: '#000', glint: '#fff', hair: null },
  crawler: { skin: '#7c8a72', dark: '#2e3a28', eye: '#000', glint: '#ff2020', hair: null },
  butcher: { skin: '#a8785e', dark: '#4a2a1e', eye: '#000', glint: '#ffe080', hair: null },
  poster: { skin: '#e4e2da', dark: '#8a8880', eye: '#000', glint: '#fff', hair: '#050505' },
};

function makeScareHead(kind) {
  const c = SCARE[kind] || SCARE.caretaker;
  const g = new THREE.Group();
  const M = (col) => { const m = new THREE.MeshBasicMaterial({ color: col, depthTest: false, fog: false }); return m; };
  const skin = M(c.skin), dark = M(c.dark), eye = M(c.eye), glint = M(c.glint), teeth = M('#e8e2c8'), gum = M('#3a0808');
  const add = (m, w, h, d, x, y, z, rz = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.z = rz; b.renderOrder = 1000; g.add(b); return b; };
  add(skin, 0.5, 0.78, 0.4, 0, 0.05, 0);
  add(skin, 0.56, 0.12, 0.42, 0, 0.32, 0.01);                       // brow ridge
  add(dark, 0.12, 0.2, 0.02, -0.19, -0.05, 0.205); add(dark, 0.12, 0.2, 0.02, 0.19, -0.05, 0.205); // hollow cheeks
  for (const s of [-1, 1]) {
    add(eye, 0.14, 0.12, 0.03, s * 0.12, 0.18, 0.205);
    add(glint, 0.025, 0.025, 0.02, s * 0.12, 0.18, 0.222);
    add(dark, 0.004, 0.18, 0.02, s * 0.2, 0.33, 0.21, s * 0.4);     // cracks
  }
  add(dark, 0.06, 0.05, 0.03, 0, 0.06, 0.21);                       // nose holes
  if (kind === 'butcher') { add(eye, 0.2, 0.18, 0.04, 0.12, 0.18, 0.21); add(glint, 0.05, 0.05, 0.02, 0.12, 0.18, 0.235); }
  if (kind === 'crawler') for (const s of [-1, 1]) { add(eye, 0.08, 0.06, 0.03, s * 0.2, 0.3, 0.205); add(glint, 0.02, 0.02, 0.02, s * 0.2, 0.3, 0.222); }
  // mouth + dropping jaw
  add(gum, 0.34, 0.12, 0.04, 0, -0.1, 0.2);
  for (let i = 0; i < 9; i++) add(teeth, 0.03, 0.06, 0.02, -0.14 + i * 0.035, -0.13, 0.222);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.16, 0); g.add(jaw);
  const jm = (m, w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.renderOrder = 1000; jaw.add(b); };
  jm(gum, 0.34, 0.3, 0.03, 0, -0.15, 0.2);
  jm(skin, 0.42, 0.14, 0.36, 0, -0.34, 0);
  for (let i = 0; i < 9; i++) jm(teeth, 0.03, 0.06, 0.02, -0.14 + i * 0.035, -0.26, 0.222);
  if (c.hair) {
    const hair = M(c.hair);
    add(hair, 0.62, 0.16, 0.46, 0, 0.46, -0.02);
    for (let i = 0; i < 7; i++) add(hair, 0.06, 0.9 + Math.random() * 0.3, 0.06, -0.3 + i * 0.1, -0.12, 0.17 + (i % 2) * 0.03).visible = i === 0 || i === 6 || i === 1 || i === 5;
  }
  g.userData.jaw = jaw;
  return g;
}

function drawBoard(ctx, text, n) {
  ctx.fillStyle = '#1c2a20'; ctx.fillRect(0, 0, 256, 120);
  ctx.strokeStyle = '#4a3a20'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, 256, 120);
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 30; i++) ctx.fillRect(Math.random() * 256, Math.random() * 120, 20, 2);
  ctx.fillStyle = '#e8e8e0'; ctx.font = 'bold 26px "Comic Sans MS", cursive, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, n), 128, 62);
}

function drawPoster(ctx, px, py, blank) {
  ctx.fillStyle = '#d8d0b8'; ctx.fillRect(0, 0, 128, 160);
  ctx.fillStyle = '#222'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
  ctx.fillText(blank ? '' : 'HAVE YOU SEEN ME?', 64, 18);
  if (!blank) {
    ctx.fillStyle = '#e8e4dc'; ctx.beginPath(); ctx.ellipse(64, 80, 34, 44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#080808'; ctx.fillRect(28, 40, 72, 16); ctx.fillRect(26, 50, 10, 70); ctx.fillRect(92, 50, 10, 70);
    for (const s of [-1, 1]) { ctx.fillStyle = '#fff'; ctx.fillRect(64 + s * 14 - 7, 72, 14, 8); ctx.fillStyle = '#000'; ctx.fillRect(64 + s * 14 - 2 + px, 73 + py, 4, 6); }
    ctx.fillStyle = '#300'; ctx.fillRect(56, 100, 16, 4);
  }
  ctx.fillStyle = '#222'; ctx.font = '10px monospace'; ctx.fillText(blank ? 'IT IS BEHIND YOU NOW' : 'last seen: here', 64, 152);
}

export function extendDirector7(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initChapter7(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateChapter7(dt); };
  const origScare = P.jumpscare;
  P.jumpscare = function (kind, dmg) {
    const before = this.lastScare;
    origScare.call(this, kind, dmg);
    if (this.lastScare !== before) { this.G.audio.bigScream(0.6); this.G.audio.tinnitus(2); }
  };
  const origGen = P.startGenerator;
  P.startGenerator = function (gen) {
    const wasOn = gen.on;
    origGen.call(this, gen);
    if (!wasOn && gen.pos.y < -10 && !this.c7.crawler) this.task(this.basementScareTask);
  };
  const origBus = P.busArrived;
  P.busArrived = function () { origBus.call(this); this.skeletonCatchesBus(); };

  P.initChapter7 = function () {
    const G = this.G, W = G.world;
    this.c7 = {};
    // --- kindergarten chalkboard (east middle classroom)
    const bc = document.createElement('canvas'); bc.width = 256; bc.height = 120;
    this.board = { ctx: bc.getContext('2d'), tex: new THREE.CanvasTexture(bc), pos: V(-18.4, 1.9, -30) };
    this.board.tex.colorSpace = THREE.SRGBColorSpace;
    drawBoard(this.board.ctx, '', 0); this.board.tex.needsUpdate = true;
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.5), mat('#ffffff', { map: this.board.tex, emissive: '#151515' }));
    bm.position.copy(this.board.pos); bm.rotation.y = -Math.PI / 2; G.scene.add(bm);
    // --- supermarket STAFF ONLY door (west wall, inside)
    const dx = W.market.X0 + 0.55;
    G.scene.add(box(0.06, 2.3, 1.3, basic('#000'), dx - 0.07, 1.15, 30, false));
    const door = new THREE.Group(); door.position.set(dx, 0, 29.4);
    door.add(box(0.06, 2.2, 1.2, mat('#3a3d38'), 0, 1.1, 0.6));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.22), basic('#fff', { map: textTex('STAFF ONLY', { w: 128, h: 36, bg: '#a01010', fg: '#fff', font: 'bold 22px monospace', glow: false }) }));
    sign.rotation.y = Math.PI / 2; sign.position.set(0.04, 1.75, 0.6); door.add(sign);
    G.scene.add(door); this.staffDoor = door;
    W.addInteract({ pos: V(dx + 0.3, 1.3, 30), r: 2.5, label: 'Open the STAFF ONLY door', enabled: () => !this.c7.butcher, act: () => this.task(this.staffDoorTask) });
    // --- bus stop poster with eyes that follow you
    const pc = document.createElement('canvas'); pc.width = 128; pc.height = 160;
    this.poster = { ctx: pc.getContext('2d'), tex: new THREE.CanvasTexture(pc), pos: V(9.93, 1.45, -46.8), t: 0 };
    this.poster.tex.colorSpace = THREE.SRGBColorSpace; this.poster.tex.magFilter = THREE.NearestFilter;
    drawPoster(this.poster.ctx, 0, 0, false); this.poster.tex.needsUpdate = true;
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.15), mat('#ffffff', { map: this.poster.tex, emissive: '#202020' }));
    pm.position.copy(this.poster.pos); pm.rotation.y = -Math.PI / 2; G.scene.add(pm);
    // --- RTX ON/OFF button at the NVIDIA plaza
    const con = new THREE.Group(); con.position.set(24.5, 0, -15.5); con.rotation.y = Math.PI / 4;
    con.add(box(0.8, 1.1, 0.5, mat('#1a1d1a'), 0, 0.55, 0));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), basic('#fff', { map: textTex('RTX: ON', { w: 128, h: 64, bg: '#020', fg: '#76ff03', font: 'bold 30px monospace' }) }));
    scr.position.set(0, 0.95, 0.26); con.add(scr);
    con.add(box(0.2, 0.08, 0.2, basic('#ff2020'), 0, 1.14, 0.05, false));
    G.scene.add(con); W.addCollider(24, 25, -16, -15, -1, 1.1);
    W.addInteract({ pos: V(24.5, 1.1, -15.5), r: 2.4, label: () => (this.c7.rtxBusy ? 'RTX is busy' : 'Press the big RTX button'), enabled: () => !this.c7.rtxBusy, act: () => this.task(this.rtxTask) });
    // --- skeleton waiting for the 3 AM bus
    const sk = this.busSkeleton = this.addNPC(makeHumanoid({ faceless: true, skin: '#e8e4d8', shirt: '#e8e4d8', pants: '#e8e4d8', fat: 0.62, hair: 'none', hat: 'cap', capColor: '#334' }),
      { pos: V(8.1, 0, -42.6), heading: -Math.PI / 2, ai: 'idle', name: 'Skeleton', color: '#eee', voice: { pitch: 0.3, rate: 0.75 } });
    sk.mem.noHorror = true;
    for (const s of [-1, 1]) sk.rig.head.add(box(0.08, 0.08, 0.02, basic('#000'), s * 0.075, 0.22, 0.163, false));
    const placard = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.32), basic('#fff', { map: textTex('WAITING FOR THE 3AM BUS', { w: 256, h: 150, bg: '#eee', fg: '#111', font: 'bold 24px monospace', glow: false }) }));
    placard.position.set(0, 0.35, 0.24); sk.rig.spine.add(placard);
    this.c7.skTalk = 0;
    W.addInteract({ pos: () => sk.pos.clone().setY(1.5), r: 2.4, label: 'Talk to the skeleton', enabled: () => !this.c7.waitingDone && !sk.removed, act: () => {
      const lines = ['...still waiting.', 'The schedule said 3 AM. It did not say which year.', 'I had skin when I got here. And a wife.', 'Do not worry. It is coming. Any minute now. Any... decade now.'];
      sk.say(lines[this.c7.skTalk++ % lines.length], 3.5);
    } });
    // --- abandoned shopping cart in front of the supermarket + the cart corral
    const cart = makeShopCart(); cart.position.set(-11, 0, 35.5); cart.rotation.y = 0.7; G.scene.add(cart);
    this.lostCart = cart;
    const rail = mat('#777');
    G.scene.add(box(0.06, 0.9, 2.4, rail, -8.2, 0.45, 38.5), box(0.06, 0.9, 2.4, rail, -9.4, 0.45, 38.5), box(1.26, 0.06, 0.06, rail, -8.8, 0.9, 37.3));
    const corralSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.35), basic('#fff', { map: textTex('RETURN CARTS HERE', { w: 256, h: 64, bg: '#0a3a6a', fg: '#fff', font: 'bold 22px monospace', glow: false }) }));
    corralSign.position.set(-8.8, 1.4, 37.25); corralSign.rotation.y = Math.PI; G.scene.add(corralSign);
    W.addInteract({ pos: () => cart.position.clone().setY(0.9), r: 2.4, label: 'Return the shopping cart', enabled: () => !this.c7.cart, act: () => this.task(this.cartReturnTask) });
  };

  // ================================================================ the lunge screamer
  /** A real 3D face that flies into the camera. */
  P.lunge = function* (kind, dmg = 0) {
    const G = this.G, Pl = G.player, cam = G.camera;
    if (Pl.hiding || G.state !== 'play') return;
    const head = makeScareHead(kind);
    head.position.set(rand(-0.15, 0.15), 0, -3.6); head.scale.setScalar(0.4);
    cam.add(head);
    G.audio.bigScream(1); G.audio.sting(0.5);
    G.ui.hurt(25); G.ui.glitch(1); Pl.shake = 1.1; Pl.scare(1);
    this.zoomTo(55, 0.9);
    let t = 0;
    while (t < 0.75) {
      t += G.dt;
      const k = Math.min(1, t / 0.14);
      head.position.z = -3.6 + (3.6 - 1.0) * k * k;   // stops where the whole face fills the screen
      head.scale.setScalar(0.4 + 0.6 * k);
      head.userData.jaw.position.y = -0.16 - k * 0.12 - Math.random() * 0.04;
      head.position.x = (Math.random() - 0.5) * 0.05 * k; head.position.y = 0.02 + (Math.random() - 0.5) * 0.05 * k;
      head.rotation.set((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.25);
      head.visible = t < 0.2 || Math.random() > 0.12;
      yield 0;
    }
    cam.remove(head);
    G.ui.glitch(0);
    if (dmg) Pl.damage(dmg, null, kind === 'caretaker' ? 'ghost' : 'fear');
    this.blackout = Math.max(this.blackout, 0.25);
    G.audio.tinnitus(3.5);
    this.repeat(5, 0.42, () => G.audio.heartbeat(0.8));
    if (this.stats) { this.stats.scares++; }
  };

  // ================================================================ KINDERGARTEN chalkboard
  P.inClassroom = function () { const p = this.G.player.pos; return p.y > -1 && p.x > -27.6 && p.x < -18.4 && p.z > -35.7 && p.z < -24.3; };
  P.chalkTask = function* () {
    const G = this.G, b = this.board;
    this.c7.chalk = true; this.eventsSeen++;
    G.audio.setAmbient(0, 1.5);
    yield 1.5;
    const write = function* (text, per) { for (let i = 1; i <= text.length; i++) { drawBoard(b.ctx, text, i); b.tex.needsUpdate = true; if (text[i - 1] !== ' ') G.audio.chalk(b.pos); yield per; } };
    yield* write('WHO IS STILL HERE?', 0.16);
    G.player.scare(0.25);
    yield 2;
    for (let i = 0; i < 6; i++) { G.audio.chalk(b.pos); yield 0.07; }
    drawBoard(b.ctx, '', 0); b.tex.needsUpdate = true;
    yield 0.8;
    yield* write('TURN AROUND', 0.09);
    this.setKgLights(false); yield 0.12; this.setKgLights(true); yield 0.2; this.setKgLights(false); yield 0.1; this.setKgLights(true);
    const west = V(-1, 0, 0), dir = V();
    let t = 0, away = 0;
    yield () => {
      t += G.dt; G.camera.getWorldDirection(dir);
      if (!this.lookingAt(b.pos, 0.3)) away += G.dt;
      return dir.dot(west) > 0.5 || away > 1.2 || t > 10 || !this.inClassroom();
    };
    yield* this.lunge('caretaker', 10);
    drawBoard(b.ctx, 'GOOD NIGHT :)', 13); b.tex.needsUpdate = true;
    this.achieve('chalk');
    yield 2;
    G.audio.setAmbient(this.horror ? 0.5 : 1, 3);
  };

  // ================================================================ BASEMENT crawler
  P.basementScareTask = function* () {
    const G = this.G, Pl = G.player;
    this.c7.crawler = true; this.eventsSeen++;
    yield 1.4;
    this.c7.basementDark = true; this.blackout = 5;
    G.audio.beep(null, 60, 0.6, 0.3, 'sawtooth'); G.audio.setAmbient(0, 0.5);
    G.ui.say('*the generator chokes. the lights die.*', '', 2.5);
    yield 2;
    const f = this.playerFwd();
    const breath = G.audio.loop('breath', Pl.pos.clone().addScaledVector(f, -1).setY(Pl.pos.y + 1));
    G.ui.say('...do not turn on the light...', '(a whisper, very close)', 2.5, '#888');
    G.audio.speak('do not turn on the light', { pitch: 0.2, rate: 0.6, volume: 0.6 });
    Pl.scare(0.5);
    yield 3;
    this.flashFlicker = 1.2; this.blackout = 0;
    yield 0.6;
    breath.stop();
    yield* this.lunge('crawler', 8);
    this.c7.basementDark = false;
    this.achieve('crawler');
    G.audio.setAmbient(this.horror ? 0.5 : 1, 3);
  };

  // ================================================================ SUPERMARKET staff door
  P.staffDoorTask = function* () {
    const G = this.G, d = this.staffDoor;
    this.c7.butcher = true; this.eventsSeen++;
    G.audio.beep(d.position, 90, 0.9, 0.2, 'sawtooth'); // creak
    G.audio.setAmbient(0, 0.5);
    let t = 0;
    while (t < 1) { t = Math.min(1, t + G.dt / 1.2); d.rotation.y = t * 1.3; yield 0; }
    G.ui.say('*it is completely dark in there*', '', 2);
    yield 1.6;
    G.audio.thud(d.position, 0.5);
    yield 0.5;
    yield* this.lunge('butcher', 10);
    d.rotation.y = 0; G.audio.thud(d.position, 1.2);
    this.achieve('butcher');
    yield 1.5;
    if (this.buddy && !this.buddy.removed && this.buddy.distToPlayer() < 20) this.buddy.say('WHAT WAS THAT?! ...I am going to pretend that was the delivery guy.', 3.5);
    G.audio.setAmbient(this.horror ? 0.5 : 1, 2);
  };

  // ================================================================ BUS STOP poster
  P.updatePoster = function (dt) {
    const G = this.G, Pl = G.player, p = this.poster;
    if (this.c7.poster) return;
    const d = Math.hypot(Pl.pos.x - p.pos.x, Pl.pos.z - p.pos.z);
    if (d > 16) return;
    p.t -= dt;
    if (p.t <= 0) {
      p.t = 0.1;
      // eyes follow the player (poster faces -x; "left/right" on the poster is along z)
      const px = Math.max(-3, Math.min(3, -(Pl.pos.z - p.pos.z) * 0.6));
      const py = Math.max(-1, Math.min(1, (Pl.pos.y + 1.6 - p.pos.y) * 0.8));
      drawPoster(p.ctx, px, py, false); p.tex.needsUpdate = true;
    }
    if (d < 2.3 && this.lookingAt(p.pos, 0.85)) {
      this.c7.poster = true; this.eventsSeen++;
      drawPoster(p.ctx, 0, 0, true); p.tex.needsUpdate = true;
      this.task(function* () { yield* this.lunge('poster', 6); this.achieve('poster'); });
    }
  };

  // ================================================================ MEME: RTX ON / OFF
  P.rtxTask = function* () {
    const G = this.G, fx = G.fx;
    this.c7.rtxBusy = true; this.eventsSeen++;
    G.audio.beep(null, 400, 0.15, 0.2, 'square');
    // RTX OFF
    G.rtxScale = 0.33; psx.snap.value = 26; if (fx) fx.setEnabled(false);
    G.ui.big('RTX OFF', 2.5, 'red');
    yield 1.5;
    if (this.buddy && !this.buddy.removed) this.buddy.say('My eyes... everything is made of LEGO. I am made of LEGO.', 3.5);
    yield 4.5;
    // RTX ON
    G.rtxScale = 1; psx.snap.value = 0; if (fx) fx.setEnabled(true);
    G.rtxBoost = true;
    G.ui.big('RTX ON ✨', 3, 'green'); G.audio.choir(2.5);
    if (G.fx) G.fx.emit(G.player.pos.clone().setY(1.5), 40, 'confetti');
    yield 1.5;
    if (this.buddy && !this.buddy.removed) this.buddy.say('I can see my own pores. I can see YOUR pores. Too much ray tracing.', 4);
    yield 5.5;
    G.rtxBoost = false; G.rtxScale = 1; psx.snap.value = G.settings.psx ? 120 : 0;
    if (fx) fx.setEnabled(G.settings.quality !== 'low');
    this.achieve('rtx');
    this.c7.rtxBusy = false;
  };

  // ================================================================ MEME: skeleton waiting for the bus
  P.skeletonCatchesBus = function () {
    const sk = this.busSkeleton, G = this.G;
    if (!sk || sk.removed || this.c7.waitingDone || sk.pos.distanceTo(G.world.spots.bench) > 12) return;
    this.c7.waitingDone = true; this.eventsSeen++;
    this.after(1.5, () => sk.say('...FINALLY!! FIFTY YEARS!!', 2.5, true));
    this.after(3.5, () => { sk.say('...oh no. I cannot feel my legs. I do not HAVE legs anymore.', 3); sk.fallFrom({ dir: 'forward', power: 2, lie: 1e9, getUp: false, silent: true }); });
    this.after(6, () => {
      G.audio.clank(sk.pos, 0.4);
      for (let i = 0; i < 7; i++) {
        const b = G.props.spawn(box(rand(0.08, 0.3), 0.06, 0.06, mat('#e8e4d8')), sk.pos.clone().add(V(rand(-0.4, 0.4), 0.4, rand(-0.4, 0.4))), V(rand(-2, 2), 2, rand(-2, 2)), { kind: 'bone', r: 0.05, thrown: false });
        this.after(60, () => G.props.remove(b));
      }
      this.hide(sk); sk.remove();
      G.ui.say('*the skeleton falls apart. the bus leaves without him.*', '', 3.5);
      this.achieve('waiting');
    });
  };

  // ================================================================ MEME: return the shopping cart
  P.cartReturnTask = function* () {
    const G = this.G, cart = this.lostCart, Pl = G.player;
    this.c7.cart = true; this.eventsSeen++;
    const from = cart.position.clone(), to = V(-8.8, 0, 38.6);
    let t = 0;
    while (t < 1) { t = Math.min(1, t + G.dt / 1.2); cart.position.lerpVectors(from, to, t); cart.rotation.y = 0.7 * (1 - t) + Math.PI * t; if (Math.random() < 0.3) G.audio.beep(cart.position, rand(300, 500), 0.04, 0.05, 'square'); yield 0; }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(Pl.pos.x, 20, Pl.pos.z); G.scene.add(beam);
    G.audio.choir(3.5);
    G.ui.big('+1000 KARMA', 3, 'green');
    if (G.fx) G.fx.emit(Pl.pos.clone().setY(1.5), 50, 'confetti');
    this.achieve('cart');
    t = 0;
    while (t < 4) { t += G.dt; beam.material.opacity = Math.min(0.35, t * 0.5) * (t > 3 ? (4 - t) : 1); beam.position.x = Pl.pos.x; beam.position.z = Pl.pos.z; yield 0; }
    G.scene.remove(beam);
    const witness = this.humans().find((n) => !n.rd && !n.hidden && n.distToPlayer() < 25);
    if (witness) witness.say('...they returned the cart. A real one. I thought they were extinct.', 4);
    else if (this.buddy && !this.buddy.removed) this.buddy.say('You returned the cart?! At 3 AM?! With monsters?! You are a hero.', 4);
  };

  // ================================================================ per-frame
  P.updateChapter7 = function (dt) {
    if (!this.c7.chalk && this.inClassroom() && !this.horrorRunning) this.task(this.chalkTask);
    if (this.c7.basementDark) this.basementLight.intensity = 0;
    this.updatePoster(dt);
  };
}
