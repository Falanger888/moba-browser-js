'use strict';

function castAbility(h, i, opts){
  trace('cast', 'i=' + i + ' src=' + (h === player ? 'player' : 'ai') + ' opts=' + JSON.stringify(opts || {}));
  opts = opts || {};
  const a = ABIL[i];
  if (h.ablLv[i] <= 0){ trace('cast', 'FAIL: level 0'); return false; }
  if (h.cds[i] > 0){ trace('cast', 'FAIL: cd=' + h.cds[i].toFixed(1)); return false; }
  if (h.mana < a.cost){ trace('cast', 'FAIL: mana=' + Math.round(h.mana) + '<' + a.cost); return false; }

  h.cds[i] = a.cd;
  h.mana -= a.cost;
  trace('cast', 'OK lv=' + h.ablLv[i] + ' cd=' + a.cd + ' mana left=' + Math.round(h.mana));
  sfx(i === 3 ? 'ult' : 'ability');
  const lv = h.ablLv[i] || 0;

  if (i === 0){
    let ang = h.facing;
    if (opts.tx !== undefined) ang = Math.atan2(opts.ty - h.y, opts.tx - h.x);
    else { const t = nearestEnemy(h, 700, false, true); if (t) ang = Math.atan2(t.y - h.y, t.x - h.x); }
    projectiles.push({
      x: h.x, y: h.y, vx: Math.cos(ang) * 740, vy: Math.sin(ang) * 740,
      dmg: 90 + lv * 65 + h.dmg * 0.5, team: h.team, r: 15, life: 1.15,
      color: '#ffb74d', skill: true, src: h
    });
    addEffect({type:'ring', x:h.x, y:h.y, t:0.25, max:0.25, r0:10, r1:50, color:'#ff7043'});
  } else if (i === 1){
    let ang = h.facing;
    if (opts.tx !== undefined) ang = Math.atan2(opts.ty - h.y, opts.tx - h.x);
    h.dashT = 0.22; h.dashVX = Math.cos(ang) * 1500; h.dashVY = Math.sin(ang) * 1500;
    addEffect({type:'ring', x:h.x, y:h.y, t:0.3, max:0.3, r0:8, r1:55, color:'#66bb6a'});
  } else if (i === 2){
    const heal = 150 + lv * 85;
    h.hp = Math.min(h.maxHp, h.hp + heal);
    addEffect({type:'ring', x:h.x, y:h.y, t:0.5, max:0.5, r0:10, r1:70, color:'#42a5f5'});
    if (h.isPlayer) addFloat(h.x, h.y - 30, '+' + Math.round(heal), '#7ee787');
  } else if (i === 3){
    const R = 280, castRange = 550;
    let cx = (opts.tx !== undefined) ? opts.tx : h.x;
    let cy = (opts.ty !== undefined) ? opts.ty : h.y;
    const dx = cx - h.x, dy = cy - h.y;
    const dd = Math.hypot(dx, dy);
    if (dd > castRange){ cx = h.x + dx / dd * castRange; cy = h.y + dy / dd * castRange; }
    const dmg = 200 + lv * 200 + h.dmg * 0.4;
    for (const u of units){
      if (!u.alive || u.team === h.team || u.invuln) continue;
      if (Math.hypot(u.x - cx, u.y - cy) < R + u.r) damage(h, u, dmg);
    }
    addEffect({type:'ring', x:cx, y:cy, t:0.55, max:0.55, r0:20, r1:R, color:'#ab47bc'});
    addEffect({type:'flash', x:cx, y:cy, t:0.35, max:0.35, r:R, color:'rgba(171,71,188,0.35)'});
  }
  return true;
}