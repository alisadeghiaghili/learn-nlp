/**
 * Sequence labelling: POS tags, NER spans, dependency-ish relations.
 * Pattern lexicon + simple heuristics — enough to teach spaCy's mental model.
 */

import type { SequenceSpan, Token } from "./types";

const POS_LEXICON: Record<string, string> = {
  the: "DET", a: "DET", an: "DET", this: "DET", that: "DET",
  i: "PRON", you: "PRON", he: "PRON", she: "PRON", it: "PRON",
  we: "PRON", they: "PRON", my: "PRON", your: "PRON",
  is: "AUX", are: "AUX", was: "AUX", were: "AUX", be: "AUX",
  been: "AUX", being: "AUX", have: "AUX", has: "AUX", had: "AUX",
  do: "AUX", does: "AUX", did: "AUX", will: "AUX", would: "AUX",
  can: "AUX", could: "AUX", should: "AUX", may: "AUX", might: "AUX",
  and: "CCONJ", or: "CCONJ", but: "CCONJ", if: "SCONJ",
  because: "SCONJ", although: "SCONJ", while: "SCONJ",
  in: "ADP", on: "ADP", at: "ADP", by: "ADP", for: "ADP",
  with: "ADP", from: "ADP", to: "ADP", of: "ADP", about: "ADP",
  not: "PART", no: "DET", yes: "INTJ",
  cat: "NOUN", dog: "NOUN", mat: "NOUN", rug: "NOUN", film: "NOUN",
  movie: "NOUN", story: "NOUN", team: "NOUN", player: "NOUN",
  match: "NOUN", game: "NOUN", data: "NOUN", model: "NOUN",
  language: "NOUN", text: "NOUN", token: "NOUN", vector: "NOUN",
  network: "NOUN", research: "NOUN", paper: "NOUN", market: "NOUN",
  stock: "NOUN", bank: "NOUN", rate: "NOUN", election: "NOUN",
  vote: "NOUN", bill: "NOUN", law: "NOUN", government: "NOUN",
  president: "NOUN", senate: "NOUN", party: "NOUN", coach: "NOUN",
  city: "NOUN", country: "NOUN", company: "NOUN", university: "NOUN",
  loved: "VERB", love: "VERB", loves: "VERB", visit: "VERB",
  visited: "VERB", meet: "VERB", met: "VERB", announce: "VERB",
  announced: "VERB", win: "VERB", won: "VERB", score: "VERB",
  scored: "VERB", prepare: "VERB", prepared: "VERB", release: "VERB",
  released: "VERB", publish: "VERB", published: "VERB", found: "VERB",
  founded: "VERB", sign: "VERB", signed: "VERB", raise: "VERB",
  raised: "VERB", drop: "VERB", dropped: "VERB", buy: "VERB",
  bought: "VERB", enjoy: "VERB", enjoys: "VERB", read: "VERB",
  reading: "VERB", barking: "VERB", sat: "VERB", sitting: "VERB",
  superb: "ADJ", wonderful: "ADJ", great: "ADJ", beautiful: "ADJ",
  brilliant: "ADJ", charming: "ADJ", excellent: "ADJ", terrible: "ADJ",
  awful: "ADJ", boring: "ADJ", horrible: "ADJ", delightful: "ADJ",
  new: "ADJ", old: "ADJ", good: "ADJ", bad: "ADJ", best: "ADJ",
  worst: "ADJ", cold: "ADJ", rainy: "ADJ", modern: "ADJ",
  quickly: "ADV", very: "ADV", again: "ADV", yesterday: "ADV",
  today: "ADV", sharply: "ADV", especially: "ADV",
};

const MONTHS = new Set([
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
]);

const ORG_HINTS = new Set([
  "organization", "university", "company", "agency", "institute",
  "association", "union", "party", "club", "bank", "google",
  "microsoft", "apple", "stanford", "health", "world",
]);

const GPE_HINTS = new Set([
  "berlin", "paris", "london", "tokyo", "tokyo", "california",
  "texas", "austin", "cupertino", "europe", "asia", "canada",
  "japan", "america", "uk", "usa",
]);

/**
 * Assign POS tags with a lexicon + suffix heuristics.
 */
export function tagPos(tokens: readonly Token[]): Token[] {
  return tokens.map((t) => {
    const w = (t.text || "").toLowerCase();
    const clean = w.replace(/[^\w']/g, "");
    let pos = POS_LEXICON[clean];
    if (!pos) {
      if (/^\d+$/.test(clean)) pos = "NUM";
      else if (/^[A-Z][a-z]+$/.test(t.text)) pos = "PROPN";
      else if (/ly$/.test(clean)) pos = "ADV";
      else if (/ing$/.test(clean) || /ed$/.test(clean) || /ize$/.test(clean)) pos = "VERB";
      else if (/ous$|ful$|ive$|al$|ic$/.test(clean)) pos = "ADJ";
      else if (/tion$|ment$|ness$|ity$|er$|or$/.test(clean)) pos = "NOUN";
      else pos = "NOUN";
    }
    return { ...t, pos, norm: t.norm ?? t.text };
  });
}

/**
 * Extract simple NER spans (PER/ORG/GPE/DATE/MISC) from word tokens.
 */
export function extractEntities(tokens: readonly Token[]): SequenceSpan[] {
  const words = tokens.map((t) => ({
    text: t.text,
    start: t.start,
    end: t.end,
  }));
  const spans: SequenceSpan[] = [];
  let i = 0;
  while (i < words.length) {
    const w = words[i]!;
    const lower = w.text.toLowerCase().replace(/[^\w']/g, "");
    // DATE: year or month
    if (/^\d{4}$/.test(w.text) || MONTHS.has(lower)) {
      let end = w.end;
      let text = w.text;
      const next = words[i + 1];
      if (MONTHS.has(lower) && next && /^\d+$/.test(next.text)) {
        text = `${w.text} ${next.text}`;
        end = next.end;
        i += 1;
      }
      spans.push({ text, label: "DATE", start: w.start, end });
      i += 1;
      continue;
    }
    // Multiword capitalized
    if (/^[A-Z]/.test(w.text)) {
      let j = i;
      const parts: string[] = [];
      while (j < words.length && /^[A-Z]/.test(words[j]!.text) && j - i < 4) {
        parts.push(words[j]!.text);
        j += 1;
      }
      const text = parts.join(" ");
      const last = words[j - 1]!;
      let label = "MISC";
      const lastLower = last.text.toLowerCase();
      if (ORG_HINTS.has(lastLower) || ORG_HINTS.has(parts[parts.length - 2]?.toLowerCase() ?? "")) {
        label = "ORG";
      } else if (GPE_HINTS.has(lower) || GPE_HINTS.has(lastLower)) {
        label = "GPE";
      } else if (parts.length >= 2) {
        label = "PERSON";
      } else if (ORG_HINTS.has(lower)) {
        label = "ORG";
      } else {
        label = "PROPN";
        // treat single uncommon capitalized as MISC
        if (parts.length === 1) label = "MISC";
      }
      // known names
      const nameKey = text.toLowerCase();
      if (nameKey.includes("barack") || nameKey.includes("angela") || nameKey.includes("steve") || nameKey.includes("elon") || nameKey.includes("marie")) {
        label = "PERSON";
      }
      if (label === "PROPN") label = "MISC";
      spans.push({ text, label, start: w.start, end: last.end });
      i = j;
      continue;
    }
    i += 1;
  }
  return spans;
}

/**
 * Toy dependency relations: head is usually the nearest verb.
 */
export function parseDeps(tokens: readonly Token[]): { word: string; head: string; rel: string }[] {
  const tagged = tagPos(tokens);
  const verbIdx = tagged.findIndex((t) => t.pos === "VERB" || t.pos === "AUX");
  const headWord = verbIdx >= 0 ? (tagged[verbIdx]?.text ?? "ROOT") : "ROOT";
  return tagged.map((t, i) => {
    if (t.pos === "VERB" || (verbIdx === i && t.pos === "AUX")) {
      return { word: t.text, head: "ROOT", rel: "ROOT" };
    }
    if (t.pos === "DET") return { word: t.text, head: headWord, rel: "det" };
    if (t.pos === "ADP") return { word: t.text, head: headWord, rel: "prep" };
    if (t.pos === "ADJ") return { word: t.text, head: headWord, rel: "amod" };
    if (t.pos === "ADV") return { word: t.text, head: headWord, rel: "advmod" };
    if (t.pos === "PROPN") return { word: t.text, head: headWord, rel: "nsubj" };
    return { word: t.text, head: headWord, rel: "dep" };
  });
}

/**
 * Scaled dot-product attention over token embeddings (teaching the map).
 */
export function attentionMap(
  tokens: readonly Token[],
  vectors: readonly number[][],
): { from: number; to: number; weight: number }[] {
  const n = tokens.length;
  const cells: { from: number; to: number; weight: number }[] = [];
  const dim = vectors[0]?.length ?? 1;
  const scale = 1 / Math.sqrt(Math.max(1, dim));
  for (let i = 0; i < n; i += 1) {
    const q = vectors[i] ?? [];
    const scores: number[] = [];
    for (let j = 0; j < n; j += 1) {
      const k = vectors[j] ?? [];
      let dot = 0;
      for (let d = 0; d < dim; d += 1) dot += (q[d] ?? 0) * (k[d] ?? 0);
      scores.push(dot * scale);
    }
    const max = Math.max(...scores);
    const exps = scores.map((s) => Math.exp(s - max));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    for (let j = 0; j < n; j += 1) {
      cells.push({ from: i, to: j, weight: (exps[j] ?? 0) / sum });
    }
  }
  return cells;
}

export const SEQUENCE_PACKAGE_API = {
  pos: "import spacy\nnlp = spacy.load('en_core_web_sm')\ndoc = nlp(text)\ntags = [(t.text, t.pos_) for t in doc]",
  ner: "import spacy\nnlp = spacy.load('en_core_web_sm')\ndoc = nlp(text)\nentities = [(ent.text, ent.label_) for ent in doc.ents]",
  dep: "import spacy\nnlp = spacy.load('en_core_web_sm')\ndoc = nlp(text)\ndeps = [(t.text, t.head.text, t.dep_) for t in doc]",
  attention:
    "from transformers import AutoModel, AutoTokenizer\nimport torch\nmodel = AutoModel.from_pretrained('bert-base-uncased', output_attentions=True)\nout = model(**tokenizer(text, return_tensors='pt'))\nattn = out.attentions[0]",
} as const;
