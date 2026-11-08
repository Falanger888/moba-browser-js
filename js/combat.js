'use strict';
// ────────────────────────── Статистика (localStorage) ──────────────────────────
const STATS_KEY = 'dotaMiniStats';

function loadStats(){
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return Object.assign({ totalKills: 0, bestKills: 0, games: 0, wins: 0 }, JSON.parse(raw));
  } catch(e){}
  return { totalKills: 0, bestKills: 0, games: 0, wins: 0 };
}
function saveStats(s){
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch(e){}
}

let sessionStats = loadStats();

function updateStatsOnGameOver(){
  if (!player) return;
  sessionStats.games++;
  sessionStats.totalKills += player.kills;
  if (player.kills > sessionStats.bestKills) sessionStats.bestKills = player.kills;
  if (gameOver === 'win') sessionStats.wins++;
  saveStats(sessionStats);
  console.log('[stats]', sessionStats);
}
// ────────────────────────── Статы ──────────────────────────
function effDmg(u){ return u.dmg * (u.buffType === 'dd' ? 1.8 : 1); }
function effSpeed(u){ return u.speed * (u.buffType === 'haste' ? 1.4 : 1); }

function addGoldTo(h, amt){
  if (!h || h.type !== 'hero') return;
  if (h.isPlayer) gold += amt;
  else h.gold = (h.gold || 0) + amt;
}

// ────────────────────────── Урон ──────────────────────────
function damage(src, tgt, amt){
  if (!tgt.alive || tgt.invuln) return;
  if (src && src.type === 'hero') tgt.lastHitBy = src;
  if (tgt.type === 'roshan' && src && src.type === 'hero' && !tgt.aggro) tgt.aggro = src;
  if (tgt.type === 'jungle' && src && src.type === 'hero'){
    tgt.aggro = src;
    for (const o of units){
      if (o !== tgt && o.type === 'jungle' && o.campId === tgt.campId && o.alive && !o.aggro) o.aggro = src;
    }
  }
  tgt.hp -= amt;
  if (src === player || tgt === player){
    if (tgt.type === 'hero' || tgt.type === 'tower' || tgt.type === 'rax' || tgt.type === 'ancient'){
      addDamageNumber(tgt.x, tgt.y, amt, tgt === player);
    }
  }
  if (tgt.hp <= 0){ tgt.hp = 0; killUnit(tgt, src); }
}

// ────────────────────────── Эффекты ──────────────────────────
function addEffect(e){ effects.push(e); }
function addFloat(x, y, text, color){
  effects.push({type:'text', x, y, t: 0.9, max: 0.9, text, color});
}
function addDamageNumber(x, y, amt, toPlayer){
  effects.push({
    type: 'dmg',
    x: x + (Math.random() - 0.5) * 24,
    y: y - 15,
    t: 0.85, max: 0.85,
    text: '-' + Math.round(amt),
    color: toPlayer ? '#ff5252' : '#ffd54f'
  });
}
function setBanner(text, color){
  banner = {text, color, t: 2.5, max: 2.5};
}

// ────────────────────────── Звук ──────────────────────────
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx){
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
  }
  if (audioCtx && audioCtx.state === 'suspended'){ audioCtx.resume().catch(()=>{}); }
}
function sfx(type){
  if (!audioCtx) return;
  try {
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    let freq = 220, dur = 0.08, vol = 0.05, wave = 'square';
    if (type === 'ability'){ freq = 520; dur = 0.12; vol = 0.045; wave = 'sawtooth'; }
    else if (type === 'ult'){ freq = 130; dur = 0.32; vol = 0.06; wave = 'sawtooth'; }
    else if (type === 'gold'){ freq = 880; dur = 0.09; vol = 0.04; wave = 'sine'; }
    else if (type === 'level'){ freq = 660; dur = 0.16; vol = 0.05; wave = 'triangle'; }
    else if (type === 'death'){ freq = 200; dur = 0.4; vol = 0.06; wave = 'sawtooth'; }
    else if (type === 'buy'){ freq = 740; dur = 0.12; vol = 0.05; wave = 'triangle'; }
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch(e){}
}

// ────────────────────────── Опыт и уровни ──────────────────────────
function grantXP(h, amt){
  h.xp += amt;
  while (h.xp >= h.xpNeeded){
    h.xp -= h.xpNeeded;
    h.level++;
    h.xpNeeded = Math.floor(h.xpNeeded * 1.32);
    h.maxHp += 100; h.hp = Math.min(h.maxHp, h.hp + 100);
    h.maxMana += 30; h.mana = Math.min(h.maxMana, h.mana + 30);
    h.dmg += 9;
    autoSkill(h);
    addEffect({type:'ring', x:h.x, y:h.y, t:0.6, max:0.6, r0:10, r1:80, color:'#ffd54f'});
    if (h.isPlayer){ addFloat(h.x, h.y - 30, 'Уровень ' + h.level, '#ffd54f'); sfx('level'); }
  }
}

function autoSkill(h){
  if (h.level % 6 === 0 && h.ablLv[3] < 3){ h.ablLv[3]++; return; }
  for (const i of [0, 1, 2]){ if (h.ablLv[i] < 4){ h.ablLv[i]++; return; } }
  if (h.ablLv[3] < 3) h.ablLv[3]++;
}

// ────────────────────────── Смерть ──────────────────────────
function killUnit(u, killer){
  u.alive = false;
  const col = teamColor(u.team);
  addEffect({type:'ring', x:u.x, y:u.y, t:0.5, max:0.5, r0:u.r, r1:u.r*3.2, color:col});

  if (u.type === 'roshan'){
    if (u.lastHitBy && u.lastHitBy.type === 'hero'){
      u.lastHitBy.aegis = true;
      addGoldTo(u.lastHitBy, 500);
      if (u.lastHitBy.isPlayer){
        addFloat(u.x, u.y - 44, '+500 ЗОЛОТО', '#ffd54f');
        addFloat(u.x, u.y - 16, 'ЭГИДА!', '#ffd54f');
      }
    }
    u.level++;
    u.respawn = 150;
    setBanner('РОШАН ПОВЕРЖЕН!', '#ffd54f');
    sfx('ult');
    addEffect({type:'flash', x:u.x, y:u.y, t:0.6, max:0.6, r:140, color:'rgba(255,213,79,0.5)'});
    return;
  }

  if (u.type === 'jungle'){
    const xp = u.big ? 70 : 40;
    const g = u.big ? 60 : 35;
    for (const h of units){
      if (h.type === 'hero' && h.alive && h.team !== u.team && dist(h, u) < 900) grantXP(h, xp);
    }
    if (u.lastHitBy && u.lastHitBy.alive) addGoldTo(u.lastHitBy, g);
    u.respawn = 90;
    return;
  }

  if (u.type === 'hero'){
    u.deaths++;
    u.streak = 0;
    u.respawn = 8 + u.level * 1.5;
    if (u.aegis){ u.aegis = false; u.respawn = 1.2; addFloat(u.x, u.y - 30, 'ЭГИДА!', '#ffd54f'); }
    if (killer && killer.type === 'hero' && killer !== u){
      killer.kills++;
      killer.streak = (killer.streak || 0) + 1;
    }

    let msg, col2;
    if (!firstBlood){
      firstBlood = true;
      msg = u.isPlayer ? 'ПЕРВАЯ КРОВЬ — ВЫ МЕРТВЫ' : 'ПЕРВАЯ КРОВЬ!';
      col2 = '#ff5252';
      if (killer && killer.type === 'hero' && killer !== u) addGoldTo(killer, 200);
    } else if (killer && killer.type === 'hero' && killer !== u && !u.isPlayer){
      const s = killer.streak;
      if (s === 2){ msg = 'ДВОЙНОЕ УБИЙСТВО'; col2 = '#ff9800'; }
      else if (s === 3){ msg = 'ТРОЙНОЕ УБИЙСТВО'; col2 = '#ff7043'; }
      else if (s >= 4){ msg = 'НЕУДЕРЖИМ! x' + s; col2 = '#ef5350'; }
      else { msg = 'ВРАЖЕСКИЙ ГЕРОЙ УБИТ'; col2 = '#7fd4ff'; }
    } else if (u.isPlayer){
      msg = 'ВЫ МЕРТВЫ'; col2 = '#ff5252';
    } else {
      msg = 'ВРАЖЕСКИЙ ГЕРОЙ УБИТ'; col2 = '#7fd4ff';
    }
    setBanner(msg, col2);
    sfx('death');

    for (const h of units){
      if (h.type === 'hero' && h.alive && h.team !== u.team && dist(h, u) < 1100){
        grantXP(h, 140 + u.level * 40);
        addGoldTo(h, 180 + u.level * 20);
      }
    }
    return;
  }

  const xp = u.type === 'creep' ? 34 : (u.type === 'tower' ? 200 : (u.type === 'rax' ? 300 : 500));
  for (const h of units){
    if (h.type === 'hero' && h.alive && h.team !== u.team && dist(h, u) < 1000) grantXP(h, xp);
  }

  if (u.type === 'creep'){
    if (u.lastHitBy && u.lastHitBy.alive){
      addGoldTo(u.lastHitBy, 42);
      if (u.lastHitBy.isPlayer) addFloat(u.x, u.y - 14, '+42', '#ffd54f');
    }
  } else if (u.type === 'tower' || u.type === 'rax' || u.type === 'ancient'){
    const g = u.type === 'tower' ? 140 : (u.type === 'rax' ? 220 : 450);
    for (const h of units){
      if (h.type === 'hero' && h.alive && h.team !== u.team) addGoldTo(h, g);
    }
  }

  if (u.type === 'tower' || u.type === 'rax'){
    for (const o of units){
      if (o.requires === u && o.alive) o.invuln = false;
    }
    if (u.type === 'rax'){
      const anc = structs[u.team].ancient;
      if (anc && anc.invuln) anc.invuln = false;
    }
    } else if (u.type === 'ancient'){
    gameOver = u.team === 1 ? 'win' : 'lose';
    updateStatsOnGameOver();
  }
}

// ────────────────────────── Возрождение ──────────────────────────
function respawnHero(h){
  h.alive = true;
  h.hp = h.maxHp; h.mana = h.maxMana;
  h.cds = [0, 0, 0, 0];
  h.dashT = 0;
  h.moveOrder = null;
  h.attackMoveOrder = null;
  h.focus = null;
  const p = pointAlong(lanePath(h.team, 'mid'), 0.05);
  h.x = p.x; h.y = p.y;
  addEffect({type:'ring', x:h.x, y:h.y, t:0.6, max:0.6, r0:10, r1:90, color:'#ffffff'});
  if (h.isPlayer){ pendingAbility = -1; attackMoveMode = false; }
}

function reviveRoshan(u){
  u.alive = true;
  u.maxHp = 2000 + (u.level - 1) * 700;
  u.hp = u.maxHp;
  u.dmg = 70 + (u.level - 1) * 15;
  u.x = u.homeX; u.y = u.homeY;
  u.aggro = null; u.slamTimer = 3;
  addEffect({type:'ring', x:u.x, y:u.y, t:0.6, max:0.6, r0:20, r1:120, color:'#ffd54f'});
}

function reviveJungle(u){
  u.alive = true;
  u.hp = u.maxHp;
  u.x = u.homeX + rndRange(-40, 40);
  u.y = u.homeY + rndRange(-40, 40);
  u.aggro = null;
}

// ────────────────────────── Выбор цели и атака ──────────────────────────
function nearestEnemy(u, range, heroesOnly, includeNeutral){
  let best = null, bestD = range;
  for (const o of units){
    if (!o.alive || o.team === u.team || o.invuln || o === u) continue;
    if (o.team < 0 && !includeNeutral) continue;
    if (heroesOnly && o.type !== 'hero') continue;
    const d = Math.hypot(o.x - u.x, o.y - u.y) - o.r;
    if (d < bestD){ bestD = d; best = o; }
  }
  return best;
}

function acquireTarget(u, range, preferCreeps, includeNeutral){
  let best = null, bestScore = Infinity;
  for (const o of units){
    if (!o.alive || o.team === u.team || o.invuln || o === u) continue;
    if (o.team < 0 && !includeNeutral) continue;
    const d = Math.hypot(o.x - u.x, o.y - u.y) - o.r;
    if (d > range) continue;
    let score = d;
    if (preferCreeps && o.type === 'hero') score += 600;
    if (preferCreeps && o.type === 'ancient') score += 400;
    if (score < bestScore){ bestScore = score; best = o; }
  }
  return best;
}

function doAttack(u, t){
  u.atkTimer = u.atkInterval;
  u.facing = Math.atan2(t.y - u.y, t.x - u.x);
  const dmg = u.type === 'hero' ? effDmg(u) : u.dmg;
  if (u.range > 150){
    projectiles.push({
      x: u.x, y: u.y - 8, target: t, src: u, dmg, team: u.team,
      speed: 920, r: u.type === 'hero' ? 7 : 5,
      color: u.team === 0 ? '#8fd9ff' : '#ff9d9d'
    });
  } else {
    damage(u, t, dmg);
    addEffect({type:'hit', x:t.x, y:t.y, t:0.18, max:0.18});
  }
}