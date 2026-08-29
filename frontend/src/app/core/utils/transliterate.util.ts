const PULLI = '்';

// Vowels: [pattern, independent form, dependent sign]
const VOWELS: [string, string, string][] = [
  ['aa', 'ஆ', 'ா'],
  ['ay', 'ஐ', 'ை'],
  ['ai', 'ஐ', 'ை'],
  ['au', 'ஔ', 'ௌ'],
  ['ae', 'ஏ', 'ே'],
  ['ee', 'ஈ', 'ீ'],
  ['ii', 'ஈ', 'ீ'],
  ['oo', 'ஊ', 'ூ'],
  ['uu', 'ஊ', 'ூ'],
  ['ou', 'ஒ', 'ொ'],
  ['a',  'அ', 'ா'],
  ['i',  'இ', 'ி'],
  ['u',  'உ', 'ு'],
  ['e',  'எ', 'ெ'],
  ['o',  'ஒ', 'ொ'],
];

// Consonants: [pattern, Tamil base glyph]  (no pulli — state machine adds it)
const CONSONANTS: [string, string][] = [
  ['tch', 'ட'], ['nth', 'ந'],
  ['nj',  'ஞ'], ['ny',  'ஞ'], ['ng',  'ங'],
  ['sh',  'ஷ'], ['zh',  'ழ'],
  ['th',  'த'], ['dh',  'த'],
  ['ch',  'ச'],
  ['ph',  'ப'], ['gh',  'க'], ['kh',  'க'],
  ['rr',  'ற'], ['ll',  'ள'], ['nn',  'ண'],
  ['k',   'க'], ['g',   'க'],
  ['c',   'ச'],
  ['s',   'ஸ'], ['j',   'ஜ'],
  ['t',   'ட'], ['d',   'ட'],
  ['n',   'ன'], ['m',   'ம'],
  ['r',   'ர'], ['l',   'ல'],
  ['p',   'ப'], ['b',   'ப'], ['f',   'ப'],
  ['v',   'வ'], ['w',   'வ'],
  ['y',   'ய'], ['h',   'ஹ'],
  ['z',   'ஸ'],
];

function transWord(s: string): string {
  let result = '';
  let i = 0;
  let pending: string | null = null; // consonant base waiting for a vowel

  while (i < s.length) {
    // Try vowel match (longest first)
    let vMatch: [string, string, string] | null = null;
    let vLen = 0;
    for (const [pat, ind, dep] of VOWELS) {
      if (s.startsWith(pat, i)) { vMatch = [pat, ind, dep]; vLen = pat.length; break; }
    }

    if (vMatch) {
      const [, ind, dep] = vMatch;
      if (pending !== null) {
        result += pending + dep; // consonant + vowel sign
      } else {
        result += ind;           // standalone vowel
      }
      pending = null;
      i += vLen;
      continue;
    }

    // Try consonant match (longest first)
    let cMatch: [string, string] | null = null;
    let cLen = 0;
    for (const [pat, base] of CONSONANTS) {
      if (s.startsWith(pat, i)) { cMatch = [pat, base]; cLen = pat.length; break; }
    }

    if (cMatch) {
      const [, base] = cMatch;
      if (pending !== null) result += pending + PULLI; // close previous consonant
      pending = base;
      i += cLen;
      continue;
    }

    // Unknown char (space, digit, punctuation) — flush and pass through
    if (pending !== null) { result += pending + PULLI; pending = null; }
    result += s[i];
    i++;
  }

  if (pending !== null) result += pending + PULLI;
  return result;
}

export function transliterateEnToTamil(english: string): string {
  if (!english?.trim()) return '';
  return english
    .trim()
    .split(/\s+/)
    .map(word => transWord(word.toLowerCase()))
    .join(' ');
}
