/* ---------------------------------------------------------
   The "Casino Day" loop — the web adaptation of Gamble With Your
   Friends' quota-based core loop (see docs/web-architecture.md §4),
   deliberately without the original's 5-minute timer: the player
   takes as long as they want, and a day only ends when they choose
   to cash out at or above the quota.

   Floors are a purely visual grouping derived from the level, not a
   gate (see docs/web-architecture.md §5).
   --------------------------------------------------------- */

import {
  state, saveState, formatMoney, isQuotaMet,
  MILLIONAIRE_TARGET,
  nextLevelTarget, bonusForLevelUp,
} from './state.js';
import { renderHeader, showToast } from './ui.js';
import { playLevelUp } from './audio.js';
import { GAMES } from './games/list.js';
import { buildIconSVG } from './icons.js';
import { ticketsForDayClear } from './tickets.js';
import { renderGameList } from './games/engine.js';

const FLOORS = [
  { minLevel: 1, name: 'Néon Vegas' },
  { minLevel: 6, name: 'Speakeasy clandestin' },
  { minLevel: 11, name: 'Salle VIP' },
  { minLevel: 16, name: 'Penthouse du boss' },
];

// One successful day after every Phase 5 game has unlocked (HiLo, level 21)
// — the debt is considered paid off and the final choice triggers. See
// docs/game-research.md §11 / docs/web-architecture.md §10.
const FINAL_LEVEL = 22;
let pendingFinalChoice = false;

export function floorForLevel(level) {
  let current = FLOORS[0];
  for (const f of FLOORS) {
    if (level >= f.minLevel) current = f;
  }
  return { num: FLOORS.indexOf(current) + 1, total: FLOORS.length, name: current.name };
}

/* ---------------------- Starting / cashing out a day ---------------------- */

export function startDay() {
  if (state.run.active) return;
  state.run = {
    active: true,
    quota: state.levelTarget,
    dayStartBank: state.bank,
    lastBetSnapshot: null,
    buffs: { confidence: false, bonusDraw: false },
  };
  saveState();
  renderHeader();
  renderBank();
  showToast(`Journée commencée — atteins ${formatMoney(state.run.quota)}, encaisse quand tu veux.`);
}

// A day can only be cashed out once the quota is met (guarded in the UI too,
// see renderBank()) — there's no time limit and so no way to fail a day
// anymore; cashing out is always a success.
export function cashOutDay() {
  if (!isQuotaMet()) return;

  const quota = state.run.quota;
  const finalBank = state.bank;

  const reward = ticketsForDayClear(finalBank, quota);
  state.tickets += reward.total;
  const bonus = bonusForLevelUp(state.levelTarget);
  state.bank += bonus;
  state.level += 1;
  const unlockedGame = GAMES.find(g => g.unlockLevel === state.level);
  state.levelTarget = nextLevelTarget(state.levelTarget);
  state.run.active = false;
  pendingFinalChoice = state.level === FINAL_LEVEL;
  saveState();

  playLevelUp();
  showDayEndModal({ reward, bonus, unlockedGame, newLevel: state.level });
  checkMillionaire();
  renderGameList(); // a new game may have just unlocked — refresh the carousel's lock states
  renderHeader();
  renderBank();
}

function showDayEndModal({ reward, bonus, unlockedGame, newLevel }) {
  const modal = document.getElementById('dayEndModal');
  const text = document.getElementById('dayEndText');
  modal.classList.remove('hidden');

  let msg = `Quota atteint. +${reward.total} tickets`;
  if (reward.bonus > 0) msg += ` (dont ${reward.bonus} de bonus pour l'avoir dépassé)`;
  msg += `, +${formatMoney(bonus)} de prime. Niveau ${newLevel} !`;
  if (unlockedGame) msg += ` Nouveau jeu débloqué : ${unlockedGame.name} !`;
  text.textContent = msg;
}

function initDayEndModal() {
  document.getElementById('dayEndCloseBtn').addEventListener('click', () => {
    document.getElementById('dayEndModal').classList.add('hidden');
    if (pendingFinalChoice) {
      pendingFinalChoice = false;
      document.getElementById('finalChoiceModal').classList.remove('hidden');
    }
  });
}

/* ---------------------- Final choice & endings ---------------------- */

const ENDINGS = {
  happy: {
    title: '« …Et ils vécurent heureux »',
    text: "Tu as payé ta dette et refermé la porte du casino derrière toi. Une nouvelle vie commence, loin des tables et du stress du jeu.",
    variant: 'gold',
  },
  letItRide: {
    title: '« Let It Ride! »',
    text: "La pièce retombe de ton côté. Ta mise est doublée, et la légende de cette soirée ne fait que commencer.",
    variant: 'gold',
  },
  endOfTheLine: {
    title: '« End of the Line »',
    text: "La pièce retombe du mauvais côté. Le prêteur reprend tout, jusqu'au dernier centime.",
    variant: 'ruby',
  },
};

function showEnding(id) {
  const ending = ENDINGS[id];
  const modal = document.getElementById('endingModal');
  const card = modal.querySelector('.modal-card');
  card.classList.remove('modal-card--gold', 'modal-card--ruby');
  card.classList.add(ending.variant === 'gold' ? 'modal-card--gold' : 'modal-card--ruby');
  document.getElementById('endingTitle').textContent = ending.title;
  document.getElementById('endingText').textContent = ending.text;
  modal.classList.remove('hidden');
}

function playCoinFlip() {
  document.getElementById('coinFlipModal').classList.remove('hidden');
  // The outcome is decided the instant the flip starts, not when the coin
  // visually lands — a small nod to the original game's own framing of it
  // (see docs/game-research.md §11).
  const won = Math.random() < 0.5;
  setTimeout(() => {
    document.getElementById('coinFlipModal').classList.add('hidden');
    if (won) {
      state.bank *= 2;
    } else {
      state.bank = 0;
    }
    saveState();
    renderHeader();
    renderBank();
    showEnding(won ? 'letItRide' : 'endOfTheLine');
  }, 1800);
}

function initFinalChoiceModal() {
  document.getElementById('payDebtBtn').addEventListener('click', () => {
    document.getElementById('finalChoiceModal').classList.add('hidden');
    showEnding('happy');
  });
  document.getElementById('doubleOrNothingBtn').addEventListener('click', () => {
    document.getElementById('finalChoiceModal').classList.add('hidden');
    playCoinFlip();
  });
  document.getElementById('endingCloseBtn').addEventListener('click', () => {
    document.getElementById('endingModal').classList.add('hidden');
  });
}

/* ---------------------- Millionaire modal (progression milestone) ---------------------- */

export function checkMillionaire() {
  if (state.millionaireShown) return false;
  if (state.bank < MILLIONAIRE_TARGET) return false;
  state.millionaireShown = true;
  document.getElementById('millionaireText').textContent =
    `Parti·e de $500, tu es maintenant à ${formatMoney(state.bank)}. Tu es officiellement millionnaire ! Continue à jouer pour voir jusqu'où tu peux aller.`;
  document.getElementById('millionaireModal').classList.remove('hidden');
  playLevelUp();
  saveState();
  return true;
}

function initMillionaireModal() {
  document.getElementById('millionaireCloseBtn').addEventListener('click', () => {
    document.getElementById('millionaireModal').classList.add('hidden');
    renderHeader();
    renderBank();
  });
}

/* ---------------------- Bank tab ---------------------- */

export function renderBank() {
  const card = document.getElementById('bankCard');
  if (!card) return;
  const floor = floorForLevel(state.level);
  const quotaMet = isQuotaMet();

  let controlsHtml;
  if (!state.run.active) {
    controlsHtml = `
      <button id="startDayBtn" class="duo-btn duo-btn--gold" type="button">
        Commencer la journée (Quota ${formatMoney(state.levelTarget)})
      </button>`;
  } else {
    controlsHtml = `
      <div class="bank-progress-label">Journée en cours — prends tout ton temps</div>
      <button id="cashOutBtn" class="duo-btn duo-btn--gold" type="button" ${quotaMet ? '' : 'disabled'}>
        ${quotaMet ? 'Encaisser la journée' : 'Quota pas encore atteint'}
      </button>`;
  }

  const quotaRef = state.run.active ? state.run.quota : state.levelTarget;
  const pct = Math.max(0, Math.min(100, (state.bank / quotaRef) * 100));

  card.innerHTML = `
    <div class="banker-portrait">${buildIconSVG('banker')}</div>
    <div class="banker-speech ${quotaMet ? 'banker-speech--ready' : ''}">
      « Étage ${floor.num}/${floor.total} — ${floor.name}. Le quota du jour, c'est ${formatMoney(quotaRef)}. »
    </div>
    <div class="bank-progress-track">
      <div class="bank-progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="bank-progress-label">${formatMoney(state.bank)} / ${formatMoney(quotaRef)} · ${state.tickets} tickets</div>
    ${controlsHtml}
  `;

  const startBtn = card.querySelector('#startDayBtn');
  if (startBtn) startBtn.addEventListener('click', startDay);
  const cashOutBtn = card.querySelector('#cashOutBtn');
  if (cashOutBtn) cashOutBtn.addEventListener('click', cashOutDay);

  const bankTabBtn = document.querySelector('.tab-btn[data-tab="bank"]');
  if (bankTabBtn) bankTabBtn.classList.toggle('ready', quotaMet);
}

/* ---------------------- Init ---------------------- */

// Runs continuously rather than being invoked by whichever game just changed
// the bank — that would force every game module to import run.js, which
// docs/web-architecture.md's dependency rule avoids. Polling at 2Hz keeps the
// Bank tab and the millionaire check fresh no matter which game is played.
function tick() {
  checkMillionaire();
  renderBank();
}

export function initRun() {
  initDayEndModal();
  initMillionaireModal();
  initFinalChoiceModal();
  setInterval(tick, 500);
}
