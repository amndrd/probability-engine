/* ---------------------------------------------------------
   State model — persisted to localStorage.

   `bank` is the money currently in play (was `balance`).
   `tickets` is the meta-currency, earned by clearing a casino
   day's quota, spent in the shop.
   `run` holds the current "casino day" attempt, if any — see
   run.js for the loop that drives it. There is deliberately no
   timer: the player takes as long as they want, and a day only
   ever ends when they choose to cash out at or above the quota.
   --------------------------------------------------------- */

const STORAGE_KEY = 'fauxvegas_state_v1';

export const MILLIONAIRE_TARGET = 1000000;
export const MAX_RELOADS_PER_DAY = 5;
export const RELOAD_AMOUNT = 500;
export const LOW_BALANCE_THRESHOLD = 10;

export const CHALLENGE_TEMPLATES = [
  { id: 'win3', desc: 'Gagne 3 mises à la roulette', target: 3, reward: 200 },
  { id: 'win5', desc: 'Gagne 5 mises à la roulette', target: 5, reward: 350 },
  { id: 'spin10', desc: 'Lance la roulette 10 fois', target: 10, reward: 150 },
];

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatMoney(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function pickChallenge() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const tpl = CHALLENGE_TEMPLATES[dayIndex % CHALLENGE_TEMPLATES.length];
  return { date: todayStr(), id: tpl.id, progress: 0, done: false };
}

function defaultRun() {
  return {
    active: false,
    quota: 0,
    dayStartBank: 0,
    // Bank value right before the most recently resolved bet (any game) —
    // what the Time Machine item restores. Reset each new day.
    lastBetSnapshot: null,
    // Day-long buffs (Gambler's Confidence, Bonus Draw) — active until the
    // day is cashed out, not consumed on a single bet like armed items.
    buffs: { confidence: false, bonusDraw: false },
  };
}

export function defaultState() {
  return {
    bank: 500,
    tickets: 0,
    level: 1,
    levelTarget: 1500,
    items: {},
    armedItem: null,
    millionaireShown: false,
    challenge: pickChallenge(),
    reloads: { date: todayStr(), count: 0 },
    history: [],
    muted: false,
    // Testing convenience, off by default — see the "Débloquer tous les
    // jeux" toggle in Réglages. Bypasses each game's unlockLevel without
    // touching the level/quota progression itself.
    unlockAllGames: false,
    run: defaultRun(),
  };
}

export function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);

    // Migrate saves from before the bank/tickets split.
    if (parsed.bank === undefined && parsed.balance !== undefined) {
      parsed.bank = parsed.balance;
      delete parsed.balance;
    }
    if (parsed.tickets === undefined) parsed.tickets = 0;
    if (parsed.armedItem === undefined) {
      parsed.armedItem = parsed.armedChanceX3 ? 'chanceX3' : null;
      delete parsed.armedChanceX3;
    }
    if (!parsed.run) parsed.run = defaultRun();
    // Migrate saves from before the timer was removed / buffs existed.
    delete parsed.run.endsAt;
    if (parsed.run.lastBetSnapshot === undefined) parsed.run.lastBetSnapshot = null;
    if (!parsed.run.buffs) parsed.run.buffs = { confidence: false, bonusDraw: false };
    if (parsed.unlockAllGames === undefined) parsed.unlockAllGames = false;

    if (!parsed.challenge || parsed.challenge.date !== todayStr()) {
      parsed.challenge = pickChallenge();
    }
    if (!parsed.reloads || parsed.reloads.date !== todayStr()) {
      parsed.reloads = { date: todayStr(), count: 0 };
    }
    if (!parsed.items) parsed.items = {};
    if (parsed.millionaireShown === undefined) parsed.millionaireShown = false;
    return parsed;
  } catch (e) {
    return defaultState();
  }
}

export const state = loadLocalState();

// Lets room.js redirect persistence to Firebase while a multiplayer room is
// active, without state.js importing room.js (which would create a cycle —
// see docs/web-architecture.md's dependency rule). The hook returns true if
// it handled saving itself (skip the local write), false/undefined to fall
// through to the normal localStorage save.
let onSaveHook = null;
export function setOnSaveHook(fn) {
  onSaveHook = fn;
}

export function saveState() {
  const handled = onSaveHook ? onSaveHook() : false;
  if (!handled) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function nextLevelTarget(currentTarget) {
  return Math.round((currentTarget * 1.55) / 50) * 50;
}

export function bonusForLevelUp(target) {
  return Math.round((target * 0.15) / 10) * 10;
}

export function isQuotaMet() {
  return state.run.active && state.bank >= state.run.quota;
}
