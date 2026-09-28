/**
 * Topic models: simplified LDA-style word distributions + document mixtures.
 */

import type { FeatureMatrix, Topic, TopicModel } from "./types";
import { makeRng } from "./corpora";

/**
 * Run a tiny collapsed-ish LDA (random + refine) so top words look sensible.
 *
 * Args:
 *   X: Document-term matrix.
 *   k: Number of topics.
 *   seed: PRNG seed.
 *   iters: Refinement passes.
 *
 * Returns:
 *   Topics with top words and per-document mixture when requested later.
 */
export function fitTopics(
  X: FeatureMatrix,
  k = 3,
  seed = 42,
  model: TopicModel = "lda",
  iters = 24,
): { topics: Topic[]; docTopic: number[][] } {
  const rng = makeRng(seed + (model === "nmf" ? 1 : 0));
  const nDocs = X.nDocs;
  const nTerms = X.nTerms;
  if (nDocs === 0 || nTerms === 0) {
    return { topics: [], docTopic: [] };
  }

  // random topic-word distributions
  let tw: number[][] = [];
  for (let t = 0; t < k; t += 1) {
    const row = Array.from({ length: nTerms }, () => 0.05 + rng());
    const s = row.reduce((a, b) => a + b, 0) || 1;
    tw.push(row.map((v) => v / s));
  }
  let dt: number[][] = [];

  for (let it = 0; it < iters; it += 1) {
    // E-step: doc-topic from current topics
    dt = X.rows.map((row) => {
      const mix = new Array<number>(k).fill(0.01);
      for (let j = 0; j < nTerms; j += 1) {
        const w = row[j] ?? 0;
        if (w <= 0) continue;
        for (let t = 0; t < k; t += 1) {
          mix[t] = (mix[t] ?? 0) + w * (tw[t]?.[j] ?? 0);
        }
      }
      const s = mix.reduce((a, b) => a + b, 0) || 1;
      return mix.map((v) => v / s);
    });
    // M-step: topic-word from docs
    const acc = Array.from({ length: k }, () => new Array<number>(nTerms).fill(0.05));
    for (let d = 0; d < nDocs; d += 1) {
      const row = X.rows[d] ?? [];
      const mix = dt[d] ?? [];
      for (let t = 0; t < k; t += 1) {
        const a = acc[t]!;
        for (let j = 0; j < nTerms; j += 1) {
          a[j] = (a[j] ?? 0) + (row[j] ?? 0) * (mix[t] ?? 0);
        }
      }
    }
    tw = acc.map((row) => {
      const s = row.reduce((a, b) => a + b, 0) || 1;
      return row.map((v) => v / s);
    });
  }

  const topics: Topic[] = tw.map((row, t) => ({
    id: t,
    topWords: row
      .map((weight, j) => ({ term: X.terms[j] ?? "", weight }))
      .filter((x) => x.term)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8),
  }));

  return { topics, docTopic: dt };
}

export function topicPackageApi(model: TopicModel): string {
  return model === "lda"
    ? "from gensim.models import LdaModel\nfrom gensim.corpora import Dictionary\ndct = Dictionary(tokenized_docs)\ncorpus = [dct.doc2bow(d) for d in tokenized_docs]\nlda = LdaModel(corpus, num_topics=3, id2word=dct)"
    : "from sklearn.decomposition import NMF\nnmf = NMF(n_components=3)\nW = nmf.fit_transform(X)\nH = nmf.components_";
}
