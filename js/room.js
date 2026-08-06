/* ---------------------------------------------------------
   Multiplayer rooms — the shared bank. A room is nothing more
   than the economic slice of `state` (bank, tickets, items, run,
   history…) living in Firebase instead of localStorage, synced
   to every player in real time. See docs/web-architecture.md §8
   and the Phase 6 plan for the full design and its limits.

   Sync model: last-write-wins, debounced (~150ms). This is NOT
   per-field transactional — two players resolving a bet in the
   same instant could have one push clobber the other. Acceptable
   for a casual play-money game between friends; converting every
   mutation site across 12 game files into atomic Firebase
   transactions was judged disproportionate for this project.

   The Firebase SDK is loaded lazily (only once a player actually
   creates/joins a room) via the official CDN ES module build, so
   solo-only players never pay for it and the site stays buildless.
   --------------------------------------------------------- */

import { state, setOnSaveHook, loadLocalState, defaultState } from './state.js';

const FIREBASE_SDK_VERSION = '10.13.0';
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — easy to read aloud
const PRESENCE_INTERVAL_MS = 15000;
const PRESENCE_STALE_MS = 40000; // a player not heard from in this long is treated as offline

// The fields that make up "the shared bank" — everything else in `state`
// (muted, unlockAllGames, reloads, and which game view is open) stays local
// to each device. See the Phase 6 plan's "Ce qui est partagé" section.
const ECONOMY_KEYS = [
  'bank', 'tickets', 'level', 'levelTarget', 'items', 'armedItem',
  'millionaireShown', 'challenge', 'history', 'run',
];

let fb = null; // { ref, set, update, remove, get, onValue, off }
let db = null;
let roomId = null;
let playerId = null;
let playerName = null;
let unsubscribeFn = null;
let pushTimer = null;
let presenceTimer = null;
let onRoomChange = null;

export function isInRoom() {
  return roomId !== null;
}

export function getRoomInfo() {
  return { roomId, playerId, playerName };
}

// main.js registers this to know when to re-render everything after a
// remote change (join, leave, or a teammate's action) comes in.
export function onRoomUpdate(callback) {
  onRoomChange = callback;
}

async function loadFirebase() {
  if (fb) return fb;
  const [{ initializeApp }, database, { FIREBASE_CONFIG, isFirebaseConfigured }] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-database.js`),
    import('./firebaseConfig.js'),
  ]);
  if (!isFirebaseConfigured()) {
    throw new Error('MISSING_CONFIG');
  }
  const app = initializeApp(FIREBASE_CONFIG);
  db = database.getDatabase(app);
  fb = database;
  return fb;
}

function economySnapshot() {
  const snap = {};
  ECONOMY_KEYS.forEach(k => { snap[k] = state[k]; });
  return snap;
}

function applyRemoteEconomy(data) {
  if (!data) return;
  ECONOMY_KEYS.forEach(k => {
    if (data[k] !== undefined) state[k] = data[k];
  });
  if (onRoomChange) onRoomChange();
}

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  return code;
}

function makePlayerId() {
  return 'p' + Math.random().toString(36).slice(2, 10);
}

function subscribeToRoom() {
  const economyRef = fb.ref(db, `rooms/${roomId}/economy`);
  unsubscribeFn = fb.onValue(economyRef, snap => applyRemoteEconomy(snap.val()));
}

function startPresence() {
  const beat = () => {
    if (!roomId) return;
    fb.update(fb.ref(db, `rooms/${roomId}/players/${playerId}`), { name: playerName, lastSeen: Date.now() }).catch(() => {});
  };
  beat();
  presenceTimer = setInterval(beat, PRESENCE_INTERVAL_MS);
}

/**
 * Creates a fresh room seeded with a brand-new economy (not this device's
 * solo save — a room starts everyone at $500, level 1, like a new game).
 */
export async function createRoom(name) {
  await loadFirebase();
  const code = generateRoomCode();
  playerId = makePlayerId();
  playerName = name;

  // Build the starting economy from a throwaway default state rather than
  // this device's own solo save — a new room is a fresh casino run shared
  // by everyone who joins it.
  const blank = {};
  const defaults = defaultState();
  ECONOMY_KEYS.forEach(k => { blank[k] = defaults[k]; });

  await fb.set(fb.ref(db, `rooms/${code}`), {
    economy: blank,
    players: { [playerId]: { name, joinedAt: Date.now(), lastSeen: Date.now() } },
  });

  roomId = code;
  Object.assign(state, blank);
  subscribeToRoom();
  startPresence();
  if (onRoomChange) onRoomChange();
  return code;
}

export async function joinRoom(codeInput, name) {
  await loadFirebase();
  const code = codeInput.trim().toUpperCase();
  const snap = await fb.get(fb.ref(db, `rooms/${code}/economy`));
  if (!snap.exists()) {
    throw new Error('ROOM_NOT_FOUND');
  }

  playerId = makePlayerId();
  playerName = name;
  roomId = code;
  applyRemoteEconomy(snap.val());

  await fb.set(fb.ref(db, `rooms/${code}/players/${playerId}`), { name, joinedAt: Date.now(), lastSeen: Date.now() });
  subscribeToRoom();
  startPresence();
  return code;
}

export function leaveRoom() {
  if (unsubscribeFn) unsubscribeFn();
  if (presenceTimer) clearInterval(presenceTimer);
  if (fb && roomId && playerId) {
    fb.remove(fb.ref(db, `rooms/${roomId}/players/${playerId}`)).catch(() => {});
  }
  roomId = null;
  playerId = null;
  playerName = null;
  unsubscribeFn = null;
  presenceTimer = null;

  // Restore this device's own solo save, untouched by whatever happened in
  // the room.
  Object.assign(state, loadLocalState());
  if (onRoomChange) onRoomChange();
}

export function pushEconomyToRoom() {
  if (!roomId || !fb) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    fb.update(fb.ref(db, `rooms/${roomId}/economy`), economySnapshot()).catch(() => {});
  }, 150);
}

/** Players seen in the last PRESENCE_STALE_MS — everyone else is treated as gone. */
export async function listActivePlayers() {
  if (!roomId || !fb) return [];
  const snap = await fb.get(fb.ref(db, `rooms/${roomId}/players`));
  if (!snap.exists()) return [];
  const cutoff = Date.now() - PRESENCE_STALE_MS;
  return Object.values(snap.val()).filter(p => p.lastSeen >= cutoff);
}

// Redirect state.js's persistence to Firebase while a room is active — see
// state.js's setOnSaveHook() for why this is a hook instead of a direct
// import cycle.
setOnSaveHook(() => {
  if (!roomId) return false;
  pushEconomyToRoom();
  return true;
});

window.addEventListener('beforeunload', () => {
  // Best-effort only — browsers don't guarantee this fires, so stale
  // entries are also filtered out by lastSeen in listActivePlayers().
  if (fb && roomId && playerId) {
    fb.remove(fb.ref(db, `rooms/${roomId}/players/${playerId}`)).catch(() => {});
  }
});
