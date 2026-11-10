/** Names the program form must reject. Static so a generated value cannot come out valid. */
export const invalidProgramNames = {
  empty: '',
  whitespace: '   ',
  tooLong: 'A'.repeat(256),
} as const;
