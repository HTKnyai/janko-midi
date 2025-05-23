import { recordNoteOn, recordNoteOff } from './recorder.js';

const NUM_ROWS = 4;         // 縦方向の段数（斜めに積む）
const NUM_KEYS_PER_ROW = 10; // 横方向の鍵数
const KEY_WIDTH = 60;
const KEY_HEIGHT = 40;

const keyboardEl = document.getElementById('keyboard');

const pressedNotes = new Set(); // 押されている音

function midiNoteFromPosition(x, y) {
  return 60 + x + y * 5; // C4を基準に配置
}

function createKey(x, y) {
  const note = midiNoteFromPosition(x, y);

  const key = document.createElement('div');
  key.className = 'key';
  key.style.left = `${x * KEY_WIDTH + y * (KEY_WIDTH / 2)}px`;
  key.style.top = `${y * KEY_HEIGHT}px`;
  key.dataset.note = note;
  key.innerText = note;

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

function pressNote(note) {
  if (!pressedNotes.has(note)) {
    pressedNotes.add(note);
    console.log(`Note ON: ${note}`);
    recordNoteOn(note);                   // ← 追加
    updateChordDisplay(pressedNotes);
  }
}

function releaseNote(note) {
  if (pressedNotes.has(note)) {
    pressedNotes.delete(note);
    console.log(`Note OFF: ${note}`);
    recordNoteOff(note);                 // ← 追加
    updateChordDisplay(pressedNotes);
  }
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

buildKeyboard();