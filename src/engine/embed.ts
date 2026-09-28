/**
 * Embeddings: distributional word vectors, subword OOV, sentence vectors.
 *
 * Simulated with co-occurrence + SVD-ish projection so the geometry is real
 * enough to teach nearest neighbors and analogies.
 */

import type { Corpus, EmbedderName, Embedding, Token } from "./types";
import { makeRng } from "./corpora";

const DIM: Record<EmbedderName, number> = {
  word2vec: 32,
  fasttext: 32,
  sbert: 48,
};

/**
 * Build an embedding table from corpus token lists.
 *
 * Args:
 *   docsTokens: Tokens per document (normalized preferred).
 *   mode: word2vec | fasttext | sbert.
 *   seed: PRNG seed for the random projection.
 *
 * Returns:
 *   Embedding with vectors keyed by surface form.
 */
export function buildEmbedding(
  docsTokens: readonly (readonly Token[])[],
  mode: EmbedderName,
  seed = 42,
): Embedding {
  const dim = DIM[mode];
  const counts = new Map<string, Map<string, number>>();
  const window = mode === "sbert" ? 4 : 3;

  for (const tokens of docsTokens) {
    const words = tokens.map((t) => (t.norm ?? t.text).toLowerCase());
    for (let i = 0; i < words.length; i += 1) {
      const w = words[i] ?? "";
      if (!w) continue;
      if (!counts.has(w)) counts.set(w, new Map());
      const neigh = counts.get(w)!;
      for (let j = Math.max(0, i - window); j <= Math.min(words.length - 1, i + window); j += 1) {
        if (j === i) continue;
        const c = words[j] ?? "";
        if (!c) continue;
        neigh.set(c, (neigh.get(c) ?? 0) + 1);
      }
    }
  }

  // Project co-occurrence rows with a fixed random basis (hash features).
  const rng = makeRng(seed);
  const basis = new Map<string, number[]>();
  const vectors = new Map<string, number[]>();
  for (const [word, neigh] of counts) {
    const v = new Array<number>(dim).fill(0);
    for (const [other, w] of neigh) {
      let b = basis.get(other);
      if (!b) {
        b = Array.from({ length: dim }, () => rng() * 2 - 1);
        basis.set(other, b);
      }
      for (let k = 0; k < dim; k += 1) {
        v[k] = (v[k] ?? 0) + w * (b[k] ?? 0);
      }
    }
    vectors.set(word, normalizeVec(v));
  }

  // fastText: also invent subword-stem vectors so OOV has a place to live.
  if (mode === "fasttext") {
    for (const [word] of counts) {
      if (word.length >= 4) {
        const stem = word.slice(0, Math.max(3, word.length - 2));
        if (!vectors.has(stem)) {
          const parent = vectors.get(word);
          if (parent) vectors.set(stem, parent);
        }
      }
    }
  }

  return {
    name: mode,
    dim,
    vectors,
    oovStrategy:
      mode === "fasttext"
        ? "compose subword n-grams (OOV-friendly)"
        : mode === "sbert"
          ? "mean-pooled transformer tokens"
          : "drop OOV (word2vec classic weakness)",
  };
}

function normalizeVec(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => x / n);
}

/**
 * Resolve a word to its vector, with the embedder's OOV policy.
 */
export function lookup(
  emb: Embedding,
  word: string,
): { vector: number[]; oov: boolean } {
  const w = word.toLowerCase();
  const direct = emb.vectors.get(w);
  if (direct) return { vector: [...direct], oov: false };
  if (emb.name === "fasttext") {
    for (const [key, vec] of emb.vectors) {
      if (w.startsWith(key.slice(0, Math.min(4, key.length))) || key.startsWith(w.slice(0, 3))) {
        return { vector: [...vec], oov: true };
      }
    }
    // subword fallback: average char trigrams' random vectors
    const rng = makeRng(hashStr(w));
    return { vector: normalizeVec(Array.from({ length: emb.dim }, () => rng() * 2 - 1)), oov: true };
  }
  return { vector: new Array<number>(emb.dim).fill(0), oov: true };
}

/**
 * Sentence vector = mean of word vectors (the sbert mental model, simplified).
 */
export function sentenceVector(emb: Embedding, tokens: readonly Token[]): number[] {
  const acc = new Array<number>(emb.dim).fill(0);
  let n = 0;
  for (const t of tokens) {
    const { vector } = lookup(emb, t.norm ?? t.text);
    if (vector.every((x) => x === 0)) continue;
    for (let i = 0; i < acc.length; i += 1) acc[i] = (acc[i] ?? 0) + (vector[i] ?? 0);
    n += 1;
  }
  if (n === 0) return acc;
  return normalizeVec(acc.map((x) => x / n));
}

export function nearest(
  emb: Embedding,
  query: readonly number[],
  k = 5,
  exclude?: string,
): { word: string; score: number }[] {
  const out: { word: string; score: number }[] = [];
  for (const [word, vec] of emb.vectors) {
    if (exclude && word === exclude) continue;
    out.push({ word, score: cosine(query, vec) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, k);
}

function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function corpusTokenLists(corpus: Corpus): Token[][] {
  // Lazy import cycle avoidance: callers pass tokenized docs.
  void corpus;
  return [];
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const EMBED_PACKAGE_API: Record<EmbedderName, string> = {
  word2vec:
    "from gensim.models import Word2Vec\nmodel = Word2Vec(sentences, vector_size=100, window=5)\nvec = model.wv['king']",
  fasttext:
    "from gensim.models import FastText\nmodel = FastText(sentences, vector_size=100, min_n=3, max_n=6)\nvec = model.wv['unseen_word']",
  sbert:
    "from sentence_transformers import SentenceTransformer\nmodel = SentenceTransformer('all-MiniLM-L6-v2')\nvec = model.encode(['a feline rested on the rug'])",
};
