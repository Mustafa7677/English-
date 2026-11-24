// Chapter 2 of the cursed city: more "scary first, funny after" scenarios.
//  - Ghost bus full of mannequins (horse driver) that runs people over and loses a wheel
//  - Payphone that knows about the 4090 ... wrong number
//  - The living street lamp (moves only when you don't look)
//  - The Mirror Man across the street who copies you (badly)
//  - Fake game crash "4090city.exe is not responding" -> "just kidding"
//  - Stand still too long: breathing behind you... it's Buddy
//  - STOP / GO game with the giant horse during the horror phase
//  - Sneeze launch, shopping-cart rider, the Running Man returns (3 callbacks)
//  - Horse answers his phone mid-chase, Buddy throws bricks & quips, achievements
import * as THREE from 'three';
import { A } from './npc.js';
import { makeHumanoid, pose } from './characters.js';
import { mat, basic, box, cyl, textTex, rand, pick, clamp } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ models
function makeBus() {
  const g = new THREE.Group();
  const paint = mat('#2c3a2c'), dark = mat('#111'), rim = mat('#1a221a');
  g.add(box(2.6, 1.3, 10, paint, 0, 1.1, 0));
  g.add(box(2.6, 0.35, 10, paint, 0, 3.05, 0));
  for (const z of [-4.9, -2.5, 0, 2.5, 4.9]) { g.add(box(0.12, 1.25, 0.15, rim, 1.25, 2.3, z)); g.add(box(0.12, 1.25, 0.15, rim, -1.25, 2.3, z)); }
  const glass = mat('#9fd0a0', { emissive: '#2a4a2a', transparent: true, opacity: 0.28, depthWrite: false });
  g.add(box(2.58, 1.2, 9.9, glass, 0, 2.3, 0, false));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.32), basic('#fff', { map: textTex('NEXT STOP: YOUR HOUSE', { w: 512, h: 64, bg: '#050505', fg: '#ff9a20', font: 'bold 34px monospace' }) }));
  sign.position.set(0, 3.0, 5.02); g.add(sign);
  g.add(box(0.5, 0.25, 0.05, basic('#ffffcc'), -0.9, 0.9, 5.02, false), box(0.5, 0.25, 0.05, basic('#ffffcc'), 0.9, 0.9, 5.02, false));
  g.add(box(2.4, 0.2, 0.05, basic('#ff1010'), 0, 0.9, -5.02, false));
  const door = box(0.08, 2.1, 1.2, mat('#223322', { emissive: '#0a1a0a' }), -1.32, 1.5, 3.6); g.add(door);
  const wheels = [];
  for (const [x, z] of [[-1.25, 3.3], [1.25, 3.3], [-1.25, -3.3], [1.25, -3.3]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 10), dark);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.5, z); g.add(w); wheels.push(w);
  }
  const passengers = [];
  for (const [x, z] of [[-0.7, 2], [0.7, 0.5], [-0.7, -0.8], [0.7, -2.2], [-0.7, -3.4], [0.7, 2.6]]) {
    const r = makeHumanoid({ mannequin: true, eyesGlow: '#ff2020' });
    r.root.position.set(x, 0.75, z); g.add(r.root); passengers.push(r);
  }
  const driver = makeHumanoid({ horse: true, skin: '#5a3418', shirt: '#151515', pants: '#151515', hat: 'cap', capColor: '#222', suit: true });
  driver.root.position.set(0.6, 0.75, 4.1); g.add(driver.root);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: g, wheels, door, passengers, driver };
}

function makePayphone() {
  const g = new THREE.Group();
  const m = mat('#2a3550'), dark = mat('#111');
  g.add(box(0.12, 2.2, 0.12, dark, 0, 1.1, 0));
  g.add(box(0.6, 0.8, 0.35, m, 0, 1.45, 0.18));
  g.add(box(0.12, 0.4, 0.12, dark, -0.2, 1.5, 0.38));
  g.add(box(0.28, 0.06, 0.04, basic('#9cf'), 0.1, 1.72, 0.36, false));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.18), basic('#fff', { map: textTex('PHONE', { w: 128, h: 40, bg: '#2a3550', fg: '#fff', font: 'bold 28px monospace', glow: false }) }));
  sign.position.set(0, 2.0, 0.36); g.add(sign);
  return g;
}

function makeLivingLamp() {
  const g = new THREE.Group();
  const poleM = mat('#2a2a2a');
  g.add(cyl(0.09, 0.12, 6, 5, poleM, 0, 3, 0));
  g.add(box(0.08, 0.08, 1.2, poleM, 0, 6, 0.6));
  const bulbM = basic('#ffd890');
  const bulb = box(0.45, 0.15, 0.45, bulbM, 0, 5.9, 1.2, false); g.add(bulb);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4, 12), basic('#fff2c0', { transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.08, 1.2); g.add(pool);
  return { group: g, bulb, pool, bulbM };
}

export function makeShopCart() {
  const g = new THREE.Group();
  const wire = mat('#9a9a9a', { wireframe: true }), metal = mat('#777');
  g.add(box(0.7, 0.55, 1.0, wire, 0, 0.75, 0));
  g.add(box(0.7, 0.04, 0.04, metal, 0, 1.15, -0.55));
  for (const [x, z] of [[-0.3, 0.4], [0.3, 0.4], [-0.3, -0.4], [0.3, -0.4]]) g.add(box(0.06, 0.12, 0.12, mat('#111'), x, 0.08, z));
  for (const [x, z] of [[-0.3, 0.4], [0.3, 0.4], [-0.3, -0.4], [0.3, -0.4]]) g.add(box(0.03, 0.4, 0.03, metal, x, 0.32, z));
  return g;
}

export const ACH = {
  falls5: ['Physics Is Optional', 'Watch 5 people fall over'],
  falls20: ['Professional Faceplant Spectator', 'Watch 20 people fall over'],
  falls50: ['Ragdoll Sommelier', 'Watch 50 people fall over'],
  buddy3: ['With Friends Like These...', 'Buddy tripped 3 times'],
  brick: ['Brick Diplomacy', 'Hit someone with a brick'],
  robot: ['Turned It Off And On Again', 'Stun the NVIDIA robot'],
  phone: ['Wrong Number Survivor', 'Answer the cursed payphone'],
  taxi: ['Headless Uber', 'Ride the headless taxi'],
  crash: ['Have You Tried Restarting?', 'Survive a fake crash'],
  scares5: ['Certified Screamer', 'Get jump-scared 5 times'],
  afk: ['AFK In A Horror Game', 'Stand still for too long'],
  bus: ['Next Stop: Regret', 'Board the ghost bus'],
  busHit: ['Hit By The Ghost Bus', 'Exactly what it sounds like'],
  stopgo: ['Statue Mode', 'Survive STOP/GO without moving'],
  lamp: ['Lamp Whisperer', 'Witness the living lamp'],
  mirror: ['404: Reflection Not Found', 'Meet the Mirror Man'],
  runner3: ['Still Alive (x3)', 'See the Running Man three more times'],
};

const SCARE_QUIPS = [
  "I DIDN'T SCREAM. YOU SCREAMED.", 'That was my emotional support scream.',
  "I'm fine. My soul left, but I'm fine.", 'Okay that one got me. That one got me.',
  'I think I just aged 40 years.', 'Can we go home? Do we have homes?',
];

export function extendDirector(D) {
  const P = D.prototype;

  // ---- wrap existing hooks ----
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initExtra(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateExtra(dt); };
  const origScare = P.jumpscare;
  P.jumpscare = function (kind, dmg) {
    const before = this.lastScare;
    origScare.call(this, kind, dmg);
    if (this.lastScare !== before) this.onScare(kind);
  };
  const origHit = P.onPropHit;
  P.onPropHit = function (p, n) {
    origHit.call(this, p, n);
    if (p.kind === 'brick') { this.achieve(n === this.robot ? 'robot' : 'brick'); if (p.byBuddy && !n.hostile && n !== this.robot) this.after(0.8, () => this.buddy && this.buddy.say('SORRY! WRONG GUY!', 2)); }
  };

  P.gagNames = function () {
    return ['tripper', 'phone', 'guard', 'pair', 'creeper', 'fight', 'stopper', 'tv', 'chair', 'doorchase',
      'sneeze', 'shopcart', 'runner', 'lamp', 'mirror', 'sneeze', 'runner'];
  };

  P.initExtra = function () {
    const G = this.G, W = G.world;
    this.ach = {};
    this.stats = { falls: 0, buddyTrips: 0, scares: 0, runner: 0 };
    this.idle = { t: 0, busy: false, next: 0 };
    this.phoneNext = 60; this.busNext = 90; this.crashAt = rand(260, 420); this.stopGoNext = 0;
    // payphone on a free sidewalk spot of the main avenue
    const cands = [[-8.8, -33], [-8.8, -30], [-8.8, -18], [8.8, -18], [-8.8, 33]];
    const c = cands.find(([x, z]) => W.isFree(x, z, 1.2)) || cands[0];
    const ph = makePayphone(); ph.position.set(c[0], 0, c[1]); ph.rotation.y = c[0] < 0 ? Math.PI / 2 : -Math.PI / 2;
    G.scene.add(ph);
    W.addCollider(c[0] - 0.4, c[0] + 0.4, c[1] - 0.4, c[1] + 0.4, -1, 2.2);
    this.phone = { pos: V(c[0], 1.5, c[1]), ringing: false, ringT: 0, calls: 0, busy: false };
    W.addInteract({
      pos: this.phone.pos, r: 2.6, label: 'Answer the payphone',
      enabled: () => this.phone.ringing && !this.phone.busy, act: () => this.task(this.phoneCallTask),
    });
    // Taxi achievement
    const enter = this.taxi.enter.bind(this.taxi);
    this.taxi.enter = () => { enter(); this.achieve('taxi'); };
  };

  P.achieve = function (id) {
    if (!this.ach || this.ach[id]) return;
    this.ach[id] = true;
    const [title, desc] = ACH[id];
    this.G.ui.achievement(title, desc);
    this.G.audio.beep(null, 1046, 0.12, 0.15, 'triangle');
    setTimeout(() => this.G.audio.beep(null, 1568, 0.25, 0.15, 'triangle'), 120);
  };

  P.onFall = function (n) {
    if (!this.stats || n.distToPlayer() > 60) return;
    this.stats.falls++;
    if (n === this.buddy) { this.stats.buddyTrips++; if (this.stats.buddyTrips >= 3) this.achieve('buddy3'); }
    if (this.stats.falls >= 5) this.achieve('falls5');
    if (this.stats.falls >= 20) this.achieve('falls20');
    if (this.stats.falls >= 50) this.achieve('falls50');
  };

  P.onScare = function () {
    this.stats.scares++;
    if (this.stats.scares >= 5) this.achieve('scares5');
    const b = this.buddy;
    if (b && !b.removed && b.distToPlayer() < 25 && Math.random() < 0.8) this.after(1.6, () => b.say(pick(SCARE_QUIPS), 3));
  };

  // ================================================================ per-frame
  P.updateExtra = function (dt) {
    const G = this.G, Pl = G.player;
    this.updatePhone(dt);
    this.updateBus(dt);
    this.updateLivingLamp(dt);
    this.updateShopCart(dt);
    this.updateIdle(dt);
    if (!this.horror && !this.horrorRunning && !this.crashDone && G.time > this.crashAt && !Pl.inVehicle && !Pl.inBasement()) this.fakeCrash();
    if (this.horror && !this.stopGo && !this.ended && G.time > this.stopGoNext) {
      if (!this.stopGoNext) this.stopGoNext = G.time + rand(20, 30);
      else this.task(this.stopGoTask);
    }
  };

  // ================================================================ PAYPHONE
  P.updatePhone = function (dt) {
    const G = this.G, ph = this.phone;
    const d = G.player.pos.distanceTo(ph.pos);
    if (!ph.ringing && !ph.busy && G.time > this.phoneNext && d < 30 && !this.horrorRunning) { ph.ringing = true; ph.ringT = 0; }
    if (ph.ringing) {
      ph.ringT -= dt;
      if (ph.ringT <= 0) {
        ph.ringT = 2.6;
        for (let i = 0; i < 6; i++) setTimeout(() => G.audio.beep(ph.pos, i % 2 ? 480 : 440, 0.07, 0.3, 'square'), i * 70);
      }
      if (d > 45) { ph.ringing = false; this.phoneNext = G.time + 40; }
    }
  };

  P.phoneCallTask = function* () {
    const G = this.G, ph = this.phone, Pl = G.player;
    ph.ringing = false; ph.busy = true; ph.calls++;
    this.achieve('phone'); this.eventsSeen++;
    G.audio.beep(null, 200, 0.08, 0.2);
    G.ui.say('*heavy breathing*', 'Phone', 2.5, '#9cf');
    G.audio.setAmbient(0.15, 1);
    yield 2.5;
    const call = ph.calls;
    if (call === 1 || Pl.hasRTX) {
      const line = Pl.hasRTX ? 'We see you. We see the card. We see your framerate.' : 'Is this... the one... who will have... the four-oh-nine-oh?';
      G.ui.say(line, 'Phone', 4, '#9cf'); G.audio.speak(line, { pitch: 0.2, rate: 0.7 });
      // everyone on the street turns their head to you
      const watchers = this.G.npcs.filter((n) => !n.removed && !n.hidden && !n.attached && !n.rd && n.kind === 'human' && n.distToPlayer() < 45 && n !== this.buddy);
      for (const n of watchers) { n.frozen = true; n.frozenPose = 'stare'; n.facePlayer(); }
      Pl.scare(0.35);
      yield 4;
      const punch = Pl.hasRTX ? '...also, your car\'s extended warranty expired. Bye.' : '...oh wait. Sorry. Wrong number. I wanted the RTX 3060 guy.';
      G.ui.say(punch, 'Phone', 4, '#9cf'); G.audio.speak(punch, { pitch: 1.3, rate: 1.2 });
      yield 2.5;
      for (const n of watchers) n.frozen = false;
      if (watchers[0]) watchers[0].say('...phew.', 2);
    } else {
      const lines = [
        ['Hello, this is the horse. Have you seen my cart?', 'No? ...Okay. I will keep screaming then.'],
        ['Press 1 to scream. Press 2 to scream louder.', '...You pressed nothing. Bold choice.'],
        ['This is your future self.', 'DO NOT trust the taxi. Also bring snacks.'],
      ];
      const [a, b] = lines[(call - 2) % lines.length];
      G.ui.say(a, 'Phone', 3.5, '#9cf'); G.audio.speak(a, { pitch: 0.5, rate: 0.9 });
      yield 3.5;
      G.ui.say(b, 'Phone', 3.5, '#9cf'); G.audio.speak(b, { pitch: 0.5, rate: 0.9 });
      yield 3;
    }
    G.audio.beep(null, 300, 0.4, 0.2);
    G.audio.setAmbient(this.horror ? 0.5 : 1, 2);
    ph.busy = false;
    this.phoneNext = G.time + rand(120, 200);
  };

  // ================================================================ GHOST BUS
  P.updateBus = function (dt) {
    const G = this.G, Pl = G.player, W = G.world;
    const stop = W.spots.bench;
    if (!this.bus && !this.horrorRunning && !this.ended && G.time > this.busNext && Pl.pos.distanceTo(stop) < 45 && !Pl.inVehicle) this.spawnBus();
    const b = this.bus;
    if (!b) return;
    b.t += dt;
    const g = b.m.group;
    // movement
    if (b.state === 'arrive') {
      const dz = b.stopZ - g.position.z;
      b.v = Math.min(13, Math.max(0, Math.abs(dz) * 0.9));
      if (Math.abs(dz) < 0.3) { b.v = 0; b.state = 'stopped'; b.t = 0; this.busArrived(); }
    } else if (b.state === 'stopped') {
      b.m.door.position.z = 3.6 - Math.min(1, b.t * 2) * 1.2;
      if (b.t > 9 && !b.boarding) b.state = 'leave';
    } else if (b.state === 'leave') {
      b.m.door.position.z = 3.6;
      b.v = Math.min(15, b.v + dt * 4);
      if (!b.wheelLost && g.position.z < b.stopZ - 14) this.busLoseWheel();
      if (g.position.z < -104) { G.scene.remove(g); if (b.engine) b.engine.stop(); this.bus = null; this.busNext = G.time + rand(300, 420); return; }
    }
    g.position.z -= b.v * dt;
    if (b.wheelLost) { g.rotation.z = Math.sin(G.time * 18) * 0.03 + 0.08; }
    for (const w of b.m.wheels) if (w.parent === g) w.rotation.x -= b.v * dt / 0.5;
    if (b.engine) { b.engine.setPos(g.position); b.engine.setPitch(35 + b.v * 3); }
    // passengers turn their heads toward the player (all at once, creepy)
    for (const p of b.m.passengers) {
      pose(p, 'sit', dt, G.time, 0);
      const wp = p.root.getWorldPosition(V());
      p.head.rotation.y = clamp(Math.atan2(Pl.pos.x - wp.x, Pl.pos.z - wp.z) - Math.PI, -1.4, 1.4);
    }
    pose(b.m.driver, 'drive', dt, G.time, 0);
    // honk + run things over
    if (b.v > 3) {
      const ahead = Pl.pos.z < g.position.z && Pl.pos.z > g.position.z - 25 && Math.abs(Pl.pos.x - g.position.x) < 2.2;
      if (ahead && G.time - (b.honk || 0) > 2) { b.honk = G.time; G.audio.beep(g.position, 330, 0.6, 0.4, 'square'); G.audio.beep(g.position, 415, 0.6, 0.3, 'square'); }
      const inBox = (p) => Math.abs(p.x - g.position.x) < 1.6 && Math.abs(p.z - g.position.z) < 5.3;
      for (const n of G.npcs) {
        if (n.removed || n.hidden || n.attached || n.rd || n.kind === 'robot' || !inBox(n.pos)) continue;
        n.stopScriptIfInterruptible();
        n.fallFrom({ dir: V(rand(-0.5, 0.5), 0, -1), power: 11, up: 6, spin: 7, lie: 2.5 });
        G.audio.thud(n.pos, 1);
        if (n.distToPlayer() < 30) this.after(3.2, () => n.say(pick(['...that bus had no driver. Well. A horse.', 'I paid for a ticket!', 'Ow.']), 2.5));
      }
      if (inBox(Pl.pos) && !Pl.inVehicle) {
        Pl.damage(20, g.position.clone().setZ(g.position.z + 6), 'bus');
        Pl.knock.set(0, 0, -16); Pl.vel.y = 7;
        this.achieve('busHit');
      }
    } else if (!Pl.inVehicle) {
      // parked bus is solid
      const dx = Pl.pos.x - g.position.x, dz = Pl.pos.z - g.position.z;
      if (Math.abs(dx) < 1.65 && Math.abs(dz) < 5.3) Pl.pos.x = g.position.x + Math.sign(dx || 1) * 1.65;
    }
  };

  P.spawnBus = function () {
    const G = this.G, W = G.world;
    const m = makeBus();
    const stopZ = W.spots.bench.z;
    m.group.rotation.y = Math.PI; // heading north (-z): its door side faces the bus stop
    m.group.position.set(3.2, 0, Math.min(105, stopZ + 90));
    G.scene.add(m.group);
    this.bus = { m, state: 'arrive', v: 13, t: 0, stopZ, wheelLost: false, engine: G.audio.loop('engine', m.group.position) };
    G.ui.toast('A bus is coming. At 3 AM.');
    this.eventsSeen++;
  };

  P.busArrived = function () {
    const G = this.G, b = this.bus;
    G.audio.beep(b.m.group.position, 120, 0.5, 0.3, 'sawtooth');
    G.ui.say('GET IN. ...OR DON\'T. I\'M A HORSE, NOT A COP.', 'Bus Driver', 4, '#e0a060');
    G.audio.speak("Get in. Or don't. I'm a horse, not a cop.", { pitch: 0.2, rate: 0.85 });
    G.player.scare(0.3);
    b.interact = G.world.addInteract({
      pos: () => b.m.group.localToWorld(V(-1.6, 1.4, 3.4)), r: 3.5, label: 'Board the ghost bus',
      enabled: () => this.bus === b && b.state === 'stopped', act: () => this.task(this.busRideTask),
    });
  };

  P.busRideTask = function* () {
    const G = this.G, Pl = G.player, W = G.world, b = this.bus;
    b.boarding = true;
    this.achieve('bus');
    Pl.locked = true;
    G.ui.fade(1, 1.2);
    G.ui.say('*every mannequin on the bus turns to look at you*', '', 2.5);
    yield 1.6;
    const dests = [
      [W.spots.kgEntrance, 'You wake up at the kindergarten. Your shoes are on the wrong feet.'],
      [W.spots.gasStop, 'You wake up at the gas station. Someone drew a horse on your face.'],
      [W.spots.nvidiaPlaza, 'You wake up in front of NVIDIA. You feel... overclocked.'],
      [V(-89, 0, -27.5), 'You wake up in a dark alley. You hear the basement breathing.'],
    ].filter(([p]) => p.distanceTo(Pl.pos) > 30);
    const [to, msg] = pick(dests);
    Pl.pos.set(to.x, 0, to.z + 1); Pl.vel.set(0, 0, 0);
    if (this.buddy) this.buddy.pos.set(to.x + 1.5, 0, to.z + 2);
    yield 1;
    G.ui.fade(0, 2);
    Pl.locked = false;
    G.ui.say(msg, '', 4.5);
    yield 4.5;
    if (this.buddy) this.buddy.say('...why do I have a bus ticket in my mouth?', 3);
    if (this.bus) { this.bus.boarding = false; this.bus.state = 'leave'; }
  };

  P.busLoseWheel = function () {
    const G = this.G, b = this.bus, Pl = G.player;
    b.wheelLost = true;
    const w = b.m.wheels[0];
    const wp = w.getWorldPosition(V());
    b.m.group.remove(w);
    G.scene.add(w); w.position.copy(wp); w.rotation.set(0, 0, Math.PI / 2);
    const dir = V(Pl.pos.x - wp.x, 0, Pl.pos.z - wp.z).normalize();
    G.audio.clank(wp, 1);
    G.ui.say('*CLUNK* ...a wheel falls off the bus', '', 2.5);
    const D = this;
    this.task(function* () {
      let v = 9, t = 0;
      while (v > 0.3 && t < 8) {
        const dt = G.dt; t += dt;
        w.position.x += dir.x * v * dt; w.position.z += dir.z * v * dt;
        w.rotation.y = Math.atan2(dir.x, dir.z); w.rotation.x += v * dt / 0.5;
        w.position.y = 0.5;
        if (G.world.resolve(w.position, 0.5, 1)) { G.audio.clank(w.position, 0.7); dir.multiplyScalar(-1); v *= 0.5; }
        for (const n of G.npcs) {
          if (n.removed || n.hidden || n.rd || n.attached || n.kind === 'robot') continue;
          if (n.pos.distanceTo(w.position.clone().setY(n.pos.y)) < 0.8) { n.stopScriptIfInterruptible(); n.fallFrom({ dir, power: 4, up: 3, spin: 3, lie: 2 }); D.after(2.5, () => n.say('A WHEEL?! AT THIS HOUR?!', 2)); }
        }
        if (Pl.pos.distanceTo(w.position.clone().setY(Pl.pos.y)) < 0.8 && v > 3) { Pl.damage(6, w.position, 'wheel'); v *= 0.3; }
        v -= dt * 1.4;
        yield 0;
      }
      w.rotation.set(0, 0, 0); w.position.y = 0.18;
      yield 60;
      G.scene.remove(w);
    });
  };

  // ================================================================ LIVING LAMP
  P.gag_lamp = function () {
    if (this.livingLamp) return false;
    const G = this.G, s = this.findSpot(16, 22, false, 0.5);
    if (!s) return false;
    const m = makeLivingLamp();
    m.group.position.copy(s);
    G.scene.add(m.group);
    this.livingLamp = { m, unseen: 0, hops: 0, state: 'stalk', t: 0 };
    return true;
  };

  P.updateLivingLamp = function (dt) {
    const L = this.livingLamp;
    if (!L) return;
    const G = this.G, Pl = G.player, g = L.m.group;
    L.t += dt;
    const top = g.position.clone().setY(3);
    const d = Math.hypot(Pl.pos.x - g.position.x, Pl.pos.z - g.position.z);
    const face = () => { g.rotation.y = Math.atan2(Pl.pos.x - g.position.x, Pl.pos.z - g.position.z); };
    if (L.state === 'stalk') {
      if (this.lookingAt(top, 0.35)) {
        L.unseen = 0;
        if (d < 3.2 && L.hops > 0) { L.state = 'fall'; L.ft = 0; L.axis = V(Pl.pos.z - g.position.z, 0, -(Pl.pos.x - g.position.x)).normalize(); G.audio.beep(g.position, 70, 0.6, 0.2, 'sawtooth'); }
      } else {
        L.unseen += dt;
        if (L.unseen > 0.7 && d > 3) {
          L.unseen = 0; L.hops++;
          const step = Math.min(4, d - 2.5);
          g.position.x += (Pl.pos.x - g.position.x) / d * step;
          g.position.z += (Pl.pos.z - g.position.z) / d * step;
          face();
          G.audio.beep(g.position, 60, 0.25, 0.12, 'sawtooth');
          Pl.scare(0.07);
          L.m.bulb.visible = Math.random() < 0.7;
        }
      }
      if (L.t > 70) { G.scene.remove(g); this.livingLamp = null; }
    } else if (L.state === 'fall') {
      L.ft = Math.min(1, L.ft + dt / 0.7);
      g.quaternion.setFromAxisAngle(L.axis, (L.ft * L.ft) * Math.PI / 2);
      if (L.ft >= 1) {
        L.state = 'down'; L.t = 0;
        G.audio.clank(g.position, 1); G.audio.thud(g.position, 1); Pl.shake = 0.5;
        if (d < 6) Pl.damage(4, g.position, 'lamp');
        this.achieve('lamp'); this.eventsSeen++;
        this.after(1.8, () => G.ui.say('...I just wanted to be your light.', 'Lamp', 3.5, '#ffd890'));
        this.after(5.5, () => this.buddy && this.buddy.say('Did that lamp just... confess?', 3));
      }
    } else if (L.state === 'down' && L.t > 60) { G.scene.remove(g); this.livingLamp = null; }
  };

  // ================================================================ MIRROR MAN
  P.gag_mirror = function () {
    if (this.mirrorMan || this.G.player.inBasement()) return false;
    const G = this.G, Pl = G.player, W = G.world;
    const right = V(Math.cos(Pl.yaw), 0, -Math.sin(Pl.yaw));
    for (const side of [1, -1]) {
      const n0 = right.clone().multiplyScalar(side);
      const p = Pl.pos.clone().addScaledVector(n0, 14);
      if (!W.isFree(p.x, p.z, 0.6) || !W.lineClear(Pl.pos.x, Pl.pos.z, p.x, p.z)) continue;
      const n = this.human({ shirt: '#1a1a1a', pants: '#1a1a1a', hair: 'none', faceless: true, eyesGlow: '#ffffff', hat: 'none' },
        { pos: p, name: 'You?', color: '#bbb', voice: { pitch: 0.4, rate: 0.8 } });
      n.mem.noHorror = true;
      const M = Pl.pos.clone().addScaledVector(n0, 7);
      n.mem.mir = { M, N: n0, unseen: 0, t0: G.time, jumpT: -1 };
      n.ai = (nn, dt) => this.mirrorAI(nn, dt);
      this.mirrorMan = n;
      this.eventsSeen++;
      this.after(4, () => this.buddy && this.buddy.say('Bro. Your reflection is lagging.', 3));
      return true;
    }
    return false;
  };

  P.mirrorAI = function (n, dt) {
    const G = this.G, Pl = G.player, m = n.mem.mir;
    if (!m) { n.ai = 'wander'; return; }
    const end = (how) => {
      n.mem.mir = null; this.mirrorMan = null; this.achieve('mirror');
      if (how === 'trip') {
        n.say('...jump.exe not found.', 2.5);
        n.fallFrom({ dir: 'forward', power: 4, up: 0.5, lie: 2 });
      }
      this.after(how === 'trip' ? 3 : 0.5, () => {
        let k = 0;
        this.repeat(14, 0.08, () => { n.root.visible = (k++ % 2) === 0; n.rig.body.scale.set(rand(0.5, 1.6), rand(0.3, 1.4), rand(0.3, 2)); });
        this.after(1.3, () => { this.hide(n); n.remove(); });
      });
    };
    // reflect the player across the mirror line
    const toP = Pl.pos.clone().sub(m.M), dd = toP.dot(m.N);
    const target = Pl.pos.clone().addScaledVector(m.N, -2 * dd);
    const dx = target.x - n.pos.x, dz = target.z - n.pos.z, dist = Math.hypot(dx, dz);
    const sp = Math.min(dist * 8, 9);
    if (dist > 0.05) { n.pos.x += dx / dist * sp * dt; n.pos.z += dz / dist * sp * dt; G.world.resolve(n.pos, 0.35, 1.8); }
    const f = V(-Math.sin(Pl.yaw), 0, -Math.cos(Pl.yaw));
    f.addScaledVector(m.N, -2 * f.dot(m.N));
    n.heading = Math.atan2(f.x, f.z); n.root.rotation.y = n.heading;
    const moving = Math.hypot(Pl.vel.x, Pl.vel.z) > 0.4;
    n.anim = moving ? (Math.hypot(Pl.vel.x, Pl.vel.z) > 5 ? 'run' : 'walk') : 'stare';
    if (moving) n.rig.phase += dt * 9; else n.rig.phase = 0;
    // it gets closer every time you look away
    const gap = 2 * Math.abs(dd);
    if (!this.lookingAt(n.pos.clone().setY(1.6), 0.4)) {
      m.unseen += dt;
      if (m.unseen > 1.1 && gap > 2) { m.unseen = 0; m.M.addScaledVector(m.N, -Math.sign(m.N.dot(m.M.clone().sub(Pl.pos))) * 1.3); Pl.scare(0.06); }
    } else m.unseen = 0;
    if (gap < 2.2 && !m.said) { m.said = true; n.say('I am you. But with better FPS.', 3); Pl.scare(0.3); m.saidT = G.time; }
    // player jumps: he tries to copy and fails
    if (Pl.vel.y > 4 && m.jumpT < 0) m.jumpT = G.time;
    if (m.jumpT > 0 && G.time - m.jumpT > 0.45) { end('trip'); return; }
    if ((m.said && G.time - m.saidT > 4) || G.time - m.t0 > 45) end(m.said ? 'trip' : 'fade');
  };

  // ================================================================ FAKE CRASH
  P.fakeCrash = function () {
    const G = this.G;
    this.crashDone = true; this.eventsSeen++;
    G.fakeCrash = true;
    G.audio.crashBuzz(3.0);
    G.ui.crashDialog(1);
    setTimeout(() => G.ui.crashDialog(2), 3100);
    setTimeout(() => {
      G.ui.crashDialog(0); G.fakeCrash = false;
      if (G.state === 'play') { this.jumpscare('horse'); this.achieve('crash'); this.after(2, () => this.buddy && this.buddy.say('Did... did the universe just lag?', 3)); }
    }, 4300);
  };

  // ================================================================ STAND STILL TOO LONG
  P.updateIdle = function (dt) {
    const G = this.G, Pl = G.player, I = this.idle;
    if (I.busy) return;
    const moving = Math.hypot(Pl.vel.x, Pl.vel.z) > 0.3 || G.input.mdx !== 0 || G.input.mdy !== 0;
    if (moving || Pl.inVehicle || Pl.locked || this.horrorRunning || this.inKindergarten(Pl.pos)) { I.t = 0; return; }
    I.t += dt;
    if (I.t > 25 && G.time > I.next) { I.busy = true; this.task(this.idleScareTask); }
  };

  P.idleScareTask = function* () {
    const G = this.G, Pl = G.player, I = this.idle;
    const f = this.playerFwd().clone();
    const spot = Pl.pos.clone().addScaledVector(f, -1.1);
    G.world.resolve(spot, 0.3, 1.8);
    const breath = G.audio.loop('breath', spot.clone().setY(1.6));
    G.ui.say('*heavy breathing right behind you*', '', 3);
    Pl.scare(0.4);
    this.achieve('afk');
    const b = this.buddy && !this.buddy.removed ? this.buddy : null;
    const who = b || this.addNPC(makeHumanoid({ faceless: true, skin: '#b8b8b0', shirt: '#121212', pants: '#121212', suit: true, scale: 1.12 }), { name: '???', ai: 'stare' });
    const savedAi = who.ai;
    who.stopScript(); who.rd = null; who.rig.body.quaternion.identity();
    who.pos.copy(spot); this.show(who); who.ai = 'stare'; who.facePlayer();
    let t = 0;
    yield () => { t += G.dt; return this.lookingAt(spot.clone().setY(1.7), 0.6) || t > 20; };
    breath.stop();
    if (b) {
      G.audio.scream(null, 1.6, 0.8, 0.35);
      b.say("AAAH! SORRY! I breathe loud when I'm scared. And when I'm not scared.", 4);
      yield 4;
      b.say('...were you sleeping standing up? Like a horse?', 3);
    } else {
      if (t <= 20) this.jumpscare('ghost', 5);
      yield 0.5;
      this.hide(who); who.remove();
    }
    who.ai = savedAi;
    I.busy = false; I.t = 0; I.next = G.time + 200;
  };

  // ================================================================ STOP / GO (horror phase)
  P.stopGoTask = function* () {
    const G = this.G, Pl = G.player;
    this.stopGo = true;
    G.ui.big('STOP!', 3.5, 'red');
    G.audio.speak('STOP!', { pitch: 0.05, rate: 0.7 });
    G.audio.scream(null, 0.3, 0.8, 0.5);
    const frozen = this.G.npcs.filter((n) => n.ai === 'horror' && !n.removed);
    for (const n of frozen) { n.frozen = true; n.frozenPose = 'stare'; }
    this.giant.userData.eyes.forEach((e) => e.scale.setScalar(2));
    yield 0.9;
    let t = 0, caught = false;
    while (t < 3.5 && !this.ended) {
      t += G.dt;
      if (!caught && Math.hypot(Pl.vel.x, Pl.vel.z) > 1.3) {
        caught = true;
        G.ui.say('I SAW THAT.', 'GIANT HORSE', 2.5, '#f44');
        G.audio.speak('I saw that.', { pitch: 0.05, rate: 0.6 });
        Pl.damage(8, null, 'horse'); Pl.shake = 0.6;
      }
      yield 0;
    }
    if (!caught) this.achieve('stopgo');
    G.ui.big('GO!', 1.5, 'green');
    for (const n of frozen) n.frozen = false;
    if (frozen[0] && !caught) frozen[0].say('...was that a game? Are we playing a game?', 2.5);
    this.stopGo = false;
    this.stopGoNext = G.time + rand(35, 55);
  };

  // ================================================================ extra random gags
  P.gag_sneeze = function () {
    const G = this.G, s = this.findSpot(8, 14); if (!s) return false;
    this.human({}, { pos: s, name: 'Allergic Guy' }).run(function* (n) {
      yield A.face('player', 0.3);
      yield A.say('ah...');
      yield A.anim('lookup', 0.8);
      yield A.say('AAAH...');
      yield A.anim('lookup', 1.1);
      yield A.call(() => { G.ui.say('CHOOOO!!!', n.name, 1.5, n.color); G.audio.speak('CHOO!', { pitch: 1.6, rate: 1.4 }); G.audio.whoosh(0.6); G.audio.scream(n.pos.clone().setY(1.7), 1.8, 0.25, 0.4); });
      yield A.fall('backward', 10, { up: 5, spin: 7, lie: 2.2 });
      yield A.say('...bless me.');
    });
    return true;
  };

  P.gag_shopcart = function () {
    if (this.shopCart) return false;
    const G = this.G, W = G.world, s = this.findSpot(11, 17); if (!s) return false;
    const side = this.side();
    const start = s.clone().addScaledVector(side, -15);
    if (!W.isFree(start.x, start.z, 0.8) || !W.lineClear(start.x, start.z, s.x, s.z, 0.8)) return false;
    const cart = makeShopCart(); cart.position.copy(start); cart.rotation.y = Math.atan2(side.x, side.z);
    G.scene.add(cart);
    const rider = this.human({ hat: 'cap', capColor: '#d02020' }, { pos: start.clone(), name: 'Cart Rider', ai: 'none' });
    rider.attached = true; rider.anim = 'tpose';
    rider.say('WHEEEEEEEEEEE!', 2, true);
    this.shopCart = { g: cart, rider, dir: side.clone(), v: 11, dist: 0, state: 'ride', t: 0 };
    return true;
  };

  P.updateShopCart = function (dt) {
    const S = this.shopCart;
    if (!S) return;
    const G = this.G, g = S.g, r = S.rider;
    S.t += dt;
    if (S.state === 'ride') {
      g.position.addScaledVector(S.dir, S.v * dt);
      S.dist += S.v * dt;
      g.rotation.z = Math.sin(S.t * 30) * 0.04;
      r.pos.copy(g.position).setY(0.55); r.heading = g.rotation.y; r.root.rotation.y = r.heading;
      if (Math.random() < dt * 8) G.audio.beep(g.position, rand(800, 1400), 0.03, 0.05, 'square');
      const hit = G.world.resolve(g.position, 0.55, 1);
      let bump = null;
      for (const n of G.npcs) if (n !== r && !n.removed && !n.hidden && !n.rd && !n.attached && n.kind === 'human' && n.pos.distanceTo(g.position.clone().setY(n.pos.y)) < 0.9) bump = n;
      if (hit || bump || S.dist > 34) {
        S.state = 'crashed'; S.t = 0;
        G.audio.clank(g.position, 1); G.audio.thud(g.position, 0.8);
        g.rotation.z = 1.4; g.position.y = 0.3;
        r.attached = false; r.pos.y = 0.6;
        r.fallFrom({ dir: S.dir, power: 9, up: 5, spin: 6, lie: 2, silent: true });
        if (bump) { bump.stopScriptIfInterruptible(); bump.fallFrom({ dir: S.dir, power: 5, up: 2, lie: 2 }); }
        const lines = ['...I regret nothing.', 'TEN OUT OF TEN. WOULD CRASH AGAIN.', 'Who installed brakes? NOBODY.'];
        this.after(3.2, () => { r.say(pick(lines), 2.5); r.ai = 'wander'; });
      }
    } else if (S.t > 50) { G.scene.remove(g); this.shopCart = null; }
  };

  P.gag_runner = function () {
    const r = this.runner;
    if (!r || r.removed || r.rd || r.script || this.stats.runner >= 3) return false;
    const G = this.G, W = G.world, s = this.findSpot(15, 22); if (!s) return false;
    const side = this.side();
    let a = s.clone().addScaledVector(side, -10);
    if (!W.isFree(a.x, a.z, 0.6)) a = s.clone().addScaledVector(side, -3);
    const k = ++this.stats.runner;
    r.pos.copy(a); this.show(r); r.rd = null; r.rig.body.quaternion.identity();
    if (!r.mem.bandage) { r.mem.bandage = box(0.36, 0.12, 0.36, mat('#eeeeee'), 0, 0.3, 0); r.rig.head.add(r.mem.bandage); }
    else r.rig.armL.add(box(0.2, 0.3, 0.2, mat('#eeeeee'), 0, -0.3, 0));
    const D = this, buddy = this.buddy;
    if (k === 1) {
      r.run(function* (n) {
        yield A.say("I'M STILL ALIVE!", { loud: true });
        yield A.moveTo(s, 6.5, 'panic', { timeout: 6 });
        yield A.fall('forward', 6, { up: 0.3, lie: 3 });
        yield A.say('...STILL. ALIVE.');
        yield A.moveTo(s.clone().addScaledVector(side, 12), 6, 'run', { timeout: 6 });
      });
    } else if (k === 2 && buddy && !buddy.removed) {
      r.run(function* (n) {
        yield A.say("I'M ALIVE! AND I BROUGHT A FRIEND!", { loud: true });
        yield A.chase(6, 6.8, { target: () => buddy.pos, reach: 0.9, anim: 'panic' });
        yield A.call(() => { buddy.fallFrom({ dir: n.forward(), power: 5, up: 2, lie: 2 }); G.audio.thud(buddy.pos, 1); });
        yield A.fall('forward', 5, { up: 1.5, spin: 3, lie: 2.5 });
        yield A.say('...hi. I am also alive. Nice to meet you.');
        yield A.call(() => D.after(1, () => buddy.say('...I like him.', 2)));
      });
    } else {
      const lamps = W.lamps.filter((l) => l.base.distanceTo(G.player.pos) < 30 && this.lookingAt(l.base.clone().setY(1), 0.4));
      const l = lamps[0];
      r.run(function* (n) {
        yield A.say('I HAVE BEEN RUNNING FOR THREE HOURS!', { loud: true });
        yield A.moveTo(s, 6.4, 'panic', { timeout: 6 });
        yield A.say('...wait. Why am I running?');
        yield A.face(s.clone().addScaledVector(side, -20), 0.6, 'stare');
        yield A.wait(1.2, 'stare');
        yield A.call(() => G.audio.scream(n.pos.clone().setY(1.7), 1.2, 1.2, 0.6));
        if (l) {
          n.mem.noAvoid = true; n.mem.bonkPoles = true;
          yield A.move(l.base.x, l.base.z, 7, 'panic', { stop: 0.05, timeout: 6 });
          n.mem.noAvoid = false; n.mem.bonkPoles = false;
          yield A.say('THE POLE AGAIN?! WE HAVE HISTORY!');
        } else yield A.fall('forward', 6, { up: 0.4, lie: 2 });
        yield A.call(() => { if (k >= 3) D.achieve('runner3'); });
      });
    }
    return true;
  };
}
