// Chapter 5: "make it a real game" — kick reactions, objective compass, 10 cursed floppy disks
// with lore, tutorial hints, score & rank.
import * as THREE from 'three';
import { ACH } from './scenes2.js';
import { mat, basic, box, textTex, rand, pick, angleWrap } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

Object.assign(ACH, {
  kick1: ['This Is 4090!', 'Kick someone'],
  kick25: ['Professional Kicker', 'Kick 25 things'],
  kickBuddy: ['Friendship Ended', 'Kick Buddy'],
  kickRobot: ['Metal Toes', 'Kick the robot (bad idea)'],
  disk1: ['Archivist', 'Find a cursed floppy disk'],
  disk10: ['The Whole Lore', 'Find all 10 cursed floppy disks'],
});

const DISKS = [
  [-6.5, -48, 'DISK 1: The horse was not always a horse. He used to be a cart. Long story.'],
  [-38.5, -45, 'DISK 2: The Caretaker was hired in 1987. Nobody remembers hiring him. He has never taken a day off.'],
  [-89, -36, 'DISK 3: The basement generator powers exactly one thing: the gate. And a mini fridge. Mostly the fridge.'],
  [-40, 38, 'DISK 4: The milk has never been in aisle four. It never will be.'],
  [40, 37.5, 'DISK 5: The toilet lost its WiFi password in 2009. It has been angry ever since.'],
  [56.5, -45, 'DISK 6: NVIDIA built the robot to guard one card. They forgot to build a second robot to guard the first robot.'],
  [-89, 78, 'DISK 7: Buddy has been "your friend" for 41 players before you. All of them tripped over him.'],
  [89, -96, 'DISK 8: The city is not on any map. The map is on the city. Somewhere. Probably.'],
  [89, 100, 'DISK 9: The giant horse head is just the horse, but seen from very far away and very close at the same time.'],
  [-3, -106, 'DISK 10: There is no RTX 5090. There is only the next city. Thank you for reading the lore.'],
];

const RANKS = [
  [0, 'Lost Tourist'],
  [3000, 'Night Walker'],
  [7000, 'Ragdoll Enjoyer'],
  [12000, 'Certified 4090 Survivor'],
  [18000, 'Brainrot Legend'],
  [26000, 'GOD OF 3:33 AM'],
];

export function extendDirector5(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initChapter5(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); this.updateChapter5(dt); };
  const origHit = P.onPropHit;
  P.onPropHit = function (p, n) {
    origHit.call(this, p, n);
    const fx = this.G.fx; if (!fx) return;
    fx.emit(p.pos, n === this.robot ? 18 : 8, n === this.robot ? 'spark' : 'dust');
  };

  P.initChapter5 = function () {
    const G = this.G, W = G.world;
    this.kicks = 0; this.disks = 0;
    this.diskItems = [];
    const labelTex = textTex('4090', { w: 64, h: 32, bg: '#111', fg: '#76ff03', font: 'bold 20px monospace' });
    for (const [x, z, text] of DISKS) {
      const y = x < -80 && z < -30 && z > -40 ? -19.6 : 0.6; // disk 3 lives in the hidden basement
      if (y > 0 && !W.isFree(x, z, 0.3)) continue;
      const g = new THREE.Group(); g.position.set(x, y, z);
      g.add(box(0.36, 0.36, 0.04, mat('#1a1a2a'), 0, 0, 0, false));
      g.add(box(0.2, 0.12, 0.045, mat('#999'), 0, 0.11, 0, false));
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), basic('#fff', { map: labelTex })); lab.position.set(0, -0.06, 0.024); g.add(lab);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), basic('#76ff03', { transparent: true, opacity: 0.15, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = -y + (y < 0 ? -20 : 0) + 0.06 - (y < 0 ? 0 : 0); g.add(glow);
      G.scene.add(g);
      const item = { g, text, taken: false };
      item.it = W.addInteract({ pos: g.position.clone(), r: 2.2, label: 'Pick up the cursed floppy disk', act: () => this.takeDisk(item) });
      this.diskItems.push(item);
    }
    this.hints = [
      [8, 'LEFT CLICK: kick anything. Yes, anything.'],
      [14, 'F: flashlight   E: interact   R / RIGHT CLICK: throw a brick'],
      [24, 'Follow the green ◆ on the compass at the top.'],
      [40, 'Cursed floppy disks 💾 are hidden around the city. Collect all 10.'],
    ];
    this.compassEls = null;
  };

  P.takeDisk = function (item) {
    const G = this.G;
    if (item.taken) return;
    item.taken = true; this.disks++;
    G.scene.remove(item.g); G.world.removeInteract(item.it);
    G.audio.beep(null, 523, 0.1, 0.2, 'triangle'); setTimeout(() => G.audio.beep(null, 784, 0.25, 0.2, 'triangle'), 110);
    if (G.fx) G.fx.emit(item.g.position, 20, 'green');
    G.ui.say(item.text, `💾 ${this.disks}/10`, 6, '#76ff03');
    this.achieve('disk1');
    if (this.disks >= 10) {
      this.achieve('disk10');
      G.ui.big('ALL DISKS FOUND — BUDDY HAS ACHIEVED BALANCE', 4, 'green');
      const b = this.buddy;
      if (b && !b.removed) {
        b.mem.golden = true; b.mem.tripCd = 1e9;
        if (b.rig.hat) b.rig.hat.traverse((m) => { if (m.isMesh) m.material = mat('#e0c020', { emissive: '#604000' }); });
        this.after(2, () => b.say('I... I CAN WALK WITHOUT FALLING. IS THIS WHAT YOU PEOPLE FEEL LIKE?', 4, true));
      }
    }
  };

  /** Called by the player's kick. */
  P.onKick = function (n) {
    const G = this.G;
    this.kicks++;
    this.achieve('kick1');
    if (this.kicks >= 25) this.achieve('kick25');
    if (n === this.robot) {
      this.achieve('kickRobot');
      G.ui.say('OW. OW. METAL. WHY DID I DO THAT.', 'You', 2.5, '#76ff03');
      n.say('DAMAGE: ZERO. EMBARRASSMENT: SEVERE.', 2.5, true);
      return;
    }
    if (n === this.buddy) {
      this.achieve('kickBuddy');
      this.after(2.2, () => n.say(pick(['WHY?! I THOUGHT WE WERE FRIENDS!', 'I forgive you. I always forgive you.', 'Was that... a high five? With your foot?']), 3));
      return;
    }
    if (!n.hostile && Math.random() < 0.5 && n.distToPlayer() < 20) {
      this.after(2.4, () => { if (!n.removed) n.say(pick(['WHAT DID I DO?!', 'I was just standing here!', 'Rude.', 'This city, man. This city.', 'I am calling the horse.']), 2.5); });
    }
  };

  // ---------------------------------------------------------------- objective & compass
  P.objectiveTarget = function () {
    const G = this.G, Pl = G.player, W = G.world;
    if (this.ended) return null;
    if (!Pl.hasRTX) {
      if (this.rtxProp) return { pos: this.rtxProp.pos, label: 'RTX 4090' };
      if (this.flags.nvidia && this.woman && this.woman.holding && !this.woman.hidden) return { pos: this.woman.pos, label: 'Mei (has the 4090)' };
      return { pos: W.spots.nvidiaPlaza, label: 'NVIDIA' };
    }
    if (this.gensOn < 3) {
      let best = null, bd = 1e9;
      for (const g of W.generators) {
        if (g.on) continue;
        const target = g.pos.y < -10 && !Pl.inBasement() ? W.spots.hatch : g.pos;
        const d = target.distanceTo(Pl.pos);
        if (d < bd) { bd = d; best = { pos: target, label: g.pos.y < -10 && !Pl.inBasement() ? 'Hatch (basement)' : 'Generator' }; }
      }
      return best;
    }
    return { pos: W.spots.gate, label: 'GATE' };
  };

  P.updateCompass = function () {
    const G = this.G, Pl = G.player;
    const strip = document.getElementById('compass');
    if (!strip) return;
    if (!this.compassEls) {
      this.compassEls = {};
      for (const k of ['N', 'E', 'S', 'W', 'obj', 'buddy']) {
        const s = document.createElement('span'); s.className = 'cmp-' + (k.length === 1 ? 'dir' : k);
        s.textContent = k.length === 1 ? k : k === 'obj' ? '◆' : '☺';
        strip.appendChild(s); this.compassEls[k] = s;
      }
      this.compassDist = document.createElement('div'); this.compassDist.className = 'cmp-dist'; strip.appendChild(this.compassDist);
    }
    const range = 1.75; // radians shown on each side
    const place = (el, yawOfTarget) => {
      const diff = angleWrap(yawOfTarget - Pl.yaw);
      if (Math.abs(diff) > range) { el.style.display = 'none'; return; }
      el.style.display = 'block';
      el.style.left = `${50 - (diff / range) * 50}%`;
    };
    const yawTo = (v) => Math.atan2(-(v.x - Pl.pos.x), -(v.z - Pl.pos.z));
    place(this.compassEls.N, 0); place(this.compassEls.W, Math.PI / 2); place(this.compassEls.S, Math.PI); place(this.compassEls.E, -Math.PI / 2);
    const obj = this.objectiveTarget();
    if (obj) {
      place(this.compassEls.obj, yawTo(obj.pos));
      this.compassDist.textContent = `${obj.label} · ${Math.round(Math.hypot(obj.pos.x - Pl.pos.x, obj.pos.z - Pl.pos.z))} m`;
    } else { this.compassEls.obj.style.display = 'none'; this.compassDist.textContent = ''; }
    const b = this.buddy;
    if (b && !b.removed && !b.hidden) place(this.compassEls.buddy, yawTo(b.pos)); else this.compassEls.buddy.style.display = 'none';
  };

  // ---------------------------------------------------------------- score & rank
  P.scoreAndRank = function (won) {
    const G = this.G;
    const ach = Object.keys(this.ach || {}).length;
    let score = this.eventsSeen * 120 + ach * 300 + this.kicks * 15 + this.disks * 400 + (this.stats ? this.stats.falls * 10 : 0);
    if (won) score += Math.max(1000, 8000 - Math.floor(G.time / 60) * 150);
    score = Math.round(score);
    let rank = RANKS[0][1];
    for (const [s, r] of RANKS) if (score >= s) rank = r;
    return { score, rank, ach, disks: this.disks };
  };

  P.updateChapter5 = function () {
    const G = this.G;
    if (!this.ended) {
      while (this.hints.length && G.time > this.hints[0][0]) G.ui.toast(this.hints.shift()[1]);
      this.updateCompass();
      for (const d of this.diskItems) if (!d.taken) d.g.rotation.y += G.dt * 2;
    }
    const inv = document.getElementById('disks');
    if (inv) inv.textContent = `💾 ${this.disks}/10`;
  };
}
