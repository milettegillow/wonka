// Willy Wonka's lines. All original. Short, whimsical, a touch menacing,
// and entirely unbothered by what happens to the children.
const Q = {
  win: [
    'Splendid! Nobody exploded.',
    'Marvellous. Now do it faster.',
    'Ha! I knew you had it in you. Mostly.',
    'Scrumptious work! Next!',
    'Bravo! Keep your elbows inside the factory.',
  ],
  winBy: {
    charlie: ['A sharp eye on a good boy!', 'The ticket likes you. Interesting.'],
    violet: ['Chewing and listening? A miracle!', 'Not one berry swallowed. Pity.'],
    veruca: ['Not a squirrel stirred. Rare!', 'Sneaky! I approve, reluctantly.'],
    mike: ['All your pixels, home again!', 'Full size! How unfashionable.'],
    augustus: ['Still on dry land! Astonishing!', 'The pipe goes hungry today.'],
  },
  failBy: {
    charlie: ['Just chocolate. Eat it anyway!', 'The ticket was feeling shy.'],
    violet: ['Roll her along, boys! Mind the corners.', 'Blueberry season came early.', 'She will be juiced by teatime.'],
    veruca: ['A bad nut! Down she goes.', 'The squirrels are never wrong.', 'The chute is only mostly rubbish.'],
    mike: ['He makes a lovely tiny star.', 'We can stretch him later. Probably.', 'Smaller than a stamp. Very tidy!'],
    augustus: ['Up the pipe! Mind the fudge.', 'He will come out as fudge. Raspberry, I think.', 'The pipe was peckish too.'],
  },
  scoreboard: {
    low: ['Hmm. Room for improvement. Acres of it.', 'A sticky start. I have seen worse. Once.'],
    mid: ['Not bad. Not good either. Fascinating!', 'Halfway to wonderful. Keep chewing.'],
    high: ['Most impressive. For a beginner.', 'Nearly there! Do not touch anything.'],
  },
  menuHello: ['Well? Pick a child. Any child.', 'Step lively! The river waits for no one.'],
  ending: [
    'It is yours, my dear child. All of it!',
    'Every pipe, every squirrel. Yours!',
    'Now press that button. Up and out!',
  ],
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function winQuip(kid) {
  return Math.random() < 0.55 && Q.winBy[kid] ? pick(Q.winBy[kid]) : pick(Q.win);
}
export function failQuip(kid) { return pick(Q.failBy[kid] || Q.win); }
export function scoreQuip(total, max) {
  const k = total / max;
  return pick(k < 0.34 ? Q.scoreboard.low : k < 0.75 ? Q.scoreboard.mid : Q.scoreboard.high);
}
export function helloQuip() { return pick(Q.menuHello); }
export const ENDING_LINES = Q.ending;
