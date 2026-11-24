// Chapter 22: the horror of the night train — the faceless NIGHT CONDUCTOR.
// The memes stay exactly as they are in their videos. Between them, the train itself is haunted. Something rides
// it at night: a tall conductor in a dark uniform, with no face and two red eyes. He shows up in fixed places, and
// every time he is closer:
//   wagon 7   a knock on the door behind you... a face in its window
//   Жібек жолы  he stands on the platform. Every time the light blinks, he is nearer to your door
//   wagon 9→10  «Саспа, бауырым...» says a passenger. The lights die. He is in the doorway. SCREAMER
//   wagon 11  a face outside the window, running along with the train at full speed. BANG on the glass
//   wagon 13  Туннель 404: the train stops in the dark. Red light. Every passenger turns to look at you. He walks
//             in from the back. RUN to the next wagon (caught: SCREAMER, this wagon starts again)
//   wagon 17→18  the lights go out behind you, wagon by wagon. The dark is coming. RUN
//   the cab   the driver turns around. FINAL SCREAMER
// While he is busy, memes wait; while a meme plays, he waits. Never two things at once.
import * as THREE from 'three';
import { makeHumanoid, pose } from './characters.js';
import { ACH } from './scenes2.js';
import { faceTextures } from './scenes10.js';
import { TRAIN } from './scenes20.js';

const { MY, TX, WL, WP, NW, CAB0, CAB1, DOORS } = TRAIN;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const zBack = (k) => -k * WP, zFront = (k) => -k * WP - WL;
const L = (k, l) => -k * WP - l;
const $ = (id) => document.getElementById(id);

Object.assign(ACH, {
  h_knock: ['Who Is There?', 'Look back at the knocking door'],
  h_tunnel: ['Туннель 404', 'Escape the night conductor in the dark tunnel'],
  h_dark: ['Outran The Dark', 'Escape the darkness in the train'],
  h_driver: ['The Driver', 'Meet the one who drives this train'],
});

function makeConductor() {
  const r = makeHumanoid({ faceless: true, eyesGlow: '#ff2010', suit: true, shirt: '#141a2e', pants: '#10141f', hat: 'cap', capColor: '#141a2e', skin: '#cfcfc6', scale: 1.16 });
  r.spine.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0xc8a040 }))); // a badge
  r.spine.children[r.spine.children.length - 1].position.set(0.11, 0.3, 0.16);
  r.root.visible = false;
  return r;
}
function facePlane(w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: faceTextures('pale')[0], transparent: true, depthWrite: false, fog: false }));
  m.visible = false; m.renderOrder = 5;
  return m;
}

export function extendDirector22(D) {
  const P = D.prototype;

  // ================================================================ BUILD
  const origActors = P.buildTrainActors;
  P.buildTrainActors = function () {
    origActors.call(this);
    const T = this.train;
    const H = T.horror = { done: {}, danger: false, caught: false, tick: null };
    H.cond = makeConductor(); T.group.add(H.cond.root);
    H.doorFace = facePlane(0.44, 0.55); H.doorFace.position.set(0, 1.45, -0.045); H.doorFace.rotation.y = Math.PI; T.doors[5].leaf.add(H.doorFace);
    H.winFace = facePlane(0.55, 0.68); H.winFace.rotation.y = Math.PI / 2; T.group.add(H.winFace);
  };

  const origReset = P.resetTrain;
  P.resetTrain = function () {
    origReset.call(this);
    const T = this.train, H = T.horror;
    if (!H) return;
    H.done = {}; H.danger = false; H.caught = false; H.tick = null;
    H.cond.root.visible = false; if (H.cond.root.parent !== T.group) T.group.attach(H.cond.root);
    H.doorFace.visible = false; H.winFace.visible = false;
    T.driver.visible = true; T.driver.rotation.y = Math.PI;
  };

  // ================================================================ helpers
  P.hShow = function (pos, faceTo) { // put the conductor somewhere (train coordinates), facing a point
    const c = this.train.horror.cond;
    if (c.root.parent !== this.train.group) this.train.group.attach(c.root);
    c.root.visible = true; c.root.position.copy(pos); c.mode = 'stare'; c.spd = 0;
    if (faceTo) c.root.rotation.set(0, Math.atan2(faceTo.x - pos.x, faceTo.z - pos.z), 0);
    for (let i = 0; i < 3; i++) pose(c, 'stare', 1, 0, 0);
  };
  P.hHide = function () { this.train.horror.cond.root.visible = false; };

  /** Caught: a screamer, then this wagon starts again. */
  P.hCaught = function (kind, dmg, msg, respawn) {
    const G = this.G, H = this.train.horror, M = this.metro, Pl = G.player;
    if (H.caught) return;
    H.caught = true; H.danger = false; M.lastCatch = 'conductor';
    this.task(function* () {
      yield* this.lunge(kind, dmg);
      if (Pl.dead) return;
      M.mistakes++;
      G.ui.fade(1, 0.3); yield 0.4;
      respawn();
      Pl.vel.set(0, 0, 0); Pl.yaw = 0; Pl.pitch = 0; Pl.downT = 0;
      yield 0.2; G.ui.fade(0, 0.7);
      G.ui.big(msg, 2.2, 'red');
      this.after(1.2, () => G.ui.toast('This wagon starts again. RUN to the next wagon!'));
      H.caught = false; H.danger = true;
    });
  };

  // ================================================================ the events
  // wagon 7 — a knock on the door behind you; a face in its window
  P.hKnock = function* () {
    const G = this.G, T = this.train, H = T.horror, d = T.doors[5], fp = V();
    const knock = () => G.audio.thud(V(TX, MY + 1.3, zFront(5)), 0.9);
    knock(); yield 0.4; knock(); yield 0.4; knock();
    G.ui.say('(someone is knocking on the door behind you)', '', 3);
    H.doorFace.visible = true;
    let t = 0, seen = false;
    while (t < 5 && d.open < 0.15) {
      t += G.dt;
      H.doorFace.getWorldPosition(fp);
      if (this.lookingAt(fp, 0.93)) { seen = true; break; }
      yield 0;
    }
    if (seen) {
      G.audio.sting(0.6); G.player.scare(0.6); G.player.shake = 0.6; this.achieve('h_knock');
      yield 0.8;
    }
    H.doorFace.visible = false;
    if (!seen) { yield 0.3; G.ui.say('...артыңа қарама. (...don\'t look back.)', '(a whisper)', 2.6, '#9cf'); }
  };

  // Жібек жолы — he stands on the platform; every time the light blinks, he is closer to your door
  P.hWatcher = function* () {
    const G = this.G, T = this.train, H = T.horror, c = H.cond, Pl = G.player;
    const local = (wz) => wz - T.plat.position.z;
    T.plat.attach(c.root); c.root.visible = true; c.mode = 'stare';
    const steps = [[TX + 6.4, 19], [TX + 5.0, 10], [TX + 3.8, 4]];
    const look = () => { const wz = c.root.position.z + T.plat.position.z; c.root.rotation.y = Math.atan2(Pl.pos.x - c.root.position.x, Pl.pos.z - wz); };
    c.root.position.set(steps[0][0], MY, steps[0][1]); look();
    G.ui.say('(on the platform: a conductor. He has no face.)', '', 3.2);
    G.audio.infrasound(5, 0.4);
    for (let i = 1; i < steps.length; i++) {
      yield 1.8;
      if (T.phase !== 'stopped') break;
      T.flick = 0.35; G.audio.beep(null, 110, 0.12, 0.12, 'square');
      yield 0.18;
      c.root.position.set(steps[i][0], MY, steps[i][1]); look();
    }
    // the last blink: right outside the door nearest to you (not the one Otanbas uses)
    yield 1.6;
    if (T.phase === 'stopped') {
      const k = Math.max(0, Math.min(NW - 1, Math.floor(-Pl.pos.z / WP)));
      const dz = [DOORS[0], DOORS[2]].map((l) => L(k, l)).sort((a, b) => Math.abs(a - Pl.pos.z) - Math.abs(b - Pl.pos.z))[0];
      T.flick = 0.35; yield 0.18;
      c.root.position.set(TX + 2.15, MY, local(dz)); look();
      G.audio.sting(0.45); Pl.scare(0.5);
    }
    yield () => T.phase === 'go' || T.phase === 'run';
    yield () => !T.plat.visible;
    c.root.visible = false; T.group.attach(c.root);
  };

  // wagon 9→10 — «Саспа, бауырым...» The lights die. He is in the doorway.
  P.hSaspa = function* () {
    const G = this.G, T = this.train, H = T.horror, C = T.cast, d = T.doors[8];
    yield this.mSay(C.saspaGuy, 'Жолаушы', 'Саспа, бауырым... (Don\'t panic, bro...)', '#ccc', 2.4);
    this.collectMeme('saspa');
    yield 0.6;
    d.force = 1; G.audio.whoosh(0.2);
    yield 0.6;
    T.dark = true; G.audio.beep(null, 55, 0.5, 0.25, 'sawtooth');
    this.hShow(V(TX, MY, zFront(8) - 0.5), G.player.pos);
    yield 0.5;
    T.flash = 0.2; G.audio.reverseWhisper(V(TX, MY + 1.7, zFront(8)), 0.5);
    yield 0.25;
    yield* this.lunge('pale', 8);
    this.hHide(); T.dark = false; d.force = undefined;
  };

  // wagon 11 — a face outside the window, running along with the train
  P.hWindow = function* () {
    const G = this.G, T = this.train, H = T.horror, f = H.winFace, Pl = G.player;
    let t = 0;
    f.visible = true;
    while (t < 2.6) {
      t += G.dt;
      f.position.set(TX - 1.67, MY + 1.5 + Math.abs(Math.sin(t * 9)) * 0.05, Pl.pos.z - 2.6); // ahead on your left, where you can see it
      if (Math.random() < G.dt * 4) G.audio.thud(f.position, 0.15);
      yield 0;
    }
    G.audio.thud(f.position, 1); G.audio.crunch(f.position, 0.5); G.audio.sting(0.5);
    G.player.shake = 0.9; G.player.scare(0.6);
    G.ui.say('(something is running beside the train. Outside. At 60 km/h.)', '', 3.4);
    t = 0;
    while (t < 0.7) { t += G.dt; f.position.z += 30 * G.dt; yield 0; } // it falls behind
    f.visible = false;
  };

  // wagon 13 — Туннель 404: the train stops in the dark. Red light. He walks in from the back. RUN.
  P.hTunnel = function* () {
    const G = this.G, T = this.train, H = T.horror, C = T.cast, Pl = G.player, k = 12, c = H.cond;
    G.audio.beep(null, 660, 0.3, 0.2, 'triangle');
    G.ui.say('Келесі бекет — Т̷у̷ннель 4̷0̷4̷.', '📢 Пойыз', 3, '#f88'); G.audio.speak('Next station: tunnel. four. zero. four.', { pitch: 0.5, rate: 0.8 });
    T.paUntil = G.time + 3;
    yield 2;
    this.task(function* () { yield* this.trainStop(2, 1, () => H.tunnelDone, true); });
    yield () => T.phase === 'stopped';
    T.dark = true; G.audio.beep(null, 55, 0.6, 0.3, 'sawtooth'); Pl.scare(0.3);
    yield 1.6;
    T.dark = false; T.alertK = k; G.audio.infrasound(6, 0.6);
    // every passenger in the wagon turns to look at you
    C.tunnelPax.forEach((r) => { r.mode = 'sit'; r.gesture = (rr) => { const p = rr.root.position; rr.head.rotation.y = Math.atan2(Pl.pos.x - p.x, Pl.pos.z - p.z) - rr.root.rotation.y; }; });
    G.ui.say('(they are all looking at you)', '', 2.6);
    yield 2.2;
    this.hShow(V(TX, MY, L(k, 0.4)), Pl.pos);
    G.audio.reverseWhisper(V(TX, MY + 1.7, L(k, 0.4)), 0.5);
    G.ui.say('Билетіңізді көрсетіңіз. (Show your ticket.)', 'Кондуктор', 2.4, '#f44'); G.audio.speak('Билетіңізді көрсетіңіз.', { lang: 'kk', pitch: 0.2, rate: 0.6 });
    let t = 0;
    while (t < 1.6) { t += G.dt; this.trainWalk(c, TX, Math.max(Pl.pos.z, zFront(k) + 0.5), 1.1, G.dt); yield 0; }
    G.ui.big('ҚАШ! RUN!', 1.8, 'red'); G.audio.sting(0.6);
    T.doors[k].force = undefined;
    H.danger = true;
    H.respawn = () => { Pl.pos.set(TX, MY, L(k, 3.2)); this.hShow(V(TX, MY, L(k, 0.4)), Pl.pos); H.grace = 1.3; };
    H.grace = 0;
    H.tick = (dt) => {
      if (!H.danger || H.caught) return;
      if (H.grace > 0) { H.grace -= dt; c.mode = 'stare'; return; }
      const tz = Math.min(zBack(k) - 0.3, Math.max(Pl.pos.z, zFront(k) + 0.5));
      this.trainWalk(c, Math.max(TX - 0.9, Math.min(TX + 0.9, Pl.pos.x)), tz, 5.3, dt);
      if (Math.random() < dt * 1.5) G.audio.thud(c.root.position, 0.4);
      const d = Math.hypot(Pl.pos.x - c.root.position.x, Pl.pos.z - c.root.position.z);
      if (Pl.pos.z < zFront(k) - 0.4) { H.danger = false; H.escaped = true; }
      else if (d < 0.95) this.hCaught('caretaker', 10, 'БИЛЕТІҢІЗ ЖОҚ. (no ticket.)', H.respawn);
    };
    yield () => H.escaped;
    H.tick = null; H.escaped = false;
    this.trainBang(k); this.hHide(); T.alertK = -1;
    C.tunnelPax.forEach((r) => { r.gesture = null; r.mode = 'sleep'; });
    this.achieve('h_tunnel');
    H.tunnelDone = true;
  };

  // wagon 17→18 — the lights go out behind you, wagon by wagon. The dark is coming.
  P.hDark = function* () {
    const G = this.G, T = this.train, H = T.horror, Pl = G.player, k = 16, dk = T.dark9;
    G.audio.beep(null, 55, 0.6, 0.3, 'sawtooth');
    G.ui.say('(behind you, the lights go out. One wagon. Then the next one.)', '', 3);
    yield 1.4;
    dk.visible = true; dk.position.set(TX, MY, zBack(k) - 0.3);
    T.alertK = k;
    G.ui.big('ҚАРАҢҒЫЛЫҚ! ҚАШ!', 1.8, 'red');
    H.danger = true; H.grace = 0.4;
    H.respawn = () => { Pl.pos.set(TX, MY, L(k, 11)); dk.position.set(TX, MY, L(k, 5)); H.grace = 1.2; };
    H.tick = (dt) => {
      if (!H.danger || H.caught) return;
      if (H.grace > 0) { H.grace -= dt; return; }
      dk.position.z -= 3.6 * dt;
      T.darkEyes.forEach((e) => (e.visible = Math.random() > 0.1));
      if (Math.random() < dt * 2) G.audio.reverseWhisper(dk.position.clone().setY(MY + 1.6), 0.3);
      if (Pl.pos.z < zFront(k) - 0.4) { H.danger = false; H.escaped = true; }
      else if (dk.position.z < Pl.pos.z + 0.8) this.hCaught('crawler', 10, 'ҚАРАҢҒЫЛЫҚ ЖЕТІП АЛДЫ. (the dark caught you)', H.respawn);
    };
    yield () => H.escaped;
    H.tick = null; H.escaped = false;
    this.trainBang(k); T.alertK = -1;
    let t = 0;
    while (t < 1) { t += G.dt; dk.position.z += 6 * G.dt; yield 0; }
    dk.visible = false;
    this.achieve('h_dark');
  };

  // the cab — the driver turns around
  P.memeCabTask = function* () {
    const G = this.G, T = this.train, Pl = G.player, dr = T.driver;
    T.inCab = true;
    yield () => Pl.pos.z < CAB0 - 1.0 || G.time > (T.cabT || (T.cabT = G.time + 6));
    yield 0.5;
    let t = 0;
    while (t < 0.45) { t += G.dt; dr.rotation.y = Math.PI * (1 - Math.min(1, t / 0.45)); yield 0; }
    G.ui.say('СЕН КЕШІКТІҢ. (YOU ARE LATE.)', 'Жүргізуші', 2.2, '#ffd040'); G.audio.speak('You are late.', { pitch: 0.1, rate: 0.7 });
    yield 0.45;
    yield* this.lunge('caretaker', 6);
    dr.visible = false;
    this.achieve('h_driver');
    G.ui.say('(...and the driver\'s seat is empty. There was never a driver.)', '', 3.4);
    yield 3.6;
    yield* this.memeTail();
  };

  // ================================================================ scheduling: never two things at once
  const origUT = P.updateTrain;
  P.updateTrain = function (dt) {
    origUT.call(this, dt);
    const G = this.G, T = this.train, H = T.horror, Pl = G.player;
    if (!H) return;
    if (H.tick) H.tick(dt);
    if (H.cond.root.visible) pose(H.cond, H.cond.mode || 'stare', dt, G.time, H.cond.spd || 0);
    const k = Math.max(0, Math.min(NW - 1, Math.floor(-Pl.pos.z / WP))), l = -Pl.pos.z - k * WP;
    if (!H.done.watch && T.platLvl === 4 && T.phase === 'stopped' && T.sideOpen > 0.8) { H.done.watch = true; this.task(this.hWatcher); }
    if (T.mBusy) return;
    const start = (id, gen) => {
      H.done[id] = true; const tag = { horror: id }; T.mBusy = tag;
      this.task(function* () { yield* gen.call(this); if (T.mBusy === tag) T.mBusy = null; });
    };
    if (!H.done.knock && k === 6 && l > 1.6 && l < 4.5) start('knock', this.hKnock);
    else if (!H.done.saspa && k === 8 && l > 12.6) start('saspa', this.hSaspa);
    else if (!H.done.window && k === 10 && l > 11.6 && T.phase === 'run') start('window', this.hWindow);
    else if (!H.done.tunnel && k === 12 && l > 1.6) start('tunnel', this.hTunnel);
    else if (!H.done.dark && k === 16 && l > 12.4) start('dark', this.hDark);
  };

  // the game over screen of the metro: «Доигрался болдымба?»
  const origDeath = P.metroDeathReport;
  P.metroDeathReport = function () {
    const r = origDeath.call(this);
    r.title = 'ДОИГРАЛСЯ БОЛДЫМБА?';
    if (this.metro.lastCatch === 'conductor') r.cause = '👤 Түнгі кондуктор (the night conductor)';
    r.stats = `YOU DIED IN METRO 404 · ${r.stats}`;
    return r;
  };
}
