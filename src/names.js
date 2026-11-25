// Full names, used wherever a kid's name is shown.
export const FULL_NAMES = {
  charlie: 'Charlie Bucket',
  augustus: 'Augustus Gloop',
  violet: 'Violet Beauregarde',
  veruca: 'Veruca Salt',
  mike: 'Mike Teavee',
};
// [first, last] for places with room for two lines.
export const nameParts = (id) => FULL_NAMES[id].split(' ');
