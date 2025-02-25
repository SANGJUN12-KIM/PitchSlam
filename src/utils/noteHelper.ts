const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getNote(frequency: number): string {
  if (frequency === 0) return '-';
  
  // A4 = 440Hz를 기준으로 계산
  const noteNum = 12 * (Math.log2(frequency / 440)) + 69;
  const note = NOTES[Math.round(noteNum) % 12];
  const octave = Math.floor(Math.round(noteNum) / 12) - 1;
  
  return `${note}${octave}`;
}
