// Minecraft
// Artin Kamyar
// April 16
//
// Extra for Experts:
// - describe what you did to take this project "above and beyond"

// Constants
const BLOCK_SIZE = 40;
const GRASS = 1;
const DIRT = 2;
const STONE = 3;
const LOG = 4;
const LEAVES = 5;
const PLANK = 6;
const STICK = 7;
const WOOD_PICK = 8;
const STONE_PICK = 9;
const IRON_ORE = 10;
const IRON_PICK = 11;

// Images
let imgs = {};
let playerImgs = {};

// Player
let player = {
  x: 0,
  y: 0,
  w: BLOCK_SIZE * 0.6,
  h: BLOCK_SIZE * 1.8,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1,
};

// Inventory
let inventory  = new Array(36).fill(null);
let selectedHotbar = 0;
let inventoryOpen = false;

// Load all images
function preload() {
  imgs[GRASS] = loadImage('grass.png');
  imgs[DIRT] = loadImage('dirt.png');
  imgs[STONE] = loadImage('stone.png');
  imgs[LOG] = loadImage('log.png');
  imgs[LEAVES] = loadImage('leafs.png');
  imgs[PLANK] = loadImage('plank.png');
  imgs[STICK] = loadImage('stick.png');
  imgs[WOOD_PICK]  = loadImage('wood-pickaxe.png'); 
  imgs[STONE_PICK] = loadImage('stone-pickaxe.png');
  imgs[IRON_ORE] = loadImage('iron-ore.png');
  imgs[IRON_PICK] = loadImage('iron_pickaxe.png');

  playerImgs.standing = loadImage('player-standing.png');
  playerImgs.walking = loadImage('player-walking.png');
  playerImgs.mining = loadImage('player-mining.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background("red");

  drawHotbar();
}

function drawPlayer() {
  push();
  translate(player.x + player.w / 2, player.y + player.h / 2);
  if (player.facing === -1) {
    scale(-1, 1);
  }
  else if (Math.abs(player.vx) > 0.3) {
    if (frameCount % 30 < 15) {
      img = playerImgs.walking;
    }
    else {
      img = playerImgs.standing;
    }
  }
  pop();
}

function addItem(type, count) {
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i] && inventory[i].type === type) {
      inventory[i].count += count;
      return true;
    }
  }
  for (let i = 0; i < inventory.length; i++) {
    if (!inventory[i]) {
      inventory[i] = {type, count};
      return true;
    }
  }
  return false; 
}

function drawHotbar() {
  let ss = 50; 
  let pad = 4;
  let totalW = 9 * (ss + pad) - pad;
  let sx = width / 2 - totalW / 2;
  let sy = height - ss - 10;

  for (let i = 0; i < 9; i++) {
    let x = sx + i * (ss + pad);
    let sel = i === selectedHotbar;

    fill(sel ? 210 : 80, sel ? 210 : 80, sel ? 210 : 80, 210);
    stroke(sel ? 255 : 55);
    strokeWeight(sel ? 3 : 1);
    rect(x, sy, ss, ss, 5);
    drawItemAt(inventory[i], x, sy, ss);
  }
}