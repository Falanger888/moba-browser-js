'use strict';

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
  rangeLayer.innerHTML = '';
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