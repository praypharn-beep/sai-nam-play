export const SPRITE_PATHS = {
  player: "assets/characters/nong-mok.png",
  playerIdle: "assets/characters/nong-mok-idle.png",
  playerJump: "assets/characters/nong-mok-jump.png",
  playerWalkRight: "assets/characters/nong-mok-walk-right.png",
  playerWalkLeft: "assets/characters/nong-mok-walk-left.png",
  yaika: "assets/characters/yaika.png",
  novice: "assets/characters/novice.png",
  far: "assets/backgrounds/phu-far.png",
  mid: "assets/backgrounds/phu-mid.png",
  near: "assets/backgrounds/phu-near.png",
};

export const WALK_FPS = 3;

export function playerPose(player) {
  if (!player || !player.onGround) return "jump";
  if (Math.abs(player.vx || 0) > 0) return "walk";
  return "idle";
}

export function walkFrameIndex(time, frameCount) {
  const n = Math.max(1, frameCount | 0);
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  return Math.floor(t * WALK_FPS) % n;
}

export function walkFrames(sprites) {
  if (!sprites) return [];
  return [sprites.playerWalkRight, sprites.playerWalkLeft].filter(Boolean);
}

export function pickPlayerSprite(sprites, player, time = 0) {
  if (!sprites) return null;
  const pose = playerPose(player);
  if (pose === "jump") return sprites.playerJump || sprites.player || null;
  if (pose === "idle") return sprites.playerIdle || sprites.player || null;
  const frames = walkFrames(sprites);
  if (!frames.length) return sprites.player || null;
  return frames[walkFrameIndex(time, frames.length)];
}

export async function loadSprites() {
  const sprites = {};
  await Promise.all(
    Object.entries(SPRITE_PATHS).map(async ([key, path]) => {
      sprites[key] = await tryLoad(path);
    }),
  );
  return sprites;
}

function tryLoad(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
