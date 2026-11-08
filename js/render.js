'use strict';

// ────────────────────────── Статичный мир ──────────────────────────
function buildWorld(){
  let s = '';
  s += `<rect x="0" y="0" width="${WORLD}" height="${WORLD}" fill="${COL.ground}"/>`;

  for (let i = 0; i < 60; i++){
    const x = (i * 197.3) % WORLD;
    const y = (i * 411.7) % WORLD;
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="90" ry="70" fill="${COL.ground2}" opacity="0.5"/>`;
  }

  s += `<path d="M -400 ${WORLD + 400} L ${WORLD + 400} -400" stroke="${COL.river}" stroke-width="320" fill="none"/>`;
  s += `<path d="M -400 ${WORLD + 400} L ${WORLD + 400} -400" stroke="${COL.riverC}" stroke-width="230" fill="none" opacity="0.6"/>`;

  for (const lane of LANES){
    const pts = lane.pts;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
    s += `<path d="${d}" stroke="${COL.lane}" stroke-width="150" fill="none" stroke-linejoin="round"/>`;
    s += `<path d="${d}" stroke="${COL.laneC}" stroke-width="110" fill="none" opacity="0.7" stroke-linejoin="round"/>`;
  }

  s += `<g transform="translate(${ROSHAN_PIT.x},${ROSHAN_PIT.y})">
    <circle r="150" fill="#0a140c" opacity="0.9"/>
    <circle r="150" fill="none" stroke="#5a4326" stroke-width="12" opacity="0.85"/>
    <circle r="118" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="6"/>
    <circle r="64" fill="#111f15"/>
    <circle r="64" fill="none" stroke="rgba(201,138,61,0.25)" stroke-width="4"/>
  </g>`;

  for (const camp of JUNGLE_CAMPS){
    s += `<circle cx="${camp.x}" cy="${camp.y}" r="72" fill="rgba(0,0,0,0.18)" stroke="rgba(120,100,60,0.3)" stroke-width="4"/>`;
  }

  for (const d of decorations){
    if (d.type === 'tree'){
      const sz = 16 * d.s;
      s += `<g transform="translate(${d.x.toFixed(1)},${d.y.toFixed(1)})">
        <ellipse cx="0" cy="${(sz*0.5).toFixed(1)}" rx="${(sz*0.8).toFixed(1)}" ry="${(sz*0.35).toFixed(1)}" fill="rgba(0,0,0,0.3)"/>
        <circle cx="0" cy="0" r="${sz.toFixed(1)}" fill="${d.c > 0.5 ? '#1e3a1a' : '#274720'}"/>
        <circle cx="${(-sz*0.25).toFixed(1)}" cy="${(-sz*0.25).toFixed(1)}" r="${(sz*0.55).toFixed(1)}" fill="rgba(96,150,76,0.35)"/>
      </g>`;
    } else if (d.type === 'bush'){
      const sz = 13 * d.s;
      s += `<ellipse cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" rx="${sz.toFixed(1)}" ry="${(sz*0.7).toFixed(1)}" fill="rgba(38,72,32,0.9)"/>`;
    } else {
      const sz = 11 * d.s;
      s += `<g transform="translate(${d.x.toFixed(1)},${d.y.toFixed(1)})">
        <circle cx="0" cy="0" r="${sz.toFixed(1)}" fill="#4a4a4a"/>
        <circle cx="${(-sz*0.25).toFixed(1)}" cy="${(-sz*0.25).toFixed(1)}" r="${(sz*0.55).toFixed(1)}" fill="#6a6a6a"/>
      </g>`;
    }
  }

  mapLayer.innerHTML = s;
}

// ────────────────────────── Узлы юнитов ──────────────────────────
function buildBars(u, g){
  const w = u.type === 'hero' ? 52 : (u.type === 'tower' || u.type === 'ancient' ? 64 : 28);
  u.barW = w;
  const h = u.type === 'hero' ? 6 : (u.type === 'creep' ? 4 : 7);
  const x = -w / 2, y = -u.r - (u.type === 'hero' ? 20 : 14);
  el('rect', {x:x-1.5, y:y-1.5, width:w+3, height:h+3, rx:1.5, fill:'rgba(0,0,0,0.6)'}, g);
  u.hpFill = el('rect', {x:x, y:y, width:w, height:h, rx:1, fill: u.team === 0 ? '#4fc3f7' : '#ef5350'}, g);
  if (u.type === 'hero'){
    el('rect', {x:x-1.5, y:y+h+1, width:w+3, height:5, fill:'rgba(0,0,0,0.6)'}, g);
    u.mpFill = el('rect', {x:x, y:y+h+2.5, width:w, height:2.5, fill:'#42a5f5'}, g);
  }
}

function buildUnitNode(u){
  const g = el('g', {transform:`translate(${u.x},${u.y})`}, unitLayer);
  u.el = g;

  el('ellipse', {cx:0, cy:u.r*0.55, rx:u.r*1.05, ry:u.r*0.42, fill:'rgba(0,0,0,0.35)'}, g);
  u.face = el('g', {}, g);

  if (u.type === 'hero'){
    const c1 = u.team === 0 ? '#2f8fd0' : '#d04545';
    const c2 = u.team === 0 ? '#a9e2ff' : '#ffb0b0';
    el('line', {x1:0, y1:0, x2:u.r*2, y2:0, stroke:'rgba(255,255,255,0.35)', 'stroke-width':5, 'stroke-linecap':'round'}, u.face);
    el('circle', {cx:0, cy:0, r:u.r, fill:c1, stroke:c2, 'stroke-width':3}, u.face);
    el('circle', {cx:-u.r*0.3, cy:-u.r*0.3, r:u.r*0.4, fill:'rgba(255,255,255,0.5)'}, u.face);
    if (u.isPlayer){
      el('circle', {cx:0, cy:0, r:u.r+7, fill:'none', stroke:'rgba(255,255,255,0.4)', 'stroke-width':2}, g);
    }
  } else if (u.type === 'creep'){
    const c1 = u.team === 0 ? '#3d8fc4' : '#c44a4a';
    const c2 = u.power > 0 ? '#ffd54f' : (u.team === 0 ? '#9fdcff' : '#ffb0b0');
    el('circle', {cx:0, cy:0, r:u.r, fill:c1, stroke:c2, 'stroke-width': u.power > 0 ? 3 : 2}, u.face);
    if (u.ranged){
      el('line', {x1:0, y1:0, x2:u.r*1.6, y2:0, stroke:'#ffe9a8', 'stroke-width':3, 'stroke-linecap':'round'}, u.face);
      el('circle', {cx:0, cy:0, r:u.r*0.42, fill:'#ffe9a8'}, u.face);
    }
  } else if (u.type === 'tower'){
    const c1 = u.team === 0 ? '#2f6f96' : '#96302f';
    const c2 = u.team === 0 ? '#7fd4ff' : '#ff9d9d';
    el('path', {d:`M ${-u.r} ${u.r*0.6} L 0 ${-u.r*1.1} L ${u.r} ${u.r*0.6} Z`, fill:'#2b2b2b', stroke:c2, 'stroke-width':2}, u.face);
    el('circle', {cx:0, cy:u.r*0.35, r:u.r*0.85, fill:'#2b2b2b', stroke:c2, 'stroke-width':2}, u.face);
    el('circle', {cx:0, cy:u.r*0.35, r:u.r*0.6, fill:c1}, u.face);
    el('circle', {cx:0, cy:-u.r*0.9, r:u.r*0.4, fill:c2}, u.face);
    for (let i = 0; i < u.tier; i++){
      el('circle', {cx:(-u.tier/2 + 0.5 + i) * u.r * 0.5, cy:-u.r*0.55, r:u.r*0.14, fill:'#ffd54f'}, u.face);
    }
  } else if (u.type === 'rax'){
    const c1 = u.team === 0 ? '#2f6f96' : '#96302f';
    const c2 = u.team === 0 ? '#7fd4ff' : '#ff9d9d';
    el('rect', {x:-u.r*0.9, y:-u.r*0.6, width:u.r*1.8, height:u.r*1.2, rx:3, fill:c1, stroke:c2, 'stroke-width':2}, u.face);
    el('rect', {x:-u.r*0.5, y:-u.r*0.2, width:u.r*1.0, height:u.r*0.4, fill:'#2b2b2b'}, u.face);
    el('path', {d:`M 0 ${-u.r*0.6} L 0 ${-u.r*1.0}`, stroke:c2, 'stroke-width':3}, u.face);
    el('circle', {cx:0, cy:-u.r*1.0, r:u.r*0.28, fill:c2}, u.face);
  } else if (u.type === 'ancient'){
    const c1 = u.team === 0 ? '#2f6f96' : '#96302f';
    const c2 = u.team === 0 ? '#7fd4ff' : '#ff9d9d';
    el('circle', {cx:0, cy:0, r:u.r, fill:c1, stroke:c2, 'stroke-width':4}, u.face);
    el('path', {d:`M 0 ${-u.r*0.75} L ${u.r*0.45} 0 L 0 ${u.r*0.75} L ${-u.r*0.45} 0 Z`, fill:c2}, u.face);
    el('circle', {cx:0, cy:0, r:u.r*1.2, fill:'none', stroke:'rgba(0,0,0,0.25)', 'stroke-width':6}, g);
  } else if (u.type === 'roshan'){
    el('circle', {cx:0, cy:0, r:u.r, fill:'#7a4a1f', stroke:'#c98a3d', 'stroke-width':4}, u.face);
    el('circle', {cx:0, cy:0, r:u.r*0.55, fill:'#5a3414'}, u.face);
    el('path', {d:`M ${-u.r*0.7} ${-u.r*0.4} L ${-u.r*0.7} ${-u.r*0.9} L ${-u.r*0.3} ${-u.r*0.6} Z`, fill:'#c98a3d'}, u.face);
    el('path', {d:`M ${u.r*0.7} ${-u.r*0.4} L ${u.r*0.7} ${-u.r*0.9} L ${u.r*0.3} ${-u.r*0.6} Z`, fill:'#c98a3d'}, u.face);
    el('circle', {cx:-u.r*0.28, cy:-u.r*0.3, r:u.r*0.16, fill:'#ffd54f'}, u.face);
    el('circle', {cx:u.r*0.28, cy:-u.r*0.3, r:u.r*0.16, fill:'#ffd54f'}, u.face);
    const label = el('text', {x:0, y:-u.r-34, 'text-anchor':'middle', 'font-size':12, 'font-weight':'bold', fill:'#ffd54f'}, g);
    label.textContent = 'РОШАН';
  } else if (u.type === 'jungle'){
    const c1 = u.big ? '#6d4c2f' : '#7d6a3a';
    const c2 = u.big ? '#e0a05a' : '#c9b06a';
    el('circle', {cx:0, cy:0, r:u.r, fill:c1, stroke:c2, 'stroke-width':2}, u.face);
    el('path', {d:`M ${-u.r*0.5} ${-u.r*0.5} L ${-u.r*0.75} ${-u.r*1.0} L ${-u.r*0.15} ${-u.r*0.7} Z`, fill:c2}, u.face);
    el('path', {d:`M ${u.r*0.5} ${-u.r*0.5} L ${u.r*0.75} ${-u.r*1.0} L ${u.r*0.15} ${-u.r*0.7} Z`, fill:c2}, u.face);
    el('circle', {cx:-u.r*0.3, cy:-u.r*0.2, r:u.r*0.14, fill:'#ffd54f'}, u.face);
    el('circle', {cx:u.r*0.3, cy:-u.r*0.2, r:u.r*0.14, fill:'#ffd54f'}, u.face);
  }

  buildBars(u, g);

  if (u.invuln){
    u.invulnEl = el('circle', {cx:0, cy:0, r:u.r+9, fill:'none', stroke:'rgba(255,235,140,0.75)', 'stroke-width':3, 'stroke-dasharray':'8 8'}, g);
  } else {
    u.invulnEl = null;
  }
}

function updateUnitNode(u){
  u.el.setAttribute('transform', `translate(${u.x},${u.y})`);
  u.el.setAttribute('display', u.alive ? '' : 'none');
  if (u.face && (u.type === 'hero' || u.type === 'creep' || u.type === 'roshan')){
    u.face.setAttribute('transform', `rotate(${u.facing * 180 / Math.PI})`);
  }
  if (u.hpFill){
    const frac = clamp(u.hp / u.maxHp, 0, 1);
    u.hpFill.setAttribute('width', (u.barW * frac).toFixed(1));
    u.hpFill.setAttribute('fill', u.team === 0 ? '#4fc3f7' : '#ef5350');
  }
  if (u.mpFill){
    const frac = clamp(u.mana / u.maxMana, 0, 1);
    u.mpFill.setAttribute('width', (u.barW * frac).toFixed(1));
  }
  if (u.invulnEl){
    u.invulnEl.setAttribute('display', u.invuln ? '' : 'none');
  }
}

// ────────────────────────── Динамические слои ──────────────────────────
function renderProjectiles(){
  let s = '';
  for (const p of projectiles){
    s += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${p.color}"/>`;
    s += `<circle cx="${p.x}" cy="${p.y}" r="${(p.r*1.9).toFixed(1)}" fill="${p.color}" opacity="0.25"/>`;
  }
  projLayer.innerHTML = s;
}

function renderEffects(){
  let s = '';

  if (moveMarker){
    const k = 1 - moveMarker.t / moveMarker.max;
    const col = moveMarker.attack ? '#ff5252' : '#66ff66';
    const r = 8 + k * 24;
    const op = (1 - k) * 0.85;
    s += `<circle cx="${moveMarker.x}" cy="${moveMarker.y}" r="${r.toFixed(1)}" fill="none" stroke="${col}" stroke-width="2.5" opacity="${op.toFixed(2)}"/>`;
    s += `<circle cx="${moveMarker.x}" cy="${moveMarker.y}" r="3" fill="${col}" opacity="${op.toFixed(2)}"/>`;
  }

  if (hoverUnit && hoverUnit.alive && player && player.alive && hoverUnit.team !== player.team){
    const col = hoverUnit.team === -1 ? '#ffd54f' : '#ff5252';
    s += `<circle cx="${hoverUnit.x}" cy="${hoverUnit.y}" r="${hoverUnit.r + 7}" fill="none" stroke="${col}" stroke-width="2" opacity="0.65"/>`;
  }

  if (pendingAbility >= 0 && player && player.alive && !gameOver){
    const a = ABIL[pendingAbility];
    if (pendingAbility === 0 || pendingAbility === 1){
      let ex = mouseWorld.x, ey = mouseWorld.y;
      const dx = ex - player.x, dy = ey - player.y;
      const d = Math.hypot(dx, dy);
      const maxR = 700;
      if (d > maxR){ ex = player.x + dx/d*maxR; ey = player.y + dy/d*maxR; }
      s += `<line x1="${player.x}" y1="${player.y}" x2="${ex}" y2="${ey}" stroke="${a.color}" stroke-width="3" stroke-dasharray="8 6" opacity="0.8"/>`;
      s += `<circle cx="${ex}" cy="${ey}" r="14" fill="none" stroke="${a.color}" stroke-width="2" opacity="0.8"/>`;
      s += `<circle cx="${ex}" cy="${ey}" r="4" fill="${a.color}" opacity="0.9"/>`;
    } else if (pendingAbility === 2){
      s += `<circle cx="${player.x}" cy="${player.y}" r="${player.r + 15}" fill="none" stroke="${a.color}" stroke-width="2" opacity="0.8" stroke-dasharray="4 4"/>`;
    } else if (pendingAbility === 3){
      const R = 280, castRange = 550;
      let cx = mouseWorld.x, cy = mouseWorld.y;
      const dx = cx - player.x, dy = cy - player.y;
      const d = Math.hypot(dx, dy);
      if (d > castRange){ cx = player.x + dx/d*castRange; cy = player.y + dy/d*castRange; }
      s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${a.color}" fill-opacity="0.15" stroke="${a.color}" stroke-width="2" opacity="0.85"/>`;
      s += `<circle cx="${cx}" cy="${cy}" r="6" fill="${a.color}" opacity="0.9"/>`;
    }
  }

  for (const e of effects){
    const k = 1 - e.t / e.max;
    if (e.type === 'ring'){
      const r = lerp(e.r0, e.r1, k);
      s += `<circle cx="${e.x}" cy="${e.y}" r="${r.toFixed(1)}" fill="none" stroke="${e.color}" stroke-width="${(5*(1-k)+1).toFixed(1)}" opacity="${(1-k).toFixed(2)}"/>`;
    } else if (e.type === 'hit'){
      s += `<circle cx="${e.x}" cy="${e.y}" r="${(16*(1-k)+4).toFixed(1)}" fill="rgba(255,240,180,${(1-k).toFixed(2)})"/>`;
    } else if (e.type === 'flash'){
      s += `<circle cx="${e.x}" cy="${e.y}" r="${e.r}" fill="${e.color}" opacity="${((1-k)*0.7).toFixed(2)}"/>`;
    }  else if (e.type === 'text'){
      s += `<text x="${e.x}" y="${e.y - k*40}" text-anchor="middle" font-size="22" font-weight="bold" fill="${e.color}" opacity="${(1-k).toFixed(2)}">${e.text}</text>`;
    } else if (e.type === 'dmg'){
      const rise = k * 40;
      const fade = Math.max(0, 1 - k * 1.2);
      s += `<text x="${e.x}" y="${(e.y - rise).toFixed(1)}" text-anchor="middle" font-size="${(15*UI).toFixed(1)}" font-weight="bold" fill="${e.color}" stroke="rgba(0,0,0,0.75)" stroke-width="3" paint-order="stroke" opacity="${fade.toFixed(2)}">${e.text}</text>`;
    }
  }

  if (player && player.focus && player.focus.alive){
    const f = player.focus;
    s += `<circle cx="${f.x}" cy="${f.y}" r="${f.r + 10}" fill="none" stroke="#ffd54f" stroke-width="3" stroke-dasharray="6 6" opacity="0.8"/>`;
  }
  // таймеры респавна мёртвых героев
  for (const u of units){
    if (u.type !== 'hero' || u.alive || u.respawn <= 0) continue;
    const sec = Math.ceil(u.respawn);
    const col = u.isPlayer ? '#4fc3f7' : '#ef5350';
    s += `<g transform="translate(${u.x},${u.y})" opacity="0.85">`;
    s += `<circle r="24" fill="rgba(0,0,0,0.55)" stroke="${col}" stroke-width="2.5"/>`;
    s += `<text y="6" text-anchor="middle" font-size="18" font-weight="bold" fill="#fff">${sec}</text>`;
    s += `</g>`;
  }
  fxLayer.innerHTML = s;
}

function renderRunes(){
  let s = '';
  for (const r of runes){
    if (!r.alive) continue;
    const col = r.runeType === 'dd' ? '#ff7043' : (r.runeType === 'haste' ? '#42a5f5' : '#ffd54f');
    s += `<g transform="translate(${r.x},${r.y})">`;
    s += `<circle r="${r.r+8}" fill="${col}" opacity="0.25"/>`;
    s += `<circle r="${r.r}" fill="${col}" stroke="#fff" stroke-width="2"/>`;
    s += `<circle r="${(r.r*0.45).toFixed(1)}" fill="#fff" opacity="0.8"/>`;
    s += `</g>`;
  }
  runeLayer.innerHTML = s;
}

// ────────────────────────── HUD ──────────────────────────
function minimapSVG(){
  const size = 92 * UI, pad = 10;
  const k = size / WORLD;
  let s = `<g opacity="0.92">`;
  s += `<rect x="${pad}" y="${pad}" width="${size}" height="${size}" fill="#08120a" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;
  for (const lane of LANES){
    const p0 = lane.pts[0];
    let d = `M ${(pad + p0.x * k).toFixed(1)} ${(pad + p0.y * k).toFixed(1)}`;
    for (let i = 1; i < lane.pts.length; i++){
      d += ` L ${(pad + lane.pts[i].x * k).toFixed(1)} ${(pad + lane.pts[i].y * k).toFixed(1)}`;
    }
    s += `<path d="${d}" fill="none" stroke="rgba(140,118,72,0.85)" stroke-width="${(8*k).toFixed(2)}"/>`;
  }
  for (const u of units){
    if (!u.alive) continue;
    const px = pad + u.x * k, py = pad + u.y * k;
    let r = u.type === 'hero' ? 3.2 : (u.type === 'tower' ? 2.4 : (u.type === 'ancient' ? 3.6 : (u.type === 'roshan' ? 3 : 1.6)));
    let fill = teamColor(u.team);
    if (u.type === 'jungle'){ fill = '#aed581'; r = 1.8; }
    s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r}" fill="${fill}"/>`;
    if (u === player) s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r+1.5}" fill="none" stroke="#fff" stroke-width="1"/>`;
  }
  const vw = W / SCALE, vh = H / SCALE;
  s += `<rect x="${(pad + cam.x * k).toFixed(1)}" y="${(pad + cam.y * k).toFixed(1)}" width="${(vw * k).toFixed(1)}" height="${(vh * k).toFixed(1)}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>`;
  s += `</g>`;
  return s;
}

function topBarSVG(){
  const mw = 92 * UI, pad = 10;
  const left = pad + mw + 8;
  const right = W - 10;
  const w = right - left;
  const barW = w * 0.62;
  const bx = left + (w - barW) / 2;

  let s = '';
  s += `<text x="${left}" y="26" font-size="${(14*UI).toFixed(1)}" font-weight="bold" fill="#ffd54f">УР ${player.level}</text>`;
  s += `<text x="${left}" y="44" font-size="${(12*UI).toFixed(1)}" fill="#ffd54f">🪙 ${Math.round(gold)}</text>`;
  s += `<text x="${left}" y="60" font-size="${(11*UI).toFixed(1)}" fill="#fff" opacity="0.8">${player.kills}/${player.deaths}</text>`;
  s += `<text x="${left}" y="76" font-size="${(11*UI).toFixed(1)}" fill="rgba(200,220,255,0.85)">Волна ${waveNum} · ${Math.ceil(Math.max(0, waveTimer))}с</text>`;
  if (player.aegis){
    s += `<text x="${left}" y="92" font-size="${(11*UI).toFixed(1)}" fill="#ffd54f">🛡️ Эгида</text>`;
  }

  s += `<rect x="${bx-2}" y="10" width="${barW+4}" height="${12*UI+4}" rx="3" fill="rgba(0,0,0,0.6)"/>`;
  s += `<rect x="${bx}" y="12" width="${barW}" height="${12*UI}" rx="2" fill="#2e7d32"/>`;
  s += `<rect x="${bx}" y="12" width="${(barW*clamp(player.hp/player.maxHp,0,1)).toFixed(1)}" height="${12*UI}" rx="2" fill="#66bb6a"/>`;
  s += `<text x="${bx+barW/2}" y="${12+9*UI}" font-size="${(10*UI).toFixed(1)}" text-anchor="middle" fill="#fff" font-weight="bold">${Math.ceil(player.hp)}/${Math.round(player.maxHp)}</text>`;

  const my = 12 + 12 * UI + 4;
  s += `<rect x="${bx-2}" y="${my-2}" width="${barW+4}" height="${8*UI+4}" rx="3" fill="rgba(0,0,0,0.6)"/>`;
  s += `<rect x="${bx}" y="${my}" width="${barW}" height="${8*UI}" rx="2" fill="#1565c0"/>`;
  s += `<rect x="${bx}" y="${my}" width="${(barW*clamp(player.mana/player.maxMana,0,1)).toFixed(1)}" height="${8*UI}" rx="2" fill="#42a5f5"/>`;

  const xpY = my + 8 * UI + 3;
  s += `<rect x="${bx-2}" y="${xpY-1.5}" width="${barW+4}" height="5" rx="2" fill="rgba(0,0,0,0.6)"/>`;
  s += `<rect x="${bx}" y="${xpY}" width="${(barW*clamp(player.xp/player.xpNeeded,0,1)).toFixed(1)}" height="3" rx="1.5" fill="#ffd54f"/>`;
  // HP-бар врага под своим
  if (enemyHero && enemyHero.alive){
    const ey = xpY + 10;
    s += `<rect x="${bx}" y="${ey}" width="${barW}" height="${(5*UI).toFixed(1)}" rx="2" fill="rgba(0,0,0,0.6)"/>`;
    s += `<rect x="${bx}" y="${ey}" width="${(barW * clamp(enemyHero.hp/enemyHero.maxHp,0,1)).toFixed(1)}" height="${(5*UI).toFixed(1)}" rx="2" fill="#ef5350"/>`;
    s += `<text x="${bx + barW - 2}" y="${(ey + 4*UI).toFixed(1)}" font-size="${(7*UI).toFixed(1)}" fill="rgba(255,255,255,0.85)" text-anchor="end">ВРАГ ${Math.ceil(enemyHero.hp)}</text>`;
  }
  const mm = Math.floor(gameTime / 60), ss = Math.floor(gameTime % 60);
  s += `<text x="${right}" y="26" font-size="${(15*UI).toFixed(1)}" font-weight="bold" fill="#fff" text-anchor="end">${pad2(mm)}:${pad2(ss)}</text>`;

  if (player.buffT > 0){
    s += `<text x="${right}" y="46" font-size="${(11*UI).toFixed(1)}" fill="#ffd54f" text-anchor="end">${player.buffType === 'dd' ? 'УРОН' : 'СКОРОСТЬ'} ${Math.ceil(player.buffT)}с</text>`;
  }

  const itW = 26 * UI, itGap = 5 * UI, itY = 66 * UI;
  const itX0 = right - 4 * itW - 3 * itGap;
  for (let i = 0; i < 4; i++){
    const it = ITEMS[i];
    const owned = itemOwned[it.id] > 0;
    s += `<rect x="${(itX0 + i*(itW+itGap)).toFixed(1)}" y="${itY.toFixed(1)}" width="${itW.toFixed(1)}" height="${itW.toFixed(1)}" rx="4" fill="${owned ? hexA(it.color, 0.55) : 'rgba(0,0,0,0.4)'}" stroke="${owned ? it.color : 'rgba(255,255,255,0.25)'}" stroke-width="1"/>`;
  }

  return s;
}

function buttonsSVG(){
  let s = '';
  for (let i = 0; i < 4; i++){
    const b = BTN.pos[i];
    if (!b) continue;
    const a = ABIL[i];
    const r = BTN.r;
    const cd = player.cds[i];
    const onCd = cd > 0;
    const lv = player.ablLv[i];
    const locked = lv === 0;
    const noMana = player.mana < a.cost;
    const dimmed = locked || noMana;

    const fill = onCd ? 'rgba(30,30,30,0.78)' : hexA(a.color, dimmed ? 0.14 : 0.32);
    const stroke = locked ? 'rgba(80,80,80,0.6)' : (noMana ? 'rgba(120,120,120,0.6)' : a.color);
    s += `<circle cx="${b.x}" cy="${b.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;

    if (pendingAbility === i){
      s += `<circle cx="${b.x}" cy="${b.y}" r="${r + 4}" fill="none" stroke="${a.color}" stroke-width="2" opacity="0.9" stroke-dasharray="4 4"/>`;
    }

    if (onCd){
      const frac = clamp(cd / a.cd, 0, 1);
      const endAng = -Math.PI / 2 + TAU * frac;
      const ex = b.x + Math.cos(endAng) * (r - 1);
      const ey = b.y + Math.sin(endAng) * (r - 1);
      const large = frac > 0.5 ? 1 : 0;
      s += `<path d="M ${b.x} ${b.y} L ${b.x} ${b.y - r + 1} A ${r-1} ${r-1} 0 ${large} 1 ${ex.toFixed(1)} ${ey.toFixed(1)} Z" fill="rgba(0,0,0,0.62)"/>`;
      s += `<text x="${b.x}" y="${b.y+1}" font-size="${(r*0.7).toFixed(1)}" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="middle">${Math.ceil(cd)}</text>`;
    } else {
      const txtFill = locked ? 'rgba(255,255,255,0.3)' : (noMana ? 'rgba(255,255,255,0.4)' : '#fff');
      s += `<text x="${b.x}" y="${b.y+1}" font-size="${(r*0.62).toFixed(1)}" font-weight="bold" fill="${txtFill}" text-anchor="middle" dominant-baseline="middle">${a.name}</text>`;
    }

    if (lv > 0){
      const bx2 = (b.x + r*0.62).toFixed(1);
      const by2 = (b.y - r*0.62).toFixed(1);
      s += `<circle cx="${bx2}" cy="${by2}" r="${(r*0.22).toFixed(1)}" fill="#000" opacity="0.7"/>`;
      s += `<text x="${bx2}" y="${by2}" font-size="${(r*0.3).toFixed(1)}" fill="#ffd54f" text-anchor="middle" dominant-baseline="middle">${lv}</text>`;
    }

    s += `<text x="${b.x}" y="${(b.y + r*0.72).toFixed(1)}" font-size="${(9*UI).toFixed(1)}" fill="${dimmed ? '#ff7676' : 'rgba(140,200,255,0.9)'}" text-anchor="middle" dominant-baseline="middle">${a.cost}</text>`;
    s += `<text x="${b.x}" y="${(b.y - r*1.35).toFixed(1)}" font-size="${(9*UI).toFixed(1)}" fill="rgba(255,255,255,0.55)" text-anchor="middle">${a.name}</text>`;
  }
  return s;
}

function computeShopItems(){
  const cards = [];
  const cw = 88 * UI, ch = 74 * UI, gap = 8 * UI;
  const total = ITEMS.length * cw + (ITEMS.length - 1) * gap;
  const x0 = (W - total) / 2;
  const y0 = 130 * UI;
  ITEMS.forEach((it, i) => {
    cards.push({id: it.id, x: x0 + i * (cw + gap), y: y0, w: cw, h: ch});
  });
  return cards;
}

function shopSVG(){
  let s = `<circle cx="${SHOP.x}" cy="${SHOP.y}" r="${(22*UI).toFixed(1)}" fill="${showShop ? 'rgba(255,213,79,0.3)' : 'rgba(0,0,0,0.45)'}" stroke="${showShop ? '#ffd54f' : 'rgba(255,255,255,0.3)'}" stroke-width="2"/>`;
  s += `<text x="${SHOP.x}" y="${SHOP.y+1}" font-size="${(18*UI).toFixed(1)}" text-anchor="middle" dominant-baseline="middle">🛒</text>`;
  s += `<text x="${SHOP.x}" y="${(SHOP.y + 34*UI).toFixed(1)}" font-size="${(9*UI).toFixed(1)}" fill="rgba(255,255,255,0.55)" text-anchor="middle">B</text>`;

  if (showShop){
    const cards = computeShopItems();
    for (const c of cards){
      const it = ITEMS.find(i => i.id === c.id);
      const can = gold >= it.cost && itemOwned[it.id] < 1;
      s += `<rect x="${c.x.toFixed(1)}" y="${c.y.toFixed(1)}" width="${c.w.toFixed(1)}" height="${c.h.toFixed(1)}" rx="8" fill="rgba(10,16,12,0.92)" stroke="${can ? it.color : 'rgba(255,255,255,0.2)'}" stroke-width="1.5"/>`;
      s += `<circle cx="${(c.x+c.w/2).toFixed(1)}" cy="${(c.y+20*UI).toFixed(1)}" r="${(12*UI).toFixed(1)}" fill="${it.color}"/>`;
      s += `<text x="${(c.x+c.w/2).toFixed(1)}" y="${(c.y+44*UI).toFixed(1)}" font-size="${(11*UI).toFixed(1)}" font-weight="bold" fill="#fff" text-anchor="middle">${it.label}</text>`;
      s += `<text x="${(c.x+c.w/2).toFixed(1)}" y="${(c.y+60*UI).toFixed(1)}" font-size="${(10*UI).toFixed(1)}" fill="${can ? '#ffd54f' : '#ff7676'}" text-anchor="middle">${it.cost}🪙</text>`;
    }
  }
  return s;
}

function respawnSVG(){
  return `<rect x="0" y="0" width="${W}" height="${H}" fill="rgba(0,0,0,0.45)"/>
  <text x="${W/2}" y="${H/2-20}" font-size="${(26*UI).toFixed(1)}" font-weight="bold" fill="#ff8a80" text-anchor="middle">ВЫ МЕРТВЫ</text>
  <text x="${W/2}" y="${H/2+20}" font-size="${(20*UI).toFixed(1)}" font-weight="bold" fill="#fff" text-anchor="middle">Возрождение через ${Math.ceil(player.respawn)} с</text>`;
}

function gameOverSVG(){
  const win = gameOver === 'win';
  let s = `<rect x="0" y="0" width="${W}" height="${H}" fill="rgba(0,0,0,0.8)"/>`;
  s += `<text x="${W/2}" y="${H/2-40}" font-size="${(38*UI).toFixed(1)}" font-weight="bold" fill="${win ? '#7fd4ff' : '#ff7f7f'}" text-anchor="middle">${win ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}</text>`;
  s += `<text x="${W/2}" y="${H/2+4}" font-size="${(16*UI).toFixed(1)}" fill="#fff" text-anchor="middle">Убийств: ${player.kills}  Смертей: ${player.deaths}</text>`;
  s += `<text x="${W/2}" y="${H/2+30}" font-size="${(16*UI).toFixed(1)}" fill="#fff" text-anchor="middle">Уровень: ${player.level}  Золото: ${Math.round(gold)}</text>`;
  s += `<text x="${W/2}" y="${H/2+54}" font-size="${(12*UI).toFixed(1)}" fill="rgba(200,220,255,0.8)" text-anchor="middle">За сессию: ${sessionStats.totalKills} убийств · рекорд ${sessionStats.bestKills} · побед ${sessionStats.wins}/${sessionStats.games}</text>`;
  s += `<text x="${W/2}" y="${H/2+92}" font-size="${(16*UI).toFixed(1)}" font-weight="bold" fill="#ffd54f" text-anchor="middle">ЛКМ или ПРОБЕЛ — играть снова</text>`;
  return s;
}

function bannerSVG(){
  if (!banner) return '';
  const a = clamp(banner.t / banner.max, 0, 1);
  const y = H * 0.28;
  return `<text x="${W/2}" y="${y}" font-size="${(26*UI).toFixed(1)}" font-weight="bold" fill="${banner.color}" text-anchor="middle" opacity="${a.toFixed(2)}" stroke="rgba(0,0,0,0.6)" stroke-width="4" paint-order="stroke">${banner.text}</text>`;
}

function pauseSVG(){
  return `<circle cx="${PAUSE.x}" cy="${PAUSE.y}" r="${(20*UI).toFixed(1)}" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
  <text x="${PAUSE.x}" y="${PAUSE.y+1}" font-size="${(16*UI).toFixed(1)}" fill="#fff" text-anchor="middle" dominant-baseline="middle">${paused ? '▶' : '⏸'}</text>`;
}

function drawHUD(){
  let s = '';
  s += minimapSVG();
  s += topBarSVG();
  s += bannerSVG();
  s += buttonsSVG();
  s += shopSVG();
  s += pauseSVG();
  if (typeof renderDebugOverlay === 'function') s += renderDebugOverlay();

  if (paused && !gameOver){
    s += `<rect x="0" y="0" width="${W}" height="${H}" fill="rgba(0,0,0,0.6)"/>`;
    s += `<text x="${W/2}" y="${H/2 - 30}" font-size="${(34*UI).toFixed(1)}" font-weight="bold" fill="#fff" text-anchor="middle">ПАУЗА</text>`;
    s += `<text x="${W/2}" y="${H/2 + 4}" font-size="${(15*UI).toFixed(1)}" fill="#ffd54f" text-anchor="middle">ESC — продолжить</text>`;

    const b = RESTART_BTN;
    s += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="rgba(180,60,60,0.35)" stroke="#ff7f7f" stroke-width="2"/>`;
    s += `<text x="${W/2}" y="${b.y + b.h/2 + 5}" font-size="${(16*UI).toFixed(1)}" font-weight="bold" fill="#fff" text-anchor="middle">Начать заново</text>`;

    s += `<text x="${W/2}" y="${H/2 + 110}" font-size="${(12*UI).toFixed(1)}" fill="rgba(200,220,255,0.7)" text-anchor="middle">За сессию: ${sessionStats.totalKills} убийств · рекорд ${sessionStats.bestKills} · побед ${sessionStats.wins}/${sessionStats.games}</text>`;
  }

  if (gameTime < 8 && !gameOver && player.alive){
    const bw = 620, bh = 82;
    s += `<rect x="${W/2-bw/2}" y="${H-158}" width="${bw}" height="${bh}" rx="10" fill="rgba(0,0,0,0.65)"/>`;
    s += `<text x="${W/2}" y="${H-134}" font-size="14" fill="#fff" text-anchor="middle" font-weight="bold">ПКМ — идти / атаковать · Q W E R — способности на курсор</text>`;
    s += `<text x="${W/2}" y="${H-112}" font-size="12" fill="#ffd54f" text-anchor="middle">A + ЛКМ — attack-move · B — магазин · ESC — пауза · ПРОБЕЛ — стоп</text>`;
    s += `<text x="${W/2}" y="${H-92}" font-size="12" fill="#7fd4ff" text-anchor="middle">ЛКМ по миникарте — приказ движения · F1 — debug overlay</text>`;
  }

  if (!player.alive && !gameOver) s += respawnSVG();
  if (gameOver) s += gameOverSVG();
  hudLayer.innerHTML = s;
}
// ────────────────────────── Зоны атаки вышек и древних ──────────────────────────
function renderTowerRanges(){
  if (!player || !player.alive){ rangeLayer.innerHTML = ''; return; }

  let s = '';
  for (const u of units){
    if (!u.alive) continue;
    if (u.type !== 'tower' && u.type !== 'ancient') continue;

    const d = Math.hypot(player.x - u.x, player.y - u.y);
    if (d > u.range * 1.5) continue;

    const inside = d < u.range;
    const col = u.team === 0 ? '79,195,247' : '239,83,80';
    const fillOp   = inside ? 0.20 : 0.05;
    const strokeOp = inside ? 0.85 : 0.30;

    s += `<circle cx="${u.x}" cy="${u.y}" r="${u.range}" `;
    s += `fill="rgba(${col},${fillOp})" `;
    s += `stroke="rgba(${col},${strokeOp})" `;
    s += `stroke-width="${inside ? 2.5 : 1.5}" `;
    s += `${inside ? '' : 'stroke-dasharray="8 6"'}/>`;

    if (inside){
      const pulse = 0.5 + Math.sin(gameTime * 8) * 0.5;
      s += `<circle cx="${u.x}" cy="${u.y}" r="${u.range}" fill="none" `;
      s += `stroke="rgba(${col},${(0.35 * pulse).toFixed(2)})" stroke-width="6"/>`;
    }
  }
  rangeLayer.innerHTML = s;
}
// ────────────────────────── Главный рендер ──────────────────────────
function render(){
  mouseWorld = screenToWorld(mouseX, mouseY);
  hoverUnit = isOverHUD(mouseX, mouseY) ? null : unitAtScreen(mouseX, mouseY);

  worldEl.setAttribute('transform', `translate(${-cam.x*SCALE},${-cam.y*SCALE}) scale(${SCALE})`);

  renderTowerRanges();   // ← добавить

  for (const u of units){
    if (!u.el) buildUnitNode(u);
    updateUnitNode(u);
  }

  renderProjectiles();
  renderEffects();
  renderRunes();
  drawHUD();
}