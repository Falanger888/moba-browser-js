'use strict';

const WORLD = 2400;

const BASE0 = {x: 170, y: 2230};
const BASE1 = {x: 2230, y: 170};

const LANES = [
  {id:'mid',    pts:[{x:170,y:2230},{x:2230,y:170}]},
  {id:'bottom', pts:[{x:170,y:2230},{x:2230,y:2230},{x:2230,y:170}]},
  {id:'top',    pts:[{x:170,y:2230},{x:170,y:170},{x:2230,y:170}]}
];

const TAU = Math.PI * 2;
const WAVE_INTERVAL = 28;
const FIRST_WAVE = 8;

const ABIL = [
  {name:'Q', label:'Копьё',    cd:6,  cost:45,  color:'#ff7043'},
  {name:'W', label:'Рывок',    cd:9,  cost:35,  color:'#66bb6a'},
  {name:'E', label:'Лечение',  cd:15, cost:60,  color:'#42a5f5'},
  {name:'R', label:'Ульт',     cd:40, cost:120, color:'#ab47bc'}
];

const ITEMS = [
  {id:'boots', label:'Сапоги',   cost:450, color:'#ffd54f', desc:'+60 скорость'},
  {id:'blade', label:'Клинок',   cost:600, color:'#ff8a65', desc:'+32 урон'},
  {id:'vital', label:'Жила',     cost:650, color:'#ef5350', desc:'+320 HP'},
  {id:'mana',  label:'Кристалл', cost:500, color:'#42a5f5', desc:'+220 мана'}
];

const ROSHAN_PIT = {x: 1600, y: 1700};

const JUNGLE_CAMPS = [
  {x: 800, y: 1900},
  {x: 1250, y: 2000},
  {x: 1850, y: 1500},
  {x: 1600, y: 500},
  {x: 1200, y: 900},
  {x: 900, y: 1200}
];

const RUNE_SPOTS = [
  {x: 980, y: 1420},
  {x: 1420, y: 980}
];

const COL = {
  ground:  '#101c10',
  ground2: '#16250f',
  lane:    '#43351f',
  laneC:   '#57462a',
  river:   '#17384f',
  riverC:  '#1f4a68'
};