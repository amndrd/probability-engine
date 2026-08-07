/* ---------------------------------------------------------
   Mine Sweeper — pick how many mines hide in a 5x5 grid (more
   mines = higher multiplier per safe tile), then reveal tiles
   one at a time. Cash out any time, or keep pushing your luck.
   Multiplier uses the exact hypergeometric fair odds for "k safe
   reveals out of N tiles with m mines", times a house-edge factor
   — see docs/game-research.md §5.
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { buildIconSVG } from '../icons.js';
import { playWin, playLevelUp } from '../audio.js';

const CHIP_VALUES = [10, 25, 100, 500];
const GRID_SIZE = 25;
const MINE_OPTIONS = [3, 5, 8, 12];
const HOUSE_EDGE = 0.97;

let betAmount = CHIP_VALUES[0];
let currentBet = 0;
let mineCount = MINE_OPTIONS[0];
let phase = 'betting'; // 'betting' | 'playing'
let mineIndexes = new Set();
let revealed = new Set();

function multiplierFor(k, mines) {
  let mult = 1;
  for (let i = 0; i < k; i++) {
    mult *= (GRID_SIZE - i) / (GRID_SIZE - mines - i);
  }
  return Math.round(mult * HOUSE_EDGE * 100) / 100;
}

export function mount() {
  document.getElementById('minesweeperView').classList.remove('hidden');
  renderMinePicker();
  renderChipSelector();
  renderItemBar('minesweeperItemBar');
  renderGrid();
  renderActions();
}

export function unmount() {
  document.getElementById('minesweeperView').classList.add('hidden');
}

function renderMinePicker() {
  const wrap = document.getElementById('minesweeperMinePicker');
  wrap.innerHTML = MINE_OPTIONS.map(m =>
    `<button class="segment-btn${m === mineCount ? ' selected' : ''}" data-mines="${m}" type="button" ${phase !== 'betting' ? 'disabled' : ''}>${m} mines</button>`
  ).join('');
  wrap.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      mineCount = Number(btn.dataset.mines);
      renderMinePicker();
    });
  });
}

function renderChipSelector() {
  const wrap = document.getElementById('minesweeperChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.disabled = phase !== 'betting';
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('minesweeperBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

function renderGrid() {
  const wrap = document.getElementById('minesweeperGrid');
  wrap.innerHTML = '';
  for (let i = 0; i < GRID_SIZE; i++) {
    const tile = document.createElement('button');
    tile.className = 'mine-tile';
    tile.type = 'button';
    tile.disabled = phase !== 'playing' || revealed.has(i);
    if (revealed.has(i)) {
      tile.classList.add('mine-tile--safe');
      tile.innerHTML = buildIconSVG('gem');
    }
    tile.addEventListener('click', () => reveal(i));
    wrap.appendChild(tile);
  }
}

function renderActions() {
  document.getElementById('minesweeperStartBtn').classList.toggle('hidden', phase !== 'betting');
  const cashOutBtn = document.getElementById('minesweeperCashOutBtn');
  cashOutBtn.classList.toggle('hidden', phase !== 'playing');
  cashOutBtn.disabled = revealed.size === 0;
  cashOutBtn.textContent = revealed.size > 0 ? `Encaisser (×${multiplierFor(revealed.size, mineCount).toFixed(2)})` : 'Encaisser';
}

document.getElementById('minesweeperStartBtn').addEventListener('click', start);
document.getElementById('minesweeperCashOutBtn').addEventListener('click', cashOut);

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

  mineIndexes = new Set();
  while (mineIndexes.size < mineCount) {
    mineIndexes.add(Math.floor(Math.random() * GRID_SIZE));
  }
  revealed = new Set();
  phase = 'playing';
  document.getElementById('minesweeperResult').textContent = 'Révèle une case sûre.';
  renderMinePicker();
  renderGrid();
  renderActions();
  renderChipSelector();
}

function reveal(i) {
  if (phase !== 'playing' || revealed.has(i)) return;
  if (mineIndexes.has(i)) {
    resolveRound(false);
    return;
  }
  revealed.add(i);
  renderGrid();
  renderActions();
  document.getElementById('minesweeperResult').textContent = `${revealed.size} case(s) sûre(s) — continue ou encaisse.`;
}

function cashOut() {
  if (phase !== 'playing' || revealed.size === 0) return;
  resolveRound(true);
}

function resolveRound(won) {
  const winnings = won ? Math.round(currentBet * multiplierFor(revealed.size, mineCount)) : 0;
  const effect = resolveArmedItemEffect({ won, betAmount: currentBet, winnings });
  const finalWinnings = effect.winnings;
  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  const gainSuffix = finalWinnings > 0 ? ` +${formatMoney(finalWinnings)}` : '';
  const message = won ? `Encaissé à ×${multiplierFor(revealed.size, mineCount).toFixed(2)}` : 'Boum — une mine !';
  document.getElementById('minesweeperResult').textContent = message + gainSuffix + extra;
  showToast(message + gainSuffix + extra);
  if (finalWinnings > currentBet) {
    playWin();
    if (effect.messages.length) playLevelUp();
  }

  if (!won) {
    // Reveal every mine before resetting.
    document.querySelectorAll('#minesweeperGrid .mine-tile').forEach((tile, i) => {
      if (mineIndexes.has(i)) {
        tile.classList.add('mine-tile--mine');
        tile.innerHTML = buildIconSVG('mine');
      }
    });
  }

  phase = 'betting';
  currentBet = 0;
  setItemBarLocked(false);
  renderHeader();
  renderActions();
  renderChipSelector();
  renderMinePicker();
  renderItemBar('minesweeperItemBar');
  setTimeout(() => {
    revealed = new Set();
    renderGrid();
  }, 1600);
}
