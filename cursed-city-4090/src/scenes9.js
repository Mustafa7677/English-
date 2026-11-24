// Chapter 9: everything happens in its own place.
//  - The old "random gag in front of you" scheduler is replaced by a table of fixed spots:
//    every meme situation and fake-out scare now lives somewhere specific on the map
//    (they are marked with yellow dots on the minimap). Screamers already live in fixed places.
//  - New role-reversal memes (like the horse driving the human):
//      DOG WALKS A MAN on a leash (south avenue, by the taxi stand)
//      GIANT PIGEON FEEDS A MAN bread crumbs (in front of the supermarket)
//      CAT BOSS fires an employee and knocks his coffee off the desk (in front of the laundromat)
import * as THREE from 'three';
import { makeHumanoid } from './characters.js';
import { ACH } from './scenes2.js';
import { mat, box, rand, pick } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

Object.assign(ACH, {
  dogman: ['Good Boy', 'See the dog walking his human'],
  pigeon: ['Bread Economy', 'Watch the pigeon feed a man'],
  catboss: ['Performance Review', 'Witness the cat boss'],
});

// fixed places for every meme situation (gag name, position)
const GAG_SPOTS = [
  ['tripper', 4, 30], ['pair', -20, 3], ['guard', 20, -10], ['fight', -13, 24], ['chair', 26, 12],
  ['sneeze', 6.5, -36], ['shopcart', 20, 60], ['stopper', 57, 25], ['creeper', -60, -30], ['doorchase', -30, -8],
  ['runner', 0, -75], ['lamp', -30, -60], ['mirror', -60, 30], ['logman', 60, -35], ['shark', 30, -60],
  ['stare', -30, 57], ['phone', -3, 72], ['tv', -12, 40],
];
// fixed places for the fake-out scares
const FAKE_SPOTS = [['steps', 89, -30], ['whisper', -46, -12], ['flash', -89, -27], ['knock', 30, -89], ['steps', -30, 89]];
// dark alleys where the flashlight face can appear
const DARK_SPOTS = [[89, -30], [-89, 30], [30, -89], [-30, 89], [89, 89], [-89, -89], [89, 30], [-89, -30]];

function makePigeon() {
  const g = new THREE.Group();
  const grey = mat('#8a8e98'), dark = mat('#4a4e58'), irid = mat('#4a7a5a', { emissive: '#1a2a20' }), purple = mat('#6a4a8a'), leg = mat('#d07050');
  const body = new THREE.Group(); body.position.y = 1.0; g.add(body);
  body.add(box(0.7, 0.6, 1.0, grey, 0, 0, 0), box(0.62, 0.5, 0.35, purple, 0, 0.05, 0.4), box(0.4, 0.15, 0.6, dark, 0, 0.05, -0.65));
  const neck = new THREE.Group(); neck.position.set(0, 0.35, 0.4); body.add(neck);
  neck.add(box(0.32, 0.4, 0.3, irid, 0, 0.15, 0), box(0.34, 0.32, 0.38, grey, 0, 0.45, 0.04));
  neck.add(box(0.08, 0.07, 0.2, mat('#333'), 0, 0.42, 0.3), box(0.1, 0.05, 0.06, mat('#eee'), 0, 0.47, 0.2));
  for (const s of [-1, 1]) neck.add(box(0.03, 0.07, 0.07, mat('#e07020'), s * 0.17, 0.5, 0.1));
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.36, 0.2, 0); w.add(box(0.06, 0.5, 0.9, dark, s * 0.03, -0.2, -0.05)); body.add(w); wings.push(w); }
  for (const s of [-1, 1]) { g.add(box(0.05, 0.75, 0.05, leg, s * 0.15, 0.38, 0)); g.add(box(0.18, 0.04, 0.24, leg, s * 0.15, 0.02, 0.06)); }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  g.scale.setScalar(1.15);
  return { group: g, neck, wings };
}

export function extendDirector9(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initChapter9(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateChapter9(dt); };

  // ---- the random scheduler is replaced by fixed places
  P.runScheduler = function () {
    const G = this.G, Pl = G.player;
    if (G.time < 35 || !this.calm() || this.horror || this.horrorRunning || Pl.inVehicle || Pl.inBasement() || Pl.hiding || this.inKindergarten(Pl.pos)) return;
    if (G.time < (this.spotGap || 0)) return;
    for (const s of this.gagSpots) {
      if (G.time < s.next) continue;
      const d = Math.hypot(s.pos.x - Pl.pos.x, s.pos.z - Pl.pos.z);
      if (d > 24 || (d > 10 && !this.lookingAt(s.pos.clone().setY(1.2), 0.3))) continue;
      this.anchor = s.pos;
      let ok = false;
      try { ok = this['gag_' + s.name](); } finally { this.anchor = null; }
      s.next = G.time + (ok ? rand(300, 420) : 20);
      if (ok) { this.eventsSeen++; this.spotGap = G.time + 20; this.claim(15); this.cullNPCs(); }
      return;
    }
  };

  // ---- fake-out scares only happen at their spots
  const origFake = P.updateFakeScares;
  P.updateFakeScares = function (dt) {
    const G = this.G, Pl = G.player;
    this.fakeNext = 1e9;
    for (const s of this.fakeSpots) {
      if (G.time < s.next || !this.calm() || Math.hypot(s.pos.x - Pl.pos.x, s.pos.z - Pl.pos.z) > 9) continue;
      s.next = G.time + 420;
      this._forcedKind = s.kind; this.fakeNext = 0;
      break;
    }
    origFake.call(this, dt);
  };

  // ---- the flashlight face only lives in the dark alleys
  const origFlash = P.maybeFlashFace;
  P.maybeFlashFace = function () {
    const p = this.G.player.pos;
    if (DARK_SPOTS.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 14)) origFlash.call(this);
  };
  // ---- the "don't look back" mannequin only lives on the long road to the gate
  const origLook = P.updateLookBack;
  P.updateLookBack = function (dt) {
    const p = this.G.player.pos;
    if (p.z < -55 && Math.abs(p.x) < 12) origLook.call(this, dt); else this.lookBack.sprint = 0;
  };

  // ---- yellow dots on the minimap for every meme place
  const origMap = P.initMinimap;
  P.initMinimap = function () {
    origMap.call(this);
    if (!this.mapBg) return;
    const ctx = this.mapBg.getContext('2d'), m = this.mapM;
    const spots = [...GAG_SPOTS.map(([, x, z]) => [x, z]), [-9, 27], [-16, 12], [34, 70], [18, 82], [42, 82], [12, 12], [-46, -9.5], [8, -42.6], [24.5, -15.5], [-11, 35.5]];
    ctx.fillStyle = '#ffd020';
    for (const [x, z] of spots) { ctx.beginPath(); ctx.arc(m(x), m(z), 1.8, 0, 7); ctx.fill(); }
    ctx.font = '7px monospace'; ctx.fillText('● meme', 30, 206);
  };

  P.initChapter9 = function () {
    const G = this.G, W = G.world;
    this.gagSpots = GAG_SPOTS.map(([name, x, z]) => ({ name, pos: V(x, 0, z), next: 0 }));
    this.fakeSpots = FAKE_SPOTS.map(([kind, x, z]) => ({ kind, pos: V(x, 0, z), next: 60 }));
    this.phoneFake = this.phone ? { pos: this.phone.pos } : null;
    this.fakeSpots.push({ kind: 'phone', pos: this.phone ? this.phone.pos.clone().setY(0) : V(-8.8, 0, -33), next: 60 });
    this.c9 = { dogTalk: 0, pigeonTalk: 0, catT: 8 };

    // ---------------- DOG WALKS A MAN
    const kevin = this.kevin = this.human({ outfit: 'shirt', shirt: '#6a7a8a', pants: '#2a2a3a', hair: 'short', beard: false, hat: 'none', fat: 1.1 },
      { pos: V(-9.2, 0, 14), name: 'Kevin', color: '#9ab', voice: { pitch: 0.9, rate: 1 }, ai: (n, dt) => this.kevinAI(n, dt) });
    kevin.mem.noHorror = true; kevin.mem.noCrash = true; kevin.mem.dir = 1;
    kevin.rig.head.add(box(0.2, 0.05, 0.2, mat('#c02020'), 0, -0.04, 0, false)); // collar
    const dog = this.dog = this.addNPC(makeHumanoid({ animal: 'dog', skin: '#8a5a30', outfit: 'jacket', shirt: '#2a3a6a', pants: '#222', hat: 'cap', capColor: '#a02020' }),
      { pos: V(-9.2, 0, 12), name: 'Dog', color: '#d9a066', voice: { pitch: 0.8, rate: 1.1 }, ai: (n, dt) => this.dogAI(n, dt) });
    dog.mem.noHorror = true; dog.mem.noCrash = true;
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.leash = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xa02020 })); this.leash.frustumCulled = false; G.scene.add(this.leash);

    // ---------------- GIANT PIGEON FEEDS A MAN
    const pm = this.pigeonMan = this.human({ outfit: 'hoodie', shirt: '#5a5a4a', hair: 'bun', beard: true },
      { pos: V(-16, 0, 12), heading: Math.PI / 2, ai: 'idle', name: 'Bread Guy', color: '#cb9' });
    pm.mem.idleAnim = 'peck'; pm.mem.noHorror = true;
    const pg = this.pigeon = makePigeon(); pg.group.position.set(-13.8, 0, 12.3); pg.group.rotation.y = -Math.PI / 2; G.scene.add(pg.group);
    W.addCollider(-14.4, -13.2, 11.7, 12.9, -1, 2.2);

    // ---------------- CAT BOSS (in front of the laundromat)
    const desk = box(1.7, 0.08, 0.85, mat('#4a3220'), 34, 0.76, 70.2); G.scene.add(desk);
    G.scene.add(box(0.08, 0.76, 0.08, mat('#3a2418'), 33.25, 0.38, 69.9), box(0.08, 0.76, 0.08, mat('#3a2418'), 34.75, 0.38, 70.5));
    G.scene.add(box(0.5, 0.45, 0.5, mat('#222'), 34, 0.225, 71.15), box(0.5, 0.6, 0.08, mat('#222'), 34, 0.75, 71.42));
    G.scene.add(box(0.28, 0.02, 0.2, mat('#eee'), 33.5, 0.81, 70.1)); // papers
    W.addCollider(33.15, 34.85, 69.75, 70.65, -1, 0.8);
    const nameplate = box(0.5, 0.1, 0.04, mat('#c0a040'), 34, 0.86, 69.8); G.scene.add(nameplate);
    this.mug = box(0.1, 0.12, 0.1, mat('#f0f0f0'), 34.45, 0.86, 70.0); G.scene.add(this.mug);
    this.cat = this.addNPC(makeHumanoid({ animal: 'cat', skin: '#8a8a92', suit: true, shirt: '#1a1a1a', pants: '#1a1a1a' }),
      { pos: V(34, 0, 71.1), heading: Math.PI, ai: 'idle', name: 'CEO Whiskers', color: '#ccc', voice: { pitch: 1.6, rate: 1 } });
    this.cat.mem.idleAnim = 'sit'; this.cat.mem.noHorror = true;
    this.employee = this.human({ suit: true, shirt: '#2a2a40', hair: 'short', glasses: true },
      { pos: V(34, 0, 68.9), heading: 0, ai: 'idle', name: 'Employee', color: '#aac' });
    this.employee.mem.idleAnim = 'sitground'; this.employee.mem.noHorror = true;
  };

  // ================================================================ DOG WALKS A MAN
  P.kevinAI = function (n, dt) {
    const G = this.G, m = n.mem;
    const targetZ = m.dir > 0 ? 42 : 12;
    if (m.sniff > 0) { m.sniff -= dt; n.anim = 'quad'; n.speed = 0; return; }
    n.steer(-9.2, targetZ, 1.25, dt, 'quad');
    if (Math.abs(n.pos.z - targetZ) < 0.6) m.dir *= -1;
    // stops to sniff lamp posts
    for (const l of G.world.lamps) {
      if (l.base.distanceTo(n.pos) < 2.4 && G.time - (m.lastSniff || -99) > 20) { m.lastSniff = G.time; m.sniff = 2.5; if (n.distToPlayer() < 20) n.say('*sniff sniff*', 1.8); }
    }
  };
  P.dogAI = function (n, dt) {
    const k = this.kevin, G = this.G;
    if (k.removed) { n.ai = 'wander'; return; }
    const f = k.forward();
    const tx = k.pos.x - f.x * 1.9, tz = k.pos.z - f.z * 1.9;
    const d = Math.hypot(tx - n.pos.x, tz - n.pos.z);
    if (d > 0.4) n.steer(tx, tz, Math.min(3.5, 1.2 + d), dt, 'walk'); else { n.anim = 'idle'; n.faceNow(k.pos.x, k.pos.z); }
    // talk when the player is close
    if (n.distToPlayer() < 12 && G.time - (this.c9.dogT || -99) > 14 && this.ambientOk()) {
      this.c9.dogT = G.time;
      const [a, b] = pick([
        ["Who's a good boy? YOU are, Kevin.", '...woof.'],
        ['Heel, Kevin. HEEL.', '*whimpers in accounting*'],
        ['We talked about the lamp posts, Kevin.', '...they smell like freedom.'],
        ['Sorry, he is friendly. He just wants to sniff your 4090.', '*sniff*'],
        ['No, you cannot have the bone. You are thirty-four.', '...woof.'],
      ]);
      n.say(a, 3); this.after(3.1, () => k.say(b, 2.2));
      this.achieve('dogman');
    }
  };
  P.updateLeash = function () {
    const dog = this.dog, k = this.kevin;
    if (!dog || dog.removed || k.removed) { this.leash.visible = false; return; }
    const a = dog.rig.armR.localToWorld(V(0, -0.72, 0)), b = k.rig.head.localToWorld(V(0, 0, 0));
    const arr = this.leash.geometry.attributes.position.array;
    arr[0] = a.x; arr[1] = a.y; arr[2] = a.z; arr[3] = b.x; arr[4] = b.y; arr[5] = b.z;
    this.leash.geometry.attributes.position.needsUpdate = true;
  };

  // ================================================================ PIGEON FEEDS A MAN
  P.updatePigeon = function (dt) {
    const G = this.G, pg = this.pigeon, man = this.pigeonMan;
    const d = Math.hypot(G.player.pos.x - pg.group.position.x, G.player.pos.z - pg.group.position.z);
    if (d > 40) return;
    this.c9.crumbT = (this.c9.crumbT || 1) - dt;
    const toss = this.c9.crumbT < 0.35;
    pg.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (toss ? 0.8 + Math.sin(G.time * 30) * 0.4 : 0.05); });
    pg.neck.rotation.x = toss ? -0.4 : Math.sin(G.time * 4) * 0.15;
    if (this.c9.crumbT <= 0) {
      this.c9.crumbT = rand(1.2, 2);
      if (G.fx && !man.removed) G.fx.emit(man.pos.clone().add(man.forward().multiplyScalar(0.5)).setY(1.3), 8, 'crumb');
      if (d < 20 && Math.random() < 0.4) G.audio.beep(pg.group.position, rand(380, 460), 0.18, 0.06, 'sine'); // coo
    }
    if (d < 8 && G.time - (this.c9.pigeonT || -99) > 25 && !man.rd && this.ambientOk()) {
      this.c9.pigeonT = G.time;
      const [a, b] = pick([
        ['Coo. Eat, human. Grow strong.', "...don't judge me. The bread here is incredible."],
        ['Coo coo. Who is feeding WHO now?', '*peck peck* ...this is the best night of my life.'],
        ['One day you will be big enough to fly. Coo.', 'I am forty-one years old.'],
      ]);
      G.ui.say(a, 'Giant Pigeon', 3, '#aab'); this.after(3.2, () => man.say(b, 3));
      this.achieve('pigeon');
    }
  };

  // ================================================================ CAT BOSS
  P.updateCatBoss = function (dt) {
    const G = this.G, cat = this.cat, emp = this.employee;
    if (cat.removed || emp.removed) return;
    if (cat.distToPlayer() > 15 || cat.rd || emp.rd) return;
    this.c9.catT -= dt;
    if (this.c9.catT > 0 || !this.ambientOk()) return;
    this.c9.catT = 20;
    const plea = pick(['Sir, the quarterly report is... a little bit late.', 'But sir, I have a family! And a fish!', 'Please, sir. One more chance. I will catch the red dot.']);
    emp.say(plea, 3);
    this.after(3.3, () => { cat.say('Meow.', 1.5); this.after(1.5, () => G.ui.say('(You are fired.)', 'translation', 2.5, '#888')); });
    this.after(6.5, () => {
      cat.mem.idleAnim = 'wave';
      const p = this.mug.position.clone();
      this.mug.visible = false;
      const mug = G.props.spawn(box(0.1, 0.12, 0.1, mat('#f0f0f0')), p, V(0, 1.2, -2.2), {
        kind: 'mug', r: 0.06, thrown: false, onLand: (pp) => { if (pp.broke) return; pp.broke = true; G.audio.crunch(pp.pos, 0.6); if (G.fx) G.fx.emit(pp.pos, 10, 'crumb'); },
      });
      this.after(0.8, () => { cat.mem.idleAnim = 'sit'; });
      this.after(2, () => emp.say('...that was my coffee.', 2.5));
      this.after(5, () => { cat.say('Meow.', 1.2); G.ui.say('(Clean it up.)', 'translation', 2, '#888'); });
      this.after(12, () => { G.props.remove(mug); this.mug.visible = true; });
      this.achieve('catboss');
    });
  };

  P.updateChapter9 = function (dt) {
    this.updateLeash();
    this.updatePigeon(dt);
    this.updateCatBoss(dt);
  };
}
