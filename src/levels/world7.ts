/**
 * World 7 — Topics.
 */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD7_LEVELS: Level[] = [
  {
    id: "7.1",
    world: "w7",
    worldTitle: "Topics",
    title: "Topic as word distribution",
    concept: {
      title: "A topic is a bag of words that co-vary",
      body:
        "LDA treats each document as a mixture of topics and each topic as a distribution over words. You do not label topics in advance — you inspect top words and name them afterward. Gensim LdaModel and sklearn NMF are the two production tools.",
      whatHappens:
        "`load docs` (mixed sports/tech/finance text), `vectorize tfidf`, `topic lda 3`. The output lists top words per topic. If the corpus is clean, one topic should look like sports, one like tech, one like finance.",
      why:
        "Topic models are exploratory instruments. They surface structure when you have no labels — document archives, support tickets, research corpora.",
      formula: "φ_topic(word) · θ_doc(topic)",
      callout: "Topics need human naming. The model only gives you word weights.",
      packages: ["gensim LdaModel", "sklearn NMF"],
    },
    goal: "Fit an LDA topic model and read top words.",
    hints: ["`load docs` → `tokenize word` → `vectorize tfidf` → `topic lda 3`."],
    learning: ["LDA", "topic-word distributions", "corpus exploration"],
    seedCorpus: "docs",
    steps: [
      {
        id: "vec",
        label: "Vectorize docs",
        detail: "Need a DTM.",
        command: "vectorize tfidf",
        check: (s) => Boolean(s.features),
      },
      {
        id: "topic",
        label: "Fit LDA",
        detail: "k topics.",
        command: "topic lda 3",
        check: (s) => Boolean(s.topics?.length),
      },
    ],
    win: (s) => {
      if (!s.topics?.length) return fail("Run `topic lda 3`.");
      return win("Topics are distributions you name. Use them for exploration, not for truth.");
    },
  },
  {
    id: "7.2",
    world: "w7",
    worldTitle: "Topics",
    title: "Documents are mixtures",
    concept: {
      title: "Every doc is a blend",
      body:
        "A news article can be 70% politics and 30% economy. LDA's θ vector is that blend. Reading mixtures beats forcing one label per document when topics overlap — which they always do in real corpora.",
      whatHappens:
        "`topic lda 3` prints the first document's mixture in the output line `doc0 mixture`. Compare with `topic nmf 3` for a non-probabilistic factorization.",
      why:
        "Single-label classification pretends the world is clean. Mixtures are how analysts actually read archives.",
      callout: "If you force one label, you lose the second story in the article.",
      packages: ["gensim θ / φ", "sklearn NMF W/H"],
    },
    goal: "Inspect document mixtures and try NMF as an alternative.",
    hints: ["`topic lda 3` then `topic nmf 3`."],
    learning: ["doc-topic mixtures", "NMF vs LDA", "soft labels"],
    seedCorpus: "docs",
    steps: [
      {
        id: "lda",
        label: "Fit LDA",
        detail: "Probabilistic topics.",
        command: "topic lda 3",
        check: (s) => s.topics?.length === 3 || Boolean(s.topics?.length),
      },
      {
        id: "nmf",
        label: "Fit NMF",
        detail: "Matrix factorization topics.",
        command: "topic nmf 3",
        check: (s) => Boolean(s.topics?.length),
      },
    ],
    win: (s) => {
      if (!s.topics?.length) return fail("Fit a topic model first.");
      return win("Documents are mixtures. Soft structure beats forced buckets.");
    },
  },
];
