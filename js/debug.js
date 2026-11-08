'use strict';

const DEBUG = {
  enabled: false,
  events: [],
  maxEvents: 25,
};

function trace(category, msg, extra){
  if (!DEBUG.enabled) return;
  const entry = {
    t: performance.now(),
    cat: category,
    msg: String(msg),
    extra: extra ? JSON.stringify(extra) : '',
  };
  DEBUG.events.unshift(entry);
  if (DEBUG.events.length > DEBUG.maxEvents) DEBUG.events.pop();
  console.log('[' + category + '] ' + entry.msg, extra || '');
}

function toggleDebug(){
  DEBUG.enabled = !DEBUG.enabled;
  if (DEBUG.enabled){
    console.log('%c[DEBUG ON] F1 — выкл. Все события пишутся в консоль и на экран.', 'color:#7fd4ff;font-weight:bold');
  } else {
    DEBUG.events = [];
  }
}

function renderDebugOverlay(){
  if (!DEBUG.enabled) return '';

  const lines = [];
  lines.push('── F1 DEBUG ──');
  lines.push('pendingAbility = ' + pendingAbility);
  lines.push('attackMoveMode = ' + attackMoveMode);
  if (player){
    lines.push('ablLv = [' + player.ablLv.join(',') + ']');
    lines.push('cds   = [' + player.cds.map(c => c.toFixed(1)).join(',') + ']');
    lines.push('mana  = ' + Math.round(player.mana) + '/' + player.maxMana);
    lines.push('focus = ' + (player.focus ? player.focus.type : 'null'));
    lines.push('moveOrder = ' + (player.moveOrder ? 'yes' : 'null'));
  }
  lines.push('mouseWorld = ' + Math.round(mouseWorld.x) + ',' + Math.round(mouseWorld.y));
  lines.push('── события ──');
  for (const e of DEBUG.events.slice(0, 8)){
    lines.push(e.cat + ': ' + e.msg.slice(0, 60));
  }

  const w = 380 * UI, h = 24 + lines.length * 16 * UI;
  let s = `<rect x="${W - w - 10}" y="${H - h - 10}" width="${w}" height="${h}" rx="6" fill="rgba(0,0,0,0.85)" stroke="#7fd4ff" stroke-width="1.5"/>`;
  s += `<text x="${W - w + 6}" y="${H - h + 4}" font-size="${(11*UI).toFixed(1)}" fill="#7fd4ff" font-family="monospace">`;
  for (let i = 0; i < lines.length; i++){
    const y = H - h + 4 + (i + 1) * 16 * UI;
    s += `<tspan x="${W - w + 6}" y="${y}">${lines[i].replace(/</g, '&lt;').replace(/>/g, '&gt;')}</tspan>`;
  }
  s += `</text>`;
  return s;
}