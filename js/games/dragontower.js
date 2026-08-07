/* ---------------------------------------------------------
   Dragon Tower — climb a 6-row tower, picking one of 3 tiles per
   row. Each row hides one dragon eye (trap); hit it and the run
   ends. Cash out any time after the first safe row, or push for
   the top for the full multiplier. See docs/game-research.md §5:
   "viser 3x ou le jackpot pour compenser les pertes."
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { buildIconSVG } from '../icons.js';
import { playWin, playLevelUp } from '../audio.js';

const CHIP_VALUES = [10, 25, 100, 500];
const ROWS = 6;
const TILES_PER_ROW = 3;
const ROW_MULTIPLIER = 1.45; // slightly under the fair 3:2 odds per row — the house edge

let betAmount = CHIP_VALUES[0];
let currentBet = 0;
let phase = 'betting'; // 'betting' | 'climbing'
let trapIndexByRow = [];
let currentRow = 0; // row currently being played (0 = bottom)
let climbed = 0;

function multiplierFor(rowsClimbed) {
  return Math.round(Math.pow(ROW_MULTIPLIER, rowsClimbed) * 100) / 100;
}

export function mount() {
  document.getElementById('dragontowerView').classList.remove('hidden');
  renderChipSelector();
  renderItemBar('dragontowerItemBar');
  renderTower();
  renderActions();
}

export function unmount() {
  document.getElementById('dragontowerView').classList.add('hidden');
}

function renderChipSelector() {
  const wrap = document.getElementById('dragontowerChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.disabled = phase !== 'betting';
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('dragontowerBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

function renderTower() {
  const wrap = document.getElementById('dragontowerRows');
  wrap.innerHTML = '';
  // Render top-to-bottom in the DOM (row ROWS-1 first) so the tower reads
  // bottom-up visually with normal flex column flow.
  for (let row = ROWS - 1; row >= 0; row--) {
    const rowEl = document.createElement('div');
    rowEl.className = 'tower-row';
    if (row < currentRow) rowEl.classList.add('tower-row--cleared');
    if (row === currentRow && phase === 'climbing') rowEl.classList.add('tower-row--active');

    for (let t = 0; t < TILES_PER_ROW; t++) {
      const tile = document.createElement('button');
      tile.className = 'tower-tile';
      tile.type = 'button';
      tile.disabled = !(phase === 'climbing' && row === currentRow);
      if (row < currentRow) {
        tile.classList.add('tower-tile--safe');
        tile.innerHTML = buildIconSVG('gem');
      }
      tile.addEventListener('click', () => pickTile(row, t));
      rowEl.appendChild(tile);
    }

    const label = document.createElement('div');
    label.className = 'tower-row-label';
    label.textContent = '×' + multiplierFor(row + 1).toFixed(2);
    rowEl.appendChild(label);

    wrap.appendChild(rowEl);
  }
}

function renderActions() {
  document.getElementById('dragontowerStartBtn').classList.toggle('hidden', phase !== 'betting');
  const cashOutBtn = document.getElementById('dragontowerCashOutBtn');
  cashOutBtn.classList.toggle('hidden', phase !== 'climbing');
  cashOutBtn.disabled = climbed === 0;
  cashOutBtn.textContent = climbed > 0 ? `Encaisser (×${multiplierFor(climbed).toFixed(2)})` : 'Encaisser';
}

document.getElementById('dragontowerStartBtn').addEventListener('click', start);
document.getElementById('dragontowerCashOutBtn').addEventListener('click', cashOut);

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

  trapIndexByRow = Array.from({ length: ROWS }, () => Math.floor(Math.random() * TILES_PER_ROW));
  currentRow = 0;
  climbed = 0;
  phase = 'climbing';
  document.getElementById('dragontowerResult').textContent = 'Choisis une tuile pour grimper.';
  renderTower();
  renderActions();
  renderChipSelector();
}

function pickTile(row, tileIndex) {
  if (phase !== 'climbing' || row !== currentRow) return;
  if (tileIndex === trapIndexByRow[row]) {
    resolveRun(false);
    return;
  }
  climbed += 1;
  currentRow += 1;
  if (currentRow >= ROWS) {
    resolveRun(true);
    return;
  }
  renderTower();
  renderActions();
  document.getElementById('dragontowerResult').textContent = `Étage ${climbed} franchi — continue ou encaisse.`;
}

function cashOut() {
  if (phase !== 'climbing' || climbed === 0) return;
  resolveRun(true);
}

function resolveRun(won) {
  const winnings = won ? Math.round(currentBet * multiplierFor(climbed)) : 0;
  const effect = resolveArmedItemEffect({ won, betAmount: currentBet, winnings });
  const finalWinnings = effect.winnings;
  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  const gainSuffix = finalWinnings > 0 ? ` +${formatMoney(finalWinnings)}` : '';
  const message = won
    ? (climbed >= ROWS ? 'Sommet atteint !' : `Encaissé à ×${multiplierFor(climbed).toFixed(2)}`)
    : `Œil du dragon — la mise est perdue.`;
  document.getElementById('dragontowerResult').textContent = message + gainSuffix + extra;
  showToast(message + gainSuffix + extra);
  if (finalWinnings > currentBet) {
    playWin();
    if (effect.messages.length) playLevelUp();
  }

  // Reveal the whole tower briefly (traps included) before resetting.
  if (!won) {
    document.querySelectorAll('#dragontowerRows .tower-row').forEach((rowEl, domIndex) => {
      const row = ROWS - 1 - domIndex;
      if (row === currentRow) {
        [...rowEl.querySelectorAll('.tower-tile')].forEach((tile, t) => {
          if (t === trapIndexByRow[row]) {
            tile.classList.add('tower-tile--trap');
            tile.innerHTML = buildIconSVG('dragonEye');
          }
        });
      }
    });
  }

  phase = 'betting';
  currentBet = 0;
  setItemBarLocked(false);
  renderHeader();
  renderActions();
  renderChipSelector();
  renderItemBar('dragontowerItemBar');
  setTimeout(() => {
    currentRow = 0;
    climbed = 0;
    renderTower();
  }, 1600);
}
