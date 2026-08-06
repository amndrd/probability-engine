/* ---------------------------------------------------------
   Crash — a multiplier climbs in real time from 1.00x; cash out
   before it crashes to win bet × the multiplier at that moment,
   or lose the bet if it crashes first. See docs/game-research.md
   §5: "Cash out frequently ... rather than holding for a massive
   multiplier" — the crash point distribution below is deliberately
   weighted toward small multipliers with a rare big one, same
   shape as real crash games.
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';

const CHIP_VALUES = [10, 25, 100, 500];
const TICK_MS = 60;
const GROWTH = 1.01;
const MAX_CRASH = 20;

let betAmount = CHIP_VALUES[0];
let currentBet = 0;
let running = false;
let multiplier = 1;
let crashPoint = 1;
let tickHandle = null;

export function mount() {
  document.getElementById('crashView').classList.remove('hidden');
  renderChipSelector();
  renderItemBar('crashItemBar');
  renderDisplay();
  renderActions();
}

export function unmount() {
  document.getElementById('crashView').classList.add('hidden');
}

function renderChipSelector() {
  const wrap = document.getElementById('crashChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.disabled = running;
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('crashBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

function renderDisplay() {
  const el = document.getElementById('crashMultiplier');
  el.textContent = multiplier.toFixed(2) + 'x';
  el.classList.toggle('crash-display--live', running);
}

function renderActions() {
  document.getElementById('crashLaunchBtn').classList.toggle('hidden', running);
  document.getElementById('crashCashOutBtn').classList.toggle('hidden', !running);
}

document.getElementById('crashLaunchBtn').addEventListener('click', launch);
document.getElementById('crashCashOutBtn').addEventListener('click', cashOut);

// Same shape as real crash games: P(crash ≤ x) = 1 - 0.99/x, capped so a
// round never runs unreasonably long.
function rollCrashPoint() {
  const r = Math.random();
  const raw = 0.99 / (1 - r);
  return Math.min(MAX_CRASH, Math.max(1, Math.floor(raw * 100) / 100));
}

function launch() {
  if (running) return;
  if (!state.run.active) {
    showToast("Commence la journée dans l'onglet Banque avant de miser.");
    switchTab('bank');
    return;
  }
  if (state.bank < betAmount) {
    showToast('Solde insuffisant pour cette mise.');
    return;
  }

  snapshotBeforeBet();
  currentBet = betAmount;
  state.bank -= currentBet;
  renderHeader();
  saveState();
  setItemBarLocked(true);

  running = true;
  multiplier = 1;
  crashPoint = rollCrashPoint();
  document.getElementById('crashResult').textContent = 'La fusée décolle...';
  renderChipSelector();
  renderActions();
  renderDisplay();

  tickHandle = setInterval(() => {
    multiplier = Math.round(multiplier * GROWTH * 100) / 100;
    if (multiplier >= crashPoint) {
      multiplier = crashPoint;
      renderDisplay();
      resolveCrash();
    } else {
      renderDisplay();
    }
  }, TICK_MS);
}

function cashOut() {
  if (!running) return;
  clearInterval(tickHandle);
  running = false;

  const winnings = Math.round(currentBet * multiplier);
  const won = multiplier > 1; // matches the "won = strictly profitable" convention used across every game
  const effect = resolveArmedItemEffect({ won, betAmount: currentBet, winnings });
  const finalWinnings = effect.winnings;
  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  const message = `Encaissé à ${multiplier.toFixed(2)}x — +${formatMoney(finalWinnings)} !`;
  document.getElementById('crashResult').textContent = message + extra;
  document.getElementById('crashMultiplier').classList.remove('crash-display--live');
  showToast(message + extra);
  playWin();
  if (effect.messages.length) playLevelUp();

  endRound();
}

function resolveCrash() {
  clearInterval(tickHandle);
  running = false;

  const effect = resolveArmedItemEffect({ won: false, betAmount: currentBet, winnings: 0 });
  const finalWinnings = effect.winnings;
  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  const gainSuffix = finalWinnings > 0 ? ` +${formatMoney(finalWinnings)}` : '';
  const message = `Crash à ${crashPoint.toFixed(2)}x — perdu.`;
  document.getElementById('crashResult').textContent = message + gainSuffix + extra;
  document.getElementById('crashMultiplier').classList.add('crash-display--crashed');
  showToast(message + gainSuffix + extra);

  endRound();
}

function endRound() {
  currentBet = 0;
  setItemBarLocked(false);
  renderHeader();
  renderActions();
  renderChipSelector();
  renderItemBar('crashItemBar');
  setTimeout(() => {
    multiplier = 1;
    document.getElementById('crashMultiplier').classList.remove('crash-display--crashed');
    renderDisplay();
  }, 1800);
}
