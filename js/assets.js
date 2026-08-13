export const SPRITE_PATHS = {
  player: "assets/characters/nong-mok.png",
  yaika: "assets/characters/yaika.png",
  novice: "assets/characters/novice.png",
  far: "assets/backgrounds/phu-far.png",
  mid: "assets/backgrounds/phu-mid.png",
};

export async function loadSprites() {
  const sprites = { player: null, yaika: null, novice: null, far: null, mid: null };
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
