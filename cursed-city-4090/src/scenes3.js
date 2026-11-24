// Chapter 3: the night-shift supermarket, hiding in dumpsters, 4090 FM radio,
// BRAINROT ENERGY drinks and a funny cause-of-death on the game-over screen.
import * as THREE from 'three';
import { A } from './npc.js';
import { makeHumanoid } from './characters.js';
import { makeShopCart } from './scenes2.js';
import { mat, basic, box, cyl, rand, pick } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const RADIO = {
  calm: [
    'Good morning, 4090 City. It is 3 AM. It is always 3 AM.',
    'Weather today: foggy, with a 90 percent chance of horses.',
    'Traffic update: a man is pulling a cart. A horse is riding it. Expect delays.',
    'Reminder: the street lamps are not alive. Please stop asking.',
    'Our sponsor: BRAINROT ENERGY. Now with 400 percent more taurine and 0 percent sleep.',
    'Lost and found: one RTX 4090. If found, do NOT return it. Run.',
  ],
  horror: [
    'This just in: everyone is running at you. Traffic is heavy.',
    'Listeners, please stop screaming into the radio. We can hear you. All of you.',
    'The giant horse in the sky would like to remind you: it is still looking for its cart.',
  ],
  finale: [
    'Gravity is down 78 percent today. Hold on to something. Preferably not a lamp.',
    'Breaking news: the robot is now the size of a building. It is very upset about it.',
    'If you can hear this: the gate is to the NORTH. Please hurry. We want to go to sleep.',
  ],
};

const DEATHS = {
  horse: ['Trampled by a horse in a top hat.', 'He just wanted his cart back.'],
  robot: ['Deleted by an NVIDIA Guard-Bot.', 'Your framerate has dropped to 0.'],
  toilet: ['Defeated by a toilet.', 'It was about the WiFi all along.'],
  ghost: ['Visited by The Caretaker.', 'You were not supposed to be there after hours.'],
  mannequin: ['Hugged by a mannequin.', 'Buddy woke it up. Buddy is very sorry.'],
  citizen: ['Mobbed by fellow citizens.', 'They knew you had the 4090.'],
  bus: ['Hit by the ghost bus.', 'Next stop: the afterlife. Please validate your ticket.'],
  wheel: ['Run over by a wheel.', 'Just the wheel. The bus was elsewhere.'],
  lamp: ['Crushed by a lamp.', 'It only wanted to be your light.'],
  fear: ['Scared to death. Literally.', 'Have you tried turning on the flashlight?'],
};

export function extendDirector3(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initChapter3(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateChapter3(dt); };
  const origScare = P.jumpscare;
  P.jumpscare = function (kind, dmg) {
    if (this.G.player.hiding) return; // nobody can scare you inside a dumpster
    if (dmg) this.G.player.lastKiller = kind;
    origScare.call(this, kind, dmg);
  };

  P.initChapter3 = function () {
    const G = this.G, W = G.world;
    this.radioT = rand(70, 110);
    this.market = { visited: false, lightsOn: true };
    // market lights
    this.marketLights = [G.lighting.addSpecial(0xdfffe0, 8, 18, V(-27, 4.6, 30)), G.lighting.addSpecial(0xdfffe0, 8, 18, V(-39, 4.6, 30))];
    // shoppers (mannequins) and the cashier
    this.shoppers = [[-38, 25], [-30, 35], [-41, 35.1], [-29, 25]].map(([x, z]) => {
      const n = this.addNPC(makeHumanoid({ mannequin: true }), { pos: V(x, 0, z), heading: rand(0, 6), ai: 'idle', name: 'Shopper', color: '#cdb899', voice: { pitch: 0.4, rate: 0.8 } });
      n.mem.noHorror = true; n.mem.idleAnim = 'stare'; n.mem.home = V(x, 0, z);
      return n;
    });
    this.cashier = this.addNPC(makeHumanoid({ mannequin: true, hat: 'cap', capColor: '#a01010' }), { pos: W.spots.cashier.clone(), heading: Math.PI, ai: 'idle', name: 'Cashier', color: '#f88', voice: { pitch: 0.7, rate: 0.85 } });
    this.cashier.mem.noHorror = true; this.cashier.mem.idleAnim = 'stare';
    this.cashierTalk = 0;
    W.addInteract({ pos: W.spots.cashier.clone().setY(1.5).add(V(0, 0, -1.2)), r: 3, label: 'Talk to the cashier', act: () => this.talkCashier() });
    // a shopping cart that wants to be your friend
    const cart = makeShopCart(); cart.position.set(-43, 0, 30); G.scene.add(cart);
    this.petCart = { g: cart, state: 'wait', unseen: 0 };
    // BRAINROT ENERGY cans
    for (const [x, y, z] of [[-23.7, 1.05, 34.8], [-38, 0.1, 30.2], [12, 0.1, 20], [-50, 0.1, 50], [40, 0.1, -60], [-70, 0.1, 0.5]]) this.addEnergyCan(V(x, y, z));
    // hide in any dumpster
    for (const d of W.dumpsters) {
      W.addInteract({
        pos: d.pos.clone().setY(1.2), r: 2.4, label: 'Hide in the dumpster',
        enabled: () => !G.player.hiding && !G.player.inVehicle && G.state === 'play', act: () => this.enterDumpster(d),
      });
      W.addInteract({
        pos: () => G.camera.position.clone().add(V(0, -0.2, 0)), r: 1, label: 'Climb out of the dumpster',
        enabled: () => G.player.hiding === d, act: () => this.exitDumpster(d),
      });
    }
  };

  // ---------------------------------------------------------------- energy drinks
  P.addEnergyCan = function (pos) {
    const G = this.G, W = G.world;
    const g = new THREE.Group();
    g.add(cyl(0.065, 0.065, 0.2, 8, mat('#1a1a1a'), 0, 0.1, 0));
    g.add(cyl(0.066, 0.066, 0.08, 8, basic('#76ff03'), 0, 0.11, 0));
    g.position.copy(pos); G.scene.add(g);
    const it = W.addInteract({
      pos: pos.clone().setY(pos.y + 0.3), r: 2.2, label: 'Drink BRAINROT ENERGY',
      act: () => { G.scene.remove(g); W.removeInteract(it); G.player.drinkEnergy(); },
    });
  };

  // ---------------------------------------------------------------- dumpsters
  P.enterDumpster = function (d) {
    const G = this.G, Pl = G.player;
    if (!d.tried && Math.random() < 0.3) {
      d.tried = true;
      G.audio.thud(d.pos.clone().setY(1), 0.9); G.audio.clank(d.pos.clone().setY(1.2), 0.5);
      G.ui.say(pick(['OCCUPIED!', 'GET YOUR OWN DUMPSTER!', 'I was here first. Since 2019.']), '(from the dumpster)', 2.5, '#aaa');
      d.lid.rotation.x = -0.5; this.after(0.6, () => { d.lid.rotation.x = 0; });
      return;
    }
    d.tried = true;
    Pl.hiding = d; Pl.hideT = 0; Pl.flashOn = false;
    Pl.vel.set(0, 0, 0);
    d.lid.rotation.x = -0.18; d.lid.position.y = 1.3;
    G.audio.clank(d.pos, 0.4);
    G.ui.toast('Hidden. Monsters lose track of you. [E] climb out');
  };
  P.exitDumpster = function (d) {
    const G = this.G, Pl = G.player, W = G.world;
    Pl.hiding = null;
    d.lid.rotation.x = 0; d.lid.position.y = 1.24;
    for (const [dx, dz] of [[0, 1.6], [0, -1.6], [1.9, 0], [-1.9, 0]]) {
      if (W.isFree(d.pos.x + dx, d.pos.z + dz, 0.5)) { Pl.pos.set(d.pos.x + dx, 0, d.pos.z + dz); break; }
    }
    G.audio.clank(d.pos, 0.4);
    if (Pl.hideT > 20) G.ui.say('*you smell like 3 AM*', '', 2);
  };
  P.updateHiding = function (dt) {
    const G = this.G, Pl = G.player, d = Pl.hiding;
    if (!d) return;
    Pl.hideT += dt;
    if (Pl.hideT > 8 && !d.bag) {
      d.bag = true;
      G.audio.thud(d.pos.clone().setY(1.4), 0.7);
      G.ui.say('*someone throws a trash bag on your head*', '', 2.5);
      this.after(2.6, () => G.ui.say('...oh. Sorry. Did not see you there. Carry on.', 'Passer-by', 3));
    }
    if (this.horror && Pl.hideT > 15 && !d.knock) {
      d.knock = true;
      this.repeat(3, 0.5, () => G.audio.clank(d.pos.clone().setY(1), 0.7));
      G.ui.say('*knock knock knock*', '', 1.5);
      Pl.scare(0.3);
      this.after(2.2, () => G.ui.say('...is the 4090 in there?', '???', 2.5, '#f66'));
      this.after(5.5, () => G.ui.say("...nah, it's just trash.", '???', 2.5, '#f66'));
    }
  };

  // ---------------------------------------------------------------- cashier
  P.talkCashier = function () {
    const G = this.G, c = this.cashier;
    const lines = [
      ['*beep* *beep* ...Did you find everything you were looking for?', 'Do you have a loyalty card? ...That is okay. We have yours.'],
      ['Your total is: one soul and 99 cents.', '...We accept cash, card, or screaming.'],
      ['Here. Free sample. Do not read the ingredients.'],
      ['*beep*'],
    ];
    const set = lines[Math.min(this.cashierTalk, lines.length - 1)];
    this.cashierTalk++;
    c.facePlayer();
    set.forEach((l, i) => this.after(i * 3, () => c.say(l, 3)));
    if (this.cashierTalk === 3) this.after(1, () => G.player.drinkEnergy());
    G.audio.beep(c.pos.clone().setY(1.3), 1800, 0.08, 0.15, 'square');
  };

  P.inMarket = function (p) { const m = this.G.world.market; return p.y > -1 && p.x > m.X0 && p.x < m.X1 && p.z > m.Z0 && p.z < m.Z1; };
  P.setMarketLights = function (on) {
    const W = this.G.world;
    this.market.lightsOn = on;
    W.marketPanels.forEach((b) => (b.material = on ? W.marketPanelOn : W.marketPanelOff));
    this.marketLights.forEach((l) => (l.intensity = on ? l.userData.base : 0));
  };
  P.pa = function (text, dur = 4) {
    const G = this.G;
    G.audio.beep(null, 660, 0.35, 0.18, 'triangle');
    setTimeout(() => G.audio.beep(null, 523, 0.5, 0.18, 'triangle'), 380);
    this.after(0.9, () => { G.ui.say(text, '📢 PA', dur, '#cfc'); G.audio.speak(text, { pitch: 0.8, rate: 0.95 }); });
  };

  // ---------------------------------------------------------------- the supermarket night shift
  P.marketTask = function* () {
    const G = this.G, Pl = G.player, W = G.world;
    this.market.visited = true; this.eventsSeen++;
    yield 1.5;
    this.pa('Attention shoppers. The store is now closed. Please remain calm. And inside. Forever.', 5);
    yield 1.2;
    W.marketDoor.target = 0; G.audio.thud(W.marketDoor.center, 1);
    Pl.scare(0.3);
    let t = 0;
    yield () => { t += G.dt; return (Pl.pos.x < -34 && this.inMarket(Pl.pos)) || t > 45 || !this.inMarket(Pl.pos); };
    if (!this.inMarket(Pl.pos)) { this.market.visited = false; return; } // left early: try again next visit
    // the "price check" blackouts: every time the lights come back, the shoppers are closer
    for (let i = 0; i < 3; i++) {
      this.setMarketLights(false); this.blackout = 2.2;
      G.audio.beep(null, 55, 0.6, 0.3, 'sawtooth');
      yield 2.2;
      for (const [j, n] of this.shoppers.entries()) {
        if (i < 2) {
          const k = i === 0 ? 0.45 : 0.7;
          n.pos.lerpVectors(n.pos, Pl.pos, k); n.pos.y = 0;
        } else {
          const a = (j / this.shoppers.length) * Math.PI * 2;
          n.pos.set(Pl.pos.x + Math.sin(a) * 1.5, 0, Pl.pos.z + Math.cos(a) * 1.5);
        }
        W.resolve(n.pos, 0.35, 1.8);
        n.facePlayer(); n.mem.idleAnim = i === 2 ? 'creep' : 'stare';
      }
      this.setMarketLights(true);
      Pl.scare(0.2 + i * 0.15);
      if (i === 0) this.pa('Price check on aisle four.', 3);
      if (i === 2) { G.audio.sting(0.5); Pl.shake = 0.5; }
      yield i === 2 ? 2 : 4.5;
    }
    this.shoppers[0].say('...excuse me. Do you know where the milk is?', 3);
    yield 3.2;
    this.shoppers[1].say('We have been looking for it for three years.', 3);
    yield 3.2;
    this.shoppers[2].say('...it is never in aisle four.', 2.5);
    for (const n of this.shoppers) {
      n.mem.idleAnim = 'stare';
      n.run(function* (nn) { yield A.moveTo(nn.mem.home, 1.2, 'walk', { timeout: 15 }); });
    }
    yield 4;
    this.pa('Thank you for shopping at 4090 Market. Your soul has been charged.', 4);
    yield 6;
    const b = this.buddy;
    if (b && !b.removed) {
      this.pa('Attention: a grown man named Buddy is lost and crying at the checkout.', 4);
      yield 2;
      b.stopScript(); b.rd = null; b.rig.body.quaternion.identity();
      b.pos.set(-22.4, 0, 36.6);
      b.run(function* (nn) {
        yield A.anim('sitground', 1);
        yield A.say('I GOT LOST IN AISLE TWO! THERE ARE SO MANY CHIPS!', { loud: true });
        yield A.anim('sitground', 4);
        yield A.say('...okay. I am okay. Where were we?');
      });
    }
    W.marketDoor.target = -1.4;
  };

  P.updateMarket = function (dt) {
    const G = this.G, Pl = G.player;
    const inside = this.inMarket(Pl.pos);
    if (inside && !this.market.visited && !this.horrorRunning) this.task(this.marketTask);
    // the cashier keeps scanning nothing
    if (inside) {
      this.scanT = (this.scanT || 0) - dt;
      if (this.scanT <= 0) { this.scanT = rand(1.2, 2.2); G.audio.beep(this.cashier.pos.clone().setY(1.2), 1800, 0.06, 0.1, 'square'); }
      // sprinting past shelves knocks products down
      if (Math.hypot(Pl.vel.x, Pl.vel.z) > 6 && Pl.pos.x < -26.5 && Pl.pos.x > -43.5 && Math.random() < dt * 2) {
        const z = [23.4, 26.7, 33.3, 36.6].find((sz) => Math.abs(sz - Pl.pos.z) < 1.4);
        if (z) {
          for (let i = 0; i < 3; i++) {
            const p = G.props.spawn(box(0.24, 0.3, 0.2, mat(pick(['#c03030', '#e0c030', '#3070c0', '#30a050']))),
              V(Pl.pos.x + rand(-0.8, 0.8), 1.8, z + Math.sign(Pl.pos.z - z) * 0.45), V(rand(-1, 1), 1, Math.sign(Pl.pos.z - z) * 1.5), { kind: 'can', r: 0.12, thrown: false });
            this.after(30, () => G.props.remove(p));
          }
          G.audio.crunch(Pl.pos, 0.3);
          if (!this.market.cleanup) { this.market.cleanup = true; this.after(1.5, () => this.pa('Clean up on aisle... wherever you are.', 3)); }
        }
      }
    }
    // the friendly shopping cart: rolls toward you only while you are not looking
    const c = this.petCart;
    if (c && (inside || c.state === 'follow')) {
      const g = c.g, d = Math.hypot(Pl.pos.x - g.position.x, Pl.pos.z - g.position.z);
      const seen = this.lookingAt(g.position.clone().setY(0.8), 0.4);
      const want = c.state === 'follow' ? 2.2 : 1.3;
      if (d > want && (!seen || c.state === 'follow') && this.inMarket(g.position) === inside) {
        const sp = c.state === 'follow' ? Math.min(5, d) : 2.4;
        g.position.x += (Pl.pos.x - g.position.x) / d * sp * dt;
        g.position.z += (Pl.pos.z - g.position.z) / d * sp * dt;
        g.rotation.y = Math.atan2(Pl.pos.x - g.position.x, Pl.pos.z - g.position.z);
        G.world.resolve(g.position, 0.45, 1);
        if (Math.random() < dt * 3) G.audio.beep(g.position, rand(300, 500), 0.04, 0.04, 'square');
      }
      if (c.state === 'wait' && d < 1.5) {
        c.state = 'follow';
        G.audio.beep(g.position, 1200, 0.1, 0.15, 'sine');
        G.ui.say("(there is a note in the cart: 'be my friend')", '', 3.5);
        this.after(4, () => this.buddy && this.buddy.say('...is that cart replacing me?', 2.5));
      }
      if (c.state === 'follow' && !inside && d > 30) { c.state = 'lost'; G.ui.toast('The cart could not keep up. It will remember this.'); }
    }
  };

  // ---------------------------------------------------------------- 4090 FM
  P.updateRadio = function (dt) {
    const G = this.G;
    this.radioT -= dt;
    if (this.radioT > 0 || this.horrorRunning || this.market.visited && this.inMarket(G.player.pos)) return;
    this.radioT = rand(150, 230);
    const pool = this.finale ? RADIO.finale : this.horror ? RADIO.horror : RADIO.calm;
    this.radioIdx = (this.radioIdx || 0) + 1;
    const line = pool[(this.radioIdx + Math.floor(rand(0, pool.length))) % pool.length];
    G.audio.crunch(null, 0.15);
    G.audio.beep(null, 900, 0.3, 0.05, 'sawtooth');
    this.after(0.6, () => { G.ui.say(line, '📻 4090 FM', 5, '#fc6'); G.audio.speak(line, { pitch: 1.1, rate: 1.1, volume: 0.8 }); });
  };

  P.updateChapter3 = function (dt) {
    this.updateHiding(dt);
    this.updateMarket(dt);
    this.updateRadio(dt);
  };

  P.deathLine = function () {
    const k = this.G.player.lastKiller || 'fear';
    return DEATHS[k] || DEATHS.citizen;
  };
}
