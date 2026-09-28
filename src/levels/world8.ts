/**
 * World 8 — Transformers.
 */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD8_LEVELS: Level[] = [
  {
    id: "8.1",
    world: "w8",
    worldTitle: "Transformers",
    title: "Subword tokens",
    concept: {
      title: "Words are not the unit transformers use",
      body:
        "BERT and friends tokenize with WordPiece / BPE. \"unbelievable\" may become `un ##bel ##ie ##v ##able`. The vocabulary is fixed and small; every word becomes pieces. That is why typos and neologisms still encode.",
      whatHappens:
        "`tokenize subword` splits long words into pieces with the `##` continuation marker — the same convention WordPiece uses. Compare against `tokenize word`.",
      why:
        "If you debug a transformer on word boundaries, you will misread attention. Tokens are the real sequence length.",
      callout: "Sequence length budget is measured in subwords, not words.",
      packages: ["HF Tokenizers", "BERT WordPiece", "SentencePiece"],
    },
    goal: "Tokenize with subword and inspect the pieces.",
    hints: ["`load reviews` → `tokenize subword` → `show tokens`."],
    learning: ["BPE / WordPiece", "continuation markers", "token budgets"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "tok",
        label: "tokenize subword",
        detail: "Pieces, not words.",
        command: "tokenize subword",
        check: (s) => s.tokenizer === "subword",
      },
      {
        id: "show",
        label: "Inspect tokens",
        detail: "See ## pieces.",
        command: "show tokens",
        check: (s) => s.inspectedTokens,
      },
    ],
    win: (s) => {
      if (s.tokenizer !== "subword") return fail("Use `tokenize subword`.");
      if (!s.inspectedTokens) return fail("Inspect the pieces.");
      return win("Transformers think in pieces. Align your debugging to their units.");
    },
  },
  {
    id: "8.2",
    world: "w8",
    worldTitle: "Transformers",
    title: "Attention is soft alignment",
    concept: {
      title: "Every token looks at every other token",
      body:
        "Scaled dot-product attention computes a softmax over key-query similarity. Each row of the map is a distribution over where this token should read. It is differentiable alignment — the step that replaced fixed recurrence and hand-written syntax in many tasks.",
      whatHappens:
        "`embed word2vec` (so queries have vectors) then `attention`. The stage draws the heatmap. Rows sum to 1. Diagonal mass means self-focus; off-diagonal mass means the token is reading elsewhere.",
      why:
        "Attention is not magic interpretability — it is a routing mechanism. Seeing the map demystifies \"contextual embeddings\".",
      formula: "softmax(QKᵀ / √d) V",
      callout: "Attention weights are not explanations. They are routing coefficients.",
      packages: ["HF output_attentions", "PyTorch MultiheadAttention"],
    },
    goal: "Build embeddings and draw the attention map.",
    hints: ["`tokenize word` → `embed word2vec` → `attention`."],
    learning: ["scaled dot-product attention", "attention maps", "contextualization"],
    seedCorpus: "sentences",
    steps: [
      {
        id: "embed",
        label: "Embed tokens",
        detail: "Need vectors to attend over.",
        command: "embed word2vec",
        check: (s) => Boolean(s.embedding),
      },
      {
        id: "attn",
        label: "attention",
        detail: "Draw the map.",
        command: "attention",
        check: (s) => Boolean(s.attention?.length),
      },
    ],
    win: (s) => {
      if (!s.embedding) return fail("Build embeddings first.");
      if (!s.attention?.length) return fail("Run `attention`.");
      return win("Attention is soft alignment over the whole sequence. That is the core move.");
    },
  },
  {
    id: "8.3",
    world: "w8",
    worldTitle: "Transformers",
    title: "Frozen vs fine-tuned",
    concept: {
      title: "Transfer is a budget decision",
      body:
        "A frozen encoder gives you features; a fine-tuned one changes representation for your labels. Fine-tuning wins with enough in-domain labels and loses when you only have a hundred examples and high variance. The mental model: try TF-IDF baseline → frozen embeddings → fine-tune last.",
      whatHappens:
        "Sandbox path: compare `fit logistic` on TF-IDF against `embed sbert` + cosine neighbors as a retrieval-style baseline. The production story is in the package panel: `AutoModel.from_pretrained` vs `Trainer.train`.",
      why:
        "Teams over-fine-tune because it feels modern. Often a linear model on good features ships first and is cheaper to monitor.",
      callout: "Fine-tuning is the third option, not the first.",
      packages: ["HF Trainer", "sklearn on frozen embeddings"],
    },
    goal: "Run a pipeline lesson and fit a classifier on features.",
    hints: ["`pipeline` for the order lesson.", "Then `load reviews` → tokenize → vectorize → split → fit logistic."],
    learning: ["transfer learning budget", "frozen features", "fine-tuning tradeoffs"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "pipe",
        label: "Read the pipeline lesson",
        detail: "Order that does not leak.",
        command: "pipeline",
        check: (s) => s.pipelineSaved,
      },
      {
        id: "fit",
        label: "Fit a text classifier",
        detail: "logistic or naive_bayes.",
        check: (s) => s.fitted,
      },
    ],
    win: (s) => {
      if (!s.pipelineSaved) return fail("Run `pipeline` first.");
      if (!s.fitted) return fail("Fit a classifier so you can compare budgets.");
      return win("Choose the cheapest model that meets the bar. Fine-tune when the bar demands it.");
    },
  },
];
