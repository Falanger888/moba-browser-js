'use strict';

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