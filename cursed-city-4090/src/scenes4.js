// Chapter 4: meme situations & more screamers.
//  - Log Man: knocks on walls at 3 AM, turns his head 180°, chases you with a bat
//  - Sneaker Shark: a three-legged shark in sneakers that runs circles and dances at you
//  - Crocoplane: a crocodile-airplane that bombs the street with rubber chickens
//  - Coffin dance: pallbearers show up early when your health is low
//  - Suspicious stare: an NPC stares, the camera zooms in, BOOM, 🤨
//  - Freeze-frame meme: sometimes a fall freezes in sepia with a caption
//  - Screamers: face in the flashlight, mannequin when you look back after sprinting,
//    TVs on the street that show a face (then PLEASE STAND BY), Buddy's flash selfie
import * as THREE from 'three';
import { A } from './npc.js';
import { makeHumanoid, pose } from './characters.js';
import { ACH } from './scenes2.js';
import { DEATHS } from './scenes3.js';
import { mat, basic, box, cyl, canvasTex, rand, pick, clamp, angleWrap } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

Object.assign(ACH, {
  logman: ['Wrong House', 'Survive the Log Man'],
  shark: ['Fin-tastic Footwork', 'Watch the Sneaker Shark dance'],
  chicken: ['Poultry Bombardment', 'Get bombed by the Crocoplane'],
  coffin: ['Funeral Pre-Booked', 'The pallbearers came early'],
  stare: ['🤨', 'Get stared at suspiciously'],
  meme: ['Certified Meme Moment', 'Witness a freeze-frame'],
  tv: ['Please Stand By', 'Watch cursed TV'],
  selfie: ['Worst Photo Ever', 'Get selfied by Buddy'],
});
Object.assign(DEATHS, {
  log: ['Bonked by the Log Man.', 'He said it was the wrong house. It was not.'],
  chicken: ['Killed by a rubber chicken.', 'Dropped from a crocodile. From an airplane. Same thing.'],
});

const MEME_CAPTIONS = ['💀💀💀', 'gravity: 1   him: 0', 'certified ragdoll moment', 'bro really said 🧍→🛌', 'skill issue', 'he will remember this'];

// ------------------------------------------------------------------ models
function makeShark() {
  const g = new THREE.Group();
  const grey = mat('#6f7f8b'), belly = mat('#d8d8d0'), sneaker = mat('#2a5ad0'), sole = mat('#eee');
  const body = new THREE.Group(); body.position.y = 1.15; g.add(body);
  body.add(box(0.7, 0.7, 2.0, grey, 0, 0, 0));
  body.add(box(0.6, 0.25, 1.8, belly, 0, -0.3, 0.05));
  body.add(box(0.55, 0.5, 0.6, grey, 0, -0.05, 1.25));
  body.add(box(0.5, 0.12, 0.5, mat('#fff'), 0, -0.2, 1.3)); // teeth
  body.add(box(0.08, 0.7, 0.5, grey, 0, 0.6, -0.1)); // dorsal fin
  const tail = new THREE.Group(); tail.position.z = -1.05; body.add(tail);
  tail.add(box(0.1, 0.9, 0.5, grey, 0, 0.1, -0.25));
  for (const s of [-1, 1]) body.add(box(0.06, 0.08, 0.08, basic('#000'), s * 0.3, 0.1, 1.45));
  const legs = [];
  for (const [x, z] of [[-0.25, 0.5], [0.25, 0.5], [0, -0.5]]) {
    const l = new THREE.Group(); l.position.set(x, 0.85, z);
    l.add(box(0.14, 0.7, 0.14, grey, 0, -0.35, 0));
    l.add(box(0.22, 0.14, 0.38, sneaker, 0, -0.75, 0.06), box(0.24, 0.05, 0.4, sole, 0, -0.83, 0.06));
    g.add(l); legs.push(l);
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: g, body, tail, legs };
}

function makeCrocoplane() {
  const g = new THREE.Group();
  const green = mat('#3d6a2a', { fog: false }), dark = mat('#1d3a14', { fog: false }), white = mat('#eee', { fog: false });
  g.add(box(1.6, 1.2, 7, green, 0, 0, 0));
  g.add(box(1.2, 0.6, 3, green, 0, -0.2, 4.8));
  for (let i = 0; i < 8; i++) g.add(box(0.1, 0.18, 0.1, white, (i % 2 ? 0.55 : -0.55), -0.45, 3.6 + i * 0.4));
  for (const s of [-1, 1]) g.add(box(0.25, 0.3, 0.3, basic('#ffdd00', { fog: false }), s * 0.6, 0.65, 3.2));
  g.add(box(14, 0.18, 2.2, mat('#8a8a8a', { fog: false }), 0, 0.2, 0.5));
  g.add(box(4.5, 0.15, 1.2, dark, 0, 0.3, -3.6));
  g.add(box(0.15, 1.6, 1.2, dark, 0, 1.0, -3.6));
  for (let i = 0; i < 6; i++) g.add(box(0.3, 0.25, 0.4, dark, 0, 0.7, 2.5 - i * 1.1)); // scales
  const prop = new THREE.Group(); prop.position.z = 6.4; g.add(prop);
  prop.add(box(3.2, 0.25, 0.08, mat('#222', { fog: false }), 0, 0, 0));
  return { group: g, prop };
}

function makeChicken() {
  const g = new THREE.Group();
  const y = mat('#f2d21b');
  g.add(box(0.22, 0.26, 0.4, y, 0, 0, 0));
  g.add(box(0.14, 0.2, 0.14, y, 0, 0.2, 0.18));
  g.add(box(0.06, 0.04, 0.1, mat('#e07020'), 0, 0.2, 0.3));
  g.add(box(0.05, 0.08, 0.06, mat('#d02020'), 0, 0.33, 0.18));
  return g;
}

function makeCoffinCrew() {
  const g = new THREE.Group();
  const coffin = box(0.75, 0.5, 2.2, mat('#3a2414'), 0, 2.05, 0);
  coffin.add(box(0.8, 0.06, 2.25, mat('#b89a40'), 0, 0.26, 0));
  g.add(coffin);
  const crew = [];
  for (const [x, z] of [[-0.55, 0.75], [0.55, 0.75], [-0.55, -0.75], [0.55, -0.75]]) {
    const r = makeHumanoid({ skin: pick(['#6b4129', '#8d5a3b', '#a87250']), shirt: '#111', pants: '#111', suit: true, hair: 'short' });
    r.head.add(box(0.3, 0.07, 0.03, basic('#000'), 0, 0.22, 0.17)); // sunglasses
    r.root.position.set(x, 0, z); g.add(r.root); crew.push(r);
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: g, coffin, crew };
}

function staticTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 48;
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return { c, ctx: c.getContext('2d'), t };
}

export function extendDirector4(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initChapter4(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateChapter4(dt); };
  const origGags = P.gagNames;
  P.gagNames = function () { return [...origGags.call(this), 'logman', 'shark', 'stare', 'selfie', 'stare']; };
  const origFall = P.onFall;
  P.onFall = function (n) { origFall.call(this, n); this.maybeMemeFreeze(n); };
  const origFlash = P.onFlashlight;
  P.onFlashlight = function (on) { origFlash.call(this, on); if (on) this.maybeFlashFace(); };
  const origDeath = P.deathLine;
  P.deathLine = function () {
    const [a, b] = origDeath.call(this);
    return this.coffin ? [a, 'The pallbearers were right on time.'] : [a, b];
  };

  P.initChapter4 = function () {
    const G = this.G, W = G.world;
    this.crocoNext = rand(150, 220);
    this.coffinNext = 0;
    this.baseFov = G.camera.fov; this.fovTarget = G.camera.fov;
    this.lookBack = { sprint: 0, yaws: [], next: 0 };
    // cursed TVs on the sidewalks
    this.tvs = [];
    for (const [x, z, r] of [[-8.8, 14, Math.PI / 2], [52.6, -20, -Math.PI / 2], [-30, 8.6, Math.PI], [8.8, 62, -Math.PI / 2]]) {
      if (!W.isFree(x, z, 0.6)) continue;
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r;
      g.add(box(0.5, 0.7, 0.5, mat('#2a2a2a'), 0, 0.35, 0));
      g.add(box(0.8, 0.62, 0.55, mat('#3a3530'), 0, 1.0, 0));
      const s = staticTexture();
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.5), basic('#fff', { map: s.t }));
      screen.position.set(0, 1.02, 0.28); g.add(screen);
      G.scene.add(g);
      W.addCollider(x - 0.4, x + 0.4, z - 0.4, z + 0.4, -1, 1.3);
      this.tvs.push({ g, s, state: 'static', t: 0, pos: V(x, 1, z) });
    }
  };

  // ---------------------------------------------------------------- camera zoom helper
  P.zoomTo = function (fov, holdSec) {
    this.fovTarget = fov;
    this.after(holdSec, () => { this.fovTarget = this.baseFov; });
  };

  // ---------------------------------------------------------------- LOG MAN
  P.gag_logman = function () {
    if (this.logman) return false;
    const G = this.G, W = G.world, Pl = G.player;
    // find a building wall near the player that is in view
    let best = null, bd = 30;
    for (const c of W.colliders) {
      if (!c.enabled || c.maxY < 5 || c.minY > 1) continue;
      const wx = clamp(Pl.pos.x, c.minX, c.maxX), wz = clamp(Pl.pos.z, c.minZ, c.maxZ);
      const d = Math.hypot(wx - Pl.pos.x, wz - Pl.pos.z);
      if (d < 9 || d > bd) continue;
      const nx = (Pl.pos.x - wx) / d, nz = (Pl.pos.z - wz) / d;
      const sx = wx + nx * 0.7, sz = wz + nz * 0.7;
      if (!W.isFree(sx, sz, 0.45) || !this.lookingAt(V(sx, 1.5, sz), 0.45) || !W.lineClear(Pl.pos.x, Pl.pos.z, sx, sz)) continue;
      best = { spot: V(sx, 0, sz), wall: V(wx, 0, wz) }; bd = d;
    }
    if (!best) return false;
    const rig = makeHumanoid({ skin: '#8a5a2c', shirt: '#7a4e24', pants: '#6a4420', faceless: true, scale: 1.3, hair: 'none' });
    // put the face on a twist pivot so the head can turn 180° independently of the animation
    const twist = new THREE.Group(); rig.head.add(twist);
    [...rig.head.children].forEach((c) => { if (c !== twist) twist.add(c); });
    twist.scale.set(1.15, 1.6, 1.15);
    for (const s of [-1, 1]) {
      twist.add(box(0.1, 0.1, 0.02, basic('#fff'), s * 0.08, 0.22, 0.165, false));
      twist.add(box(0.04, 0.05, 0.02, basic('#000'), s * 0.08, 0.22, 0.175, false));
    }
    twist.add(box(0.14, 0.03, 0.02, basic('#200'), 0, 0.1, 0.165, false));
    const bat = cyl(0.04, 0.07, 1.0, 6, mat('#c9a070'), 0, -1.05, 0.1); rig.armR.add(bat);
    const n = this.addNPC(rig, { pos: best.spot, name: 'Log Man', color: '#d9a066', voice: { pitch: 0.3, rate: 0.75 }, damage: 10, runSpeed: 7 });
    n.mem.noHorror = true; n.mem.uninterruptible = true;
    n.faceNow(best.wall.x, best.wall.z);
    n.rig.twist = twist;
    this.logman = n;
    const D = this, wall = best.wall.clone().setY(1.6);
    n.run(function* (nn) {
      let t = 0;
      while (nn.distToPlayer() > 7 && t < 30) {
        yield A.say('KNOCK. KNOCK. KNOCK.', { loud: true });
        for (let i = 0; i < 3; i++) {
          yield A.anim('punch', 0.35);
          yield A.call(() => G.audio.thud(wall, 1));
          yield A.wait(0.25);
        }
        yield A.say("...WAKE UP. IT'S 3:33.");
        yield A.wait(1.6);
        t += 4;
      }
      // the head turns around. the body does not.
      yield A.call(() => { nn.mem.turnHead = true; G.audio.beep(nn.pos.clone().setY(2.4), 80, 1.2, 0.2, 'sawtooth'); G.player.scare(0.4); });
      yield A.wait(1.5, 'stare');
      yield A.call(() => { nn.mem.turnHead = false; nn.rig.twist.rotation.y = 0; nn.facePlayer(); nn.hostile = true; G.audio.scream(nn.pos.clone().setY(2.4), 0.5, 1.2, 0.8); });
      yield A.say('YOU DID NOT OPEN THE DOOR.', { loud: true });
      yield A.chase(7, 7, { reach: 1.2, anim: 'run' });
      yield A.call(() => {
        nn.hostile = false;
        if (nn.distToPlayer() < 1.6) D.jumpscare('log', 10);
      });
      yield A.fall('forward', 4, { up: 0.3, lie: 1.5 });
      yield A.say('...wait. Wrong house. Sorry. Wrong house.');
      yield A.moveTo(nn.pos.clone().add(V(rand(-20, 20), 0, rand(-20, 20))), 1.6, 'walk', { timeout: 10 });
      yield A.call(() => { D.achieve('logman'); D.hide(nn); nn.remove(); D.logman = null; });
    });
    return true;
  };

  // ---------------------------------------------------------------- SNEAKER SHARK
  P.gag_shark = function () {
    if (this.shark) return false;
    const G = this.G, s = this.findSpot(14, 20); if (!s) return false;
    const m = makeShark(); m.group.position.copy(s); G.scene.add(m.group);
    this.shark = { m, center: s.clone(), a: 0, t: 0, state: 'circle' };
    G.ui.say('skrrt skrrt skrrrrt', 'Sneaker Shark', 2.5, '#9cf');
    return true;
  };
  P.updateShark = function (dt) {
    const S = this.shark;
    if (!S) return;
    const G = this.G, Pl = G.player, g = S.m.group, W = G.world;
    S.t += dt;
    let moving = true;
    const prev = g.position.clone();
    if (S.state === 'circle') {
      S.a += dt * 2.4;
      g.position.set(S.center.x + Math.cos(S.a) * 4, 0, S.center.z + Math.sin(S.a) * 4);
      if (S.t > 5) { S.state = 'approach'; S.t = 0; }
    } else if (S.state === 'approach') {
      const d = Math.hypot(Pl.pos.x - g.position.x, Pl.pos.z - g.position.z);
      if (d > 2.6) { g.position.x += (Pl.pos.x - g.position.x) / d * 9 * dt; g.position.z += (Pl.pos.z - g.position.z) / d * 9 * dt; }
      else { S.state = 'dance'; S.t = 0; G.audio.vineBoom(0.5); G.ui.say('*does a little dance*', 'Sneaker Shark', 3, '#9cf'); Pl.scare(0.25); }
      if (S.t > 6) { S.state = 'leave'; S.t = 0; }
    } else if (S.state === 'dance') {
      moving = false;
      g.rotation.y = Math.atan2(Pl.pos.x - g.position.x, Pl.pos.z - g.position.z) + Math.sin(S.t * 10) * 0.5;
      S.m.body.rotation.z = Math.sin(S.t * 12) * 0.35;
      S.m.legs.forEach((l, i) => (l.rotation.x = Math.sin(S.t * 14 + i * 2) * 0.8));
      g.position.y = Math.abs(Math.sin(S.t * 12)) * 0.25;
      if (S.t > 3.5) { S.state = 'leave'; S.t = 0; this.achieve('shark'); S.m.body.rotation.z = 0; g.position.y = 0; }
    } else if (S.state === 'leave') {
      const dir = V(g.position.x - Pl.pos.x, 0, g.position.z - Pl.pos.z).normalize();
      g.position.addScaledVector(dir, 10 * dt);
      if (S.t > 5) { G.scene.remove(g); this.shark = null; return; }
    }
    if (moving) {
      W.resolve(g.position, 0.6, 1.5);
      const v = g.position.clone().sub(prev);
      if (v.lengthSq() > 1e-6) g.rotation.y = Math.atan2(v.x, v.z);
      S.m.legs.forEach((l, i) => (l.rotation.x = Math.sin(S.t * 22 + i * 2.1) * 1.0));
      S.m.tail.rotation.y = Math.sin(S.t * 15) * 0.5;
      if (Math.random() < dt * 5) G.audio.beep(g.position, rand(1500, 2400), 0.05, 0.08, 'square'); // sneaker squeaks
      for (const n of G.npcs) {
        if (n.removed || n.hidden || n.rd || n.attached || n.kind !== 'human') continue;
        if (n.pos.distanceTo(g.position.clone().setY(n.pos.y)) < 1.1) { n.stopScriptIfInterruptible(); n.fallFrom({ dir: V(n.pos.x - g.position.x, 0, n.pos.z - g.position.z), power: 5, up: 2.5, lie: 2 }); }
      }
    }
  };

  // ---------------------------------------------------------------- CROCOPLANE
  P.updateCroco = function (dt) {
    const G = this.G, Pl = G.player;
    this.crocoNext -= dt;
    if (!this.croco && this.crocoNext <= 0 && !this.horrorRunning && !Pl.inVehicle && !Pl.inBasement()) {
      this.crocoNext = this.finale ? rand(60, 90) : rand(220, 320);
      const m = makeCrocoplane();
      const a = rand(0, Math.PI * 2), dir = V(Math.cos(a), 0, Math.sin(a));
      m.group.position.copy(Pl.pos).addScaledVector(dir, -150).setY(17);
      m.group.rotation.y = Math.atan2(dir.x, dir.z);
      G.scene.add(m.group);
      this.croco = { m, dir, drops: 0, dropT: 0, engine: G.audio.loop('engine', m.group.position) };
      this.after(2, () => G.ui.say('Is it a bird? Is it a plane? It is a crocodile. Take cover.', '📻 4090 FM', 4, '#fc6'));
      this.eventsSeen++;
    }
    const C = this.croco;
    if (!C) return;
    const g = C.m.group;
    g.position.addScaledVector(C.dir, 26 * dt);
    g.rotation.z = Math.sin(G.time * 1.5) * 0.15;
    C.m.prop.rotation.z += dt * 40;
    C.engine.setPos(g.position); C.engine.setPitch(70);
    const d = Math.hypot(g.position.x - Pl.pos.x, g.position.z - Pl.pos.z);
    C.dropT -= dt;
    if (d < 45 && C.dropT <= 0 && C.drops < 12) {
      C.dropT = 0.45; C.drops++;
      const target = Pl.pos.clone().add(V(rand(-7, 7), 0, rand(-7, 7)));
      const from = g.position.clone().setY(16);
      const T = Math.sqrt(2 * 16 / 18);
      const vel = V((target.x - from.x) / T, 0, (target.z - from.z) / T);
      const D = this;
      const p = G.props.spawn(makeChicken(), from, vel, {
        kind: 'chicken', r: 0.2, thrown: true, bounce: 0.5,
        onLand: (pp) => {
          if (pp.squeaked) return; pp.squeaked = true;
          G.audio.squeak(pp.pos, 0.5);
          if (pp.pos.distanceTo(Pl.pos.clone().setY(pp.pos.y)) < 0.9) { Pl.damage(4, pp.pos, 'chicken'); D.achieve('chicken'); G.ui.say('*BONK* ...squeak.', '', 1.5); }
        },
      });
      this.after(40, () => G.props.remove(p));
    }
    if (d > 170 && C.drops > 0) { C.engine.stop(); G.scene.remove(g); this.croco = null; }
    else if (g.position.distanceTo(Pl.pos) > 400) { C.engine.stop(); G.scene.remove(g); this.croco = null; }
  };

  // ---------------------------------------------------------------- COFFIN DANCE
  P.updateCoffin = function (dt) {
    const G = this.G, Pl = G.player, W = G.world;
    if (!this.coffin && Pl.health < 35 && G.time > this.coffinNext && !Pl.inVehicle && !Pl.inBasement() && !Pl.hiding) {
      const s = this.findSpot(16, 24, true, 1.0) || this.findSpot(16, 24);
      if (!s) return;
      const m = makeCoffinCrew(); m.group.position.copy(s); G.scene.add(m.group);
      this.coffin = { m, t: 0, state: 'come', music: G.audio.loop('coffin', s.clone().setY(1.5)) };
      this.achieve('coffin'); this.eventsSeen++;
      this.after(2.5, () => G.ui.say("We're a little early. Don't mind us. We'll wait.", 'Pallbearer', 4, '#ccc'));
      this.after(7, () => this.buddy && this.buddy.say('WHY ARE THEY DANCING?! WHO INVITED THEM?!', 3, true));
    }
    const C = this.coffin;
    if (!C) return;
    C.t += dt;
    const g = C.m.group, d = Math.hypot(Pl.pos.x - g.position.x, Pl.pos.z - g.position.z);
    const sp = C.state === 'leave' ? 2.5 : d > 6 ? 3 : 0;
    if (sp > 0) {
      const dir = C.state === 'leave' ? V(g.position.x - Pl.pos.x, 0, g.position.z - Pl.pos.z).normalize() : V(Pl.pos.x - g.position.x, 0, Pl.pos.z - g.position.z).normalize();
      g.position.addScaledVector(dir, sp * dt);
      W.resolve(g.position, 1.1, 2.4);
      g.rotation.y = Math.atan2(dir.x, dir.z);
    }
    g.position.y = Math.abs(Math.sin(C.t * 8.3)) * 0.12;
    C.m.coffin.rotation.z = Math.sin(C.t * 4.15) * 0.08;
    C.m.crew.forEach((r, i) => {
      r.phase += dt * (sp > 0 ? 9 : 8);
      pose(r, sp > 0 ? 'walk' : 'dance', dt, G.time + i * 0.2, sp);
      if (sp > 0 || i < 2) { r.armL.rotation.x = -3.0; r.armR.rotation.x = -3.0; r.armL.rotation.z = 0.1; r.armR.rotation.z = -0.1; }
    });
    C.music.setPos(g.position.clone().setY(1.5));
    if (C.state !== 'leave' && Pl.health > 60) {
      C.state = 'leave'; C.t = 0;
      G.ui.say('...false alarm, boys. Pack it up.', 'Pallbearer', 3, '#ccc');
    }
    if (C.state === 'leave' && C.t > 12) { C.music.stop(); G.scene.remove(g); this.coffin = null; this.coffinNext = G.time + 180; }
  };

  // ---------------------------------------------------------------- SUSPICIOUS STARE 🤨
  P.gag_stare = function () {
    const G = this.G;
    const n = this.humans().filter((x) => !x.script && !x.rd && !x.hidden && !x.frozen && !x.special && x.ai === 'wander' && x.distToPlayer() > 5 && x.distToPlayer() < 22 && this.lookingAt(x.pos.clone().setY(1.6), 0.8))[0];
    if (!n) return false;
    const D = this;
    n.run(function* (nn) {
      yield A.face('player', 0.4, 'stare');
      yield A.call(() => { D.zoomTo(26, 2.2); G.audio.vineBoom(0.9); G.ui.big('🤨', 2, ''); D.achieve('stare'); });
      yield A.wait(2.8, 'stare', { look: 'player' });
      yield A.say(pick(['...nice shoes.', 'I know what you did.', '...carry on.', 'You have the face of someone who owns a 4090.']));
      yield A.move(nn.pos.x + rand(-12, 12), nn.pos.z + rand(-12, 12), 1.5, 'walk', { timeout: 8 });
    });
    return true;
  };

  // ---------------------------------------------------------------- FREEZE-FRAME MEME
  P.maybeMemeFreeze = function (n) {
    const G = this.G;
    if (G.time - (this.lastMeme || -999) < 75 || this.horrorRunning || n === this.buddy && Math.random() < 0.5) return;
    if (n.distToPlayer() > 25 || !this.lookingAt(n.pos.clone().setY(1), 0.85) || Math.random() > 0.12) return;
    this.lastMeme = G.time;
    this.after(0.32, () => {
      if (G.state !== 'play') return;
      G.freezeT = 1.6;
      G.ui.memeFreeze(pick(MEME_CAPTIONS), 1700);
      G.audio.vineBoom(0.8);
      this.achieve('meme');
    });
  };

  // ---------------------------------------------------------------- SCREAMER: face in the flashlight
  P.maybeFlashFace = function () {
    const G = this.G, Pl = G.player;
    if (G.time < 90 || G.time - (this.lastFlashFace || -999) < 150 || Pl.hiding || Pl.inVehicle) return;
    if (G.lighting.nearestLitDist(Pl.pos) < 10 || Math.random() > 0.2) return;
    this.lastFlashFace = G.time;
    const f = this.playerFwd().clone();
    const pos = Pl.pos.clone().addScaledVector(f, 1.3);
    const ghost = this.addNPC(makeHumanoid({ faceless: true, skin: '#d8d6cc', shirt: '#101010', pants: '#101010', hair: 'long', hairColor: '#050505' }), { pos, ai: 'stare', name: '???' });
    ghost.facePlayer();
    this.after(0.25, () => this.jumpscare('pale'));
    this.after(0.7, () => { this.hide(ghost); ghost.remove(); });
  };

  // ---------------------------------------------------------------- SCREAMER: don't look back
  P.updateLookBack = function (dt) {
    const G = this.G, Pl = G.player, L = this.lookBack;
    const sprinting = Math.hypot(Pl.vel.x, Pl.vel.z) > 6.5;
    L.sprint = sprinting ? L.sprint + dt : Math.max(0, L.sprint - dt * 2);
    L.yaws.push({ t: G.time, y: Pl.yaw });
    while (L.yaws.length && G.time - L.yaws[0].t > 0.5) L.yaws.shift();
    if (L.sprint < 3.5 || G.time < L.next || Pl.inVehicle || Pl.hiding || this.horrorRunning) return;
    const turned = Math.abs(angleWrap(Pl.yaw - L.yaws[0].y)) > 2.3;
    if (!turned) return;
    L.next = G.time + 200;
    if (Math.random() > 0.35) return;
    const f = this.playerFwd().clone();
    const pos = Pl.pos.clone().addScaledVector(f, 1.4);
    const m = this.addNPC(makeHumanoid({ mannequin: true, eyesGlow: '#ff1010' }), { pos, ai: 'stare', name: 'Mannequin' });
    m.mem.noHorror = true; m.facePlayer();
    this.jumpscare('mannequin');
    this.after(0.8, () => { m.ai = 'idle'; m.fallFrom({ dir: 'forward', power: 2, lie: 1e9, getUp: false, silent: true }); });
    this.after(1.6, () => this.buddy && this.buddy.say('Rule one of horror: NEVER look back. Rule two: I forgot rule two.', 3.5));
    this.after(12, () => { this.hide(m); m.remove(); });
  };

  // ---------------------------------------------------------------- SCREAMER (funny): Buddy's selfie
  P.gag_selfie = function () {
    const b = this.buddy, G = this.G, Pl = G.player;
    if (!b || b.removed || b.rd || G.time - (this.lastSelfie || -999) < 240) return false;
    this.lastSelfie = G.time;
    const f = this.playerFwd().clone();
    b.stopScript(); b.pos.copy(Pl.pos).addScaledVector(f, 0.9); b.facePlayer();
    G.ui.whiteFlash(); G.audio.shutter();
    G.ui.screamer('buddy', 0.6);
    G.audio.sting(0.4);
    Pl.scare(0.3);
    this.achieve('selfie');
    this.after(1, () => b.say('SAY CHEESE! ...you blinked. Can we do another one?', 3));
    this.after(4.5, () => b.say('This is going on my Instagram: "me and my bestie, 3:33 AM, not dead yet".', 4));
    return true;
  };

  // ---------------------------------------------------------------- SCREAMER: cursed street TVs
  P.updateTVs = function (dt) {
    const G = this.G, Pl = G.player;
    for (const tv of this.tvs) {
      const d = tv.pos.distanceTo(Pl.pos.clone().setY(1));
      if (d > 22) continue;
      tv.t += dt;
      const ctx = tv.s.ctx;
      if (tv.state === 'static' && (G.frame % 3 === 0)) {
        const img = ctx.createImageData(64, 48);
        for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        ctx.putImageData(img, 0, 0);
        tv.s.t.needsUpdate = true;
        if (Math.random() < dt * 3 && d < 12) G.audio.beep(tv.pos, rand(3000, 6000), 0.03, 0.02, 'square');
        if (d < 3.2 && this.lookingAt(tv.pos, 0.85)) {
          tv.state = 'face'; tv.t = 0;
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 64, 48);
          ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.ellipse(32, 26, 16, 21, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#000'; ctx.fillRect(22, 18, 7, 9); ctx.fillRect(35, 18, 7, 9); ctx.fillRect(25, 34, 14, 9);
          tv.s.t.needsUpdate = true;
          G.audio.scream(tv.pos, 0.8, 1.0, 0.7); G.audio.sting(0.6);
          Pl.scare(0.5); Pl.shake = 0.5;
          this.achieve('tv'); this.eventsSeen++;
        }
      } else if (tv.state === 'face' && tv.t > 1.3) {
        tv.state = 'standby';
        const bars = ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f'];
        bars.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * 9.2, 0, 9.2, 48); });
        ctx.fillStyle = '#000'; ctx.fillRect(4, 18, 56, 13);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText('PLEASE STAND BY', 32, 27);
        tv.s.t.needsUpdate = true;
        G.audio.beep(tv.pos, 1000, 1.2, 0.15, 'sine');
      }
    }
  };

  P.updateChapter4 = function (dt) {
    const G = this.G, cam = G.camera;
    if (Math.abs(cam.fov - this.fovTarget) > 0.05) { cam.fov += (this.fovTarget - cam.fov) * Math.min(1, dt * 7); cam.updateProjectionMatrix(); }
    if (this.logman && this.logman.mem.turnHead) this.logman.rig.twist.rotation.y = Math.min(Math.PI, this.logman.rig.twist.rotation.y + dt * 2.2);
    this.updateShark(dt);
    this.updateCroco(dt);
    this.updateCoffin(dt);
    this.updateLookBack(dt);
    this.updateTVs(dt);
  };
}
