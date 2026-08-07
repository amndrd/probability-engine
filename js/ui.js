/* ---------------------------------------------------------
   Shared UI plumbing: toasts, tabs, settings modal, and the
   delegated click-sound handler. Anything generic enough to be
   used by more than one game or system lives here.
   --------------------------------------------------------- */

import {
  state, saveState, resetState, formatMoney,
  MAX_RELOADS_PER_DAY, RELOAD_AMOUNT, LOW_BALANCE_THRESHOLD,
  CHALLENGE_TEMPLATES,
} from './state.js';
import { buildIconSVG } from './icons.js';
import { playClick, playChip } from './audio.js';

export function showToast(msg, duration = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), duration);
}

/* ---------------------- Header (balance / tickets / level / reload) ---------------------- */

function maybeReload() {
  if (state.bank >= LOW_BALANCE_THRESHOLD) return;
  if (state.reloads.count >= MAX_RELOADS_PER_DAY) return;
  document.getElementById('reloadBtn').classList.remove('hidden');
}

export function renderHeader() {
  document.getElementById('balanceValue').textContent = state.bank.toLocaleString('en-US');
  document.getElementById('ticketsValue').textContent = state.tickets.toLocaleString('en-US');
  document.getElementById('levelNum').textContent = state.level;

  const prevTarget = state.level === 1 ? 500 : null;
  const floor = prevTarget !== null ? 500 : 0;
  const pct = Math.max(0, Math.min(100, ((state.bank - floor) / (state.levelTarget - floor)) * 100));
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressLabel').textContent =
    `${formatMoney(state.bank)} / ${formatMoney(state.levelTarget)}`;

  document.getElementById('reloadBtn').classList.add('hidden');
  maybeReload();
}

export function initReloadButton() {
  document.getElementById('reloadBtn').addEventListener('click', () => {
    if (state.reloads.count >= MAX_RELOADS_PER_DAY) {
      showToast('Reviens demain pour une nouvelle recharge !');
      return;
    }
    state.bank += RELOAD_AMOUNT;
    state.reloads.count += 1;
    showToast(`+${formatMoney(RELOAD_AMOUNT)} offerts pour continuer à jouer !`);
    saveState();
    renderHeader();
  });
}

/* ---------------------- Tabs ---------------------- */

export function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
}

export function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

/* ---------------------- Settings modal ---------------------- */

function renderSoundToggle() {
  const btn = document.getElementById('soundToggleBtn');
  const icon = buildIconSVG(state.muted ? 'soundOff' : 'soundOn');
  btn.innerHTML = `<span class="icon-svg inline-icon">${icon}</span> ${state.muted ? 'Désactivé' : 'Activé'}`;
}

// Rendering lives here (pure, no cross-module refresh needed); the actual
// click handler is wired in main.js instead of here, because toggling it
// needs to refresh the game carousel's lock states (games/engine.js), and
// engine.js already depends on this module — importing it back here would
// create a cycle (see docs/web-architecture.md's dependency rule).
export function renderUnlockAllToggle() {
  const btn = document.getElementById('unlockAllToggleBtn');
  btn.textContent = state.unlockAllGames ? 'Activé' : 'Désactivé';
}

function openSettings() {
  document.getElementById('settingsLevel').textContent = state.level;
  document.getElementById('settingsBalance').textContent = formatMoney(state.bank);
  renderSoundToggle();
  renderUnlockAllToggle();
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

export function initSettings() {
  document.getElementById('settingsBtnHome').addEventListener('click', openSettings);
  document.getElementById('settingsBtnApp').addEventListener('click', openSettings);
  document.getElementById('settingsCloseX').addEventListener('click', closeSettings);

  document.getElementById('soundToggleBtn').addEventListener('click', () => {
    state.muted = !state.muted;
    renderSoundToggle();
    saveState();
  });

  document.getElementById('resetProgressBtn').addEventListener('click', () => {
    const ok = confirm('Réinitialiser toute ta progression ? Cette action est irréversible.');
    if (!ok) return;
    resetState();
    location.reload();
  });
}

/* ---------------------- Daily challenge ---------------------- */

// `anyWin` reflects whether the triggering action was a win, for challenges
// like "win N bets" — games call this after they resolve a round.
export function updateChallengeProgress(anyWin) {
  const tpl = CHALLENGE_TEMPLATES.find(t => t.id === state.challenge.id);
  if (!tpl || state.challenge.done) return;

  if (tpl.id === 'spin10') {
    state.challenge.progress += 1;
  } else if (anyWin) {
    state.challenge.progress += 1;
  }

  if (state.challenge.progress >= tpl.target) {
    state.challenge.progress = tpl.target;
    state.challenge.done = true;
    state.bank += tpl.reward;
    showToast(`Défi accompli ! +${formatMoney(tpl.reward)}`, 3200);
  }
}

export function renderChallenge() {
  const tpl = CHALLENGE_TEMPLATES.find(t => t.id === state.challenge.id);
  const card = document.getElementById('challengeCard');
  if (!card) return;
  if (!tpl) { card.innerHTML = ''; return; }
  const pct = Math.min(100, (state.challenge.progress / tpl.target) * 100);
  card.innerHTML = `
    <div class="ctitle">${tpl.desc}</div>
    <div class="cdesc">${state.challenge.done ? 'Défi terminé — reviens demain pour un nouveau défi !' : 'Progression du jour'}</div>
    <div class="challenge-progress-track">
      <div class="challenge-progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="challenge-reward">${state.challenge.progress}/${tpl.target} — Récompense : ${formatMoney(tpl.reward)} ${state.challenge.done ? `<span class="icon-svg inline-icon">${buildIconSVG('check')}</span>` : ''}</div>
  `;
}

/* ---------------------- Click sounds (delegated) ---------------------- */

export function initClickSounds() {
  document.addEventListener('click', (e) => {
    const disabledBtn = e.target.closest('button:disabled');
    if (disabledBtn) return;
    const chipLike = e.target.closest('.chip-btn, .cell');
    if (chipLike) {
      playChip();
      return;
    }
    const clickable = e.target.closest('button, .game-card, .carousel-dot');
    if (clickable) playClick();
  });
}
