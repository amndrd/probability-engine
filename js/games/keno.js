/* ---------------------------------------------------------
   Keno — pick 10 numbers out of 40, then 10 are drawn. Payout
   scales steeply with matches, rewarding the rare high-match
   rounds. See docs/game-research.md §5: "la cohérence des
   sélections surpasse le changement aléatoire" — nothing stops a
   player from reusing the same 10 numbers every round here.
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';

const CHIP_VALUES = [10, 25, 100, 500];
const NUMBER_COUNT = 40;
const PICK_COUNT = 10;
const DRAW_COUNT = 10;
// Indexed by match count (0-10) — 5+ matches out of 10 picks is where it
// starts paying, climbing steeply toward the all-10 jackpot.
const PAYTABLE = [0, 0, 0, 0, 0, 1, 3, 10, 50, 200, 1000];

let betAmount = CHIP_VALUES[0];
let picked = new Set();
let drawing = false;

export function mount() {
  document.getElementById('kenoView').classList.remove('hidden');
  renderChipSelector();
  renderItemBar('kenoItemBar');
  renderGrid();
  renderActions();
}

export function unmount() {
  document.getElementById('kenoView').classList.add('hidden');
}

function renderChipSelector() {
  const wrap = document.getElementById('kenoChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.disabled = drawing;
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('kenoBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

function renderGrid() {
  const wrap = document.getElementById('kenoGrid');
  wrap.innerHTML = '';
  for (let n = 1; n <= NUMBER_COUNT; n++) {
    const btn = document.createElement('button');
    btn.className = 'keno-number' + (picked.has(n) ? ' selected' : '');
    btn.type = 'button';
    btn.textContent = n;
    btn.disabled = drawing || (!picked.has(n) && picked.size >= PICK_COUNT);
    btn.addEventListener('click', () => toggleNumber(n));
    wrap.appendChild(btn);
  }
}

function toggleNumber(n) {
  if (drawing) return;
  if (picked.has(n)) picked.delete(n);
  else if (picked.size < PICK_COUNT) picked.add(n);
  renderGrid();
  renderActions();
}

function renderActions() {
  const btn = document.getElementById('kenoDrawBtn');
  btn.disabled = drawing || picked.size !== PICK_COUNT;
  document.getElementById('kenoPickCount').textContent = `${picked.size} / ${PICK_COUNT}`;
}

document.getElementById('kenoDrawBtn').addEventListener('click', draw);

function draw() {
  if (drawing || picked.size !== PICK_COUNT) return;
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
  drawing = true;
  renderGrid();
  renderChipSelector();
  renderActions();
  document.getElementById('kenoResult').textContent = 'Tirage en cours...';

  const drawn = new Set();
  while (drawn.size < DRAW_COUNT) {
    drawn.add(1 + Math.floor(Math.random() * NUMBER_COUNT));
  }

  setTimeout(() => resolveDraw(drawn, bet), 900);
}

function resolveDraw(drawn, bet) {
  document.querySelectorAll('#kenoGrid .keno-number').forEach(btn => {
    const n = Number(btn.textContent);
    if (drawn.has(n)) {
      btn.classList.add(picked.has(n) ? 'keno-number--hit' : 'keno-number--drawn');
    }
  });

  const matches = [...picked].filter(n => drawn.has(n)).length;
  const mult = PAYTABLE[matches];
  const won = mult > 0;
  const winnings = won ? bet * (mult + 1) : 0;

  const effect = resolveArmedItemEffect({ won, betAmount: bet, winnings });
  const finalWinnings = effect.winnings;
  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  const gainSuffix = finalWinnings > 0 ? ` +${formatMoney(finalWinnings)}` : '';
  const message = `${matches} numéro(s) sur ${PICK_COUNT}`;
  document.getElementById('kenoResult').textContent = message + gainSuffix + extra;
  showToast(message + gainSuffix + extra);
  if (finalWinnings > bet) {
    playWin();
    if (effect.messages.length) playLevelUp();
  }

  drawing = false;
  setItemBarLocked(false);
  renderHeader();
  renderChipSelector();
  renderItemBar('kenoItemBar');
  setTimeout(() => {
    renderGrid();
    renderActions();
  }, 1800);
}
