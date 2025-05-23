// 使用可能なコードの定義（ルートを0とした相対音程）
const chordTypes = [
  { name: 'maj', intervals: [0, 4, 7] },
  { name: 'min', intervals: [0, 3, 7] },
  { name: 'dim', intervals: [0, 3, 6] },
  { name: 'aug', intervals: [0, 4, 8] },
  { name: 'sus2', intervals: [0, 2, 7] },
  { name: 'sus4', intervals: [0, 5, 7] },
  { name: 'add9', intervals: [0, 2, 4, 7] },
  { name: '6', intervals: [0, 4, 7, 9] },
  { name: '7', intervals: [0, 4, 7, 10] },
  { name: 'maj7', intervals: [0, 4, 7, 11] },
  { name: 'min7', intervals: [0, 3, 7, 10] },
];

// MIDIノート番号を音名（C, C#, D...）に変換
function noteName(note) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[note % 12];
}

// コード判定
function detectChord(noteSet) {
  const notes = Array.from(noteSet).sort((a, b) => a - b);
  if (notes.length < 2) return null;

  // ルート候補ごとにコードタイプと比較
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

// UIに表示
function updateChordDisplay(noteSet) {
  const chord = detectChord(noteSet);
  const el = document.getElementById('code-display');
  el.innerText = chord ? `コード：${chord}` : '';
}