// Minecraft
// Artin Kamyar
// April 16
//
// Extra for Experts:
// - describe what you did to take this project "above and beyond"

// World
let world = [];
const WORLD_COLS = 200;
const WORLD_ROWS = 60;
let surfaceRow = [];

// Camera
let camX = 0;
let camY = 0;

// Constants
const BLOCK_SIZE = 40;
const AIR = 0;
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
const GRAVITY = 0.55;
const MOVE_SPEED = 3.5;
const JUMP_VEL = -11;

// Mining
let miningTarget = null;
let miningProgress = 0;
const blockHardness = {[GRASS]: 60, [DIRT]: 60, [STONE]: 220, [LOG]: 130, [LEAVES]: 20, [PLANK]: 80, [IRON_ORE]: 280};

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

// Crafting
let craftGrid = new Array(9).fill(null);
let craftOutput = null;
let heldItem = null;

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
  noSmooth();
  imageMode(CORNER);
  noiseDetail(4, 0.5);
  generateWorld();

  // Spawn in the middle of the world a few blocks above the surface
  let mid = Math.floor(WORLD_COLS / 2);
  player.x = mid * BLOCK_SIZE;
  player.y = (surfaceRow[mid] - 5) * BLOCK_SIZE;
}

function draw() {
  background(135, 206, 235);

  // Camera centers on the player every frame
  camX = player.x + player.w / 2 - width / 2;
  camY = player.y + player.h / 2 - height / 2;

  // Everything in world space gets shifted by the camera so it scrolls correctly
  push();
  translate(-camX, -camY);
  drawWorld();
  drawPlayer();
  if (miningTarget && !inventoryOpen) {
    drawMiningOverlay();
  }
  pop();

  // UI draws in screen space after the world push/pop so it doesn't scroll
  drawHotbar();
  if (inventoryOpen) {
    drawInventoryScreen();
  }

  // Held item floats right under the cursor while dragging
  if (heldItem) {
    drawItemAt(heldItem, mouseX - 16, mouseY - 16, 32);
  }

  // Pause physics and mining when the inventory is open so nothing moves while you craft
  if (!inventoryOpen) {
    updatePhysics();
    handleMining();
  }
}

// Picks the right image based on what the player is doing and flips it when facing left
function drawPlayer() {
  push();
  translate(player.x + player.w / 2, player.y + player.h / 2);
  // Flip the image horizontally
  if (player.facing === -1) {
    scale(-1, 1);
  }
  let img = playerImgs.standing;

  if (miningTarget) {
    img = playerImgs.mining;
  }
  else if (Math.abs(player.vx) > 0.3) {
    if (frameCount % 30 < 15) {
      img = playerImgs.walking;
    }
    else {
      img = playerImgs.standing;
    }
  }

  if (img) {
    let sw = BLOCK_SIZE * 1.2;
    let sh = BLOCK_SIZE * 2.2;
    image(img, -sw / 2, -sh / 2, sw, sh);
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

// Scans the 3x3 grid to find box of placed items then normalizes it so the recipe matches no matter where in the grid you put things
function checkCraftingRecipe() {
  let pat = craftGrid.map(s => s ? s.type : AIR);

  let minR = 3, maxR = -1, minC = 3, maxC = -1;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (pat[r * 3 + c] !== AIR) {
        if (r < minR) {
          minR = r;
        }
        if (r > maxR) {
          maxR = r;
        }
        if (c < minC) {
          minC = c;
        }
        if (c > maxC) {
          maxC = c;
        }
      }
    }
  }
  if (maxR === -1) {
    return null;
  }

  let h = maxR - minR + 1;
  let w = maxC - minC + 1;
  let norm = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      norm.push(pat[r * 3 + c]);
    }
  }
  return matchRecipe(norm, w, h);
}

// Compares pattern against every known recipe
function matchRecipe(n, w, h) {
  // One log anywhere = 4 planks
  if (w === 1 && h === 1 && n[0] === LOG) {
    return {type: PLANK, count: 4};
  }

  // Two planks stacked vertically = 4 sticks
  if (w === 1 && h === 2 && n[0] === PLANK && n[1] === PLANK) {
    return {type: STICK, count: 4};
  }

  // Wood Pickaxe three planks across the top, stick down the center
  if (w === 3 && h === 2 && n[0]===PLANK && n[1]===PLANK && n[2]===PLANK && n[3]===AIR && n[4]===STICK && n[5]===AIR) {
    return {type: WOOD_PICK, count: 1};
  }
  if (w === 3 && h === 3 && n[0]===PLANK && n[1]===PLANK && n[2]===PLANK && n[3]===AIR && n[4]===STICK && n[5]===AIR && n[6]===AIR && n[7]===STICK && n[8]===AIR) {
    return {type: WOOD_PICK, count: 1};
  }

  // Stone Pickaxe same shape but stone on top
  if (w === 3 && h === 2 && n[0]===STONE && n[1]===STONE && n[2]===STONE && n[3]===AIR && n[4]===STICK && n[5]===AIR) {
    return {type: STONE_PICK, count: 1};
  }
  if (w === 3 && h === 3 && n[0]===STONE && n[1]===STONE && n[2]===STONE && n[3]===AIR && n[4]===STICK && n[5]===AIR && n[6]===AIR && n[7]===STICK && n[8]===AIR) {
    return {type: STONE_PICK, count: 1};
  }

  // Iron Pickaxe iron ore on top
  if (w === 3 && h === 2 && n[0]===IRON_ORE && n[1]===IRON_ORE && n[2]===IRON_ORE && n[3]===AIR && n[4]===STICK && n[5]===AIR) {
    return {type: IRON_PICK, count: 1};
  }
  return null;
}

// Routes inventory clicks to the right handler based on where the mouse landed
function handleInventoryClick() {
  let L = getInvLayout();

  // Check main inventory slots
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 9; col++) {
      let i = row * 9 + col;
      let x = L.invX + col * (L.ss + L.pad);
      let y = L.invY + row * (L.ss + L.pad);
      if (inSlot(x, y, L.ss)) {
        clickSlot(inventory, i);
        return;
      }
    }
  }

  // Check crafting grid slots
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      let i = row * 3 + col;
      let x = L.craftX + col * (L.ss + L.pad);
      let y = L.craftY + row * (L.ss + L.pad);
      if (inSlot(x, y, L.ss)) {
        clickSlot(craftGrid, i);
        return;
      }
    }
  }

  // Check the output slot
  if (inSlot(L.outX, L.outY, L.ss) && craftOutput) {
    collectCraft();
  }
}

// All mouse clicks go to inventory when it's open
function mousePressed() {
  if (inventoryOpen) {
    handleInventoryClick();
    return;
  }
}

// Test to check if the mouse is inside a slot
function inSlot(x, y, size) {
  return mouseX > x && mouseX < x + size && mouseY > y && mouseY < y + size;
}

// Moves exactly one item between the held item and a slot
function clickSlot(arr, index) {
  let slot = arr[index];

  if (heldItem) {
    if (!slot) {
      // Empty slot place
      arr[index] = {type: heldItem.type, count: 1};
    } 
    else if (slot.type === heldItem.type) {
      // Same type just add
      slot.count++;
    } 
    else {
      // Different type swap
      let temp = {type: slot.type, count: slot.count};
      arr[index] = {type: heldItem.type, count: 1};
      heldItem = temp;
      return;
    }
    heldItem.count--;
    if (heldItem.count <= 0) {
      heldItem = null;
    }
  }
  else {
    // Nothing held pick up item from slot
    if (slot && slot.count > 0) {
      heldItem = {type: slot.type, count: 1};
      slot.count--;
      if (slot.count <= 0) {
        arr[index] = null;
      }
    }
  }
}

// Builds the whole world from scratch using Perlin noise for the terrain shape
function generateWorld() {
  // Start everything as air then fill in the ground below the surface
  for (let r = 0; r < WORLD_ROWS; r++) {
    world.push(new Array(WORLD_COLS).fill(AIR));
  }

  // The random offset means the world is different every time you load
  let noiseX = random(1000);
  for (let c = 0; c < WORLD_COLS; c++) {
    let n = noise(c * 0.04 + noiseX);
    surfaceRow[c] = Math.floor(map(n, 0, 1, 12, 22));
  }

  // Grass on top, 3 dirt below, then solid stone all the way down
  for (let c = 0; c < WORLD_COLS; c++) {
    let surf = surfaceRow[c];
    for (let r = surf; r < WORLD_ROWS; r++) {
      if (r === surf) {
        world[r][c] = GRASS;
      }
      else if (r < surf + 4) {
        world[r][c] = DIRT;
      }
      else {
        world[r][c] = STONE;
      }
    }
  }

  // Randomly replace some stone blocks with iron ore 1.2% chance
  for (let r = 0; r < WORLD_ROWS; r++) {
    for (let c = 0; c < WORLD_COLS; c++) {
      if (world[r][c] === STONE) {
        let roll = random();
        if (roll < 0.012) {
          world[r][c] = IRON_ORE;
        }
      }
    }
  }

  placeTrees();
}

// Plants trees in the world
function placeTrees() {
  let c = 6;
  while (c < WORLD_COLS - 10) {
    let surf = surfaceRow[c];
    let trunkH = Math.floor(random(4, 7));

    // Trunk goes straight up from the surface row
    for (let r = surf - trunkH; r < surf; r++) {
      if (r >= 0) {
        world[r][c] = LOG;
      }
    }

    // Leaves spread around the top of the trunk
    // Only cover air
    let top = surf - trunkH;
    for (let lr = top - 2; lr <= top + 1; lr++) {
      for (let lc = c - 2; lc <= c + 2; lc++) {
        if (lr >= 0 && lr < WORLD_ROWS && lc >= 0 && lc < WORLD_COLS) {
          if (world[lr][lc] === AIR) {
            world[lr][lc] = LEAVES;
          }
        }
      }
    }

    c += Math.floor(random(7, 14));
  }
}

// Rendering
function drawWorld() {
  let startC = Math.max(0, Math.floor(camX / BLOCK_SIZE));
  let endC = Math.min(WORLD_COLS - 1, Math.ceil((camX + width) / BLOCK_SIZE));
  let startR = Math.max(0, Math.floor(camY / BLOCK_SIZE));
  let endR = Math.min(WORLD_ROWS - 1, Math.ceil((camY + height) / BLOCK_SIZE));
  
  // Only loops through blocks that are actually on screen right now
  for (let r = startR; r <= endR; r++) {
    for (let c = startC; c <= endC; c++) {
      let b = world[r][c];
      if (b === AIR) {
        continue;
      }

      let px = c * BLOCK_SIZE;
      let py = r * BLOCK_SIZE;

      if (imgs[b]) {
        image(imgs[b], px, py, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
}

// Takes the crafted item and removes one ingredient from each occupied crafting slot
function collectCraft() {
  if (!craftOutput) {
    return;
  }
  if (!addItem(craftOutput.type, craftOutput.count)) {
    return;
  }

  // Consume one from each ingredient slot that was used
  for (let i = 0; i < craftGrid.length; i++) {
    if (craftGrid[i]) {
      craftGrid[i].count--;
      if (craftGrid[i].count <= 0) {
        craftGrid[i] = null;
      }
    }
  }
  craftOutput = null;
}


// Physics
function updatePhysics() {
  player.vx = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) {
    player.vx = -MOVE_SPEED;
    player.facing = -1;
  }
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) {
    player.vx = MOVE_SPEED;
    player.facing = 1;
  }

  // Gravity every frame
  player.vy += GRAVITY;
  if (player.vy > 20) {
    player.vy = 20;
  }

  // Move X first then do Y
  player.x += player.vx;
  resolveCollisions('x');

  player.y += player.vy;
  player.onGround = false;
  resolveCollisions('y');

  // World borders so you can't walk off the edge
  if (player.x < 0) {
    player.x = 0;
  }
  if (player.x + player.w > WORLD_COLS * BLOCK_SIZE) {
    player.x = WORLD_COLS * BLOCK_SIZE - player.w;
  }
  if (player.y + player.h > WORLD_ROWS * BLOCK_SIZE) {
    player.y = WORLD_ROWS * BLOCK_SIZE - player.h;
    player.vy = 0;
    player.onGround = true;
  }
}

// Checks all four corners of the player hitbox against the grid and pushes them out of solid blocks
function resolveCollisions(axis) {
  let corners = [{x: player.x + 1, y: player.y + 1}, {x: player.x + player.w - 1, y: player.y + 1}, {x: player.x + 1, y: player.y + player.h - 1}, {x: player.x + player.w - 1, y: player.y + player.h - 1},];

  for (let pt of corners) {
    let col = Math.floor(pt.x / BLOCK_SIZE);
    let row = Math.floor(pt.y / BLOCK_SIZE);

    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) {
      continue;
    }
    let b = world[row][col];

    if (b === AIR || b === LEAVES) {
      continue;
    }

    if (axis === 'x') {
      // Push out horizontally based on direction
      if (player.vx > 0) {
        player.x = col * BLOCK_SIZE - player.w;
        player.vx = 0;
      }
      else if (player.vx < 0) {
        player.x = (col + 1) * BLOCK_SIZE;
        player.vx = 0;
      }
    }
    else {
      if (player.vy > 0) {
        // when landing on a block set onGround so jumping works
        player.y = row * BLOCK_SIZE - player.h;
        player.vy = 0;
        player.onGround = true;
      }
      else if (player.vy < 0) {
        player.y = (row + 1) * BLOCK_SIZE;
        player.vy = 0;
      }
    }
  }
}


// Hold left click on a block to mine it
function handleMining() {
  if (!mouseIsPressed || mouseButton !== LEFT) {
    miningTarget = null;
    miningProgress = 0;
    return;
  }

  // Convert mouse pixel position to world block coordinates
  let wc = Math.floor((mouseX + camX) / BLOCK_SIZE);
  let wr = Math.floor((mouseY + camY) / BLOCK_SIZE);

  if (wc < 0 || wc >= WORLD_COLS || wr < 0 || wr >= WORLD_ROWS) {
    return;
  }
  if (world[wr][wc] === AIR) {
    return;
  }

  // Reach check
  let pcx = player.x + player.w / 2;
  let pcy = player.y + player.h / 2;
  let bcx = wc * BLOCK_SIZE + BLOCK_SIZE / 2;
  let bcy = wr * BLOCK_SIZE + BLOCK_SIZE / 2;
  if (dist(pcx, pcy, bcx, bcy) > BLOCK_SIZE * 2) {
    return;
  }

  // If player switched to a different block reset the progress
  if (!miningTarget || miningTarget.col !== wc || miningTarget.row !== wr) {
    miningTarget = {col: wc, row: wr};
    miningProgress = 0;
  }
  let hardness = blockHardness[world[wr][wc]] || 80;
  let speedMult = 1;

  // Better pickaxes multiply the mining speed
  let held = inventory[selectedHotbar];
  if (held) {
    if (held.type === WOOD_PICK) {
      speedMult = 2;
    }
    if (held.type === STONE_PICK) {
      speedMult = 4;
    }
    if (held.type === IRON_PICK) {
      speedMult = 6;
    }
  }
  miningProgress += (1 / hardness) * speedMult;

  // When block is fully broken remove it from the world and drop it into inventory
  if (miningProgress >= 1) {
    let broken = world[wr][wc];
    world[wr][wc] = AIR;
    addItem(broken, 1);
    miningTarget = null;
    miningProgress = 0;
  }
}

// Shows a dark overlay and a yellow progress bar on the block while being mined
function drawMiningOverlay() {
  if (!miningTarget) {
    return;
  }
  let px = miningTarget.col * BLOCK_SIZE;
  let py = miningTarget.row * BLOCK_SIZE;

  // The overlay gets darker as miningProgress increases toward 1
  fill(0, 0, 0, miningProgress * 160);
  noStroke();
  rect(px, py, BLOCK_SIZE, BLOCK_SIZE);

  // Yellow progress bar along the bottom of the block
  fill(255, 210, 0);
  rect(px, py + BLOCK_SIZE - 5, BLOCK_SIZE * miningProgress, 5);
}

// Places the selected hotbar item at the block the mouse is hovering over using Q
function placeBlock() {
  let slot = inventory[selectedHotbar];
  if (!slot || slot.count <= 0) {
    return;
  }

  // Only actual block types can be placed
  if (![GRASS, DIRT, STONE, LOG, PLANK, LEAVES].includes(slot.type)) {
    return;
  }

  let wc = Math.floor((mouseX + camX) / BLOCK_SIZE);
  let wr = Math.floor((mouseY + camY) / BLOCK_SIZE);
  if (wc < 0 || wc >= WORLD_COLS || wr < 0 || wr >= WORLD_ROWS) {
    return;
  }
  if (world[wr][wc] !== AIR) {
    return;
  }

  // Reach check
  let pcx = player.x + player.w / 2;
  let pcy = player.y + player.h / 2;
  let bcx = wc * BLOCK_SIZE + BLOCK_SIZE / 2;
  let bcy = wr * BLOCK_SIZE + BLOCK_SIZE / 2;
  if (dist(pcx, pcy, bcx, bcy) > BLOCK_SIZE * 2) {
    return;
  }

  // Figure out which grid cells the player currently occupies
  let pc1 = Math.floor(player.x / BLOCK_SIZE);
  let pc2 = Math.floor((player.x + player.w) / BLOCK_SIZE);
  let pr1 = Math.floor(player.y / BLOCK_SIZE);
  let pr2 = Math.floor((player.y + player.h) / BLOCK_SIZE);

  let overlapping = (wc >= pc1 && wc <= pc2 && wr >= pr1 && wr <= pr2);

  if (overlapping) {
    // Can't place a block inside player
    if (player.onGround) {
      return;
    }

    // If you're in the air you can place under yourself and it puts you on top of it
    player.y = wr * BLOCK_SIZE - player.h;
    player.vy = 0;
  }

  world[wr][wc] = slot.type;
  slot.count--;
  if (slot.count <= 0) {
    inventory[selectedHotbar] = null;
  }
}

// W or Space to jump, Q to place, E to toggle inventory and 1-9 for hotbar
function keyPressed() {
  if ((key === 'w' || key === 'W' || key === ' ') && !inventoryOpen) {
    if (player.onGround) {
      player.vy = JUMP_VEL;
    }
  }

  // Q places a block at wherever the mouse is hovering
  if ((key === 'q' || key === 'Q') && !inventoryOpen) {
    placeBlock();
  }

  if (key === 'e' || key === 'E') {
    inventoryOpen = !inventoryOpen;
    // If you close the inventory while holding an item, toss it back so nothing gets lost
    if (!inventoryOpen && heldItem) {
      addItem(heldItem.type, heldItem.count);
      heldItem = null;
    }
  }

  // Number keys 1-9 switch the selected hotbar slot
  if (key >= '1' && key <= '9') {
    selectedHotbar = int(key) - 1;
  }
}