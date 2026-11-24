// Chapter 17: two separate maps. The map select screen picks either 4090 CITY or METRO 404.
// On the METRO 404 map the city is not shown and not simulated at all: only the metro runs.
import * as THREE from 'three';

const loadJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function extendDirector17(D) {
  const P = D.prototype;

  /** Hide everything that belongs to the city; keep the metro, the wagon, lights and the camera. */
  P.prepareMetroMap = function () {
    const G = this.G, M = this.metro;
    const keep = new Set([M.root, M.wagon, G.camera, G.fx && G.fx.points, M.light, M.wagonLight]);
    for (const o of G.scene.children) if (!keep.has(o) && !o.isLight) o.visible = false;
    this.metroMapStart = G.time;
    ['compass', 'disks'].forEach((id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  };

  P.metroMapWin = function () {
    const G = this.G, M = this.metro, t = G.time - (this.metroMapStart || 0);
    G.state = 'won';
    G.input.unlock();
    M.hud.classList.add('hidden');
    const best = loadJSON('cc4090-metro', null);
    const better = !best || M.mistakes < best.mistakes || (M.mistakes === best.mistakes && t < best.time);
    if (better) saveJSON('cc4090-metro', { mistakes: M.mistakes, time: Math.round(t) });
    document.getElementById('end-title').textContent = 'YOU ESCAPED METRO 404';
    document.getElementById('end-stats').textContent = `Time: ${fmt(t)} · Mistakes: ${M.mistakes} · Stations: 5/5`;
    document.getElementById('end-rank').textContent = `AURA ${this.aura || 0} 🗿${better ? ' · NEW BEST!' : ''}`;
    document.getElementById('end-tag').textContent = M.mistakes === 0 ? 'EAGLE EYE: not a single mistake.' : 'Next time: notice everything.';
    G.ui.show('ending');
  };

  // On the metro map, only the metro systems run.
  const origUpdate = P.update;
  P.update = function (dt) {
    const G = this.G;
    if (G.map !== 'metro') { origUpdate.call(this, dt); return; }
    this.updateTasks(dt);
    this.blackout = Math.max(0, this.blackout - dt);
    this.flashFlicker = Math.max(0, this.flashFlicker - dt);
    if (this.ended || G.state === 'won') return;
    this.updateMetro(dt);
    this.updateMusic();
    const cam = G.camera;
    if (this.fovTarget && Math.abs(cam.fov - this.fovTarget) > 0.05) { cam.fov += (this.fovTarget - cam.fov) * Math.min(1, dt * 7); cam.updateProjectionMatrix(); }
    if (G.frame % 30 === 0) this.updateQuest();
    const a = document.getElementById('aura'); if (a) a.textContent = `AURA ${this.aura || 0} 🗿`;
  };
}

/** Render a preview picture of each map into the map select cards. */
export function makeMapThumbs(G) {
  const r = G.renderer, M = G.director.metro;
  const cam = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 160);
  const shot = (id, bright = 1) => {
    const c = document.getElementById(id); if (!c) return;
    const ctx = c.getContext('2d'), src = r.domElement, sw = src.width, sh = Math.round(sw * 9 / 16);
    ctx.filter = `brightness(${bright}) contrast(1.1)`;
    ctx.drawImage(src, 0, Math.max(0, (src.height - sh) / 2), sw, Math.min(sh, src.height), 0, 0, c.width, c.height);
  };
  try {
    cam.position.set(4, 7, 22); cam.lookAt(26, 9, -24);
    r.render(G.scene, cam); shot('thumb-city', 1.9);
    M.light.position.set(0, -117.4, -2); M.light.intensity = 9;
    const hidden = [M.walker && M.walker.root];
    cam.position.set(0.3, -118.35, 4); cam.lookAt(0, -118.5, -20);
    r.render(G.scene, cam); shot('thumb-metro');
    M.light.intensity = 0;
    hidden.length = 0;
  } catch (e) { /* thumbnails are optional */ }
  // best results
  const best = loadJSON('cc4090-best', null), metro = loadJSON('cc4090-metro', null);
  const bc = document.getElementById('best-city'), bm = document.getElementById('best-metro');
  if (bc) bc.textContent = best ? `Best: ${best.score} · ${best.rank}` : 'Not played yet';
  if (bm) bm.textContent = metro ? `Escaped in ${fmt(metro.time)} · ${metro.mistakes} mistakes` : 'Not escaped yet';
}
