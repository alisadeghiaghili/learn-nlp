/**
 * World 3 — Geometry of meaning.
 */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD3_LEVELS: Level[] = [
  {
    id: "3.1",
    world: "w3",
    worldTitle: "Geometry of meaning",
    title: "Cosine similarity",
    concept: {
      title: "Angle matters more than length",
      body:
        "Two documents that use the same words at different frequencies still point in a similar direction. Cosine similarity is the cosine of the angle between their vectors — 1 means same direction, 0 means orthogonal. It is the default metric for text because document length is mostly noise.",
      whatHappens:
        "Load the sentences corpus (paraphrase pairs and unrelated pairs). `similarity s1 s2` should score high for \"The cat sat on the mat\" vs \"A feline rested on the rug\" — though bag-of-words will under-score true paraphrases without embeddings.",
      why:
        "Retrieval, deduplication, and clustering all reduce to a similarity function. If the similarity is wrong, every system above it is wrong.",
      formula: "cos(a, b) = (a·b) / (||a|| ||b||)",
      callout: "BoW similarity fails on paraphrase. Embeddings fix that in World 6.",
      packages: ["sklearn cosine_similarity", "gensim similarities"],
    },
    goal: "Compare two related sentences and two unrelated sentences.",
    hints: [
      "`load sentences` → `tokenize word` → `vectorize tfidf`",
      "`similarity s1 s2` then `similarity s1 s4`.",
    ],
    learning: ["cosine similarity", "paraphrase detection limits", "retrieval basics"],
    seedCorpus: "sentences",
    steps: [
      {
        id: "vec",
        label: "Build features",
        detail: "TF-IDF on sentences.",
        command: "vectorize tfidf",
        check: (s) => Boolean(s.features),
      },
      {
        id: "near",
        label: "Compare a paraphrase pair",
        detail: "s1 vs s2 should be closer than unrelated pairs.",
        command: "similarity s1 s2",
        check: (s) => s.similarities.length >= 1,
      },
      {
        id: "far",
        label: "Compare unrelated docs",
        detail: "s1 vs s4.",
        command: "similarity s1 s4",
        check: (s) => s.similarities.length >= 2,
      },
    ],
    win: (s) => {
      if (!s.features) return fail("Build features first.");
      if (s.similarities.length < 2) return fail("Compare both a paraphrase pair and an unrelated pair.");
      return win("Similarity is a metric you choose. BoW cosine is the baseline, not the truth.");
    },
  },
  {
    id: "3.2",
    world: "w3",
    worldTitle: "Geometry of meaning",
    title: "Nearest neighbors",
    concept: {
      title: "Retrieval is just sorting by distance",
      body:
        "Search engines, recommendation, and semantic FAQ matching are all nearest-neighbor queries in a vector space. Embed the query, embed the corpus, sort by cosine, take top-k. There is no magic — only a metric and an index.",
      whatHappens:
        "`embed word2vec` then `nearest love` lists the closest words in the toy embedding. In production this is faiss, pgvector, or a managed vector DB.",
      why:
        "Once you can retrieve neighbors, you can build RAG, dedupe tickets, or find similar legal clauses. The engineering is in the index; the science is in the space.",
      callout: "If the space is wrong, the index is fast and wrong.",
      packages: ["gensim most_similar", "faiss", "sentence-transformers"],
    },
    goal: "Build embeddings and run nearest-neighbor search.",
    hints: ["`load sentences` → `tokenize word` → `embed word2vec` → `nearest read`."],
    learning: ["embedding spaces", "nearest neighbor retrieval", "vector search"],
    seedCorpus: "sentences",
    steps: [
      {
        id: "embed",
        label: "Build embeddings",
        detail: "Distributional vectors.",
        command: "embed word2vec",
        check: (s) => Boolean(s.embedding),
      },
      {
        id: "nn",
        label: "Query neighbors",
        detail: "nearest <word>.",
        command: "nearest read",
        check: (s) => s.commandCount > 0 && Boolean(s.embedding),
      },
    ],
    win: (s) => {
      if (!s.embedding) return fail("`embed word2vec` first.");
      return win("Retrieval is sorting in a space you built. Build the space carefully.");
    },
  },
  {
    id: "3.3",
    world: "w3",
    worldTitle: "Geometry of meaning",
    title: "Embeddings vs BoW",
    concept: {
      title: "Distributional meaning",
      body:
        "\"You shall know a word by the company it keeps.\" Word2Vec turns co-occurrence into vectors so similar words land near each other. Sentence embeddings average (or attend over) word vectors so whole texts share a space. This is why paraphrases score higher with embeddings than with TF-IDF.",
      whatHappens:
        "Build both TF-IDF and embeddings on the same corpus. Compare `similarity` scores under each representation. Then `embed sbert` for the sentence-level story.",
      why:
        "BoW is exact and brittle. Embeddings are fuzzy and robust. Production systems often ship both: exact match for filters, embeddings for recall.",
      callout: "Use BoW when labels are scarce and vocabulary is stable. Use embeddings when language varies.",
      packages: ["gensim Word2Vec", "sentence-transformers"],
    },
    goal: "Build an embedding and compare document similarity under it.",
    hints: [
      "`load sentences` → `tokenize word` → `embed sbert`",
      "`similarity s1 s2` (now uses embeddings if present).",
    ],
    learning: ["distributional hypothesis", "sentence embeddings", "representation choice"],
    seedCorpus: "sentences",
    steps: [
      {
        id: "embed",
        label: "Build sentence embeddings",
        detail: "embed sbert",
        command: "embed sbert",
        check: (s) => s.embedding?.name === "sbert",
      },
      {
        id: "sim",
        label: "Similarity under embeddings",
        detail: "Paraphrase pair.",
        command: "similarity s1 s2",
        check: (s) => s.similarities.length > 0,
      },
    ],
    win: (s) => {
      if (s.embedding?.name !== "sbert") return fail("`embed sbert` for sentence-level vectors.");
      if (s.similarities.length === 0) return fail("Run `similarity s1 s2`.");
      return win("Same text, different geometry. Representation is a model of meaning.");
    },
  },
];
