/* ============================================================
   TypeForge — script.js
   Clean, organized, beginner-friendly Vanilla JS
   ============================================================ */

'use strict';

/* ---- QUOTE BANK ---- */
const QUOTES = {
  easy: [
    "The sun rises in the east and sets in the west each day.",
    "A good book is the best friend you can ever have in life.",
    "Dogs are loyal pets that love their owners very much.",
    "The sky is blue and the grass is green on a sunny day.",
    "Simple words can carry the weight of the entire world.",
    "Kindness costs nothing but means everything to someone.",
    "Every journey begins with a single small step forward.",
    "Fresh air and clean water are gifts we must not waste.",
    "Music can lift your mood when you are feeling sad.",
    "Learning to type fast is a very useful skill to have.",
  ],
  medium: [
    "The quick brown fox jumps over the lazy dog near the riverbank.",
    "Programming is the art of telling a computer what you want it to do.",
    "Consistency and dedication are the keys to mastering any new skill.",
    "A curious mind that never stops asking questions will go far in life.",
    "The best way to predict the future is to create it yourself.",
    "Technology is best when it brings people together across all boundaries.",
    "Reading expands your vocabulary and sharpens your ability to think clearly.",
    "Practice makes perfect, but only if you practice the right things each day.",
    "Success is not final and failure is not fatal — it is the courage to continue.",
    "The measure of intelligence is the ability to change when circumstances demand it.",
  ],
  hard: [
    "Cryptography ensures that digital communications remain private and tamper-proof against adversaries.",
    "Polymorphism in object-oriented programming allows methods to operate on objects of various types seamlessly.",
    "The Byzantine Generals Problem illustrates the challenge of achieving consensus in distributed systems with faulty nodes.",
    "Quantum entanglement suggests that two particles can instantaneously influence each other regardless of the distance separating them.",
    "Neuroplasticity demonstrates that the brain can reorganize itself by forming new neural connections throughout an individual's lifetime.",
    "Epigenetics studies heritable changes in gene expression that do not involve alterations to the underlying DNA sequence itself.",
    "Asymptotic analysis provides a method for describing the efficiency of algorithms as the input size approaches infinity.",
    "The Heisenberg uncertainty principle states that the more precisely the position of a particle is known, the less precisely its momentum can be determined.",
    "Idiosyncratic investment strategies that deviate significantly from benchmarks can generate alpha but also expose portfolios to substantial tracking error.",
    "Recursive functions call themselves with a modified argument until a base case is reached, unwinding the call stack thereafter.",
  ],
};

/* ---- KEYBOARD LAYOUT ---- */
const KB_ROWS = [
  ['`','1','2','3','4','5','6','7','8','9','0','-','='],
  ['q','w','e','r','t','y','u','i','o','p','[',']','\\'],
  ['a','s','d','f','g','h','j','k','l',';',"'"],
  ['z','x','c','v','b','n','m',',','.','/'],
  [' '],
];
const WIDE_KEYS  = new Set(['`','\\']);
const WIDER_KEYS = new Set(['tab','caps','shift','enter','backspace']);
const SPACE_KEY  = ' ';

/* ---- STATE ---- */
const state = {
  currentText:    '',
  typedChars:     [],       // array of {char, status: 'correct'|'incorrect'|'pending'}
  currentIndex:   0,
  totalTyped:     0,
  correctCount:   0,
  incorrectCount: 0,

  timerDuration:  30,       // chosen duration in seconds
  timeLeft:       30,
  timerInterval:  null,
  started:        false,
  finished:       false,

  difficulty:     'easy',
  soundEnabled:   false,

  keyPresses:     {},       // { 'a': 4, 'b': 1 ... }
};

/* ---- DOM REFS ---- */
const $ = id => document.getElementById(id);
const dom = {
  textDisplay:   $('textDisplay'),
  typingInput:   $('typingInput'),
  focusOverlay:  $('focusOverlay'),
  statusDot:     $('statusDot'),
  statusText:    $('statusText'),
  timerDisplay:  $('timerDisplay'),
  timerRing:     $('timerRing'),
  progressFill:  $('progressFill'),
  liveWpm:       $('liveWpm'),
  liveAcc:       $('liveAcc'),
  liveCpm:       $('liveCpm'),
  liveCorrect:   $('liveCorrect'),
  liveWrong:     $('liveWrong'),
  wpmBarFill:    $('wpmBarFill'),
  accBarFill:    $('accBarFill'),
  restartBtn:    $('restartBtn'),
  refreshQuote:  $('refreshQuote'),
  soundToggle:   $('soundToggle'),
  soundIcon:     $('soundIcon'),
  themeToggle:   $('themeToggle'),
  resultsModal:  $('resultsModal'),
  modalRestart:  $('modalRestart'),
  modalClose:    $('modalClose'),
  resultWpm:     $('resultWpm'),
  resultAcc:     $('resultAcc'),
  resultCpm:     $('resultCpm'),
  resultCorrect: $('resultCorrect'),
  resultWrong:   $('resultWrong'),
  resultTime:    $('resultTime'),
  resultSubtitle:$('resultSubtitle'),
  performanceBadge:$('performanceBadge'),
  badgeIcon:     $('badgeIcon'),
  badgeText:     $('badgeText'),
  newBest:       $('newBest'),
  bestWpm:       $('bestWpm'),
  bestAcc:       $('bestAcc'),
  keyboard:      $('keyboard'),
};

/* ---- AUDIO CONTEXT ---- */
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playClick(isError = false) {
  if (!state.soundEnabled) return;
  try {
    const ctx  = getAudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type      = isError ? 'square' : 'sine';
    osc.frequency.setValueAtTime(isError ? 180 : 600, ctx.currentTime);
    gain.gain.setValueAtTime(.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + (isError ? .12 : .06));
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (isError ? .12 : .06));
  } catch (_) { /* ignore */ }
}

/* ---- UTILITIES ---- */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function calcWPM(correctChars, elapsedSeconds) {
  if (elapsedSeconds < 1) return 0;
  return Math.round((correctChars / 5) / (elapsedSeconds / 60));
}

function calcCPM(correctChars, elapsedSeconds) {
  if (elapsedSeconds < 1) return 0;
  return Math.round(correctChars / (elapsedSeconds / 60));
}

function calcAccuracy(correct, total) {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

/* ---- KEYBOARD HEATMAP ---- */
function buildKeyboard() {
  dom.keyboard.innerHTML = '';
  KB_ROWS.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    row.forEach(key => {
      const keyEl = document.createElement('div');
      keyEl.className = 'kb-key';
      if (key === SPACE_KEY)    keyEl.classList.add('space');
      else if (WIDE_KEYS.has(key)) keyEl.classList.add('wide');
      keyEl.textContent = key === SPACE_KEY ? 'space' : key;
      keyEl.dataset.key = key;
      rowEl.appendChild(keyEl);
    });
    dom.keyboard.appendChild(rowEl);
  });
}

function updateHeatmap() {
  const presses   = state.keyPresses;
  const maxPresses = Math.max(1, ...Object.values(presses));

  document.querySelectorAll('.kb-key').forEach(el => {
    const key = el.dataset.key;
    const count = presses[key] || 0;
    if (count === 0) { el.removeAttribute('data-heat'); return; }
    const ratio = count / maxPresses;
    const heat  = ratio > .8 ? 5 : ratio > .6 ? 4 : ratio > .4 ? 3 : ratio > .2 ? 2 : 1;
    el.dataset.heat = heat;
  });
}

/* ---- TEXT RENDERING ---- */
function renderText() {
  dom.textDisplay.innerHTML = '';
  state.typedChars.forEach((charObj, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    // Render space as visible
    span.textContent = charObj.char === ' ' ? '\u00A0' : charObj.char;

    if      (i < state.currentIndex)  span.classList.add(charObj.status);
    else if (i === state.currentIndex) span.classList.add('current');

    dom.textDisplay.appendChild(span);
  });

  // Scroll cursor into view
  const cursorEl = dom.textDisplay.querySelector('.char.current');
  if (cursorEl) {
    cursorEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/* ---- LOAD TEXT ---- */
function loadText(newQuote = false) {
  const pool = QUOTES[state.difficulty];
  state.currentText = pickRandom(pool);

  // Build typed chars array
  state.typedChars = state.currentText.split('').map(c => ({ char: c, status: 'pending' }));
  state.currentIndex   = 0;
  state.totalTyped     = 0;
  state.correctCount   = 0;
  state.incorrectCount = 0;

  renderText();
  updateProgressBar();
}

/* ---- TIMER ---- */
const RING_CIRC = 2 * Math.PI * 35; // 220

function updateTimerRing() {
  const ratio  = state.timeLeft / state.timerDuration;
  const offset = RING_CIRC * (1 - ratio);
  dom.timerRing.style.strokeDashoffset = offset;

  // Colour urgency
  if (ratio <= .25)       dom.timerRing.style.stroke = 'var(--red)';
  else if (ratio <= .5)   dom.timerRing.style.stroke = 'var(--accent)';
  else                    dom.timerRing.style.stroke = 'var(--accent)';
}

function startTimer() {
  if (state.timerInterval) return;
  state.timerInterval = setInterval(() => {
    state.timeLeft -= 1;
    dom.timerDisplay.textContent = state.timeLeft;
    updateTimerRing();

    // Urgent status
    if (state.timeLeft <= 5) {
      setStatus('warning', `⚡ ${state.timeLeft} seconds left!`);
    }

    if (state.timeLeft <= 0) finishTest();
  }, 1000);
}

function resetTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  state.timeLeft = state.timerDuration;
  dom.timerDisplay.textContent = state.timeLeft;
  dom.timerRing.style.strokeDashoffset = 0;
  dom.timerRing.style.stroke = 'var(--accent)';
}

/* ---- STATUS ---- */
function setStatus(type, text) {
  // type: 'idle' | 'active' | 'finished' | 'warning'
  dom.statusDot.className = `status-dot ${type}`;
  dom.statusText.textContent = text;
}

/* ---- STATS UPDATE ---- */
function updateStats() {
  const elapsed = state.timerDuration - state.timeLeft;
  const wpm     = calcWPM(state.correctCount, elapsed);
  const cpm     = calcCPM(state.correctCount, elapsed);
  const acc     = calcAccuracy(state.correctCount, state.totalTyped);

  dom.liveWpm.textContent      = wpm;
  dom.liveCpm.textContent      = cpm;
  dom.liveAcc.innerHTML        = `${acc}<span class="stat-unit">%</span>`;
  dom.liveCorrect.textContent  = state.correctCount;
  dom.liveWrong.textContent    = state.incorrectCount;

  // Bars — cap WPM at 150 for visual
  dom.wpmBarFill.style.width   = `${clamp((wpm / 150) * 100, 0, 100)}%`;
  dom.accBarFill.style.width   = `${acc}%`;
}

/* ---- PROGRESS BAR ---- */
function updateProgressBar() {
  const ratio = state.currentIndex / state.typedChars.length;
  dom.progressFill.style.width = `${ratio * 100}%`;
}

/* ---- HANDLE INPUT ---- */
function handleInput(e) {
  if (state.finished) return;

  const inputVal = dom.typingInput.value;

  // Start timer on first keystroke
  if (!state.started && inputVal.length > 0) {
    state.started = true;
    startTimer();
    setStatus('active', 'Typing… keep going!');
  }

  // Clear input — we manage everything via currentIndex
  dom.typingInput.value = '';

  // Get the last character typed (we always reset to empty)
  const key = e.data || null;
  if (!key) return; // ignore non-character inputs (handled by keydown for backspace)

  if (state.currentIndex >= state.typedChars.length) return;

  const expected = state.typedChars[state.currentIndex].char;
  const isCorrect = key === expected;

  state.typedChars[state.currentIndex].status = isCorrect ? 'correct' : 'incorrect';
  state.currentIndex++;
  state.totalTyped++;
  if (isCorrect) state.correctCount++;
  else           state.incorrectCount++;

  // Track key for heatmap
  const lk = key.toLowerCase();
  state.keyPresses[lk] = (state.keyPresses[lk] || 0) + 1;
  updateHeatmap();

  playClick(!isCorrect);
  renderText();
  updateStats();
  updateProgressBar();

  // Auto-complete if text finished
  if (state.currentIndex >= state.typedChars.length) {
    finishTest();
  }
}

function handleKeyDown(e) {
  if (state.finished) return;

  // Backspace
  if (e.key === 'Backspace' && state.currentIndex > 0) {
    e.preventDefault();
    state.currentIndex--;
    state.totalTyped = Math.max(0, state.totalTyped - 1);
    const prev = state.typedChars[state.currentIndex];
    if (prev.status === 'correct')   state.correctCount   = Math.max(0, state.correctCount - 1);
    if (prev.status === 'incorrect') state.incorrectCount = Math.max(0, state.incorrectCount - 1);
    prev.status = 'pending';
    renderText();
    updateStats();
    updateProgressBar();
    return;
  }

  // Tab — restart
  if (e.key === 'Tab') {
    e.preventDefault();
    restartTest();
  }

  // Escape — restart
  if (e.key === 'Escape') {
    e.preventDefault();
    restartTest();
  }
}

/* ---- FOCUS MANAGEMENT ---- */
function focusInput() {
  dom.typingInput.focus({ preventScroll: true });
  dom.focusOverlay.classList.add('hidden');
  dom.textDisplay.classList.remove('blurred');
  document.querySelector('.typing-container').classList.add('focused');
}

function blurInput() {
  if (state.started && !state.finished) return; // don't blur during active test
  dom.focusOverlay.classList.remove('hidden');
  dom.textDisplay.classList.add('blurred');
  document.querySelector('.typing-container').classList.remove('focused');
}

/* ---- FINISH TEST ---- */
function finishTest() {
  if (state.finished) return;
  state.finished = true;
  clearInterval(state.timerInterval);
  state.timerInterval = null;

  setStatus('finished', '✓ Test complete!');
  dom.typingInput.blur();

  const elapsed   = state.timerDuration - state.timeLeft;
  const wpm       = calcWPM(state.correctCount, elapsed || 1);
  const cpm       = calcCPM(state.correctCount, elapsed || 1);
  const acc       = calcAccuracy(state.correctCount, state.totalTyped);

  showResults(wpm, cpm, acc, elapsed);
}

/* ---- SHOW RESULTS ---- */
function showResults(wpm, cpm, acc, elapsed) {
  dom.resultWpm.textContent     = wpm;
  dom.resultAcc.textContent     = `${acc}%`;
  dom.resultCpm.textContent     = cpm;
  dom.resultCorrect.textContent = state.correctCount;
  dom.resultWrong.textContent   = state.incorrectCount;
  dom.resultTime.textContent    = `${elapsed}s`;
  dom.resultSubtitle.textContent = `${state.difficulty.toUpperCase()} · ${state.timerDuration}s test`;

  // Performance badge
  const { icon, text } = getPerformanceBadge(wpm, acc);
  dom.badgeIcon.textContent = icon;
  dom.badgeText.textContent = text;

  // Personal best
  const isNewBest = checkAndSaveBest(wpm, acc);
  dom.newBest.hidden = !isNewBest;

  dom.resultsModal.hidden = false;
  dom.modalRestart.focus();
}

function getPerformanceBadge(wpm, acc) {
  if (wpm >= 100 && acc >= 95) return { icon: '🚀', text: 'Legendary Typist!' };
  if (wpm >= 80  && acc >= 90) return { icon: '⚡', text: 'Elite Speed!' };
  if (wpm >= 60  && acc >= 88) return { icon: '🔥', text: 'Advanced Typist' };
  if (wpm >= 40  && acc >= 85) return { icon: '💪', text: 'Solid Performance' };
  if (wpm >= 25  && acc >= 80) return { icon: '📈', text: 'Getting Better!' };
  if (acc < 70)                return { icon: '🎯', text: 'Focus on Accuracy!' };
  return { icon: '🌱', text: 'Keep Practicing!' };
}

/* ---- LOCAL STORAGE BEST ---- */
function loadBest() {
  try {
    const best = JSON.parse(localStorage.getItem('typeforge_best') || '{}');
    if (best.wpm) {
      dom.bestWpm.textContent = best.wpm;
      dom.bestAcc.textContent = `${best.acc}%`;
    }
  } catch (_) { /* ignore */ }
}

function checkAndSaveBest(wpm, acc) {
  try {
    const key  = 'typeforge_best';
    const prev = JSON.parse(localStorage.getItem(key) || '{}');
    if (!prev.wpm || wpm > prev.wpm) {
      localStorage.setItem(key, JSON.stringify({ wpm, acc }));
      dom.bestWpm.textContent = wpm;
      dom.bestAcc.textContent = `${acc}%`;
      return true;
    }
  } catch (_) { /* ignore */ }
  return false;
}

/* ---- RESTART ---- */
function restartTest() {
  // Reset state
  state.started        = false;
  state.finished       = false;
  state.currentIndex   = 0;
  state.totalTyped     = 0;
  state.correctCount   = 0;
  state.incorrectCount = 0;
  state.keyPresses     = {};

  resetTimer();
  loadText();
  updateStats();
  updateProgressBar();
  updateHeatmap();

  setStatus('idle', 'Click below and start typing…');
  dom.resultsModal.hidden = true;
  dom.focusOverlay.classList.remove('hidden');
  dom.textDisplay.classList.remove('blurred');
  document.querySelector('.typing-container').classList.remove('focused');
  dom.typingInput.value = '';
}

/* ---- DIFFICULTY & TIMER BUTTONS ---- */
function initChipButtons() {
  // Difficulty
  document.querySelectorAll('[data-difficulty]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-difficulty]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.difficulty = btn.dataset.difficulty;
      restartTest();
    });
  });

  // Timer
  document.querySelectorAll('[data-time]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-time]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.timerDuration = parseInt(btn.dataset.time);
      restartTest();
    });
  });
}

/* ---- THEME TOGGLE ---- */
function initTheme() {
  const saved = localStorage.getItem('typeforge_theme') || 'dark';
  document.body.className = `theme-${saved}`;

  dom.themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('theme-dark');
    document.body.className = isDark ? 'theme-light' : 'theme-dark';
    localStorage.setItem('typeforge_theme', isDark ? 'light' : 'dark');
  });
}

/* ---- SOUND TOGGLE ---- */
function initSound() {
  dom.soundToggle.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    dom.soundIcon.textContent = state.soundEnabled ? '♪' : '♩';
    dom.soundToggle.style.borderColor = state.soundEnabled ? 'var(--accent)' : '';
    dom.soundToggle.style.color = state.soundEnabled ? 'var(--accent)' : '';
  });
}

/* ---- EVENT LISTENERS ---- */
function bindEvents() {
  // Typing
  dom.typingInput.addEventListener('input',   handleInput);
  dom.typingInput.addEventListener('keydown', handleKeyDown);

  // Focus
  dom.focusOverlay.addEventListener('click', focusInput);
  dom.focusOverlay.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') focusInput(); });
  dom.typingInput.addEventListener('blur', () => { if (!state.started) blurInput(); });
  dom.textDisplay.addEventListener('click', focusInput);

  // Restart
  dom.restartBtn.addEventListener('click', () => { restartTest(); focusInput(); });

  // Refresh quote
  dom.refreshQuote.addEventListener('click', () => {
    if (!state.started) { restartTest(); }
  });

  // Modal
  dom.modalRestart.addEventListener('click', () => { restartTest(); focusInput(); });
  dom.modalClose.addEventListener('click', () => {
    dom.resultsModal.hidden = true;
    focusInput();
  });

  // Global keypress catch (even when overlay shown)
  document.addEventListener('keydown', e => {
    if (
      dom.resultsModal.hidden &&
      !dom.focusOverlay.classList.contains('hidden') &&
      !['Tab','F5','F12'].includes(e.key) &&
      e.key.length === 1
    ) {
      focusInput();
    }
  });
}

/* ---- INIT ---- */
function init() {
  buildKeyboard();
  initChipButtons();
  initTheme();
  initSound();
  bindEvents();
  loadText();
  loadBest();
  setStatus('idle', 'Click below and start typing…');
  dom.timerDisplay.textContent = state.timerDuration;
}

init();