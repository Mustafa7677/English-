// Chapter 12: NIGHT SHIFT at the security booth next to NVIDIA
// (inspired by the "survive the night in the security office" genre; all characters original).
// The monitor shows LIVE camera feeds of real places in the city (rendered from CCTV cameras):
//   CAM 1 aisle 4 of the supermarket, CAM 2 the main crossroads, CAM 3 the NVIDIA plaza,
//   CAM 4 the kindergarten corridor (nothing moves there... usually).
// Three "Night Shoppers" (mannequins) creep from camera to camera towards your booth — but only
// while nobody is watching them. Close the shutter (Q) when one is at the door. Power drains.
// Survive from 12 AM to 6 AM.
import * as THREE from 'three';
import { makeHumanoid, pose } from './characters.js';
import { ACH } from './scenes2.js';
import { mat, basic, box, textTex, canvasTex, rand, pick } from './util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const HOUR = 18; // seconds per in-game hour

Object.assign(ACH, {
  nightshift: ['Employee Of The Month', 'Survive the night shift'],
  nightfail: ['Fired', 'Fail the night shift'],
});

const CAMS = [
  { name: 'AISLE 4', pos: V(-27.5, 4.6, 34.9), look: V(-42, 0.6, 34.9), stage: V(-36, 0, 34.9) },
  { name: 'CROSSROADS', pos: V(7, 7, 9), look: V(-1, 0, -2), stage: V(-1.5, 0, -1.5) },
  { name: 'NVIDIA PLAZA', pos: V(24, 6, -3), look: V(15, 0, -15), stage: V(15.5, 0, -19) },
  { name: 'KINDERGARTEN', pos: V(-30, 3.5, -13), look: V(-30, 1.2, -45), stage: null },
];
const DOOR_STAGE = V(10.5, 0, -18.4);

export function extendDirector12(D) {
  const P = D.prototype;
  const origInit = P.init;
  P.init = function () { origInit.call(this); this.initNight(); };
  const origUpdate = P.update;
  P.update = function (dt) { origUpdate.call(this, dt); if (!this.ended) this.updateNight(dt); };

  P.initNight = function () {
    const G = this.G, W = G.world;
    const facade = mat('#ffffff', { map: W.facadeTex('#2a3440', '#0a0e12', '#a0c0ff', 0.2) });
    const R = this.booth = W.buildRoom(10.5, -15, 4.6, 4.2, 3, { facade, lining: '#3a4048', floorA: '#2a2a2a', floorB: '#222', sign: 'SECURITY', signBg: '#0a1a3a', signFg: '#8cf', light: 0xd0e0ff });
    const NS = this.night = { active: false, done: false, cam: 1, power: 100, t: 0, door: false, shutterY: 3.9, staticT: 0, rtT: 0 };
    // desk + monitor showing a live render target
    G.scene.add(box(2.2, 0.08, 0.8, mat('#2a2a30'), 10.5, 0.78, -13.65));
    NS.rt = new THREE.WebGLRenderTarget(320, 240);
    NS.cctv = new THREE.PerspectiveCamera(70, 4 / 3, 0.1, 120);
    NS.screenMat = new THREE.MeshBasicMaterial({ map: NS.rt.texture });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), NS.screenMat); scr.position.set(10.5, 1.45, -13.42); scr.rotation.y = Math.PI; G.scene.add(scr);
    G.scene.add(box(1.32, 1.0, 0.1, mat('#111'), 10.5, 1.45, -13.33));
    NS.screenPos = scr.position.clone();
    // static + overlay label
    const sc = document.createElement('canvas'); sc.width = 160; sc.height = 120; NS.staticCtx = sc.getContext('2d'); NS.staticTex = new THREE.CanvasTexture(sc);
    const lc = document.createElement('canvas'); lc.width = 256; lc.height = 32; NS.labelCtx = lc.getContext('2d'); NS.labelTex = new THREE.CanvasTexture(lc);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.15), new THREE.MeshBasicMaterial({ map: NS.labelTex, transparent: true }));
    lab.position.set(10.5, 1.82, -13.41); lab.rotation.y = Math.PI; G.scene.add(lab);
    // the shutter
    NS.shutter = box(2.5, 2.6, 0.12, mat('#4a4f55'), 10.5, NS.shutterY, R.Z0 + 0.05); G.scene.add(NS.shutter);
    NS.shutterCol = W.addCollider(9.25, 11.75, R.Z0 - 0.1, R.Z0 + 0.2, -1, 2.6); NS.shutterCol.enabled = false;
    // night shoppers (raw rigs, only exist during the shift) + the kindergarten "extra" only cameras can see
    NS.shoppers = [0, 1, 2].map((i) => {
      const r = makeHumanoid({ mannequin: true, eyesGlow: '#ff1a1a' });
      for (let k = 0; k < 3; k++) pose(r, 'stare', 1, 0, 0);
      r.root.visible = false; G.scene.add(r.root);
      return { r, stage: 0, t: 0, atDoor: 0, off: V((i - 1) * 0.8, 0, (i - 1) * 0.5) };
    });
    NS.ghost = makeHumanoid({ faceless: true, skin: '#cfcfc4', shirt: '#111', pants: '#111', scale: 1.1 });
    for (let k = 0; k < 3; k++) pose(NS.ghost, 'stare', 1, 0, 0);
    NS.ghost.root.position.set(-30, 0, -40); NS.ghost.root.rotation.y = 0; NS.ghost.root.visible = false; G.scene.add(NS.ghost.root);
    W.addInteract({
      pos: V(10.5, 1.2, -14.2), r: 2.4, label: () => (NS.done ? 'The booth is closed. Employee of the month.' : 'Start the NIGHT SHIFT (survive until 6 AM)'),
      enabled: () => !NS.active && !this.horror && !this.horrorRunning && !this.finale,
      act: () => { if (!NS.done) this.startNight(); },
    });
    NS.hud = document.getElementById('nightshift');
  };

  P.startNight = function () {
    const G = this.G, NS = this.night, Pl = G.player;
    NS.active = true; NS.power = 100; NS.t = 0; NS.cam = 1; NS.door = false; NS.out = false; NS.startedAt = G.time;
    NS.shoppers.forEach((s, i) => { s.stage = 0; s.t = rand(8, 14) + i * 3; s.atDoor = 0; s.r.root.visible = true; this.placeShopper(s); });
    Pl.pos.set(10.5, 0, -14.3); Pl.yaw = Math.PI; Pl.pitch = -0.15; Pl.vel.set(0, 0, 0); Pl.locked = true; Pl.flashOn = false;
    NS.hud.classList.remove('hidden');
    G.ui.big('NIGHT SHIFT — 12 AM', 3, 'clock');
    G.ui.toast('[1-4] cameras · look at the monitor to watch · [Q] shutter · [F] flashlight · [E] quit');
    G.audio.setAmbient(0.3, 1);
    this.eventsSeen++;
  };

  P.placeShopper = function (s) {
    const st = s.stage < 3 ? CAMS[s.stage].stage : DOOR_STAGE;
    s.r.root.position.copy(st).add(s.stage < 3 ? s.off : V(s.off.x * 0.6, 0, 0));
    const tgt = s.stage < 3 ? CAMS[s.stage].pos : V(10.5, 0, -14);
    s.r.root.rotation.y = Math.atan2(tgt.x - s.r.root.position.x, tgt.z - s.r.root.position.z);
  };

  P.endNight = function (win, reason) {
    const G = this.G, NS = this.night, Pl = G.player;
    NS.active = false;
    NS.hud.classList.add('hidden');
    NS.shoppers.forEach((s) => (s.r.root.visible = false));
    NS.door = false; NS.shutterCol.enabled = false;
    Pl.locked = false;
    this.booth.light.intensity = this.booth.light.userData.base;
    if (NS.music) { NS.music.stop(); NS.music = null; }
    G.audio.setAmbient(this.horror ? 0.5 : 1, 2);
    if (win) {
      NS.done = true;
      [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => G.audio.beep(null, f, 0.3, 0.2, 'triangle'), i * 200));
      G.ui.big('6 AM — SHIFT COMPLETE', 4, 'green');
      this.achieve('nightshift');
      if (this.addAura) this.addAura(1000, 'survived the night shift');
      Pl.bricks += 5;
      G.ui.toast('Bonus: +5 bricks. You are Employee Of The Month.');
    } else {
      this.achieve('nightfail');
      if (reason) G.ui.toast(reason);
      if (this.addAura) this.addAura(-500, 'fired from the night shift');
    }
  };

  P.updateNight = function (dt) {
    const G = this.G, NS = this.night, Pl = G.player, I = G.input;
    // shutter animation (always)
    const sy = NS.door ? 1.3 : 3.9;
    NS.shutterY += (sy - NS.shutterY) * Math.min(1, dt * 10);
    NS.shutter.position.y = NS.shutterY;
    NS.shutterCol.enabled = NS.door;
    if (!NS.active) return;
    if (G.state !== 'play' || Pl.dead) { if (Pl.dead) this.endNight(false); return; }
    // ---- controls
    for (let k = 1; k <= 4; k++) if (I.hit('Digit' + k) || I.hit('Numpad' + k)) { if (NS.cam !== k) { NS.cam = k; NS.staticT = 0.3; G.audio.beep(null, 900, 0.05, 0.08, 'square'); } }
    if (I.hit('KeyQ') && NS.power > 0) { NS.door = !NS.door; G.audio.clank(V(10.5, 1.5, -17), 0.7); }
    if (I.hit('KeyF')) { Pl.flashOn = !Pl.flashOn; }
    if (I.hit('KeyE') && G.time - NS.startedAt > 0.5) { this.endNight(false, 'You walked out of the night shift.'); return; }
    if (this.horrorRunning) { this.endNight(false, 'Something bigger is happening outside. Shift cancelled.'); return; }
    Pl.pitch = Math.max(-0.9, Math.min(0.6, Pl.pitch));
    // ---- time & power
    NS.t += dt;
    const hour = Math.min(6, Math.floor(NS.t / HOUR));
    const watching = this.lookingAt(NS.screenPos, 0.75);
    NS.power -= dt * (0.32 + (NS.door ? 0.95 : 0) + (watching ? 0.3 : 0) + (Pl.flashOn ? 0.25 : 0));
    if (NS.power <= 0 && !NS.out) {
      NS.out = true; NS.power = 0; NS.door = false; Pl.flashOn = false;
      this.booth.light.intensity = 0; this.blackout = 6;
      NS.music = G.audio.loop('musicbox', DOOR_STAGE.clone().setY(1.6));
      G.ui.toast('POWER OUT.');
      this.after(5.5, () => { if (!NS.active) return; this.task(function* () { yield* this.lunge('mannequin', 30); this.endNight(false, 'The power ran out.'); }); });
    }
    if (NS.t >= HOUR * 6 && !NS.out) { this.endNight(true); return; }
    // ---- the shoppers move only when nobody watches them
    const lookingDoor = this.lookingAt(DOOR_STAGE.clone().setY(1.5), 0.6);
    for (const s of NS.shoppers) {
      const onCam = watching && s.stage < 3 && NS.cam === s.stage + 1;
      const seenAtDoor = s.stage === 3 && lookingDoor && !NS.door;
      if (s.stage === 3) {
        s.atDoor += dt;
        if (NS.door && s.atDoor > 2.2) {
          G.audio.thud(V(10.5, 1.5, -17.2), 1); this.after(0.4, () => G.audio.thud(V(10.5, 1.5, -17.2), 1));
          s.stage = Math.random() < 0.5 ? 0 : 1; s.t = rand(7, 12); s.atDoor = 0; this.placeShopper(s);
        } else if (!NS.door && s.atDoor > 3.4 && !NS.out) {
          s.atDoor = -99;
          this.task(function* () { yield* this.lunge('mannequin', 30); this.endNight(false, 'A Night Shopper got in.'); });
          return;
        }
        if (seenAtDoor && s.atDoor > 0.3 && s.atDoor < 0.5) Pl.scare(0.4);
        continue;
      }
      if (onCam) continue;
      s.t -= dt;
      if (s.t <= 0) {
        s.stage++; s.t = rand(9, 15) * (1 - hour * 0.09); s.atDoor = 0;
        this.placeShopper(s);
        if (s.stage === 3) G.audio.thud(V(10.5, 0.3, -18.5), 0.25); // footsteps at the door
        else if (s.stage === 2) G.audio.step(0.12);
      }
    }
    // ---- live camera feed (15 fps)
    NS.rtT -= dt;
    if (NS.rtT <= 0) {
      NS.rtT = 1 / 15;
      if (NS.staticT > 0) {
        NS.staticT -= 1 / 15;
        const ctx = NS.staticCtx, img = ctx.createImageData(160, 120);
        for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 110; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        ctx.putImageData(img, 0, 0); NS.staticTex.needsUpdate = true; NS.screenMat.map = NS.staticTex;
      } else {
        const cam = CAMS[NS.cam - 1];
        NS.cctv.position.copy(cam.pos); NS.cctv.lookAt(cam.look);
        NS.cctv.rotation.z += Math.sin(G.time * 0.7) * 0.01;
        // the kindergarten camera sometimes shows someone who is not there
        NS.ghost.root.visible = NS.cam === 4 && (Math.sin(G.time * 0.37) > 0.6);
        const r = G.renderer, prevFog = G.scene.fog.density;
        r.setRenderTarget(NS.rt); r.render(G.scene, NS.cctv); r.setRenderTarget(null);
        G.scene.fog.density = prevFog;
        NS.ghost.root.visible = false;
        NS.screenMat.map = NS.rt.texture;
      }
      const lc = NS.labelCtx;
      lc.clearRect(0, 0, 256, 32); lc.fillStyle = 'rgba(0,0,0,0.5)'; lc.fillRect(0, 0, 256, 32);
      lc.fillStyle = '#fff'; lc.font = 'bold 16px monospace';
      lc.fillText(`CAM ${NS.cam} · ${CAMS[NS.cam - 1].name}`, 8, 22);
      if (Math.floor(G.time * 2) % 2) { lc.fillStyle = '#f22'; lc.fillText('● REC', 190, 22); }
      NS.labelTex.needsUpdate = true;
    }
    // ---- HUD
    const h = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM'][hour];
    NS.hud.innerHTML = `<b>NIGHT SHIFT</b> · ${h} · POWER <span style="color:${NS.power > 30 ? '#7f7' : '#f44'}">${Math.max(0, Math.round(NS.power))}%</span> · SHUTTER ${NS.door ? '<span style="color:#fc6">CLOSED</span>' : 'OPEN'}<br><small>[1-4] cameras · look at the monitor · [Q] shutter · [F] flashlight · [E] quit</small>`;
  };
}
