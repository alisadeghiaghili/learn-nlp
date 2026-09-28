/**
 * Normalization: lowercasing, stopword removal, stemming, lemmatization.
 */

import type { NormalizerName, Token } from "./types";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "while", "of", "at", "by",
  "for", "with", "about", "against", "between", "into", "through", "during",
  "before", "after", "above", "below", "to", "from", "up", "down", "in",
  "out", "on", "off", "over", "under", "again", "further", "then", "once",
  "here", "there", "when", "where", "why", "how", "all", "both", "each",
  "few", "more", "most", "other", "some", "such", "no", "nor", "not",
  "only", "own", "same", "so", "than", "too", "very", "can", "will",
  "just", "don", "should", "now", "is", "are", "was", "were", "be",
  "been", "being", "have", "has", "had", "having", "do", "does", "did",
  "doing", "this", "that", "these", "those", "i", "me", "my", "we",
  "our", "you", "your", "he", "she", "it", "they", "them", "his", "her",
]);

const LEMMA_MAP: Record<string, string> = {
  running: "run", ran: "run", runs: "run",
  better: "good", best: "good", worse: "bad", worst: "bad",
  children: "child", mice: "mouse", geese: "goose",
  studies: "study", studied: "study", studying: "study",
  cities: "city", stories: "story", movies: "movie",
  loved: "love", loving: "love", loves: "love",
  played: "play", playing: "play", plays: "play",
  was: "be", were: "be", been: "be",
  has: "have", had: "have", having: "have",
  does: "do", did: "do", done: "do",
};

/**
 * Very small Porter-like suffix stripper for teaching stems vs lemmas.
 */
export function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length < 4) return w;
  // doubled consonant after -ing/-ed (running → run, stopped → stop)
  if (/([bdfglmnprt])\1ing$/.test(w)) return w.slice(0, -4);
  if (/([bdfglmnprt])\1ed$/.test(w)) return w.slice(0, -3);
  const rules: [RegExp, string][] = [
    [/ational$/, "ate"],
    [/tional$/, "tion"],
    [/enci$/, "ence"],
    [/anci$/, "ance"],
    [/izer$/, "ize"],
    [/alli$/, "al"],
    [/entli$/, "ent"],
    [/eli$/, "e"],
    [/ousli$/, "ous"],
    [/ization$/, "ize"],
    [/ation$/, "ate"],
    [/ator$/, "ate"],
    [/alism$/, "al"],
    [/iveness$/, "ive"],
    [/fulness$/, "ful"],
    [/ousness$/, "ous"],
    [/aliti$/, "al"],
    [/iviti$/, "ive"],
    [/biliti$/, "ble"],
    [/ing$/, ""],
    [/edly$/, ""],
    [/ies$/, "i"],
    [/ied$/, "i"],
    [/es$/, ""],
    [/ed$/, ""],
    [/ly$/, ""],
    [/s$/, ""],
  ];
  for (const [re, rep] of rules) {
    if (re.test(w) && w.replace(re, rep).length >= 3) {
      return w.replace(re, rep);
    }
  }
  return w;
}

export function lemmatize(word: string): string {
  const w = word.toLowerCase();
  if (LEMMA_MAP[w]) return LEMMA_MAP[w];
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) return w.slice(0, -1);
  return w;
}

/**
 * Apply a sequence of normalizers to tokens (order matters — teach that).
 *
 * Args:
 *   tokens: Input tokens.
 *   ops: Normalizer names in application order.
 *
 * Returns:
 *   New token array with norm/lemma/isStop filled.
 *
 * Examples:
 *   >>> normalize([{text:"Running",start:0,end:7}], ["lower","lemmatize"])[0].lemma
 *   'run'
 */
export function normalize(tokens: readonly Token[], ops: readonly NormalizerName[]): Token[] {
  let out: Token[] = tokens.map((t) => ({ ...t }));
  for (const op of ops) {
    switch (op) {
      case "lower":
        out = out.map((t) => ({
          ...t,
          text: t.text.toLowerCase(),
          norm: t.text.toLowerCase(),
        }));
        break;
      case "stopwords":
        out = out
          .map((t) => {
            const lower = (t.norm ?? t.text).toLowerCase();
            return { ...t, isStop: STOPWORDS.has(lower) };
          })
          .filter((t) => !t.isStop);
        break;
      case "stem":
        out = out.map((t) => {
          const base = (t.norm ?? t.text).toLowerCase();
          return { ...t, norm: stem(base), lemma: stem(base) };
        });
        break;
      case "lemmatize":
        out = out.map((t) => {
          const base = (t.norm ?? t.text).toLowerCase();
          return { ...t, norm: lemmatize(base), lemma: lemmatize(base) };
        });
        break;
      default:
        throw new Error(`Unknown normalizer '${op as string}'`);
    }
  }
  return out;
}

export const NORMALIZER_PACKAGE_API: Record<NormalizerName, string> = {
  lower: "tokens = [t.lower() for t in tokens]",
  stopwords:
    "from nltk.corpus import stopwords\nstop = set(stopwords.words('english'))\ntokens = [t for t in tokens if t.lower() not in stop]",
  stem:
    "from nltk.stem import PorterStemmer\nstemmer = PorterStemmer()\ntokens = [stemmer.stem(t) for t in tokens]",
  lemmatize:
    "import spacy\nnlp = spacy.load('en_core_web_sm')\ndoc = nlp(text)\ntokens = [t.lemma_ for t in doc]",
};
