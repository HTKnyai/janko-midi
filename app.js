// ===== ヤンコ鍵盤描画 =====
const NUM_ROWS = 5;
const NUM_KEYS_PER_ROW = 16;
const KEY_WIDTH = 70;
const KEY_HEIGHT = 50;

const keyboardEl = document.getElementById('keyboard');
const pressedNotes = new Set();
let startTime = null;
const eventLog = [];

function getTime() {
  if (startTime === null) {
    startTime = performance.now();
    return 0;
  }
  return performance.now() - startTime;
}

const ORIGIN_NOTE = 60; // C4
const ORIGIN_X = 4;
const ORIGIN_Y = 1;

function midiNoteFromPosition(x, y) {
  const dx = x - ORIGIN_X;
  const dy = y - ORIGIN_Y;
  return ORIGIN_NOTE + dx * 2 + dy;
}

function createKey(x, y) {
  const note = midiNoteFromPosition(x, y);
  const key = document.createElement('div');
  key.className = 'key';
  if (isBlackKey(note)) key.classList.add('black');

  // Janko配列で右上にずらす
  key.style.left = `${x * KEY_WIDTH + y * (KEY_WIDTH / 2)}px`;
  key.style.top = `${y * KEY_HEIGHT}px`;
  key.dataset.note = note;

  const label = document.createElement('div');
  label.className = 'label';
  label.innerText = noteLabel(note);
  key.appendChild(label);

  key.addEventListener('mousedown', () => pressNote(note));
  key.addEventListener('mouseup', () => releaseNote(note));
  key.addEventListener('touchstart', (e) => {
    e.preventDefault();
    pressNote(note);
  }, { passive: false });
  key.addEventListener('touchend', (e) => {
    e.preventDefault();
    releaseNote(note);
  });

  keyboardEl.appendChild(key);
}

function buildKeyboard() {
  keyboardEl.style.position = 'relative';
  keyboardEl.style.height = `${NUM_ROWS * KEY_HEIGHT}px`;
  for (let y = 0; y < NUM_ROWS; y++) {
    for (let x = 0; x < NUM_KEYS_PER_ROW; x++) {
      createKey(x, y);
    }
  }
}

// ===== コード判定 =====
const chordTypes = [
  { name: 'maj', intervals: [0, 4, 7] },
  { name: 'min', intervals: [0, 3, 7] },
  { name: 'dim', intervals: [0, 3, 6] },
  { name: 'aug', intervals: [0, 4, 8] },
  { name: 'sus2', intervals: [0, 2, 7] },
  { name: 'sus4', intervals: [0, 5, 7] },
  { name: '7', intervals: [0, 4, 7, 10] },
  { name: 'maj7', intervals: [0, 4, 7, 11] },
  { name: 'min7', intervals: [0, 3, 7, 10] },
];

function noteName(note) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[note % 12];
}

function detectChord(noteSet) {
  const notes = Array.from(noteSet).sort((a, b) => a - b);
  if (notes.length < 2) return null;
  for (let root of notes) {
    const intervals = notes.map(n => (n - root + 12) % 12);
    for (let chord of chordTypes) {
      if (chord.intervals.every(i => intervals.includes(i))) {
        return `${noteName(root)}${chord.name}`;
      }
    }
  }
  return 'Unknown';
}

function updateChordDisplay(noteSet) {
  const chord = detectChord(noteSet);
  const el = document.getElementById('code-display');
  el.innerText = chord ? `コード：${chord}` : '';
}

// ===== 記録機能 =====
function recordNoteOn(note) {
  const time = getTime();
  eventLog.push({ type: 'on', note, time });
  updateLogDisplay();
}

function recordNoteOff(note) {
  const time = getTime();
  eventLog.push({ type: 'off', note, time });
  updateLogDisplay();
}

function updateLogDisplay() {
  const el = document.getElementById('log');
  el.innerHTML = '<h3>記録:</h3><ul>' + eventLog.map(e =>
    `<li>${e.type.toUpperCase()} ${e.note} @ ${e.time.toFixed(0)}ms</li>`
  ).join('') + '</ul>';
}

// ===== 入力イベント統合 =====
function pressNote(note) {
  if (!pressedNotes.has(note)) {
    pressedNotes.add(note);

    const els = document.querySelectorAll(`[data-note='${note}']`);
    els.forEach(el => el.classList.add('pressed'));

    playNote(note);
    updateChordDisplay(pressedNotes);

    addChordWithLabelsToStave(Array.from(pressedNotes).sort((a, b) => a - b));
  }
}

function releaseNote(note) {
  if (pressedNotes.has(note)) {
    pressedNotes.delete(note);
    const els = document.querySelectorAll(`[data-note='${note}']`);
    els.forEach(el => el.classList.remove('pressed'));
    stopNote(note);
    updateChordDisplay(pressedNotes);
  }
}

// ===== 音名と黒鍵判定 =====
function noteLabel(note) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = names[note % 12];
  const octave = Math.floor(note / 12) - 1;
  return `${name}${octave}`;
}

function isBlackKey(note) {
  const blackNotes = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
  return blackNotes.includes(note % 12);
}

// ===== 音声合成 =====
function noteToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12); // A4 = MIDI 69 = 440Hz
}

let audioContext = null;
let activeOscillators = {};

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playNote(note) {
  const context = getAudioContext();
  if (activeOscillators[note]) return;

  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.frequency.value = noteToFreq(note);
  osc.type = 'sine';

  osc.connect(gain);
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.2, context.currentTime);

  osc.start();
  activeOscillators[note] = { osc, gain };
}

function stopNote(note) {
  if (activeOscillators[note]) {
    const { osc, gain } = activeOscillators[note];
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    osc.stop(audioContext.currentTime + 0.3);
    delete activeOscillators[note];
  }
}

// ===== 五線譜描画 =====
let renderer = null;
let context = null;
let stave = null;
let staveNotes = [];

function setupVexFlow() {
  renderer = new Vex.Flow.Renderer(document.getElementById("notation"), Vex.Flow.Renderer.Backends.SVG);
  renderer.resize(700, 150);
  context = renderer.getContext();

  stave = new Vex.Flow.Stave(10, 40, 680);
  stave.addClef("treble").setContext(context).draw();

  staveNotes = []; // 表示音符の初期化
}

const MAX_VISIBLE = 12; // 一度に表示する最大ブロック数（1ブロック = 3つのNote）

function addChordWithLabelsToStave(midiNotes) {
  if (!midiNotes.length) return;

  const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const keys = midiNotes.map(n => {
    const name = pitchNames[n % 12];
    const octave = Math.floor(n / 12) - 1;
    return name.replace('#', '').toLowerCase() + "/" + octave;
  });

  const staveNote = new Vex.Flow.StaveNote({
    keys: keys,
    duration: "q"
  }).setContext(context);

  midiNotes.forEach((n, i) => {
    if (pitchNames[n % 12].includes('#')) {
      staveNote.addModifier(new Vex.Flow.Accidental("#"), i);
    }
  });

  const chordName = detectChord(new Set(midiNotes));

  const chordText = new Vex.Flow.TextNote({
    text: chordName || '',
    duration: "q",
    line: -1
  }).setJustification(Vex.Flow.TextNote.Justification.CENTER)
    .setContext(context);

  const labelText = new Vex.Flow.TextNote({
    text: midiNotes.map(n => pitchNames[n % 12]).join(" "),
    duration: "q",
    line: 9
  }).setJustification(Vex.Flow.TextNote.Justification.CENTER)
    .setContext(context);

  // 👇 累積
  staveNotes.push(chordText, staveNote, labelText);

  // ⛳ 表示範囲を末尾の N個に制限
  const visibleNotes = staveNotes.slice(-MAX_VISIBLE * 3);

  const voice = new Vex.Flow.Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
  voice.addTickables(visibleNotes);

  context.clear();
  stave.setContext(context).draw();

  new Vex.Flow.Formatter()
    .joinVoices([voice])
    .format([voice], 600);

  voice.draw(context, stave);
}

setupVexFlow();
buildKeyboard();