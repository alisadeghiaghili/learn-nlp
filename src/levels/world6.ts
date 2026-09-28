/**
 * World 6 — Embeddings.
 */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD6_LEVELS: Level[] = [
  {
    id: "6.1",
    world: "w6",
    worldTitle: "Embeddings",
    title: "Word2Vec",
    concept: {
      title: "Co-occurrence becomes coordinates",
      body:
        "Word2Vec (CBOW / skip-gram) turns the distributional hypothesis into a vector space. Words that share contexts share directions. Classic analogies (king − man + woman ≈ queen) are a symptom of that geometry — not the goal.",
      whatHappens:
        "`embed word2vec` builds vectors from local windows. `nearest <word>` retrieves neighbors. The stage scatters the first two dimensions so you can see clusters form.",
      why:
        "Static embeddings are still used for search features, initialization, and cheap similarity. Understanding them makes transformers less mysterious.",
      formula: "P(context | word) ≈ softmax(v_word · v_context)",
      callout: "One vector per word — so \"bank\" of river and bank of money collide.",
      packages: ["gensim Word2Vec", "spaCy vectors"],
    },
    goal: "Build word2vec embeddings and query neighbors.",
    hints: ["`load sentences` → `tokenize word` → `embed word2vec` → `nearest cat`."],
    learning: ["distributional semantics", "skip-gram intuition", "static embeddings"],
    seedCorpus: "sentences",
    steps: [
      {
        id: "embed",
        label: "embed word2vec",
        detail: "Build the space.",
        command: "embed word2vec",
        check: (s) => s.embedding?.name === "word2vec",
      },
      {
        id: "nn",
        label: "Nearest neighbors",
        detail: "Query the space.",
        command: "nearest cat",
        check: (s) => Boolean(s.embedding),
      },
    ],
    win: (s) => {
      if (s.embedding?.name !== "word2vec") return fail("Use `embed word2vec`.");
      return win("Meaning as context geometry. That is the core of modern NLP.");
    },
  },
  {
    id: "6.2",
    world: "w6",
    worldTitle: "Embeddings",
    title: "Subword and FastText",
    concept: {
      title: "Morphology is reusable signal",
      body:
        "FastText composes word vectors from character n-grams. \"unhappiness\" shares grams with \"happy\" and \"unhappy\", so even unseen words get a sensible vector. This is the same intuition as BPE — both attack OOV with pieces.",
      whatHappens:
        "`embed fasttext` then `nearest` on a rare form. The OOV policy in the output changes from \"drop\" to \"compose subword n-grams\".",
      why:
        "Product names, typos, and agglutinative languages destroy fixed vocabularies. Subwords are the industrial fix.",
      callout: "If your vocabulary explodes, you are ready for subwords.",
      packages: ["gensim FastText", "HF Tokenizers BPE"],
    },
    goal: "Build fasttext embeddings and inspect OOV behavior.",
    hints: ["`embed fasttext` then `nearest love`."],
    learning: ["character n-grams", "OOV composition", "FastText"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "embed",
        label: "embed fasttext",
        detail: "Subword-friendly space.",
        command: "embed fasttext",
        check: (s) => s.embedding?.name === "fasttext",
      },
      {
        id: "nn",
        label: "Query neighbors",
        detail: "See OOV policy.",
        check: (s) => Boolean(s.embedding),
      },
    ],
    win: (s) => {
      if (s.embedding?.name !== "fasttext") return fail("Use `embed fasttext`.");
      return win("Subwords make OOV a soft failure instead of a hard crash.");
    },
  },
  {
    id: "6.3",
    world: "w6",
    worldTitle: "Embeddings",
    title: "Sentence embeddings",
    concept: {
      title: "One vector for the whole text",
      body:
        "SentenceTransformers encode a full sentence into one vector optimized for semantic similarity. Mean-pooling word vectors is the toy version; the real models train on pairs and triples so paraphrases land near each other. This is the backbone of modern retrieval and RAG.",
      whatHappens:
        "`embed sbert` builds doc-level vectors. `similarity s1 s2` now uses cosine in that space — closer on paraphrases than TF-IDF was.",
      why:
        "FAQ matching, semantic search, clustering tickets — all shipped on sentence embeddings because they fail gracefully on wording changes.",
      callout: "Retrieval quality is embedding quality. Everything else is indexing.",
      packages: ["sentence-transformers", "HF AutoModel mean pooling"],
    },
    goal: "Build sbert embeddings and compare two related sentences.",
    hints: ["`load sentences` → `tokenize word` → `embed sbert` → `similarity s1 s2`."],
    learning: ["sentence encoders", "semantic similarity", "RAG foundations"],
    seedCorpus: "sentences",
    steps: [
      {
        id: "embed",
        label: "embed sbert",
        detail: "Sentence-level vectors.",
        command: "embed sbert",
        check: (s) => s.embedding?.name === "sbert",
      },
      {
        id: "sim",
        label: "Similarity under sbert",
        detail: "Paraphrase pair.",
        command: "similarity s1 s2",
        check: (s) => s.similarities.length > 0,
      },
    ],
    win: (s) => {
      if (s.embedding?.name !== "sbert") return fail("Use `embed sbert`.");
      if (!s.similarities.length) return fail("Run `similarity s1 s2`.");
      return win("One vector per sentence. That is how search stops depending on exact words.");
    },
  },
];
