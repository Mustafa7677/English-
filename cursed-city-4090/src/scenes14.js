// Chapter 14: SCREAMER 2.0 + the horror director.
//
// The lunge itself, rebuilt:
//   - subliminal pre-frames (the face flashes for a single frame before it comes)
//   - long-fingered pale hands reach in from both edges of the screen
//   - the face rushes in, its jaw stretches, it glitches between frames
//   - the image itself breaks (chromatic split + colour drain), the camera rolls
//   - layered distorted scream, then ringing ears and a racing heart
// Horror director: after every scare there is a RELIEF period (no new scares), and new scares are
// preceded by a BUILD-UP (infrasound you feel more than hear, a backwards whisper, lamps dying
// around you). Scare intensity is configurable (Mild / Normal / Extreme).
//
// New place-bound screamer mechanics:
//   THE FACELESS RUNNER — the dark road to the gate. LIGHT IS SAFETY: reach a working street lamp.
//   HANDS IN THE DARK — the hidden basement. Turn your flashlight off and something reaches for you.
//   THE CEILING — the kindergarten corridor. Do not look up.
//   SUBLIMINAL FRAMES — dark alleys. Did you just see a face? (one frame)
import * as THREE from 'three';
import { makeHumanoid, pose } from './characters.js';
import { faceTextures } from './scenes10.js';
import { ACH } from './scenes2.js';
import { DEATHS } from './scenes3.js';
import { rand, pick } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

Object.assign(ACH, {
  runnerSafe: ['Into The Light', 'Escape the Faceless Runner by reaching a lamp'],
  runnerCaught: ['It Was Faster', 'Get caught by the Faceless Runner'],
  hands: ['Lights On', 'Chase away the hands with your flashlight'],
  grabbed: ['Grabbed', 'Let the hands reach you'],
  ceiling: ['Never Look Up', 'See what is on the kindergarten ceiling'],
  subliminal: ['Did You See That?', 'Notice a subliminal frame'],
});
Object.assign(DEATHS, { runner: ['Caught by the Faceless Runner.', 'It hates the light. You were not in it.'] });

const DARK_SPOTS = [[89, -30], [-89, 30], [30, -89], [-30, 89], [89, 89], [-89, -89], [89, 30], [-89, -30], [30, 89]];
const RUNNER_HOME = V(2, 0, -97);

/** Pale hand with long fingers, drawn on top of everything (camera space). */
function makeHand(side) {
  const g = new THREE.Group();
  const skin = new THREE.MeshBasicMaterial({ color: 0xd6d2c4, depthTest: false, fog: false });
  const shade = new THREE.MeshBasicMaterial({ color: 0x8a867a, depthTest: false, fog: false });
  const nail = new THREE.MeshBasicMaterial({ color: 0x1a1210, depthTest: false, fog: false });
  const add = (m, w, h, d, x, y, z, rz = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.z = rz; b.renderOrder = 1002; g.add(b); return b; };
  add(shade, 0.9, 0.11, 0.1, side * 0.5, -0.02, 0);          // forearm coming from off-screen
  add(skin, 0.16, 0.14, 0.05, 0, 0, 0);                        // palm
  for (let i = 0; i < 4; i++) {
    const y = 0.05 - i * 0.034, len = [0.22, 0.27, 0.25, 0.19][i];
    add(skin, len, 0.022, 0.03, -side * (0.08 + len / 2), y, 0.01, side * (i - 1.5) * 0.08);
    add(nail, 0.035, 0.024, 0.032, -side * (0.08 + len), y - side * (i - 1.5) * 0.02, 0.012);
  }
  add(skin, 0.12, 0.03, 0.03, -side * 0.08, -0.08, 0.01, -side * 0.6); // thumb
  return g;
}

export function extendDirector14(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initChapter14(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateChapter14(dt); };

  // ================================================================ SCREAMER 2.0
  P.lunge = function* (kind, dmg = 0) {
    const G = this.G, Pl = G.player, cam = G.camera, lvl = G.settings.scare || 'normal';
    if (Pl.hiding || G.state !== 'play') return;
    const [t1, t2] = faceTextures(kind);
    const mild = lvl === 'mild', extreme = lvl === 'extreme';
    const m = new THREE.MeshBasicMaterial({ map: t1, transparent: true, depthTest: false, depthWrite: false, fog: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.25), m); plane.renderOrder = 1001;
    // subliminal pre-frames: the face is already there for one frame... then gone
    if (!mild) {
      plane.position.set(0, 0, -1.05); cam.add(plane); G.audio.click();
      yield 0;
      cam.remove(plane);
      yield 0; yield 0;
    }
    plane.position.set(rand(-0.1, 0.1), 0.02, -3.4); plane.scale.setScalar(0.3);
    cam.add(plane);
    const hands = mild ? [] : [makeHand(1), makeHand(-1)];
    hands.forEach((h, i) => { h.position.set(i ? -1.6 : 1.6, -0.18, -0.95); h.rotation.z = i ? -0.25 : 0.25; cam.add(h); });
    G.audio.bigScream(1); G.audio.sting(0.6);
    G.ui.hurt(11); if (!mild) G.ui.glitch(0.85);
    Pl.shake = mild ? 0.5 : 1.2; Pl.scare(1); Pl.roll = rand(-0.3, 0.3);
    G.fxFear = mild ? 0.5 : 1;
    this.zoomTo(mild ? 60 : 46, 0.9);
    const dur = extreme ? 1.25 : mild ? 0.6 : 0.95;
    let t = 0, swap = 0;
    while (t < dur) {
      t += G.dt; swap -= G.dt;
      const k = Math.min(1, t / 0.11);
      plane.position.z = -3.4 + (3.4 - 0.92) * k * k;
      const s = 0.3 + 0.7 * k;
      plane.scale.set(s, s * (1 + Math.max(0, Math.sin(t * 38)) * 0.14 * k), 1); // the jaw stretches
      plane.position.x = (Math.random() - 0.5) * 0.06 * k; plane.position.y = 0.02 + (Math.random() - 0.5) * 0.06 * k;
      plane.rotation.z = (Math.random() - 0.5) * 0.14;
      if (swap <= 0) { swap = rand(0.03, 0.08); m.map = m.map === t1 ? t2 : t1; }
      plane.visible = t < 0.25 || Math.random() > 0.15;
      const hk = Math.min(1, t / 0.45);
      hands.forEach((h, i) => { const sx = i ? -1 : 1; h.position.x = sx * (1.6 - 1.05 * hk) + (Math.random() - 0.5) * 0.02; h.position.y = -0.18 + Math.sin(t * 30 + i) * 0.015; });
      yield 0;
    }
    cam.remove(plane); plane.geometry.dispose(); m.dispose();
    hands.forEach((h) => cam.remove(h));
    G.ui.glitch(0);
    if (dmg) Pl.damage(dmg, null, kind === 'caretaker' ? 'ghost' : this._lungeKiller || 'fear');
    this._lungeKiller = null;
    this.blackout = Math.max(this.blackout, mild ? 0 : 0.25);
    G.audio.tinnitus(mild ? 1.5 : 3.5);
    this.repeat(mild ? 3 : 6, 0.38, () => G.audio.heartbeat(0.8));
    this.task(function* () { while (G.fxFear > 0.01) { G.fxFear *= 0.93; yield 0; } G.fxFear = 0; });
    if (this.stats) this.stats.scares++;
    this.reliefUntil = G.time + 40;
    if (!Pl.dead && this.addAura) this.addAura(200, 'did not cry');
  };

  /** Build-up before a scare: infrasound, a backwards whisper, lamps around you die. */
  P.buildUp = function (sec = 6) {
    const G = this.G, Pl = G.player, W = G.world;
    G.audio.infrasound(sec, 0.6);
    this.after(sec * 0.4, () => G.audio.reverseWhisper(Pl.pos.clone().add(this.playerFwd().clone().multiplyScalar(-2)).setY(Pl.pos.y + 1.6), 0.35));
    this.dreadUntil = G.time + sec + 2;
    const near = W.lamps.filter((l) => l.state === 'on' && l.pos.distanceTo(Pl.pos) < 30).slice(0, 4);
    near.forEach((l, i) => this.after(i * (sec / 5), () => { l.flicker = true; }));
    this.after(sec + 20, () => near.forEach((l) => { l.flicker = false; if (l.state === 'on') W.setLamp(l, 'on'); }));
  };
  P.calm = function () { return this.G.time > (this.reliefUntil || 0) && !this.horrorRunning; };

  const origMusic = P.updateMusic;
  P.updateMusic = function () {
    origMusic.call(this);
    if (this.G.time < (this.dreadUntil || 0) && this.G.audio.mus) {
      const lv = this.G.audio.mus.lv || {}; this.G.audio.setMusic({ ...lv, pad: 0, dread: 1 });
    }
  };

  P.initChapter14 = function () {
    const G = this.G, W = G.world;
    this.c14 = { runner: 'idle', handsT: 0, handsCd: 0, subT: 60 };
    // ---------------- the Faceless Runner + its dark road
    const r = this.faceless = this.addNPC(makeHumanoid({ faceless: true, skin: '#e2e0d6', shirt: '#0c0c0c', pants: '#0c0c0c', fat: 0.6, scale: 1.28, hair: 'none' }),
      { pos: RUNNER_HOME.clone(), heading: 0, ai: (n, dt) => this.runnerAI(n, dt), name: '???', color: '#ddd', runSpeed: 8.7 });
    r.mem.noHorror = true; r.mem.noCrash = true;
    r.rig.armL.scale.y = r.rig.armR.scale.y = 1.45;
    r.rig.skinMat.emissive.set('#5a5850'); // pale enough to be seen in the dark
    for (const l of W.lamps) if (Math.abs(l.base.x) < 10 && l.base.z < -78) { W.setLamp(l, 'off'); l.flicker = false; l.deadRoad = true; }
    // ---------------- the ceiling thing in the kindergarten corridor
    const cr = this.ceilingThing = makeHumanoid({ faceless: true, skin: '#cfcabe', shirt: '#1a1a1a', pants: '#1a1a1a', fat: 0.7, eyesGlow: '#ff1010' });
    for (let k = 0; k < 3; k++) pose(cr, 'tpose', 1, 0, 0);
    cr.legL.rotation.x = 0.5; cr.legR.rotation.x = -0.4; cr.armL.rotation.x = -0.6; cr.armR.rotation.x = 0.5;
    cr.root.rotation.x = Math.PI; cr.root.visible = false; G.scene.add(cr.root);
  };

  // ================================================================ THE FACELESS RUNNER
  P.inLight = function (p) {
    const W = this.G.world;
    return W.lamps.some((l) => l.state !== 'off' && l.bulb.material !== W.bulbOff && Math.hypot(l.pos.x - p.x, l.pos.z - p.z) < 4.6);
  };
  P.runnerAI = function (n, dt) {
    const G = this.G, Pl = G.player, c = this.c14, d = n.distToPlayer();
    if (c.runner === 'gone') { if (G.time > c.back) { n.pos.copy(RUNNER_HOME); this.show(n); c.runner = 'idle'; } return; }
    if (c.runner === 'idle') {
      n.anim = 'stare'; n.facePlayer();
      if (Pl.pos.z < -66 && Math.abs(Pl.pos.x) < 14 && !c.hinted) {
        c.hinted = true;
        if (this.buddy && !this.buddy.removed) this.buddy.say('Psst... they say something stands on the dark road. They say it HATES the light.', 4.5);
        else G.ui.say('...something stands on the dark road. It hates the light.', '(a voice in your head)', 4, '#888');
      }
      const lit = Pl.flashOn && Pl.battery > 0 && this.lookingAt(n.pos.clone().setY(2), 0.92) && d < 32;
      if ((lit || d < 13) && this.calm() && !Pl.inVehicle && !Pl.hiding && Pl.pos.y > -1) {
        c.runner = 'scream'; c.t = 0;
        this.buildUp(1.5);
        G.audio.scream(n.pos.clone().setY(2.2), 0.35, 1.6, 1); G.audio.sting(0.5);
        Pl.scare(0.5);
      }
      return;
    }
    c.t += dt;
    if (c.runner === 'scream') { n.anim = 'creep'; n.facePlayer(); if (c.t > 0.9) { c.runner = 'chase'; c.t = 0; G.ui.toast('RUN TO THE LIGHT.'); } return; }
    if (c.runner === 'chase') {
      if (this.inLight(Pl.pos)) {
        // it will not enter the light: it stops at the edge and screams
        const tgtD = 7;
        if (d > tgtD) n.steer(Pl.pos.x, Pl.pos.z, n.runSpeed, dt, 'panic');
        else { n.anim = 'creep'; n.facePlayer(); }
        c.safe = (c.safe || 0) + dt;
        if (Math.random() < dt * 0.8) G.audio.scream(n.pos.clone().setY(2.2), 0.3, 0.8, 0.5);
        if (c.safe > 6) {
          c.runner = 'gone'; c.back = G.time + 160; this.hide(n);
          G.ui.say('...it backs away into the dark.', '', 2.5);
          this.achieve('runnerSafe'); if (this.addAura) this.addAura(400, 'used the light');
        }
        return;
      }
      c.safe = 0;
      n.mem.noAvoid = false;
      n.steer(Pl.pos.x, Pl.pos.z, n.runSpeed, dt, 'panic');
      if (Math.random() < dt * 4) G.audio.thud(n.pos, 0.35);
      if (d < 1.15) {
        c.runner = 'gone'; c.back = G.time + 160;
        this._lungeKiller = 'runner';
        this.task(function* () { yield* this.lunge('pale', 25); this.achieve('runnerCaught'); });
        this.after(0.2, () => this.hide(n));
      } else if (c.t > 25 || d > 60) { c.runner = 'gone'; c.back = G.time + 120; this.hide(n); }
    }
  };

  // ================================================================ HANDS IN THE DARK (basement)
  P.updateHands = function (dt) {
    const G = this.G, Pl = G.player, c = this.c14, cam = G.camera;
    c.handsCd -= dt;
    const dark = Pl.inBasement() && Pl.pos.y > -40 && (!Pl.flashOn || Pl.battery <= 0) && !Pl.hiding && G.state === 'play';
    if (!c.hands) {
      if (dark && c.handsCd <= 0 && this.calm() && (G.settings.scare || 'normal') !== 'mild') { c.handsT += dt; if (c.handsT > 4) { c.hands = { t: 0, l: makeHand(1), r: makeHand(-1), br: G.audio.loop('breath', Pl.pos.clone().setY(Pl.pos.y + 1.5)) }; cam.add(c.hands.l); cam.add(c.hands.r); G.audio.infrasound(5, 0.6); } }
      else c.handsT = 0;
      return;
    }
    const H = c.hands;
    H.t += dt;
    const reach = Math.min(1, H.t / 4.5);
    H.l.position.set(1.7 - 1.0 * reach, -0.32 + Math.sin(H.t * 3) * 0.02, -0.9); H.l.rotation.z = 0.4;
    H.r.position.set(-1.7 + 1.0 * reach, -0.3 + Math.cos(H.t * 3) * 0.02, -0.9); H.r.rotation.z = -0.4;
    const end = (grab) => {
      cam.remove(H.l); cam.remove(H.r); H.br.stop(); c.hands = null; c.handsT = 0; c.handsCd = 45;
      if (grab) { this._lungeKiller = 'fear'; this.task(function* () { yield* this.lunge('crawler', 12); this.achieve('grabbed'); }); }
    };
    if (Pl.flashOn && Pl.battery > 0) { G.audio.hiss(0.6); G.ui.say('*the hands snap back into the dark*', '', 2); this.achieve('hands'); if (this.addAura) this.addAura(150, 'turned the lights on'); end(false); }
    else if (reach >= 1 && H.t > 5.5) end(true);
    else if (!Pl.inBasement()) end(false);
  };

  // ================================================================ THE CEILING (kindergarten corridor)
  P.updateCeiling = function (dt) {
    const G = this.G, Pl = G.player, c = this.c14, cr = this.ceilingThing;
    if (c.ceiling === 'done') return;
    if (!this.inCorridor() || !(this.flags && this.flags.kgDone) || !this.calm()) { if (c.ceiling !== 'drop') cr.root.visible = false; return; }
    if (!c.ceiling) {
      // it crawls along the ceiling a few metres ahead of you
      const f = this.playerFwd();
      cr.root.position.set(-30, 4.15, Pl.pos.z + Math.sign(f.z || -1) * 3.2);
      cr.root.rotation.y = Math.sin(G.time * 2) * 0.3;
      cr.root.visible = true;
      if (Math.random() < dt * 0.5) G.audio.chalk(cr.root.position); // scratching
      if (Pl.pitch > 0.45 && this.lookingAt(cr.root.position.clone().setY(3.6), 0.75)) {
        c.ceiling = 'drop'; c.t = 0;
        G.audio.scream(cr.root.position, 1.3, 0.5, 0.6);
      }
      return;
    }
    if (c.ceiling === 'drop') {
      c.t += dt;
      const k = Math.min(1, c.t / 0.35);
      cr.root.position.y = 4.15 * (1 - k);
      cr.root.rotation.x = Math.PI * (1 - k);
      if (k >= 1 && !c.lunged) {
        c.lunged = true; c.ceiling = 'done';
        this.task(function* () { yield* this.lunge('crawler', 10); this.achieve('ceiling'); });
        this.after(0.3, () => { cr.root.visible = false; });
      }
    }
  };

  // ================================================================ SUBLIMINAL FRAMES (dark alleys)
  P.updateSubliminal = function (dt) {
    const G = this.G, Pl = G.player, c = this.c14, lvl = G.settings.scare || 'normal';
    if (lvl === 'mild') return;
    c.subT -= dt;
    if (c.subT > 0 || G.state !== 'play' || Pl.inVehicle || !this.calm()) return;
    const inDark = DARK_SPOTS.some(([x, z]) => Math.hypot(Pl.pos.x - x, Pl.pos.z - z) < 14) || (this.zone && this.zone.active) || Pl.inBasement();
    if (!inDark || Math.random() > dt * 0.5) return;
    c.subT = lvl === 'extreme' ? rand(30, 50) : rand(70, 110);
    const [t1] = faceTextures(pick(['pale', 'caretaker', 'poster']));
    const m = new THREE.MeshBasicMaterial({ map: t1, transparent: true, depthTest: false, fog: false, opacity: 0.85 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.25), m); pl.renderOrder = 1001;
    pl.position.set(rand(-0.4, 0.4), rand(-0.1, 0.1), -1.6); G.camera.add(pl);
    G.audio.click();
    const D2 = this;
    this.task(function* () { yield 0; yield 0; G.camera.remove(pl); m.dispose(); pl.geometry.dispose(); D2.achieve('subliminal'); Pl.scare(0.15); });
  };

  P.updateChapter14 = function (dt) {
    this.updateHands(dt);
    this.updateCeiling(dt);
    this.updateSubliminal(dt);
  };
}
