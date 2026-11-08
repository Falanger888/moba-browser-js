'use strict';

// ── Числа ──
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

// ── Геометрия линий ──
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

// ── Преобразование координат ──
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

// ── HUD hit-test ──
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

// ── Расстояние до отрезка/полилинии ──
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