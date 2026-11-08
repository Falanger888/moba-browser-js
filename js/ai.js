'use strict';

function creepAI(u, dt){
  const t = acquireTarget(u, u.ranged ? 360 : 320, true, false);
  if (t){
    const d = Math.hypot(t.x - u.x, t.y - u.y);
    if (d > u.range * 0.85 + t.r) moveToward(u, t.x, t.y, dt);
    else { u.facing = Math.atan2(t.y - u.y, t.x - u.x); if (u.atkTimer <= 0) doAttack(u, t); }
    return;
  }
  const path = u.path;
  if (path && u.wp < path.length){
    const wp = path[u.wp];
    if (Math.hypot(wp.x - u.x, wp.y - u.y) < 34) u.wp++;
    else moveToward(u, wp.x, wp.y, dt);
  } else {
    const goal = u.team === 0 ? BASE1 : BASE0;
    moveToward(u, goal.x, goal.y, dt);
  }
}

function heroAI(h, dt){
  for (let i = 0; i < 4; i++) h.cds[i] = Math.max(0, h.cds[i] - dt);
  h.buffT = Math.max(0, h.buffT - dt); if (h.buffT <= 0) h.buffType = null;
  h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.02 * dt);
  h.mana = Math.min(h.maxMana, h.mana + h.maxMana * 0.055 * dt);

  if (!h.items) h.items = {};
  h.gold = (h.gold || 0) + 1.0 * dt;
  for (const it of ITEMS){
    if (h.gold >= it.cost && !h.items[it.id]){
      h.gold -= it.cost;
      h.items[it.id] = true;
      if (it.id === 'boots') h.speed += 60;
      if (it.id === 'blade') h.dmg += 32;
      if (it.id === 'vital'){ h.maxHp += 320; h.hp += 320; }
      if (it.id === 'mana'){ h.maxMana += 220; h.mana += 220; }
      addEffect({type:'ring', x:h.x, y:h.y, t:0.5, max:0.5, r0:10, r1:60, color:it.color});
      break;
    }
  }

  if (h.dashT > 0){ h.dashT -= dt; h.x += h.dashVX * dt; h.y += h.dashVY * dt; }

  if (h.hp < h.maxHp * 0.28){
    const b = h.team === 0 ? BASE0 : BASE1;
    moveToward(h, b.x, b.y, dt);
    if (h.cds[2] <= 0 && h.mana >= ABIL[2].cost && h.ablLv[2] > 0) castAbility(h, 2, {});
    return;
  }

  let t = acquireTarget(h, 600, true, false);
  if (t && t.type === 'hero'){
    if (h._chaseTgt !== t){ h._chaseTgt = t; h._chaseUntil = gameTime + 6; }
    if (gameTime > h._chaseUntil) t = null;
  } else {
    h._chaseTgt = null;
  }

  if (t){
    const d = Math.hypot(t.x - h.x, t.y - h.y);
    if (d < 600 && h.cds[0] <= 0 && h.mana >= ABIL[0].cost && h.ablLv[0] > 0 && Math.random() < 0.08){
      castAbility(h, 0, {tx:t.x, ty:t.y});
    }
    if (d < 300 && h.cds[3] <= 0 && h.mana >= ABIL[3].cost && h.ablLv[3] > 0 && t.type !== 'creep'){
      castAbility(h, 3, {tx:t.x, ty:t.y});
    }
    if (h.hp < h.maxHp * 0.6 && h.cds[2] <= 0 && h.mana >= ABIL[2].cost && h.ablLv[2] > 0){
      castAbility(h, 2, {});
    }
    if (d > h.range * 0.8 + t.r) moveToward(h, t.x, t.y, dt);
    else if (h.atkTimer <= 0) doAttack(h, t);
    return;
  }

  if (!h.lanePath){
    h.lanePath = lanePath(h.team, 'mid');
    h.laneWp = 1;
  }
  while (h.laneWp < h.lanePath.length){
    const wp = h.lanePath[h.laneWp];
    if (Math.hypot(wp.x - h.x, wp.y - h.y) < 80) h.laneWp++;
    else { moveToward(h, wp.x, wp.y, dt); return; }
  }
  const goal = h.team === 0 ? BASE1 : BASE0;
  moveToward(h, goal.x, goal.y, dt);
}

function roshanAI(u, dt){
  u.atkTimer = Math.max(0, u.atkTimer - dt);
  u.slamTimer = Math.max(0, u.slamTimer - dt);

  if (u.aggro && (!u.aggro.alive || dist(u, u.aggro) > 620)) u.aggro = null;

  if (!u.aggro){
    const dHome = Math.hypot(u.homeX - u.x, u.homeY - u.y);
    if (dHome > 20) moveToward(u, u.homeX, u.homeY, dt);
    else u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.35 * dt);
    return;
  }

  const d = Math.hypot(u.aggro.x - u.x, u.aggro.y - u.y);
  if (d > u.range * 0.8 + u.aggro.r){
    moveToward(u, u.aggro.x, u.aggro.y, dt);
  } else {
    u.facing = Math.atan2(u.aggro.y - u.y, u.aggro.x - u.x);
    if (u.atkTimer <= 0) doAttack(u, u.aggro);
  }

  if (u.slamTimer <= 0 && d < 240){
    u.slamTimer = 5;
    addEffect({type:'ring', x:u.x, y:u.y, t:0.4, max:0.4, r0:30, r1:200, color:'#c98a3d'});
    for (const o of units){
      if (!o.alive || o.team === u.team || o.team < 0 || o.invuln) continue;
      if (dist(u, o) < 200 + o.r) damage(u, o, 80 + u.level * 15);
    }
  }
}

function jungleAI(u, dt){
  u.atkTimer = Math.max(0, u.atkTimer - dt);
  if (u.aggro && (!u.aggro.alive || dist(u, u.aggro) > 520)) u.aggro = null;
  if (!u.aggro){
    const dh = Math.hypot(u.homeX - u.x, u.homeY - u.y);
    if (dh > 30) moveToward(u, u.homeX, u.homeY, dt);
    else u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.25 * dt);
    return;
  }
  const d = Math.hypot(u.aggro.x - u.x, u.aggro.y - u.y);
  if (d > u.range * 0.8 + u.aggro.r) moveToward(u, u.aggro.x, u.aggro.y, dt);
  else { u.facing = Math.atan2(u.aggro.y - u.y, u.aggro.x - u.x); if (u.atkTimer <= 0) doAttack(u, u.aggro); }
}

function structureAI(u, dt){
  if (u.range <= 0) return;
  if (u.atkTimer <= 0){
    const t = acquireTarget(u, u.range, true, false);
    if (t) doAttack(u, t);
  }
}