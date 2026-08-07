/* ---------------------------------------------------------
   Craps (Street Craps) — pass-line bet. Come-out roll: 7 or 11
   wins outright, 2/3/12 loses outright, anything else sets "the
   point" — keep rolling until the point comes back (win) or a 7
   shows up first ("seven out", lose). See docs/game-research.md
   §5: "Premiers jets décident; sinon, relancer sur points."
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';

const CHIP_VALUES = [10, 25, 100, 500];

// 3x3 pip grid, numbered like a phone keypad (1 = top-left, 9 = bottom-right).
const PIP_LAYOUT = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

let betAmount = CHIP_VALUES[0];
let currentBet = 0;
let point = null; // null = come-out phase, otherwise the point to chase
let rolling = false;

export function mount() {
  document.getElementById('crapsView').classList.remove('hidden');
  renderChipSelector();
  renderItemBar('crapsItemBar');
  renderPointLabel();
  renderActions();
}

export function unmount() {
  document.getElementById('crapsView').classList.add('hidden');
}

function buildDieEl(value) {
  const die = document.createElement('div');
  die.className = 'die';
  for (let i = 1; i <= 9; i++) {
    const pip = document.createElement('div');
    if (PIP_LAYOUT[value].includes(i)) pip.className = 'pip';
    die.appendChild(pip);
  }
  return die;
}

function renderDice(a, b) {
  const wrap = document.getElementById('crapsDice');
  wrap.innerHTML = '';
  wrap.appendChild(buildDieEl(a));
  wrap.appendChild(buildDieEl(b));
}

function renderPointLabel() {
  document.getElementById('crapsPointLabel').textContent = point ? `Point à faire : ${point}` : '';
}

function renderChipSelector() {
  const wrap = document.getElementById('crapsChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.disabled = point !== null;
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('crapsBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

function renderActions() {
  const btn = document.getElementById('crapsRollBtn');
  btn.textContent = point ? 'Relancer' : 'Lancer les dés';
  btn.disabled = rolling;
}

document.getElementById('crapsRollBtn').addEventListener('click', roll);

function roll() {
  if (rolling) return;

  if (point === null) {
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
    renderChipSelector();
  }

  rolling = true;
  renderActions();
  document.getElementById('crapsResult').textContent = 'Les dés roulent...';

  const a = 1 + Math.floor(Math.random() * 6);
  const b = 1 + Math.floor(Math.random() * 6);
  const sum = a + b;

  setTimeout(() => {
    renderDice(a, b);
    rolling = false;

    if (point === null) {
      // Come-out roll.
      if (sum === 7 || sum === 11) {
        resolveRound(true, `Naturel (${sum}) — tu gagnes !`);
      } else if (sum === 2 || sum === 3 || sum === 12) {
        resolveRound(false, `Craps (${sum}) — perdu.`);
      } else {
        point = sum;
        renderPointLabel();
        renderActions();
        document.getElementById('crapsResult').textContent = `Le point est ${sum}. Relance pour le refaire avant un 7.`;
      }
    } else {
      // Point phase.
      if (sum === point) {
        resolveRound(true, `Le point (${sum}) revient — tu gagnes !`);
      } else if (sum === 7) {
        resolveRound(false, `Seven out (${sum}) — perdu.`);
      } else {
        renderActions();
        document.getElementById('crapsResult').textContent = `${sum} — pas le point, relance encore.`;
      }
    }
  }, 700);
}

function resolveRound(won, message) {
  const winnings = won ? currentBet * 2 : 0;
  const effect = resolveArmedItemEffect({ won, betAmount: currentBet, winnings });
  const finalWinnings = effect.winnings;
  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  const gainSuffix = finalWinnings > 0 ? ` +${formatMoney(finalWinnings)}` : '';
  document.getElementById('crapsResult').textContent = message + gainSuffix + extra;
  showToast(message + gainSuffix + extra);
  if (finalWinnings > currentBet) {
    playWin();
    if (effect.messages.length) playLevelUp();
  }

  point = null;
  currentBet = 0;
  setItemBarLocked(false);
  renderHeader();
  renderPointLabel();
  renderActions();
  renderChipSelector();
  renderItemBar('crapsItemBar');
}
