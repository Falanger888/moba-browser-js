'use strict';

// ────────────────────────── Инициализация SVG-слоёв ──────────────────────────
function initLayers(){
  worldEl   = el('g', {}, svg);
  mapLayer  = el('g', {}, worldEl);
  rangeLayer = el('g', {}, worldEl);
  unitLayer = el('g', {}, worldEl);
  projLayer = el('g', {}, worldEl);
  fxLayer   = el('g', {}, worldEl);
  runeLayer = el('g', {}, worldEl);
  hudLayer  = el('g', {}, svg);
}

// ────────────────────────── Resize ──────────────────────────
function resize(){
  W = window.innerWidth;
  H = window.innerHeight;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  SCALE = clamp(Math.min(W / 520, H / 860), 0.4, 1.4);
  UI = clamp(Math.min(W, H) / 400, 0.8, 1.25);
  layoutButtons();
}

// ────────────────────────── Игровой цикл ──────────────────────────
let lastTime = 0;

function loop(now){
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;

  if (!paused){
    update(dt);
    updateCamera(dt);
  }
  render();

  requestAnimationFrame(loop);
}

// ────────────────────────── Bootstrap ──────────────────────────
window.addEventListener('resize', resize);
initLayers();
resize();
reset();
lastTime = performance.now();
requestAnimationFrame(loop);

console.log('[Dota Mini] loaded OK — ' + 16 + ' modules');