// Chapter 6: meme situations bound to specific places.
//  GYM:        Gym Bro (huge arms, tiny legs), treadmill fail, skeleton waiting for a spotter,
//              blackout with the punching bag, protein shake -> SIGMA MODE (double kick power)
//  LAUNDROMAT: man stuck in the spin cycle, the washing machines rise up... for one sock,
//              lonely sock monster in the dryer (reunite it with its sock), vending machine you shake
//  GAS STATION: man crying at the price sign as the price keeps going up
//  KINDERGARTEN SWING: swings by itself at night... "my turn." ... then Buddy rides it
import * as THREE from 'three';
import { A } from './npc.js';
import { makeHumanoid } from './characters.js';
import { ACH } from './scenes2.js';
import { DEATHS } from './scenes3.js';
import { mat, basic, box, textTex, rand, pick } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

Object.assign(ACH, {
  treadmill: ['Skill Issue', 'Watch the treadmill fail'],
  skeleton: ['Spotter Needed', 'Meet the skeleton on the bench press'],
  sigma: ['SIGMA MODE', 'Drink the Gym Bro protein shake'],
  spin: ['Spin Cycle', 'Rescue the man from the washing machine'],
  socks: ['Reunited', 'Bring the lonely sock back to its other half'],
  vending: ['You Shook It', 'Tip over the vending machine'],
  gas: ['Inflation', 'Watch the gas price go to 4090'],
  swing: ['Playtime', 'Find out whose turn it is on the swing'],
});
Object.assign(DEATHS, {
  vending: ['Crushed by a vending machine.', 'You shook it. Everybody knows you do not shake it.'],
});

function inside(R, p) { return p.y > -1 && p.x > R.X0 && p.x < R.X1 && p.z > R.Z0 && p.z < R.Z1; }

export function extendDirector6(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initChapter6(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateChapter6(dt); };

  P.initChapter6 = function () {
    const G = this.G, W = G.world;
    this.c6 = { gymVisited: false, laundryVisited: false, gymBroTalk: 0, vend: 0, swing: 'idle', swingT: 0 };
    // ---------------- gym
    this.gymBro = this.addNPC(makeHumanoid({ skin: '#c99572', shirt: '#e8e8e8', pants: '#1a1a3a', outfit: 'tshirt', hair: 'buzz', buff: true, tinyLegs: true, fat: 1.25 }),
      { pos: V(19, 0, 80.5), heading: Math.PI, ai: 'idle', name: 'Gym Bro', color: '#ffb040', voice: { pitch: 0.7, rate: 1.05 } });
    this.gymBro.mem.idleAnim = 'flex'; this.gymBro.mem.noHorror = true;
    W.addInteract({ pos: () => this.gymBro.pos.clone().setY(1.6), r: 2.8, label: 'Talk to the Gym Bro', enabled: () => !this.gymBro.rd, act: () => this.talkGymBro() });
    const tm = W.treadmills[0];
    this.runner2 = this.addNPC(makeHumanoid({ outfit: 'tshirt', shirt: '#2050a0', pants: '#111', hair: 'short', shoe: '#eeeeee' }),
      { pos: tm.pos.clone(), heading: 0, name: 'Treadmill Guy', color: '#8cf', ai: (n, dt) => this.treadmillAI(n, dt) });
    this.runner2.mem.keepY = true; this.runner2.mem.noHorror = true; this.runner2.mem.tm = 4;
    this.skeleton = this.addNPC(makeHumanoid({ faceless: true, skin: '#e8e4d8', shirt: '#e8e4d8', pants: '#e8e4d8', fat: 0.62, hair: 'none' }),
      { pos: W.spots.skeleton.clone(), heading: 0, ai: 'idle', name: 'Skeleton', color: '#eee', voice: { pitch: 0.3, rate: 0.7 } });
    this.skeleton.mem.idleAnim = 'press'; this.skeleton.mem.noHorror = true;
    for (const s of [-1, 1]) this.skeleton.rig.head.add(box(0.08, 0.08, 0.02, basic('#000'), s * 0.075, 0.22, 0.163, false));
    this.skeleton.rig.head.add(box(0.16, 0.05, 0.02, basic('#000'), 0, 0.09, 0.163, false));
    // ---------------- laundromat
    const wm = W.washers[1];
    const spinHead = new THREE.Group(); spinHead.position.set(0, 0.55, -0.08);
    spinHead.add(box(0.26, 0.26, 0.26, mat('#e0b58f'), 0, 0, 0, false), box(0.27, 0.08, 0.27, mat('#1a1410'), 0, 0.12, 0, false), box(0.12, 0.03, 0.02, mat('#300'), 0, -0.06, -0.135, false));
    wm.g.add(spinHead); this.spinHead = spinHead;
    W.addInteract({ pos: wm.front.clone().setY(0.8), r: 2.4, label: 'Open the washing machine', enabled: () => !this.c6.spinFreed, act: () => this.freeSpinMan() });
    W.addInteract({ pos: W.dryers[0].pos, r: 2.4, label: 'Check the dryer', enabled: () => !this.c6.sockDone, act: () => this.checkDryer() });
    W.addInteract({
      pos: W.vending.pos, r: 2.6,
      label: () => (this.c6.vend >= 2 ? 'Shake the vending machine' : 'Use the vending machine'),
      enabled: () => !this.c6.vendDown, act: () => this.useVending(),
    });
    // ---------------- gas station crier
    this.gasGuy = this.addNPC(makeHumanoid({ outfit: 'jacket', shirt: '#5a4020', hair: 'short', beard: true }),
      { pos: V(12.2, 0, 11.6), heading: Math.atan2(14 - 12.2, 14 - 11.6), ai: 'idle', name: 'Driver', color: '#fc8' });
    this.gasGuy.mem.idleAnim = 'lookup';
  };

  // ================================================================ GYM
  P.talkGymBro = function () {
    const G = this.G, b = this.gymBro;
    const lines = [
      ['BRO. Welcome to the gym.', 'You look like you lift... memes.'],
      ['NEVER. SKIP. LEG DAY.', '...I skipped leg day in 2016. I never recovered.'],
      ['Here, bro. My special protein shake. Sigma grindset in a bottle.'],
      ['Bro, I am flexing so hard right now. You cannot even see it.'],
    ];
    const k = Math.min(this.c6.gymBroTalk, lines.length - 1);
    this.c6.gymBroTalk++;
    b.facePlayer();
    lines[k].forEach((l, i) => this.after(i * 3, () => b.say(l, 3)));
    if (k === 2) this.after(2.5, () => this.sigmaMode());
  };

  P.sigmaMode = function () {
    const G = this.G, Pl = G.player;
    Pl.sigma = 30; Pl.drinkEnergy();
    G.audio.vineBoom(1);
    G.ui.big('🗿 SIGMA MODE 🗿', 3, 'glitch');
    G.ui.toast('SIGMA MODE: kicks are twice as strong for 30 s');
    this.achieve('sigma');
  };

  P.treadmillAI = function (n, dt) {
    const G = this.G, m = n.mem, tm = G.world.treadmills[0];
    n.anim = 'run'; n.speed = m.tm;
    n.rig.phase += dt * (2 + m.tm * 1.9);
    n.pos.copy(tm.pos); n.heading = 0; n.root.rotation.y = 0;
    tm.belt.position.z = ((tm.belt.position.z - m.tm * dt * 0.05) % 0.1);
    if (Math.random() < dt * 4) G.audio.step(0.05);
    if (m.state === 'max') {
      m.tm = Math.min(24, m.tm + dt * 9);
      if (m.tm >= 24) {
        m.state = 'done'; n.mem.keepY = false; n.ai = 'idle';
        n.fallFrom({ dir: 'backward', power: 12, up: 3.5, spin: 6, lie: 4 });
        G.audio.whoosh(0.6);
        this.after(0.35, () => { if (G.state === 'play') { G.freezeT = 1.6; G.ui.memeFreeze('skill issue', 1700); G.audio.vineBoom(0.8); } });
        this.after(5, () => n.say('...new personal record.', 3));
        this.achieve('treadmill'); this.eventsSeen++;
      }
      return;
    }
    if (!m.state && n.distToPlayer() < 4.5) {
      m.state = 'talk';
      n.say('Day three thousand six hundred and fifty of running. Still not tired.', 3.5);
      this.after(4, () => { n.say('WATCH THIS, BRO. MAX SPEED!', 2.5, true); m.state = 'max'; });
    }
  };

  P.gymTask = function* () {
    const G = this.G, W = G.world, Pl = G.player, R = W.gym, bro = this.gymBro;
    this.c6.gymVisited = true; this.eventsSeen++;
    yield 1.5;
    bro.say('BRO! YOU CAME! Leg day or arm day? ...Trick question. It is always arm day.', 4, true);
    let t = 0;
    yield () => { t += G.dt; return t > 18 || !inside(R, Pl.pos); };
    if (!inside(R, Pl.pos)) { this.c6.gymVisited = false; return; }
    // blackout: something is hitting the punching bag in the dark
    R.panels.forEach((p) => (p.material = W.marketPanelOff)); R.light.intensity = 0; this.blackout = 2.6;
    for (let i = 0; i < 5; i++) { G.audio.thud(W.punchBag.position.clone().setY(2.4), 1); this.c6.bagKick = 1; yield 0.45; }
    const f = this.playerFwd();
    bro.stopScript(); bro.pos.set(Pl.pos.x + f.x * 1.2, 0, Pl.pos.z + f.z * 1.2); W.resolve(bro.pos, 0.4, 2); bro.facePlayer();
    R.panels.forEach((p) => (p.material = W.marketPanelOn)); R.light.intensity = R.light.userData.base;
    G.audio.vineBoom(1); Pl.scare(0.4); Pl.shake = 0.4;
    G.ui.big('💪', 1.6, '');
    bro.say('BOO. ...Gains.', 2.5);
    yield 3;
    bro.say('Sorry bro. The lights go off when I flex too hard.', 3.5);
    bro.run(function* () { yield A.moveTo(V(19, 0, 80.5), 1.6, 'walk', { timeout: 8 }); yield A.face(V(19, 0, 70), 0.3); });
  };

  // ================================================================ LAUNDROMAT
  P.freeSpinMan = function () {
    const G = this.G, W = G.world, wm = W.washers[1];
    this.c6.spinFreed = true; this.eventsSeen++;
    wm.g.remove(this.spinHead);
    G.audio.clank(wm.front, 0.6);
    const n = this.addNPC(makeHumanoid({ outfit: 'hoodie', shirt: '#6a2a6a', hair: 'short' }), { pos: wm.front.clone(), heading: Math.PI, name: 'Dizzy Dave', color: '#c8f' });
    n.fallFrom({ dir: V(0, 0, -1), power: 4, up: 1.5, spin: 6, lie: 2.2 });
    n.run(function* (nn) {
      yield A.say('...I can see sounds. Is it Tuesday?');
      yield A.anim('flail', 1.5);
      yield A.say('Thank you, stranger. I have been in there since the 2nd of... what year is it?');
      yield A.move(nn.pos.x + 3, nn.pos.z - 3, 1.2, 'panic', { timeout: 4 });
      yield A.fall('forward', 2, { lie: 1.5 });
    });
    this.achieve('spin');
  };

  P.laundryTask = function* () {
    const G = this.G, W = G.world, Pl = G.player, R = W.laundry;
    this.c6.laundryVisited = true; this.eventsSeen++;
    yield 1.5;
    if (!this.c6.spinFreed) {
      for (let i = 0; i < 3; i++) { G.audio.thud(W.washers[1].g.position.clone().setY(0.6), 0.8); yield 0.35; }
      G.ui.say("DON'T OPEN IT! I'M IN THE SPIN CYCLE!", '(from a washing machine)', 3, '#c8f');
    }
    let t = 0;
    yield () => { t += G.dt; return t > 7 || !inside(R, Pl.pos); };
    if (!inside(R, Pl.pos)) { this.c6.laundryVisited = false; return; }
    // the washing machines rise up
    const red = basic('#ff2020');
    R.panels.forEach((p) => (p.material = red)); R.light.color.set(0xff2020);
    Pl.scare(0.45);
    G.ui.say('*every washing machine starts at the same time*', '', 2.5);
    t = 0;
    while (t < 3.2) {
      t += G.dt;
      for (const w of W.washers) {
        const dir = V(Pl.pos.x - w.g.position.x, 0, Pl.pos.z - w.g.position.z);
        const d = dir.length();
        if (d > 1.6) w.g.position.addScaledVector(dir.normalize(), 0.7 * G.dt);
        w.g.position.y = Math.random() * 0.05; w.g.rotation.y = (Math.random() - 0.5) * 0.15;
      }
      if (Math.random() < 0.4) G.audio.thud(W.washers[Math.floor(Math.random() * 6)].g.position, 0.5);
      Pl.shake = Math.max(Pl.shake, 0.15);
      yield 0;
    }
    for (const w of W.washers) { w.g.position.y = 0; w.g.rotation.y = 0; }
    G.audio.setAmbient(0.1, 0.3);
    yield 1.5;
    const w = W.washers[3];
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => G.audio.beep(w.g.position, f, 0.18, 0.2, 'triangle'), i * 180));
    G.ui.say('♪ CYCLE COMPLETE ♪', 'Washing Machine', 2.5, '#9cf');
    yield 1;
    const sockMesh = box(0.12, 0.3, 0.08, mat('#3050c0'), 0, 0, 0);
    const p = G.props.spawn(sockMesh, w.g.position.clone().add(V(0, 0.6, -0.5)), V(rand(-0.5, 0.5), 2, -2), { kind: 'sock', r: 0.1, thrown: false });
    p.onRest = (pp) => {
      if (pp.interact) return;
      pp.interact = W.addInteract({ pos: () => pp.pos.clone().setY(pp.pos.y + 0.2), r: 2, label: 'Pick up the lonely sock', act: () => { this.c6.hasSock = true; G.props.remove(pp); G.ui.toast('You picked up a lonely blue sock. Someone is missing it.'); } });
    };
    G.ui.say('*a single blue sock falls out*', '', 2.5);
    this.after(2.5, () => this.buddy && this.buddy.say('...where is the other one? There is ALWAYS another one.', 3));
    G.audio.setAmbient(1, 2);
    R.panels.forEach((pp) => (pp.material = W.marketPanelOn)); R.light.color.set(0xe8f4ff);
    // they slide back home like nothing happened
    t = 0;
    while (t < 1) { t = Math.min(1, t + G.dt / 2); for (const ww of W.washers) ww.g.position.lerp(ww.home, t); yield 0; }
  };

  P.checkDryer = function () {
    const G = this.G;
    if (this.c6.hasSock) {
      this.c6.sockDone = true; this.c6.hasSock = false;
      G.ui.say('MY OTHER HALF!! YOU FOUND IT!!', 'Sock', 3, '#69f');
      G.audio.beep(null, 784, 0.2, 0.2, 'triangle'); setTimeout(() => G.audio.beep(null, 1046, 0.4, 0.2, 'triangle'), 200);
      if (G.fx) G.fx.emit(G.world.dryers[0].pos, 30, 'confetti');
      this.after(3, () => G.ui.say('*the two socks are finally together. you hear a tiny violin.*', '', 4));
      this.achieve('socks');
      return;
    }
    if (this.c6.sockSeen) { G.ui.say('*sniff* ...have you seen a blue sock? About this tall?', 'Sock', 3, '#69f'); return; }
    this.c6.sockSeen = true;
    G.ui.screamer('sock', 0.8); G.audio.sting(0.8); G.player.scare(0.5);
    this.after(0.8, () => { G.ui.say('WHERE IS MY OTHER HALF?!', 'Sock', 2.5, '#69f'); G.audio.speak('Where is my other half?!', { pitch: 1.7, rate: 1.2 }); });
    this.after(3.5, () => G.ui.say('*sniff* ...have you seen a blue sock? About this tall?', 'Sock', 3.5, '#69f'));
  };

  P.useVending = function () {
    const G = this.G, W = G.world, v = W.vending, Pl = G.player;
    this.c6.vend++;
    if (this.c6.vend === 1) {
      G.audio.clank(v.pos, 0.4);
      G.ui.toast('You got: a can of "Fresh Air From 4090 City". It is empty.');
      return;
    }
    if (this.c6.vend === 2) { G.ui.say('OUT OF ORDER. PLEASE SHAKE.', 'Vending Machine', 3, '#f66'); G.audio.beep(v.pos, 220, 0.3, 0.2); return; }
    this.c6.vendDown = true; this.eventsSeen++;
    G.ui.say('*you shake the vending machine*', '', 1.5);
    G.audio.clank(v.pos, 0.7);
    const D = this;
    this.task(function* () {
      for (let i = 0; i < 6; i++) { v.body.rotation.z = (i % 2 ? 0.06 : -0.06); G.audio.clank(v.pos, 0.3); yield 0.12; }
      let t = 0;
      while (t < 1) { t = Math.min(1, t + G.dt / 0.55); v.body.rotation.z = -t * t * Math.PI / 2; yield 0; }
      G.audio.clank(v.pos, 1); G.audio.thud(v.pos, 1); G.audio.crunch(v.pos, 0.6);
      if (G.fx) G.fx.emit(v.pos.clone().setY(0.3), 20, 'dust');
      Pl.shake = 0.7;
      v.col.enabled = false;
      const x0 = W.laundry.X0 + 1.2;
      W.addCollider(x0, x0 + 2, 78.5, 79.5, -1, 0.9);
      const hitX = Pl.pos.x > x0 - 0.3 && Pl.pos.x < x0 + 2.3 && Math.abs(Pl.pos.z - 79) < 0.9;
      if (hitX) { Pl.damage(18, v.pos, 'vending'); Pl.pos.x = x0 + 2.6; }
      yield 0.3;
      if (G.state === 'play') { G.freezeT = 1.5; G.ui.memeFreeze('you shook it.', 1600); G.audio.vineBoom(0.8); }
      D.achieve('vending');
    });
  };

  // ================================================================ GAS STATION
  P.updateGasGuy = function () {
    const G = this.G, n = this.gasGuy, W = G.world;
    if (this.c6.gasDone || n.removed || n.rd || n.distToPlayer() > 15 || !this.lookingAt(n.pos.clone().setY(1.5), 0.6)) return;
    this.c6.gasDone = true; this.eventsSeen++;
    const setPrice = (t) => { W.gasSign.material = basic('#fff', { map: textTex(t, { w: 256, h: 128, bg: '#300', fg: '#ff6a00', font: 'bold 52px monospace' }) }); G.audio.beep(W.gasSign.position, 1600, 0.1, 0.15, 'square'); };
    const D = this;
    n.run(function* (nn) {
      yield A.say('FOUR DOLLARS NINE CENTS?! FOR GAS?!', { loud: true });
      yield A.anim('lookup', 1.5);
      yield A.call(() => setPrice('GAS 40.90'));
      yield A.anim('lookup', 0.6);
      yield A.say('...FORTY?!');
      yield A.anim('lookup', 1.2);
      yield A.call(() => setPrice('GAS 4090'));
      yield A.anim('lookup', 0.8);
      yield A.say('...it is cheaper to buy an RTX 4090 and drink it.');
      yield A.fall('backward', 2, { lie: 3 });
      yield A.call(() => D.achieve('gas'));
      yield A.say('*sobbing*');
    });
  };

  // ================================================================ KINDERGARTEN SWING
  P.updateSwing = function (dt) {
    const G = this.G, Pl = G.player, sw = G.world.swing, c = this.c6;
    if (!sw) return;
    c.swingT += dt;
    const d = Math.hypot(Pl.pos.x - sw.position.x, Pl.pos.z - sw.position.z);
    if (c.swing === 'idle') {
      const a = Math.sin(c.swingT * 1.7) * 0.6;
      sw.rotation.z = a;
      if (d < 30 && Math.abs(Math.cos(c.swingT * 1.7)) < 0.03 && Math.random() < 0.5) G.audio.beep(sw.position, 180 + Math.random() * 40, 0.25, 0.06, 'sawtooth'); // creak
      if (d < 7 && !this.horrorRunning) {
        c.swing = 'stopped'; c.swingT = 0; sw.rotation.z = 0;
        G.audio.setAmbient(0.1, 0.2);
        Pl.scare(0.35);
        this.after(1.2, () => { G.ui.say('...my turn.', '(a whisper)', 2.5, '#aaa'); G.audio.speak('my turn', { pitch: 0.3, rate: 0.6, volume: 0.5 }); });
        this.after(3.5, () => G.audio.setAmbient(this.horror ? 0.5 : 1, 2));
        this.after(5, () => this.buddySwing());
        this.achieve('swing');
      }
    } else if (c.swing === 'buddy') {
      const b = this.buddy;
      sw.rotation.z = Math.sin(c.swingT * 2.4) * 0.9;
      sw.updateMatrixWorld();
      const seat = sw.localToWorld(V(0, -2.4, 0));
      b.pos.set(seat.x, seat.y - 0.45, seat.z); b.heading = Math.PI / 2; b.root.rotation.y = Math.PI / 2; b.anim = 'sit';
      if (c.swingT > 9) {
        c.swing = 'done'; b.attached = false; b.pos.y = 0;
        b.fallFrom({ dir: V(1, 0, 0), power: 5, up: 3, spin: 3, lie: 1.5 });
        this.after(2.5, () => b.say('...okay. I am dizzy. Worth it.', 3));
      }
    } else if (c.swing === 'done') sw.rotation.z *= 0.97;
  };

  P.buddySwing = function () {
    const b = this.buddy, c = this.c6;
    if (!b || b.removed || b.distToPlayer() > 30) { c.swing = 'done'; return; }
    b.stopScript(); b.rd = null; b.rig.body.quaternion.identity();
    b.say("MY TURN! MY TURN! I NEVER HAD A CHILDHOOD!", 3, true);
    b.run(function* () { yield A.moveTo(V(-45.6, 0, -9.5), 6, 'run', { stop: 0.6, timeout: 10 }); });
    const D = this;
    this.task(function* () {
      yield () => !b.script;
      b.attached = true; c.swing = 'buddy'; c.swingT = 0;
      b.say('WHEEEEEEEEEE!', 2, true);
    });
  };

  // ================================================================ per-frame
  P.updateChapter6 = function (dt) {
    const G = this.G, W = G.world, Pl = G.player;
    if (!this.horrorRunning) {
      if (!this.c6.gymVisited && inside(W.gym, Pl.pos)) this.task(this.gymTask);
      if (!this.c6.laundryVisited && inside(W.laundry, Pl.pos)) this.task(this.laundryTask);
    }
    // skeleton on the bench press
    const sk = this.skeleton;
    if (!this.c6.skelDone && sk.distToPlayer() < 2.6 && this.lookingAt(sk.pos.clone().setY(1.4), 0.7)) {
      this.c6.skelDone = true; this.eventsSeen++;
      sk.say('...spot me, bro?', 2);
      this.jumpscare('skull');
      this.after(2.5, () => sk.say('I have been waiting for a spotter since 1998.', 3.5));
      this.after(6.5, () => sk.say('...bro, my arms are literally just bones at this point.', 3.5));
      this.achieve('skeleton');
    }
    // the punching bag swings in the dark
    const bag = W.punchBag;
    if (this.c6.bagKick) { this.c6.bagV = (this.c6.bagV || 0) + 2.5; this.c6.bagKick = 0; }
    this.c6.bagV = ((this.c6.bagV || 0) - bag.rotation.x * 12 * dt) * (1 - dt * 0.8);
    bag.rotation.x += this.c6.bagV * dt;
    if (this.spinHead && this.spinHead.parent) this.spinHead.rotation.z += dt * 9;
    this.updateGasGuy();
    this.updateSwing(dt);
  };
}
