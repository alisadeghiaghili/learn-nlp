/**
 * Vectorization: bag-of-words counts, TF-IDF, vocabulary, cosine similarity.
 */

import type {
  FeatureMatrix,
  Token,
  VectorizerName,
  VocabEntry,
} from "./types";

/**
 * Build a vocabulary from token lists (one list per document).
 *
 * Args:
 *   docsTokens: Token arrays, one per document.
 *
 * Returns:
 *   Sorted vocabulary entries with document frequency and idf.
 */
export function buildVocab(docsTokens: readonly (readonly Token[])[]): VocabEntry[] {
  const df = new Map<string, number>();
  for (const tokens of docsTokens) {
    const seen = new Set<string>();
    for (const t of tokens) {
      const term = (t.norm ?? t.text).toLowerCase();
      if (!term || term.length === 0) continue;
      if (!seen.has(term)) {
        seen.add(term);
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }
  }
  const n = Math.max(1, docsTokens.length);
  return [...df.entries()]
    .map(([term, d]) => ({
      term,
      df: d,
      idf: Math.log((n + 1) / (d + 1)) + 1,
    }))
    .sort((a, b) => a.term.localeCompare(b.term));
}

/**
 * Fit a document-term matrix.
 *
 * Args:
 *   docsTokens: Tokens per document.
 *   vocab: Vocabulary (from train ideally).
 *   mode: count | bow | tfidf (bow is alias for count in this sandbox).
 *
 * Returns:
 *   FeatureMatrix of nDocs × nTerms.
 *
 * Examples:
 *   >>> const v = buildVocab([[{text:"cat",start:0,end:3}]]);
 *   >>> fitFeatures([[{text:"cat",start:0,end:3}]], v, "count").rows[0][0]
 *   1
 */
export function fitFeatures(
  docsTokens: readonly (readonly Token[])[],
  vocab: readonly VocabEntry[],
  mode: VectorizerName,
): FeatureMatrix {
  const index = new Map(vocab.map((v, i) => [v.term, i]));
  const rows: number[][] = [];
  for (const tokens of docsTokens) {
    const row = new Array<number>(vocab.length).fill(0);
    for (const t of tokens) {
      const term = (t.norm ?? t.text).toLowerCase();
      const j = index.get(term);
      if (j === undefined) continue;
      row[j] = (row[j] ?? 0) + 1;
    }
    if (mode === "tfidf") {
      for (let j = 0; j < row.length; j += 1) {
        const tf = row[j] ?? 0;
        const idf = vocab[j]?.idf ?? 1;
        row[j] = tf > 0 ? (1 + Math.log(tf)) * idf : 0;
      }
    }
    rows.push(row);
  }
  return {
    nDocs: rows.length,
    nTerms: vocab.length,
    terms: vocab.map((v) => v.term),
    rows,
  };
}

/**
 * Cosine similarity between two sparse-ish vectors.
 */
export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function topTerms(row: readonly number[], terms: readonly string[], k = 8): { term: string; weight: number }[] {
  return row
    .map((w, i) => ({ term: terms[i] ?? "", weight: w }))
    .filter((x) => x.weight > 0 && x.term)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, k);
}

export const VECTORIZER_PACKAGE_API: Record<VectorizerName, string> = {
  count:
    "from sklearn.feature_extraction.text import CountVectorizer\ncv = CountVectorizer()\nX = cv.fit_transform(docs)",
  bow: "from sklearn.feature_extraction.text import CountVectorizer\ncv = CountVectorizer(analyzer='word')\nX = cv.fit_transform(docs)",
  tfidf:
    "from sklearn.feature_extraction.text import TfidfVectorizer\ntfidf = TfidfVectorizer()\nX = tfidf.fit_transform(docs)",
};
