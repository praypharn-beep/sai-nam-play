import { QUESTIONS, WATER_ORDER } from "./content.js";

const TRASH_IDS = ["bag", "bottle", "foam"];

export function createState() {
  return {
    talkedYaika: false,
    q1Correct: false,
    q1UsedHint: false,
    q2Correct: false,
    q2UsedHint: false,
    q3Correct: false,
    q3UsedHint: false,
    saplings: 0,
    trashCollected: 0,
    trash: { bag: false, bottle: false, foam: false },
    treesPlanted: 0,
    planted: { 1: false, 2: false, 3: false },
    waterSorted: false,
  };
}

export function resetState() {
  return createState();
}

export function canEnter(state, zone) {
  if (zone === "homestay") return true;
  if (zone === "garden") return state.talkedYaika;
  if (zone === "temple") return state.q1Correct;
  if (zone === "stream") return state.q2Correct;
  if (zone === "mountain") return state.q3Correct && state.trashCollected === 3;
  if (zone === "ending") return state.treesPlanted === 3 && state.waterSorted;
  return false;
}

export function unusedHintCount(state) {
  let n = 0;
  if (state.q1Correct && !state.q1UsedHint) n += 1;
  if (state.q2Correct && !state.q2UsedHint) n += 1;
  if (state.q3Correct && !state.q3UsedHint) n += 1;
  return n;
}

export function starCount(state) {
  if (!state.waterSorted) return 0;
  const unused = unusedHintCount(state);
  if (unused === 3) return 3;
  if (unused >= 2) return 2;
  return 1;
}

export function applyEvent(state, event) {
  if (!event || !event.type) return { ok: false, reason: "no-event" };

  if (event.type === "talk_yaika") {
    state.talkedYaika = true;
    return { ok: true };
  }

  if (event.type === "hint") {
    const key = hintFlag(event.question);
    if (!key) return { ok: false, reason: "bad-question" };
    if (state[correctFlag(event.question)]) return { ok: false, reason: "already-correct" };
    if (state[key]) return { ok: false, reason: "hint-used" };
    state[key] = true;
    return { ok: true, hint: QUESTIONS[event.question].hint };
  }

  if (event.type === "answer") {
    const q = QUESTIONS[event.question];
    if (!q) return { ok: false, reason: "bad-question" };
    const flag = correctFlag(event.question);
    if (state[flag]) return { ok: true, already: true };
    const ok = event.choice === q.correct;
    if (ok) {
      state[flag] = true;
      if (event.question === "q2") state.saplings = 3;
    }
    return { ok, correct: ok };
  }

  if (event.type === "pickup_trash") {
    if (!state.q3Correct) return { ok: false, reason: "need-q3" };
    if (!TRASH_IDS.includes(event.id)) return { ok: false, reason: "bad-trash" };
    if (state.trash[event.id]) return { ok: false, reason: "already" };
    state.trash[event.id] = true;
    state.trashCollected += 1;
    return { ok: true };
  }

  if (event.type === "plant") {
    if (event.zone !== "mountain") return { ok: false, reason: "wrong-zone" };
    if (state.saplings <= 0) return { ok: false, reason: "no-sapling" };
    const hole = Number(event.hole);
    if (![1, 2, 3].includes(hole)) return { ok: false, reason: "bad-hole" };
    if (state.planted[hole]) return { ok: false, reason: "already" };
    state.planted[hole] = true;
    state.saplings -= 1;
    state.treesPlanted += 1;
    return { ok: true };
  }

  if (event.type === "sort_water") {
    if (state.treesPlanted < 3) return { ok: false, reason: "need-trees" };
    const order = event.order || [];
    const ok =
      order.length === WATER_ORDER.length &&
      order.every((id, i) => id === WATER_ORDER[i]);
    if (ok) state.waterSorted = true;
    return { ok };
  }

  return { ok: false, reason: "unknown" };
}

function correctFlag(question) {
  if (question === "q1") return "q1Correct";
  if (question === "q2") return "q2Correct";
  if (question === "q3") return "q3Correct";
  return null;
}

function hintFlag(question) {
  if (question === "q1") return "q1UsedHint";
  if (question === "q2") return "q2UsedHint";
  if (question === "q3") return "q3UsedHint";
  return null;
}
