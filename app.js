/* ---------------------------------------------------------
   Fauxvegas — prototype de casino gratuit (aucun argent réel)
   --------------------------------------------------------- */

const STORAGE_KEY = 'fauxvegas_state_v1';

/* ---------------------- Sound (synthesized 8-bit beeps) ---------------------- */

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beep({ freq = 440, duration = 0.07, type = 'square', volume = 0.14, delay = 0 } = {}) {
  if (state.muted) return;
  const ctx = getAudioCtx();
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function playClick() {
  beep({ freq: 880, duration: 0.05, volume: 0.12 });
}

function playChip() {
  beep({ freq: 660, duration: 0.035, volume: 0.13 });
  beep({ freq: 990, duration: 0.05, volume: 0.1, delay: 0.03 });
}

function playWin() {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    beep({ freq, duration: 0.12, volume: 0.13, delay: i * 0.09 })
  );
}

function playLevelUp() {
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) =>
    beep({ freq, duration: 0.14, volume: 0.14, delay: i * 0.1 })
  );
}

/* ---------------------- Pixel icons ----------------------
   Each icon is an 8x8 grid of characters ('.' = transparent);
   buildPixelIconSVG() merges same-color runs per row into <rect>s. */
const PIXEL_ICON_GRIDS = {
  roulette: {
    rows: [
      '..RRRR..',
      '.RDRDRD.',
      'RDRDRDRD',
      'RDRGGDRD',
      'RDRGGDRD',
      'RDRDRDRD',
      '.RDRDRD.',
      '..RRRR..',
    ],
    palette: { R: '#ec2848', D: '#232323', G: '#ffc700' },
  },
  blackjack: {
    rows: [
      '.KKKKKK.',
      '.KWWWWK.',
      '.KWWWWK.',
      '.KWRRWK.',
      '.KWRRWK.',
      '.KWWWWK.',
      '.KWWWWK.',
      '.KKKKKK.',
    ],
    palette: { W: '#ffffff', K: '#171a14', R: '#ec2848' },
  },
  slots: {
    rows: [
      '.KKKKKKK',
      '.KWGWBWK',
      '.KWGWBWK',
      '.KWGWBWK',
      '.KKKKKKK',
      '....K...',
      '....K...',
      '...KKK..',
    ],
    palette: { K: '#171a14', W: '#ffffff', G: '#ffc700', B: '#2196f3' },
  },
  baccarat: {
    rows: [
      '...BB...',
      '..BBBB..',
      '.BBWWBB.',
      'BBWWWWBB',
      '.BBWWBB.',
      '..BBBB..',
      '...BB...',
      '........',
    ],
    palette: { B: '#2196f3', W: '#ffffff' },
  },
  poker: {
    rows: [
      '...KK...',
      '..KKKK..',
      '.KKKKKK.',
      'KKKKKKKK',
      'KKKKKKKK',
      '.KKKKKK.',
      '...KK...',
      '...KK...',
    ],
    palette: { K: '#171a14' },
  },
  craps: {
    rows: [
      'KKKKKKKK',
      'KFFFFFFK',
      'KFP..PFK',
      'KF.PP.FK',
      'KF.PP.FK',
      'KFP..PFK',
      'KFFFFFFK',
      'KKKKKKKK',
    ],
    palette: { K: '#171a14', F: '#ffffff', P: '#171a14' },
  },
  lock: {
    rows: [
      '..KKKK..',
      '.K....K.',
      '.K....K.',
      'KKKKKKKK',
      'KGGGGGGK',
      'KGKKKKGK',
      'KGGGGGGK',
      'KKKKKKKK',
    ],
    palette: { K: '#171a14', G: '#ffc700' },
  },
  chance3: {
    rows: [
      '...GG...',
      '...GG...',
      '.G.GG.G.',
      'GGGGGGGG',
      'GGGGGGGG',
      '.G.GG.G.',
      '...GG...',
      '...GG...',
    ],
    palette: { G: '#ffc700' },
  },
  banker: {
    rows: [
      '......HHHH......',
      '.....HHHHHH.....',
      '...HHHHHHHHHH...',
      '.....HHHHHH.....',
      '.....FFFFFF.....',
      '.....FKFFKF.....',
      '.....FFFFFF.....',
      '....CCCCCCCC....',
      '....CCCBBCCC....',
      '..SSSSSSSSSSSS..',
      '.SSSSSSSSSSSSSS.',
      'SSSSSSSSSSSSSSSS',
      'SSSSSSSSSSSSSSSS',
      'SSSSSSSSSSSSSSSS',
      'SSSSSSSSSSSSSSSS',
      'SSSSSSSSSSSSSSSS',
    ],
    palette: { H: '#171a14', F: '#e8b382', K: '#171a14', C: '#ffffff', B: '#ffc700', S: '#7a0f24' },
  },
  // Decorative corner suits — finer 16x16 grid for smoother curves, colored via currentColor.
  'suit-diamond': {
    rows: [
      '.......DD.......',
      '......DDDD......',
      '.....DDDDDD.....',
      '....DDDDDDDD....',
      '...DDDDDDDDDD...',
      '..DDDDDDDDDDDD..',
      '.DDDDDDDDDDDDDD.',
      'DDDDDDDDDDDDDDDD',
      'DDDDDDDDDDDDDDDD',
      '.DDDDDDDDDDDDDD.',
      '..DDDDDDDDDDDD..',
      '...DDDDDDDDDD...',
      '....DDDDDDDD....',
      '.....DDDDDD.....',
      '......DDDD......',
      '.......DD.......',
    ],
    palette: { D: 'currentColor' },
  },
  'suit-heart': {
    rows: [
      '..DDDD....DDDD..',
      '.DDDDDD..DDDDDD.',
      'DDDDDDDDDDDDDDDD',
      'DDDDDDDDDDDDDDDD',
      'DDDDDDDDDDDDDDDD',
      'DDDDDDDDDDDDDDDD',
      '.DDDDDDDDDDDDDD.',
      '..DDDDDDDDDDDD..',
      '...DDDDDDDDDD...',
      '....DDDDDDDD....',
      '.....DDDDDD.....',
      '......DDDD......',
      '.......DD.......',
      '.......DD.......',
      '................',
      '................',
    ],
    palette: { D: 'currentColor' },
  },
  'suit-spade': {
    rows: [
      '.......DD.......',
      '......DDDD......',
      '.....DDDDDD.....',
      '....DDDDDDDD....',
      '...DDDDDDDDDD...',
      '..DDDDDDDDDDDD..',
      '.DDDDDDDDDDDDDD.',
      'DDDDDDDDDDDDDDDD',
      'DDDDDDDDDDDDDDDD',
      '..DDDDDDDDDDDD..',
      '....DDDDDDDD....',
      '......DDDD......',
      '.......DD.......',
      '.......DD.......',
      '.....DDDDDD.....',
      '.....DDDDDD.....',
    ],
    palette: { D: 'currentColor' },
  },
  'suit-club': {
    rows: [
      '..DDD......DDD..',
      '.DDDDD....DDDDD.',
      '.DDDDDD..DDDDDD.',
      'DDDDDDD..DDDDDDD',
      'DDDDDDDDDDDDDDDD',
      '.DDDDDDDDDDDDDD.',
      '...DDDDDDDDDD...',
      '.DDDDDDDDDDDDDD.',
      'DDDDDDDDDDDDDDDD',
      '.DDDDDDDDDDDDDD.',
      '....DDDDDDDD....',
      '......DDDD......',
      '.......DD.......',
      '.......DD.......',
      '.....DDDDDD.....',
      '.....DDDDDD.....',
    ],
    palette: { D: 'currentColor' },
  },

  // ---- UI glyphs replacing emoji, all colored via currentColor ----
  gear: {
    rows: [
      '.D.DD.D.',
      'DDDDDDDD',
      'D.DDDD.D',
      'DDDSSDDD',
      'DDDSSDDD',
      'D.DDDD.D',
      'DDDDDDDD',
      '.D.DD.D.',
    ],
    palette: { D: 'currentColor', S: 'var(--felt)' },
  },
  home: {
    rows: [
      '....DD..',
      '...DWWD.',
      '..DWWWWD',
      '.DWWWWWD',
      'DWWWWWWD',
      'DWWDDWWD',
      'DWWDDWWD',
      'DDDDDDDD',
    ],
    palette: { D: 'currentColor', W: '#fff6e0' },
  },
  trophy: {
    rows: [
      '.DDDDDD.',
      'DGGGGGGD',
      'DGGGGGGD',
      '.DGGGGD.',
      '..DGGD..',
      '..DGGD..',
      '.DDDDDD.',
      'DDDDDDDD',
    ],
    palette: { D: 'currentColor', G: '#ffc700' },
  },
  moneybag: {
    rows: [
      '..DDDD..',
      '.D.GG.D.',
      '.DGGGGD.',
      'DGGGGGGD',
      'DGGDDGGD',
      'DGGGGGGD',
      '.DGGGGD.',
      '..DDDD..',
    ],
    palette: { D: 'currentColor', G: '#ffc700' },
  },
  people: {
    rows: [
      '..DD.DD.',
      '..DD.DD.',
      '.DDDDDDD',
      'DDDDDDDD',
      'DDDDDDDD',
      '.DDDDDD.',
      '.DDDDDD.',
      '........',
    ],
    palette: { D: 'currentColor' },
  },
  modes: {
    rows: [
      'DDDDDDDD',
      'DWWWBBBD',
      'DWWWBBBD',
      'DWWWBBBD',
      'DBBBWWWD',
      'DBBBWWWD',
      'DBBBWWWD',
      'DDDDDDDD',
    ],
    palette: { D: 'currentColor', W: '#ffffff', B: '#2196f3' },
  },
  bag: {
    rows: [
      '..D..D..',
      '..D..D..',
      '.DDDDDD.',
      'DWWWWWWD',
      'DWWWWWWD',
      'DWWWWWWD',
      'DWWWWWWD',
      '.DDDDDD.',
    ],
    palette: { D: 'currentColor', W: '#fff6e0' },
  },
  target: {
    rows: [
      '..RRRR..',
      '.RWWWWR.',
      'RWRRRRWR',
      'RWRWWRWR',
      'RWRWWRWR',
      'RWRRRRWR',
      '.RWWWWR.',
      '..RRRR..',
    ],
    palette: { R: '#ec2848', W: '#ffffff' },
  },
  clock: {
    rows: [
      '..DDDD..',
      '.D....D.',
      'D..D...D',
      'D..D...D',
      'D..DDD.D',
      'D......D',
      '.D....D.',
      '..DDDD..',
    ],
    palette: { D: 'currentColor' },
  },
  bank: {
    rows: [
      '...DD...',
      '..DDDD..',
      'DDDDDDDD',
      '.D.DD.D.',
      '.D.DD.D.',
      '.D.DD.D.',
      '.D.DD.D.',
      'DDDDDDDD',
    ],
    palette: { D: 'currentColor' },
  },
  controller: {
    rows: [
      '.DDDDDD.',
      'DDDDDDDD',
      'DW.DD.WD',
      'DW.DD.WD',
      'DDDDDDDD',
      '.DDDDDD.',
      '........',
      '........',
    ],
    palette: { D: 'currentColor', W: '#fff6e0' },
  },
  closeX: {
    rows: [
      'D......D',
      '.D....D.',
      '..D..D..',
      '...DD...',
      '...DD...',
      '..D..D..',
      '.D....D.',
      'D......D',
    ],
    palette: { D: 'currentColor' },
  },
  soundOn: {
    rows: [
      '........',
      '..DD....',
      '.DDDD.D.',
      'DDDDDD.D',
      'DDDDDD.D',
      '.DDDD.D.',
      '..DD....',
      '........',
    ],
    palette: { D: 'currentColor' },
  },
  soundOff: {
    rows: [
      '........',
      '..DD....',
      '.DDDDD.D',
      'DDDDD.D.',
      'DDDDD.D.',
      '.DDDDD.D',
      '..DD....',
      '........',
    ],
    palette: { D: 'currentColor' },
  },
  check: {
    rows: [
      '........',
      '.......D',
      '......DD',
      'D....DD.',
      'DD..DD..',
      '.DDDD...',
      '..DD....',
      '........',
    ],
    palette: { D: 'currentColor' },
  },
  bill: {
    rows: [
      'KKKKKKKKKK',
      'KGGGGGGGGK',
      'KGGWWWWGGK',
      'KGGWWWWGGK',
      'KGGGGGGGGK',
      'KKKKKKKKKK',
    ],
    palette: { K: '#0a5c36', G: '#2be86a', W: '#c8f5d6' },
  },
};

const CARD_SUITS = ['suit-diamond', 'suit-club', 'suit-spade', 'suit-heart'];

function buildPixelIconSVG(name) {
  const grid = PIXEL_ICON_GRIDS[name];
  if (!grid) return '';
  const { rows, palette } = grid;
  const width = rows[0].length;
  const height = rows.length;
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let runEnd = x + 1;
      while (runEnd < row.length && row[runEnd] === ch) runEnd++;
      rects += `<rect x="${x}" y="${y}" width="${runEnd - x}" height="1" fill="${palette[ch]}"/>`;
      x = runEnd;
    }
  });
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" shape-rendering="crispEdges">${rects}</svg>`;
}

const GAMES = [
  { id: 'roulette', name: 'Roulette',        icon: 'roulette', unlockLevel: 1,  playable: true },
  { id: 'blackjack', name: 'Blackjack',       icon: 'blackjack', unlockLevel: 2,  playable: false },
  { id: 'slots',     name: 'Machine à sous',  icon: 'slots', unlockLevel: 4,  playable: false },
  { id: 'baccarat',  name: 'Baccarat',        icon: 'baccarat', unlockLevel: 6,  playable: false },
  { id: 'poker',     name: 'Poker',           icon: 'poker', unlockLevel: 8,  playable: false },
  { id: 'craps',     name: 'Craps',           icon: 'craps', unlockLevel: 10, playable: false },
];

const SHOP_ITEMS = [
  {
    id: 'chanceX3',
    name: 'Kit Chance x3',
    desc: 'Active-le avant un lancer : 1 chance sur 3 de tripler ton gain à la roulette.',
    price: 150,
    icon: 'chance3',
  },
];

const MILLIONAIRE_TARGET = 1000000;

const CHALLENGE_TEMPLATES = [
  { id: 'win3', desc: 'Gagne 3 mises à la roulette', target: 3, reward: 200 },
  { id: 'win5', desc: 'Gagne 5 mises à la roulette', target: 5, reward: 350 },
  { id: 'spin10', desc: 'Lance la roulette 10 fois', target: 10, reward: 150 },
];

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const CHIP_VALUES = [10, 25, 100, 500];

const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

const MAX_RELOADS_PER_DAY = 5;
const RELOAD_AMOUNT = 500;
const LOW_BALANCE_THRESHOLD = 10;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function defaultState() {
  return {
    balance: 500,
    level: 1,
    levelTarget: 1500,
    items: { chanceX3: 0 },
    armedChanceX3: false,
    millionaireShown: false,
    challenge: pickChallenge(),
    reloads: { date: todayStr(), count: 0 },
    history: [],
    muted: false,
  };
}

function pickChallenge() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const tpl = CHALLENGE_TEMPLATES[dayIndex % CHALLENGE_TEMPLATES.length];
  return { date: todayStr(), id: tpl.id, progress: 0, done: false };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed.challenge || parsed.challenge.date !== todayStr()) {
      parsed.challenge = pickChallenge();
    }
    if (!parsed.reloads || parsed.reloads.date !== todayStr()) {
      parsed.reloads = { date: todayStr(), count: 0 };
    }
    if (!parsed.items) parsed.items = { chanceX3: 0 };
    if (parsed.armedChanceX3 === undefined) parsed.armedChanceX3 = false;
    if (parsed.millionaireShown === undefined) parsed.millionaireShown = false;
    return parsed;
  } catch (e) {
    return defaultState();
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextLevelTarget(currentTarget) {
  return Math.round((currentTarget * 1.55) / 50) * 50;
}

function bonusForLevelUp(target) {
  return Math.round((target * 0.15) / 10) * 10;
}

function showToast(msg, duration = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), duration);
}

function isLevelUpEligible() {
  return state.balance >= state.levelTarget;
}

// Reaching the target no longer levels the player up automatically — they
// must go validate it with the banker (Banque tab). They keep their full
// balance either way, so overshooting the target is pure upside.
function performLevelUp() {
  if (!isLevelUpEligible()) return;
  const bonus = bonusForLevelUp(state.levelTarget);
  state.balance += bonus;
  state.level += 1;
  const unlockedGame = GAMES.find(g => g.unlockLevel === state.level);
  state.levelTarget = nextLevelTarget(state.levelTarget);
  saveState();

  const becameMillionaire = checkMillionaire();
  if (!becameMillionaire) {
    const modalText = document.getElementById('levelUpText');
    modalText.textContent = unlockedGame
      ? `Niveau ${state.level} atteint ! Bonus de ${formatMoney(bonus)}. Nouveau jeu débloqué : ${unlockedGame.name} !`
      : `Niveau ${state.level} atteint ! Bonus de ${formatMoney(bonus)}. Prochain objectif : ${formatMoney(state.levelTarget)}.`;
    document.getElementById('levelUpModal').classList.remove('hidden');
    playLevelUp();
  }

  renderHeader();
  renderBank();
  renderGameList();
}

document.getElementById('levelUpCloseBtn').addEventListener('click', () => {
  document.getElementById('levelUpModal').classList.add('hidden');
  renderAll();
});

// Shown once, the first time the balance ever reaches $1,000,000 — the
// player's ultimate goal. Play continues afterwards with no cap.
function checkMillionaire() {
  if (state.millionaireShown) return false;
  if (state.balance < MILLIONAIRE_TARGET) return false;
  state.millionaireShown = true;
  document.getElementById('millionaireText').textContent =
    `Parti·e de $500, tu es maintenant à ${formatMoney(state.balance)}. Tu es officiellement millionnaire ! Continue à jouer pour voir jusqu'où tu peux aller.`;
  document.getElementById('millionaireModal').classList.remove('hidden');
  playLevelUp();
  saveState();
  return true;
}

document.getElementById('millionaireCloseBtn').addEventListener('click', () => {
  document.getElementById('millionaireModal').classList.add('hidden');
  renderAll();
});

function maybeReload() {
  if (state.balance >= LOW_BALANCE_THRESHOLD) return;
  if (state.reloads.count >= MAX_RELOADS_PER_DAY) return;
  document.getElementById('reloadBtn').classList.remove('hidden');
}

document.getElementById('reloadBtn').addEventListener('click', () => {
  if (state.reloads.count >= MAX_RELOADS_PER_DAY) {
    showToast('Reviens demain pour une nouvelle recharge !');
    return;
  }
  state.balance += RELOAD_AMOUNT;
  state.reloads.count += 1;
  showToast(`+${formatMoney(RELOAD_AMOUNT)} offerts pour continuer à jouer !`);
  saveState();
  renderAll();
});

/* ---------------------- Tabs ---------------------- */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => showGameList());
});

/* ---------------------- Header / progress ---------------------- */

function renderHeader() {
  document.getElementById('balanceValue').textContent = state.balance.toLocaleString('en-US');
  document.getElementById('levelNum').textContent = state.level;

  const prevTarget = state.level === 1 ? 500 : null;
  const floor = prevTarget !== null ? 500 : 0;
  const pct = Math.max(0, Math.min(100, ((state.balance - floor) / (state.levelTarget - floor)) * 100));
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressLabel').textContent =
    `${formatMoney(state.balance)} / ${formatMoney(state.levelTarget)}`;

  document.getElementById('reloadBtn').classList.add('hidden');
  maybeReload();
}

/* ---------------------- Games list ---------------------- */

function showGameList() {
  document.getElementById('carouselWrap').classList.remove('hidden');
  document.getElementById('rouletteView').classList.add('hidden');
  document.getElementById('comingSoonView').classList.add('hidden');
}

function buildGameCard(g) {
  const unlocked = state.level >= g.unlockLevel;
  const card = document.createElement('div');
  card.className = 'game-card' + (unlocked ? '' : ' locked');

  let playLabel = '▶ Jouer';
  let playVariant = '';
  if (!unlocked) {
    playLabel = `<span class="pixel-icon play-btn-icon">${buildPixelIconSVG('lock')}</span> Niv. ${g.unlockLevel}`;
    playVariant = ' play-btn--locked';
  } else if (!g.playable) {
    playLabel = 'Bientôt';
    playVariant = ' play-btn--soon';
  }

  const iconMarkup = unlocked
    ? `<div class="icon pixel-icon">${buildPixelIconSVG(g.icon)}</div>`
    : `<div class="icon icon--lock pixel-icon">${buildPixelIconSVG('lock')}</div>`;

  const cornerIcon = buildPixelIconSVG(g.icon);
  const suitIcon = buildPixelIconSVG(CARD_SUITS[GAMES.indexOf(g) % CARD_SUITS.length]);
  const cornerMarkup = `
    <div class="card-corner card-corner--tl pixel-icon">
      <span class="corner-lvl">${g.unlockLevel}</span>
      <span class="corner-icon">${cornerIcon}</span>
    </div>
    <div class="card-corner card-corner--br pixel-icon">
      <span class="corner-lvl">${g.unlockLevel}</span>
      <span class="corner-icon">${cornerIcon}</span>
    </div>
    <div class="card-suit card-suit--tr pixel-icon">${suitIcon}</div>
    <div class="card-suit card-suit--bl pixel-icon">${suitIcon}</div>
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

function renderGameList() {
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

function initCarousel() {
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

function fitRouletteView() {
  const view = document.getElementById('rouletteView');
  if (view.classList.contains('hidden')) return;
  const mainEl = view.closest('main');
  const bottomPad = mainEl ? parseFloat(getComputedStyle(mainEl).paddingBottom) || 0 : 0;
  const top = view.getBoundingClientRect().top;
  const available = window.innerHeight - top - bottomPad - 8;
  view.style.height = Math.max(available, 480) + 'px';
}
window.addEventListener('resize', fitRouletteView);

function openGame(g) {
  const unlocked = state.level >= g.unlockLevel;
  if (!unlocked) {
    showToast(`Débloque ${g.name} en atteignant le niveau ${g.unlockLevel}.`);
    return;
  }
  document.getElementById('carouselWrap').classList.add('hidden');
  if (g.playable && g.id === 'roulette') {
    document.getElementById('comingSoonView').classList.add('hidden');
    document.getElementById('rouletteView').classList.remove('hidden');
    renderBoard();
    fitRouletteView();
  } else {
    document.getElementById('rouletteView').classList.add('hidden');
    document.getElementById('comingSoonView').classList.remove('hidden');
    document.getElementById('comingSoonTitle').textContent = g.name;
    document.getElementById('comingSoonText').textContent =
      'Ce jeu arrive bientôt dans une prochaine mise à jour !';
  }
}

/* ---------------------- Roulette ---------------------- */

let currentBets = {}; // key -> amount
let selectedChip = CHIP_VALUES[0];
let spinning = false;

const BET_DEFS = {}; // key -> { numbers: Set, multiplier }

function buildBetDefs() {
  const all = Array.from({ length: 37 }, (_, i) => i); // 0..36
  for (let n = 1; n <= 36; n++) {
    BET_DEFS['straight_' + n] = { numbers: new Set([n]), multiplier: 35 };
  }
  BET_DEFS['red'] = { numbers: new Set([...RED_NUMBERS]), multiplier: 1 };
  BET_DEFS['black'] = { numbers: new Set(all.filter(n => n !== 0 && !RED_NUMBERS.has(n))), multiplier: 1 };
  BET_DEFS['even'] = { numbers: new Set(all.filter(n => n !== 0 && n % 2 === 0)), multiplier: 1 };
  BET_DEFS['odd'] = { numbers: new Set(all.filter(n => n % 2 === 1)), multiplier: 1 };
  BET_DEFS['low'] = { numbers: new Set(all.filter(n => n >= 1 && n <= 18)), multiplier: 1 };
  BET_DEFS['high'] = { numbers: new Set(all.filter(n => n >= 19 && n <= 36)), multiplier: 1 };
  BET_DEFS['dozen1'] = { numbers: new Set(all.filter(n => n >= 1 && n <= 12)), multiplier: 2 };
  BET_DEFS['dozen2'] = { numbers: new Set(all.filter(n => n >= 13 && n <= 24)), multiplier: 2 };
  BET_DEFS['dozen3'] = { numbers: new Set(all.filter(n => n >= 25 && n <= 36)), multiplier: 2 };
}
buildBetDefs();

function renderChipSelector() {
  const wrap = document.getElementById('chipSelector');
  wrap.innerHTML = '';
  CHIP_VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip-btn v' + v + (v === selectedChip ? ' selected' : '');
    btn.textContent = '$' + v;
    btn.addEventListener('click', () => {
      selectedChip = v;
      renderChipSelector();
    });
    wrap.appendChild(btn);
  });
}

function renderItemBar() {
  const bar = document.getElementById('itemBar');
  if (!bar) return;
  const owned = state.items.chanceX3 || 0;
  bar.innerHTML = `
    <button id="chanceX3Btn" class="item-btn${state.armedChanceX3 ? ' armed' : ''}" type="button" ${owned === 0 && !state.armedChanceX3 ? 'disabled' : ''}>
      <span class="item-btn-icon pixel-icon">${buildPixelIconSVG('chance3')}</span>
      <span class="item-btn-label">Kit Chance x3 (${owned})${state.armedChanceX3 ? ' — armé pour ce tour' : ''}</span>
    </button>
  `;
  bar.querySelector('#chanceX3Btn').addEventListener('click', () => {
    if (spinning) return;
    if (state.armedChanceX3) {
      state.armedChanceX3 = false;
    } else {
      if ((state.items.chanceX3 || 0) <= 0) {
        showToast("Tu n'as aucun Kit Chance x3 — achètes-en un à la Boutique !");
        return;
      }
      state.armedChanceX3 = true;
    }
    saveState();
    renderItemBar();
  });
}

function renderBoard() {
  renderWheel();
  const board = document.getElementById('board');
  board.innerHTML = '';

  // zero
  board.appendChild(makeCell('zero', '0', 'straight_0'));

  // number grid: row1 top (3,6,...36), row2 (2,5,...35), row3 bottom (1,4,...34)
  for (let row = 0; row < 3; row++) {
    for (let col = 1; col <= 12; col++) {
      const n = col * 3 - row;
      const colorClass = RED_NUMBERS.has(n) ? 'num-red' : 'num-black';
      board.appendChild(makeCell(colorClass, String(n), 'straight_' + n));
    }
  }

  // dozens row
  const dozens = [
    ['1ère 12', 'dozen1', '2 / 6'],
    ['2ème 12', 'dozen2', '6 / 10'],
    ['3ème 12', 'dozen3', '10 / 14'],
  ];
  dozens.forEach(([label, key, colSpan]) => {
    const cell = makeCell('dozen', label, key);
    cell.style.gridColumn = colSpan;
    board.appendChild(cell);
  });

  // outside bets row
  const outside = [
    ['1-18', 'low', '2 / 4'],
    ['PAIR', 'even', '4 / 6'],
    ['ROUGE', 'red', '6 / 8'],
    ['NOIR', 'black', '8 / 10'],
    ['IMPAIR', 'odd', '10 / 12'],
    ['19-36', 'high', '12 / 14'],
  ];
  outside.forEach(([label, key, colSpan]) => {
    const cell = makeCell('outside', label, key);
    cell.style.gridColumn = colSpan;
    if (key === 'red') cell.style.background = 'var(--red)';
    if (key === 'black') cell.style.background = '#1b1b1b';
    board.appendChild(cell);
  });

  renderChipSelector();
  renderBetAmounts();
  renderBetTotal();
  renderHistory();
  renderItemBar();
}

function makeCell(cls, label, key) {
  const cell = document.createElement('div');
  cell.className = 'cell ' + cls;
  cell.dataset.key = key;
  cell.innerHTML = `<span>${label}</span>`;
  cell.addEventListener('click', () => placeBet(key));
  return cell;
}

function placeBet(key) {
  if (spinning) return;
  if (state.balance < selectedChip) {
    showToast("Solde insuffisant pour cette mise.");
    return;
  }
  state.balance -= selectedChip;
  currentBets[key] = (currentBets[key] || 0) + selectedChip;
  renderHeader();
  renderBetAmounts();
  renderBetTotal();
  saveState();
}

function renderBetAmounts() {
  document.querySelectorAll('#board .cell').forEach(cell => {
    const existing = cell.querySelector('.bet-chip');
    if (existing) existing.remove();
    const key = cell.dataset.key;
    const amt = currentBets[key];
    if (amt) {
      const chip = document.createElement('div');
      chip.className = 'bet-chip';
      chip.textContent = '$' + (amt >= 1000 ? Math.round(amt / 1000) + 'k' : amt);
      cell.appendChild(chip);
    }
  });
}

function renderBetTotal() {
  const total = Object.values(currentBets).reduce((a, b) => a + b, 0);
  document.getElementById('betTotal').textContent = total.toLocaleString('en-US');
  document.getElementById('spinBtn').disabled = total === 0 || spinning;
}

function clearBets() {
  if (spinning) return;
  const total = Object.values(currentBets).reduce((a, b) => a + b, 0);
  state.balance += total;
  currentBets = {};
  renderHeader();
  renderBetAmounts();
  renderBetTotal();
  saveState();
}

document.getElementById('clearBetsBtn').addEventListener('click', clearBets);
document.getElementById('spinBtn').addEventListener('click', spin);

function renderHistory() {
  const wrap = document.getElementById('history');
  wrap.innerHTML = '';
  state.history.slice(-10).reverse().forEach(n => {
    const chip = document.createElement('div');
    chip.className = 'history-chip ' + colorOf(n);
    chip.textContent = n;
    wrap.appendChild(chip);
  });
}

function colorOf(n) {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

const WHEEL_ANGLE_PER = 360 / WHEEL_ORDER.length;
const WHEEL_NUMBER_RADIUS_CQW = 35.2381; // 148px on the 420px reference wheel — scales with wheel-stage's own size
let rotorRotation = 0;
let ballRotation = 0;

function renderWheel() {
  const labelsWrap = document.getElementById('wheelLabels');
  if (labelsWrap.dataset.built) return;
  labelsWrap.innerHTML = '';
  const gradientStops = [];

  WHEEL_ORDER.forEach((num, i) => {
    const angle = i * WHEEL_ANGLE_PER;
    const color = num === 0 ? 'var(--good)' : (RED_NUMBERS.has(num) ? 'var(--red)' : '#161616');
    gradientStops.push(`${color} ${angle}deg ${angle + WHEEL_ANGLE_PER}deg`);

    const label = document.createElement('div');
    label.className = 'wheel-label';
    label.style.transform = `rotate(${angle}deg) translateY(-${WHEEL_NUMBER_RADIUS_CQW}cqw)`;
    label.innerHTML = `<span>${num}</span>`;
    labelsWrap.appendChild(label);
  });

  document.getElementById('wheelRotor').style.background =
    `conic-gradient(from ${-WHEEL_ANGLE_PER / 2}deg, ${gradientStops.join(', ')})`;
  labelsWrap.dataset.built = '1';
}

function spin() {
  if (spinning) return;
  const total = Object.values(currentBets).reduce((a, b) => a + b, 0);
  if (total === 0) return;

  spinning = true;
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('clearBetsBtn').disabled = true;
  document.getElementById('wheelResult').textContent = 'La bille tourne...';

  const winningNumber = Math.floor(Math.random() * 37);
  const idx = WHEEL_ORDER.indexOf(winningNumber);
  const pocketAngle = idx * WHEEL_ANGLE_PER;

  const rotor = document.getElementById('wheelRotor');
  const ballTrack = document.getElementById('ballTrack');

  // The wheel itself stops at a random orientation each time — the ball,
  // not a fixed pointer, is what marks the winning pocket.
  const restAngle = Math.random() * 360;
  const rotorBaseline = Math.ceil(rotorRotation / 360) * 360;
  rotorRotation = rotorBaseline + 4 * 360 + restAngle;

  const finalPocketAngle = ((pocketAngle + rotorRotation) % 360 + 360) % 360;
  const ballBaseline = Math.floor(ballRotation / 360) * 360;
  ballRotation = ballBaseline - 7 * 360 + finalPocketAngle;

  const spinDuration = 4200;
  rotor.style.transition = `transform ${spinDuration}ms cubic-bezier(0.13, 0.71, 0.24, 1)`;
  ballTrack.style.transition = `transform ${spinDuration}ms cubic-bezier(0.1, 0.6, 0.18, 1)`;
  rotor.style.transform = `rotate(${rotorRotation}deg)`;
  ballTrack.style.transform = `rotate(${ballRotation}deg)`;

  setTimeout(() => resolveSpin(winningNumber), spinDuration + 100);
}

function resolveSpin(winningNumber) {
  const color = colorOf(winningNumber);
  document.getElementById('wheelResult').innerHTML =
    `Numéro <strong>${winningNumber}</strong> — ${labelForColor(color)}`;

  let winnings = 0;
  let anyWin = false;
  Object.entries(currentBets).forEach(([key, amount]) => {
    const def = BET_DEFS[key];
    if (def && def.numbers.has(winningNumber)) {
      winnings += amount * (def.multiplier + 1);
      anyWin = true;
    }
  });

  let tripled = false;
  if (state.armedChanceX3) {
    state.items.chanceX3 = Math.max(0, (state.items.chanceX3 || 0) - 1);
    state.armedChanceX3 = false;
    if (winnings > 0 && Math.random() < 1 / 3) {
      winnings *= 3;
      tripled = true;
    }
  }

  state.balance += winnings;
  state.history.push(winningNumber);
  if (state.history.length > 50) state.history = state.history.slice(-50);

  updateChallengeProgress(anyWin);
  highlightWinners(winningNumber);

  if (winnings > 0) {
    showToast(`Numéro ${winningNumber} (${labelForColor(color)}) — Gain de ${formatMoney(winnings)} !${tripled ? ' Kit Chance x3 : gain triplé !' : ''}`);
    playWin();
    if (tripled) playLevelUp();
  } else {
    showToast(`Numéro ${winningNumber} (${labelForColor(color)}) — Pas de chance cette fois.`);
  }

  currentBets = {};
  spinning = false;
  document.getElementById('clearBetsBtn').disabled = false;

  saveState();
  renderHeader();
  renderBetAmounts();
  renderBetTotal();
  renderHistory();
  renderHistoryTab();
  renderChallenge();
  renderGameList();
  renderItemBar();
  renderBank();

  setTimeout(() => {
    document.querySelectorAll('#board .cell.winner').forEach(c => c.classList.remove('winner'));
    checkMillionaire();
  }, 1400);
}

function labelForColor(c) {
  return c === 'red' ? 'Rouge' : c === 'black' ? 'Noir' : 'Zéro';
}

function highlightWinners(winningNumber) {
  document.querySelectorAll('#board .cell').forEach(cell => {
    const def = BET_DEFS[cell.dataset.key];
    if (def && def.numbers.has(winningNumber) && def.numbers.size <= 18) {
      cell.classList.add('winner');
    } else if (cell.dataset.key === 'straight_' + winningNumber) {
      cell.classList.add('winner');
    }
  });
}

/* ---------------------- Challenges ---------------------- */

function updateChallengeProgress(anyWin) {
  const tpl = CHALLENGE_TEMPLATES.find(t => t.id === state.challenge.id);
  if (!tpl || state.challenge.done) return;

  if (tpl.id === 'spin10') {
    state.challenge.progress += 1;
  } else if (anyWin) {
    state.challenge.progress += 1;
  }

  if (state.challenge.progress >= tpl.target) {
    state.challenge.progress = tpl.target;
    state.challenge.done = true;
    state.balance += tpl.reward;
    showToast(`Défi accompli ! +${formatMoney(tpl.reward)}`, 3200);
  }
}

function renderChallenge() {
  const tpl = CHALLENGE_TEMPLATES.find(t => t.id === state.challenge.id);
  const card = document.getElementById('challengeCard');
  if (!tpl) { card.innerHTML = ''; return; }
  const pct = Math.min(100, (state.challenge.progress / tpl.target) * 100);
  card.innerHTML = `
    <div class="ctitle">${tpl.desc}</div>
    <div class="cdesc">${state.challenge.done ? 'Défi terminé — reviens demain pour un nouveau défi !' : 'Progression du jour'}</div>
    <div class="challenge-progress-track">
      <div class="challenge-progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="challenge-reward">${state.challenge.progress}/${tpl.target} — Récompense : ${formatMoney(tpl.reward)} ${state.challenge.done ? `<span class="pixel-icon inline-icon">${buildPixelIconSVG('check')}</span>` : ''}</div>
  `;
}

/* ---------------------- History ---------------------- */

function renderHistoryTab() {
  const grid = document.getElementById('historyGrid');
  if (!state.history.length) {
    grid.innerHTML = '<div class="history-empty">Aucun tirage pour l\'instant — lance la roulette !</div>';
    return;
  }
  grid.innerHTML = state.history.slice().reverse().map(n =>
    `<div class="history-entry ${colorOf(n)}">${n}</div>`
  ).join('');
}

/* ---------------------- Bank ---------------------- */

function renderBank() {
  const card = document.getElementById('bankCard');
  if (!card) return;
  const eligible = isLevelUpEligible();
  const remaining = Math.max(0, state.levelTarget - state.balance);
  const pct = Math.max(0, Math.min(100, (state.balance / state.levelTarget) * 100));

  card.innerHTML = `
    <div class="banker-portrait pixel-icon">${buildPixelIconSVG('banker')}</div>
    <div class="banker-speech ${eligible ? 'banker-speech--ready' : ''}">
      ${eligible
        ? `« Bien joué ! Tu as les ${formatMoney(state.levelTarget)} demandés. Valide pour passer niveau ${state.level + 1} — tu gardes tout ton solde. »`
        : `« Reviens me voir avec ${formatMoney(state.levelTarget)} en poche. Il te manque encore ${formatMoney(remaining)}. »`
      }
    </div>
    <div class="bank-progress-track">
      <div class="bank-progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="bank-progress-label">${formatMoney(state.balance)} / ${formatMoney(state.levelTarget)}</div>
    <button id="validateLevelBtn" class="duo-btn duo-btn--gold" type="button" ${eligible ? '' : 'disabled'}>Valider le niveau ${state.level + 1}</button>
  `;

  card.querySelector('#validateLevelBtn').addEventListener('click', performLevelUp);

  const bankTabBtn = document.querySelector('.tab-btn[data-tab="bank"]');
  if (bankTabBtn) bankTabBtn.classList.toggle('ready', eligible);
}

/* ---------------------- Shop ---------------------- */

function renderShop() {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  SHOP_ITEMS.forEach(item => {
    const owned = state.items[item.id] || 0;
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="item-icon pixel-icon">${buildPixelIconSVG(item.icon)}</div>
      <div><strong>${item.name}</strong></div>
      <div class="item-desc">${item.desc}</div>
      <div class="price">${formatMoney(item.price)}</div>
      <div class="owned-count">Possédés : ${owned}</div>
    `;
    const btn = document.createElement('button');
    btn.textContent = 'Acheter';
    btn.className = 'buy';
    btn.disabled = state.balance < item.price;
    btn.addEventListener('click', () => {
      if (state.balance < item.price) return;
      state.balance -= item.price;
      state.items[item.id] = (state.items[item.id] || 0) + 1;
      saveState();
      renderHeader();
      renderShop();
      renderItemBar();
      showToast(`${item.name} acheté !`);
    });
    card.appendChild(btn);
    grid.appendChild(card);
  });
}

/* ---------------------- Home screen ---------------------- */

function updateHomeStatus() {
  const el = document.getElementById('homeStatus');
  const text = document.getElementById('homeStatusText');
  text.textContent = `Niveau ${state.level} · ${formatMoney(state.balance)}`;
  el.classList.remove('hidden');
}

function goHome() {
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('homeScreen').classList.remove('hidden');
  updateHomeStatus();
}

function enterApp() {
  document.getElementById('homeScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  renderAll();
  showGameList();
}

document.getElementById('playSoloBtn').addEventListener('click', enterApp);
document.getElementById('playMultiBtn').addEventListener('click', () => {
  showToast('Le mode multijoueur arrive dans une prochaine mise à jour !');
});
document.getElementById('playModesBtn').addEventListener('click', () => {
  showToast('D\'autres modes de jeu arrivent bientôt !');
});
document.getElementById('homeBtn').addEventListener('click', goHome);

/* ---------------------- Settings ---------------------- */

function renderSoundToggle() {
  const btn = document.getElementById('soundToggleBtn');
  const icon = buildPixelIconSVG(state.muted ? 'soundOff' : 'soundOn');
  btn.innerHTML = `<span class="pixel-icon inline-icon">${icon}</span> ${state.muted ? 'Désactivé' : 'Activé'}`;
}

function openSettings() {
  document.getElementById('settingsLevel').textContent = state.level;
  document.getElementById('settingsBalance').textContent = formatMoney(state.balance);
  renderSoundToggle();
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

document.getElementById('settingsBtnHome').addEventListener('click', openSettings);
document.getElementById('settingsBtnApp').addEventListener('click', openSettings);
document.getElementById('settingsCloseX').addEventListener('click', closeSettings);

document.getElementById('soundToggleBtn').addEventListener('click', () => {
  state.muted = !state.muted;
  renderSoundToggle();
  saveState();
});

document.getElementById('resetProgressBtn').addEventListener('click', () => {
  const ok = confirm('Réinitialiser toute ta progression ? Cette action est irréversible.');
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

/* ---------------------- Click sounds (delegated) ---------------------- */

document.addEventListener('click', (e) => {
  const disabledBtn = e.target.closest('button:disabled');
  if (disabledBtn) return;
  const chipLike = e.target.closest('.chip-btn, .cell');
  if (chipLike) {
    playChip();
    return;
  }
  const clickable = e.target.closest('button, .game-card, .carousel-dot');
  if (clickable) playClick();
});

/* ---------------------- Init ---------------------- */

function renderAll() {
  renderHeader();
  renderGameList();
  renderBank();
  renderShop();
  renderChallenge();
  renderHistoryTab();
}

// Populates every static [data-icon] placeholder in the HTML (buttons, tab
// labels, modal icons…) with its pixel-art SVG. Elements built dynamically in
// JS (game cards, shop, bank…) call buildPixelIconSVG() directly instead.
function initPixelIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = buildPixelIconSVG(el.dataset.icon);
  });
}

// Continuous loop of falling pixel-art bills behind the home screen content.
// Negative animation-delay values start each bill mid-fall so the rain looks
// already in progress the instant the page loads, instead of every bill
// starting together at the top.
function initMoneyRain() {
  const container = document.getElementById('moneyRain');
  if (!container) return;
  const billSVG = buildPixelIconSVG('bill');
  const COUNT = 16;
  let html = '';
  for (let i = 0; i < COUNT; i++) {
    const size = 16 + Math.random() * 16;
    const left = Math.random() * 100;
    const duration = (6 + Math.random() * 7).toFixed(2);
    const delay = (-Math.random() * duration).toFixed(2);
    const rot = (Math.random() < 0.5 ? -1 : 1) * Math.round(180 + Math.random() * 360);
    html += `<div class="money-bill" style="left:${left}%;width:${size}px;--rot:${rot}deg;animation-duration:${duration}s;animation-delay:${delay}s;">${billSVG}</div>`;
  }
  container.innerHTML = html;
}

// Builds the light-green pixel-dither transition strip: a grid of tiny cells
// that pop in with a delay biased by row (bottom rows first) plus random
// jitter, so the fill looks like a scattered dissolve growing upward rather
// than a clean line sweep — but every cell is always created, so it always
// ends up fully covered, never leaving permanent gaps.
function initPixelTransition() {
  const container = document.getElementById('pixelTransition');
  if (!container) return;
  const COLS = 28;
  const ROWS = 9;
  const ROW_STEP_MS = 140;
  const JITTER_MS = 220;
  const SHADES = ['#8be6a8', '#6fdb95'];
  let html = '';
  for (let row = 0; row < ROWS; row++) {
    const rowFromBottom = ROWS - 1 - row;
    for (let col = 0; col < COLS; col++) {
      const delay = Math.round(rowFromBottom * ROW_STEP_MS + Math.random() * JITTER_MS);
      const shade = SHADES[Math.random() < 0.7 ? 0 : 1];
      html += `<div class="pixel-cell" style="left:${(col / COLS * 100).toFixed(3)}%;top:${(row / ROWS * 100).toFixed(3)}%;width:${(100 / COLS).toFixed(3)}%;height:${(100 / ROWS).toFixed(3)}%;background:${shade};animation-delay:${delay}ms;"></div>`;
    }
  }
  container.innerHTML = html;
}

initPixelIcons();
initMoneyRain();
initPixelTransition();
initCarousel();
updateHomeStatus();
