/**
 * Tokenization: whitespace, word (regex), subword (BPE-style), sentence.
 *
 * Faithful enough to teach the mental model of NLTK / spaCy / HF Tokenizers
 * without shipping those libraries.
 */

import type { Token, TokenizerName } from "./types";

const SENTENCE_END = /([.!?]+)\s+/g;
const WORD_RE = /[A-Za-z0-9]+(?:'[A-Za-z]+)?|[^\sA-Za-z0-9]/g;

/**
 * Tokenize raw text with a named strategy.
 *
 * Args:
 *   text: Raw input string.
 *   strategy: Tokenizer flavor.
 *
 * Returns:
 *   Token array with character offsets.
 *
 * Raises:
 *   Error: On unknown strategy.
 *
 * Examples:
 *   >>> tokenize("Hello world.", "word").map(t => t.text)
 *   ['Hello', 'world', '.']
 */
export function tokenize(text: string, strategy: TokenizerName): Token[] {
  switch (strategy) {
    case "whitespace":
      return tokenizeWhitespace(text);
    case "word":
      return tokenizeWord(text);
    case "subword":
      return tokenizeSubword(text);
    case "sentence":
      return tokenizeSentence(text);
    default:
      throw new Error(`Unknown tokenizer '${strategy as string}'`);
  }
}

function tokenizeWhitespace(text: string): Token[] {
  const out: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function tokenizeWord(text: string): Token[] {
  const out: Token[] = [];
  const re = new RegExp(WORD_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/**
 * Word-ish tokens split further into character n-gram style subwords.
 * Good enough to show why BPE / WordPiece exist (OOV, morphology).
 */
function tokenizeSubword(text: string): Token[] {
  const words = tokenizeWord(text);
  const out: Token[] = [];
  for (const w of words) {
    if (!/^[A-Za-z0-9']+$/.test(w.text) || w.text.length <= 4) {
      out.push(w);
      continue;
    }
    const parts = splitSubpieces(w.text);
    let offset = w.start;
    for (const p of parts) {
      const piece = p.startsWith("##") ? p.slice(2) : p;
      out.push({
        text: p,
        start: offset,
        end: offset + piece.length,
      });
      offset += piece.length;
    }
  }
  return out;
}

function splitSubpieces(word: string): string[] {
  const lower = word.toLowerCase();
  if (word.length <= 5) return [word];
  const mid = Math.max(3, Math.floor(word.length * 0.45));
  return [word.slice(0, mid), `##${word.slice(mid)}`, lower === word ? "" : word].filter(
    (p) => p.length > 0,
  ).filter((p, i, arr) => p !== "" && !(i > 0 && p === arr[i - 1]));
}

function tokenizeSentence(text: string): Token[] {
  const out: Token[] = [];
  let start = 0;
  const re = new RegExp(SENTENCE_END.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + m[1].length;
    const sentence = text.slice(start, end).trim();
    if (sentence) {
      const lead = text.slice(start, end).indexOf(sentence);
      const s = start + Math.max(0, lead);
      out.push({ text: sentence, start: s, end: s + sentence.length });
    }
    start = end;
  }
  const tail = text.slice(start).trim();
  if (tail) {
    const lead = text.slice(start).indexOf(tail);
    const s = start + Math.max(0, lead);
    out.push({ text: tail, start: s, end: s + tail.length });
  }
  return out;
}

export const TOKENIZER_PACKAGE_API: Record<TokenizerName, string> = {
  whitespace:
    "tokens = text.split()  # whitespace split",
  word: "from nltk import word_tokenize\ntokens = word_tokenize(text)",
  subword:
    "from tokenizers import Tokenizer\ntok = Tokenizer.from_pretrained('bert-base-uncased')\ntokens = tok.encode(text).tokens",
  sentence:
    "from nltk import sent_tokenize\nsents = sent_tokenize(text)",
};
