'use strict';

function playerControl(h, dt){
  for (let i = 0; i < 4; i++) h.cds[i] = Math.max(0, h.cds[i] - dt);
  h.buffT = Math.max(0, h.buffT - dt); if (h.buffT <= 0) h.buffType = null;

  if (h.dashT > 0){ h.dashT -= dt; h.x += h.dashVX * dt; h.y += h.dashVY * dt; }

  if (h.focus && !h.focus.alive) h.focus = null;

  if (h.focus && h.dashT <= 0){
    const tgt = h.focus;
    const d = Math.hypot(tgt.x - h.x, tgt.y - h.y);
    if (d > h.range + tgt.r - 10) moveToward(h, tgt.x, tgt.y, dt);
    if (h.atkTimer <= 0 && d <= h.range + tgt.r + 15) doAttack(h, tgt);
  } else if (h.attackMoveOrder && h.dashT <= 0){
    const tgt = acquireTarget(h, h.range + 30, false, false);
    if (tgt){
      if (h.atkTimer <= 0) doAttack(h, tgt);
    } else {
      const d = Math.hypot(h.attackMoveOrder.x - h.x, h.attackMoveOrder.y - h.y);
      if (d < 10) h.attackMoveOrder = null;
      else moveToward(h, h.attackMoveOrder.x, h.attackMoveOrder.y, dt);
    }
  } else if (h.moveOrder && h.dashT <= 0){
    const d = Math.hypot(h.moveOrder.x - h.x, h.moveOrder.y - h.y);
    if (d < 10) h.moveOrder = null;
    else moveToward(h, h.moveOrder.x, h.moveOrder.y, dt);
  } else if (h.dashT <= 0 && h.atkTimer <= 0){
    let best = null, bestD = h.range + 20;
    for (const o of units){
      if (!o.alive || o.team === h.team || o.invuln) continue;
      if (o.team < 0 && o.aggro !== h) continue;
      const dd = Math.hypot(o.x - h.x, o.y - h.y) - o.r;
      if (dd < bestD){ bestD = dd; best = o; }
    }
    if (best) doAttack(h, best);
  }

  h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.025 * dt);
  h.mana = Math.min(h.maxMana, h.mana + h.maxMana * 0.07 * dt);

  for (const r of runes){
    if (r.alive && dist(h, r) < r.r + h.r){
      r.alive = false;
      if (r.runeType === 'bounty'){
        addGoldTo(h, 250);
        addFloat(h.x, h.y - 30, '+250 ЗОЛОТО', '#ffd54f');
      } else {
        h.buffType = r.runeType;
        h.buffT = 22;
        addFloat(h.x, h.y - 30, r.runeType === 'dd' ? 'ДВОЙНОЙ УРОН' : 'СКОРОСТЬ', '#ffd54f');
      }
      addEffect({type:'ring', x:h.x, y:h.y, t:0.4, max:0.4, r0:10, r1:70, color:'#ffd54f'});
      sfx('gold');
    }
  }
}