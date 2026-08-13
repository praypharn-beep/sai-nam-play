export const CANVAS_W = 960;
export const CANVAS_H = 540;
export const ZONE_W = 960;
export const ZONES = ["homestay", "garden", "temple", "stream", "mountain"];
export const GROUND_TOP = 430;
export const PLAYER_W = 36;
export const PLAYER_H = 48;
export const WALK_SPEED = 180;
export const JUMP_V = -420;
export const GRAVITY = 1200;

// ลื่นขึ้น: เร่งและหน่วงแทนความเร็วกระตุกทันที
export const GROUND_ACCEL = 1600; // px/s^2 เร่งบนพื้น
export const AIR_ACCEL = 900; // px/s^2 คุมทิศตอนลอย
export const FRICTION = 2200; // px/s^2 หน่วงตอนปล่อยปุ่มบนพื้น
export const MAX_FALL = 760; // เพดานความเร็วตก กันทะลุแท่น
// ผ่อนจังหวะกระโดดให้ไม่พลาดขอบแท่น
export const COYOTE_TIME = 0.09; // กระโดดได้อีกนิดหลังหลุดขอบ
export const JUMP_BUFFER = 0.12; // กดกระโดดก่อนแตะพื้นได้นิดหน่อย
export const MAX_STEP = 6; // px ต่อ substep ให้ชนแท่นนิ่ง

export const CHECKPOINTS = {
  homestay: { x: 430, y: GROUND_TOP - PLAYER_H },
  garden: { x: 1020, y: GROUND_TOP - PLAYER_H },
  temple: { x: 1980, y: GROUND_TOP - PLAYER_H },
  stream: { x: 2920, y: GROUND_TOP - PLAYER_H },
  mountain: { x: 3900, y: GROUND_TOP - PLAYER_H },
};

export function zoneIndexAt(x) {
  return Math.max(0, Math.min(ZONES.length - 1, Math.floor(x / ZONE_W)));
}

export function zoneNameAt(x) {
  return ZONES[zoneIndexAt(x)];
}

export function createPlayer(zone = "homestay") {
  const spawn = CHECKPOINTS[zone];
  return {
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    onGround: true,
    facing: 1,
    coyote: 0,
    jumpBuf: 0,
  };
}

function approach(cur, target, delta) {
  if (cur < target) return Math.min(cur + delta, target);
  if (cur > target) return Math.max(cur - delta, target);
  return target;
}

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function buildSolids(canEnterNext) {
  const solids = [];
  const thick = 200;

  solids.push({ x: -80, y: 0, w: 80, h: CANVAS_H });
  solids.push({ x: ZONE_W * 5, y: 0, w: 80, h: CANVAS_H });

  // Homestay, garden, temple: full ground
  for (const i of [0, 1, 2]) {
    solids.push({ x: i * ZONE_W, y: GROUND_TOP, w: ZONE_W, h: thick });
  }

  // Stream: banks + stepping stones
  solids.push({ x: 2880, y: GROUND_TOP, w: 200, h: thick });
  solids.push({ x: 3660, y: GROUND_TOP, w: 180, h: thick });
  solids.push({ x: 3160, y: 390, w: 90, h: 24 });
  solids.push({ x: 3320, y: 350, w: 90, h: 24 });
  solids.push({ x: 3480, y: 390, w: 90, h: 24 });

  // Mountain terraces
  solids.push({ x: 3840, y: GROUND_TOP, w: 200, h: thick });
  solids.push({ x: 4040, y: 370, w: 140, h: 24 });
  solids.push({ x: 4220, y: 310, w: 140, h: 24 });
  solids.push({ x: 4400, y: 250, w: 220, h: 24 });
  solids.push({ x: 4620, y: GROUND_TOP, w: 180, h: thick });

  const gates = [
    { x: 930, next: "garden" },
    { x: 1890, next: "temple" },
    { x: 2850, next: "stream" },
    { x: 3810, next: "mountain" },
  ];
  for (const g of gates) {
    if (!canEnterNext(g.next)) {
      solids.push({ x: g.x, y: 0, w: 28, h: GROUND_TOP, gate: g.next });
    }
  }
  return solids;
}

export function waterRects() {
  return [{ x: 3080, y: 450, w: 580, h: 90 }];
}

export function stepPlayer(player, input, solids, dt) {
  const t = Math.min(dt, 1 / 30);
  if (player.coyote === undefined) player.coyote = 0;
  if (player.jumpBuf === undefined) player.jumpBuf = 0;

  // แนวนอน: เร่งเข้าหาความเร็วเป้าหมาย ปล่อยแล้วหน่วงลง
  const target = input.left ? -WALK_SPEED : input.right ? WALK_SPEED : 0;
  let accel;
  if (target !== 0) accel = player.onGround ? GROUND_ACCEL : AIR_ACCEL;
  else accel = player.onGround ? FRICTION : AIR_ACCEL;
  player.vx = approach(player.vx, target, accel * t);
  if (input.left) player.facing = -1;
  else if (input.right) player.facing = 1;

  // coyote: เติมเต็มขณะอยู่พื้น นับถอยหลังตอนลอย
  if (player.onGround) player.coyote = COYOTE_TIME;
  else player.coyote = Math.max(0, player.coyote - t);

  // jump buffer: ตั้งตอนกด นับถอยหลัง แล้วยิงเมื่อยังมี coyote
  if (input.jump) player.jumpBuf = JUMP_BUFFER;
  else player.jumpBuf = Math.max(0, player.jumpBuf - t);
  if (player.jumpBuf > 0 && player.coyote > 0) {
    player.vy = JUMP_V;
    player.onGround = false;
    player.coyote = 0;
    player.jumpBuf = 0;
  }

  player.vy += GRAVITY * t;
  if (player.vy > MAX_FALL) player.vy = MAX_FALL;

  // ขยับทีละ substep เล็ก ๆ ให้ชนแท่นนิ่ง ไม่จม ไม่ทะลุ
  const span = Math.max(Math.abs(player.vx), Math.abs(player.vy)) * t;
  const steps = Math.max(1, Math.ceil(span / MAX_STEP));
  const subT = t / steps;
  player.onGround = false;
  for (let i = 0; i < steps; i++) {
    player.x += player.vx * subT;
    resolve(player, solids, "x");
    player.y += player.vy * subT;
    resolve(player, solids, "y");
  }
}

function resolve(player, solids, axis) {
  for (const s of solids) {
    if (!aabb(player, s)) continue;
    if (axis === "x") {
      if (player.vx > 0) player.x = s.x - player.w;
      else if (player.vx < 0) player.x = s.x + s.w;
      player.vx = 0;
    } else {
      if (player.vy > 0) {
        player.y = s.y - player.h;
        player.vy = 0;
        player.onGround = true;
      } else if (player.vy < 0) {
        player.y = s.y + s.h;
        player.vy = 0;
      }
    }
  }
}

export function touchingGate(player, solids) {
  return solids.find((s) => s.gate && aabb(player, s)) || null;
}

export const GATE_HINTS = {
  garden: "เดินกลับไปคุยยายกา แล้วกด E หรือปุ่มพูด",
  temple: "ตอบคำถามที่ป้ายสวนให้ถูกก่อน",
  stream: "คุยสามเณรที่วัดให้ครบ แล้วรับกล้าไม้ก่อน",
  mountain: "ตอบคำถามที่ห้วย แล้วเก็บขยะให้ครบ 3 ชิ้นก่อน",
};

export function fellInWater(player) {
  const body = { x: player.x + 8, y: player.y + player.h - 8, w: player.w - 16, h: 10 };
  return waterRects().some((w) => aabb(body, w));
}

export function interactables(state) {
  const list = [
    { id: "yaika", type: "talk", x: 360, y: GROUND_TOP - 56, w: 48, h: 56, zone: "homestay" },
    { id: "q1", type: "question", question: "q1", x: 1240, y: GROUND_TOP - 70, w: 36, h: 70, zone: "garden" },
    { id: "novice", type: "question", question: "q2", x: 2260, y: GROUND_TOP - 56, w: 40, h: 56, zone: "temple" },
    { id: "q3", type: "question", question: "q3", x: 2980, y: GROUND_TOP - 70, w: 36, h: 70, zone: "stream" },
  ];
  if (state.treesPlanted >= 3) {
    list.push({ id: "sort", type: "sort", x: 4700, y: GROUND_TOP - 70, w: 36, h: 70, zone: "mountain" });
  }
  if (!state.trash.bag) list.push({ id: "bag", type: "trash", x: 3185, y: 390 - 22, w: 24, h: 22, zone: "stream" });
  if (!state.trash.bottle) list.push({ id: "bottle", type: "trash", x: 3345, y: 350 - 22, w: 18, h: 22, zone: "stream" });
  if (!state.trash.foam) list.push({ id: "foam", type: "trash", x: 3505, y: 390 - 22, w: 24, h: 18, zone: "stream" });
  if (!state.planted[1]) list.push({ id: 1, type: "hole", hole: 1, x: 4080, y: 370 - 16, w: 40, h: 24, zone: "mountain" });
  if (!state.planted[2]) list.push({ id: 2, type: "hole", hole: 2, x: 4260, y: 310 - 16, w: 40, h: 24, zone: "mountain" });
  if (!state.planted[3]) list.push({ id: 3, type: "hole", hole: 3, x: 4440, y: 250 - 16, w: 48, h: 28, zone: "mountain" });
  return list;
}

export function nearestInteractable(player, items) {
  let best = null;
  let bestD = 88;
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  for (const it of items) {
    const ix = it.x + it.w / 2;
    const iy = it.y + it.h / 2;
    const d = Math.hypot(px - ix, py - iy);
    if (d < bestD) {
      best = it;
      bestD = d;
    }
  }
  return best;
}
