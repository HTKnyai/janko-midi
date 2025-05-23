let startTime = null;
const eventLog = [];

function getTime() {
  if (startTime === null) {
    startTime = performance.now();
    return 0;
  }
  return performance.now() - startTime;
}

export function recordNoteOn(note) {
  const time = getTime();
  eventLog.push({ type: 'on', note, time });
  updateLogDisplay();
}

export function recordNoteOff(note) {
  const time = getTime();
  eventLog.push({ type: 'off', note, time });
  updateLogDisplay();
}

export function clearRecording() {
  eventLog.length = 0;
  startTime = null;
  updateLogDisplay();
}

export function getRecording() {
  return [...eventLog];
}

function updateLogDisplay() {
  const el = document.getElementById('log');
  el.innerHTML = '<h3>記録:</h3><ul>' + eventLog.map(e =>
    `<li>${e.type.toUpperCase()} ${e.note} @ ${e.time.toFixed(0)}ms</li>`
  ).join('') + '</ul>';
}