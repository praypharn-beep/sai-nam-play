import { DIALOGUE, QUESTIONS, WATER_ORDER, WATER_LABELS, ENDING_LINES, ZONE_NAMES } from "./content.js";
import { createState, applyEvent, canEnter, starCount, resetState } from "./state.js";
import {
  CANVAS_W,
  CANVAS_H,
  CHECKPOINTS,
  createPlayer,
  stepPlayer,
  buildSolids,
  fellInWater,
  interactables,
  nearestInteractable,
  zoneNameAt,
} from "./engine.js";
import { drawWorld, cameraX, setSprites } from "./draw.js";
import { loadSprites } from "./assets.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hudZone = document.getElementById("hud-zone");
const hudItems = document.getElementById("hud-items");
const promptEl = document.getElementById("prompt");
const modal = document.getElementById("modal");
const title = document.getElementById("title");
const ending = document.getElementById("ending");
const pause = document.getElementById("pause");

let scene = "title";
let state = createState();
let player = createPlayer();
let keys = {};
let jumpBuffered = false;
let modalKind = null;
let modalData = null;
let lastProgress = performance.now();
let hintArrow = false;
let lastTs = 0;

const input = { left: false, right: false, jump: false };

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) e.preventDefault();
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") jumpBuffered = true;
  if (e.code === "Escape") togglePause();
  if (e.code === "KeyE") onInteract();
  if (modalKind === "question" && ["Digit1", "Digit2", "Digit3"].includes(e.code)) {
    const map = { Digit1: "ก", Digit2: "ข", Digit3: "ค" };
    answerQuestion(map[e.code]);
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

document.getElementById("btn-start").addEventListener("click", startGame);
document.getElementById("btn-again").addEventListener("click", startGame);
document.getElementById("btn-home").addEventListener("click", showTitle);
document.getElementById("btn-resume").addEventListener("click", () => {
  pause.hidden = true;
});
document.getElementById("btn-quit").addEventListener("click", showTitle);

function startGame() {
  state = resetState();
  player = createPlayer();
  scene = "play";
  modalKind = null;
  title.hidden = true;
  ending.hidden = true;
  pause.hidden = true;
  lastProgress = performance.now();
}

function showTitle() {
  scene = "title";
  title.hidden = false;
  ending.hidden = true;
  pause.hidden = true;
  closeModal();
}

function togglePause() {
  if (scene !== "play" || modalKind) return;
  pause.hidden = !pause.hidden;
}

function onInteract() {
  if (scene !== "play" || pause.hidden === false) return;
  if (modalKind === "talk" || modalKind === "toast") {
    const after = modalData && modalData.after;
    closeModal();
    if (after === "ending") showEnding();
    return;
  }
  if (modalKind) return;

  const item = nearestInteractable(player, interactables(state));
  if (!item) return;
  if (item.type === "talk") {
    applyEvent(state, { type: "talk_yaika" });
    markProgress();
    openTalk("ยายกา", DIALOGUE.yaikaStart);
  } else if (item.type === "question") {
    openQuestion(item.question);
  } else if (item.type === "trash") {
    const r = applyEvent(state, { type: "pickup_trash", id: item.id });
    if (r.ok) {
      markProgress();
      openToast("เก็บขยะแล้ว");
    }
  } else if (item.type === "hole") {
    const r = applyEvent(state, { type: "plant", hole: item.hole, zone: "mountain" });
    if (r.ok) {
      markProgress();
      openToast("ปลูกต้นไม้แล้ว");
    }
  } else if (item.type === "sort") {
    openSort();
  }
}

function openTalk(who, text, after = null) {
  modalKind = "talk";
  modalData = { after };
  modal.hidden = false;
  modal.innerHTML = `<div class="box"><p class="who">${esc(who)}</p><p>${esc(text)}</p><p class="hint">กด E เพื่อต่อ</p></div>`;
}

function openToast(text) {
  modalKind = "toast";
  modalData = {};
  modal.hidden = false;
  modal.innerHTML = `<div class="box"><p>${esc(text)}</p><p class="hint">กด E เพื่อต่อ</p></div>`;
}

function openQuestion(id) {
  const q = QUESTIONS[id];
  const already = state[`${id}Correct`];
  if (already) {
    if (id === "q2") openTalk("สามเณรน้อย", DIALOGUE.noviceGive);
    else openToast("ตอบข้อนี้แล้ว");
    return;
  }
  modalKind = "question";
  modalData = { id };
  renderQuestion();
}

function renderQuestion() {
  const id = modalData.id;
  const q = QUESTIONS[id];
  const used = state[`${id}UsedHint`];
  modal.hidden = false;
  modal.innerHTML = `
    <div class="box">
      <p class="who">คำถาม</p>
      <p>${esc(q.text)}</p>
      <div class="choices">
        <button data-c="ก">ก. ${esc(q.choices.ก)}</button>
        <button data-c="ข">ข. ${esc(q.choices.ข)}</button>
        <button data-c="ค">ค. ${esc(q.choices.ค)}</button>
      </div>
      <p id="q-feedback" class="feedback"></p>
      ${used ? `<p class="hint">${esc(q.hint)}</p>` : `<button id="btn-hint">ขอใบ้ 1 ครั้ง</button>`}
    </div>`;
  modal.querySelectorAll("button[data-c]").forEach((b) => {
    b.addEventListener("click", () => answerQuestion(b.getAttribute("data-c")));
  });
  const hb = document.getElementById("btn-hint");
  if (hb) hb.addEventListener("click", useHint);
}

function useHint() {
  applyEvent(state, { type: "hint", question: modalData.id });
  renderQuestion();
}

function answerQuestion(choice) {
  const id = modalData.id;
  const r = applyEvent(state, { type: "answer", question: id, choice });
  const fb = document.getElementById("q-feedback");
  if (!r.ok) {
    if (fb) fb.textContent = "ยังไม่ถูก ลองใหม่ได้";
    return;
  }
  markProgress();
  if (id === "q2") {
    openTalk("สามเณรน้อย", DIALOGUE.noviceGive);
  } else {
    openToast("ถูกต้อง!");
  }
}

function openSort() {
  if (state.treesPlanted < 3) {
    openToast("ปลูกต้นไม้ให้ครบ 3 ต้นก่อนนะ");
    return;
  }
  if (state.waterSorted) {
    showEnding();
    return;
  }
  modalKind = "sort";
  modalData = { picked: [] };
  const leftover = shuffle([...WATER_ORDER]);
  modal.hidden = false;
  modal.innerHTML = `
    <div class="box">
      <p class="who">เรียงสายน้ำให้ถูก</p>
      <ol id="picked"></ol>
      <div class="choices" id="sort-choices">
        ${leftover.map((id) => `<button data-id="${id}">${esc(WATER_LABELS[id])}</button>`).join("")}
      </div>
      <p id="sort-fb" class="feedback"></p>
    </div>`;
  modal.querySelectorAll("#sort-choices button").forEach((b) => {
    b.addEventListener("click", () => pickWater(b.getAttribute("data-id"), b));
  });
}

function pickWater(id, btn) {
  modalData.picked.push(id);
  btn.disabled = true;
  document.getElementById("picked").innerHTML = modalData.picked
    .map((p, i) => `<li>${i + 1}. ${esc(WATER_LABELS[p])}</li>`)
    .join("");
  if (modalData.picked.length < 4) return;
  const r = applyEvent(state, { type: "sort_water", order: modalData.picked });
  if (!r.ok) {
    document.getElementById("sort-fb").textContent = "ลำดับยังไม่ถูก ลองใหม่";
    setTimeout(() => openSort(), 700);
    return;
  }
  markProgress();
  openTalk("ยายกา", `${DIALOGUE.yaikaEnd1} ${DIALOGUE.yaikaEnd2}`, "ending");
}

function showEnding() {
  scene = "ending";
  closeModal();
  ending.hidden = false;
  title.hidden = true;
  const stars = starCount(state);
  document.getElementById("end-stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  document.getElementById("end-lines").innerHTML = ENDING_LINES.map((l) => `<li>${esc(l)}</li>`).join("");
}

function closeModal() {
  modalKind = null;
  modalData = null;
  modal.hidden = true;
  modal.innerHTML = "";
}

function markProgress() {
  lastProgress = performance.now();
  hintArrow = false;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function loop(ts) {
  const dt = lastTs ? (ts - lastTs) / 1000 : 0;
  lastTs = ts;
  if (scene === "play" && pause.hidden && !modalKind) {
    input.left = !!(keys.ArrowLeft || keys.KeyA);
    input.right = !!(keys.ArrowRight || keys.KeyD);
    input.jump = jumpBuffered;
    jumpBuffered = false;
    const solids = buildSolids((zone) => canEnter(state, zone));
    stepPlayer(player, input, solids, dt);
    if (fellInWater(player)) {
      const zone = zoneNameAt(player.x);
      const spawn = CHECKPOINTS[zone] || CHECKPOINTS.stream;
      player.x = spawn.x;
      player.y = spawn.y;
      player.vx = 0;
      player.vy = 0;
      player.onGround = true;
    }
    if (performance.now() - lastProgress > 45000) hintArrow = true;
  }
  if (scene === "play") {
    const cam = cameraX(player);
    drawWorld(ctx, cam, player, state, ts / 1000);
    if (hintArrow) drawArrow(ctx);
    updateHud();
  }
  requestAnimationFrame(loop);
}

function drawArrow(ctx) {
  ctx.fillStyle = "rgba(255,220,80,0.9)";
  ctx.beginPath();
  ctx.moveTo(900, 250);
  ctx.lineTo(860, 230);
  ctx.lineTo(860, 270);
  ctx.fill();
}

function updateHud() {
  hudZone.textContent = ZONE_NAMES[zoneNameAt(player.x)];
  hudItems.textContent = `กล้าไม้ ${state.saplings}/3 · ขยะ ${state.trashCollected}/3 · ต้นที่ปลูก ${state.treesPlanted}/3`;
  const item = nearestInteractable(player, interactables(state));
  promptEl.hidden = !item || !!modalKind;
  if (item) promptEl.textContent = "กด E";
}

async function boot() {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  title.hidden = false;
  ending.hidden = true;
  setSprites(await loadSprites());
  requestAnimationFrame(loop);
}

boot();
