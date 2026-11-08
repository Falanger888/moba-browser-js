'use strict';

// ── Размеры / SVG-элементы ──
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('game');

let W = 0, H = 0, SCALE = 1, UI = 1;

// ── SVG-слои (инициализируются в main.js) ──
let worldEl, mapLayer, rangeLayer, unitLayer, projLayer, fxLayer, runeLayer, hudLayer;

// ── Мир ──
let units = [];
let projectiles = [];
let effects = [];
let runes = [];
let player = null, enemyHero = null, roshan = null;
let gameTime = 0, waveTimer = FIRST_WAVE, waveNum = 0, runeTimer = 40;
let gameOver = null;
let decorations = [];
let structs = {0: null, 1: null};

// ── Камера ──
const cam = {x: 0, y: 0};
const camOffset = {x: 0, y: 0};
let camInit = false;
let camDragging = false;

// ── Экономика ──
let gold = 0;
const itemOwned = {boots:0, blade:0, vital:0, mana:0};

// ── UI ──
let showShop = false;
let banner = null;
let firstBlood = false;
let paused = false;
const BTN = {r: 30, pos: []};
const SHOP = {x: 0, y: 0};
const PAUSE = {x: 0, y: 0};
const RESTART_BTN = {x: 0, y: 0, w: 200, h: 44};

// ── Ввод ──
let mouseX = 0, mouseY = 0;
let mouseWorld = {x: 0, y: 0};
let hoverUnit = null;
let moveMarker = null;
let pendingAbility = -1;
let attackMoveMode = false;