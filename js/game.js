'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('game');

let W = 0, H = 0, SCALE = 1, UI = 1;

let units = [];
let projectiles = [];
let effects = [];
let runes = [];
let player = null, enemyHero = null, roshan = null;
let gameTime = 0, waveTimer = FIRST_WAVE, waveNum = 0, runeTimer = 40;
let gameOver = null;
let decorations = [];
const cam = {x: 0, y: 0};
let camInit = false;

// ── ПК-состояние ──
let camOffset = {x: 0, y: 0};
let camDragging = false;
let moveMarker = null;
let hoverUnit = null;
let mouseX = 0, mouseY = 0;
let mouseWorld = {x: 0, y: 0};
let pendingAbility = -1;
let attackMoveMode = false;

let gold = 0;
const itemOwned = {boots:0, blade:0, vital:0, mana:0};
let showShop = false;
let banner = null;
let firstBlood = false;

let structs = {0: null, 1: null};

let worldEl, mapLayer, unitLayer, projLayer, fxLayer, runeLayer, hudLayer;

const BTN = {r: 30, pos: []};
const SHOP = {x: 0, y: 0};
const PAUSE = {x: 0, y: 0};
let paused = false;

let lastTime = performance.now();

// ────────────────────────── Утилиты ──────────────────────────
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const dist  = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp  = (a, b, t) => a + (b - a) * t;
const pad2  = n => (n < 10 ? '0' : '') + n;

let _seed = 987654321;
function rnd(){ _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; }
function rndRange(a, b){ return a + rnd() * (b - a); }

function hexA(hex, a){
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function el(tag, attrs, parent){
  const e = document.createElementNS(SVG_NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function teamColor(team){ return team === 0 ? '#4fc3f7' : (team < 0 ? '#ffd54f' : '#ef5350'); }

function polyLen(pts){
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
  return L;
}
function pointAlong(pts, t){
  let L = polyLen(pts) * clamp(t, 0, 1);
  for (let i = 1; i < pts.length; i++){
    const seg = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
    if (L <= seg || i === pts.length - 1){
      const f = seg > 0 ? L / seg : 0;
      return {x: pts[i-1].x + (pts[i].x - pts[i-1].x) * f, y: pts[i-1].y + (pts[i].y - pts[i-1].y) * f};
    }
    L -= seg;
  }
  return {x: pts[pts.length-1].x, y: pts[pts.length-1].y};
}

function lanePath(team, laneId){
  const lane = LANES.find(l => l.id === laneId);
  return team === 0 ? lane.pts : [...lane.pts].reverse();
}

function screenToWorld(sx, sy){
  return {x: cam.x + sx / SCALE, y: cam.y + sy / SCALE};
}

function unitAtScreen(sx, sy){
  const w = screenToWorld(sx, sy);
  let best = null, bestD = 60;
  for (const u of units){
    if (!u.alive) continue;
    const d = Math.hypot(u.x - w.x, u.y - w.y);
    const rr = u.r + 24;
    if (d < rr && d < bestD){ bestD = d; best = u; }
  }
  return best;
}

function nearestEnemyToPoint(x, y, maxR, team){
  let best = null, bestD = maxR;
  for (const o of units){
    if (!o.alive || o.team === team || o.invuln) continue;
    if (o.team < 0) continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < bestD){ bestD = d; best = o; }
  }
  return best;
}

function isOverHUD(x, y){
  const mSize = 92 * UI, mPad = 10;
  if (x >= mPad && x <= mPad + mSize && y >= mPad && y <= mPad + mSize) return true;
  if (x < mPad + mSize && y > mPad + mSize && y < mPad + mSize + 22) return true;
  if (y < 80 * UI && x > mPad + mSize) return true;
  if (x > W - 200 * UI && y > H - 200 * UI) return true;
  if (Math.hypot(x - SHOP.x, y - SHOP.y) < 30 * UI) return true;
  if (Math.hypot(x - PAUSE.x, y - PAUSE.y) < 26 * UI) return true;
  if (showShop){
    const cards = computeShopItems();
    for (const c of cards){
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return true;
    }
  }
  return false;
}

function distToSeg(x, y, a, b){
  const dx = b.x - a.x, dy = b.y - a.y;
  const L2 = dx * dx + dy * dy;
  let t = 0;
  if (L2 > 0) t = clamp(((x - a.x) * dx + (y - a.y) * dy) / L2, 0, 1);
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
}
function distToPoly(x, y, pts){
  let m = Infinity;
  for (let i = 1; i < pts.length; i++) m = Math.min(m, distToSeg(x, y, pts[i-1], pts[i]));
  return m;
}

// ────────────────────────── Приказы ──────────────────────────
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

// ────────────────────────── Создание юнитов ──────────────────────────
function makeHero(team, isPlayer){
  const p = pointAlong(lanePath(team, 'mid'), 0.04);
  const eb = team === 0 ? BASE1 : BASE0;
  return {
    type:'hero', team, isPlayer: !!isPlayer,
    x: p.x, y: p.y, r: 19,
    hp: 900, maxHp: 900,
    mana: 420, maxMana: 420,
    dmg: 70, range: 250,
    atkInterval: 0.9, atkTimer: 0,
    speed: 215, alive: true,
    facing: Math.atan2(eb.y - p.y, eb.x - p.x),
    level: 1, xp: 0, xpNeeded: 110,
    respawn: 0, aegis: false,
    cds: [0, 0, 0, 0], ablLv: [1, 0, 0, 0],
    dashT: 0, dashVX: 0, dashVY: 0,
    kills: 0, deaths: 0,
    buffT: 0, buffType: null,
    streak: 0, focus: null,
    moveOrder: null, attackMoveOrder: null,
    lanePath: null, laneWp: 1,
    gold: 0, items: {},
    _chaseTgt: null, _chaseUntil: 0,
    el: null, face: null, hpFill: null, mpFill: null, invulnEl: null, barW: 0
  };
}

function makeCreep(team, ranged, laneId, x, y, power){
  const hpS = 1 + waveNum * 0.06;
  const dmS = 1 + waveNum * 0.05;
  const pMul = power === 1 ? 1.6 : (power === 2 ? 2.0 : 1);
  const dMul = power === 1 ? 1.4 : (power === 2 ? 1.7 : 1);
  return {
    type:'creep', team, ranged, laneId, power: power || 0,
    x, y, r: ranged ? 12 : 14,
    hp: (ranged ? 230 : 300) * hpS * pMul,
    maxHp: (ranged ? 230 : 300) * hpS * pMul,
    dmg: (ranged ? 30 : 23) * dmS * dMul,
    range: ranged ? 330 : 80,
    atkInterval: ranged ? 1.4 : 1.0, atkTimer: 0,
    speed: 120, alive: true, facing: 0,
    mana: 0, maxMana: 0,
    path: null, wp: 0,
    lastHitBy: null,
    el: null, face: null, hpFill: null, mpFill: null, invulnEl: null, barW: 0
  };
}

function makeTower(team, x, y, tier){
  return {
    type:'tower', team, tier,
    x, y, r: 30,
    hp: 1500 + tier * 250, maxHp: 1500 + tier * 250,
    dmg: 110 + tier * 10, range: 430,
    atkInterval: 1.1, atkTimer: 0,
    speed: 0, alive: true, facing: 0,
    invuln: false, requires: null,
    mana: 0, maxMana: 0, lastHitBy: null,
    el: null, face: null, hpFill: null, mpFill: null, invulnEl: null, barW: 0
  };
}

function makeRax(team, x, y){
  return {
    type:'rax', team, x, y, r: 26,
    hp: 2200, maxHp: 2200, dmg: 0, range: 0,
    atkInterval: 1, atkTimer: 0, speed: 0, alive: true, facing: 0,
    invuln: false, requires: null, mana: 0, maxMana: 0, lastHitBy: null,
    el: null, face: null, hpFill: null, mpFill: null, invulnEl: null, barW: 0
  };
}

function makeAncient(team, x, y){
  return {
    type:'ancient', team, x, y, r: 46,
    hp: 3800, maxHp: 3800, dmg: 150, range: 420,
    atkInterval: 1.0, atkTimer: 0, speed: 0, alive: true, facing: 0,
    invuln: true, requires: null, mana: 0, maxMana: 0, lastHitBy: null,
    el: null, face: null, hpFill: null, mpFill: null, invulnEl: null, barW: 0
  };
}

function makeRune(x, y){
  const r = rnd();
  const type = r < 0.34 ? 'dd' : (r < 0.68 ? 'haste' : 'bounty');
  return {type:'rune', x, y, r: 16, alive: true, runeType: type};
}

function makeRoshan(){
  return {
    type:'roshan', x: ROSHAN_PIT.x, y: ROSHAN_PIT.y, r: 44, team: -1,
    hp: 2000, maxHp: 2000, dmg: 70, range: 95,
    atkInterval: 1.2, atkTimer: 0, speed: 130, alive: true, facing: 0,
    homeX: ROSHAN_PIT.x, homeY: ROSHAN_PIT.y, respawn: 0, lastHitBy: null,
    aggro: null, slamTimer: 5, level: 1,
    el: null, face: null, hpFill: null, mpFill: null, invulnEl: null, barW: 0
  };
}

function makeJungle(x, y, big, homeX, homeY){
  return {
    type:'jungle', team: -1, big: !!big,
    x, y, r: big ? 18 : 13,
    hp: big ? 780 : 420, maxHp: big ? 780 : 420,
    dmg: big ? 42 : 26, range: 70,
    atkInterval: big ? 1.3 : 1.0, atkTimer: 0,
    speed: big ? 95 : 110, alive: true, facing: 0,
    homeX, homeY, aggro: null, respawn: 90, lastHitBy: null,
    mana: 0, maxMana: 0, campId: 0,
    el: null, face: null, hpFill: null, mpFill: null, invulnEl: null, barW: 0
  };
}

// ────────────────────────── Бой ──────────────────────────
function effDmg(u){ return u.dmg * (u.buffType === 'dd' ? 1.8 : 1); }
function effSpeed(u){ return u.speed * (u.buffType === 'haste' ? 1.4 : 1); }

function addGoldTo(h, amt){
  if (!h || h.type !== 'hero') return;
  if (h.isPlayer) gold += amt;
  else h.gold = (h.gold || 0) + amt;
}

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
  if (tgt.hp <= 0){ tgt.hp = 0; killUnit(tgt, src); }
}

function addEffect(e){ effects.push(e); }
function addFloat(x, y, text, color){
  effects.push({type:'text', x, y, t: 0.9, max: 0.9, text, color});
}

function setBanner(text, color){
  banner = {text, color, t: 2.5, max: 2.5};
}

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

    let msg, col;
    if (!firstBlood){
      firstBlood = true;
      msg = u.isPlayer ? 'ПЕРВАЯ КРОВЬ — ВЫ МЕРТВЫ' : 'ПЕРВАЯ КРОВЬ!';
      col = '#ff5252';
      if (killer && killer.type === 'hero' && killer !== u) addGoldTo(killer, 200);
    } else if (killer && killer.type === 'hero' && killer !== u && !u.isPlayer){
      const s = killer.streak;
      if (s === 2){ msg = 'ДВОЙНОЕ УБИЙСТВО'; col = '#ff9800'; }
      else if (s === 3){ msg = 'ТРОЙНОЕ УБИЙСТВО'; col = '#ff7043'; }
      else if (s >= 4){ msg = 'НЕУДЕРЖИМ! x' + s; col = '#ef5350'; }
      else { msg = 'ВРАЖЕСКИЙ ГЕРОЙ УБИТ'; col = '#7fd4ff'; }
    } else if (u.isPlayer){
      msg = 'ВЫ МЕРТВЫ'; col = '#ff5252';
    } else {
      msg = 'ВРАЖЕСКИЙ ГЕРОЙ УБИТ'; col = '#7fd4ff';
    }
    setBanner(msg, col);
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
      // любая снесённая ракса открывает древнего (чтобы AI мог выигрывать)
      const anc = structs[u.team].ancient;
      if (anc && anc.invuln) anc.invuln = false;
    }
  } else if (u.type === 'ancient'){
    gameOver = u.team === 1 ? 'win' : 'lose';
  }
}

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

// ────────────────────────── ИИ ──────────────────────────
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

  // пассивный доход + авто-покупки
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

  // отступ при низком HP
  if (h.hp < h.maxHp * 0.28){
    const b = h.team === 0 ? BASE0 : BASE1;
    moveToward(h, b.x, b.y, dt);
    if (h.cds[2] <= 0 && h.mana >= ABIL[2].cost && h.ablLv[2] > 0) castAbility(h, 2, {});
    return;
  }

  // бой
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

  // следование по линии
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
    // attack-move: остановка и атака при появлении цели в ренже
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

// ────────────────────────── Способности ──────────────────────────
function castAbility(h, i, opts){
  opts = opts || {};
  const a = ABIL[i];
  if (h.ablLv[i] <= 0) return false;
  if (h.cds[i] > 0 || h.mana < a.cost) return false;
  h.cds[i] = a.cd;
  h.mana -= a.cost;
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

// ────────────────────────── Волны и карта ──────────────────────────
function spawnWave(){
  waveNum++;
  for (let team = 0; team < 2; team++){
    for (let li = 0; li < LANES.length; li++){
      const lane = LANES[li];
      const path = lanePath(team, lane.id);
      const sp = pointAlong(path, 0.02);
      const dir = Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x);
      const px = -Math.sin(dir), py = Math.cos(dir);
      const offs = [-44, -15, 15, 44];
      const allDown = structs[1-team].raxes.every(r => !r.alive);
      const laneDown = !structs[1-team].raxes[li].alive;
      const power = allDown ? 2 : (laneDown ? 1 : 0);
      for (let i = 0; i < 4; i++){
        const ranged = (i === 3);
        const sx = sp.x + px * offs[i] + rndRange(-8, 8);
        const sy = sp.y + py * offs[i] + rndRange(-8, 8);
        const c = makeCreep(team, ranged, lane.id, sx, sy, power);
        c.path = path;
        c.wp = 1;
        c.facing = dir;
        units.push(c);
      }
    }
  }
}

function spawnRune(){
  const spot = RUNE_SPOTS[Math.floor(rnd() * RUNE_SPOTS.length)];
  runes.push(makeRune(spot.x, spot.y));
}

function buildMap(){
  structs = {0: {raxes: [], ancient: null}, 1: {raxes: [], ancient: null}};
  for (let team = 0; team < 2; team++){
    const ancPos = team === 0 ? {x: 210, y: 2190} : {x: 2190, y: 210};
    const anc = makeAncient(team, ancPos.x, ancPos.y);
    units.push(anc);
    structs[team].ancient = anc;

    for (const lane of LANES){
      const path = lanePath(team, lane.id);
      const p1 = pointAlong(path, 0.42);
      const p2 = pointAlong(path, 0.28);
      const p3 = pointAlong(path, 0.17);
      const pr = pointAlong(path, 0.10);

      const T1 = makeTower(team, p1.x, p1.y, 1);
      const T2 = makeTower(team, p2.x, p2.y, 2);
      const T3 = makeTower(team, p3.x, p3.y, 3);
      const RX = makeRax(team, pr.x, pr.y);

      T2.invuln = true; T2.requires = T1;
      T3.invuln = true; T3.requires = T2;
      RX.invuln = true; RX.requires = T3;

      units.push(T1, T2, T3, RX);
      structs[team].raxes.push(RX);
    }
  }
}

function buildJungle(){
  for (let ci = 0; ci < JUNGLE_CAMPS.length; ci++){
    const camp = JUNGLE_CAMPS[ci];
    const big = makeJungle(camp.x, camp.y, true, camp.x, camp.y);
    big.campId = ci;
    units.push(big);
    for (let i = 0; i < 2; i++){
      const a = rndRange(0, TAU);
      const s = makeJungle(camp.x + Math.cos(a) * 55, camp.y + Math.sin(a) * 55, false, camp.x, camp.y);
      s.campId = ci;
      units.push(s);
    }
  }
}

function buildDecorations(){
  decorations = [];
  for (let i = 0; i < 260; i++){
    const x = rndRange(60, WORLD - 60), y = rndRange(60, WORLD - 60);
    let nearLane = false;
    for (const lane of LANES){
      if (distToPoly(x, y, lane.pts) < 170){ nearLane = true; break; }
    }
    if (Math.abs(x + y - WORLD) < 170) nearLane = true;
    if (Math.hypot(x - ROSHAN_PIT.x, y - ROSHAN_PIT.y) < 190) nearLane = true;
    if (nearLane) continue;
    const r = rnd();
    decorations.push({
      x, y,
      type: r < 0.7 ? 'tree' : (r < 0.9 ? 'bush' : 'rock'),
      s: rndRange(0.7, 1.6),
      c: rndRange(0, 1)
    });
  }
}

// ────────────────────────── Сброс и цикл ──────────────────────────
function reset(){
  units = [];
  projectiles = [];
  effects = [];
  runes = [];
  gameOver = null;
  gameTime = 0;
  waveNum = 0;
  waveTimer = FIRST_WAVE;
  runeTimer = 40;
  camInit = false;
  _seed = 987654321;
  gold = 600;
  itemOwned.boots = 0; itemOwned.blade = 0; itemOwned.vital = 0; itemOwned.mana = 0;
  showShop = false;

  moveMarker = null;
  hoverUnit = null;
  camOffset.x = 0; camOffset.y = 0;
  camDragging = false;
  pendingAbility = -1;
  attackMoveMode = false;
  firstBlood = false;
  banner = null;
  paused = false;

  mapLayer.innerHTML = '';
  unitLayer.innerHTML = '';
  projLayer.innerHTML = '';
  fxLayer.innerHTML = '';
  runeLayer.innerHTML = '';
  hudLayer.innerHTML = '';

  buildMap();
  buildDecorations();
  buildJungle();

  player = makeHero(0, true);
  enemyHero = makeHero(1, false);
  units.push(player, enemyHero);
  roshan = makeRoshan();
  units.push(roshan);

  cam.x = player.x - W / (2 * SCALE);
  cam.y = player.y - H / (2 * SCALE);

  buildWorld();
}

function updateCamera(dt){
  if (!camDragging){
    const decay = Math.pow(0.02, dt);
    camOffset.x *= decay;
    camOffset.y *= decay;
    if (Math.abs(camOffset.x) < 0.5) camOffset.x = 0;
    if (Math.abs(camOffset.y) < 0.5) camOffset.y = 0;
  }

  const vw = W / SCALE, vh = H / SCALE;
  let tx = player.x - vw / 2 + camOffset.x;
  let ty = player.y - vh / 2 + camOffset.y;
  if (vw >= WORLD) tx = (WORLD - vw) / 2; else tx = clamp(tx, 0, WORLD - vw);
  if (vh >= WORLD) ty = (WORLD - vh) / 2; else ty = clamp(ty, 0, WORLD - vh);

  if (camDragging){
    cam.x = tx; cam.y = ty; camInit = true;
  } else {
    if (!camInit){ cam.x = tx; cam.y = ty; camInit = true; }
    const k = 1 - Math.pow(0.0008, dt);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
  }
}

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

  for (let i = effects.length - 1; i >= 0; i--){
    effects[i].t -= dt;
    if (effects[i].t <= 0) effects.splice(i, 1);
  }

  if (banner){ banner.t -= dt; if (banner.t <= 0) banner = null; }
  if (moveMarker){ moveMarker.t -= dt; if (moveMarker.t <= 0) moveMarker = null; }

  runes = runes.filter(r => r.alive);

  for (let i = units.length - 1; i >= 0; i--){
    const u = units[i];
    if (!u.alive && u.type !== 'hero' && u.type !== 'roshan' && u.type !== 'jungle'){
      if (u.el && u.el.parentNode) u.el.parentNode.removeChild(u.el);
      units.splice(i, 1);
    }
  }
}

// ────────────────────────── Инициализация слоёв ──────────────────────────
worldEl   = el('g', {}, svg);
mapLayer  = el('g', {}, worldEl);
unitLayer = el('g', {}, worldEl);
projLayer = el('g', {}, worldEl);
fxLayer   = el('g', {}, worldEl);
runeLayer = el('g', {}, worldEl);
hudLayer  = el('g', {}, svg);