'use strict';

function updateUnit(u, dt){
  u.atkTimer = Math.max(0, u.atkTimer - dt);
  if (u.type === 'hero'){
    if (u.isPlayer) playerControl(u, dt);
    else heroAI(u, dt);
  } else if (u.type === 'creep') creepAI(u, dt);
  else if (u.type === 'roshan') roshanAI(u, dt);
  else if (u.type === 'jungle') jungleAI(u, dt);
  else structureAI(u, dt);

  separate(u, dt);
  u.x = clamp(u.x, 40, WORLD - 40);
  u.y = clamp(u.y, 40, WORLD - 40);
}

function updateProjectiles(dt){
  for (let i = projectiles.length - 1; i >= 0; i--){
    const p = projectiles[i];
    if (p.target){
      if (!p.target.alive){ projectiles.splice(i, 1); continue; }
      const dx = p.target.x - p.x, dy = p.target.y - p.y, d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step + p.target.r){
        damage(p.src, p.target, p.dmg);
        addEffect({type:'hit', x:p.target.x, y:p.target.y, t:0.18, max:0.18});
        projectiles.splice(i, 1);
        continue;
      }
      p.x += dx / d * step;
      p.y += dy / d * step;
    } else if (p.vx !== undefined){
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      let hit = false;
      for (const u of units){
        if (!u.alive || u.team === p.team || u.invuln) continue;
        if (Math.hypot(u.x - p.x, u.y - p.y) < u.r + p.r){
          damage(p.src, u, p.dmg);
          addEffect({type:'ring', x:p.x, y:p.y, t:0.3, max:0.3, r0:5, r1:45, color:p.color});
          hit = true;
          break;
        }
      }
      if (hit || p.life <= 0) projectiles.splice(i, 1);
    } else {
      projectiles.splice(i, 1);
    }
  }
}

function updateEffects(dt){
  for (let i = effects.length - 1; i >= 0; i--){
    effects[i].t -= dt;
    if (effects[i].t <= 0) effects.splice(i, 1);
  }
  if (banner){ banner.t -= dt; if (banner.t <= 0) banner = null; }
  if (moveMarker){ moveMarker.t -= dt; if (moveMarker.t <= 0) moveMarker = null; }
}

function cleanupDeadUnits(){
  for (let i = units.length - 1; i >= 0; i--){
    const u = units[i];
    if (!u.alive && u.type !== 'hero' && u.type !== 'roshan' && u.type !== 'jungle'){
      if (u.el && u.el.parentNode) u.el.parentNode.removeChild(u.el);
      units.splice(i, 1);
    }
  }
}

function update(dt){
  if (!gameOver){
    gameTime += dt;
    gold += 1.5 * dt;
    waveTimer -= dt;
    if (waveTimer <= 0){ spawnWave(); waveTimer = WAVE_INTERVAL; }
    runeTimer -= dt;
    if (runeTimer <= 0){ spawnRune(); runeTimer = 90; }
  }

  for (const u of units){
    if (!u.alive){
      if (u.type === 'hero'){ u.respawn -= dt; if (u.respawn <= 0 && !gameOver) respawnHero(u); }
      else if (u.type === 'roshan'){ u.respawn -= dt; if (u.respawn <= 0) reviveRoshan(u); }
      else if (u.type === 'jungle'){ u.respawn -= dt; if (u.respawn <= 0) reviveJungle(u); }
      continue;
    }
    updateUnit(u, dt);
  }

  updateProjectiles(dt);
  updateEffects(dt);

  runes = runes.filter(r => r.alive);

  cleanupDeadUnits();
}