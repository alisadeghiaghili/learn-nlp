/**
 * World 9 — Package zoo and production order.
 */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD9_LEVELS: Level[] = [
  {
    id: "9.1",
    world: "w9",
    worldTitle: "Package zoo",
    title: "NLTK vs spaCy vs HF",
    concept: {
      title: "Right tool, right job",
      body:
        "NLTK is a teaching and research kitchen sink: corpora, stemmers, classic algorithms. spaCy is the production pipeline for tagging and parsing. Hugging Face Transformers is the fine-tuning / SOTA layer. Gensim owns topics and word vectors. Using all of them everywhere is how pipelines rot.",
      whatHappens:
        "`compare pkg nltk spaCy` (or `sklearn transformers`) prints a side-by-side brief. There is no quiz — there is a decision you can defend.",
      why:
        "Architecture is choosing boundaries. The wrong library in the wrong layer is a future migration.",
      callout: "Pick the boring tool that owns that layer well.",
      packages: ["NLTK", "spaCy", "HF Transformers", "gensim"],
    },
    goal: "Compare at least two packages in the zoo.",
    hints: ["`compare pkg nltk spaCy`", "`compare pkg sklearn transformers`"],
    learning: ["tool boundaries", "production defaults", "when to use what"],
    steps: [
      {
        id: "cmp",
        label: "compare pkg",
        detail: "At least one pair.",
        command: "compare pkg nltk spaCy",
        check: (s) => Boolean(s.compared?.length),
      },
    ],
    win: (s) => {
      if (!s.compared?.length) return fail("Run `compare pkg nltk spaCy`.");
      return win("Libraries are architectural choices. Choose them on purpose.");
    },
  },
  {
    id: "9.2",
    world: "w9",
    worldTitle: "Package zoo",
    title: "When TF-IDF still wins",
    concept: {
      title: "Boring is a strategy",
      body:
        "On small labeled datasets with stable vocabulary, TF-IDF + logistic regression matches or beats deep models while staying auditable, cheap, and debuggable. Reaching for a transformer first is cargo-cult engineering. Measure the baseline; then spend budget.",
      whatHappens:
        "Full classical path on reviews: tokenize → normalize → vectorize tfidf → split → fit logistic → score test → cm. If F1 is respectable, you already have a production candidate.",
      why:
        "Latency, cost, and interpretability are features. A model you can explain to support ships faster.",
      callout: "If TF-IDF + linear meets the bar, stop.",
      packages: ["sklearn TfidfVectorizer", "sklearn LogisticRegression"],
    },
    goal: "Complete the classical pipeline and publish test F1.",
    hints: [
      "`load reviews` → `tokenize word` → `normalize lower lemmatize` → `vectorize tfidf`",
      "`split test_size=0.25` → `fit logistic` → `score test`",
    ],
    learning: ["classical baseline", "shipping criteria", "cost of complexity"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "vec",
        label: "TF-IDF features",
        detail: "Boring and strong.",
        command: "vectorize tfidf",
        check: (s) => Boolean(s.features),
      },
      {
        id: "fit",
        label: "fit logistic",
        detail: "Linear model.",
        command: "fit logistic",
        check: (s) => s.fitted && s.model === "logistic",
      },
      {
        id: "score",
        label: "score test",
        detail: "Publish the number.",
        check: (s) => s.scoredOn === "test" && Boolean(s.metrics),
      },
    ],
    win: (s) => {
      if (!s.features || !s.fitted || s.scoredOn !== "test") {
        return fail("Finish tokenize → vectorize → split → fit → score test.");
      }
      return win("Classical baselines are how you know when complexity is justified.");
    },
  },
  {
    id: "9.3",
    world: "w9",
    worldTitle: "Package zoo",
    title: "Production pipeline order",
    concept: {
      title: "Pipeline is a contract about leakage",
      body:
        "sklearn Pipeline exists so vectorizer and model are fit on the same train fold and frozen together. joblib.dump saves the whole contract. In deep stacks the contract is a preprocessing config + tokenizer file + model card. Order is the API.",
      whatHappens:
        "`pipeline` prints the leak-free order and the sklearn Pipeline snippet. Then you close the curriculum by running a clean end-to-end pass.",
      why:
        "Most production NLP bugs are order bugs: test in train, tokenizer refit on prod, threshold tuned on test. Pipelines make illegal order hard to type.",
      callout: "If the order can drift in code review, it will drift in prod.",
      packages: ["sklearn Pipeline", "joblib.dump", "HF tokenizer save_pretrained"],
    },
    goal: "Read the pipeline lesson and complete a clean end-to-end run.",
    hints: ["`pipeline`", "Then full path on reviews with split → fit → score test."],
    learning: ["Pipeline order", "serialization contracts", "leak-proof design"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "pipe",
        label: "pipeline lesson",
        detail: "Leak-free order.",
        command: "pipeline",
        check: (s) => s.pipelineSaved,
      },
      {
        id: "split",
        label: "Split",
        detail: "Hold out test.",
        command: "split test_size=0.25",
        check: (s) => Boolean(s.split),
      },
      {
        id: "fit",
        label: "Fit",
        detail: "Train only.",
        check: (s) => s.fitted,
      },
      {
        id: "score",
        label: "Score test",
        detail: "One honest number.",
        check: (s) => s.scoredOn === "test" && Boolean(s.metrics),
      },
    ],
    win: (s) => {
      if (!s.pipelineSaved) return fail("Start with `pipeline`.");
      if (!s.split || !s.fitted || s.scoredOn !== "test") {
        return fail("Complete split → fit → score test.");
      }
      return win("End to end, leak-free. That is a shippable NLP path.");
    },
  },
];
