'use strict';

// ────────────────────────── Фабрики юнитов ──────────────────────────

function makeHero(team, isPlayer){
  const p = pointAlong(lanePath(team, 'mid'), 0.04);
  const eb = team === 0 ? BASE1 : BASE0;
  return {
    type:'hero', team, isPlayer: !!isPlayer,
    x: p.x, y: p.y, r: 19,
    hp: 900, maxHp: 900,
    mana: 420, maxMana: 420,
    dmg: 70, range: 150,
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
    range: ranged ? 150 : 80,
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
    dmg: 110 + tier * 10, range: 200,
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
    hp: 3800, maxHp: 3800, dmg: 150, range: 250,
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