// Chapter 18: MEME → SCREAMER.
//
// METRO 404: the quiet "spot the difference" anomalies are gone. Every anomaly is now a meme that turns
// into a screamer: MEME (funny) → WARNING (red light, head snaps, the voice drops) → SCREAMER (chase or
// lunge). Rule: see a meme? Turn back before it turns. Turning back during the warning = "Just in time"
// (+300 aura). Getting caught restarts the current station (not the whole run). Every run enables only a
// random 13 of the 18 meme-screamers and draws them from a shuffled bag, so runs never repeat.
//
// NO OVERLAPS: background chatter (dog, pigeon, horse, cat boss, Buddy, radio, monkey) waits while someone
// else is talking; random optional events (gags, fake scares, phone, bus, crocodile, coffin, idle scare,
// subliminal frames, fake crash...) wait for a quiet period after any scene or screamer ("claim").
//
// NEW CITY MEMES in empty corners: the Mewing Guy (west), the NPC Streamer (east), the Purple Shake (south-west).
import * as THREE from 'three';
import { makeHumanoid, pose, randomLook } from './characters.js';
import { ACH } from './scenes2.js';
import { mat, basic, box, cyl, canvasTex, rand, pick, shuffle } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const MY = -120;
const NAMES = { 5: 'Райымбек батыр', 4: 'Жібек жолы', 3: 'Абай', 2: 'Туннель 404', 1: 'Шексіз бекет ∞', 0: 'Жер беті' };
const HYBRID = ['x_horse', 'x_crew67', 'x_buddy', 'x_cart', 'x_bananas', 'x_posters', 'x_door', 'x_faceless', 'x_announcer', 'manager',
  'bars', 'karate', 'oylashy', 'coderot', 'bluti', 'dad', 'dubara', 'gta6'];
const MEME_POSTERS = [['+1000', 'AURA', '#2a1a4a', '#ffd040'], ['SKILL', 'ISSUE', '#111', '#ff4040'], ['6 7', 'six... seven', '#0a2a0a', '#76ff03'], ['SIGMA', 'grindset', '#1a1a1a', '#eeeeee'], ['BRUH', 'moment', '#3a1a0a', '#ffa040']];
const SCENE_TASKS = ['marketTask', 'gymTask', 'laundryTask', 'kgTask', 'chalkTask', 'cartTask', 'nvidiaTask', 'roofFallTask', 'phoneCallTask',
  'busRideTask', 'staffDoorTask', 'basementScareTask', 'rtxTask', 'cartReturnTask', 'zoneEnterTask'];

Object.assign(ACH, {
  closeCall: ['Just In Time', 'Turn back while a meme is turning into a screamer'],
  mewing: ['🤫🧏‍♂️', 'Make the Mewing Guy talk'],
  streamer: ['You Are Live', 'Gift the NPC streamer five times'],
  purple: ['It Was Good Though', 'Drink the purple shake'],
});

function memePoster([a, b, bg, fg]) {
  return canvasTex(160, 112, (ctx) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 160, 112);
    ctx.fillStyle = fg; ctx.textAlign = 'center';
    ctx.font = 'bold 40px Impact, sans-serif'; ctx.fillText(a, 80, 58);
    ctx.font = 'bold 15px monospace'; ctx.fillText(b, 80, 88);
    ctx.strokeStyle = fg; ctx.lineWidth = 3; ctx.strokeRect(4, 4, 152, 104);
  });
}

export function extendDirector18(D) {
  const P = D.prototype;

  // ================================================================ NO OVERLAPS
  P.ambientOk = function () { return !this.G.ui.busy() && this.calm(); };
  P.claim = function (sec) { this.reliefUntil = Math.max(this.reliefUntil || 0, this.G.time + sec); };
  for (const name of SCENE_TASKS) {
    const orig = P[name];
    if (!orig) continue;
    P[name] = function* (...args) { this.claim(25); yield* orig.apply(this, args); this.claim(12); };
  }

  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initMetro18(); this.initCity18(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (this.G.map !== 'metro' && !this.ended) this.updateCity18(dt); };

  // ================================================================ METRO: setup
  P.initMetro18 = function () {
    const G = this.G, M = this.metro, root = M.root;
    M.memePosters = MEME_POSTERS.map(memePoster);
    M.crewHome = M.crew.map((r) => r.root.position.clone());
    M.buddyHome = M.buddy.root.position.clone();
    // horse commuter's newspaper
    M.horse.armL.add(box(0.32, 0.42, 0.02, mat('#e8e4d0'), 0, -0.72, 0.18));
    // the fake RTX seller's box
    M.fBox = new THREE.Group();
    M.fBox.add(box(0.55, 0.38, 0.75, mat('#1a1a1a'), 0, 0, 0), box(0.56, 0.05, 0.76, basic('#76ff03'), 0, 0.1, 0, false));
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), basic('#fff', { map: memePoster(['RTX 4090', '5000 ₸ ORIGINAL', '#111', '#76ff03']) }));
    lab.position.set(0, 0, 0.38); M.fBox.add(lab);
    M.fBox.position.set(0, 0.35, 0.45); M.fBox.visible = false; M.faceless.spine.add(M.fBox);
    // the banana monkey at the far end
    M.monkey18 = makeHumanoid({ animal: 'monkey', skin: '#6a4020', shirt: '#6a4020', pants: '#6a4020', fat: 1.1 });
    M.monkey18.root.position.set(0, MY, -43); M.monkey18.root.visible = false; root.add(M.monkey18.root);
    // something inside the friendly cart
    M.cartRig = makeHumanoid({ mannequin: true, eyesGlow: '#ff1010', scale: 0.8 });
    for (let k = 0; k < 3; k++) pose(M.cartRig, 'sitground', 1, 0, 0);
    M.cartRig.root.position.set(0, 0.55, 0.05); M.cartRig.root.visible = false; M.cart.add(M.cartRig.root);
    // the darkness that eats the corridor (announcer)
    M.darkWall = new THREE.Group();
    M.darkWall.add(box(5.4, 3.6, 0.5, basic('#000'), 0, 1.8, 0, false));
    M.darkEyes = [-0.25, 0.25].map((x) => { const e = box(0.12, 0.06, 0.02, basic('#ff1010', { fog: false }), x, 1.7, 0.27, false); M.darkWall.add(e); return e; });
    M.darkWall.visible = false; root.add(M.darkWall);
    // new rules on the wall (covers the old ones)
    const rules = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.35), basic('#fff', { map: canvasTex(220, 190, (ctx) => {
      ctx.fillStyle = '#f2eedc'; ctx.fillRect(0, 0, 220, 190);
      ctx.fillStyle = '#a00'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.fillText('ЕРЕЖЕЛЕР / RULES', 110, 24);
      ctx.textAlign = 'left'; ctx.fillStyle = '#111'; ctx.font = '11px monospace';
      ['1. No meme? Walk forward', '   to the train.', '2. A MEME appeared? It will', '   turn into a SCREAMER.', '   TURN BACK before it does!', '3. Caught: this station', '   starts again.', '4. Wrong way: back to', '   Raiymbek Batyr.'].forEach((l, i) => ctx.fillText(l, 10, 50 + i * 15));
    }) }));
    rules.position.set(2.43, MY + 1.6, 3); rules.rotation.y = -Math.PI / 2; root.add(rules);
  };

  // ================================================================ METRO: loop selection (secret 13 of 18, shuffled bag)
  const origEnter = P.metroEnterTask;
  P.metroEnterTask = function* () {
    if (!this.metro.active) { this.metro.pool18 = null; this.metro.bag18 = null; }
    yield* origEnter.call(this);
  };
  P.metroNewLoop = function () {
    const M = this.metro;
    M.loops++;
    if (!M.pool18) M.pool18 = shuffle(HYBRID.slice()).slice(0, 13);
    if (!M.bag18 || !M.bag18.length) M.bag18 = shuffle(M.pool18.slice());
    let a = null;
    if (M.level > 0 && !M.freshStart && Math.random() < 0.62) {
      a = M.bag18.pop();
      if (a === M.prev && M.bag18.length) { M.bag18.unshift(a); a = M.bag18.pop(); }
    }
    M.freshStart = false;
    M.anomaly = a; M.prev = a || M.prev;
    this.metroReset();
    if (a) this.applyAnomaly(a);
  };

  const origReset = P.metroReset;
  P.metroReset = function () {
    origReset.call(this);
    const M = this.metro;
    M.t18 = null; M.dark18 = false;
    if (!M.monkey18) return;
    M.monkey18.root.visible = false; M.darkWall.visible = false; M.fBox.visible = false; M.cartRig.root.visible = false; M.cartRig.root.position.y = 0.55;
    M.crew.forEach((r, i) => r.root.position.copy(M.crewHome[i]));
    M.buddy.root.position.copy(M.buddyHome); M.buddy.head.rotation.set(0, 0, 0);
    M.horse.head.rotation.set(0, 0, 0);
    M.posters.forEach((p) => p.scale.setScalar(1));
    M.cart.rotation.z = 0;
  };

  const origApply = P.applyAnomaly;
  P.applyAnomaly = function (a) {
    const M = this.metro;
    M.t18 = null;
    if (!a.startsWith('x_')) { origApply.call(this, a); return; }
    M.t18 = { kind: a, state: 'meme', t: 0 };
    switch (a) {
      case 'x_horse': origApply.call(this, 'horse'); M.walker = null; M.horse.root.position.set(1.2, MY, -34); M.horse.root.rotation.y = 0; break;
      case 'x_crew67': origApply.call(this, 'crew67'); break;
      case 'x_buddy': origApply.call(this, 'buddy'); break;
      case 'x_cart': origApply.call(this, 'cart'); break;
      case 'x_bananas': origApply.call(this, 'bananas'); M.monkey18.root.visible = true; break;
      case 'x_posters': { const tx = pick(M.memePosters); M.posters.forEach((p) => { p.material.map = tx; p.material.needsUpdate = true; }); break; }
      case 'x_door': origApply.call(this, 'door'); break;
      case 'x_faceless': origApply.call(this, 'faceless'); M.walker = null; M.faceless.root.position.set(1.2, MY, -32); M.faceless.root.rotation.y = 0; M.fBox.visible = true; break;
      case 'x_announcer': M.darkWall.position.set(0, MY, -45.6); break;
    }
    M.cctvFollow = false;
  };

  // ================================================================ METRO: caught = this station restarts
  P.metroCaught = function (kind, dmg = 10, msg) {
    const G = this.G, M = this.metro, Pl = G.player;
    if (!M.active || M.caught) return;
    M.caught = true; M.busy = true;
    if (M.t18) M.t18.state = 'done';
    this.task(function* () {
      if (kind) yield* this.lunge(kind, dmg);
      else { Pl.damage(dmg, null, 'fear'); G.audio.bigScream(0.5); yield 0.7; }
      if (Pl.dead) { M.caught = false; return; }
      M.mistakes++;
      if (this.addAura) this.addAura(-150, 'got caught');
      G.ui.fade(1, 0.3); yield 0.4;
      this.metroNewLoop();
      Pl.pos.set(0, MY, 3); Pl.vel.set(0, 0, 0); Pl.yaw = 0; Pl.pitch = 0; Pl.downT = 0;
      yield 0.2;
      G.ui.fade(0, 0.8);
      G.ui.big(msg || 'ҰСТАЛДЫҢ', 2.4, 'red');
      this.after(1.4, () => G.ui.toast(`${NAMES[M.level]}: this station starts again.`));
      M.caught = false; M.busy = false;
    });
  };

  const origTrans = P.metroTransition;
  P.metroTransition = function* (direction) {
    const M = this.metro;
    if (direction === 'back' && M.anomaly && !M.busy && !M.caught) {
      const T = M.t18, T16 = M.t16;
      const hot = (T && (T.state === 'turn' || T.state === 'danger' || T.state === 'watch')) ||
        (T16 && (T16.state === 'chase' || T16.state === 'hop' || T16.state === 'fly' || T16.go));
      if (hot) { if (this.addAura) this.addAura(300, 'escaped just in time'); this.achieve('closeCall'); }
    }
    yield* origTrans.call(this, direction);
  };

  const origQuest = P.updateQuest;
  P.updateQuest = function () {
    const M = this.metro;
    if (M && M.active) {
      this.G.ui.quest(`<b>OBJECTIVE</b><br>Escape METRO 404: 5 stations, then the surface.<br><small>Now: ${M.level === 0 ? 'the exit hall' : `${6 - M.level}/5 · ${NAMES[M.level]}`}. No meme → forward to the train. A MEME → it turns into a SCREAMER: turn back in time!</small>`);
      return;
    }
    origQuest.call(this);
  };

  // ================================================================ METRO: per frame
  const origMetro = P.updateMetro;
  P.updateMetro = function (dt) {
    origMetro.call(this, dt);
    const G = this.G, M = this.metro, Pl = G.player, P0 = Pl.pos;
    if (!M.active || M.riding) return;
    if (M.dark18) M.light.intensity = 0.25;
    M.hud.innerHTML = `<b>METRO 404 · ${M.level === 0 ? 'EXIT HALL' : `${6 - M.level}/5 ${NAMES[M.level]}`}</b> · caught/mistakes ${M.mistakes}<br><small>No meme → forward to the train · MEME → it turns into a SCREAMER: turn back in time!</small>`;
    const T = M.t18;
    if (!T || T.state === 'done' || M.caught) return;
    T.t += dt;
    const dist = (p) => Math.hypot(P0.x - p.x, P0.z - p.z);
    const face = (rig) => { rig.root.rotation.y = Math.atan2(P0.x - rig.root.position.x, P0.z - rig.root.position.z); };
    const say = (text, who, color = '#ccc', dur = 3) => G.ui.say(text, who, dur, color);
    const alert = () => {
      M.panels.material = M.panelRed; M.light.color.set(0xff3020);
      G.audio.infrasound(3, 0.5); G.audio.reverseWhisper(P0.clone().setY(MY + 1.6), 0.3); G.audio.sting(0.35);
      Pl.scare(0.45);
    };
    const turn = (fn) => { T.state = 'turn'; T.t = 0; alert(); if (fn) fn(); };
    const chase = (rig, sp) => {
      const p = rig.root.position, d = dist(p) || 1;
      p.x += (P0.x - p.x) / d * sp * dt; p.z += (P0.z - p.z) / d * sp * dt;
      face(rig); rig.phase += dt * (2 + sp * 1.9); pose(rig, 'run', dt, G.time, sp);
    };
    const caught = (kind, dmg, msg) => { T.state = 'done'; this.metroCaught(kind, dmg, msg); };

    switch (T.kind) {
      case 'x_horse': {
        const r = M.horse, d = dist(r.root.position);
        if (T.state === 'meme') {
          r.root.position.z += 1.1 * dt; r.root.rotation.y = 0; r.phase += dt * 4.3; pose(r, 'walk', dt, G.time, 1.1);
          if (!T.said && d < 17) { T.said = 1; say('Good morning! Have you seen my cart? I am SO late for the office.', 'Horse', '#e0a060', 3.5); }
          if (d < 6 || r.root.position.z > 1) turn(() => { say('...YOU. HAVE. MY. CART.', 'Horse', '#f44', 2.5); G.audio.speak('You. Have. My. Cart.', { pitch: 0.1, rate: 0.7 }); });
        } else if (T.state === 'turn') {
          face(r); pose(r, 'stare', dt, G.time, 0); r.head.rotation.z = Math.sin(G.time * 45) * 0.35;
          if (T.t > 1.3) { T.state = 'danger'; r.head.rotation.z = 0; }
        } else {
          chase(r, 7.3);
          if (d < 1.1) caught('horse', 12, 'WHERE. IS. MY. CART.');
        }
        break;
      }
      case 'x_crew67': {
        if (T.state === 'meme') {
          M.crew.forEach((r) => { face(r); pose(r, 'sixseven', dt, G.time, 0); });
          T.chant = (T.chant ?? 1) - dt;
          if (T.chant <= 0) { T.chant = 4.5; say('six... SEVEN! 6️⃣7️⃣', '67 Crew', '#fd6', 2.2); G.audio.speak('six seven', { pitch: 1.1, rate: 1 }); }
          if (P0.z < -9 || T.t > 16) turn(() => { say('...six...... seven......', '67 Crew', '#f44', 2.5); G.audio.speak('six. seven.', { pitch: 0.1, rate: 0.5 }); });
        } else if (T.state === 'turn') {
          M.crew.forEach((r) => { face(r); pose(r, 'stare', dt, G.time, 0); });
          if (T.t > 1.4) T.state = 'danger';
        } else {
          let hit = false;
          M.crew.forEach((r, i) => { chase(r, 5.8 + i * 0.35); if (dist(r.root.position) < 1.0) hit = true; });
          if (hit) caught('pale', 10, '6... 7... YOU.');
        }
        break;
      }
      case 'x_buddy': {
        const r = M.buddy, d = dist(r.root.position);
        if (T.state === 'meme') {
          pose(r, 'sit', dt, G.time, 0);
          if (!T.s1 && P0.z < -3) { T.s1 = 1; say("HEY!! There you are! I've been in this corridor for THREE DAYS. Is that normal?", 'Buddy?', '#7f7', 4); }
          if (T.s1 && !T.s2 && T.t > 6) { T.s2 = 1; say('Sit with me. We can wait for the train together. Forever.', 'Buddy?', '#7f7', 3.5); }
          if (d < 4.2) turn(() => say('...wait. You are not my friend. My friend had a FACE.', 'Buddy?', '#f44', 3));
        } else {
          r.head.rotation.y += (Math.PI - r.head.rotation.y) * Math.min(1, dt * 3);
          if (T.state === 'turn' && T.t > 1.2) { if (d < 6.5) caught('pale', 10, 'THAT WAS NOT BUDDY.'); else T.state = 'watch'; }
          else if (T.state === 'watch' && d < 4) caught('pale', 10, 'THAT WAS NOT BUDDY.');
        }
        break;
      }
      case 'x_cart': {
        const c = M.cart, d = dist(c.position), cp = c.position.clone().setY(MY + 0.8);
        if (T.state === 'meme') {
          const seen = this.lookingAt(cp, 0.4);
          if (!T.said && d < 18 && seen) { T.said = 1; say("(there is a note on the cart: 'be my friend 🥺')", '', '#ccc', 3.5); }
          if (!seen && d > 1.5) {
            c.position.x += (P0.x - c.position.x) / d * 2.2 * dt; c.position.z += (P0.z - c.position.z) / d * 2.2 * dt;
            c.rotation.y = Math.atan2(P0.x - c.position.x, P0.z - c.position.z);
            if (Math.random() < dt * 3) G.audio.beep(c.position, rand(300, 500), 0.04, 0.05, 'square');
          }
          if (d < 3) turn(() => { M.cartRig.root.visible = true; G.audio.clank(c.position, 0.6); });
        } else if (T.state === 'turn') {
          c.rotation.z = Math.sin(G.time * 40) * 0.08;
          M.cartRig.root.position.y = 0.55 + Math.min(1, T.t / 0.6) * 0.5;
          if (T.t > 0.7) { c.rotation.z = 0; if (d < 4.5) caught('mannequin', 8, 'IT WAS INSIDE THE CART.'); else T.state = 'watch'; }
        } else if (T.state === 'watch' && d < 2.5) caught('mannequin', 8, 'IT WAS INSIDE THE CART.');
        break;
      }
      case 'x_bananas': {
        const mk = M.monkey18;
        if (T.state === 'meme') {
          face(mk); pose(mk, Math.sin(G.time * 2) > 0.3 ? 'windup' : 'idle', dt, G.time, 0);
          T.laugh = (T.laugh ?? 1.5) - dt;
          if (T.laugh <= 0) { T.laugh = rand(2.5, 4); G.audio.laugh(mk.root.position.clone().setY(MY + 1.6), 0.4, 1.7); }
          if (!T.said && P0.z < -2) { T.said = 1; say('OOK OOK! Banana for you! And you! And YOU!', 'Monkey', '#fe4', 3); }
          if (Math.hypot(Pl.vel.x, Pl.vel.z) > 1.2 && !(Pl.downT > 0)) {
            for (const p of M.peels) {
              if (!p.visible || Math.hypot(p.position.x - P0.x, p.position.z - P0.z) > 0.45) continue;
              Pl.downT = 1.8; Pl.shake = 0.6; Pl.pitch = Math.min(1.2, Pl.pitch + 0.8);
              G.audio.whoosh(0.5); this.after(0.3, () => G.audio.thud(null, 0.8));
              say('*SLIP*', '', '#ccc', 1.2); p.visible = false;
              turn(() => G.audio.laugh(mk.root.position.clone().setY(MY + 1.6), 0.7, 0.6));
              break;
            }
          }
          if (T.state === 'meme' && dist(mk.root.position) < 2) turn();
        } else {
          if (T.t > 0.8 && !M.dark18) { M.dark18 = true; M.panels.material = M.panelDark; G.audio.beep(null, 55, 0.5, 0.3, 'sawtooth'); }
          if (T.t > 1.8) caught('crawler', 10, 'OOK OOK. (laughter in the dark)');
        }
        break;
      }
      case 'x_posters': {
        if (T.state === 'meme') {
          if (P0.z < -9.5) { turn(); T.turnZ = P0.z; T.flip = 0; }
        } else if (T.state === 'turn') {
          const order = [4, 3, 2, 1, 0];
          while (T.flip < 5 && T.t > T.flip * 0.14) { const p = M.posters[order[T.flip]]; p.material.map = M.faceTex; p.material.needsUpdate = true; G.audio.click(); T.flip++; }
          if (T.flip >= 5) { T.state = 'danger'; T.t = 0; }
        } else {
          M.posters.forEach((p) => p.scale.setScalar(1 + Math.random() * 0.05));
          const staring = M.posters.some((p) => dist(p.position) < 8 && this.lookingAt(p.position, 0.9));
          T.stare = staring ? (T.stare || 0) + dt : 0;
          if (P0.z < T.turnZ - 4 || T.stare > 2.2) caught('poster', 8, 'THEY WERE WATCHING YOU THE WHOLE TIME.');
        }
        break;
      }
      case 'x_door': {
        const dp = V(2.2, MY, -22), d = dist(dp);
        if (T.state === 'meme') {
          if (!T.said && P0.z < -7) { T.said = 1; G.audio.whoosh(0.5); G.audio.thud(dp.clone().setY(MY + 1), 0.4); say('ЗАНЯТО! ...кіру 100 теңге! (occupied! entry 100 tenge!)', '(from the WC)', '#9cf', 3); G.audio.speak('Occupied!', { pitch: 0.8, rate: 1.1 }); }
          if (d < 6.5) turn(() => { for (let i = 0; i < 3; i++) setTimeout(() => G.audio.thud(dp.clone().setY(MY + 1.2), 0.9), i * 260); M.doors[1].rotation.y = -0.9; });
        } else if (T.state === 'turn') {
          M.eye.visible = Math.sin(G.time * 18) > -0.6;
          if (T.t > 1.0) { T.state = 'danger'; M.eye.visible = true; }
        } else if (d < 3.2) caught('pale', 8, 'ЗАНЯТО ЕМЕС ЕКЕН. (it was not occupied)');
        break;
      }
      case 'x_faceless': {
        const r = M.faceless, d = dist(r.root.position);
        if (T.state === 'meme') {
          r.root.position.z += 0.9 * dt; r.root.rotation.y = 0; r.phase += dt * 3.6; pose(r, 'carry', dt, G.time, 0.9);
          if (!T.s1 && d < 17) { T.s1 = 1; say('Бауырым! RTX 4090 бес мыңға! Оригинал! Аласың ба? (RTX 4090 for 5000, original!)', 'Seller', '#fd6', 3.5); }
          if (T.s1 && !T.s2 && T.t > 7) { T.s2 = 1; say('Kaspi-мен төлесең болады! Чек жоқ, бірақ сенім бар! (no receipt, but trust)', 'Seller', '#fd6', 3.5); }
          if (d < 5 || r.root.position.z > 1) turn(() => { say('...сен менің бетіме қарадың. (you looked at my face)', 'Seller', '#f44', 3); M.fBox.visible = false; G.audio.thud(r.root.position, 0.6); });
        } else if (T.state === 'turn') { face(r); pose(r, 'stare', dt, G.time, 0); if (T.t > 1.2) T.state = 'danger'; }
        else { chase(r, 7.2); if (d < 1.1) caught('pale', 12, 'ОРИГИНАЛ ЕМЕС ЕКЕН. (it was fake)'); }
        break;
      }
      case 'x_announcer': {
        const nm = NAMES[M.level] || '...', w = nm.split(' ')[0];
        if (T.state === 'meme') {
          if (T.t > 1.5 && !T.a1) { T.a1 = 1; G.audio.beep(null, 660, 0.3, 0.2, 'triangle'); setTimeout(() => G.audio.beep(null, 523, 0.5, 0.2, 'triangle'), 320); say(`Келесі бекет — ${nm}.`, '📢 PA', '#9cf', 2.5); }
          if (T.t > 4.5 && !T.a2) {
            T.a2 = 1; say(`...${w}... ${w}... ${w}...`, '📢 PA', '#9cf', 2.5); G.audio.speak(`${w}. ${w}. ${w}.`, { pitch: 0.6, rate: 0.8 });
            M.panels.material = M.panelDark; this.after(0.25, () => { if (M.t18 === T) M.panels.material = M.panelOn; });
          }
          if (T.t > 7.5 && !T.a3) { T.a3 = 1; say(`${w.toUpperCase()}. ${w.toUpperCase()}. ${w.toUpperCase()}.`, '📢 PA', '#f88', 2.5); G.audio.speak(w, { pitch: 0.15, rate: 0.5 }); }
          if (T.t > 10) turn(() => { say('...сен келесі бекетке жетпейсің. (you will not reach the next station)', '📢 PA', '#f44', 3.5); M.darkWall.visible = true; G.audio.infrasound(6, 0.7); });
        } else {
          T.state = 'danger';
          const wp = M.darkWall.position;
          wp.z += 3.1 * dt;
          M.darkEyes.forEach((e) => (e.visible = Math.random() > 0.1));
          if (Math.random() < dt * 2) G.audio.reverseWhisper(wp.clone().setY(MY + 1.6), 0.3);
          if (wp.z > P0.z - 0.9) caught('crawler', 10, 'ҚАРАҢҒЫЛЫҚ ЖЕТІП АЛДЫ. (the dark caught you)');
        }
        break;
      }
    }
  };

  // ================================================================ CITY: new memes in empty corners
  P.freeSpot = function (cands) {
    const W = this.G.world;
    for (const [x, z] of cands) if (W.isFree(x, z, 0.8)) return V(x, 0, z);
    return V(cands[0][0], 0, cands[0][1]);
  };

  P.initCity18 = function () {
    const G = this.G, W = G.world;
    const c = this.c18 = { mew: 0, gifts: 0, purple: false, liers: [] };
    // ---- the Mewing Guy (west)
    const s1 = this.freeSpot([[-67.5, 9], [-68, 14], [-70.5, 9]]);
    const mw = this.mewer = this.human({ outfit: 'tshirt', shirt: '#1a1a1a', hair: 'buzz', beard: false }, { pos: s1, heading: Math.PI / 2, ai: 'idle', name: 'Mewing Guy', color: '#ccc' });
    mw.mem.idleAnim = 'mew'; mw.mem.noHorror = true; mw.mem.noCrash = true;
    W.addInteract({ pos: () => mw.pos.clone().setY(1.6), r: 2.6, label: 'Talk to the Mewing Guy', enabled: () => !mw.removed && !mw.rd && c.mew < 4 && !c.mewBusy, act: () => this.talkMewer() });
    // ---- the NPC Streamer (east)
    const s2 = this.freeSpot([[67.5, 9], [68, 14], [70.5, 9]]);
    const st = this.streamer = this.human({ outfit: 'hoodie', shirt: '#ff5fa0', pants: '#2a2a4a', hair: 'bun', hairColor: '#f4d020' }, { pos: s2, heading: -Math.PI / 2, ai: 'idle', name: 'NPC Streamer', color: '#f9c' });
    st.mem.idleAnim = 'stream'; st.mem.noHorror = true; st.mem.noCrash = true;
    st.rig.armR.add(box(0.03, 0.9, 0.03, mat('#222'), 0, -1.05, 0), box(0.1, 0.16, 0.02, basic('#8af'), 0, -1.5, 0.03, false));
    W.addInteract({ pos: () => st.pos.clone().setY(1.6), r: 2.8, label: () => `Send a gift 🎁 (${c.gifts}/5)`, enabled: () => !st.removed && !st.rd && c.gifts < 5 && !c.liveBusy, act: () => this.giftStreamer() });
    // ---- the Purple Shake stand (south-west)
    const s3 = this.freeSpot([[-67.5, 66], [-68, 70], [-70.5, 66]]);
    const stand = new THREE.Group(); stand.position.copy(s3); stand.rotation.y = Math.PI / 2;
    stand.add(box(1.4, 0.95, 0.7, mat('#5a2a8a'), 0, 0.48, 0), box(1.5, 0.06, 0.8, mat('#e0d0f0'), 0, 0.98, 0));
    for (let i = 0; i < 4; i++) stand.add(cyl(0.06, 0.05, 0.18, 8, mat('#a050e0', { emissive: '#301050' }), -0.45 + i * 0.3, 1.1, 0));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.45), basic('#fff', { map: memePoster(['PURPLE SHAKE', 'try it. everyone did.', '#2a0a3a', '#d080ff']) }));
    sign.position.set(0, 1.7, 0); stand.add(sign);
    stand.add(cyl(0.03, 0.03, 1.2, 6, mat('#555'), -0.6, 1.3, 0), cyl(0.03, 0.03, 1.2, 6, mat('#555'), 0.6, 1.3, 0));
    G.scene.add(stand);
    W.addCollider(s3.x - 0.45, s3.x + 0.45, s3.z - 0.75, s3.z + 0.75, -1, 1);
    for (let i = 0; i < 3; i++) {
      const r = makeHumanoid({ ...randomLook(), outfit: pick(['tshirt', 'hoodie']) });
      r.home = V(s3.x + 1.6 + i * 1.1, 0.15, s3.z - 1.5 + i * 1.4);
      r.root.position.copy(r.home); r.root.rotation.set(-Math.PI / 2, rand(0, 6), 0, 'YXZ');
      this.splay(r);
      G.scene.add(r.root); c.liers.push(r);
    }
    W.addInteract({ pos: s3.clone().setY(1.1), r: 2.6, label: 'Drink the PURPLE SHAKE 🟣', enabled: () => !c.purple, act: () => this.drinkPurple() });
    // ---- yellow meme dots on the minimap
    if (this.mapBg) {
      const ctx = this.mapBg.getContext('2d'), m = this.mapM;
      ctx.fillStyle = '#ffd020';
      for (const s of [s1, s2, s3]) { ctx.beginPath(); ctx.arc(m(s.x), m(s.z), 2.2, 0, 7); ctx.fill(); }
    }
  };

  P.splay = function (r) {
    r.armL.rotation.set(rand(-2.8, -1.5), 0, rand(0.4, 1.4)); r.armR.rotation.set(rand(-2.8, 0), 0, rand(-1.4, -0.4));
    r.legL.rotation.x = rand(-0.9, 0.3); r.legR.rotation.x = rand(-0.9, 0.3); r.head.rotation.set(0, rand(-0.8, 0.8), 0);
  };

  P.talkMewer = function () {
    const G = this.G, n = this.mewer, c = this.c18;
    c.mew++; n.facePlayer();
    if (c.mew <= 2) { G.ui.say(c.mew === 1 ? '🤫🧏‍♂️' : '🤫🧏‍♂️ (he points at his jawline, very seriously)', 'Mewing Guy', 2.5, '#ccc'); return; }
    if (c.mew === 3) { G.ui.say("...I can't talk. I'm mewing.", 'Mewing Guy', 3, '#ccc'); return; }
    c.mewBusy = true;
    G.ui.say('...you made me break my mewing streak.', 'Mewing Guy', 2.5, '#f66');
    this.task(function* () {
      let t = 0;
      while (t < 1.6) { t += G.dt; n.rig.head.scale.set(1, 1 + t * 0.55 + Math.random() * 0.1, 1); yield 0; }
      yield* this.lunge('pale', 6);
      n.rig.head.scale.setScalar(1);
      this.achieve('mewing');
      if (this.addAura) this.addAura(-100, 'broke a mewing streak');
      this.after(3, () => G.ui.say('🤫🧏‍♂️ (day 1 again)', 'Mewing Guy', 2.5, '#ccc'));
    });
  };

  P.giftStreamer = function () {
    const G = this.G, n = this.streamer, c = this.c18;
    c.gifts++;
    G.audio.beep(null, 1568, 0.08, 0.15, 'triangle');
    if (G.fx) G.fx.emit(n.pos.clone().setY(2), 16, 'confetti');
    if (c.gifts < 5) {
      n.mem.idleAnim = 'dance'; this.after(1.6, () => { n.mem.idleAnim = 'stream'; });
      G.ui.say(['YES YES YES! Thank you for the gift!', 'Gift so good! Gang gang! Mmm!', 'Hehe. Yes. Hehe. Yes.', 'Mmm, aura so good! Yes yes!'][(c.gifts - 1) % 4], 'NPC Streamer', 2.2, '#f9c');
      return;
    }
    c.liveBusy = true;
    n.mem.idleAnim = 'stare'; n.facePlayer();
    G.ui.say('...thank you. You are LIVE now.', 'NPC Streamer', 3, '#f66');
    G.photoRequest = true;
    this.task(function* () {
      yield 2.2;
      G.ui.phone('🔴 LIVE', '1 viewer is watching you: ???');
      yield 1.6;
      n.rig.head.rotation.y = Math.PI;
      yield 0.4;
      yield* this.lunge('pale', 6);
      n.rig.head.rotation.y = 0; n.mem.idleAnim = 'stream';
      this.achieve('streamer');
      this.after(2.5, () => G.ui.say('...and that was the stream! Like and subscribe!', 'NPC Streamer', 3, '#f9c'));
    });
  };

  P.drinkPurple = function () {
    const G = this.G, Pl = G.player, c = this.c18;
    c.purple = true;
    G.ui.say('*slurp* ...it tastes like grape and regret.', 'You', 2.5, '#c8f');
    const cv = document.getElementById('game');
    cv.style.filter = 'hue-rotate(250deg) saturate(2.2)';
    this.claim(20);
    this.task(function* () {
      let t = 0;
      while (t < 9) {
        t += G.dt;
        Pl.roll = Math.sin(t * 2.2) * 0.22;
        if (t > 3.5) {
          if (!c.saidStand) { c.saidStand = 1; G.ui.say('*everyone who drank it slowly stands up... and looks at you*', '', 3); Pl.scare(0.4); G.audio.infrasound(4, 0.5); }
          for (const r of c.liers) {
            const k = Math.min(1, G.dt * 1.5);
            r.root.rotation.x += (0 - r.root.rotation.x) * k; r.root.position.y += (0 - r.root.position.y) * k;
            r.root.rotation.y = Math.atan2(Pl.pos.x - r.root.position.x, Pl.pos.z - r.root.position.z);
            pose(r, 'stare', G.dt, G.time, 0);
          }
        }
        yield 0;
      }
      Pl.downT = 2.6; G.audio.thud(null, 0.8); G.ui.fade(1, 0.6);
      yield 2.2;
      cv.style.filter = '';
      c.liers.forEach((r) => { r.root.position.copy(r.home); r.root.rotation.set(-Math.PI / 2, rand(0, 6), 0, 'YXZ'); this.splay(r); });
      G.ui.fade(0, 1.2);
      G.ui.say('...you wake up on the ground. It was good though. 10/10.', '', 3.5);
      this.achieve('purple');
      if (this.addAura) this.addAura(67, 'purple shake survivor');
    });
  };

  P.updateCity18 = function () {
    const G = this.G, st = this.streamer, c = this.c18;
    if (st && !st.removed && !c.liveBusy && c.gifts < 5 && st.distToPlayer() < 14 && G.time - (c.stT || -99) > 12 && this.ambientOk()) {
      c.stT = G.time;
      st.say(pick(['Hi chat! Hi chat! We are LIVE at 3 AM!', 'Chat, is that a horse? CHAT. IS THAT A HORSE?', 'Send a gift and I will do the thing!', 'Yes yes yes. Gang gang.']), 2.8);
    }
  };
}
