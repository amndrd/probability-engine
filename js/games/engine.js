/* ---------------------------------------------------------
   Game selection: the carousel of game cards, and the router
   that opens a game's dedicated view. Each playable game module
   exposes mount()/unmount() (see games/roulette.js for the
   reference implementation) — adding a new playable game in a
   later phase means registering it in GAME_MODULES below, no
   changes needed here otherwise.
   --------------------------------------------------------- */

import { state } from '../state.js';
import { showToast } from '../ui.js';
import { buildIconSVG, CARD_SUITS } from '../icons.js';
import { GAMES } from './list.js';
import * as roulette from './roulette.js';
import * as slots from './slots.js';
import * as moneywheel from './moneywheel.js';
import * as wheeloffortune from './wheeloffortune.js';
import * as blackjack from './blackjack.js';
import * as baccarat from './baccarat.js';
import * as poker from './poker.js';
import * as craps from './craps.js';
import * as crash from './crash.js';
import * as dragontower from './dragontower.js';
import * as minesweeper from './minesweeper.js';
import * as plinko from './plinko.js';
import * as keno from './keno.js';
import * as penguincross from './penguincross.js';
import * as hilo from './hilo.js';

const GAME_MODULES = {
  roulette, slots, moneywheel, wheeloffortune, blackjack, baccarat, poker, craps, crash,
  dragontower, minesweeper, plinko, keno, penguincross, hilo,
};

let activeGameId = null;

function isUnlocked(g) {
  return state.level >= g.unlockLevel || state.unlockAllGames;
}

/* ---------------------- Games list ---------------------- */

export function showGameList() {
  document.getElementById('carouselWrap').classList.remove('hidden');
  document.getElementById('comingSoonView').classList.add('hidden');
  if (activeGameId && GAME_MODULES[activeGameId]) {
    GAME_MODULES[activeGameId].unmount();
  }
  activeGameId = null;
}

function buildGameCard(g) {
  const unlocked = isUnlocked(g);
  const card = document.createElement('div');
  card.className = 'game-card' + (unlocked ? '' : ' locked');

  let playLabel = '▶ Jouer';
  let playVariant = '';
  if (!unlocked) {
    playLabel = `<span class="icon-svg play-btn-icon">${buildIconSVG('lock')}</span> Niv. ${g.unlockLevel}`;
    playVariant = ' play-btn--locked';
  } else if (!g.playable) {
    playLabel = 'Bientôt';
    playVariant = ' play-btn--soon';
  }

  const iconMarkup = unlocked
    ? `<div class="icon icon-svg">${buildIconSVG(g.icon)}</div>`
    : `<div class="icon icon--lock icon-svg">${buildIconSVG('lock')}</div>`;

  const cornerIcon = buildIconSVG(g.icon);
  const suitIcon = buildIconSVG(CARD_SUITS[GAMES.indexOf(g) % CARD_SUITS.length]);
  const cornerMarkup = `
    <div class="card-corner card-corner--tl icon-svg">
      <span class="corner-lvl">${g.unlockLevel}</span>
      <span class="corner-icon">${cornerIcon}</span>
    </div>
    <div class="card-corner card-corner--br icon-svg">
      <span class="corner-lvl">${g.unlockLevel}</span>
      <span class="corner-icon">${cornerIcon}</span>
    </div>
    <div class="card-suit card-suit--tr icon-svg">${suitIcon}</div>
    <div class="card-suit card-suit--bl icon-svg">${suitIcon}</div>
  `;

  card.innerHTML = `
    ${cornerMarkup}
    ${iconMarkup}
    <h3>${g.name}</h3>
    <div class="sub">${unlocked ? (g.playable ? 'Jouer maintenant' : 'Bientôt disponible') : `Niveau ${g.unlockLevel} requis`}</div>
    <button class="play-btn${playVariant}" type="button">${playLabel}</button>
  `;

  card.addEventListener('click', () => {
    if (card.classList.contains('is-center')) {
      openGame(g);
    } else {
      scrollCardToCenter(card);
    }
  });
  card.querySelector('.play-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openGame(g);
  });

  return card;
}

// The track renders several back-to-back copies of GAMES so the carousel can
// be dragged/arrowed past either end without hitting a hard stop;
// wrapCarouselIfNeeded() then silently jumps back into the middle copy once
// scrolling settles, which is invisible to the user since every copy renders
// identical cards — the illusion of an infinite loop.
const CAROUSEL_COPIES = 3;

export function renderGameList() {
  const grid = document.getElementById('gameList');
  grid.innerHTML = '';
  for (let copy = 0; copy < CAROUSEL_COPIES; copy++) {
    GAMES.forEach(g => grid.appendChild(buildGameCard(g)));
  }
  grid.classList.add('entering');
  grid.addEventListener('animationend', () => grid.classList.remove('entering'), { once: true });
  requestAnimationFrame(() => centerFirstCard());
}

/* ---------------------- Carousel (straight row, centered + infinite loop) ---------------------- */

function scrollCardToCenter(card, behavior = 'smooth') {
  const track = document.getElementById('gameList');
  if (!card) return;
  track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2, behavior });
}

function getClosestCenterCard() {
  const track = document.getElementById('gameList');
  const cards = [...track.querySelectorAll('.game-card')];
  if (!cards.length) return null;
  const trackRect = track.getBoundingClientRect();
  const centerX = trackRect.left + trackRect.width / 2;
  let closest = null;
  let closestDist = Infinity;
  cards.forEach(card => {
    const r = card.getBoundingClientRect();
    const dist = Math.abs((r.left + r.width / 2) - centerX);
    if (dist < closestDist) {
      closestDist = dist;
      closest = card;
    }
  });
  return closest;
}

function updateCenterCard() {
  const track = document.getElementById('gameList');
  const closest = getClosestCenterCard();
  track.querySelectorAll('.game-card').forEach(c => c.classList.toggle('is-center', c === closest));
  return closest;
}

// Once scrolling settles on a cloned copy (past either end of the middle,
// "real" copy), silently relocate to the equivalent card one copy over.
function wrapCarouselIfNeeded() {
  const track = document.getElementById('gameList');
  const cards = [...track.querySelectorAll('.game-card')];
  const n = GAMES.length;
  if (cards.length !== n * CAROUSEL_COPIES) return;
  const idx = cards.findIndex(c => c.classList.contains('is-center'));
  if (idx === -1) return;
  if (idx < n) {
    scrollCardToCenter(cards[idx + n], 'auto');
    updateCenterCard();
  } else if (idx >= n * 2) {
    scrollCardToCenter(cards[idx - n], 'auto');
    updateCenterCard();
  }
}

function centerFirstCard() {
  const track = document.getElementById('gameList');
  const cards = track.querySelectorAll('.game-card');
  const target = cards[GAMES.length]; // first card of the middle (real) copy
  if (!target) return;
  scrollCardToCenter(target, 'auto');
  updateCenterCard();
}

export function initCarousel() {
  const track = document.getElementById('gameList');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');

  function step(direction) {
    const cards = [...track.querySelectorAll('.game-card')];
    const idx = cards.findIndex(c => c.classList.contains('is-center'));
    const target = cards[idx + direction];
    if (target) scrollCardToCenter(target);
  }
  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));

  let isDown = false;
  let startX = 0;
  let startScroll = 0;
  let moved = false;
  let rafPending = false;
  let settleTimer = null;

  track.addEventListener('scroll', () => {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        updateCenterCard();
        rafPending = false;
      });
    }
    if (!isDown) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(wrapCarouselIfNeeded, 150);
    }
  });

  window.addEventListener('resize', () => {
    const current = getClosestCenterCard();
    scrollCardToCenter(current, 'auto');
    updateCenterCard();
  });

  track.addEventListener('pointerdown', (e) => {
    isDown = true;
    moved = false;
    startX = e.clientX;
    startScroll = track.scrollLeft;
    track.classList.add('dragging');
  });

  track.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    track.scrollLeft = startScroll - dx;
  });

  const endDrag = () => {
    isDown = false;
    track.classList.remove('dragging');
    clearTimeout(settleTimer);
    settleTimer = setTimeout(wrapCarouselIfNeeded, 150);
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointerleave', endDrag);

  // Prevent the drag gesture from also triggering a card click.
  track.addEventListener('click', (e) => {
    if (moved) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
}

/* ---------------------- Open / route to a game ---------------------- */

export function openGame(g) {
  const unlocked = isUnlocked(g);
  if (!unlocked) {
    showToast(`Débloque ${g.name} en atteignant le niveau ${g.unlockLevel}.`);
    return;
  }
  document.getElementById('carouselWrap').classList.add('hidden');
  const mod = GAME_MODULES[g.id];
  if (g.playable && mod) {
    document.getElementById('comingSoonView').classList.add('hidden');
    activeGameId = g.id;
    mod.mount();
  } else {
    document.getElementById('comingSoonView').classList.remove('hidden');
    document.getElementById('comingSoonTitle').textContent = g.name;
    document.getElementById('comingSoonText').textContent =
      'Ce jeu arrive bientôt dans une prochaine mise à jour !';
  }
}

export function initGameNav() {
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => showGameList());
  });

  // Tapping the already-active "Jeux" tab also resets to the game catalog —
  // otherwise a player who switched to another tab and back would land back
  // on whichever game view was open, with no way out besides the back button.
  document.querySelector('.tab-btn[data-tab="games"]')?.addEventListener('click', (e) => {
    if (e.currentTarget.classList.contains('active')) showGameList();
  });
}
