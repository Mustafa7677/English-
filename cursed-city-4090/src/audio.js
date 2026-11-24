// Fully procedural Web Audio: wind, footsteps, screams, thuds, metal, music, drones, voices.
import { rand, pick } from './util.js';

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.ambientLevel = 1;
    this.voiceEnabled = 'speechSynthesis' in window;
  }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.ambient = ctx.createGain(); this.ambient.connect(this.master);

    // white noise buffer reused everywhere
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this._wind();
    this._drone();
  }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  get t() { return this.ctx.currentTime; }
  get ok() { return !!this.ctx; }

  /** Fade all ambient beds (used for the "city goes silent" moment). */
  setAmbient(level, time = 2) {
    this.ambientLevel = level;
    if (!this.ctx) return;
    this.ambient.gain.cancelScheduledValues(this.t);
    this.ambient.gain.setValueAtTime(this.ambient.gain.value, this.t);
    this.ambient.gain.linearRampToValueAtTime(level, this.t + time);
  }

  updateListener(cam) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const p = cam.getWorldPosition(this._v || (this._v = cam.position.clone()));
    const f = cam.getWorldDirection(this._f || (this._f = cam.position.clone()));
    if (l.positionX) {
      l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z;
      l.forwardX.value = f.x; l.forwardY.value = f.y; l.forwardZ.value = f.z;
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(f.x, f.y, f.z, 0, 1, 0);
    }
  }

  /** Output node: positional (PannerNode) if pos given, else straight to sfx bus. */
  _out(pos, ref = 4, bus = this.sfx) {
    if (!pos) return bus;
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = ref;
    p.rolloffFactor = 1.1;
    p.maxDistance = 200;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; }
    else p.setPosition(pos.x, pos.y, pos.z);
    p.connect(bus);
    return p;
  }

  _noiseSrc(loop = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise; s.loop = loop;
    s.loopStart = 0; s.loopEnd = 2;
    return s;
  }

  _env(g, t, a, peak, dec) {
    peak = Math.max(0.0002, peak);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  _wind() {
    const ctx = this.ctx;
    const n = this._noiseSrc(true);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 0.8;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 220;
    lfo.connect(lfoG).connect(bp.frequency);
    const g = ctx.createGain(); g.gain.value = 0.11;
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.13;
    const lfo2G = ctx.createGain(); lfo2G.gain.value = 0.05;
    lfo2.connect(lfo2G).connect(g.gain);
    n.connect(bp).connect(g).connect(this.ambient);
    n.start(); lfo.start(); lfo2.start();
  }

  _drone() {
    const ctx = this.ctx;
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    [41.2, 43.1, 61.7, 82.4].forEach((f) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start();
    });
    lp.connect(this.droneGain).connect(this.master);
  }

  setDrone(level, time = 3) {
    if (!this.ctx) return;
    this.droneGain.gain.cancelScheduledValues(this.t);
    this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, this.t);
    this.droneGain.gain.linearRampToValueAtTime(level * 0.12, this.t + time);
  }

  step(vol = 0.25, crunch = false) {
    if (!this.ctx) return;
    const t = this.t, n = this._noiseSrc();
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = crunch ? 1800 : rand(350, 600); f.Q.value = 1.2;
    const g = this.ctx.createGain(); this._env(g, t, 0.005, vol, 0.09);
    n.connect(f).connect(g).connect(this.sfx);
    n.start(t, rand(0, 1.5), 0.15);
  }

  thud(pos, vol = 0.8) {
    if (!this.ctx) return;
    const t = this.t, out = this._out(pos, 5);
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    const g = this.ctx.createGain(); this._env(g, t, 0.005, vol, 0.3);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.4);
    const n = this._noiseSrc(); const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    const g2 = this.ctx.createGain(); this._env(g2, t, 0.002, vol * 0.6, 0.15);
    n.connect(lp).connect(g2).connect(out); n.start(t, rand(0, 1.5), 0.2);
  }

  clank(pos, vol = 0.6) {
    if (!this.ctx) return;
    const t = this.t, out = this._out(pos, 5);
    [420, 683, 1127, 1650, 2210].forEach((f, i) => {
      const o = this.ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f * rand(0.97, 1.03);
      const g = this.ctx.createGain(); this._env(g, t, 0.002, vol / (i + 1.5), 0.6 + Math.random() * 0.5);
      o.connect(g).connect(out); o.start(t); o.stop(t + 1.3);
    });
    const n = this._noiseSrc(); const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
    const g = this.ctx.createGain(); this._env(g, t, 0.001, vol * 0.5, 0.08);
    n.connect(hp).connect(g).connect(out); n.start(t, 0, 0.1);
  }

  crunch(pos, vol = 0.7) { // glass/TV breaking
    if (!this.ctx) return;
    const t = this.t, out = this._out(pos, 5);
    for (let i = 0; i < 6; i++) {
      const n = this._noiseSrc(); const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = rand(2500, 6000);
      const g = this.ctx.createGain(); this._env(g, t + i * 0.04, 0.001, vol * rand(0.3, 0.8), 0.12);
      n.connect(hp).connect(g).connect(out); n.start(t + i * 0.04, rand(0, 1.5), 0.2);
    }
    this.thud(pos, vol * 0.6);
  }

  /** Synthetic human scream. pitch ~1 normal, <1 deep, >1 shrill. */
  scream(pos, pitch = 1, dur = 1.2, vol = 0.5) {
    if (!this.ctx) return;
    const t = this.t, out = this._out(pos, 6);
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    const base = 420 * pitch;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.6, t + dur * 0.2);
    o.frequency.linearRampToValueAtTime(base * 0.7, t + dur);
    const vib = this.ctx.createOscillator(); vib.frequency.value = rand(6, 9);
    const vg = this.ctx.createGain(); vg.gain.value = base * 0.06;
    vib.connect(vg).connect(o.frequency);
    const f1 = this.ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1100 * pitch; f1.Q.value = 4;
    const f2 = this.ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2600 * pitch; f2.Q.value = 5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.06);
    g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(out);
    o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  }

  laugh(pos, vol = 0.5, pitch = 1) {
    if (!this.ctx) return;
    const t0 = this.t, out = this._out(pos, 3);
    const n = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.19;
      const o = this.ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(260 * pitch * (1 - i * 0.03), t);
      o.frequency.linearRampToValueAtTime(200 * pitch, t + 0.12);
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 850; f.Q.value = 3;
      const g = this.ctx.createGain(); this._env(g, t, 0.01, vol, 0.12);
      o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 0.16);
    }
  }

  beep(pos, freq = 880, dur = 0.12, vol = 0.25, type = 'square') {
    if (!this.ctx) return;
    const t = this.t, out = this._out(pos, 5);
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.ctx.createGain(); this._env(g, t, 0.005, vol, dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  }

  robotVoice(pos, vol = 0.4) { // bitcrushed beeps under the speech
    if (!this.ctx) return;
    for (let i = 0; i < 8; i++) setTimeout(() => this.beep(pos, rand(90, 220), 0.09, vol, 'square'), i * 90);
  }

  stomp(pos, vol = 0.7) { this.thud(pos, vol); this.clank(pos, vol * 0.25); }

  whip(pos) {
    if (!this.ctx) return;
    const t = this.t, out = this._out(pos, 4);
    const n = this._noiseSrc(); const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass';
    hp.frequency.setValueAtTime(800, t); hp.frequency.exponentialRampToValueAtTime(6000, t + 0.1);
    const g = this.ctx.createGain(); this._env(g, t, 0.01, 0.5, 0.08);
    n.connect(hp).connect(g).connect(out); n.start(t, 0, 0.15);
  }

  /** Jump-scare sting: loud dissonant cluster + noise blast. */
  sting(vol = 0.9) {
    if (!this.ctx) return;
    vol *= this.scareScale ?? 1;
    const t = this.t;
    for (let i = 0; i < 7; i++) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(rand(90, 900), t);
      o.frequency.exponentialRampToValueAtTime(rand(40, 200), t + 1.4);
      const g = this.ctx.createGain(); this._env(g, t, 0.01, vol / 5, 1.3);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 1.5);
    }
    const n = this._noiseSrc(); const g = this.ctx.createGain(); this._env(g, t, 0.005, vol * 0.7, 0.9);
    n.connect(g).connect(this.master); n.start(t, 0, 1);
  }

  /** The classic frozen-program audio stutter: a tiny buffer looping. */
  crashBuzz(dur = 3) {
    if (!this.ctx) return;
    const ctx = this.ctx, sr = ctx.sampleRate, len = Math.floor(sr * 0.045);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.sin(i / sr * 2 * Math.PI * 220) > 0 ? 0.5 : -0.5) * 0.6 + (Math.random() - 0.5) * 0.5;
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    const g = ctx.createGain(); g.gain.value = 0.25;
    s.connect(g).connect(this.master); s.start(); s.stop(this.t + dur);
  }

  /** Deep meme "boom" with distortion. */
  vineBoom(vol = 0.9) {
    if (!this.ctx) return;
    const t = this.t, ctx = this.ctx;
    const sh = ctx.createWaveShaper(); const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 4); }
    sh.curve = curve;
    const g = ctx.createGain(); this._env(g, t, 0.005, vol, 1.4);
    sh.connect(g).connect(this.master);
    [55, 110, 82].forEach((f) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
      o.connect(sh); o.start(t); o.stop(t + 1.5);
    });
  }

  squeak(pos, vol = 0.4) { // rubber chicken
    if (!this.ctx) return;
    const t = this.t, out = this._out(pos, 4);
    const o = this.ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(500, t + 0.35);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 2;
    const g = this.ctx.createGain(); this._env(g, t, 0.01, vol, 0.35);
    o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 0.45);
  }

  shutter() {
    if (!this.ctx) return;
    const t = this.t, n = this._noiseSrc();
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const g = this.ctx.createGain(); this._env(g, t, 0.001, 0.5, 0.05);
    n.connect(hp).connect(g).connect(this.sfx); n.start(t, 0, 0.1);
  }

  /** The real screamer sound: distorted layered shriek + noise blast + sub hit. */
  bigScream(vol = 1) {
    if (!this.ctx) return;
    vol *= this.scareScale ?? 1;
    const ctx = this.ctx, t = this.t;
    const sh = ctx.createWaveShaper(); const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) { const x = i / 256 - 1; curve[i] = Math.tanh(x * 6); }
    sh.curve = curve;
    const out = ctx.createGain(); this._env(out, t, 0.004, vol, 1.5);
    sh.connect(out).connect(this.master);
    for (let i = 0; i < 6; i++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const f0 = 700 + i * 137;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.4, t + 0.15); o.frequency.exponentialRampToValueAtTime(110 + i * 20, t + 1.4);
      const g = ctx.createGain(); g.gain.value = 0.18;
      o.connect(g).connect(sh); o.start(t); o.stop(t + 1.6);
    }
    const shriek = ctx.createOscillator(); shriek.type = 'square'; shriek.frequency.setValueAtTime(2600, t); shriek.frequency.linearRampToValueAtTime(1700, t + 1.2);
    const vib = ctx.createOscillator(); vib.frequency.value = 23; const vg = ctx.createGain(); vg.gain.value = 300; vib.connect(vg).connect(shriek.frequency);
    const sg = ctx.createGain(); sg.gain.value = 0.12; shriek.connect(sg).connect(sh); shriek.start(t); vib.start(t); shriek.stop(t + 1.3); vib.stop(t + 1.3);
    const n = this._noiseSrc(); const ng = ctx.createGain(); this._env(ng, t, 0.002, vol * 0.8, 0.9); n.connect(ng).connect(this.master); n.start(t, 0, 1);
    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.setValueAtTime(90, t); sub.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    const subg = ctx.createGain(); this._env(subg, t, 0.003, vol, 0.7); sub.connect(subg).connect(this.master); sub.start(t); sub.stop(t + 0.8);
  }

  /** Felt more than heard: a very low unsettling rumble (build-up before scares). */
  infrasound(dur = 6, vol = 0.5) {
    if (!this.ctx) return;
    const t = this.t, ctx = this.ctx;
    [31, 37.5, 44].forEach((f) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * 0.3, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.1);
    });
  }

  /** A whisper played "backwards": swelling filtered noise that cuts off abruptly. */
  reverseWhisper(pos, vol = 0.4) {
    if (!this.ctx) return;
    const t = this.t, out = this._out(pos, 3);
    for (let i = 0; i < 4; i++) {
      const n = this._noiseSrc(); const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rand(1500, 3200); bp.Q.value = 4;
      const g = this.ctx.createGain(); const s = t + i * 0.35;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(vol, s + 0.3); g.gain.setValueAtTime(0.0001, s + 0.31);
      n.connect(bp).connect(g).connect(out); n.start(s, rand(0, 1.5), 0.35);
    }
  }

  click() { // a tiny tick (subliminal frames)
    if (!this.ctx) return;
    const t = this.t, n = this._noiseSrc(); const g = this.ctx.createGain(); this._env(g, t, 0.001, 0.3, 0.02);
    n.connect(g).connect(this.master); n.start(t, 0, 0.03);
  }

  hiss(vol = 0.5) {
    if (!this.ctx) return;
    const t = this.t, n = this._noiseSrc(); const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const g = this.ctx.createGain(); this._env(g, t, 0.02, vol, 0.6);
    n.connect(hp).connect(g).connect(this.master); n.start(t, 0, 0.7);
  }

  clap(vol = 0.35) {
    if (!this.ctx) return;
    const t = this.t, n = this._noiseSrc(); const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rand(1100, 1600); bp.Q.value = 1.2;
    const g = this.ctx.createGain(); this._env(g, t, 0.001, vol, 0.07);
    n.connect(bp).connect(g).connect(this.sfx); n.start(t, rand(0, 1.5), 0.1);
  }

  /** Ringing ears after a loud scare. */
  tinnitus(dur = 3) {
    if (!this.ctx) return;
    const t = this.t, o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 6200;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.1);
  }

  chalk(pos) {
    if (!this.ctx) return;
    const t = this.t, out = this._out(pos, 3), n = this._noiseSrc();
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200 + Math.random() * 1500; bp.Q.value = 6;
    const g = this.ctx.createGain(); this._env(g, t, 0.005, 0.35, 0.07);
    n.connect(bp).connect(g).connect(out); n.start(t, Math.random(), 0.1);
  }

  /** Heavenly choir "aaah" (for doing the right thing). */
  choir(dur = 2.5) {
    if (!this.ctx) return;
    const t = this.t;
    [261.6, 329.6, 392, 523.2].forEach((f) => {
      for (const det of [-3, 3]) {
        const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det * 4;
        const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 2;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(bp).connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.1);
      }
    });
  }

  // ---------------------------------------------------------------- dynamic music
  /** Layered procedural score: pad (calm), pulse (chase), dread (horror), arp (finale). */
  startMusic() {
    if (!this.ctx || this.mus) return;
    const ctx = this.ctx;
    const layer = () => { const g = ctx.createGain(); g.gain.value = 0; g.connect(this.master); return g; };
    const mus = this.mus = { pad: layer(), pulse: layer(), dread: layer(), arp: layer(), step: 0, chord: 0 };
    mus.chords = [[110, 130.8, 164.8], [98, 116.5, 146.8], [87.3, 103.8, 130.8], [103.8, 123.5, 155.6]];
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; lp.connect(mus.pad);
    mus.padOsc = mus.chords[0].map((f, i) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (i - 1) * 7; o.connect(lp); o.start(); return o; });
    const trem = ctx.createGain(); trem.gain.value = 0.5; trem.connect(mus.dread);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5; const lg = ctx.createGain(); lg.gain.value = 0.4; lfo.connect(lg).connect(trem.gain); lfo.start();
    [466.2, 493.9, 233.1].forEach((f) => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.2; o.connect(g).connect(trem); o.start(); });
    const note = (bus, type, f, dur, vol) => {
      const t = ctx.currentTime, o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      const g = ctx.createGain(); this._env(g, t, 0.004, vol, dur); o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
    };
    this.musTimer = setInterval(() => {
      const m = this.mus; m.step++;
      if (m.step % 64 === 0) {
        m.chord = (m.chord + 1) % m.chords.length;
        const t = ctx.currentTime;
        m.padOsc.forEach((o, i) => o.frequency.setTargetAtTime(m.chords[m.chord][i], t, 1.5));
      }
      const ch = m.chords[m.chord];
      if (m.lv && m.lv.pulse > 0.02) {
        if (m.step % 4 === 0) { const t = ctx.currentTime, k = ctx.createOscillator(); k.frequency.setValueAtTime(150, t); k.frequency.exponentialRampToValueAtTime(40, t + 0.15); const g = ctx.createGain(); this._env(g, t, 0.002, 0.7, 0.18); k.connect(g).connect(m.pulse); k.start(t); k.stop(t + 0.2); }
        if (m.step % 2 === 0) note(m.pulse, 'sawtooth', ch[0] / 2, 0.12, 0.25);
      }
      if (m.lv && m.lv.arp > 0.02) note(m.arp, 'square', ch[m.step % 3] * (m.step % 6 < 3 ? 2 : 4), 0.1, 0.08);
    }, 125);
  }

  /** levels: { pad, pulse, dread, arp } each 0..1 */
  setMusic(lv) {
    if (!this.mus) return;
    const t = this.t, m = this.mus; m.lv = lv;
    m.pad.gain.setTargetAtTime(lv.pad * 0.05, t, 1.2);
    m.pulse.gain.setTargetAtTime(lv.pulse * 0.5, t, 0.5);
    m.dread.gain.setTargetAtTime(lv.dread * 0.05, t, 1.5);
    m.arp.gain.setTargetAtTime(lv.arp * 0.6, t, 0.8);
  }

  thunder(vol = 0.9) {
    if (!this.ctx) return;
    const t = this.t, n = this._noiseSrc();
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(120, t + 2.5);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    n.connect(lp).connect(g).connect(this.ambient); n.start(t, Math.random(), 3.6);
    this.thud(null, vol * 0.5);
  }

  phoneBuzz() {
    if (!this.ctx) return;
    for (let i = 0; i < 3; i++) setTimeout(() => this.beep(null, 170, 0.35, 0.25, 'square'), i * 600);
  }

  whoosh(vol = 0.4) {
    if (!this.ctx) return;
    const t = this.t, n = this._noiseSrc();
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
    bp.frequency.setValueAtTime(200, t); bp.frequency.exponentialRampToValueAtTime(3000, t + 0.6);
    const g = this.ctx.createGain(); this._env(g, t, 0.2, vol, 0.5);
    n.connect(bp).connect(g).connect(this.sfx); n.start(t, 0, 0.9);
  }

  heartbeat(vol = 0.6) {
    if (!this.ctx) return;
    const t = this.t;
    [0, 0.18].forEach((d, i) => {
      const o = this.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(60, t + d); o.frequency.exponentialRampToValueAtTime(30, t + d + 0.15);
      const g = this.ctx.createGain(); this._env(g, t + d, 0.01, vol * (i ? 0.6 : 1), 0.18);
      o.connect(g).connect(this.master); o.start(t + d); o.stop(t + d + 0.3);
    });
  }

  /** Looping positional source. Returns { setPos(v), stop(), setGain(v) }. */
  loop(kind, pos) {
    if (!this.ctx) return { setPos() {}, stop() {}, setGain() {} };
    const ctx = this.ctx;
    const panner = this._out(pos, kind === 'music' ? 4 : kind === 'nextbot' ? 6 : 3);
    const gain = ctx.createGain(); gain.gain.value = 1; gain.connect(panner);
    const nodes = [];
    let interval = null;
    if (kind === 'hum') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 110.5;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      const g = ctx.createGain(); g.gain.value = 0.25;
      o.connect(lp); o2.connect(lp); lp.connect(g).connect(gain); o.start(); o2.start(); nodes.push(o, o2);
    } else if (kind === 'music') {
      // cheap bouncy synth loop (for the dancing NPC)
      const notes = [220, 277, 330, 277, 247, 311, 370, 311];
      let i = 0;
      const play = () => {
        const t = ctx.currentTime;
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = notes[i % notes.length];
        const b = ctx.createOscillator(); b.type = 'triangle'; b.frequency.value = notes[(i >> 2 << 2) % notes.length] / 2;
        const g = ctx.createGain(); this._env(g, t, 0.005, 0.18, 0.2);
        o.connect(g); b.connect(g); g.connect(gain); o.start(t); b.start(t); o.stop(t + 0.25); b.stop(t + 0.25);
        i++;
      };
      interval = setInterval(play, 220);
    } else if (kind === 'coffin') {
      // minor-key dance beat with a kick (for the pallbearers)
      const lead = [440, 440, 523, 494, 440, 392, 440, 330];
      let i = 0;
      interval = setInterval(() => {
        const t = ctx.currentTime;
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = lead[i % lead.length];
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
        const g = ctx.createGain(); this._env(g, t, 0.005, 0.12, 0.16);
        o.connect(lp).connect(g).connect(gain); o.start(t); o.stop(t + 0.2);
        if (i % 2 === 0) {
          const k = ctx.createOscillator(); k.type = 'sine';
          k.frequency.setValueAtTime(140, t); k.frequency.exponentialRampToValueAtTime(40, t + 0.15);
          const kg = ctx.createGain(); this._env(kg, t, 0.002, 0.5, 0.18);
          k.connect(kg).connect(gain); k.start(t); k.stop(t + 0.2);
        }
        i++;
      }, 190);
    } else if (kind === 'hiphop') {
      let i = 0;
      const bass = [55, 55, 0, 65.4, 55, 0, 49, 0];
      interval = setInterval(() => {
        const t = ctx.currentTime;
        if (i % 4 === 0) { const k = ctx.createOscillator(); k.frequency.setValueAtTime(130, t); k.frequency.exponentialRampToValueAtTime(40, t + 0.15); const g = ctx.createGain(); this._env(g, t, 0.002, 0.8, 0.2); k.connect(g).connect(gain); k.start(t); k.stop(t + 0.25); }
        if (i % 8 === 4) { const n = this._noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; const g = ctx.createGain(); this._env(g, t, 0.002, 0.5, 0.12); n.connect(bp).connect(g).connect(gain); n.start(t, 0, 0.15); }
        if (i % 2 === 1) { const n = this._noiseSrc(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000; const g = ctx.createGain(); this._env(g, t, 0.001, 0.15, 0.03); n.connect(hp).connect(g).connect(gain); n.start(t, 0, 0.05); }
        const f = bass[i % 8]; if (f) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; const g = ctx.createGain(); this._env(g, t, 0.005, 0.35, 0.18); o.connect(lp).connect(g).connect(gain); o.start(t); o.stop(t + 0.22); }
        i++;
      }, 150);
    } else if (kind === 'train') {
      const n = this._noiseSrc(true); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
      const g = ctx.createGain(); g.gain.value = 0.5; n.connect(lp).connect(g).connect(gain); n.start(); nodes.push(n);
      let i = 0;
      interval = setInterval(() => { this.thud(null, i % 2 ? 0.15 : 0.2); i++; }, 450);
    } else if (kind === 'buzz') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 240.4;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      const g = ctx.createGain(); g.gain.value = 0.035;
      o.connect(lp); o2.connect(lp); lp.connect(g).connect(gain); o.start(); o2.start(); nodes.push(o, o2);
    } else if (kind === 'nextbot') {
      // loud, catchy, distorted chase loop
      const seq = [440, 523, 659, 523, 415, 523, 622, 523, 392, 494, 587, 494, 415, 523, 622, 784];
      const sh = ctx.createWaveShaper(); const cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 3); } sh.curve = cv;
      const out = ctx.createGain(); out.gain.value = 0.5; sh.connect(out).connect(gain);
      let i = 0;
      interval = setInterval(() => {
        const t = ctx.currentTime;
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = seq[i % seq.length];
        const g = ctx.createGain(); this._env(g, t, 0.004, 0.3, 0.12); o.connect(g).connect(sh); o.start(t); o.stop(t + 0.15);
        if (i % 4 === 0) { const b = ctx.createOscillator(); b.type = 'sawtooth'; b.frequency.value = seq[i % seq.length] / 4; const bg = ctx.createGain(); this._env(bg, t, 0.004, 0.5, 0.3); b.connect(bg).connect(sh); b.start(t); b.stop(t + 0.35); }
        i++;
      }, 135);
    } else if (kind === 'musicbox') {
      const mel = [1046, 1318, 1568, 1318, 1174, 1396, 1760, 1396, 1046, 1318, 1568, 2093, 1975, 1568, 1318, 1174];
      let i = 0;
      interval = setInterval(() => {
        const t = ctx.currentTime, o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mel[i++ % mel.length];
        const g = ctx.createGain(); this._env(g, t, 0.003, 0.14, 0.6); o.connect(g).connect(gain); o.start(t); o.stop(t + 0.7);
      }, 360);
    } else if (kind === 'laughs') {
      interval = setInterval(() => { if (Math.random() < 0.6) this.laugh(pos, 0.35, rand(0.8, 1.4)); }, 2200);
    } else if (kind === 'breath') {
      const n = this._noiseSrc(true);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 1.5;
      const g = ctx.createGain(); g.gain.value = 0;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.32;
      const lg = ctx.createGain(); lg.gain.value = 0.35;
      lfo.connect(lg).connect(g.gain);
      n.connect(bp).connect(g).connect(gain); n.start(); lfo.start(); nodes.push(n, lfo);
    } else if (kind === 'rain') {
      const n = this._noiseSrc(true);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.value = 0.13;
      n.connect(hp).connect(lp).connect(g).connect(gain); n.start(); nodes.push(n);
    } else if (kind === 'engine') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 45;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
      const g = ctx.createGain(); g.gain.value = 0.18;
      o.connect(lp).connect(g).connect(gain); o.start(); nodes.push(o);
      gain._osc = o;
    }
    return {
      setPos(v) {
        if (panner.positionX) { panner.positionX.value = v.x; panner.positionY.value = v.y; panner.positionZ.value = v.z; }
        else if (panner.setPosition) panner.setPosition(v.x, v.y, v.z);
      },
      setGain(v) { gain.gain.value = v; },
      setPitch(f) { if (gain._osc) gain._osc.frequency.value = f; },
      stop() { nodes.forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } }); if (interval) clearInterval(interval); gain.disconnect(); },
    };
  }

  /** Speak a line (Web Speech API, optional: subtitles are always shown by the UI). lang 'kk': a Kazakh voice, else a Russian one (it can read Cyrillic), else nothing (subtitles only).
   * Returns true if the line is being spoken. */
  speak(text, { pitch = 1, rate = 1, volume = 1, lang = 'en' } = {}) {
    if (!this.voiceEnabled) return false;
    try {
      const all = speechSynthesis.getVoices(), has = (p) => all.filter((v) => v.lang && v.lang.toLowerCase().startsWith(p));
      let voices = has(lang);
      if (!voices.length && lang === 'kk') voices = has('ru');
      if (!voices.length && lang !== 'en') return false;
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch; u.rate = rate; u.volume = volume * this.volume;
      if (voices.length) { u.voice = voices[Math.floor(Math.abs(pitch * 7)) % voices.length]; u.lang = u.voice.lang; }
      speechSynthesis.speak(u);
      return true;
    } catch (e) { this.voiceEnabled = false; return false; }
  }

  /** Random distant unexplained sounds. */
  distant(listenerPos) {
    if (!this.ctx) return;
    const a = Math.random() * Math.PI * 2, r = rand(50, 90);
    const p = { x: listenerPos.x + Math.cos(a) * r, y: 2, z: listenerPos.z + Math.sin(a) * r };
    pick([
      () => this.scream(p, rand(0.5, 0.8), 2.2, 0.6),
      () => this.clank(p, 0.9),
      () => this.laugh(p, 0.6, 0.6),
      () => this.thud(p, 1),
      () => { for (let i = 0; i < 3; i++) setTimeout(() => this.clank(p, 0.5), i * 400); },
    ])();
  }
}
