'use strict';

// ────────────────────────── Базовое движение ──────────────────────────
function moveToward(u, tx, ty, dt){
  const dx = tx - u.x, dy = ty - u.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) return;
  const step = Math.min(u.speed * dt, d);
  u.x += dx / d * step;
  u.y += dy / d * step;
  u.facing = Math.atan2(dy, dx);
}

function separate(u, dt){
  if (u.type === 'tower' || u.type === 'ancient' || u.type === 'rax' || u.type === 'roshan') return;
  for (const o of units){
    if (o === u || !o.alive) continue;
    const dx = u.x - o.x, dy = u.y - o.y;
    const d = Math.hypot(dx, dy);
    const minD = u.r + o.r;
    if (d < minD && d > 0.001){
      const push = (minD - d);
      const w = (o.type === 'tower' || o.type === 'ancient' || o.type === 'rax') ? 1.0 : 0.5;
      u.x += dx / d * push * w;
      u.y += dy / d * push * w;
    }
  }
}

// ────────────────────────── Приказы игрока ──────────────────────────
function issueMoveOrder(x, y){
  if (!player || !player.alive) return;
  player.moveOrder = {x, y};
  player.attackMoveOrder = null;
  player.focus = null;
  moveMarker = {x, y, t: 0.55, max: 0.55, attack: false};
}

function issueAttackOrder(u){
  if (!player || !player.alive || !u) return;
  player.focus = u;
  player.moveOrder = null;
  player.attackMoveOrder = null;
  moveMarker = {x: u.x, y: u.y, t: 0.5, max: 0.5, attack: true};
}

function issueAttackMoveOrder(x, y){
  if (!player || !player.alive) return;
  player.attackMoveOrder = {x, y};
  player.moveOrder = null;
  player.focus = null;
  moveMarker = {x, y, t: 0.55, max: 0.55, attack: true};
}