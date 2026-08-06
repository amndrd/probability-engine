/* ---------------------------------------------------------
   Flat icon set — simple geometric SVG glyphs (24×24 viewBox),
   replacing the old pixel-grid icon system. Each entry is the
   icon's inner SVG markup; buildIconSVG() wraps it. Most icons
   are single-tone (fill: currentColor, so they inherit whatever
   color the surrounding element sets) — a few use a couple of
   hardcoded accent hex values where a splash of color helps
   recognizability (card suits' red, chips' gold, dice pips...).
   --------------------------------------------------------- */

const INK = '#12261D';
const GOLD = '#D9A73B';
const GOLD_DARK = '#A87A1E';
const RUBY = '#C43B4E';
const CREAM = '#FBF6EA';
const BLUE = '#2E7DD1';
const GOOD = '#1FA463';

const ICONS = {
  /* ---- UI glyphs ---- */
  gear: `
    <g stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <line x1="4" y1="7" x2="20" y2="7"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="17" x2="20" y2="17"/>
    </g>
    <circle cx="9" cy="7" r="2.1" fill="currentColor"/>
    <circle cx="16" cy="12" r="2.1" fill="currentColor"/>
    <circle cx="11" cy="17" r="2.1" fill="currentColor"/>`,

  home: `<path d="M12 3 L21 10.5 V21 H14.5 V14 H9.5 V21 H3 V10.5 Z" fill="currentColor"/>`,

  trophy: `
    <path d="M7 3H17V9C17 12.3 14.8 14.6 12 14.6C9.2 14.6 7 12.3 7 9V3Z" fill="currentColor"/>
    <path d="M7 4.2H4.3V7C4.3 9 5.6 10.4 7 10.7" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <path d="M17 4.2H19.7V7C19.7 9 18.4 10.4 17 10.7" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <rect x="10.2" y="14.6" width="3.6" height="3.4" fill="currentColor"/>
    <rect x="6.6" y="18.6" width="10.8" height="2.4" rx="1.2" fill="currentColor"/>`,

  moneybag: `
    <path d="M12 3 L9.2 7.2 A7 7 0 1 0 14.8 7.2 Z" fill="currentColor"/>
    <text x="12" y="16.5" font-size="7" font-family="Inter, sans-serif" font-weight="700" text-anchor="middle" fill="${CREAM}">$</text>`,

  people: `
    <circle cx="8.5" cy="8" r="3.1" fill="currentColor"/>
    <circle cx="16" cy="9.2" r="2.5" fill="currentColor" opacity="0.6"/>
    <path d="M2.5 20.5C2.5 16.4 5.2 13.8 8.5 13.8C11.8 13.8 14.5 16.4 14.5 20.5Z" fill="currentColor"/>
    <path d="M14 20.5C14.2 17.3 16 15 18.4 15C20.8 15 22.5 17.1 22.5 20.5Z" fill="currentColor" opacity="0.6"/>`,

  modes: `
    <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor"/>
    <rect x="13" y="3" width="8" height="8" rx="2" fill="${BLUE}"/>
    <rect x="3" y="13" width="8" height="8" rx="2" fill="${BLUE}"/>
    <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor"/>`,

  bag: `
    <path d="M6.5 8H17.5L18.6 21H5.4Z" fill="currentColor"/>
    <path d="M9 8V6.5C9 4.6 10.3 3 12 3C13.7 3 15 4.6 15 6.5V8" fill="none" stroke="currentColor" stroke-width="1.8"/>`,

  target: `
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="12" cy="12" r="1.8" fill="currentColor"/>`,

  clock: `
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M12 7V12L15.5 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,

  bank: `
    <path d="M12 2.5 L21.5 8H2.5Z" fill="currentColor"/>
    <rect x="4" y="9.5" width="2.4" height="9" fill="currentColor"/>
    <rect x="10.8" y="9.5" width="2.4" height="9" fill="currentColor"/>
    <rect x="17.6" y="9.5" width="2.4" height="9" fill="currentColor"/>
    <rect x="2.5" y="19.5" width="19" height="2.2" fill="currentColor"/>`,

  controller: `
    <path d="M6 8H18C20 8 21.5 10 21 12.5L20 17.5C19.7 19 18 19.6 17 18.5L14.5 15.8H9.5L7 18.5C6 19.6 4.3 19 4 17.5L3 12.5C2.5 10 4 8 6 8Z" fill="currentColor"/>
    <rect x="6.4" y="11" width="4" height="1.6" rx="0.6" fill="${CREAM}"/>
    <rect x="7.6" y="9.8" width="1.6" height="4" rx="0.6" fill="${CREAM}"/>
    <circle cx="16" cy="11" r="1" fill="${CREAM}"/>
    <circle cx="18" cy="13" r="1" fill="${CREAM}"/>`,

  closeX: `
    <g stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
      <line x1="5" y1="5" x2="19" y2="19"/>
      <line x1="19" y1="5" x2="5" y2="19"/>
    </g>`,

  soundOn: `
    <path d="M4 9.5H7.5L12 6V18L7.5 14.5H4Z" fill="currentColor"/>
    <path d="M15.5 8.5C17 9.7 17 14.3 15.5 15.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M17.7 6.3C20.3 8.5 20.3 15.5 17.7 17.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.6"/>`,

  soundOff: `
    <path d="M4 9.5H7.5L12 6V18L7.5 14.5H4Z" fill="currentColor"/>
    <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <line x1="16" y1="9.5" x2="21" y2="14.5"/>
      <line x1="21" y1="9.5" x2="16" y2="14.5"/>
    </g>`,

  check: `<path d="M4 12.5L9.5 18L20 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,

  bill: `
    <rect x="1.5" y="5" width="21" height="12" rx="2" fill="${GOOD}"/>
    <circle cx="12" cy="11" r="3.4" fill="none" stroke="#c8f5d6" stroke-width="1.4"/>`,

  ticket: `
    <path d="M2.5 8C2.5 6.6 3.6 5.5 5 5.5H19C20.4 5.5 21.5 6.6 21.5 8V9.5A2 2 0 0 0 21.5 13.5V15C21.5 16.4 20.4 17.5 19 17.5H5C3.6 17.5 2.5 16.4 2.5 15V13.5A2 2 0 0 0 2.5 9.5Z" fill="currentColor"/>
    <line x1="14.5" y1="6.5" x2="14.5" y2="16.5" stroke="${CREAM}" stroke-width="1.4" stroke-dasharray="2 2"/>`,

  lock: `
    <rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor"/>
    <path d="M8 10.5V7.5C8 5 9.8 3.2 12 3.2C14.2 3.2 16 5 16 7.5V10.5" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="12" cy="15" r="1.8" fill="${CREAM}"/>`,

  banker: `
    <circle cx="12" cy="8" r="4" fill="#E8B382"/>
    <path d="M6.5 8C6.5 5 9 3 12 3C15 3 17.5 5 17.5 8H6.5Z" fill="${INK}"/>
    <path d="M4 22C4 16.8 7.6 13.5 12 13.5C16.4 13.5 20 16.8 20 22Z" fill="${RUBY}"/>
    <rect x="10.5" y="13.5" width="3" height="3" fill="${GOLD}"/>`,

  /* ---- Card suits (decorative, single-tone via currentColor) ---- */
  'suit-diamond': `<path d="M12 2 L19 12 L12 22 L5 12 Z" fill="currentColor"/>`,
  'suit-heart': `<path d="M12 20 C4 14 2 9.5 5.2 6.5C7.3 4.6 10.2 5.2 12 7.8C13.8 5.2 16.7 4.6 18.8 6.5C22 9.5 20 14 12 20Z" fill="currentColor"/>`,
  'suit-spade': `<path d="M12 2C16 6.5 20 9.8 20 13.5C20 16.2 18 18 15.7 18C14.4 18 13.3 17.4 12.6 16.5C12.9 18.6 13.8 20.2 15.5 21.3H8.5C10.2 20.2 11.1 18.6 11.4 16.5C10.7 17.4 9.6 18 8.3 18C6 18 4 16.2 4 13.5C4 9.8 8 6.5 12 2Z" fill="currentColor"/>`,
  'suit-club': `
    <circle cx="12" cy="8" r="3.6" fill="currentColor"/>
    <circle cx="7.2" cy="13" r="3.6" fill="currentColor"/>
    <circle cx="16.8" cy="13" r="3.6" fill="currentColor"/>
    <path d="M10.6 14.5H13.4L14.6 21.3H9.4Z" fill="currentColor"/>`,

  /* ---- Game icons ---- */
  roulette: `
    <circle cx="12" cy="12" r="9.5" fill="${INK}"/>
    <path d="M12 12 L12 2.5 A9.5 9.5 0 0 1 20.7 8.2 Z" fill="${RUBY}"/>
    <path d="M12 12 L20.7 8.2 A9.5 9.5 0 0 1 20.7 15.8 Z" fill="${INK}"/>
    <path d="M12 12 L20.7 15.8 A9.5 9.5 0 0 1 12 21.5 Z" fill="${RUBY}"/>
    <path d="M12 12 L12 21.5 A9.5 9.5 0 0 1 3.3 15.8 Z" fill="${INK}"/>
    <path d="M12 12 L3.3 15.8 A9.5 9.5 0 0 1 3.3 8.2 Z" fill="${RUBY}"/>
    <path d="M12 12 L3.3 8.2 A9.5 9.5 0 0 1 12 2.5 Z" fill="${INK}"/>
    <circle cx="12" cy="12" r="3" fill="${GOLD}"/>`,

  blackjack: `
    <rect x="3" y="4" width="12" height="16" rx="2" fill="${CREAM}" stroke="currentColor" stroke-width="1.6" transform="rotate(-8 9 12)"/>
    <rect x="8" y="4.5" width="12" height="16" rx="2" fill="currentColor"/>
    <circle cx="14" cy="12.5" r="3.4" fill="${RUBY}"/>`,

  slots: `
    <rect x="3" y="5" width="18" height="14" rx="2.5" fill="currentColor"/>
    <rect x="5.3" y="7.3" width="4.2" height="6" rx="1" fill="${CREAM}"/>
    <rect x="9.9" y="7.3" width="4.2" height="6" rx="1" fill="${CREAM}"/>
    <rect x="14.5" y="7.3" width="4.2" height="6" rx="1" fill="${CREAM}"/>
    <rect x="5.3" y="15.2" width="13.4" height="1.8" rx="0.9" fill="${GOLD}"/>`,

  baccarat: `
    <rect x="4" y="3" width="16" height="18" rx="2" fill="${CREAM}" stroke="currentColor" stroke-width="1.6"/>
    <text x="12" y="16" font-size="10" font-family="Fraunces, serif" font-weight="700" text-anchor="middle" fill="${RUBY}">9</text>`,

  poker: `
    <circle cx="12" cy="12" r="9.5" fill="${RUBY}"/>
    <circle cx="12" cy="12" r="9.5" fill="none" stroke="${CREAM}" stroke-width="2.4" stroke-dasharray="3.2 3.4"/>
    <circle cx="12" cy="12" r="4.5" fill="${CREAM}"/>`,

  craps: `
    <rect x="2.5" y="9" width="9" height="9" rx="2" fill="${CREAM}" stroke="currentColor" stroke-width="1.4" transform="rotate(-10 7 13.5)"/>
    <rect x="11.5" y="6" width="10" height="10" rx="2" fill="currentColor"/>
    <circle cx="14.3" cy="8.8" r="1" fill="${CREAM}"/>
    <circle cx="18.7" cy="8.8" r="1" fill="${CREAM}"/>
    <circle cx="14.3" cy="13.2" r="1" fill="${CREAM}"/>
    <circle cx="18.7" cy="13.2" r="1" fill="${CREAM}"/>
    <circle cx="16.5" cy="11" r="1" fill="${CREAM}"/>`,

  moneywheel: `
    <circle cx="12" cy="12" r="9.5" fill="${GOLD}"/>
    <path d="M12 12 L12 2.5 A9.5 9.5 0 0 1 19.2 6.3 Z" fill="${RUBY}"/>
    <path d="M12 12 L19.2 6.3 A9.5 9.5 0 0 1 19.2 17.7 Z" fill="${GOLD_DARK}"/>
    <path d="M12 12 L19.2 17.7 A9.5 9.5 0 0 1 12 21.5 Z" fill="${RUBY}"/>
    <path d="M12 12 L12 21.5 A9.5 9.5 0 0 1 4.8 17.7 Z" fill="${GOLD_DARK}"/>
    <path d="M12 12 L4.8 17.7 A9.5 9.5 0 0 1 4.8 6.3 Z" fill="${RUBY}"/>
    <path d="M12 12 L4.8 6.3 A9.5 9.5 0 0 1 12 2.5 Z" fill="${GOLD_DARK}"/>
    <path d="M12 0.5 L14 4 H10 Z" fill="currentColor"/>`,

  wheeloffortune: `
    <circle cx="12" cy="12" r="9.5" fill="${BLUE}"/>
    <path d="M12 12 L12 2.5 A9.5 9.5 0 0 1 20.7 8.2 Z" fill="${CREAM}"/>
    <path d="M12 12 L20.7 15.8 A9.5 9.5 0 0 1 12 21.5 Z" fill="${CREAM}"/>
    <path d="M12 12 L3.3 8.2 A9.5 9.5 0 0 1 3.3 15.8 Z" fill="${CREAM}"/>
    <circle cx="12" cy="12" r="2.4" fill="${GOLD}"/>`,

  /* ---- Item icons ---- */
  chanceX3: `
    <rect x="4" y="4" width="16" height="16" rx="4" fill="${RUBY}"/>
    <text x="12" y="16.5" font-size="9" font-family="Inter, sans-serif" font-weight="800" text-anchor="middle" fill="${CREAM}">×3</text>`,

  angelsReel: `
    <path d="M12 6C9 4 4 4.5 2 7.5C5 8 8 9.6 10 12C8.4 12.3 6.4 13.2 5 14.5C8 14.6 10.4 15.6 12 17.5C13.6 15.6 16 14.6 19 14.5C17.6 13.2 15.6 12.3 14 12C16 9.6 19 8 22 7.5C20 4.5 15 4 12 6Z" fill="${GOLD}"/>`,

  devilsReel: `
    <path d="M4 9C4 6 6.5 4 9 5.5C10 3.5 14 3.5 15 5.5C17.5 4 20 6 20 9C20 11 18.5 12 17 11.3C17.6 13.6 16.5 16 12 16C7.5 16 6.4 13.6 7 11.3C5.5 12 4 11 4 9Z" fill="${RUBY}"/>`,

  goldenChip: `
    <circle cx="12" cy="12" r="9.5" fill="${GOLD}"/>
    <circle cx="12" cy="12" r="9.5" fill="none" stroke="${CREAM}" stroke-width="2.4" stroke-dasharray="3.2 3.4"/>
    <circle cx="12" cy="12" r="4.5" fill="${CREAM}"/>
    <text x="12" y="15" font-size="5.5" font-family="Inter, sans-serif" font-weight="800" text-anchor="middle" fill="${GOLD_DARK}">$</text>`,

  taser: `<path d="M13 2 L4 14H10.5L9 22L20 9H13Z" fill="${GOLD}"/>`,

  mysteryBox: `
    <rect x="3" y="9" width="18" height="12" rx="1.5" fill="${GOLD_DARK}"/>
    <rect x="3" y="9" width="18" height="4" fill="${GOLD}"/>
    <rect x="2.3" y="5.5" width="19.4" height="4" rx="1.5" fill="${RUBY}"/>
    <rect x="11" y="5.5" width="2" height="15.5" fill="${RUBY}"/>`,

  timeMachine: `
    <path d="M6 3H18V6.5C18 9 16 10.8 14 12C16 13.2 18 15 18 17.5V21H6V17.5C6 15 8 13.2 10 12C8 10.8 6 9 6 6.5Z" fill="${GOLD}"/>
    <path d="M8 5H16C15.7 7.3 14.2 8.8 12 10C9.8 8.8 8.3 7.3 8 5Z" fill="${CREAM}"/>`,

  holyStatue: `
    <rect x="9.5" y="2.5" width="5" height="3" fill="${CREAM}"/>
    <rect x="7" y="6" width="10" height="10.5" fill="${CREAM}"/>
    <rect x="5" y="17" width="14" height="4" fill="${CREAM}"/>
    <rect x="8.2" y="6" width="1.6" height="10.5" fill="${GOLD}" opacity="0.6"/>
    <rect x="11.2" y="6" width="1.6" height="10.5" fill="${GOLD}" opacity="0.6"/>
    <rect x="14.2" y="6" width="1.6" height="10.5" fill="${GOLD}" opacity="0.6"/>`,

  insurance: `<path d="M12 2.5 L20 5.5V11C20 16 16.9 19.7 12 21.5C7.1 19.7 4 16 4 11V5.5Z" fill="${BLUE}"/><path d="M8.5 12L11 14.5L15.5 9.5" fill="none" stroke="${CREAM}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,

  gamblersConfidence: `<path d="M12 2.5L14.9 9L22 9.8L16.8 14.5L18.2 21.5L12 18L5.8 21.5L7.2 14.5L2 9.8L9.1 9Z" fill="${GOLD}"/>`,

  bonusDraw: `
    <path d="M2.5 8C2.5 6.6 3.6 5.5 5 5.5H16C17.4 5.5 18.5 6.6 18.5 8V9.5A2 2 0 0 0 18.5 13.5V15C18.5 16.4 17.4 17.5 16 17.5H5C3.6 17.5 2.5 16.4 2.5 15V13.5A2 2 0 0 0 2.5 9.5Z" fill="currentColor"/>
    <line x1="12.5" y1="6.5" x2="12.5" y2="16.5" stroke="${CREAM}" stroke-width="1.4" stroke-dasharray="2 2"/>
    <g stroke="${GOLD}" stroke-width="2" stroke-linecap="round">
      <line x1="19" y1="15" x2="19" y2="21"/>
      <line x1="16" y1="18" x2="22" y2="18"/>
    </g>`,

  /* ---- Slot symbols ---- */
  eye: `
    <path d="M2 12C4.5 7 8 4.5 12 4.5C16 4.5 19.5 7 22 12C19.5 17 16 19.5 12 19.5C8 19.5 4.5 17 2 12Z" fill="${BLUE}"/>
    <circle cx="12" cy="12" r="3.6" fill="${INK}"/>`,

  ankh: `
    <circle cx="12" cy="6.6" r="4" fill="none" stroke="${GOLD}" stroke-width="2.6"/>
    <rect x="10.7" y="9.6" width="2.6" height="11.5" fill="${GOLD}"/>
    <rect x="6" y="13" width="12" height="2.6" fill="${GOLD}"/>`,

  scarab: `
    <ellipse cx="12" cy="14.5" rx="7" ry="6.2" fill="${GOOD}"/>
    <circle cx="12" cy="6.8" r="3" fill="${GOOD}"/>
    <line x1="12" y1="8.3" x2="12" y2="20" stroke="${INK}" stroke-width="1.4"/>`,

  lotus: `
    <ellipse cx="7.6" cy="15.6" rx="3" ry="6.4" fill="${RUBY}" transform="rotate(-28 7.6 15.6)"/>
    <ellipse cx="16.4" cy="15.6" rx="3" ry="6.4" fill="${RUBY}" transform="rotate(28 16.4 15.6)"/>
    <ellipse cx="12" cy="14.5" rx="3" ry="6.8" fill="${RUBY}"/>
    <circle cx="12" cy="19" r="2.3" fill="${GOLD}"/>`,

  crash: `
    <path d="M12 1.5C15.2 4.8 16.5 9 16.2 13.2H7.8C7.5 9 8.8 4.8 12 1.5Z" fill="${RUBY}"/>
    <circle cx="12" cy="8.6" r="1.9" fill="${CREAM}"/>
    <path d="M7.8 11.5L4.5 16.5H7.8Z" fill="${GOLD}"/>
    <path d="M16.2 11.5L19.5 16.5H16.2Z" fill="${GOLD}"/>
    <path d="M9.3 13.2H14.7L12 21.5Z" fill="${GOLD}"/>`,

  /* ---- Phase 5 game icons ---- */
  dragontower: `
    <path d="M12 2 L15.5 6.5H8.5Z" fill="${GOLD}"/>
    <circle cx="12" cy="4.3" r="1" fill="${RUBY}"/>
    <rect x="8" y="6.5" width="8" height="3" fill="${GOLD_DARK}"/>
    <rect x="6" y="9.5" width="12" height="3" fill="${GOLD}"/>
    <rect x="4" y="12.5" width="16" height="3" fill="${GOLD_DARK}"/>
    <rect x="2" y="15.5" width="20" height="6" fill="${GOLD}"/>`,

  minesweeper: `
    <rect x="2" y="2" width="20" height="20" rx="3" fill="${INK}"/>
    <g stroke="${CREAM}" stroke-width="1" opacity="0.5">
      <line x1="9.3" y1="2" x2="9.3" y2="22"/>
      <line x1="14.7" y1="2" x2="14.7" y2="22"/>
      <line x1="2" y1="9.3" x2="22" y2="9.3"/>
      <line x1="2" y1="14.7" x2="22" y2="14.7"/>
    </g>
    <circle cx="17" cy="17" r="2.6" fill="${RUBY}"/>`,

  plinko: `
    <g fill="currentColor">
      <circle cx="12" cy="4" r="1.4"/>
      <circle cx="8" cy="9" r="1.4"/><circle cx="16" cy="9" r="1.4"/>
      <circle cx="4" cy="14" r="1.4"/><circle cx="12" cy="14" r="1.4"/><circle cx="20" cy="14" r="1.4"/>
    </g>
    <rect x="2" y="18" width="4" height="4" fill="${RUBY}"/>
    <rect x="7" y="18" width="4" height="4" fill="${GOLD}"/>
    <rect x="13" y="18" width="4" height="4" fill="${GOOD}"/>
    <rect x="18" y="18" width="4" height="4" fill="${GOLD}"/>`,

  keno: `
    <rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor"/>
    <g fill="${CREAM}">
      <circle cx="7" cy="9" r="1.6"/><circle cx="12" cy="9" r="1.6"/><circle cx="17" cy="9" r="1.6"/>
      <circle cx="7" cy="15" r="1.6"/><circle cx="17" cy="15" r="1.6"/>
    </g>
    <circle cx="12" cy="15" r="1.6" fill="${GOLD}"/>`,

  penguincross: `
    <ellipse cx="12" cy="13" rx="6" ry="8" fill="${INK}"/>
    <ellipse cx="12" cy="14.5" rx="3.2" ry="6" fill="${CREAM}"/>
    <circle cx="12" cy="7" r="3.6" fill="${INK}"/>
    <path d="M12 7.3 L15.3 8.2 L12 9.1Z" fill="${GOLD}"/>
    <ellipse cx="7.5" cy="20.3" rx="1.8" ry="0.9" fill="${GOLD}"/>
    <ellipse cx="16.5" cy="20.3" rx="1.8" ry="0.9" fill="${GOLD}"/>`,

  hilo: `
    <path d="M12 2 L17 8.5H7Z" fill="${GOOD}"/>
    <path d="M12 22 L7 15.5H17Z" fill="${RUBY}"/>`,

  /* ---- In-game symbols (Dragon Tower, Mine Sweeper) ---- */
  gem: `
    <path d="M7 4H17L21 9L12 21L3 9Z" fill="${BLUE}"/>
    <path d="M7 4H17L21 9H3Z" fill="${CREAM}" opacity="0.35"/>`,

  mine: `
    <circle cx="12" cy="13" r="7" fill="${INK}"/>
    <line x1="12" y1="3" x2="12" y2="6.5" stroke="${INK}" stroke-width="2"/>
    <circle cx="12" cy="3" r="1.6" fill="${RUBY}"/>
    <circle cx="9" cy="10.5" r="1.3" fill="${CREAM}" opacity="0.5"/>`,

  dragonEye: `
    <path d="M2 12C5 6 9 3.5 12 3.5C15 3.5 19 6 22 12C19 18 15 20.5 12 20.5C9 20.5 5 18 2 12Z" fill="${RUBY}"/>
    <circle cx="12" cy="12" r="4" fill="${INK}"/>
    <circle cx="12" cy="12" r="1.6" fill="${GOLD}"/>`,
};

export const CARD_SUITS = ['suit-diamond', 'suit-club', 'suit-spade', 'suit-heart'];

export function buildIconSVG(name) {
  const markup = ICONS[name];
  if (!markup) return '';
  return `<svg viewBox="0 0 24 24" width="100%" height="100%">${markup}</svg>`;
}
