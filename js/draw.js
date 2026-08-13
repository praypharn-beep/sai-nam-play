import {
  CANVAS_W,
  CANVAS_H,
  ZONE_W,
  GROUND_TOP,
  waterRects,
  zoneNameAt,
} from "./engine.js";
import { pickPlayerSprite, playerPose } from "./assets.js";

let sprites = {
  player: null,
  playerIdle: null,
  playerJump: null,
  playerWalk2: null,
  playerWalk3: null,
  yaika: null,
  novice: null,
  far: null,
  mid: null,
  near: null,
};

export function setSprites(next) {
  sprites = next || sprites;
}

function drawSprite(ctx, img, x, y, facing = 1, height = 64) {
  const w = (img.width / img.height) * height;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.drawImage(img, -w / 2, -height, w, height);
  ctx.restore();
}

export function drawWorld(ctx, camX, player, state, t) {
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (sprites.far) {
    drawFarImage(ctx, camX);
  } else {
    drawSky(ctx);
    drawFar(ctx, camX);
  }
  drawMid(ctx, camX);
  ctx.translate(-camX, 0);
  drawZones(ctx, state, t);
  drawWater(ctx, state);
  drawActors(ctx, state, t);
  drawPlayer(ctx, player, t);
  ctx.restore();
  drawNear(ctx, camX);
}

function drawSky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  g.addColorStop(0, "#5ec8f0");
  g.addColorStop(0.55, "#b8ecff");
  g.addColorStop(1, "#8fd36a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawFarImage(ctx, camX) {
  const img = sprites.far;
  const extra = 120;
  const shift = (camX / (ZONE_W * 4)) * extra;
  ctx.drawImage(img, -shift, 0, CANVAS_W + extra, CANVAS_H);
}

function drawFar(ctx, camX) {
  const x = -((camX * 0.15) % 400);
  ctx.fillStyle = "#6b8f4a";
  ctx.beginPath();
  ctx.moveTo(0, 280);
  for (let i = 0; i < 8; i++) {
    const px = x + i * 220;
    ctx.lineTo(px + 80, 170);
    ctx.lineTo(px + 160, 250);
  }
  ctx.lineTo(CANVAS_W, 300);
  ctx.lineTo(CANVAS_W, CANVAS_H);
  ctx.lineTo(0, CANVAS_H);
  ctx.fill();

  ctx.fillStyle = "#4d6a38";
  mountain(ctx, 620 - camX * 0.2, 210, 210, 160);
  ctx.fillStyle = "#3f5630";
  mountain(ctx, 700 - camX * 0.2, 230, 160, 140);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(700 - camX * 0.2, 200, 70, 16, 0, 0, Math.PI * 2);
  ctx.fill();
}

function mountain(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + h);
  ctx.lineTo(x, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.closePath();
  ctx.fill();
}

function drawMid(ctx, camX) {
  if (sprites.mid) {
    drawMidImage(ctx, camX);
    return;
  }
  const shift = -(camX * 0.4);
  if (sprites.far) {
    for (let i = 0; i < 8; i++) {
      tree(ctx, shift + 140 + i * 260, 338, 18 + (i % 3) * 4, "rgba(45,110,55,0.45)");
    }
    return;
  }
  for (let i = 0; i < 14; i++) {
    tree(ctx, shift + 80 + i * 170, 300, 26 + (i % 3) * 6, "#3d8f4a");
  }
}

function drawMidImage(ctx, camX) {
  const img = sprites.mid;
  const targetH = 248;
  const targetW = targetH * (img.width / img.height);
  const y = GROUND_TOP - targetH + 20;
  const speed = 0.42;
  let x = -((camX * speed) % targetW);
  if (x > 0) x -= targetW;
  for (let px = x - targetW; px < CANVAS_W + targetW; px += targetW) {
    ctx.drawImage(img, px, y, targetW, targetH);
  }
}

function tree(ctx, x, y, r, color) {
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(x - 5, y, 10, 140);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x - r * 0.7, y + 10, r * 0.75, 0, Math.PI * 2);
  ctx.arc(x + r * 0.7, y + 10, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
}

function drawZones(ctx, state, t) {
  groundStrip(ctx, 0, ZONE_W * 3, GROUND_TOP, "#6dbe45", "#c9844a");
  groundStrip(ctx, 2880, 200, GROUND_TOP, "#6dbe45", "#c9844a");
  groundStrip(ctx, 3660, 180, GROUND_TOP, "#8b7355", "#6a5340");
  groundStrip(ctx, 3840, 200, GROUND_TOP, "#8b7355", "#6a5340");
  groundStrip(ctx, 4620, 180, GROUND_TOP, "#8b7355", "#6a5340");

  platform(ctx, 3160, 390, 90, "#8b7355");
  platform(ctx, 3320, 350, 90, "#8b7355");
  platform(ctx, 3480, 390, 90, "#8b7355");
  platform(ctx, 4040, 370, 140, "#7a5a3a");
  platform(ctx, 4220, 310, 140, "#7a5a3a");
  platform(ctx, 4400, 250, 220, "#7a5a3a");

  house(ctx, 70, GROUND_TOP);
  veggies(ctx, 1180, GROUND_TOP, state.q1Correct);
  temple(ctx, 2080, GROUND_TOP);
  sign(ctx, 1240, GROUND_TOP, "สวน");
  sign(ctx, 2980, GROUND_TOP, "ห้วย");
  sign(ctx, 4480, 250, "สายน้ำ");

  if (state.planted[1]) sapling(ctx, 4090, 370, t);
  if (state.planted[2]) sapling(ctx, 4270, 310, t);
  if (state.planted[3]) sapling(ctx, 4450, 250, t);
  if (!state.planted[1]) hole(ctx, 4080, 370);
  if (!state.planted[2]) hole(ctx, 4260, 310);
  if (!state.planted[3]) hole(ctx, 4440, 250);
}

function groundStrip(ctx, x, w, y, top, soil) {
  ctx.fillStyle = soil;
  ctx.fillRect(x, y, w, 200);
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, 18);
  ctx.fillStyle = "#4e9a32";
  for (let i = 0; i < w; i += 16) {
    ctx.fillRect(x + i, y - 4, 8, 6);
  }
}

function platform(ctx, x, y, w, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 22);
  ctx.fillStyle = "#6dbe45";
  ctx.fillRect(x, y, w, 8);
}

function house(ctx, x, y) {
  ctx.fillStyle = "#f3d7a4";
  ctx.fillRect(x, y - 110, 150, 110);
  ctx.fillStyle = "#c45c3e";
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 110);
  ctx.lineTo(x + 75, y - 168);
  ctx.lineTo(x + 162, y - 110);
  ctx.fill();
  ctx.fillStyle = "#6b3f2a";
  ctx.fillRect(x + 18, y - 70, 28, 70);
  ctx.fillStyle = "#7ec8e3";
  ctx.fillRect(x + 90, y - 78, 34, 28);
  ctx.fillStyle = "#e8c36a";
  ctx.beginPath();
  ctx.arc(x + 30, y - 180, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9d3c4";
  ctx.fillRect(x + 160, y - 36, 22, 36);
}

function veggies(ctx, x, y, healthy) {
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(x + i * 34, y - 8, 22, 8);
    ctx.fillStyle = healthy ? "#3fa34d" : "#9aa35a";
    ctx.beginPath();
    if (healthy) {
      ctx.ellipse(x + 11 + i * 34, y - 22, 10, 16, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(x + 11 + i * 34, y - 14, 12, 8, 0.4, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

function temple(ctx, x, y) {
  ctx.fillStyle = "#f0e2c4";
  ctx.fillRect(x, y - 100, 130, 100);
  ctx.fillStyle = "#c43b2c";
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 100);
  ctx.lineTo(x + 65, y - 168);
  ctx.lineTo(x + 146, y - 100);
  ctx.fill();
  ctx.fillStyle = "#f7e27a";
  ctx.fillRect(x + 52, y - 70, 26, 70);
  ctx.fillStyle = "#2f7a3e";
  ctx.beginPath();
  ctx.arc(x + 170, y - 70, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(x + 166, y - 50, 8, 50);
}

function sign(ctx, x, y, label) {
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(x + 14, y - 52, 6, 52);
  ctx.fillStyle = "#f0d48a";
  ctx.fillRect(x, y - 78, 36, 28);
  ctx.strokeStyle = "#6b4226";
  ctx.strokeRect(x, y - 78, 36, 28);
  ctx.fillStyle = "#3a2a18";
  ctx.font = "12px Tahoma, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + 18, y - 59);
}

function hole(ctx, x, y) {
  ctx.fillStyle = "#3b2a1a";
  ctx.beginPath();
  ctx.ellipse(x + 14, y + 4, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function sapling(ctx, x, y, t) {
  const sway = Math.sin(t * 4) * 2;
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(x + 4, y - 22, 5, 22);
  ctx.fillStyle = "#3fa34d";
  ctx.beginPath();
  ctx.arc(x + 6 + sway, y - 28, 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawWater(ctx, state) {
  for (const w of waterRects()) {
    ctx.fillStyle = state.trashCollected === 3 ? "rgba(80,180,220,0.75)" : "rgba(70,110,90,0.8)";
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(w.x, w.y, w.w, 6);
  }
}

function drawActors(ctx, state, t) {
  drawYaika(ctx, 380, GROUND_TOP);
  drawNovice(ctx, 2280, GROUND_TOP);
  if (!state.q3Correct || state.trashCollected < 3) {
    fish(ctx, 3400, 500, t);
  } else {
    fish(ctx, 3360 + Math.sin(t * 2) * 30, 490, t);
  }
  if (!state.trash.bag) trash(ctx, 3185, 390, "bag");
  if (!state.trash.bottle) trash(ctx, 3345, 350, "bottle");
  if (!state.trash.foam) trash(ctx, 3505, 390, "foam");
}

function drawYaika(ctx, x, y) {
  if (sprites.yaika) {
    drawSprite(ctx, sprites.yaika, x, y, 1, 72);
    return;
  }
  ctx.fillStyle = "#f3c7a0";
  ctx.beginPath();
  ctx.arc(x, y - 44, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9d3c4";
  ctx.fillRect(x - 12, y - 34, 24, 16);
  ctx.fillStyle = "#c45c8a";
  ctx.fillRect(x - 14, y - 20, 28, 20);
  ctx.fillStyle = "#eee4c8";
  ctx.fillRect(x - 16, y - 22, 32, 8);
}

function drawNovice(ctx, x, y) {
  if (sprites.novice) {
    drawSprite(ctx, sprites.novice, x, y, 1, 64);
    return;
  }
  ctx.fillStyle = "#f3c7a0";
  ctx.beginPath();
  ctx.arc(x, y - 44, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e07a2f";
  ctx.fillRect(x - 12, y - 34, 24, 34);
  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(x + 10, y - 28, 10, 16);
}

function fish(ctx, x, y, t) {
  ctx.fillStyle = "#f0a04b";
  ctx.beginPath();
  ctx.ellipse(x, y + Math.sin(t * 3) * 2, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function trash(ctx, x, y, kind) {
  if (kind === "bag") {
    ctx.fillStyle = "#d9d9d9";
    ctx.fillRect(x, y - 20, 18, 20);
  } else if (kind === "bottle") {
    ctx.fillStyle = "#7ec8e3";
    ctx.fillRect(x, y - 22, 10, 22);
  } else {
    ctx.fillStyle = "#f3e27a";
    ctx.fillRect(x, y - 14, 20, 14);
  }
}

export function drawPlayer(ctx, player, t) {
  const x = player.x + player.w / 2;
  const y = player.y + player.h;
  const pose = playerPose(player);
  const bob = pose === "walk" ? Math.sin(t * 12) * 2 : 0;
  const img = pickPlayerSprite(sprites, player, t);
  if (img) {
    drawSprite(ctx, img, x, y + bob, player.facing, 92);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(player.facing, 1);

  const step = pose === "walk" ? Math.sin(t * 12) * 4 : 0;
  const tuck = pose === "jump" ? 6 : 0;
  ctx.fillStyle = "#1f3a73";
  ctx.fillRect(-12, -22 + bob + tuck, 8, 18 - tuck);
  ctx.fillRect(2, -22 + bob + tuck, 8, 18 - tuck);
  ctx.fillRect(-10 + step, -10 + bob + tuck, 8, 10);
  ctx.fillRect(2 - step, -10 + bob + tuck, 8, 10);
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(-12, -36 + bob, 24, 16);
  ctx.fillStyle = "#f3c7a0";
  ctx.beginPath();
  ctx.arc(0, -46 + bob, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a241c";
  ctx.beginPath();
  ctx.arc(0, -50 + bob, 11, Math.PI, 0);
  ctx.fill();

  // white squirrel on left shoulder (screen-left when facing right)
  ctx.fillStyle = "#f7f3ea";
  ctx.beginPath();
  ctx.ellipse(-12, -34 + bob, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-18, -40 + bob + (pose === "jump" ? -3 : 0), 5, 8, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a241c";
  ctx.fillRect(-14, -36 + bob, 2, 2);

  ctx.restore();
}

function drawNear(ctx, camX) {
  if (sprites.near) {
    const extra = 180;
    const shift = (camX / (ZONE_W * 4)) * extra;
    ctx.drawImage(sprites.near, -shift, 0, CANVAS_W + extra, CANVAS_H);
    return;
  }
  ctx.fillStyle = "rgba(40,90,40,0.35)";
  const x = -((camX * 1.2) % 180);
  for (let i = -1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 180, CANVAS_H);
    ctx.lineTo(x + i * 180 + 40, 470);
    ctx.lineTo(x + i * 180 + 80, CANVAS_H);
    ctx.fill();
  }
}

export function cameraX(player) {
  return Math.max(0, Math.min(ZONE_W * 4, player.x + player.w / 2 - CANVAS_W / 2));
}

export { zoneNameAt };
