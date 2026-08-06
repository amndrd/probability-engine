/* ---------------------------------------------------------
   1P Poker — 5-card draw, Jacks-or-Better. Deal 5 cards, click
   any to hold them, draw replaces the rest once, then the final
   hand is scored against the paytable in cards.js. See
   docs/game-research.md §5 for the reference description.
   --------------------------------------------------------- */

import { state, saveState, formatMoney } from '../state.js';
import { showToast, renderHeader, switchTab } from '../ui.js';
import { renderItemBar, setItemBarLocked, getMaxBet, snapshotBeforeBet, resolveArmedItemEffect } from '../items.js';
import { playWin, playLevelUp } from '../audio.js';
import { drawCard, buildCardEl, evaluatePokerHand } from './cards.js';

const CHIP_VALUES = [10, 25, 100, 500];

let betAmount = CHIP_VALUES[0];
let currentBet = 0;
let hand = []; // [{ card, held }]
let phase = 'betting'; // 'betting' | 'held' | 'resolved'

export function mount() {
  document.getElementById('pokerView').classList.remove('hidden');
  renderChipSelector();
  renderItemBar('pokerItemBar');
  renderHand();
  renderActions();
}

export function unmount() {
  document.getElementById('pokerView').classList.add('hidden');
}

function renderChipSelector() {
  const wrap = document.getElementById('pokerChipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === betAmount ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.disabled = phase !== 'betting';
    btn.addEventListener('click', () => {
      betAmount = Math.min(v, getMaxBet());
      renderChipSelector();
      document.getElementById('pokerBetValue').textContent = betAmount;
    });
    wrap.appendChild(btn);
  });
}

function renderHand() {
  const wrap = document.getElementById('pokerHand');
  wrap.innerHTML = '';
  hand.forEach(entry => {
    const el = buildCardEl(entry.card, false);
    el.classList.add('holdable');
    if (entry.held) el.classList.add('held');
    if (phase === 'held') {
      el.addEventListener('click', () => {
        entry.held = !entry.held;
        renderHand();
      });
    }
    if (entry.held) {
      const badge = document.createElement('div');
      badge.className = 'hold-badge';
      badge.textContent = 'GARDÉE';
      el.appendChild(badge);
    }
    wrap.appendChild(el);
  });
}

function renderActions() {
  document.getElementById('pokerDealBtn').classList.toggle('hidden', phase !== 'betting');
  document.getElementById('pokerDrawBtn').classList.toggle('hidden', phase !== 'held');
}

document.getElementById('pokerDealBtn').addEventListener('click', deal);
document.getElementById('pokerDrawBtn').addEventListener('click', draw);

function deal() {
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

  hand = Array.from({ length: 5 }, () => ({ card: drawCard(), held: false }));
  phase = 'held';
  document.getElementById('pokerResult').textContent = 'Choisis les cartes à garder, puis tire.';
  renderHand();
  renderActions();
  renderChipSelector();
}

function draw() {
  if (phase !== 'held') return;
  hand.forEach(entry => {
    if (!entry.held) entry.card = drawCard();
  });
  phase = 'resolved';
  renderHand();
  resolveHand();
}

function resolveHand() {
  const result = evaluatePokerHand(hand.map(e => e.card));
  const won = result.mult > 0;
  const winnings = won ? currentBet * (result.mult + 1) : 0;

  const effect = resolveArmedItemEffect({ won, betAmount: currentBet, winnings });
  const finalWinnings = effect.winnings;
  state.bank += finalWinnings;
  saveState();

  const extra = effect.messages.length ? ' ' + effect.messages.join(' ') : '';
  const resultText = won ? `${result.label} — ${result.mult}:1 !` : `${result.label} — perdu.`;
  const gainSuffix = finalWinnings > 0 ? ` +${formatMoney(finalWinnings)}` : '';
  document.getElementById('pokerResult').textContent = resultText + gainSuffix + extra;
  showToast(resultText + gainSuffix + extra);
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
  renderItemBar('pokerItemBar');
}
