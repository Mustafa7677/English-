// Chapter 13: AURA, photo mode, journal, and new place-bound brainrot memes.
//  AURA: everything you do gives or takes aura (+1000 AURA / -500 AURA), part of your score.
//  PHOTO MODE (P): photograph the city's weirdness for VIEWS ("HORSE DRIVES HUMAN?! NOT CLICKBAIT").
//  JOURNAL (J): side quests, rumours (where to find things), aura, views and your photos.
//  Memes in fixed places:
//    "67" crew (north side of the supermarket)    — join them for +67 aura
//    Banana Monkey (gas station)                   — throws banana peels, you slip
//    Espresso Ballerina (NVIDIA plaza, east side)  — twirls to a music box, spills her coffee head on you
//    Treefoot (kindergarten playground)            — a tree with feet that moves only when unseen
import * as THREE from 'three';
import { makeHumanoid } from './characters.js';
import { ACH } from './scenes2.js';
import { mat, basic, box, cyl, rand, pick } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

Object.assign(ACH, {
  sixseven: ['6️⃣7️⃣', 'Join the 67 crew'],
  slip: ['Banana Physics', 'Slip on a banana peel'],
  espresso: ['Aura Espresso', 'Get coffee spilled on you by the ballerina'],
  treefoot: ['Brr Brr', 'Catch the walking tree'],
  photo: ['Content Creator', 'Take a photo'],
  viral: ['Gone Viral', 'Get 100K views in total'],
  aura: ['Aura Farmer', 'Reach 5000 aura'],
});

const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n)));

// how interesting things are to the internet (photo mode)
const SUBJECTS = {
  'Horse': [6000, 'HORSE DRIVES A HUMAN'], 'Cart Man': [3000, 'man pulls a horse in a cart'], 'Log Man': [9000, 'THE 3 AM KNOCKER'],
  'NVIDIA Guard-Bot': [12000, 'NVIDIA ROBOT WANTS ITS 4090 BACK'], 'Mei': [4000, 'girl steals an RTX 4090'], 'Dog': [7000, 'DOG WALKS HIS HUMAN'],
  'Kevin': [4000, 'grown man on a leash'], 'CEO Whiskers': [8000, 'CAT CEO FIRES EMPLOYEE'], 'Gym Bro': [3000, 'gym bro skipped leg day'],
  'Skeleton': [5000, 'skeleton still waiting for the bus'], 'Bread Guy': [4500, 'PIGEON FEEDS A MAN'], 'Mannequin': [5000, 'THE MANNEQUINS MOVED'],
  'Buddy': [800, 'my bestie at 3 AM'], 'Banana Monkey': [7000, 'MONKEY BANANA ATTACK'], 'Espresso Ballerina': [7000, 'COFFEE BALLERINA'],
  '67 Crew': [6700, '6... 7...'], 'Dancer': [3500, 'man dancing alone at 3 AM'], 'The Caretaker': [15000, 'REAL GHOST CAUGHT ON CAMERA'],
};

export function extendDirector13(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initChapter13(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateChapter13(dt); };

  // ---- aura from everything
  P.addAura = function (n, why) {
    const G = this.G;
    this.aura = (this.aura || 0) + n;
    const el = document.createElement('div');
    el.className = 'aurapop ' + (n >= 0 ? 'up' : 'down');
    el.textContent = `${n >= 0 ? '+' : ''}${n} AURA ${n >= 0 ? '🗿' : '💀'}${why ? ' · ' + why : ''}`;
    document.getElementById('aurapops').appendChild(el);
    setTimeout(() => el.remove(), 2600);
    if (this.aura >= 5000) this.achieve('aura');
  };
  const origAch = P.achieve;
  P.achieve = function (id) {
    const had = this.ach && this.ach[id];
    origAch.call(this, id);
    if (!had && this.ach && this.ach[id] && id !== 'aura') this.addAura(100);
  };
  const origKick = P.onKick;
  P.onKick = function (n) {
    origKick.call(this, n);
    if (n === this.buddy) this.addAura(-500, 'kicked your only friend');
    else if (n === this.robot && !(n.mem.boss && n.stun > 0.3)) this.addAura(-100, 'kicked metal');
    else if (n.hostile) this.addAura(50);
  };
  const origLunge = P.lunge;
  P.lunge = function* (kind, dmg) { yield* origLunge.call(this, kind, dmg); if (!this.G.player.dead) this.addAura(200, 'did not cry'); };
  const origScore = P.scoreAndRank;
  P.scoreAndRank = function (won) {
    const r = origScore.call(this, won);
    r.score += (this.aura || 0) + Math.floor((this.views || 0) / 50);
    return r;
  };
  const origEnter = P.enterDumpster;
  P.enterDumpster = function (d) { const was = this.G.player.hiding; origEnter.call(this, d); if (!was && this.G.player.hiding) this.addAura(-200, 'hid in the trash'); };

  P.initChapter13 = function () {
    const G = this.G, W = G.world;
    this.aura = 0; this.views = 0; this.photos = [];
    this.c13 = { journal: false };
    // ---------------- 67 crew
    this.sixCrew = [0, 1, 2, 3].map((i) => {
      const n = this.human({ outfit: 'hoodie', hair: pick(['buzz', 'short', 'mohawk']), hat: i % 2 ? 'cap' : 'none' }, { pos: V(-42 + i * 1.3, 0, 8.6 + (i % 2) * 0.6), heading: Math.PI, ai: 'idle', name: '67 Crew', color: '#fd6' });
      n.mem.idleAnim = 'sixseven'; n.mem.noHorror = true; n.mem.noCrash = true;
      return n;
    });
    W.addInteract({ pos: V(-40, 1.5, 8.9), r: 3.5, label: 'Join the 67', enabled: () => !this.c13.joined, act: () => {
      this.c13.joined = true;
      G.ui.big('6️⃣ 7️⃣', 2.5, 'green'); G.audio.vineBoom(0.7);
      if (G.fx) G.fx.emit(V(-40, 1.8, 8.9), 40, 'confetti');
      this.sixCrew.forEach((n, i) => this.after(i * 0.2, () => n.say('AYYYYY!', 1.5)));
      this.addAura(67, 'joined the 67'); this.achieve('sixseven');
    } });
    // ---------------- banana monkey (gas station)
    const mk = this.monkey = this.addNPC(makeHumanoid({ animal: 'monkey', skin: '#6a4020', shirt: '#6a4020', pants: '#6a4020', fat: 1.1 }),
      { pos: V(32, 0, 34), heading: 0, ai: (n, dt) => this.monkeyAI(n, dt), name: 'Banana Monkey', color: '#fe4', voice: { pitch: 1.8, rate: 1.3 } });
    mk.mem.noHorror = true;
    const peelM = mat('#f2d21b');
    for (let i = 0; i < 4; i++) { const p = box(0.12, 0.55, 0.05, peelM, 0, -0.15, 0); const g = new THREE.Group(); g.rotation.y = i * Math.PI / 2; p.position.z = 0.22; p.rotation.x = -0.35; g.add(p); mk.rig.hips.add(g); }
    mk.rig.head.add(box(0.1, 0.18, 0.1, mat('#5a4a10'), 0, 0.45, 0, false));
    this.peels = [];
    // ---------------- espresso ballerina (NVIDIA plaza)
    const bl = this.ballerina = this.addNPC(makeHumanoid({ headless: true, skin: '#f0d0c0', shirt: '#f4a0c0', pants: '#f4c0d0', fat: 0.85 }),
      { pos: V(44, 0, -10), ai: (n, dt) => this.ballerinaAI(n, dt), name: 'Espresso Ballerina', color: '#f9c', voice: { pitch: 1.5, rate: 1 } });
    bl.mem.noHorror = true;
    const cup = new THREE.Group(); cup.position.y = 0.05;
    cup.add(cyl(0.2, 0.15, 0.32, 10, mat('#f4f4f0'), 0, 0.16, 0), cyl(0.185, 0.185, 0.02, 10, mat('#4a2a12'), 0, 0.31, 0), box(0.05, 0.14, 0.12, mat('#f4f4f0'), 0.23, 0.17, 0));
    for (const s of [-1, 1]) cup.add(box(0.05, 0.05, 0.02, mat('#111'), s * 0.07, 0.2, 0.19, false));
    bl.rig.head.add(cup);
    const tutu = cyl(0.42, 0.42, 0.08, 12, mat('#ffb6d8'), 0, 0.02, 0); bl.rig.hips.add(tutu);
    // ---------------- treefoot (kindergarten playground)
    const tg = this.tree = { g: new THREE.Group(), home: V(-51, 0, -15), unseen: 0, t: 0 };
    tg.g.add(cyl(0.3, 0.38, 3, 7, mat('#5a3a1a'), 0, 1.9, 0));
    for (const [x, y, z, s] of [[0, 3.8, 0, 1.6], [0.6, 3.3, 0.3, 1.1], [-0.6, 3.4, -0.2, 1.1]]) tg.g.add(box(s, s * 0.9, s, mat('#2a5a22'), x, y, z));
    for (const s of [-1, 1]) { tg.g.add(box(0.28, 0.25, 0.5, mat('#5a3a1a'), s * 0.22, 0.25, 0.1)); tg.g.add(box(0.32, 0.12, 0.6, mat('#2a1a0a'), s * 0.22, 0.06, 0.18)); }
    for (const s of [-1, 1]) tg.g.add(box(0.1, 0.08, 0.02, basic('#ffe0a0'), s * 0.1, 2.4, 0.33, false));
    tg.g.position.copy(tg.home); G.scene.add(tg.g);
  };

  // ================================================================ BANANA MONKEY
  P.monkeyAI = function (n, dt) {
    const G = this.G, Pl = G.player, m = n.mem;
    const d = n.distToPlayer();
    n.anim = 'idle';
    if (d < 16) n.turnTo(Math.atan2(Pl.pos.x - n.pos.x, Pl.pos.z - n.pos.z), dt, 5);
    m.throwT = (m.throwT ?? 2) - dt;
    if (d < 14 && d > 2 && m.throwT <= 0 && !Pl.inVehicle) {
      m.throwT = rand(2.8, 4);
      n.anim = 'windup';
      if (Math.random() < 0.4 && this.ambientOk()) n.say(pick(['OOK OOK! BANANA TIME!', 'Slip, human. SLIP!', 'Potassium attack!', 'OOK.']), 1.8);
      const lead = Pl.vel.clone().multiplyScalar(0.9);
      const tgt = Pl.pos.clone().add(lead).add(V(rand(-0.6, 0.6), 0, rand(-0.6, 0.6)));
      const from = n.pos.clone().setY(1.6), T = 0.8;
      const vel = V((tgt.x - from.x) / T, (0 - from.y + 0.5 * 18 * T * T) / T, (tgt.z - from.z) / T);
      const D2 = this;
      const p = G.props.spawn(box(0.32, 0.04, 0.16, mat('#f2d21b')), from, vel, { kind: 'peel', r: 0.05, thrown: false, bounce: 0.05 });
      p.ang.set(0, 6, 0);
      p.onRest = (pp) => { D2.peels.push(pp); D2.after(40, () => { G.props.remove(pp); const i = D2.peels.indexOf(pp); if (i >= 0) D2.peels.splice(i, 1); }); };
    }
  };
  P.updatePeels = function () {
    const G = this.G, Pl = G.player;
    if (Pl.downT > 0 || !Pl.grounded || Pl.inVehicle) return;
    const sp = Math.hypot(Pl.vel.x, Pl.vel.z);
    for (const p of this.peels) {
      if (sp < 1.5 || Math.hypot(p.pos.x - Pl.pos.x, p.pos.z - Pl.pos.z) > 0.55 || Math.abs(p.pos.y - Pl.pos.y) > 0.5) continue;
      Pl.downT = 1.5; Pl.shake = 0.6; Pl.pitch = Math.min(1.2, Pl.pitch + 0.9);
      G.audio.whoosh(0.5); this.after(0.35, () => G.audio.thud(null, 0.8));
      G.ui.say('*you slipped on a banana peel*', '', 2);
      this.monkey.say('OOK OOK OOK! (laughing in monkey)', 2.5);
      G.audio.laugh(this.monkey.pos.clone().setY(1.6), 0.5, 1.6);
      this.addAura(-300, 'slipped on a banana');
      this.achieve('slip');
      G.props.remove(p); this.peels.splice(this.peels.indexOf(p), 1);
      break;
    }
  };

  // ================================================================ ESPRESSO BALLERINA
  P.ballerinaAI = function (n, dt) {
    const G = this.G, m = n.mem, d = n.distToPlayer();
    if (!m.music && d < 30) m.music = G.audio.loop('musicbox', n.pos.clone().setY(1.6));
    if (m.music && d > 40) { m.music.stop(); m.music = null; }
    if (m.music) m.music.setPos(n.pos.clone().setY(1.6));
    m.cool = (m.cool || 0) - dt;
    if (d < 3.2 && m.cool <= 0) {
      m.cool = 25;
      n.facePlayer(); n.anim = 'stare';
      n.say(pick(['Oh! Pardon! ...that will be four euros.', 'Oops. Extra shot. On YOU.', 'Your aura needed a refill.']), 3);
      if (G.fx) G.fx.emit(G.camera.position.clone().add(V(0, 0.2, 0)), 30, 'crumb');
      G.ui.say('*she spills her whole coffee head on you*', '', 2.5);
      G.ui.hurt(5);
      this.addAura(-100, "espresso'd");
      this.achieve('espresso');
      return;
    }
    if (m.cool > 21) { n.anim = 'stare'; return; }
    n.heading += dt * 5.5; n.root.rotation.y = n.heading;
    n.anim = 'flex';
  };

  // ================================================================ TREEFOOT
  P.updateTree = function (dt) {
    const G = this.G, Pl = G.player, T = this.tree, g = T.g;
    T.t += dt;
    const d = Math.hypot(Pl.pos.x - g.position.x, Pl.pos.z - g.position.z);
    const seen = this.lookingAt(g.position.clone().setY(2), 0.45);
    if (d > 45) { g.position.lerp(T.home, Math.min(1, dt)); return; }
    if (seen) {
      T.unseen = 0;
      g.rotation.z = Math.sin(T.t * 40) * (d < 10 ? 0.03 : 0);
      if (d < 7 && G.time - (T.said || -99) > 12) { T.said = G.time; G.ui.say('brr... brr...', 'Treefoot', 2, '#9c6'); G.audio.beep(g.position, 70, 0.4, 0.2, 'sawtooth'); }
      if (d < 2.4 && !T.caught) { T.caught = true; G.ui.say('...you saw nothing. I am a normal tree.', 'Treefoot', 3, '#9c6'); this.achieve('treefoot'); this.addAura(300, 'found the walking tree'); }
    } else if (d < 26 && d > 3) {
      T.unseen += dt;
      if (T.unseen > 0.8) {
        T.unseen = 0;
        const step = Math.min(2, d - 2.5);
        g.position.x += (Pl.pos.x - g.position.x) / d * step; g.position.z += (Pl.pos.z - g.position.z) / d * step;
        g.rotation.y = Math.atan2(Pl.pos.x - g.position.x, Pl.pos.z - g.position.z);
        G.audio.thud(g.position, 0.6);
      }
    }
  };

  // ================================================================ PHOTO MODE
  P.takePhoto = function (url) {
    const G = this.G, Pl = G.player;
    let best = null, total = 0;
    for (const n of G.npcs) {
      if (n.removed || n.hidden) continue;
      const p = n.pos.clone().setY(n.pos.y + 1.2), d = p.distanceTo(G.camera.position);
      if (d > 35 || !this.lookingAt(p, 0.88) || !G.world.lineClear(G.camera.position.x, G.camera.position.z, p.x, p.z)) continue;
      const s = SUBJECTS[n.name] || [150, 'random guy at 3 AM'];
      let v = s[0] * rand(0.6, 1.8) * (n.rd ? 3 : 1) * (d < 8 ? 1.5 : 1);
      total += v;
      if (!best || v > best.v) best = { v, title: n.rd ? s[1] + ' (FAIL COMPILATION)' : s[1] };
    }
    if (this.shark && this.lookingAt(this.shark.m.group.position.clone().setY(1), 0.85)) { total += 9000; best = { v: 9e9, title: 'SHARK IN SNEAKERS DANCING' }; }
    if (this.giant && this.giant.visible && this.lookingAt(this.giant.position, 0.85)) { total += 40000; best = { v: 9e9, title: 'GIANT HORSE HEAD IN THE SKY (REAL)' }; }
    if (this.croco && this.lookingAt(this.croco.m.group.position, 0.85)) { total += 20000; best = { v: 9e9, title: 'CROCODILE PLANE OVER MY CITY' }; }
    if (this.zone && this.zone.active && this.zone.mgr && this.lookingAt(this.zone.mgrMesh.position, 0.85)) { total += 30000; best = { v: 9e9, title: 'I FOUND THE MANAGER IN THE NOCLIP ZONE' }; }
    const views = Math.round(total || rand(1, 9));
    const title = best ? pick(['{X}?!?! (NOT CLICKBAIT)', '{X} AT 3 AM (GONE WRONG)', 'POV: {X}', '{X} 😱😱😱', 'I can not believe I saw {X}']).replace('{X}', best.title) : 'photo of absolutely nothing';
    this.views += views;
    this.photos.unshift({ url, title, views }); this.photos.length = Math.min(this.photos.length, 8);
    const pol = document.getElementById('polaroid');
    pol.innerHTML = `<img src="${url}" alt=""><div class="cap">${title.replace(/[<>&]/g, '')}</div><div class="views">👁 ${fmt(views)} views</div>`;
    pol.classList.remove('hidden'); pol.classList.add('in');
    clearTimeout(this._polT); this._polT = setTimeout(() => pol.classList.add('hidden'), 4200);
    this.achieve('photo');
    if (this.views >= 100000) this.achieve('viral');
    if (views > 5000) this.addAura(Math.min(800, Math.round(views / 100)), 'went viral');
  };

  // ================================================================ JOURNAL
  P.renderJournal = function () {
    const G = this.G, Pl = G.player, el = document.getElementById('journal');
    const q = (done, text) => `<li class="${done ? 'done' : ''}">${done ? '✔' : '○'} ${text}</li>`;
    const ach = Object.keys(this.ach || {}).length, all = Object.keys(ACH).length;
    el.innerHTML = `
      <h2>JOURNAL</h2>
      <div class="jstats">AURA <b>${this.aura}</b> · VIEWS <b>${fmt(this.views)}</b> · 💾 ${this.disks}/10 · 🏆 ${ach}/${all}</div>
      <div class="jcols">
        <div><h3>MAIN</h3><ul>
          ${q(Pl.hasRTX, 'Get the RTX 4090 (NVIDIA)')}
          ${q(this.gensOn >= 3, `Start the generators (${this.gensOn}/3)`)}
          ${q(this.ended, 'Escape through the north gate')}
        </ul><h3>SIDE QUESTS</h3><ul>
          ${q(this.boss && this.boss.dead, 'Defeat the giant robot')}
          ${q(this.goldenTaken, 'Take the GOLDEN 4090')}
          ${q(this.night && this.night.done, 'Survive the night shift (SECURITY booth)')}
          ${q(this.zone && this.zone.done, 'Escape the Noclip Zone')}
          ${q(this.c6 && this.c6.sockDone, 'Reunite the lonely sock (laundromat)')}
          ${q(this.c7 && this.c7.cart, 'Return the shopping cart')}
          ${q(this.c13.joined, 'Join the 67 crew')}
          ${q(this.tree && this.tree.caught, 'Catch the walking tree')}
          ${q(this.disks >= 10, 'Find all 10 cursed floppy disks')}
          ${q(this.views >= 100000, 'Get 100K views')}
        </ul></div>
        <div><h3>RUMOURS</h3><ul class="rumours">
          <li>A wall glitches in the alley south of the supermarket. People walk in. They come back... different.</li>
          <li>The SECURITY booth next to NVIDIA is hiring for the night shift. Nobody lasts until 6 AM.</li>
          <li>A monkey at the gas station is throwing banana peels at people.</li>
          <li>A ballerina with a coffee cup for a head dances on the NVIDIA plaza.</li>
          <li>The tree at the kindergarten playground was not there yesterday.</li>
          <li>Something writes on the chalkboard in the kindergarten.</li>
          <li>Never open the STAFF ONLY door in the supermarket.</li>
          <li>The poster at the bus stop is watching you.</li>
        </ul>
        <h3>PHOTOS</h3><div class="jphotos">${this.photos.map((p) => `<figure><img src="${p.url}" alt=""><figcaption>${fmt(p.views)} 👁</figcaption></figure>`).join('') || '<i>Press P to take photos of weird things.</i>'}</div>
        </div>
      </div>
      <p class="jhint">[J] close</p>`;
  };

  P.updateChapter13 = function (dt) {
    const G = this.G, I = G.input;
    this.updatePeels();
    this.updateTree(dt);
    if (I.hit('KeyP') && G.state === 'play') { G.photoRequest = true; G.ui.whiteFlash(); G.audio.shutter(); }
    if (I.hit('KeyJ')) {
      this.c13.journal = !this.c13.journal;
      const el = document.getElementById('journal');
      el.classList.toggle('hidden', !this.c13.journal);
      if (this.c13.journal) this.renderJournal();
    }
    const a = document.getElementById('aura');
    if (a) a.textContent = `AURA ${this.aura} 🗿 · 👁 ${fmt(this.views)}`;
  };
}
