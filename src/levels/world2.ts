/**
 * World 2 — Bag of words.
 */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD2_LEVELS: Level[] = [
  {
    id: "2.1",
    world: "w2",
    worldTitle: "Bag of words",
    title: "Count vectors",
    concept: {
      title: "A document becomes a row of counts",
      body:
        "Bag-of-words throws away order and keeps frequency. Each document is a vector in |V| dimensions, mostly zeros. That sparsity is not a bug — it is the geometry of text. CountVectorizer in scikit-learn is the production name for this exact step.",
      whatHappens:
        "`vectorize count` builds a document-term matrix. `show features` draws the heatmap so you can see how empty the matrix really is. The dock prints CountVectorizer.fit_transform.",
      why:
        "Once text is a matrix, every classical ML tool works: logistic regression, SVM, Naive Bayes. The representation is often the model's real bottleneck.",
      formula: "X[d, t] = count(term t in doc d)",
      callout: "Order disappears. \"not good\" and \"good not\" become the same row.",
      packages: ["scikit-learn CountVectorizer"],
    },
    goal: "Tokenize, vectorize with count, and inspect the feature matrix.",
    hints: ["`tokenize word` → `vectorize count` → `show features`."],
    learning: ["bag of words", "document-term matrix", "sparsity"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "tok",
        label: "Tokenize",
        detail: "Words before counts.",
        command: "tokenize word",
        check: (s) => Boolean(s.tokens?.length),
      },
      {
        id: "vec",
        label: "Vectorize count",
        detail: "Build DTM.",
        command: "vectorize count",
        check: (s) => s.vectorizer === "count" && Boolean(s.features),
      },
      {
        id: "show",
        label: "Inspect features",
        detail: "See the matrix.",
        command: "show features",
        check: (s) => s.inspectedFeatures,
      },
    ],
    win: (s) => {
      if (s.vectorizer !== "count" || !s.features) return fail("`vectorize count` first.");
      if (!s.inspectedFeatures) return fail("`show features` to see the matrix.");
      return win("Text is a sparse matrix. That is the whole trick of classical NLP.");
    },
  },
  {
    id: "2.2",
    world: "w2",
    worldTitle: "Bag of words",
    title: "TF-IDF weights rarity",
    concept: {
      title: "Rare terms deserve more vote",
      body:
        "Raw counts let common words dominate. TF-IDF multiplies term frequency by inverse document frequency so words that appear in every document (\"the\", \"movie\") shrink and words that are distinctive (\"superb\", \"dreadful\") grow. This is still bag-of-words — just with a better weighing scale.",
      whatHappens:
        "`vectorize tfidf` rebuilds the matrix with idf weights. Compare `show features` against the count matrix. The formula panel shows the sklearn TfidfVectorizer definition.",
      why:
        "Search ranking, text classification, and clustering all improved the day teams stopped using raw counts. TF-IDF is still a strong baseline for small labeled datasets.",
      formula: "tfidf(t, d) = (1 + log tf(t,d)) · log((N+1)/(df(t)+1)) + 1",
      callout: "If accuracy matters, try TF-IDF before you reach for a transformer.",
      packages: ["scikit-learn TfidfVectorizer"],
    },
    goal: "Vectorize with tfidf and inspect the weighted matrix.",
    hints: ["`tokenize word` → `vectorize tfidf` → `show features`."],
    learning: ["term frequency", "inverse document frequency", "sklearn TF-IDF"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "tok",
        label: "Tokenize",
        detail: "Need tokens.",
        command: "tokenize word",
        check: (s) => Boolean(s.tokens?.length),
      },
      {
        id: "vec",
        label: "Vectorize tfidf",
        detail: "Weighted DTM.",
        command: "vectorize tfidf",
        check: (s) => s.vectorizer === "tfidf" && Boolean(s.features),
      },
      {
        id: "show",
        label: "Inspect features",
        detail: "See weights.",
        command: "show features",
        check: (s) => s.inspectedFeatures,
      },
    ],
    win: (s) => {
      if (s.vectorizer !== "tfidf") return fail("Use `vectorize tfidf`, not count.");
      if (!s.inspectedFeatures) return fail("Inspect the weighted matrix.");
      return win("TF-IDF is bag-of-words with judgment. Still the first thing to beat.");
    },
  },
  {
    id: "2.3",
    world: "w2",
    worldTitle: "Bag of words",
    title: "Sparsity is the geometry",
    concept: {
      title: "Most of your matrix is zero",
      body:
        "A vocabulary of 5,000 terms and 20 documents gives a 20×5,000 matrix that is almost entirely zeros. Cosine similarity ignores the shared empty dimensions and focuses on the overlap of present terms. Understanding sparsity explains why linear models on TF-IDF work so well — and why dense embeddings feel like a different universe.",
      whatHappens:
        "Build a TF-IDF matrix and run `similarity` between two reviews. The score is cosine on sparse rows. Then switch to embeddings and compare methods in the output.",
      why:
        "Sparsity dictates storage (CSR), model choice (linear + log-loss), and latency. Teams that densify text early pay for it in memory.",
      callout: "Zeros are free information: those terms were not in the document.",
      packages: ["scikit-learn cosine_similarity", "scipy sparse"],
    },
    goal: "Build features and compute similarity between two documents.",
    hints: [
      "`load reviews` → `tokenize word` → `vectorize tfidf`",
      "`similarity r1 r3` (two positive reviews) and `similarity r1 r7` (pos vs neg).",
    ],
    learning: ["sparsity", "cosine on BoW", "document similarity"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "vec",
        label: "Build features",
        detail: "TF-IDF matrix.",
        command: "vectorize tfidf",
        check: (s) => Boolean(s.features),
      },
      {
        id: "sim",
        label: "Similarity of two docs",
        detail: "Cosine score.",
        command: "similarity r1 r3",
        check: (s) => s.similarities.length > 0,
      },
    ],
    win: (s) => {
      if (!s.features) return fail("Vectorize first.");
      if (s.similarities.length === 0) return fail("Run `similarity r1 r3`.");
      return win("Sparse geometry is the honest one. Cosine only cares about what is present.");
    },
  },
];
