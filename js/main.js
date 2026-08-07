/* ---------------------------------------------------------
   Bootstrap — wires the home/app screens together and kicks off
   every module's init. This is the only file that knows about
   all the others (see docs/web-architecture.md's dependency rule).
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from './state.js';
import { buildIconSVG } from './icons.js';
import {
  initTabs, initSettings, initReloadButton, initClickSounds,
  renderHeader, renderChallenge, showToast, renderUnlockAllToggle,
} from './ui.js';
import { renderShop, renderItemBar } from './items.js';
import { renderGameList, initCarousel, initGameNav } from './games/engine.js';
import { renderHistoryTab } from './games/roulette.js';
import { initRun, renderBank } from './run.js';
import { createRoom, joinRoom, leaveRoom, isInRoom, getRoomInfo, onRoomUpdate, listActivePlayers } from './room.js';

/* ---------------------- Icons ---------------------- */

// Populates every static [data-icon] placeholder in the HTML (buttons, tab
// labels, modal icons…) with its flat SVG icon. Elements built dynamically in
// JS (game cards, shop, bank…) call buildIconSVG() directly instead.
function initIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = buildIconSVG(el.dataset.icon);
  });
}

// Continuous loop of falling bill icons behind the home screen content.
// Negative animation-delay values start each bill mid-fall so the rain looks
// already in progress the instant the page loads, instead of every bill
// starting together at the top.
function initMoneyRain() {
  const container = document.getElementById('moneyRain');
  if (!container) return;
  const billSVG = buildIconSVG('bill');
  const COUNT = 16;
  let html = '';
  for (let i = 0; i < COUNT; i++) {
    const size = 16 + Math.random() * 16;
    const left = Math.random() * 100;
    const duration = (6 + Math.random() * 7).toFixed(2);
    const delay = (-Math.random() * duration).toFixed(2);
    const rot = (Math.random() < 0.5 ? -1 : 1) * Math.round(180 + Math.random() * 360);
    html += `<div class="money-bill" style="left:${left}%;width:${size}px;--rot:${rot}deg;animation-duration:${duration}s;animation-delay:${delay}s;">${billSVG}</div>`;
  }
  container.innerHTML = html;
}

// Builds the green dissolve transition strip: a grid of tiny cells that pop
// in with a delay biased by row (bottom rows first) plus random jitter, so
// the fill looks like a scattered dissolve growing upward rather than a
// clean line sweep — but every cell is always created, so it always ends up
// fully covered, never leaving permanent gaps.
function initScreenTransition() {
  const container = document.getElementById('pixelTransition');
  if (!container) return;
  const COLS = 28;
  const ROWS = 9;
  const ROW_STEP_MS = 140;
  const JITTER_MS = 220;
  const SHADES = ['#8be6a8', '#6fdb95'];
  let html = '';
  for (let row = 0; row < ROWS; row++) {
    const rowFromBottom = ROWS - 1 - row;
    for (let col = 0; col < COLS; col++) {
      const delay = Math.round(rowFromBottom * ROW_STEP_MS + Math.random() * JITTER_MS);
      const shade = SHADES[Math.random() < 0.7 ? 0 : 1];
      html += `<div class="pixel-cell" style="left:${(col / COLS * 100).toFixed(3)}%;top:${(row / ROWS * 100).toFixed(3)}%;width:${(100 / COLS).toFixed(3)}%;height:${(100 / ROWS).toFixed(3)}%;background:${shade};animation-delay:${delay}ms;"></div>`;
    }
  }
  container.innerHTML = html;
}

/* ---------------------- Home / app screens ---------------------- */

function updateHomeStatus() {
  const el = document.getElementById('homeStatus');
  const text = document.getElementById('homeStatusText');
  text.textContent = `Niveau ${state.level} · ${formatMoney(state.bank)}`;
  el.classList.remove('hidden');
}

function goHome() {
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('homeScreen').classList.remove('hidden');
  updateHomeStatus();
}

function renderAll() {
  renderHeader();
  renderGameList();
  renderBank();
  renderShop();
  renderChallenge();
  renderHistoryTab();
  // Every game view keeps its own item-bar element in the DOM even while
  // hidden (see docs/web-architecture.md) — refreshing all of them here,
  // rather than just the currently-visible one, is what keeps a teammate's
  // purchase or armed item visible the moment you switch to that game.
  document.querySelectorAll('.item-bar').forEach(el => renderItemBar(el.id));
}

function enterApp() {
  document.getElementById('homeScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  renderAll();
  renderRoomBadge();
}

function initHomeScreen() {
  document.getElementById('playSoloBtn').addEventListener('click', enterApp);
  document.getElementById('playMultiBtn').addEventListener('click', openMultiplayerModal);
  document.getElementById('playModesBtn').addEventListener('click', () => {
    showToast("D'autres modes de jeu arrivent bientôt !");
  });
  document.getElementById('homeBtn').addEventListener('click', goHome);
}

/* ---------------------- Multiplayer ---------------------- */

function openMultiplayerModal() {
  document.getElementById('mpError').classList.add('hidden');
  document.getElementById('multiplayerModal').classList.remove('hidden');
}

function closeMultiplayerModal() {
  document.getElementById('multiplayerModal').classList.add('hidden');
}

function showMpError(message) {
  const el = document.getElementById('mpError');
  el.textContent = message;
  el.classList.remove('hidden');
}

function describeRoomError(err) {
  if (err && err.message === 'MISSING_CONFIG') {
    return "Le multijoueur n'est pas encore configuré côté serveur (voir js/firebaseConfig.js) — le solo fonctionne normalement en attendant.";
  }
  if (err && err.message === 'ROOM_NOT_FOUND') {
    return 'Salle introuvable — vérifie le code avec la personne qui a créé la salle.';
  }
  if (err && err.code === 'auth/operation-not-allowed') {
    return "L'authentification anonyme n'est pas activée sur le projet Firebase (voir Build → Authentication → Sign-in method).";
  }
  return 'Une erreur est survenue, réessaie dans un instant.';
}

async function renderRoomBadge() {
  const badge = document.getElementById('roomBadge');
  if (!isInRoom()) {
    badge.classList.add('hidden');
    return;
  }
  const { roomId } = getRoomInfo();
  badge.classList.remove('hidden');
  document.getElementById('roomBadgeCode').textContent = roomId;
  const players = await listActivePlayers();
  document.getElementById('roomBadgePlayers').textContent =
    players.length > 1 ? `${players.length} joueurs` : '1 joueur';
}

function initMultiplayerModal() {
  document.getElementById('multiplayerCloseX').addEventListener('click', closeMultiplayerModal);

  document.querySelectorAll('.mp-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mp-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('mpCreatePanel').classList.toggle('hidden', btn.dataset.mpTab !== 'create');
      document.getElementById('mpJoinPanel').classList.toggle('hidden', btn.dataset.mpTab !== 'join');
      document.getElementById('mpError').classList.add('hidden');
    });
  });

  document.getElementById('mpCreateBtn').addEventListener('click', async () => {
    const name = document.getElementById('mpCreateName').value.trim();
    if (!name) { showMpError('Choisis un pseudo.'); return; }
    const btn = document.getElementById('mpCreateBtn');
    btn.disabled = true;
    try {
      const code = await createRoom(name);
      closeMultiplayerModal();
      enterApp();
      showToast(`Salle créée : ${code} — partage ce code à tes amis !`, 4000);
    } catch (err) {
      showMpError(describeRoomError(err));
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('mpJoinBtn').addEventListener('click', async () => {
    const code = document.getElementById('mpJoinCode').value.trim();
    const name = document.getElementById('mpJoinName').value.trim();
    if (!code || !name) { showMpError('Renseigne le code de la salle et ton pseudo.'); return; }
    const btn = document.getElementById('mpJoinBtn');
    btn.disabled = true;
    try {
      await joinRoom(code, name);
      closeMultiplayerModal();
      enterApp();
      showToast('Salle rejointe !');
    } catch (err) {
      showMpError(describeRoomError(err));
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('roomLeaveBtn').addEventListener('click', () => {
    leaveRoom();
    showToast('Tu as quitté la salle — retour à ta progression solo.');
    renderAll();
    renderRoomBadge();
  });

  onRoomUpdate(() => {
    renderAll();
    renderRoomBadge();
  });

  // Presence (who's currently in the room) lives on a separate Firebase path
  // from the economy, so it doesn't trigger onRoomUpdate() — poll it
  // occasionally to keep the player count from going stale.
  setInterval(() => {
    if (isInRoom()) renderRoomBadge();
  }, 10000);
}

// Testing convenience toggle (Réglages) — bypasses each game's unlockLevel
// without touching level/quota progression. Lives here rather than in ui.js
// because it needs to refresh the carousel's lock states (games/engine.js).
function initUnlockAllToggle() {
  document.getElementById('unlockAllToggleBtn').addEventListener('click', () => {
    state.unlockAllGames = !state.unlockAllGames;
    saveState();
    renderUnlockAllToggle();
    renderGameList();
  });
}

/* ---------------------- Init ---------------------- */

initIcons();
initMoneyRain();
initScreenTransition();
initTabs();
initSettings();
initReloadButton();
initClickSounds();
initCarousel();
initGameNav();
initHomeScreen();
initUnlockAllToggle();
initMultiplayerModal();
initRun();
updateHomeStatus();
