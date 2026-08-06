/* ---------------------------------------------------------
   HiLo — a value from 1-13 is shown; guess whether the next draw
   will be higher or lower. The payout multiplier is computed from
   the true odds for that specific guess (a guess near the edges,
   e.g. current = 2, pays much less on "higher" than a guess from
   the middle) — matching real HiLo, and docs/game-research.md §5's
   note that this is one of the more unpredictable games.

   Note: unlike every other game here, `mult` in this file is a
   *total-return* multiplier (winnings = bet × mult), not a profit
   multiplier — the odds swing too widely round to round for the
   usual "amount × (multiplier + 1)" convention to read cleanly.
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';

const CHIP_VALUES = [10, 25, 100, 500];
const HOUSE_EDGE = 0.95;

let betAmount = CHIP_VALUES[0];
let currentValue = 7;
let resolving = false;

function higherCount(v) { return 13 - v; }
function lowerCount(v) { return v - 1; }

function multiplierFor(direction, v) {
  const count = direction === 'higher' ? higherCount(v) : lowerCount(v);
  if (count <= 0) return 0;
  return Math.round((HOUSE_EDGE * 13) / count * 100) / 100;
}

export function mount() {
  document.getElementById('hiloView').classList.remove('hidden');
  renderChipSelector();
  renderItemBar('hiloItemBar');
  renderCard();
}

export function unmount() {
  document.getElementById('hiloView').classList.add('hidden');
}

function renderChipSelector() {
  const wrap = document.getElementById('hiloChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.disabled = resolving;
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('hiloBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

function renderCard() {
  document.getElementById('hiloValue').textContent = currentValue;
  const higherBtn = document.getElementById('hiloHigherBtn');
  const lowerBtn = document.getElementById('hiloLowerBtn');
  const higherMult = multiplierFor('higher', currentValue);
  const lowerMult = multiplierFor('lower', currentValue);
  higherBtn.textContent = higherMult > 0 ? `Plus Haut (×${higherMult.toFixed(2)})` : 'Plus Haut (impossible)';
  lowerBtn.textContent = lowerMult > 0 ? `Plus Bas (×${lowerMult.toFixed(2)})` : 'Plus Bas (impossible)';
  higherBtn.disabled = resolving || higherMult === 0;
  lowerBtn.disabled = resolving || lowerMult === 0;
}

document.getElementById('hiloHigherBtn').addEventListener('click', () => guess('higher'));
document.getElementById('hiloLowerBtn').addEventListener('click', () => guess('lower'));

function guess(direction) {
  if (resolving) return;
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
  const bet = betAmount;
  state.bank -= bet;
  renderHeader();
  saveState();
  setItemBarLocked(true);
  resolving = true;
  renderChipSelector();
  renderCard();
  document.getElementById('hiloResult').textContent = 'La carte se retourne...';

  const mult = multiplierFor(direction, currentValue);
  const next = 1 + Math.floor(Math.random() * 13);

  setTimeout(() => {
    const won = direction === 'higher' ? next > currentValue : next < currentValue;
    const winnings = won ? Math.round(bet * mult) : 0;

    const effect = resolveArmedItemEffect({ won, betAmount: bet, winnings });
    const finalWinnings = effect.winnings;
    state.bank += finalWinnings;
    saveState();

    const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
    const gainSuffix = finalWinnings > 0 ? ` +${formatMoney(finalWinnings)}` : '';
    const message = `${next} — ${won ? `gagné (×${mult.toFixed(2)})` : 'perdu'}`;
    document.getElementById('hiloResult').textContent = message + gainSuffix + extra;
    showToast(message + gainSuffix + extra);
    if (finalWinnings > bet) {
      playWin();
      if (effect.messages.length) playLevelUp();
    }

    currentValue = next;
    resolving = false;
    setItemBarLocked(false);
    renderHeader();
    renderChipSelector();
    renderItemBar('hiloItemBar');
    renderCard();
  }, 700);
}
