// Director: spawns the city's population and runs every scripted scene, random gag,
// the horror shift, the RTX 4090 finale and the ending. Scenes are generator "tasks".
import * as THREE from 'three';
import { NPC, A } from './npc.js';
import {
  makeHumanoid, makeRobot, makeCart, makeTaxi, makeRTX, makeChair, makeTV, makeGiantHorseHead, randomLook, pose,
} from './characters.js';
import { mat, cyl, rand, pick, shuffle, clamp, angleWrap } from './util.js';
import { extendDirector } from './scenes2.js';
import { extendDirector3 } from './scenes3.js';
import { extendDirector4 } from './scenes4.js';
import { extendDirector5 } from './scenes5.js';
import { extendDirector6 } from './scenes6.js';
import { extendDirector7 } from './scenes7.js';
import { extendDirector8 } from './scenes8.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const BUDDY_LINES = [
  "Don't worry. I watched a YouTube video about monsters once.",
  'Was that a horse driving a cart?! ...Was it the other way around?',
  "I've got your back! ...Mostly your left side.",
  'My grandma had an RTX 4090. She never came back from the benchmark.',
  "If anything attacks you, I'll fall on it. Strategically.",
  'Is it just me or are the street lights judging us?',
  'Remember: if you hear a horse, you are already too late.',
];

// ---------------------------------------------------------------- Cart (human pulls, horse rides)
class Cart {
  constructor(G, D) {
    this.G = G; this.D = D;
    const m = makeCart(); this.m = m; this.group = m.group;
    G.scene.add(this.group);
    this.path = [V(-57, 0, -57), V(57, 0, -57), V(57, 0, 57), V(-57, 0, 57)];
    this.seg = 3; this.t = 0.15;
    this.speed = 4.3; this.state = 'drive'; this.heading = Math.PI; this.rollV = 0;
    this.flying = false; this.flyAngle = 0; this.whipT = 0;
    this.puller = D.human({ shirt: '#4a4a44', pants: '#2a2a2a', hair: 'short', fat: 1 }, { name: 'Cart Man', ai: 'none', special: true, voice: { pitch: 0.9, rate: 1.1 } });
    this.puller.attached = true; this.puller.mem.noHorror = true;
    this.horse = D.addNPC(makeHumanoid({ horse: true, skin: '#5a3418', shirt: '#151515', pants: '#151515', hat: 'tophat', suit: true }),
      { name: 'Horse', color: '#e0a060', special: true, ai: 'none', voice: { pitch: 0.2, rate: 0.85 }, runSpeed: 6.7 });
    this.horse.attached = true; this.horse.mem.noHorror = true;
    const whip = cyl(0.012, 0.012, 1.3, 3, mat('#1a1008'), 0, -1.2, 0.25); whip.rotation.x = 0.5;
    this.horse.rig.armR.add(whip);
    this.passenger = null;
    this._v = V();
  }

  local(v) { this.group.updateMatrixWorld(); return this.group.localToWorld(this._v.copy(v)); }

  update(dt) {
    const G = this.G;
    let sp = 0;
    if (this.flying) {
      this.flyAngle += dt * 0.11;
      const a = this.flyAngle, R = 72;
      this.group.position.set(Math.cos(a) * R, 30 + Math.sin(a * 3) * 4, Math.sin(a) * R);
      this.heading = Math.atan2(-Math.sin(a), Math.cos(a));
      sp = 7;
    } else {
      if (this.state === 'drive') sp = this.speed;
      else if (this.state === 'roll') { this.rollV = Math.max(0, this.rollV - 2.4 * dt); sp = this.rollV; }
      let dist = sp * dt;
      while (dist > 0) {
        const a = this.path[this.seg], b = this.path[(this.seg + 1) % 4], len = a.distanceTo(b);
        const rem = len * (1 - this.t);
        if (dist < rem) { this.t += dist / len; dist = 0; } else { dist -= rem; this.seg = (this.seg + 1) % 4; this.t = 0; }
      }
      const a = this.path[this.seg], b = this.path[(this.seg + 1) % 4];
      this.group.position.lerpVectors(a, b, this.t);
      const want = Math.atan2(b.x - a.x, b.z - a.z);
      this.heading += clamp(angleWrap(want - this.heading), -2.5 * dt, 2.5 * dt);
    }
    this.group.rotation.y = this.heading;
    for (const w of this.m.wheels) w.rotation.x += sp * dt / 0.55;
    const pl = this.puller, ho = this.horse;
    if (pl.attached) { pl.pos.copy(this.local(this.m.harness)); pl.heading = this.heading; pl.root.rotation.y = this.heading; pl.anim = 'quad'; pl.speed = sp; }
    if (ho.attached) {
      ho.pos.copy(this.local(this.m.seat)); ho.heading = this.heading; ho.root.rotation.y = this.heading;
      ho.anim = this.state === 'drive' || this.flying ? 'whip' : 'sit'; ho.speed = 0;
    }
    if (this.passenger) {
      const p = this.passenger; p.pos.copy(this.local(V(0.45, 0.78, 0.5))); p.heading = this.heading; p.root.rotation.y = this.heading; p.anim = 'sit';
    }
    if (ho.attached && (this.state === 'drive' || this.flying)) {
      this.whipT -= dt;
      if (this.whipT <= 0) { this.whipT = rand(0.9, 1.6); if (ho.distToPlayer() < 40 || this.flying) G.audio.whip(ho.pos); }
    }
  }
}

// ---------------------------------------------------------------- Taxi with a headless mannequin driver
class Taxi {
  constructor(G, D) {
    this.G = G; this.D = D;
    const m = makeTaxi(); this.m = m; this.group = m.group;
    this.group.position.copy(G.world.spots.taxi); this.heading = Math.PI; this.group.rotation.y = this.heading;
    G.scene.add(this.group);
    this.driver = D.addNPC(makeHumanoid({ headless: true, skin: '#d8cfc0', shirt: '#1d1d1d', pants: '#1d1d1d', suit: true }),
      { name: 'Driver', ai: 'none', special: true });
    this.driver.attached = true; this.driver.mem.noHorror = true; this.driver.anim = 'drive';
    this.state = 'parked'; this.v = 0; this.wi = 0; this.routeIdx = 0; this.crashed = false;
    this.routes = [
      [V(-3, 0, 12), V(6.3, 0, -6.6), V(14, 0, -3), V(54, 0, -3), V(57, 0, 6), V(57, 0, 24)],
      [V(57, 0, 50), V(52, 0, 57), V(4, 0, 57), V(-3, 0, 52), V(-3, 0, 46)],
    ];
    this.doorTarget = 0;
    this._v = V();
    G.world.addInteract({
      pos: () => this.local(V(-1.2, 1.2, 0)).clone(), r: 3.2, label: 'Get in the taxi',
      enabled: (G) => this.state === 'parked' && !G.player.inVehicle && !this.D.ended,
      act: () => this.enter(),
    });
    G.world.addInteract({
      pos: () => G.camera.position.clone().add(V(0, -0.2, 0)), r: 1, label: 'Get out of the taxi',
      enabled: (G) => G.player.inVehicle === this && this.state === 'arrived',
      act: () => this.exit(),
    });
  }
  local(v) { this.group.updateMatrixWorld(); return this.group.localToWorld(this._v.copy(v)); }
  seatWorld() { return this.local(this.m.passengerSeat).clone(); }

  enter() {
    const G = this.G, P = G.player;
    P.inVehicle = this; P.locked = true;
    this.doorTarget = 0;
    this.state = 'driving'; this.wi = 0; this.v = 0;
    this.engine = G.audio.loop('engine', this.group.position);
    G.ui.say('*the headless driver floors it*', '', 2.5);
    G.audio.thud(null, 0.4);
  }
  exit() {
    const G = this.G, P = G.player;
    P.inVehicle = null; P.locked = false;
    const out = this.local(V(-2.2, 0, 0)).clone(); out.y = 0;
    P.pos.copy(out); P.vel.set(0, 0, 0);
    G.world.resolve(P.pos, P.radius, 1.6);
    this.state = 'parked';
    this.routeIdx = (this.routeIdx + 1) % this.routes.length;
    if (this.engine) { this.engine.stop(); this.engine = null; }
  }

  crash() {
    const G = this.G, D = this.D, d = this.driver, W = G.world;
    this.crashed = true; this.state = 'crash'; this.v = 0;
    const dp = W.crashDumpster.pos.clone().setY(1);
    G.audio.clank(dp, 1); G.audio.thud(dp, 1); G.audio.crunch(dp, 0.5);
    G.player.shake = 0.9; G.player.scare(0.15);
    W.crashDumpster.lid.rotation.x = -1.2; W.crashDumpster.lid.position.y = 1.6;
    d.attached = false;
    d.pos.copy(this.local(V(0.45, 1.2, 1.5)));
    d.fallFrom({ dir: V(Math.sin(this.heading), 0, Math.cos(this.heading)), power: 8, up: 5, spin: 6, lie: 1.4, silent: true });
    G.ui.toast('The driver flew out of the windshield.');
    const T = this;
    D.task(function* () {
      yield () => !d.rd;
      G.ui.say('*the driver dusts off his neck and gets back in*', '', 3);
      d.run(function* (n) { yield A.moveTo(T.local(V(1.5, 0, 0.2)).clone(), 2.2, 'walk', { stop: 0.6, timeout: 12 }); });
      yield () => !d.script;
      d.attached = true; d.anim = 'drive';
      yield 0.6;
      T.state = 'driving';
    });
  }

  update(dt) {
    const G = this.G, P = G.player, d = this.driver;
    if (d.attached) { d.pos.copy(this.local(this.m.driverSeat)); d.heading = this.heading; d.root.rotation.y = this.heading; d.anim = 'drive'; }
    // door opens on its own when you come close
    if (this.state === 'parked') this.doorTarget = Math.hypot(P.pos.x - this.group.position.x, P.pos.z - this.group.position.z) < 6 ? -1.1 : 0;
    this.m.door.rotation.y += (this.doorTarget - this.m.door.rotation.y) * Math.min(1, dt * 4);
    if (this.state === 'driving') {
      const route = this.routes[this.routeIdx], tgt = route[this.wi];
      const dx = tgt.x - this.group.position.x, dz = tgt.z - this.group.position.z, dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      const prev = this.heading;
      this.heading += clamp(angleWrap(want - this.heading), -2.4 * dt, 2.4 * dt);
      if (P.inVehicle === this) P.yaw += this.heading - prev;
      const vmax = dist < 9 && this.wi < route.length - 1 ? 8 : dist < 9 ? 4 : 17;
      this.v += clamp(vmax - this.v, -14 * dt, 7 * dt);
      this.group.position.x += Math.sin(this.heading) * this.v * dt;
      this.group.position.z += Math.cos(this.heading) * this.v * dt;
      if (dist < 2.2) { this.wi++; if (this.wi >= route.length) { this.state = 'arrived'; this.v = 0; G.ui.toast('Arrived. [E] to get out.'); } }
      if (!this.crashed && this.routeIdx === 0 && this.group.position.distanceTo(G.world.crashDumpster.pos) < 3.0) this.crash();
      if (P.inVehicle === this) P.shake = Math.max(P.shake, 0.08 + this.v * 0.004);
    }
    this.group.rotation.y = this.heading;
    for (const w of this.m.wheels) w.rotation.x += this.v * dt / 0.38;
    if (this.engine) { this.engine.setPos(this.group.position); this.engine.setPitch(40 + this.v * 4); }
  }
}

// ---------------------------------------------------------------- Toilet monster
class ToiletMonster {
  constructor(G, D) {
    this.G = G; this.D = D;
    this.t = G.world.toilet; this.g = this.t.group;
    this.home = this.g.position.clone(); this.homeRot = this.g.rotation.y;
    this.state = 'idle'; this.timer = 0; this.cool = 0; this.vel = V(); this.laugh = null;
    this.doorPoint = V(10.4, 0, 46);
  }
  get pos() { return this.g.position; }
  update(dt) {
    const G = this.G, P = G.player, D = this.D, W = G.world;
    const d = Math.hypot(P.pos.x - this.pos.x, P.pos.z - this.pos.z);
    this.timer += dt;
    if (d < 28 && !this.laugh && this.state === 'idle' && !D.horrorRunning) this.laugh = G.audio.loop('laughs', this.pos.clone().setY(1));
    if ((d > 40 || this.state !== 'idle' || D.horrorRunning) && this.laugh) { this.laugh.stop(); this.laugh = null; }
    const look = (dot) => D.lookingAt(this.pos.clone().setY(0.7), dot);
    switch (this.state) {
      case 'idle':
        this.cool -= dt;
        if (this.cool <= 0 && W.toiletDoor.open && d < 4.5 && look(0.8)) { this.state = 'empty'; this.timer = 0; }
        break;
      case 'empty': // you saw an empty toilet... now look away
        if (!look(0.1) && this.timer > 0.8) { this.t.head.visible = true; this.t.lid.rotation.x = -1.9; this.state = 'lurk'; this.timer = 0; }
        break;
      case 'lurk':
        if (look(0.7) || this.timer > 25) {
          G.ui.say('WHO STOLE MY WIFI?!', 'Toilet', 3, '#9cf');
          G.audio.speak('WHO STOLE MY WIFI?!', { pitch: 0.1, rate: 0.9 });
          G.audio.scream(this.pos.clone().setY(1), 0.55, 1.4, 0.7);
          P.scare(0.45); P.shake = 0.4;
          this.t.legs.forEach((l) => (l.visible = true));
          this.state = 'chase'; this.timer = 0;
        }
        break;
      case 'chase': {
        const inside = this.pos.x > 11.3 && Math.abs(this.pos.z - 46) < 0.95;
        const tgt = inside ? this.doorPoint : P.pos;
        const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z, dd = Math.hypot(dx, dz) || 1;
        const h = Math.atan2(dx, dz);
        this.g.rotation.y = h;
        this.pos.x += (dx / dd) * 5.9 * dt; this.pos.z += (dz / dd) * 5.9 * dt;
        this.pos.y = Math.abs(Math.sin(this.timer * 11)) * 0.4;
        if (!inside) W.resolve(this.pos, 0.4, 1);
        this.t.legs.forEach((l, i) => (l.rotation.x = Math.sin(this.timer * 22 + i * Math.PI) * 0.9));
        if (Math.random() < dt * 2) G.audio.clank(this.pos, 0.12);
        if (d < 1.0) { D.jumpscare('toilet', 10); }
        if (this.timer > 9 || d < 1.0) { this.state = 'slip'; this.timer = 0; this.vel.set(Math.sin(h) * 8, 0, Math.cos(h) * 8); G.ui.say('*SLIP*', '', 1); }
        break;
      }
      case 'slip': {
        this.g.rotation.z += dt * 14;
        this.pos.addScaledVector(this.vel, dt); this.pos.y = 0.1;
        const hit = W.resolve(this.pos, 0.45, 1);
        if (hit || this.timer > 1.6) {
          G.audio.clank(this.pos, 1); G.audio.thud(this.pos, 1);
          this.g.rotation.z = Math.PI / 2; this.state = 'dazed'; this.timer = 0;
          G.ui.say('ow. my porcelain.', 'Toilet', 2.5, '#9cf');
        }
        break;
      }
      case 'dazed':
        if (this.timer > 5) { this.g.rotation.z = 0; this.state = 'return'; this.timer = 0; }
        break;
      case 'return': {
        const tgt = this.pos.distanceTo(this.doorPoint) > 0.6 && !(this.pos.x > 10.9) ? this.doorPoint : this.home;
        const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z, dd = Math.hypot(dx, dz);
        this.g.rotation.y = Math.atan2(dx, dz);
        if (dd > 0.15) { this.pos.x += (dx / dd) * 3 * dt; this.pos.z += (dz / dd) * 3 * dt; this.pos.y = Math.abs(Math.sin(this.timer * 9)) * 0.3; }
        if (tgt === this.home && dd < 0.2 || this.timer > 40) {
          this.pos.copy(this.home); this.g.rotation.set(0, this.homeRot, 0);
          this.t.head.visible = false; this.t.lid.rotation.x = -1.3; this.t.legs.forEach((l) => (l.visible = false));
          this.state = 'idle'; this.cool = 60;
        }
        break;
      }
    }
  }
  isThreat() { return this.state === 'chase'; }
}

// ================================================================ Director
export class Director {
  constructor(G) {
    this.G = G;
    this.tasks = [];
    this.flags = {};
    this.horror = false; this.horrorRunning = false; this.finale = false; this.ended = false;
    this.blackout = 0; this.flashFlicker = 0;
    this.nextEvent = 1e9; this.bag = [];
    this.gensOn = 0;
    this.eventsSeen = 0;
    this.kgLoops = 0;
    this.distantT = 20;
    this.mannequins = [];
    this.rtxProp = null;
    this._dir = V();
  }

  // ---------- tasks ----------
  task(fn) { this.tasks.push({ it: fn.call(this), wait: 0, until: null }); }
  updateTasks(dt) {
    for (let i = this.tasks.length - 1; i >= 0; i--) {
      const t = this.tasks[i];
      if (t.wait > 0) { t.wait -= dt; continue; }
      if (t.until && !t.until()) continue;
      t.until = null;
      const r = t.it.next();
      if (r.done) { this.tasks.splice(i, 1); continue; }
      if (typeof r.value === 'number') t.wait = r.value;
      else if (typeof r.value === 'function') t.until = r.value;
    }
  }
  after(sec, fn) { this.task(function* () { yield sec; fn(); }); }
  repeat(n, every, fn) { this.task(function* () { for (let i = 0; i < n; i++) { fn(i); yield every; } }); }

  // ---------- spawning helpers ----------
  addNPC(rig, o = {}) {
    const n = new NPC(this.G, rig, o);
    n.id = Math.floor(Math.random() * 1e6);
    this.G.npcs.push(n);
    return n;
  }
  human(look = {}, o = {}) { return this.addNPC(makeHumanoid({ ...randomLook(), ...look }), o); }

  playerFwd() { const y = this.G.player.yaw; return this._dir.set(-Math.sin(y), 0, -Math.cos(y)); }
  lookingAt(p, dot = 0.8) {
    const cam = this.G.camera, d = V(); cam.getWorldDirection(d);
    const to = p.clone().sub(cam.position); const len = to.length(); if (len < 0.01) return true;
    return to.divideScalar(len).dot(d) > dot;
  }
  findSpot(minD, maxD, behind = false, spread = 0.9) {
    const W = this.G.world, P = this.G.player.pos, f = this.playerFwd().clone();
    if (behind) f.negate();
    const base = Math.atan2(f.x, f.z);
    for (let i = 0; i < 40; i++) {
      const a = base + rand(-spread, spread), r = rand(minD, maxD);
      const x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r;
      if (!W.isFree(x, z, 0.8)) continue;
      if (!behind && !W.lineClear(P.x, P.z, x, z, 1.2)) continue;
      if (this.inKindergarten(V(x, 0, z))) continue;
      return V(x, 0, z);
    }
    return null;
  }
  inKindergarten(p) { const k = this.G.world.kg; return p.x > k.X0 && p.x < k.X1 && p.z > k.Z0 && p.z < k.Z1; }
  inCorridor() { const P = this.G.player.pos; return P.y > -1 && P.x > -31.9 && P.x < -28.1 && P.z < -12.3 && P.z > -49.8; }
  humans() { return this.G.npcs.filter((n) => !n.removed && n.kind === 'human' && !n.mem.noHorror); }

  threats() {
    const out = [];
    for (const n of this.G.npcs) if (n.hostile && !n.removed && !n.hidden && !n.rd) out.push(n.pos);
    if (this.toilet && this.toilet.isThreat()) out.push(this.toilet.pos);
    return out;
  }

  jumpscare(kind, dmg = 0) {
    const G = this.G;
    if (G.time - (this.lastScare || -10) < 2.5) return;
    this.lastScare = G.time;
    G.ui.screamer(kind, 0.85);
    G.audio.sting(0.9);
    G.player.scare(0.6);
    G.player.shake = 0.8;
    if (dmg) G.player.damage(dmg);
  }

  // ---------- setup ----------
  init() {
    const G = this.G, W = G.world;
    // wandering citizens
    let placed = 0;
    for (let i = 0; i < 400 && placed < 14; i++) {
      const x = rand(-95, 95), z = rand(-95, 95);
      if (!W.isFree(x, z, 1) || this.inKindergarten(V(x, 0, z)) || Math.hypot(x, z - 14) < 12) continue;
      this.human({}, { pos: V(x, 0, z), heading: rand(0, 6) }); placed++;
    }
    // special lights
    this.kgLights = [G.lighting.addSpecial(0xff1a0a, 6, 14, V(-30, 3.6, -20)), G.lighting.addSpecial(0xff1a0a, 6, 14, V(-30, 3.6, -40))];
    G.lighting.addSpecial(0x76ff03, 30, 32, W.spots.nvidiaLight);
    this.basementLight = G.lighting.addSpecial(0xffa040, 8, 14, W.spots.basementLight);
    W.kgRoomDoors.forEach((d) => { d.open = true; d.target = d.angle = d.openDir * 1.6; });

    this.cart = new Cart(G, this);
    this.taxi = new Taxi(G, this);
    this.toilet = new ToiletMonster(G, this);

    // NVIDIA scene actors (hidden until the doors open)
    this.woman = this.human({ hair: 'long', hairColor: '#0b0b0b', shirt: '#7a1a2a', pants: '#20202a', skin: '#e8c39e', fat: 0.95, hat: 'none' },
      { name: 'Mei', color: '#ff7a9a', special: true, ai: 'none', runSpeed: 6, voice: { pitch: 1.4, rate: 1.15 } });
    this.woman.mem.noHorror = true;
    this.hide(this.woman);
    this.woman.heldRTX = makeRTX(1); this.woman.heldRTX.position.set(0, 0.32, 0.32); this.woman.heldRTX.rotation.set(0, Math.PI / 2, 0.2);
    this.woman.rig.spine.add(this.woman.heldRTX);
    this.woman.holding = true;
    this.robot = this.addNPC(makeRobot(), { name: 'NVIDIA Guard-Bot', color: '#76ff03', special: true, kind: 'robot', radius: 0.9, height: 3.6, voice: { pitch: 0.1, rate: 0.8 }, ai: 'none' });
    this.robot.mem.noHorror = true;
    this.hide(this.robot);
    this.victim = this.human({ shirt: '#2a4a6a' }, { pos: W.spots.nvidiaVictim.clone(), heading: -1.2, ai: 'idle', name: 'Bystander' });
    this.victim.mem.idleAnim = 'phone';
    W.addInteract({
      pos: () => this.woman.pos.clone().setY(1.3), r: 2.6, label: 'Help Mei: take the RTX 4090 and run',
      enabled: () => this.woman.holding && !this.woman.hidden && !this.woman.rd && this.flags.nvidia,
      act: () => { this.womanGive(); },
    });

    // location gags
    this.dancer = this.human({ shirt: '#a0207a', pants: '#222', hat: 'cap', capColor: '#e0e000' }, { pos: W.spots.dancer.clone(), ai: (n, dt) => this.dancerAI(n, dt), name: 'Dancer', runSpeed: 13 });
    this.puller = this.human({ shirt: '#3a5a3a' }, { pos: W.spots.marketDoor.clone(), heading: -Math.PI / 2, ai: 'idle', name: 'Shopper' });
    this.sleeper = this.human({ shirt: '#555', hair: 'none' }, { pos: W.spots.bench.clone(), heading: -Math.PI / 2, ai: 'idle', name: 'Sleeping Guy' });
    this.sleeper.mem.idleAnim = 'sleep';
    this.roofGuy = this.human({ shirt: '#6a4a1a' }, { pos: W.spots.roof.clone(), heading: Math.PI / 2, ai: 'idle', name: 'Roof Guy' });
    this.roofGuy.mem.keepY = true; this.roofGuy.mem.idleAnim = 'idle';
    this.glitch = this.human({ shirt: '#3a3a6a', skin: '#c0a080' }, { pos: V(-42, 0, 3), ai: (n, dt) => this.glitchAI(n, dt), name: 'NPC_07', color: '#8af', voice: { pitch: 0.6, rate: 0.75 } });
    this.glitch.mem.noHorror = true; this.glitch.mem.tickHidden = true;
    this.caretaker = this.addNPC(makeHumanoid({ faceless: true, skin: '#b8b8b0', shirt: '#121212', pants: '#121212', suit: true, scale: 1.12, hair: 'short', hairColor: '#cfcfcf' }),
      { pos: V(-30, 0, -46), heading: Math.PI, name: 'The Caretaker', color: '#aaa', ai: (n, dt) => this.caretakerPace(n, dt), special: true, walkSpeed: 0.7 });
    this.caretaker.mem.noHorror = true;
    this.janitor = this.human({ shirt: '#3a3a20', skin: '#9a9a90', faceless: true }, { pos: V(-33.5, 0, -18), heading: Math.PI / 2, ai: 'stare', name: '???' });
    this.janitor.mem.noHorror = true; this.hide(this.janitor);
    // sleeping mannequins that Buddy keeps waking up
    for (const s of W.mannequinSpots) {
      const m = this.addNPC(makeHumanoid({ mannequin: true, eyesGlow: '#ff1010' }), { pos: s.clone(), heading: rand(0, 6), kind: 'human', ai: 'idle', name: 'Mannequin', color: '#f44', runSpeed: 5.2, damage: 9 });
      m.mem.noHorror = true; m.mem.mannequin = true; m.mem.idleAnim = 'stare';
      m.rig.eyes = m.rig.head.children.filter((c) => c.material && c.material.type === 'MeshBasicMaterial');
      m.rig.eyes.forEach((e) => (e.visible = false));
      this.mannequins.push(m);
    }
    this.giant = makeGiantHorseHead(); this.giant.visible = false; this.giant.scale.setScalar(5); G.scene.add(this.giant);

    this.task(this.introTask);
  }

  hide(n) { n.hidden = true; n.root.visible = false; }
  show(n) { n.hidden = false; n.root.visible = true; }

  // ---------- quest ----------
  updateQuest() {
    const G = this.G, P = G.player;
    let q;
    if (this.ended) q = '';
    else if (!P.hasRTX && !this.flags.nvidia) q = '<b>OBJECTIVE</b><br>Explore 4090 City.<br><small>Something is glowing green in the north-east...</small>';
    else if (!P.hasRTX) q = '<b>OBJECTIVE</b><br>Get the <span class="g">RTX 4090</span>.<br><small>Pick it up, take it from Mei, or stun the robot with a brick (R).</small>';
    else if (this.gensOn < 3) {
      q = `<b>OBJECTIVE</b><br>Start the generators (${this.gensOn}/3)<br><small>` +
        G.world.generators.map((g) => `${g.on ? '✔' : '✖'} ${g.name}`).join('<br>') + '</small>';
    } else q = '<b>OBJECTIVE</b><br><span class="g">The gate is open.</span> Run NORTH and escape!';
    if (this.horror && !this.finale && !P.hasRTX) q += '<br><span class="r">THEY ARE COMING.</span>';
    G.ui.quest(q);
  }

  // ---------- INTRO ----------
  *introTask() {
    const G = this.G, P = G.player;
    P.locked = true; P.pitch = 1.25;
    G.ui.fade(1, 0.01);
    G.ui.big('03:33 AM', 2.5, 'clock');
    yield 2.6;
    G.ui.fade(0, 3);
    G.audio.heartbeat(0.5);
    let t = 0;
    while (t < 1) { t = Math.min(1, t + G.dt / 2.8); P.pitch = 1.25 * (1 - t * t * (3 - 2 * t)) + Math.sin(t * 9) * 0.05 * (1 - t); yield 0; }
    G.ui.big('WELCOME TO 4090 CITY', 4.5, 'title');
    yield 1.5;
    // the runner
    const W = G.world;
    const runner = this.human({ shirt: '#c0c0c0', pants: '#2a3a5a', hair: 'short' }, { pos: V(1.5, 0, -52), heading: 0, name: 'Running Man', color: '#ffcc66', voice: { pitch: 1.2, rate: 1.3 } });
    this.runner = runner;
    const lamp = W.lamps.filter((l) => Math.abs(l.base.x) < 8 && l.base.z < -14 && l.base.z > -40).sort((a, b) => b.base.z - a.base.z)[0];
    G.audio.scream(V(1.5, 1.6, -52), 1.1, 1.5, 0.8);
    P.locked = false;
    this.updateQuest();
    runner.run(function* (n, G) {
      n.mem.uninterruptible = true;
      yield A.say('AAAAAAAAAAAH!', { loud: true });
      yield A.move(1.5, -34, 6.6, 'panic', { timeout: 8 });
      yield A.face(V(1.5, 0, -90), 0.35);
      yield A.move(1.5, -15, 6.6, 'run', { timeout: 8 });
      yield A.fall('forward', 5.5, { up: 0.3, lie: 5 });
      yield A.say("I'M ALIVE!", { loud: true });
      if (lamp) {
        n.mem.noAvoid = true; n.mem.bonkPoles = true;
        yield A.move(lamp.base.x, lamp.base.z, 6.8, 'panic', { stop: 0.05, timeout: 5 });
        n.mem.noAvoid = false; n.mem.bonkPoles = false;
        yield A.wait(0.2);
      }
      yield A.say('...the pole came out of nowhere.');
      n.mem.uninterruptible = false;
    });
    yield 20;
    this.nextEvent = G.time + rand(25, 40);
    yield 6;
    this.spawnBuddy();
  }

  // ---------- BUDDY (the "friend" NPC) ----------
  spawnBuddy() {
    const G = this.G;
    const s = this.findSpot(10, 16, true, 0.6) || this.G.player.pos.clone().add(V(4, 0, 6));
    const b = this.buddy = this.human({ shirt: '#e0e0e0', pants: '#2a4a2a', hat: 'cap', capColor: '#2a8a2a', fat: 1.05 },
      { pos: s, name: 'Buddy', color: '#7f7', special: true, voice: { pitch: 1.1, rate: 1.2 }, runSpeed: 6.6 });
    b.mem.noHorror = true; b.mem.noCrash = true;
    b.onImpact = () => this.buddyNoise(b);
    const D = this;
    b.run(function* (n) {
      yield A.say('HEY! WAIT UP! I WILL PROTECT YOU!', { loud: true });
      yield A.chase(6, 6, { reach: 2.5 });
      yield A.say("I'm Buddy. I'm your friend now. No take-backs.");
      n.ai = (n2, dt) => D.buddyAI(n2, dt);
    });
    G.ui.toast('A new friend appeared. (He will follow you.)');
  }

  buddyAI(n, dt) {
    const G = this.G, P = G.player, m = n.mem;
    if (P.inVehicle || this.ended) { n.anim = 'wave'; n.facePlayer(); return; }
    const d = n.distToPlayer();
    if (d > 45 || Math.abs(n.pos.y - P.pos.y) > 4) {
      const s = this.findSpot(6, 10, true, 0.5);
      if (s) { s.y = P.pos.y; n.pos.copy(s); } else if (P.inBasement()) n.pos.set(P.pos.x + 1, P.pos.y, P.pos.z + 1);
      return;
    }
    m.chatCd = (m.chatCd ?? 30) - dt;
    if (m.chatCd <= 0) { m.chatCd = rand(40, 70); n.say(pick(BUDDY_LINES), 3.5); }
    m.tripCd = (m.tripCd ?? rand(25, 45)) - dt;
    m.braveCd = (m.braveCd ?? 0) - dt;
    let threat = null, best = 18;
    for (const t of this.threats()) {
      const dd = Math.hypot(t.x - P.pos.x, t.z - P.pos.z);
      if (dd < best) { best = dd; threat = t; }
    }
    if (threat && m.braveCd <= 0) {
      if (!m.brave) { m.brave = true; n.say(pick(['I GOT THIS!', 'STAY BEHIND ME!', 'NOT TODAY, MONSTER!', 'FRIENDSHIP POWEEER!']), 2, true); }
      n.steer(threat.x, threat.z, 6.6, dt, 'protect');
      m.throwCd = (m.throwCd ?? 2) - dt;
      if (m.throwCd <= 0 && Math.hypot(threat.x - n.pos.x, threat.z - n.pos.z) < 14) {
        m.throwCd = rand(5, 9);
        const aim = V(threat.x + rand(-3, 3), 0, threat.z + rand(-3, 3)).sub(n.pos).setY(0).normalize();
        const br = G.props.spawnBrick(n.pos.clone().setY(n.pos.y + 1.6), aim.multiplyScalar(15).add(V(0, 3, 0)));
        br.ignore = n; br.byBuddy = true;
        n.say(pick(['EAT BRICK!', 'BRICK ATTACK!', 'I HAVE ONE (1) BRICK!']), 1.6, true);
      }
      if (Math.random() < dt * 0.9 || Math.hypot(threat.x - n.pos.x, threat.z - n.pos.z) < 2) {
        m.brave = false; m.braveCd = 7;
        n.fallFrom({ dir: 'forward', power: 5.5, up: 0.6, lie: 1.4 });
      }
      return;
    }
    m.brave = false;
    if (P.fear > 0.7 && !this.horror) {
      const fb = this.playerFwd();
      if (G.time - (m.hideLine || -99) > 25) { m.hideLine = G.time; n.say(pick(["I'm guarding your back. From very close.", "Don't mind me. I live here now. Behind you.", 'If something comes, I will hold you as a shield. Respectfully.']), 3); }
      n.steer(P.pos.x - fb.x * 0.9, P.pos.z - fb.z * 0.9, 4, dt, 'protect');
      return;
    }
    if (m.tripCd <= 0 && d < 15) { m.tripCd = rand(30, 55); n.fallFrom({ dir: 'forward', power: 4, up: 0.3, lie: 1.2 }); return; }
    const f = this.playerFwd();
    const tx = P.pos.x - f.x * 2.6 - f.z * 1.3, tz = P.pos.z - f.z * 2.6 + f.x * 1.3;
    const dd = Math.hypot(tx - n.pos.x, tz - n.pos.z);
    if (dd > 1.2) n.steer(tx, tz, dd > 8 ? 6.4 : dd > 3 ? 4.3 : 1.8, dt);
    else { n.anim = 'idle'; n.turnTo(Math.atan2(f.x, f.z), dt, 4); }
  }

  /** Buddy fell over loudly — something nearby wakes up. */
  buddyNoise(b) {
    const G = this.G;
    if (G.time - (this.lastNoise || -99) < 10 || this.ended) return;
    this.lastNoise = G.time;
    this.after(1.2, () => b.say(pick(["I'M OKAY!", 'I meant to do that!', 'The ground attacked first!', 'Ow. Did anyone hear that?']), 2));
    let target = null, best = 50;
    for (const m of this.mannequins) {
      if (m.mem.awake || m.removed) continue;
      const d = m.pos.distanceTo(b.pos);
      if (d < best) { best = d; target = m; }
    }
    if (!target) {
      const s = this.findSpot(18, 26, true, 1.2);
      if (!s) return;
      target = this.addNPC(makeHumanoid({ mannequin: true, eyesGlow: '#ff1010' }), { pos: s, ai: 'idle', name: 'Mannequin', color: '#f44', runSpeed: 5.2, damage: 9 });
      target.mem.noHorror = true; target.mem.mannequin = true;
      target.rig.eyes = target.rig.head.children.filter((c) => c.material && c.material.type === 'MeshBasicMaterial');
      this.mannequins.push(target);
    }
    this.wakeMannequin(target);
    G.ui.toast("Buddy's crash woke something up...");
  }

  wakeMannequin(m) {
    const G = this.G;
    m.mem.awake = true; m.mem.until = G.time + 16; m.hostile = true;
    if (m.rd) { m.rd = null; m.rig.body.quaternion.identity(); }
    m.rig.eyes.forEach((e) => (e.visible = true));
    G.audio.scream(m.pos.clone().setY(1.7), 0.45, 1.6, 0.6);
    m.ai = (n, dt) => {
      if (G.time > n.mem.until || this.ended) {
        n.hostile = false; n.mem.awake = false; n.mem.sleepSince = G.time;
        n.rig.eyes.forEach((e) => (e.visible = false));
        n.ai = 'idle';
        n.fallFrom({ dir: 'forward', power: 2, lie: 1e9, getUp: false, silent: true });
        return;
      }
      const P = G.player.pos;
      if (G.player.hiding) { n.anim = 'stare'; return; }
      n.steer(P.x, P.z, n.runSpeed, dt, 'creep');
      n.rig.phase += dt * 6;
      if (n.distToPlayer() < 1.15 && n.hitCd <= 0) {
        n.hitCd = 2; G.player.damage(n.damage, n.pos, 'mannequin');
        n.fallFrom({ dir: 'backward', power: 2.5, lie: 1, silent: true });
      }
    };
  }

  // ---------- events triggered by other systems ----------
  onCrash(a, b) {
    this.eventsSeen++;
    if (a.distToPlayer() < 30) this.after(2.5, () => { if (!a.removed) a.say(pick(['...ow.', 'WHO PUT YOU THERE?!', 'My face!'])); });
  }
  onPropHit(p, n) {
    if (n === this.robot) { this.G.ui.toast('Robot stunned!'); n.say('ERROR. ERROR. BRICK DETECTED.', 2, true); }
  }
  onFlashlight() {}

  // ---------- NVIDIA / RTX ----------
  *nvidiaTask() {
    const G = this.G, W = G.world;
    if (this.flags.nvidia) return;
    this.flags.nvidia = true;
    this.eventsSeen++;
    W.nvidiaDoors.target = 1;
    G.audio.beep(W.spots.nvidiaDoor, 300, 0.4, 0.3, 'sawtooth');
    yield 0.9;
    const w = this.woman;
    w.pos.copy(W.spots.nvidiaDoor); w.heading = 0; w.root.rotation.y = 0; this.show(w);
    G.audio.scream(w.pos.clone().setY(1.6), 1.5, 1.2, 0.7);
    const D = this;
    w.run(function* (n) {
      n.mem.uninterruptible = true;
      yield A.say("NO NO NO! IT'S MINE NOW!", { loud: true });
      yield A.move(29, -17, 6.3, 'carry', { timeout: 6 });
      yield A.call(() => D.launchRTX(n, D.victim));
      yield A.fall('forward', 4.5, { up: 0.3, lie: 1.6 });
      yield A.say('NOOOO! MY 4090!', { loud: true });
      n.mem.uninterruptible = false;
      n.ai = (n2, dt) => D.womanAI(n2, dt);
    });
    yield 1.3;
    const r = this.robot;
    r.pos.copy(W.spots.nvidiaDoor); r.heading = 0; r.root.rotation.y = 0; this.show(r);
    r.hostile = true;
    r.ai = (n, dt) => this.robotAI(n, dt);
    r.say('RETURN MY RTX 4090!', 3, true);
    G.audio.robotVoice(r.pos);
    this.updateQuest();
    yield 8;
    W.nvidiaDoors.target = 0;
  }

  launchRTX(from, victim) {
    const G = this.G;
    if (from.heldRTX && from.heldRTX.parent) from.heldRTX.parent.remove(from.heldRTX);
    from.holding = false;
    const start = from.pos.clone().add(from.forward().multiplyScalar(0.5)).setY(from.pos.y + 1.3);
    let tgt = victim && !victim.removed ? victim.pos.clone().setY(victim.pos.y + 1.9) : start.clone().add(V(rand(-4, 4), -1, rand(3, 6)));
    const T = 1.05, g = 18 * G.gravityScale;
    const vel = V((tgt.x - start.x) / T, (tgt.y - start.y + 0.5 * g * T * T) / T, (tgt.z - start.z) / T);
    this.spawnRTXProp(start, vel, from);
    G.ui.toast('The RTX 4090 is flying!');
  }

  spawnRTXProp(pos, vel, ignore) {
    const G = this.G;
    if (this.rtxProp) G.props.remove(this.rtxProp);
    const D = this;
    const p = G.props.spawn(makeRTX(1), pos, vel, {
      kind: 'rtx', r: 0.15, ignore,
      onHit: (pp, n) => {
        if (n === D.victim) D.after(3.5, () => n.say('Who throws a GRAPHICS CARD at a man?!'));
      },
      onRest: (pp) => {
        if (pp.interact) return;
        pp.interact = G.world.addInteract({ pos: () => pp.pos.clone().setY(pp.pos.y + 0.2), r: 2.4, label: 'Take the RTX 4090', act: () => D.giveRTXToPlayer() });
      },
    });
    this.rtxProp = p;
  }

  womanAI(n, dt) {
    const G = this.G, r = this.robot, P = G.player;
    if (P.hasRTX) {
      if (!n.mem.thanked) { n.mem.thanked = true; n.say(P.hasRTX ? 'Fine! TAKE IT! Just RUN!' : '...', 3, true); }
      n.ai = 'wander'; return;
    }
    if (!n.holding) {
      const p = this.rtxProp;
      if (p && p.rested) {
        n.steer(p.pos.x, p.pos.z, 5.4, dt, 'run');
        if (Math.hypot(p.pos.x - n.pos.x, p.pos.z - n.pos.z) < 0.9) {
          G.props.remove(p); this.rtxProp = null;
          n.rig.spine.add(n.heldRTX); n.holding = true;
          n.say('MINE! MY PRECIOUS 4090!', 2, true);
        }
      } else { n.anim = 'idle'; }
      return;
    }
    const d = Math.hypot(r.pos.x - n.pos.x, r.pos.z - n.pos.z);
    if (d < 24 && !r.hidden) {
      const dx = n.pos.x - r.pos.x, dz = n.pos.z - r.pos.z, l = Math.hypot(dx, dz) || 1;
      n.steer(n.pos.x + dx / l * 6, n.pos.z + dz / l * 6, 5.3, dt, 'carry');
      if (Math.random() < dt * 0.15) n.say(pick(['HELP ME!', 'IT WAS ON SALE!', 'You there! TAKE IT!']), 2, true);
    } else { n.anim = 'carry'; n.speed = 0; }
  }

  womanGive() {
    const w = this.woman;
    if (w.heldRTX.parent) w.heldRTX.parent.remove(w.heldRTX);
    w.holding = false;
    w.say("TAKE IT! I CAN'T RUN ANYMORE!", 3, true);
    this.giveRTXToPlayer();
  }

  womanDrop() {
    const w = this.woman, G = this.G;
    if (!w.holding) return;
    if (w.heldRTX.parent) w.heldRTX.parent.remove(w.heldRTX);
    w.holding = false;
    this.spawnRTXProp(w.pos.clone().setY(w.pos.y + 1.4), V(rand(-3, 3), 7, rand(-3, 3)), w);
    w.fallFrom({ dir: 'backward', power: 4, up: 2, lie: 2 });
    G.audio.clank(w.pos, 0.6);
  }

  giveRTXToPlayer() {
    const G = this.G, P = G.player;
    if (P.hasRTX) return;
    if (this.rtxProp) { G.props.remove(this.rtxProp); this.rtxProp = null; }
    P.hasRTX = true;
    this.eventsSeen++;
    G.audio.sting(0.5);
    G.ui.big('YOU HAVE THE RTX 4090', 3, 'green');
    if (!this.horror) { if (!this.horrorRunning) this.task(this.horrorTask); }
    else this.startFinale();
    this.updateQuest();
  }

  robotAI(n, dt) {
    const G = this.G, P = G.player, m = n.mem, boss = m.boss;
    m.shout = (m.shout ?? 6) - dt;
    if (n.stun > 0) {
      n.stun -= dt; n.anim = 'idle'; n.hostile = false;
      n.rig.visorMat.color.set(Math.random() < 0.5 ? '#ff0000' : '#111');
      if (Math.random() < dt * 6) G.audio.beep(n.pos.clone().setY(3), rand(200, 2000), 0.05, 0.15);
      n.rig.spine.rotation.z = Math.sin(G.time * 20) * 0.1;
      return;
    }
    n.hostile = true;
    n.rig.visorMat.color.set(boss ? '#ff1010' : '#76ff03');
    if (m.shout <= 0) {
      m.shout = rand(6, 9);
      n.say(pick(boss ? ['RETURN. MY. 4090.', 'YOUR FRAMERATE ENDS HERE.', 'INSTALLING DRIVER: DOOM.EXE'] : ['RETURN MY RTX 4090!', 'THAT CARD IS NOT IN STOCK!', 'UNAUTHORIZED FRAMERATE DETECTED!']), 2.5, true);
      G.audio.robotVoice(n.pos);
    }
    const speed = boss ? 5.6 : 4.4;
    let tgt = null, holder = null;
    if (P.hasRTX) { tgt = P.pos; holder = 'player'; }
    else if (this.woman.holding && !this.woman.hidden) { tgt = this.woman.pos; holder = 'woman'; }
    else if (this.rtxProp) {
      const pp = this.rtxProp.pos;
      if (n.distToPlayer() < 13 && (m.chaseT = (m.chaseT ?? 0) + dt) < 6) tgt = P.pos;
      else { m.chaseT = Math.max(0, (m.chaseT ?? 0) - dt * 2); if (Math.hypot(pp.x - n.pos.x, pp.z - n.pos.z) > 3) tgt = pp; }
      holder = 'none';
    } else if (n.distToPlayer() < 20) tgt = P.pos;
    if (P.inBasement() || P.inVehicle || P.hiding) tgt = null;
    if (!tgt) { n.anim = 'idle'; n.turnTo(n.heading + dt * 0.8, dt, 1); return; }
    const before = Math.sin(n.rig.phase);
    n.steer(tgt.x, tgt.z, speed, dt, 'walk');
    n.rig.phase -= dt * (2 + speed * 1.9) * 0.55; // heavy, slower stride
    if (Math.sign(before) !== Math.sign(Math.sin(n.rig.phase)) && n.distToPlayer() < 35) {
      G.audio.stomp(n.pos, boss ? 0.9 : 0.5);
      if (boss && n.distToPlayer() < 20) P.shake = Math.max(P.shake, 0.25);
    }
    const d = Math.hypot(tgt.x - n.pos.x, tgt.z - n.pos.z);
    const reach = n.radius + 0.9;
    if (d < reach && n.hitCd <= 0) {
      n.hitCd = 2.2;
      if (holder === 'player' || tgt === P.pos) {
        if (boss || !m.scared) { m.scared = true; this.jumpscare('robot'); }
        P.damage(boss ? 28 : 18, n.pos, 'robot');
      } else if (holder === 'woman') this.womanDrop();
    }
  }

  // ---------- ROBOT proximity: fake FPS drop, glitch, overheating ----------
  robotEffects() {
    const G = this.G, r = this.robot, ui = G.ui;
    if (!r || r.hidden || this.ended) { ui.fakeFps(null); ui.glitch(0); ui.warning(null); ui.alarm(false); G.renderScaleMul = 1; return; }
    const d = r.distToPlayer();
    const range = r.mem.boss ? 34 : 25;
    if (d > range) { ui.fakeFps(null); ui.glitch(0); ui.warning(null); ui.alarm(false); G.renderScaleMul = 1; return; }
    const k = 1 - d / range;
    const fps = d > range * 0.72 ? 60 : d > range * 0.48 ? 30 : d > range * 0.24 ? 10 : 3;
    ui.fakeFps(fps + Math.floor(Math.random() * 3));
    ui.glitch(k * 0.9);
    ui.warning(k > 0.35 ? `⚠ GPU OVERHEATING — ${Math.floor(80 + k * 30)}°C` : null);
    ui.alarm(k > 0.45);
    G.renderScaleMul = d < range * 0.35 ? 0.45 : d < range * 0.6 ? 0.7 : 1;
  }

  // ---------- CART scene: human trips, horse flies, horse chases you ----------
  *cartTask() {
    const G = this.G, C = this.cart, D = this, ho = C.horse, pl = C.puller;
    this.flags.cartBusy = true; this.eventsSeen++;
    C.state = 'roll'; C.rollV = C.speed;
    pl.attached = false;
    pl.say('AAH- my knee!');
    pl.fallFrom({ dir: 'forward', power: 2.5, up: 0, lie: 1e9, getUp: false });
    yield 0.35;
    ho.attached = false;
    ho.pos.copy(C.local(C.m.seat)); ho.pos.y += 0.5;
    ho.fallFrom({ dir: V(Math.sin(C.heading), 0, Math.cos(C.heading)), power: 7, up: 4.5, spin: 5, lie: 1.3 });
    G.audio.scream(ho.pos.clone().setY(2), 0.4, 1.0, 0.6);
    yield () => !ho.rd;
    ho.say('...', 1);
    // gag 12: a panicking citizen jumps into the empty cart
    const passenger = this.humans().filter((n) => !n.script && !n.rd && !n.hidden && n.pos.distanceTo(C.group.position) < 35 && !n.special)[0];
    if (passenger) {
      passenger.run(function* (n) {
        yield A.say('A HORSE! A WALKING HORSE!', { loud: true });
        yield A.moveTo(C.group.position.clone(), 6, 'panic', { stop: 1.6, timeout: 8 });
        yield A.call(() => { n.attached = true; C.passenger = n; G.audio.thud(n.pos, 0.5); n.say('...this is my cart now.'); });
      });
    }
    ho.hostile = false;
    ho.run(function* (n) {
      n.mem.uninterruptible = true;
      yield A.face('player', 0.4, 'stare');
      yield A.wait(3, 'stare', { look: 'player' });
      yield A.call(() => { n.hostile = true; G.audio.scream(n.pos.clone().setY(2), 0.35, 1.5, 0.8); G.player.scare(0.35); });
      const phoneCall = Math.random() < 0.45;
      yield A.chase(phoneCall ? 7 : 22, 6.8, { reach: 1.2, anim: 'run' });
      if (phoneCall && n.distToPlayer() > 1.6) {
        yield A.call(() => { n.hostile = false; for (let i = 0; i < 6; i++) setTimeout(() => G.audio.beep(n.pos, i % 2 ? 1320 : 990, 0.08, 0.25, 'square'), i * 110); });
        yield A.wait(0.8, 'stare');
        yield A.anim('phone', 0.5);
        yield A.say('...hello? ...Yes, mom.');
        yield A.anim('phone', 2.4);
        yield A.say('No mom, I am NOT chasing humans again.');
        yield A.anim('phone', 2.4);
        yield A.face('player', 0.3, 'phone');
        yield A.say('...this is not over. Love you mom.');
        yield A.anim('phone', 1.5);
      }
      yield A.call(() => {
        n.hostile = false;
        if (n.distToPlayer() < 1.6) D.jumpscare('horse', 15);
      });
      yield A.say('WHERE IS MY CART?!', { loud: true });
      yield A.moveTo(C.group.position.clone(), 2.6, 'walk', { stop: 2, timeout: 45 });
      n.mem.uninterruptible = false;
    });
    yield () => !ho.script || C.flying;
    // remount
    if (C.passenger) {
      const p = C.passenger; C.passenger = null; p.attached = false;
      p.fallFrom({ dir: V(Math.cos(C.heading), 0, -Math.sin(C.heading)), power: 6, up: 4, spin: 3, lie: 2 });
      ho.say('OFF. MY. CART.', 2);
    }
    ho.attached = true;
    pl.getUp();
    yield () => !pl.rd;
    pl.attached = true;
    C.state = 'drive';
    this.flags.cartBusy = false;
    this.flags.cartCooldown = G.time + 180;
  }

  // ---------- KINDERGARTEN ----------
  caretakerPace(n, dt) {
    const m = n.mem;
    m.dir = m.dir || -1;
    const tz = m.dir < 0 ? -46.5 : -38;
    if (Math.abs(n.pos.z - tz) < 0.3) m.dir *= -1;
    n.steer(-30, tz, n.walkSpeed, dt, 'walk');
  }

  *kgTask() {
    const G = this.G, P = G.player, W = G.world, c = this.caretaker;
    this.flags.kg = true; this.eventsSeen++;
    yield () => this.inCorridor() && c.distToPlayer() < 14;
    c.ai = 'none';
    c.run(function* () { yield A.face('player', 1.4, 'stare'); yield A.wait(2.6, 'stare', { look: 'player' }); });
    P.scare(0.25);
    G.audio.heartbeat(0.7);
    yield 4;
    this.setKgLights(false); this.blackout = 2.2;
    G.audio.beep(null, 60, 0.4, 0.25, 'sawtooth');
    this.hide(c);
    yield 2.2;
    this.setKgLights(true);
    for (let i = 0; i < 6; i++) { G.audio.thud(V(-30, 0.3, -49.5), 0.35); G.audio.step(0.05); yield 0.5; }
    // ...and now he is right behind you
    const f = this.playerFwd().clone();
    c.pos.set(P.pos.x - f.x * 1.3, P.pos.y, P.pos.z - f.z * 1.3);
    G.world.resolve(c.pos, 0.3, 2);
    c.ai = 'stare'; c.stopScript(); this.show(c);
    let t = 0;
    yield () => { t += G.dt; return this.lookingAt(c.pos.clone().setY(1.9), 0.55) || t > 14; };
    if (t <= 14) { this.jumpscare('ghost', 6); c.say('...you should not be here after hours.', 2.5); }
    yield 0.6;
    this.hide(c); c.ai = 'none';
    this.flags.kgDone = true;
    // the janitor: appears in a doorway when you are not looking
    yield () => this.inKindergarten(P.pos) && !this.lookingAt(V(-31, 1.5, -18), 0.2);
    const j = this.janitor; this.show(j); j.pos.set(-31.2, 0, -18);
    let seen = 0;
    yield () => { if (this.lookingAt(j.pos.clone().setY(1.6), 0.85)) seen += G.dt; return seen > 1.0 || !this.inKindergarten(P.pos); };
    this.blackout = 0.35; this.setKgLights(false);
    yield 0.35;
    this.setKgLights(true); this.hide(j);
  }

  setKgLights(on) {
    const W = this.G.world;
    W.kgBulbs.forEach((b) => (b.material = on ? W.kgLightOn : W.kgLightOff));
    this.kgLights.forEach((l) => (l.intensity = on ? l.userData.base : 0));
  }

  updateKindergarten(dt) {
    const G = this.G, P = G.player, W = G.world;
    if (!this.inKindergarten(P.pos) || P.pos.y < -1) return;
    // chairs creep around when you are not looking
    this.chairT = (this.chairT ?? 2) - dt;
    if (this.chairT <= 0) {
      this.chairT = rand(2, 4.5);
      const ch = pick(W.chairs);
      if (ch.position.distanceTo(P.pos) < 16) {
        ch.userData.slide = { vx: rand(-1.4, 1.4), vz: rand(-1.4, 1.4), t: 0.5, spin: rand(-3, 3) };
        G.audio.beep(ch.position, 70, 0.4, 0.08, 'sawtooth');
      }
    }
    for (const ch of W.chairs) {
      const s = ch.userData.slide;
      if (!s) continue;
      s.t -= dt; ch.position.x += s.vx * dt; ch.position.z += s.vz * dt; ch.rotation.y += s.spin * dt;
      ch.position.x = clamp(ch.position.x, W.kg.X0 + 0.5, W.kg.X1 - 0.5); ch.position.z = clamp(ch.position.z, W.kg.Z0 + 0.5, W.kg.Z1 - 0.5);
      if (s.t <= 0) ch.userData.slide = null;
    }
    // mannequins turn to face you when unseen
    for (const r of W.kgMannequins) {
      if (!this.lookingAt(r.root.position.clone().setY(1.5), 0.3)) r.root.rotation.y = Math.atan2(P.pos.x - r.root.position.x, P.pos.z - r.root.position.z);
    }
    // doors slam
    for (const d of W.kgRoomDoors) {
      if (d.open && !d.slammed && d.center.distanceTo(P.pos) < 3.2 && Math.random() < dt * 1.5) {
        d.slammed = true; W.toggleDoor(d, false); G.audio.thud(d.center, 1.2); P.scare(0.2); P.shake = 0.3;
      }
    }
    // the endless corridor (after the Caretaker appeared)
    if (this.flags.kgDone && this.kgLoops < 2 && this.inCorridor() && P.pos.z < -41.2 && P.vel.z < 0) {
      P.pos.z += 24; this.kgLoops++;
      this.blackout = 0.12; this.flashFlicker = 0.5;
      G.ui.toast('...didn\'t you just walk through here?');
    }
  }

  // ---------- LOCATION GAGS ----------
  dancerAI(n, dt) {
    const G = this.G, m = n.mem, P = G.player, W = G.world;
    if (!m.music && !this.horrorRunning && !this.horror) m.music = G.audio.loop('music', n.pos.clone().setY(1.5));
    m.state = m.state || 'dance';
    const d = n.distToPlayer();
    if (m.state === 'dance') {
      n.anim = 'dance';
      if (n.pos.distanceTo(W.spots.dancer) > 0.5) { n.steer(W.spots.dancer.x, W.spots.dancer.z, 1.6, dt); }
      if (d < 18 && this.lookingAt(n.pos.clone().setY(1.4), 0.75) && G.time > (m.cool || 0)) {
        m.watch = (m.watch || 0) + dt;
        if (m.watch > 1.5) {
          m.state = 'run'; m.watch = 0; this.eventsSeen++;
          if (m.music) { m.music.stop(); m.music = null; }
          G.audio.beep(n.pos, 90, 0.3, 0.3, 'sawtooth'); // record scratch-ish
          n.run(function* (nn) {
            yield A.face('player', 0.2, 'stare');
            yield A.wait(1.1, 'stare', { look: 'player' });
            yield A.chase(4, 13, { reach: 1.7, anim: 'run' });
            yield A.wait(2, 'stare', { look: 'player' });
            yield A.say('...nice night, huh?');
            yield A.moveTo(W.spots.dancer, 1.5, 'walk', { timeout: 30 });
            yield A.call(() => { m.state = 'dance'; m.cool = G.time + 90; });
          });
          G.player.scare(0.35);
        }
      } else m.watch = 0;
    }
  }

  updateLocationGags(dt) {
    const G = this.G, P = G.player, W = G.world, F = this.flags, D = this;
    if (this.horrorRunning || this.horror) return;
    // gag 7: the door that is push, not pull
    const pu = this.puller;
    if (!F.doorPull && !pu.removed && pu.distToPlayer() < 22 && this.lookingAt(pu.pos.clone().setY(1.4), 0.5)) {
      F.doorPull = true; this.eventsSeen++;
      pu.run(function* (n) {
        n.mem.uninterruptible = true;
        n.faceNow(W.spots.marketDoor.x - 5, W.spots.marketDoor.z);
        for (let i = 0; i < 3; i++) {
          yield A.anim('pull', 0.9);
          yield A.call(() => { G.audio.clank(n.pos.clone().setY(1.2), 0.35); W.marketDoor.target = 0.08; });
          yield A.wait(0.15);
          yield A.call(() => { W.marketDoor.target = 0; });
        }
        yield A.say('Hmm.');
        yield A.wait(1.2, 'idle');
        yield A.anim('push', 0.6);
        yield A.call(() => { W.marketDoor.target = -1.3; });
        yield A.say('Oh.');
        yield A.move(W.spots.marketDoor.x - 2.3, W.spots.marketDoor.z, 1.4, 'walk', { timeout: 3 });
        yield A.call(() => { D.hide(n); n.remove(); D.after(1.5, () => { W.marketDoor.target = 0; G.audio.thud(W.spots.marketDoor, 0.6); }); });
      });
    }
    // gag 8: the bench moves by itself
    const sl = this.sleeper;
    if (!F.bench && !sl.removed && sl.distToPlayer() < 12) {
      F.bench = true; this.eventsSeen++;
      const b = W.bench, z0 = b.position.z;
      G.audio.beep(b.position, 80, 0.5, 0.15, 'sawtooth');
      this.repeat(10, 0.03, (i) => { b.position.z = z0 + (i + 1) * 0.15; });
      sl.run(function* (n) {
        yield A.wait(0.25, 'sleep');
        yield A.fall('backward', 1.2, { lie: 2.2 });
        yield A.say('WHUH?! Who moved my bench?!');
        yield A.face(b.position, 0.5);
        yield A.say('...benches don\'t walk. BENCHES DON\'T WALK.');
      });
      this.after(40, () => { b.position.z = z0; });
    }
    // gag 11: look up at the roof guy and he slips into the dumpster
    const rg = this.roofGuy;
    if (!F.roof && !rg.removed && rg.distToPlayer() < 32 && P.pitch > 0.18 && this.lookingAt(rg.pos.clone().setY(rg.pos.y + 1.4), 0.9)) {
      F.roof = true; this.eventsSeen++;
      this.task(this.roofFallTask);
    }
    // gag: the NVIDIA doors
    if (!F.nvidia && P.pos.distanceTo(W.spots.nvidiaPlaza) < 30) this.task(this.nvidiaTask);
    // kindergarten
    if (!F.kg && this.inKindergarten(P.pos)) this.task(this.kgTask);
    // cart scene
    const C = this.cart;
    if (!F.cartBusy && !C.flying && G.time > 35 && G.time > (F.cartCooldown || 0) && C.horse.distToPlayer() < 38 &&
      this.lookingAt(C.group.position.clone().setY(1), 0.6) && !P.inVehicle) this.task(this.cartTask);
  }

  *roofFallTask() {
    const G = this.G, W = G.world, n = this.roofGuy, D = this;
    n.say('Whoa- WHOAAA!', 1.5, true);
    n.mem.idleAnim = 'flail';
    yield 0.6;
    const from = n.pos.clone(), to = W.roofDumpster.pos.clone().setY(1.0);
    let t = 0;
    n.mem.uninterruptible = true;
    n.ai = 'none';
    while (t < 1) {
      t = Math.min(1, t + G.dt / 0.9);
      n.pos.lerpVectors(from, to, t); n.pos.y += Math.sin(t * Math.PI) * 1.5;
      n.rig.body.rotation.x = t * 3.5;
      yield 0;
    }
    G.audio.clank(to, 1); G.audio.thud(to, 1);
    W.roofDumpster.lid.rotation.z = 0.9; W.roofDumpster.lid.position.y = 1.5;
    this.hide(n);
    yield 4;
    G.ui.say("I'M OKAY!", '(from the dumpster)', 2, '#aaa');
    yield 12;
    n.rig.body.rotation.x = 0; n.mem.keepY = false;
    n.pos.set(to.x + 1.6, 0, to.z); this.show(n); n.ai = 'wander'; n.mem.idleAnim = 'idle';
    n.say('...that was a shortcut.', 2);
    W.roofDumpster.lid.rotation.z = 0; W.roofDumpster.lid.position.y = 1.24;
  }

  glitchAI(n, dt) {
    const G = this.G, m = n.mem, P = G.player;
    if (n.hidden) {
      if (G.time > (m.respawn || 0) && !this.horror) {
        const s = this.findSpot(25, 40, false, 1.4);
        if (s) { n.pos.copy(s); this.show(n); m.done = false; n.rig.body.scale.setScalar(1); }
      }
      return;
    }
    if (m.dissolve) {
      m.dissolve -= dt;
      n.root.visible = Math.random() < 0.5;
      n.rig.body.scale.set(rand(0.4, 1.8), rand(0.2, 1.4), rand(0.2, 2.5));
      n.rig.body.rotation.y = rand(0, 6);
      if (m.dissolve <= 0) { m.dissolve = 0; n.rig.body.scale.setScalar(1); n.rig.body.rotation.set(0, 0, 0); this.hide(n); m.respawn = G.time + 150; }
      return;
    }
    if (!m.done && n.distToPlayer() < 13 && this.lookingAt(n.pos.clone().setY(1.5), 0.5)) {
      m.done = true; this.eventsSeen++;
      const f = this.playerFwd();
      n.pos.set(P.pos.x + f.x * 1.8, P.pos.y, P.pos.z + f.z * 1.8);
      n.facePlayer(); n.anim = 'stare'; n.rig.body.position.y = 0; n.rig.body.rotation.set(0, 0, 0);
      G.audio.beep(null, 40, 0.3, 0.3, 'square');
      n.say('YOU ARE NOT SUPPOSED TO BE HERE.', 3);
      P.scare(0.3);
      m.stareT = 2.6;
      return;
    }
    if (m.stareT > 0) { m.stareT -= dt; n.facePlayer(); n.anim = 'stare'; if (m.stareT <= 0) { m.dissolve = 1.6; G.audio.crunch(n.pos, 0.3); } return; }
    // broken behaviour loop
    m.t = (m.t || 0) - dt;
    if (m.t <= 0) { m.t = rand(2, 4); m.mode = pick(['float', 'spin', 'tpose', 'wall', 'slide']); m.wall = null; }
    n.rig.body.position.y = 0; n.rig.body.rotation.x = 0;
    switch (m.mode) {
      case 'float': n.rig.body.position.y = 0.6 + Math.sin(G.time * 2) * 0.1; n.anim = 'walk'; n.rig.phase += dt * 5; break;
      case 'spin': if (Math.random() < dt * 3) { n.heading += Math.PI; n.root.rotation.y = n.heading; } n.anim = 'idle'; break;
      case 'tpose': n.anim = 'tpose'; n.pos.x += Math.sin(n.heading) * dt * 1.5; n.pos.z += Math.cos(n.heading) * dt * 1.5; G.world.resolve(n.pos, 0.35, 1.8); break;
      case 'wall': {
        if (!m.wall) m.wall = V(n.pos.x + rand(-1, 1) * 30, 0, n.pos.z + rand(-1, 1) * 30);
        n.mem.noAvoid = true; n.steer(m.wall.x, m.wall.z, 1.4, dt, 'walk'); n.mem.noAvoid = false; break;
      }
      case 'slide': n.anim = 'idle'; n.heading += dt * 8; n.root.rotation.y = n.heading; n.rig.body.rotation.x = 0.4; break;
    }
  }

  // ---------- RANDOM GAG SCHEDULER (every 30-60 s) ----------
  runScheduler() {
    const G = this.G;
    if (G.time < this.nextEvent || this.horror || this.horrorRunning || G.player.inVehicle || G.player.inBasement()) return;
    if (this.inKindergarten(G.player.pos)) { this.nextEvent = G.time + 5; return; }
    const all = this.gagNames();
    for (let tries = 0; tries < all.length; tries++) {
      if (!this.bag.length) this.bag = shuffle(all.slice());
      const g = this.bag.pop();
      if (this['gag_' + g]()) { this.eventsSeen++; break; }
    }
    this.nextEvent = G.time + rand(30, 60);
    this.cullNPCs();
  }

  cullNPCs() {
    const G = this.G;
    const extras = G.npcs.filter((n) => !n.removed && !n.special && n.kind === 'human' && !n.mem.mannequin && !n.script && n.ai === 'wander');
    if (G.npcs.filter((n) => !n.removed).length <= 40) return;
    extras.sort((a, b) => b.distToPlayer() - a.distToPlayer());
    for (const n of extras.slice(0, 3)) if (n.distToPlayer() > 40) n.remove();
    G.npcs = G.npcs.filter((n) => !n.removed);
  }

  side() { const f = this.playerFwd(); return V(f.z, 0, -f.x); }

  gag_tripper() {
    const s = this.findSpot(14, 22); if (!s) return false;
    const side = this.side(), W = this.G.world;
    let a = s.clone().addScaledVector(side, -9), b = s.clone().addScaledVector(side, 12);
    if (!W.isFree(a.x, a.z, 0.6)) a = s.clone().addScaledVector(side, -3);
    this.human({}, { pos: a, name: 'Jogger' }).run(function* (n) {
      yield A.moveTo(s, 6.3, 'run', { timeout: 6 });
      yield A.fall('forward', 5.5, { up: 0.25, lie: 2 });
      yield A.say(pick(['My legs betrayed me.', 'WHO PUT THE GROUND THERE?!', 'I meant to do that.']));
      yield A.moveTo(b, 6, 'run', { timeout: 6 });
    });
    return true;
  }

  gag_phone() {
    const G = this.G, P = G.player.pos, W = G.world;
    const lamps = W.lamps.filter((l) => { const d = l.base.distanceTo(P); return d > 8 && d < 30 && this.lookingAt(l.base.clone().setY(1), 0.5); });
    if (!lamps.length) return false;
    const l = pick(lamps);
    let start = null;
    for (let i = 0; i < 12 && !start; i++) {
      const a = rand(0, Math.PI * 2), x = l.base.x + Math.cos(a) * 7, z = l.base.z + Math.sin(a) * 7;
      if (W.isFree(x, z, 0.6) && W.lineClear(x, z, l.base.x, l.base.z, 1)) start = V(x, 0, z);
    }
    if (!start) return false;
    const D = this;
    this.human({}, { pos: start, name: 'Phone Guy' }).run(function* (n) {
      n.mem.noAvoid = true;
      yield A.move(l.base.x, l.base.z, 1.5, 'phone', { stop: 0.05, timeout: 10, onHit: (hit) => !!hit.pole });
      n.mem.noAvoid = false;
      yield A.call(() => G.audio.clank(l.base.clone().setY(1.7), 0.8));
      yield A.fall('backward', 1.3, { lie: 1.4 });
      yield A.say('EXCUSE ME?!');
      yield A.face(l.base, 0.3);
      yield A.call(() => D.repeat(4, 0.33, () => G.audio.clank(l.base.clone().setY(1.4), 0.5)));
      yield A.anim('punch', 1.4);
      yield A.fall('backward', 2.5, { up: 0.8, lie: 2 });
      yield A.say('...the pole wins this round.');
    });
    return true;
  }

  gag_guard() {
    const s = this.findSpot(10, 16); if (!s) return false;
    this.human({ fat: 1.7, shirt: '#1a2a4a', pants: '#1a1a2a', hat: 'cap', capColor: '#111' }, { pos: s, name: 'Security Guard', color: '#8af', runSpeed: 5 })
      .run(function* (n) {
        yield A.face('player', 0.3);
        yield A.say('HEY! YOU! STOP RIGHT THERE!', { loud: true });
        yield A.chase(5, 5.2, { reach: 1.4 });
        yield A.say('huff... huff...');
        yield A.anim('sitground', 6);
        yield A.say("I'm... calling... my manager...");
        yield A.anim('sitground', 4);
      });
    return true;
  }

  gag_pair() {
    const s = this.findSpot(12, 20); if (!s) return false;
    const side = this.side(), W = this.G.world;
    const pa = s.clone().addScaledVector(side, -5), pb = s.clone().addScaledVector(side, 2), far = s.clone().addScaledVector(side, 12);
    if (!W.isFree(pa.x, pa.z, 0.6) || !W.isFree(far.x, far.z, 0.6)) return false;
    const a = this.human({}, { pos: pa, name: 'Angry Man' }), b = this.human({}, { pos: pb, name: 'Thief' });
    a.mem.pair = b.mem.pair = true;
    b.run(function* (n) {
      yield A.say('NEVER!', { loud: true });
      yield A.moveTo(far, 6.2, 'panic', { timeout: 4 });
      yield A.say('Wait, I forgot my hat!');
      yield A.chase(4, 6.4, { target: () => a.pos, reach: 0.3 });
    });
    a.run(function* (n) {
      yield A.say('COME BACK HERE!', { loud: true });
      yield A.chase(10, 6.2, { target: () => b.pos, reach: 0.3 });
    });
    return true;
  }

  gag_creeper() {
    const G = this.G, s = this.findSpot(14, 20); if (!s) return false;
    const n = this.human({ shirt: '#111', pants: '#111', skin: '#9a9a8a', hair: 'long', hairColor: '#222', hat: 'none' }, { pos: s, name: '???', color: '#f66', voice: { pitch: 0.5, rate: 0.7 } });
    n.mem.t0 = G.time;
    G.audio.laugh(s.clone().setY(1.6), 0.4, 0.55);
    n.ai = (nn, dt) => {
      const P = G.player, d = nn.distToPlayer();
      if (d > 2) nn.steer(P.pos.x, P.pos.z, 1.1, dt, 'creep'); else { nn.anim = 'creep'; nn.facePlayer(); }
      if (G.time - nn.mem.t0 > 4 && !nn.mem.hint) { nn.mem.hint = true; G.ui.toast('(psst... try your flashlight: F)'); }
      if (P.flashOn && P.battery > 0 && d < 22 && this.lookingAt(nn.pos.clone().setY(1.5), 0.93)) {
        nn.ai = 'wander';
        G.audio.scream(nn.pos.clone().setY(1.6), 1.7, 1, 0.6);
        nn.run(function* () { yield A.say('AAAH! THE LIGHT! MY ONLY WEAKNESS!', { loud: true }); yield A.flee(6, 6.8); });
      } else if (d < 2.2) {
        nn.ai = 'wander';
        nn.run(function* () { yield A.say('...boo.'); yield A.wait(1); });
        G.player.scare(0.2);
      }
    };
    G.player.scare(0.15);
    return true;
  }

  gag_fight() {
    const s = this.findSpot(10, 18); if (!s) return false;
    const side = this.side(), W = this.G.world;
    const pa = s.clone().addScaledVector(side, -3), pb = s.clone().addScaledVector(side, 3);
    if (!W.isFree(pa.x, pa.z, 0.6) || !W.isFree(pb.x, pb.z, 0.6)) return false;
    const a = this.human({}, { pos: pa, name: 'Tough Guy' }), b = this.human({}, { pos: pb, name: 'Tougher Guy' });
    const mid = s.clone();
    const script = (other, line, after) => function* (n) {
      n.mem.noCrash = true;
      yield A.say(line, { loud: true });
      yield A.moveTo(mid.clone().addScaledVector(n === a ? side : side.clone().negate(), -0.9), 2.2, 'walk', { timeout: 4 });
      yield A.face(other.pos, 0.3);
      yield A.anim('windup', 1.3);
      yield A.fall('backward', 1.6, { lie: 2 });
      yield A.say(after);
      n.mem.noCrash = false;
    };
    a.run(script(b, 'You wanna go?!', '...tie.'));
    b.run(script(a, 'COME AT ME!', 'I let you win.'));
    return true;
  }

  gag_stopper() {
    const s = this.findSpot(18, 26); if (!s) return false;
    const G = this.G;
    this.human({ shirt: '#ddd' }, { pos: s, name: 'Sprinter' }).run(function* (n) {
      yield A.chase(6, 9, { reach: 1.6, anim: 'run' });
      yield A.wait(1.3, 'stare', { look: 'player' });
      yield A.say('...');
      yield A.call(() => { G.audio.beep(n.pos, 1200, 0.1, 0.1, 'sine'); setTimeout(() => G.audio.beep(n.pos, 1500, 0.15, 0.1, 'sine'), 150); });
      yield A.move(n.pos.x + rand(-15, 15), n.pos.z + rand(-15, 15), 1.5, 'walk', { timeout: 10 });
    });
    G.player.scare(0.15);
    return true;
  }

  gag_tv() {
    const G = this.G, W = G.world;
    const nearMarket = W.spots.marketDoor.distanceTo(G.player.pos) < 45;
    const s = nearMarket ? W.spots.marketDoor.clone().add(V(0.5, 0, 0)) : this.findSpot(14, 20);
    if (!s) return false;
    const n = this.human({}, { pos: s, name: 'TV Guy', heading: Math.PI / 2 });
    const tv = makeTV(); tv.position.set(0, 0.35, 0.45); n.rig.spine.add(tv);
    const f = this.side();
    const dest = s.clone().addScaledVector(f, rand(-1, 1) > 0 ? 10 : -10);
    if (nearMarket) dest.set(s.x + 9, 0, s.z + rand(-4, 4));
    const D = this;
    n.run(function* (nn) {
      yield A.say('IT WAS ON SALE! IT WAS ON SALE!', { loud: true });
      yield A.moveTo(dest, 5.4, 'carry', { timeout: 5 });
      yield A.call(() => {
        n.rig.spine.remove(tv);
        let crunched = false;
        G.props.spawn(tv, nn.pos.clone().add(nn.forward().multiplyScalar(0.6)).setY(1.2), nn.forward().multiplyScalar(2.5).setY(1),
          { kind: 'tv', r: 0.28, thrown: false, onLand: (p) => { if (!crunched) { crunched = true; G.audio.crunch(p.pos, 0.8); } } });
      });
      yield A.fall('forward', 3, { up: 0.3, lie: 2.5 });
      yield A.say('MY TV!! ...it was 4K.');
    });
    return true;
  }

  gag_chair() {
    const G = this.G, s = this.findSpot(10, 18); if (!s) return false;
    const n = this.human({}, { pos: s, name: 'Happy Man' });
    const side = this.side();
    const D = this;
    n.run(function* (nn) {
      nn.facePlayer();
      yield A.call(() => D.repeat(4, 0.7, () => G.audio.laugh(nn.pos.clone().setY(1.7), 0.35)));
      yield A.call(() => {
        const at = nn.pos.clone().addScaledVector(side, 1.1).setY(32);
        G.props.spawn(makeChair(), at, V(0, -4, 0), {
          kind: 'chair', r: 0.35, thrown: false, bounce: 0.2,
          onLand: (p) => {
            if (p.landed) return; p.landed = true;
            G.audio.crunch(p.pos, 0.9);
            if (!nn.rd && !nn.removed) { nn.stopScript(); nn.fallFrom({ dir: 'backward', power: 2.5, up: 1, lie: 2 }); D.after(3, () => nn.say('WHERE DID THAT COME FROM?!')); }
          },
        });
      });
      yield A.anim('laugh', 6);
    });
    return true;
  }

  gag_doorchase() {
    const G = this.G, W = G.world, P = G.player;
    if (P.pos.distanceTo(W.spots.kgEntrance) > 16) return false;
    const s = this.findSpot(12, 16, true, 0.7); if (!s) return false;
    const n = this.human({ shirt: '#5a0a0a' }, { pos: s, name: 'Angry Neighbor', damage: 5 });
    n.hostile = true;
    G.ui.toast('(Close a door in his face: E)');
    n.run(function* (nn) {
      yield A.say('COME BACK HERE, YOU!', { loud: true });
      yield A.chase(14, 5.8, { reach: 1.1 });
      yield A.call(() => {
        nn.hostile = false;
        if (nn.distToPlayer() < 1.3) { G.player.damage(nn.damage, nn.pos, 'citizen'); nn.fallFrom({ dir: 'backward', power: 2, lie: 1.5 }); }
      });
      yield A.say('...whatever. I have a bedtime.');
    });
    return true;
  }

  // ---------- HORROR SHIFT ----------
  *horrorTask() {
    if (this.horror || this.horrorRunning) return;
    this.horrorRunning = true; this.eventsSeen++;
    const G = this.G, P = G.player, W = G.world;
    G.ui.toast('...something changed.');
    // 1. far NPCs stop moving
    for (const n of this.humans()) if (n.distToPlayer() > 25 && !n.hidden) { n.frozen = true; n.frozenPose = 'stare'; }
    if (this.dancer.mem.music) { this.dancer.mem.music.stop(); this.dancer.mem.music = null; }
    yield 3.5;
    // 2. the city goes silent
    G.audio.setAmbient(0, 2.5);
    yield 3;
    // 3. street lamps die one by one
    const lamps = W.lamps.filter((l) => l.state !== 'off').sort((a, b) => b.pos.distanceToSquared(P.pos) - a.pos.distanceToSquared(P.pos));
    let far = 0;
    for (const l of lamps) {
      W.setLamp(l, 'off');
      if (l.pos.distanceTo(P.pos) < 45) { G.audio.beep(l.pos, 2400, 0.04, 0.08, 'square'); yield 0.3; }
      else if (++far % 8 === 0) yield 0.05;
    }
    P.scare(0.3);
    yield 1.5;
    // 4. everyone is behind you, staring
    const crowd = this.humans().filter((n) => n !== this.victim || true);
    const back = this.playerFwd().clone().negate(), base = Math.atan2(back.x, back.z);
    const centroid = V();
    for (const n of crowd) {
      n.stopScript(); n.rd = null; n.rig.body.quaternion.identity(); n.rig.body.position.y = 0;
      n.attached = false; n.mem.keepY = false;
      if (n.heldRTX && n.heldRTX.parent) n.heldRTX.parent.remove(n.heldRTX);
      this.show(n);
      for (let i = 0; i < 30; i++) {
        const a = base + rand(-0.9, 0.9), r = rand(7, 26);
        const x = P.pos.x + Math.sin(a) * r, z = P.pos.z + Math.cos(a) * r;
        if (W.isFree(x, z, 0.5)) { n.pos.set(x, 0, z); break; }
      }
      n.frozen = true; n.frozenPose = 'stare'; n.facePlayer();
      centroid.add(n.pos);
    }
    centroid.divideScalar(Math.max(1, crowd.length)).setY(1.6);
    let t = 0;
    yield () => { t += G.dt; return this.lookingAt(centroid, 0.55) || t > 15; };
    G.ui.big('THEY KNOW YOU HAVE THE 4090.', 4.5, 'red');
    G.audio.sting(0.7);
    P.scare(0.6);
    yield 2.5;
    // 5. they all run at you
    for (const n of crowd) {
      n.frozen = false; n.ai = 'horror'; n.hostile = true; n.runSpeed = rand(4.6, 6.6);
      n.facePlayer();
    }
    this.giant.visible = true;
    G.ui.say('WHERE IS MY CART?!', 'GIANT HORSE', 4, '#f44');
    G.audio.speak('WHERE IS MY CART?!', { pitch: 0.05, rate: 0.7 });
    G.audio.scream(null, 0.3, 2.5, 0.6);
    G.lighting.setMood('horror', 3);
    G.audio.setDrone(0.8); G.audio.setAmbient(0.5, 4);
    for (const l of W.lamps) if (Math.random() < 0.35) { W.setLamp(l, 'red'); l.flicker = true; }
    this.horror = true; this.horrorRunning = false;
    this.updateQuest();
    if (!this.flags.nvidia) this.task(this.nvidiaTask);
    if (P.hasRTX) this.startFinale();
  }

  // ---------- FINALE ----------
  startFinale() {
    const G = this.G, W = G.world;
    if (this.finale) return;
    this.finale = true; this.eventsSeen++;
    G.lighting.setMood('finale', 3);
    W.shake = 0.12;
    G.audio.setDrone(1);
    G.ui.big('THE RTX 4090 HAS AWAKENED', 3.5, 'green');
    for (const l of W.lamps) if (l.state === 'red') W.setLamp(l, 'on');
    // robot becomes a giant boss
    const r = this.robot;
    if (r.hidden) { r.pos.copy(W.spots.nvidiaDoor); this.show(r); r.ai = (n, dt) => this.robotAI(n, dt); }
    r.mem.boss = true; r.rig.body.scale.setScalar(3.1); r.radius = 1.5; r.height = 7; r.stun = 0;
    r.say('ENTERING BOSS MODE. DLSS: DEATH LEVEL SUPER SAMPLING.', 3.5, true);
    // the cart takes to the sky
    const C = this.cart;
    if (C.passenger) { C.passenger.attached = false; C.passenger = null; }
    for (const n of [C.horse, C.puller]) { n.stopScript(); n.rd = null; n.rig.body.quaternion.identity(); n.hostile = false; n.attached = true; this.show(n); }
    C.flying = true; C.state = 'drive';
    // gravity breaks: some NPCs float
    for (const n of this.humans()) if (Math.random() < 0.3) n.floating = true;
    this.task(this.gravityTask);
    if (this.gensOn >= 3) this.openGate();
    this.updateQuest();
  }

  *gravityTask() {
    const G = this.G;
    while (!this.ended) {
      yield rand(14, 22);
      if (this.ended) break;
      G.ui.big('GRAVITY.EXE HAS STOPPED WORKING', 2.5, 'glitch');
      G.audio.whoosh(0.5);
      G.gravityScale = 0.22;
      yield 6;
      G.gravityScale = 1;
    }
    G.gravityScale = 1;
  }

  startGenerator(gen) {
    const G = this.G;
    if (gen.on) return;
    gen.on = true; this.gensOn++; this.eventsSeen++;
    gen.lamp.material = gen.lamp.material.clone(); gen.lamp.material.color.set('#40ff40');
    gen.lever.rotation.x = -0.6;
    gen.hum = G.audio.loop('hum', gen.pos.clone().setY(gen.pos.y + 1));
    G.audio.clank(gen.pos, 0.6);
    G.ui.toast(`Generator started (${this.gensOn}/3): ${gen.name}`);
    if (this.gensOn >= 3) {
      if (G.player.hasRTX) this.openGate();
      else G.ui.big('THE GATE WANTS THE 4090.', 3, 'red');
    }
    this.updateQuest();
  }

  openGate() {
    const G = this.G;
    if (G.world.gate.target === 1) return;
    G.world.gate.target = 1;
    G.audio.clank(G.world.spots.gate, 1); G.audio.thud(G.world.spots.gate, 1);
    G.ui.big('THE GATE IS OPEN — RUN NORTH!', 4, 'green');
    this.updateQuest();
  }

  // ---------- ENDING ----------
  *endingTask() {
    const G = this.G, P = G.player, cam = G.camera;
    this.ended = true; G.state = 'cutscene';
    P.locked = true; P.lookLocked = true;
    G.ui.hide('hud'); G.ui.prompt(null);
    G.gravityScale = 1; G.world.shake = 0;
    for (const n of G.npcs) if (n !== this.buddy) this.hide(n);
    this.cart.group.visible = false; this.giant.visible = false; P.viewRTX.visible = false;
    const sun = new THREE.PointLight(0xffe0b0, 60, 40, 1.4); sun.position.set(0, 7, -153); G.scene.add(sun);
    G.lighting.setMood('normal', 4); G.audio.setDrone(0.25, 4); G.audio.setAmbient(1, 3);
    this.robotEffects();
    const start = cam.position.clone(), end = V(0, 1.65, -150);
    let t = 0;
    while (t < 1) { t = Math.min(1, t + G.dt / 5); cam.position.lerpVectors(start, end, t); cam.position.y = 1.65 + Math.sin(t * 40) * 0.03; cam.rotation.set(0, 0, 0); yield 0; }
    if (this.buddy && !this.buddy.removed) {
      this.show(this.buddy); this.buddy.ai = 'idle'; this.buddy.stopScript(); this.buddy.rd = null; this.buddy.rig.body.quaternion.identity();
      this.buddy.pos.set(1.3, 0, -150.5); this.buddy.faceNow(0, -160); this.buddy.mem.idleAnim = 'wave';
      this.buddy.say('WE MADE IT!! ...wait. What is that sound?', 3.5);
    }
    // the cart, one last time
    const c = makeCart(); G.scene.add(c.group);
    const horse = makeHumanoid({ horse: true, skin: '#5a3418', shirt: '#151515', pants: '#151515', hat: 'tophat', suit: true });
    const man = makeHumanoid({ shirt: '#4a4a44', pants: '#2a2a2a', hair: 'short' });
    c.group.add(horse.root); horse.root.position.copy(c.seat);
    c.group.add(man.root); man.root.position.copy(c.harness);
    c.group.rotation.y = Math.PI / 2; c.group.position.set(-34, 0, -158);
    t = 0;
    let whipT = 0, said = false;
    while (c.group.position.x < 34) {
      const dt = G.dt; t += dt;
      c.group.position.x += 6.5 * dt;
      man.phase += dt * 10;
      pose(man, 'quad', dt, G.time, 4); pose(horse, 'whip', dt, G.time, 0);
      c.wheels.forEach((w) => (w.rotation.x += 6.5 * dt / 0.55));
      const hx = c.group.position.x;
      horse.head.rotation.y = clamp(-hx / 12, -1.2, 1.2) * 0.9 - 0.4;
      cam.lookAt(c.group.position.x * 0.6, 1.7, -158);
      whipT -= dt; if (whipT <= 0) { whipT = 1.1; G.audio.whip(c.group.position.clone().setY(2)); }
      if (!said && hx > -4) { said = true; G.ui.say('...SEE YOU IN THE NEXT GENERATION.', 'Horse', 4, '#e0a060'); G.audio.speak('See you in the next generation.', { pitch: 0.1, rate: 0.8 }); }
      if (hx > 14 && !this.fading) { this.fading = true; G.ui.fade(1, 2); }
      yield 0;
    }
    yield 1;
    G.ui.big('TO BE CONTINUED... RTX 5090', 6, 'final');
    G.audio.sting(0.4);
    yield 5;
    G.win();
  }

  // ---------- per-frame ----------
  update(dt) {
    const G = this.G, P = G.player, W = G.world;
    this.updateTasks(dt);
    this.blackout = Math.max(0, this.blackout - dt);
    this.flashFlicker = Math.max(0, this.flashFlicker - dt);
    if (this.ended) return;
    this.cart.update(dt);
    this.taxi.update(dt);
    this.toilet.update(dt);
    this.updateLocationGags(dt);
    this.updateKindergarten(dt);
    this.runScheduler();
    this.robotEffects();
    // basement light flicker
    this.basementLight.intensity = Math.random() < 0.05 ? 0 : this.basementLight.userData.base;
    // horror shift on a timer
    if (!this.horror && !this.horrorRunning && G.time > G.settings.horrorMinutes * 60) this.task(this.horrorTask);
    // NVIDIA scene also happens on its own after a while (you can hear it)
    if (!this.flags.nvidia && G.time > 300) this.task(this.nvidiaTask);
    // mannequins stand back up when nobody is watching
    for (const m of this.mannequins) {
      if (!m.mem.awake && m.rd && m.rd.phase === 'lie' && !m.rd.getUp && G.time - (m.mem.sleepSince || 0) > 25 && !this.lookingAt(m.pos.clone().setY(0.5), 0.3)) {
        m.rd = null; m.rig.body.quaternion.identity(); m.rig.body.position.y = 0;
      }
    }
    // the giant horse head watches from the sky
    if (this.giant.visible) {
      this.giant.position.set(P.pos.x, 55 + Math.sin(G.time * 0.5) * 3, P.pos.z - 130);
      this.giant.lookAt(P.pos.x, 10, P.pos.z);
      const k = 0.5 + 0.5 * Math.sin(G.time * 4);
      this.giant.userData.eyes.forEach((e) => e.scale.setScalar(0.8 + k * 0.5));
    }
    // distant weird sounds
    this.distantT -= dt;
    if (this.distantT <= 0) { this.distantT = rand(18, 40); if (!this.horrorRunning) G.audio.distant(P.pos); }
    // gate reached
    if (W.gate.open > 0.7 && P.pos.z < -113.5 && !this.ended) this.task(this.endingTask);
    // clock
    const mins = 33 + Math.floor(G.time / 60);
    G.ui.clock(`0${3 + Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')} AM`);
    if (G.frame % 30 === 0) this.updateQuest();
  }
}

extendDirector(Director);
extendDirector3(Director);
extendDirector4(Director);
extendDirector5(Director);
extendDirector6(Director);
extendDirector7(Director);
extendDirector8(Director);
