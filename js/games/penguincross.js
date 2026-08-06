/* ---------------------------------------------------------
   Penguin Cross — advance a penguin across cracking ice, one
   step at a time. Each step has a fixed chance of holding; the
   multiplier climbs with every step survived. Cash out any time,
   or push for the far bank. Simpler than Dragon Tower — a single
   "Avancer" action instead of a spatial tile choice — see
   docs/game-research.md §5: "les petits paris en début de partie
   offrent de meilleures chances de réussite progressive."
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';

const CHIP_VALUES = [10, 25, 100, 500];
const STEP_COUNT = 8;
const SURVIVE_PROB = 0.8;
const STEP_MULTIPLIER = Math.round((1 / SURVIVE_PROB) * 0.95 * 100) / 100; // ≈1.19x per step, house-adjusted

let betAmount = CHIP_VALUES[0];
let currentBet = 0;
let phase = 'betting'; // 'betting' | 'crossing'
let step = 0;
let advancing = false;

function multiplierFor(steps) {
  return Math.round(Math.pow(STEP_MULTIPLIER, steps) * 100) / 100;
}

export function mount() {
  document.getElementById('penguincrossView').classList.remove('hidden');
  renderChipSelector();
  renderItemBar('penguincrossItemBar');
  renderPath();
  renderActions();
}

export function unmount() {
  document.getElementById('penguincrossView').classList.add('hidden');
}

function renderChipSelector() {
  const wrap = document.getElementById('penguincrossChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.disabled = phase !== 'betting';
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('penguincrossBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

function renderPath() {
  const wrap = document.getElementById('penguincrossPath');
  wrap.innerHTML = '';
  for (let i = 0; i < STEP_COUNT; i++) {
    const tile = document.createElement('div');
    tile.className = 'ice-tile';
    if (i < step) tile.classList.add('ice-tile--crossed');
    if (i === step && phase === 'crossing') tile.classList.add('ice-tile--current');
    tile.textContent = '×' + multiplierFor(i + 1).toFixed(2);
    wrap.appendChild(tile);
  }
}

function renderActions() {
  document.getElementById('penguincrossStartBtn').classList.toggle('hidden', phase !== 'betting');
  const advanceBtn = document.getElementById('penguincrossAdvanceBtn');
  const cashOutBtn = document.getElementById('penguincrossCashOutBtn');
  advanceBtn.classList.toggle('hidden', phase !== 'crossing');
  cashOutBtn.classList.toggle('hidden', phase !== 'crossing');
  advanceBtn.disabled = advancing;
  cashOutBtn.disabled = advancing || step === 0;
  cashOutBtn.textContent = step > 0 ? `Encaisser (×${multiplierFor(step).toFixed(2)})` : 'Encaisser';
}

document.getElementById('penguincrossStartBtn').addEventListener('click', start);
document.getElementById('penguincrossAdvanceBtn').addEventListener('click', advance);
document.getElementById('penguincrossCashOutBtn').addEventListener('click', cashOut);

function start() {
  if (phase !== 'betting') return;
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

  step = 0;
  phase = 'crossing';
  document.getElementById('penguincrossResult').textContent = "Avance sur la glace, prudemment.";
  renderPath();
  renderActions();
  renderChipSelector();
}

function advance() {
  if (phase !== 'crossing' || advancing) return;
  advancing = true;
  renderActions();
  document.getElementById('penguincrossResult').textContent = 'Craquement...';

  setTimeout(() => {
    advancing = false;
    if (Math.random() >= SURVIVE_PROB) {
      resolveRun(false);
      return;
    }
    step += 1;
    if (step >= STEP_COUNT) {
      resolveRun(true);
      return;
    }
    renderPath();
    renderActions();
    document.getElementById('penguincrossResult').textContent = `Pas ${step} franchi — continue ou encaisse.`;
  }, 500);
}

function cashOut() {
  if (phase !== 'crossing' || step === 0) return;
  resolveRun(true);
}

function resolveRun(won) {
  const winnings = won ? Math.round(currentBet * multiplierFor(step)) : 0;
  const effect = resolveArmedItemEffect({ won, betAmount: currentBet, winnings });
  const finalWinnings = effect.winnings;
  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  const gainSuffix = finalWinnings > 0 ? ` +${formatMoney(finalWinnings)}` : '';
  const message = won
    ? (step >= STEP_COUNT ? 'Traversée réussie !' : `Encaissé à ×${multiplierFor(step).toFixed(2)}`)
    : 'La glace cède — mise perdue.';
  document.getElementById('penguincrossResult').textContent = message + gainSuffix + extra;
  showToast(message + gainSuffix + extra);
  if (finalWinnings > currentBet) {
    playWin();
    if (effect.messages.length) playLevelUp();
  }

  phase = 'betting';
  currentBet = 0;
  setItemBarLocked(false);
  renderHeader();
  renderActions();
  renderChipSelector();
  renderItemBar('penguincrossItemBar');
  setTimeout(() => {
    step = 0;
    renderPath();
  }, 1400);
}
