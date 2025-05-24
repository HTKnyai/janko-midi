// ===== ヤンコ鍵盤描画 =====
const NUM_ROWS = 5;
const NUM_KEYS_PER_ROW = 16;
let KEY_WIDTH = 70;
let KEY_HEIGHT = 50;

let staveWidth = window.innerWidth - 40;  // 最初に定義

let chordBuffer = new Set();
let chordTimer = null;
const CHORD_DELAY = 100; // ミリ秒

let keyboardOriginNote = 58; // A0 = MIDI 21

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
  return keyboardOriginNote + x * 2 + y;
}

function createKey(x, y) {
  const note = midiNoteFromPosition(x, y);
  const key = document.createElement('div');
  key.className = 'key';
  if (isBlackKey(note)) key.classList.add('black');

  // Janko配列で右上にずらす
  key.style.width = `${KEY_WIDTH}px`;
  key.style.height = `${KEY_HEIGHT}px`;
  key.style.left = `${x * KEY_WIDTH + y * (KEY_WIDTH / 2)}px`;
  key.style.top = `${y * KEY_HEIGHT}px`;
  key.dataset.note = note;

  const label = document.createElement('div');
  label.className = 'label';
  label.innerText = noteLabel(note);
  label.style.fontSize = `${Math.floor(KEY_HEIGHT * 0.4)}px`;
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
  keyboardEl.innerHTML = ''; // 古いキーをすべて削除
  keyboardEl.style.position = 'relative';
  keyboardEl.style.height = `${NUM_ROWS * KEY_HEIGHT}px`; // 動的に再設定

  for (let y = 0; y < NUM_ROWS; y++) {
    for (let x = 0; x < NUM_KEYS_PER_ROW; x++) {
      createKey(x, y);
    }
  }
}

const rangeSlider = document.getElementById('keyboard-range');

function updateKeyboardFromSlider() {
  // 鳴っている音を全て止める
  pressedNotes.forEach(note => stopNote(note));
  pressedNotes.clear();

  // 音域変更と再描画
  keyboardOriginNote = parseInt(rangeSlider.value);
  buildKeyboard();
}

// ===== コード判定 =====
const chordTypes = [
  { name: '7', intervals: [0, 4, 7, 10] },
  { name: 'maj7', intervals: [0, 4, 7, 11] },
  { name: 'min7', intervals: [0, 3, 7, 10] },
  { name: 'maj', intervals: [0, 4, 7] },
  { name: 'min', intervals: [0, 3, 7] },
  { name: 'dim', intervals: [0, 3, 6] },
  { name: 'aug', intervals: [0, 4, 8] },
  { name: 'sus2', intervals: [0, 2, 7] },
  { name: 'sus4', intervals: [0, 5, 7] },
];

const displayChordGroups = [
  ['maj', 'min', '7', 'maj7', 'min7'],
  ['sus2', 'sus4', 'dim', 'aug']
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
      const chordIntervals = chord.intervals;
      const match = chordIntervals.every(i => intervals.includes(i)) &&
                    intervals.length === chordIntervals.length;

      if (match) {
        return `${noteName(root)}${chord.name}`;
      }
    }
  }
  return '';
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
    chordBuffer.add(note);

    const els = document.querySelectorAll(`[data-note='${note}']`);
    els.forEach(el => el.classList.add('pressed'));

    playNote(note);
    updateChordDisplay(pressedNotes);

    if (chordTimer !== null) {
      clearTimeout(chordTimer);
    }

    chordTimer = setTimeout(() => {
      const bufferArray = Array.from(chordBuffer).sort((a, b) => a - b);
      addChordWithLabelsToStave(bufferArray);
      chordBuffer.clear();
    }, CHORD_DELAY);
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

const MAX_VISIBLE = 10; // 一度に表示する最大ブロック数（1ブロック = 3つのNote）
const NOTE_BLOCK_WIDTH = 60; // 1つの音符＋ラベル等に必要な幅（調整可能）

function setupVexFlow() {
  staveWidth = MAX_VISIBLE * NOTE_BLOCK_WIDTH + 40;

  const notationEl = document.getElementById("notation");
  if (!notationEl) {
    console.error("notation 要素が見つかりませんでした");
    return;
  }

  notationEl.innerHTML = "";

  renderer = new Vex.Flow.Renderer(notationEl, Vex.Flow.Renderer.Backends.SVG);
  renderer.resize(staveWidth, 220);
  context = renderer.getContext();

  stave = new Vex.Flow.Stave(10, 20, staveWidth - 20);
  stave.addClef("treble").setContext(context).draw(); // ← これ重要！

  staveNotes = [];
}

function addChordWithLabelsToStave(midiNotes) {
  if (!midiNotes.length) return;

  const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // 🎵 コード名（上に表示）
  const chordName = detectChord(new Set(midiNotes));
  const chordText = new Vex.Flow.TextNote({
    text: chordName || '',
    duration: "q",
    line: -1
  }).setJustification(Vex.Flow.TextNote.Justification.CENTER);

  // 🎼 音符キー名の変換（"c/4" のような形式）
  const keys = midiNotes.map(n => {
    const name = pitchNames[n % 12];
    const octave = Math.floor(n / 12) - 1;
    return name.replace('#', '').toLowerCase() + "/" + octave;
  });

  // 🎶 音符ノート
  const staveNote = new Vex.Flow.StaveNote({
    keys: keys,
    duration: "q"
  });

  // シャープ記号と音名ラベルをつける
  midiNotes.forEach((n, i) => {
    const name = pitchNames[n % 12];
    if (name.includes('#')) {
      staveNote.addModifier(new Vex.Flow.Accidental("#"), i);
    }

    staveNote.addModifier(new Vex.Flow.Annotation(name)
    .setVerticalJustification(Vex.Flow.Annotation.VerticalJustify.BOTTOM)
    .setFont("Arial", 14), i);
  });

  // contextをセット
  staveNote.setContext(context);
  chordText.setContext(context);

  // 配列に追加
  staveNotes.push({
    note: staveNote,
    chordText: chordText,
    labelTexts: []  // Annotationに統合したため不要
  });

  const visible = staveNotes.slice(-MAX_VISIBLE);

  // 🎨 再描画
  context.clearRect(0, 0, staveWidth, 220);
  stave.setContext(context).draw();

  const noteVoice = new Vex.Flow.Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
  const chordVoice = new Vex.Flow.Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);

  noteVoice.addTickables(visible.map(v => v.note));
  chordVoice.addTickables(visible.map(v => v.chordText));

  new Vex.Flow.Formatter()
    .joinVoices([noteVoice])
    .format([noteVoice, chordVoice], staveWidth - 40);

  noteVoice.draw(context, stave);
  chordVoice.draw(context, stave);
}

setupVexFlow();
buildKeyboard();

window.addEventListener('resize', () => {
  setupVexFlow(); // レンダリングをリセット
});

let resizeTimer = null;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    setupVexFlow(); // ← 一度だけ再描画
  }, 300);
});

// ===== コード図表示 =====
const chordPresets = {
  'maj':  [0, 4, 7],
  'min':  [0, 3, 7],
  'dim':  [0, 3, 6],
  'aug':  [0, 4, 8],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  '7':    [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
};

// 🔧 HTML要素取得を関数の前に移動
const chordChartEl = document.getElementById('chord-chart');

const displayNames = {
  'maj': 'Major',
  'min': 'Minor',
  'dim': 'Diminished',
  'aug': 'Augmented',
  'sus2': 'Sus2',
  'sus4': 'Sus4',
  '7': '7th',
  'maj7': 'Maj7',
  'min7': 'Min7',
};

function renderChordChart() {
  chordChartEl.innerHTML = '';
  for (const group of displayChordGroups) {
    const row = document.createElement('div');
    row.className = 'chord-chart-row';

    for (const name of group) {
      const intervals = chordPresets[name];
      const wrapper = document.createElement('div');
      wrapper.className = 'chord-wrapper';

      const title = document.createElement('div');
      title.className = 'chord-title';
      title.textContent = displayNames[name] || name;
      wrapper.appendChild(title);

      const root = 60; // C4
      const baseNotes = intervals.map(i => root + i);
      wrapper.appendChild(createMiniKeyboard2Row(baseNotes));

      row.appendChild(wrapper);
    }

    chordChartEl.appendChild(row);
  }
}

function createMiniKeyboard2Row(noteNumbers) {
  const container = document.createElement('div');
  container.className = 'mini-keyboard-janko';

  const rows = 2;
  const cols = 6;
  const ORIGIN_NOTE = 60;
  const rootNote = noteNumbers[0]; // ルート音

  for (let y = rows - 1; y >= 0; y--) {
    const rowEl = document.createElement('div');
    rowEl.className = 'mini-keyboard-row';

    if (y === 1) {
      rowEl.classList.add('offset');
    }

    for (let x = 0; x < cols; x++) {
      const note = ORIGIN_NOTE + x * 2 + y;
      const key = document.createElement('div');
      key.className = 'mini-key';

      if (noteNumbers.includes(note)) {
        key.classList.add('active');
        if (note === rootNote) {
          key.classList.add('root');
        }
      }

      rowEl.appendChild(key);
    }

    container.appendChild(rowEl);
  }

  return container;
}

// キーボード配列（左上が (x=0, y=0)）
const keyMap = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l',';'],
  ['z','x','c','v','b','n','m',',','.','/']
];

// スライド位置（初期: 0）
let keyboardOffsetX = 0;
let keyboardOffsetY = 1;

const offsetDisplay = document.getElementById('offset-display');

function updateOffsetDisplay() {
  offsetDisplay.textContent = `X: ${keyboardOffsetX}, Y: ${keyboardOffsetY}`;
}

document.getElementById('slide-left').addEventListener('click', () => {
  keyboardOffsetX = Math.max(keyboardOffsetX - 1, -10);
  updateOffsetDisplay();
});
document.getElementById('slide-right').addEventListener('click', () => {
  keyboardOffsetX = Math.min(keyboardOffsetX + 1, 10);
  updateOffsetDisplay();
});
document.getElementById('slide-up').addEventListener('click', () => {
  keyboardOffsetY = Math.max(keyboardOffsetY - 1, -5);
  updateOffsetDisplay();
});
document.getElementById('slide-down').addEventListener('click', () => {
  keyboardOffsetY = Math.min(keyboardOffsetY + 1, 5);
  updateOffsetDisplay();
});

document.addEventListener('DOMContentLoaded', () => {
  setupVexFlow();   // ← ここに移動！
  buildKeyboard();
  const rangeSlider = document.getElementById('keyboard-range');
  const keySizeSlider = document.getElementById('keySizeSlider');

  // ===== 初期描画 =====
  renderChordChart();
  updateOffsetDisplay();

  // ===== スライダー：音域調整 =====
  rangeSlider.addEventListener('input', updateKeyboardFromSlider);

  document.getElementById('range-left').addEventListener('click', () => {
    if (keyboardOriginNote > 21) {
      keyboardOriginNote--;
      rangeSlider.value = keyboardOriginNote;
      updateKeyboardFromSlider();
    }
  });

  document.getElementById('range-right').addEventListener('click', () => {
    if (keyboardOriginNote < 108) {
      keyboardOriginNote++;
      rangeSlider.value = keyboardOriginNote;
      updateKeyboardFromSlider();
    }
  });

  // ===== スライダー：キーサイズ調整 =====
  keySizeSlider.addEventListener('input', (e) => {
    const newSize = parseInt(e.target.value);
    KEY_WIDTH = newSize;
    KEY_HEIGHT = Math.floor(newSize * 0.714);
    buildKeyboard();
  });

  // ===== ウィンドウリサイズ =====
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setupVexFlow();
    }, 300);
  });

  // ===== キーボード入力（qwerty）対応 =====
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    for (let y = 0; y < keyMap.length; y++) {
      const row = keyMap[y];
      const x = row.indexOf(e.key.toLowerCase());
      if (x !== -1) {
        const note = midiNoteFromPosition(x + keyboardOffsetX, y + keyboardOffsetY);
        pressNote(note);
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    for (let y = 0; y < keyMap.length; y++) {
      const row = keyMap[y];
      const x = row.indexOf(e.key.toLowerCase());
      if (x !== -1) {
        const note = midiNoteFromPosition(x + keyboardOffsetX, y + keyboardOffsetY);
        releaseNote(note);
      }
    }
  });
});



