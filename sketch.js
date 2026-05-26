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

  if (inventoryOpen) {
    drawInventoryScreen();
  }
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

// Tries to stack onto an existing slot first, then fills an empty one
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

// Hotbar sits at the bottom center of the screen and selected slot gets a brighter background
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

// Draws one item inside a slot
function drawItemAt(slot, x, y, size) {
  if (!slot || slot.count <= 0) {
    return;
  }

  let padding = size * 0.1;
  let drawX = x + padding;
  let drawY = y + padding;
  let drawSize = size - padding * 2;

  if (imgs[slot.type]) {
    image(imgs[slot.type], drawX, drawY, drawSize, drawSize);
  }

  // Only show the count if there's more than 1 so single items stay clean
  if (slot.count > 1) {
    fill(255);
    stroke(0);
    strokeWeight(2);
    textAlign(RIGHT, BOTTOM);
    textSize(11);
    text(slot.count, x + size - 3, y + size - 2);
    noStroke();
  }
}

// Full inventory screen with 36 slots and the 3x3 crafting grid
function drawInventoryScreen() {
  fill(0, 0, 0, 155);
  noStroke();
  rect(0, 0, width, height);

  let layout = getInvLayout();

  // Dark panel behind the inventory slots
  fill(65, 65, 65, 235);
  stroke(40);
  strokeWeight(2);
  rect(layout.invX - 10, layout.invY - 10, 9 * (layout.ss + layout.pad) + 12, 4 * (layout.ss + layout.pad) + 12, 6);

  // Draw all 36 inventory slots
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 9; col++) {
      let i = row * 9 + col;
      let x = layout.invX + col * (layout.ss + layout.pad);
      let y = layout.invY + row * (layout.ss + layout.pad);

      fill(row === 0 ? 90 : 55, row === 0 ? 90 : 55, row === 0 ? 90 : 55);
      stroke(35);
      strokeWeight(1);
      rect(x, y, layout.ss, layout.ss, 3);
      drawItemAt(inventory[i], x, y, layout.ss);
    }
  }

  // 3x3 crafting grid sits below the inventory
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      let i = row * 3 + col;
      let x = layout.craftX + col * (layout.ss + layout.pad);
      let y = layout.craftY + row * (layout.ss + layout.pad);
      fill(48, 48, 48);
      stroke(28);
      strokeWeight(1);
      rect(x, y, layout.ss, layout.ss, 3);
      drawItemAt(craftGrid[i], x, y, layout.ss);
    }
  }

  // Arrow pointing from grid to output slot
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(24);
  text("→", layout.arrowX, layout.arrowY);

  // Output slot
  craftOutput = checkCraftingRecipe();
  fill(craftOutput ? 75 : 42, craftOutput ? 95 : 55, 42);
  stroke(28);
  strokeWeight(2);
  rect(layout.outX, layout.outY, layout.ss, layout.ss, 3);
  drawItemAt(craftOutput, layout.outX, layout.outY, layout.ss);
}

// All the pixel coordinates for the inventory layout in one place
// I put this in its own function so drawInventoryScreen and handleInventoryClick always use the exact same numbers and clicks land in the right spot
function getInvLayout() {
  let ss = 42;
  let pad = 4;
  let invX = width / 2 - 9 * (ss + pad) / 2;
  let invY = height / 2 - 4 * (ss + pad) / 2 - 40;
  let craftX = invX;
  let craftY = invY + 4 * (ss + pad) + 28;
  let arrowX = craftX + 3 * (ss + pad) + 22;
  let arrowY = craftY + (ss + pad);
  let outX = arrowX + 26;
  let outY = craftY + (ss + pad) / 2;
  return {ss, pad, invX, invY, craftX, craftY, arrowX, arrowY, outX, outY};
}