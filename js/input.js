'use strict';

const HOTKEY_CODES = ['KeyQ', 'KeyW', 'KeyE', 'KeyR'];

let camDragLastX = 0, camDragLastY = 0;

function layoutButtons(){
  const r = 30 * UI;
  BTN.r = r;
  const pad = 14 * UI;
  BTN.pos[0] = {x: W - pad - r * 3.4, y: H - pad - r * 1.15};
  BTN.pos[1] = {x: W - pad - r * 1.15, y: H - pad - r * 1.15};
  BTN.pos[2] = {x: W - pad - r * 3.4, y: H - pad - r * 3.4};
  BTN.pos[3] = {x: W - pad - r * 1.15, y: H - pad - r * 3.4};

  SHOP.x = W - 30 * UI;
  SHOP.y = 110 * UI;

  PAUSE.x = 30 * UI;
  PAUSE.y = H - 30 * UI;

  RESTART_BTN.w = 200 * UI;
  RESTART_BTN.h = 44 * UI;
  RESTART_BTN.x = W / 2 - RESTART_BTN.w / 2;
  RESTART_BTN.y = H / 2 + 40 * UI;
}

function buyItem(id){
  const it = ITEMS.find(i => i.id === id);
  if (!it) return;
  if (gold < it.cost || itemOwned[id] >= 1 || !player.alive) return;
  gold -= it.cost;
  itemOwned[id] = 1;
  if (id === 'boots') player.speed += 60;
  if (id === 'blade') player.dmg += 32;
  if (id === 'vital'){ player.maxHp += 320; player.hp += 320; }
  if (id === 'mana'){ player.maxMana += 220; player.mana += 220; }
  addFloat(player.x, player.y - 30, it.label + '!', '#7ee787');
  sfx('buy');
  trace('buy', id + ' gold=' + Math.round(gold));
}

function isMinimapClick(x, y){
  const size = 92 * UI, pad = 10;
  return x >= pad && x <= pad + size && y >= pad && y <= pad + size;
}

function armAbility(i){
  if (!player || !player.alive || gameOver){ trace('arm', 'i=' + i + ' FAIL: no player'); return; }
  if (pendingAbility === i){ trace('arm', 'i=' + i + ' toggle OFF'); pendingAbility = -1; return; }
  if (player.ablLv[i] <= 0){ trace('arm', 'i=' + i + ' FAIL: level 0'); return; }
  if (player.cds[i] > 0){ trace('arm', 'i=' + i + ' FAIL: cd=' + player.cds[i].toFixed(1)); return; }
  if (player.mana < ABIL[i].cost){ trace('arm', 'i=' + i + ' FAIL: mana=' + Math.round(player.mana)); return; }
  pendingAbility = i;
  trace('arm', 'i=' + i + ' OK pendingAbility=' + i);
}

function onPointerDown(e){
  ensureAudio();
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (e.button === 1){
    if (paused || gameOver) return;
    e.preventDefault();
    camDragging = true;
    camDragLastX = e.clientX;
    camDragLastY = e.clientY;
    return;
  }

  if (gameOver){
    if (e.button === 0) reset();
    return;
  }

  if (paused){
    if (e.button === 0){
      const b = RESTART_BTN;
      if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h){
        paused = false;
        reset();
        return;
      }
      paused = false;
    }
    return;
  }

  if (e.button === 2){
    e.preventDefault();
    attackMoveMode = false;
    if (pendingAbility >= 0){ pendingAbility = -1; trace('click', 'RMB: cancel pending'); return; }
    const hu = isOverHUD(mouseX, mouseY) ? null : unitAtScreen(mouseX, mouseY);
    if (hu && hu.team !== player.team) issueAttackOrder(hu);
    else {
      const w = screenToWorld(mouseX, mouseY);
      issueMoveOrder(w.x, w.y);
    }
    return;
  }

  if (e.button !== 0) return;

  if (showShop){
    const cards = computeShopItems();
    for (const c of cards){
      if (mouseX >= c.x && mouseX <= c.x + c.w && mouseY >= c.y && mouseY <= c.y + c.h){
        buyItem(c.id);
        return;
      }
    }
    showShop = false;
    return;
  }
  if (Math.hypot(mouseX - SHOP.x, mouseY - SHOP.y) < 26 * UI){ showShop = true; return; }
  if (Math.hypot(mouseX - PAUSE.x, mouseY - PAUSE.y) < 22 * UI){ paused = true; return; }

  for (let i = 0; i < 4; i++){
    const b = BTN.pos[i];
    if (b && Math.hypot(mouseX - b.x, mouseY - b.y) < BTN.r * 1.2){
      const w = screenToWorld(mouseX, mouseY);
      castAbility(player, i, {tx: w.x, ty: w.y});
      pendingAbility = -1;
      return;
    }
  }

  if (isMinimapClick(mouseX, mouseY)){
    const size = 92 * UI, pad = 10;
    const k = size / WORLD;
    const wx = (mouseX - pad) / k;
    const wy = (mouseY - pad) / k;
    issueMoveOrder(clamp(wx, 40, WORLD - 40), clamp(wy, 40, WORLD - 40));
    return;
  }

  if (pendingAbility >= 0){
    trace('click', 'cast pending=' + pendingAbility + ' at ' + Math.round(mouseX) + ',' + Math.round(mouseY));
    const w = screenToWorld(mouseX, mouseY);
    castAbility(player, pendingAbility, {tx: w.x, ty: w.y});
    pendingAbility = -1;
    return;
  }

  if (attackMoveMode){
    attackMoveMode = false;
    const w = screenToWorld(mouseX, mouseY);
    const tgt = nearestEnemyToPoint(w.x, w.y, 400, player.team);
    if (tgt) issueAttackOrder(tgt);
    else issueAttackMoveOrder(w.x, w.y);
    return;
  }

  const hu = isOverHUD(mouseX, mouseY) ? null : unitAtScreen(mouseX, mouseY);
  if (hu && hu.team !== player.team){
    player.focus = hu;
    player.moveOrder = null;
    player.attackMoveOrder = null;
    trace('focus', 'target=' + hu.type);
  }
}

function onPointerMove(e){
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (camDragging){
    const dx = e.clientX - camDragLastX;
    const dy = e.clientY - camDragLastY;
    camDragLastX = e.clientX;
    camDragLastY = e.clientY;
    camOffset.x -= dx / SCALE;
    camOffset.y -= dy / SCALE;
    const maxOff = WORLD * 0.5;
    camOffset.x = clamp(camOffset.x, -maxOff, maxOff);
    camOffset.y = clamp(camOffset.y, -maxOff, maxOff);
  }
}

function onPointerUp(e){
  if (e.button === 1) camDragging = false;
}

function onKeyDown(e){
  ensureAudio();
  if (e.repeat) return;

  trace('key', e.code + (e.key !== e.code ? ' (' + e.key + ')' : ''));

  if (e.code === 'F1'){ e.preventDefault(); toggleDebug(); return; }

  if (gameOver){
    if (e.code === 'Space'){ e.preventDefault(); reset(); }
    return;
  }

  if (e.code === 'Escape'){
    if (pendingAbility >= 0){ pendingAbility = -1; return; }
    if (attackMoveMode){ attackMoveMode = false; return; }
    if (showShop){ showShop = false; return; }
    paused = !paused;
    return;
  }

  if (paused) return;

  for (let i = 0; i < 4; i++){
    if (e.code === HOTKEY_CODES[i]){
      e.preventDefault();
      armAbility(i);
      return;
    }
  }

  if (e.code === 'KeyA'){ e.preventDefault(); attackMoveMode = true; trace('mode', 'attack-move ON'); return; }
  if (e.code === 'KeyB'){ showShop = !showShop; trace('mode', 'shop=' + showShop); return; }

  if (e.code === 'KeyS' || e.code === 'Space'){
    e.preventDefault();
    if (player && player.alive){
      player.moveOrder = null;
      player.attackMoveOrder = null;
      player.focus = null;
      attackMoveMode = false;
      pendingAbility = -1;
      trace('mode', 'STOP');
    }
    return;
  }
}

svg.addEventListener('pointerdown', onPointerDown, {passive:false});
window.addEventListener('pointermove', onPointerMove, {passive:false});
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', onKeyDown);
window.addEventListener('blur', () => {
  camDragging = false;
  hoverUnit = null;
  attackMoveMode = false;
  pendingAbility = -1;
});