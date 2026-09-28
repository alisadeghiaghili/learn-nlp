/**
 * World 1 — Text is not numbers.
 */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD1_LEVELS: Level[] = [
  {
    id: "1.1",
    world: "w1",
    worldTitle: "Text is not numbers",
    title: "Raw text vs tokens",
    concept: {
      title: "Models never see your string",
      body:
        "A classifier does not read sentences. It reads arrays of integers. The first irreversible decision in every NLP system is how a character stream becomes a sequence of tokens. Split on whitespace and punctuation sticks to words. Split with a word tokenizer and \"don't\" becomes \"do\" + \"n't\". Split with subwords and morphology stays visible to the model.",
      whatHappens:
        "`load reviews` materializes short product reviews with sentiment labels. `tokenize word` runs a word tokenizer over every document and keeps character offsets. `show tokens` is not decoration — it is how you catch the first bug before any vector is built.",
      why:
        "If tokenization is wrong, every downstream stage inherits the error silently. Production systems debug tokens first, metrics second.",
      callout: "If you cannot print the tokens, you do not know what the model saw.",
      packages: ["NLTK word_tokenize", "spaCy tokenizer", "HF Tokenizers"],
    },
    goal: "Load reviews, tokenize with word, and inspect the tokens.",
    hints: [
      "`load reviews` then `tokenize word`.",
      "`show tokens` to confirm the first document.",
    ],
    learning: ["tokenization strategies", "character offsets", "word vs subword"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "load",
        label: "Load a corpus",
        detail: "Materialize raw docs and labels.",
        command: "load reviews",
        check: (s) => Boolean(s.corpus),
      },
      {
        id: "tokenize",
        label: "Tokenize with word",
        detail: "Character stream → tokens.",
        command: "tokenize word",
        check: (s) => s.tokenizer === "word" && Boolean(s.tokens?.length),
      },
      {
        id: "inspect",
        label: "Inspect tokens",
        detail: "Read the first document's tokens.",
        command: "show tokens",
        check: (s) => s.inspectedTokens,
      },
    ],
    win: (s) => {
      if (!s.corpus) return fail("Load a corpus first.");
      if (s.tokenizer !== "word" || !s.tokens?.length) {
        return fail("Run `tokenize word` so tokens exist.");
      }
      if (!s.inspectedTokens) {
        return fail("Run `show tokens` and actually look at them.");
      }
      return win("Tokens exist. The model will never see the original string.");
    },
  },
  {
    id: "1.2",
    world: "w1",
    worldTitle: "Text is not numbers",
    title: "Normalization changes the vocabulary",
    concept: {
      title: "Stems, lemmas, and stopwords are modeling choices",
      body:
        "Lowercasing collapses \"The\" and \"the\". Stopword removal drops function words that often carry little topical signal. Stemming chops suffixes (\"running\" → \"run\") aggressively. Lemmatization maps to a dictionary form using morphology. Each choice shrinks or reshapes the vocabulary — and every choice can destroy information you needed later.",
      whatHappens:
        "`normalize lower lemmatize` (or `stem`, or `stopwords`) rewrites the token stream in place. Compare `show tokens` before and after. The package panel shows NLTK's PorterStemmer and spaCy's lemma_ — the two tools teams actually pick between.",
      why:
        "Sentiment often lives in words lemmas erase. Topics often live in nouns stopwords keep. Normalization is a model of language, not a cleanup chore.",
      formula: "\"Loved\" → lower → \"loved\" → lemma → \"love\"",
      callout: "Normalize for the task. There is no universally correct pipeline.",
      packages: ["NLTK PorterStemmer", "spaCy lemma_", "NLTK stopwords"],
    },
    goal: "Tokenize, then normalize with at least one normalizer, and inspect tokens again.",
    hints: [
      "`tokenize word` then `normalize lower lemmatize`.",
      "Try `normalize lower stopwords stem` on a fresh load and compare.",
    ],
    learning: ["lowercasing", "stopwords", "stemming vs lemmatization"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "tokenize",
        label: "Tokenize",
        detail: "Need a token stream first.",
        command: "tokenize word",
        check: (s) => Boolean(s.tokens?.length),
      },
      {
        id: "normalize",
        label: "Apply a normalizer",
        detail: "lower / stopwords / stem / lemmatize",
        command: "normalize lower lemmatize",
        check: (s) => s.normalizers.length > 0,
      },
      {
        id: "inspect",
        label: "Inspect tokens after normalize",
        detail: "Confirm the vocabulary changed.",
        command: "show tokens",
        check: (s) => s.inspectedTokens,
      },
    ],
    win: (s) => {
      if (!s.tokens?.length) return fail("Tokenize first.");
      if (s.normalizers.length === 0) {
        return fail("Apply at least one normalizer: `normalize lower`.");
      }
      return win("Normalization rewrote the vocabulary on purpose — that is modeling.");
    },
  },
  {
    id: "1.3",
    world: "w1",
    worldTitle: "Text is not numbers",
    title: "Vocabulary and OOV",
    concept: {
      title: "Unknown words are a silent failure mode",
      body:
        "Any fixed vocabulary turns unseen words into out-of-vocabulary (OOV) events. Classic word vectors drop OOV. FastText composes subword n-grams so a misspelling still gets a vector. BPE / WordPiece refuse to have OOV at all — they fall back to pieces. Understanding OOV is understanding why production systems use subwords.",
      whatHappens:
        "`show vocab` lists terms with document frequency. `embed word2vec` then `nearest <word>` on a word that never appeared shows the zero vector. Switch to `embed fasttext` and the same query gets a composed vector.",
      why:
        "Users type new words, typos, and product names every day. A model that drops them is not robust — it is lying by omission.",
      callout: "OOV rate is a product metric, not an academic curiosity.",
      packages: ["gensim Word2Vec", "gensim FastText", "HF Tokenizers BPE"],
    },
    goal: "Vectorize or embed, inspect the vocabulary, and query nearest neighbors.",
    hints: [
      "`tokenize word` → `vectorize tfidf` → `show vocab`.",
      "`embed word2vec` then `nearest love`.",
    ],
    learning: ["vocabulary construction", "OOV handling", "subword composition"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "vocab",
        label: "Build a vocabulary",
        detail: "vectorize creates vocab + matrix.",
        command: "vectorize tfidf",
        check: (s) => Boolean(s.vocab && s.vocab.length > 0),
      },
      {
        id: "inspect",
        label: "Inspect vocab",
        detail: "See terms, df, idf.",
        command: "show vocab",
        check: (s) => s.inspectedVocab,
      },
      {
        id: "embed",
        label: "Build embeddings",
        detail: "Distributional vectors for OOV experiments.",
        command: "embed word2vec",
        check: (s) => Boolean(s.embedding),
      },
    ],
    win: (s) => {
      if (!s.vocab?.length) return fail("Build a vocabulary with `vectorize tfidf`.");
      if (!s.inspectedVocab) return fail("Run `show vocab`.");
      if (!s.embedding) return fail("Run `embed word2vec` to study OOV.");
      return win("Vocabulary is a contract. OOV is what happens when the contract breaks.");
    },
  },
];
