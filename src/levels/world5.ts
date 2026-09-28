/**
 * World 5 — Sequence structure (spaCy mental model).
 */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD5_LEVELS: Level[] = [
  {
    id: "5.1",
    world: "w5",
    worldTitle: "Sequence structure",
    title: "POS tagging",
    concept: {
      title: "Every token has a job",
      body:
        "Part-of-speech tags mark nouns, verbs, adjectives, and function words. They unlock lemmatization rules, shallow parsing, and better features. spaCy's pipeline is the industrial default: tok2vec → tagger → parser → ner, all in one pass.",
      whatHappens:
        "`load entities` or any corpus, `tokenize word`, then `pos`. The stage highlights nouns, verbs, and adjectives. The dock prints spaCy's `t.pos_`.",
      why:
        "Regex cannot tell \"record\" (noun) from \"record\" (verb). A tagger can. That disambiguation is why search and relation extraction improve.",
      callout: "POS tags are cheap features with outsized value on small data.",
      packages: ["spaCy pos_", "NLTK pos_tag", "Stanza"],
    },
    goal: "Tokenize and label POS tags on the first document.",
    hints: ["`load entities` → `tokenize word` → `pos`."],
    learning: ["part-of-speech", "spaCy pipeline stages", "token features"],
    seedCorpus: "entities",
    steps: [
      {
        id: "tok",
        label: "Tokenize",
        detail: "Words first.",
        command: "tokenize word",
        check: (s) => Boolean(s.tokens?.length),
      },
      {
        id: "pos",
        label: "Tag POS",
        detail: "Label each token.",
        command: "pos",
        check: (s) => Boolean(s.posTags?.length),
      },
    ],
    win: (s) => {
      if (!s.posTags?.length) return fail("Run `pos` after tokenizing.");
      return win("Tokens have jobs. Structure is a feature, not decoration.");
    },
  },
  {
    id: "5.2",
    world: "w5",
    worldTitle: "Sequence structure",
    title: "Named entity recognition",
    concept: {
      title: "Spans, not tokens",
      body:
        "NER finds multi-token spans and types them: PERSON, ORG, GPE, DATE. The unit of prediction is a span, so evaluation must be span-aware. spaCy's `doc.ents` is the production interface; Hugging Face token classification is the fine-tuning path.",
      whatHappens:
        "`load entities` then `ner`. The engine scans for capitalized spans, known org/location cues, and years. `show tokens` is not enough — entities live across tokens.",
      why:
        "Information extraction, compliance redaction, and knowledge graphs all start with entities. Token-level F1 without span logic lies.",
      callout: "Entity boundaries are half the difficulty. Types are the other half.",
      packages: ["spaCy doc.ents", "HF token classification", "Stanford NER"],
    },
    goal: "Extract named entities from the entities corpus.",
    hints: ["`load entities` → `tokenize word` → `ner`."],
    learning: ["span detection", "entity types", "sequence labelling"],
    seedCorpus: "entities",
    steps: [
      {
        id: "load",
        label: "Load entities corpus",
        detail: "Rich proper nouns.",
        command: "load entities",
        check: (s) => s.corpus?.name === "entities",
      },
      {
        id: "ner",
        label: "Run NER",
        detail: "Extract spans.",
        command: "ner",
        check: (s) => Boolean(s.entities?.length),
      },
    ],
    win: (s) => {
      if (!s.entities?.length) return fail("Run `ner` on the entities corpus.");
      return win("Entities are spans with types. Extract before you aggregate.");
    },
  },
  {
    id: "5.3",
    world: "w5",
    worldTitle: "Sequence structure",
    title: "Dependency parse",
    concept: {
      title: "Who did what to whom",
      body:
        "Dependency syntax links each word to a head. \"Cats chase mice\" → chase is ROOT, cats is nsubj, mice is obj. Relations enable question answering, relation extraction, and rule-based negation. spaCy's `t.dep_` and `t.head` are the knobs.",
      whatHappens:
        "`dep` on the first document prints word ←rel─ head. A toy parser finds the nearest verb as ROOT — enough to see the shape of the graph.",
      why:
        "Bag-of-words cannot distinguish \"dog bites man\" from \"man bites dog.\" Dependencies can. That is why IE systems still parse.",
      callout: "Word order is signal. Dependencies make that signal explicit.",
      packages: ["spaCy dep_", "Stanza dependency"],
    },
    goal: "Parse dependencies for the first document.",
    hints: ["`tokenize word` → `dep`."],
    learning: ["dependency relations", "head words", "syntax for IE"],
    seedCorpus: "sentences",
    steps: [
      {
        id: "tok",
        label: "Tokenize",
        detail: "Need tokens.",
        command: "tokenize word",
        check: (s) => Boolean(s.tokens?.length),
      },
      {
        id: "dep",
        label: "Parse deps",
        detail: "head + relation.",
        command: "dep",
        check: (s) => Boolean(s.deps?.length),
      },
    ],
    win: (s) => {
      if (!s.deps?.length) return fail("Run `dep` after tokenizing.");
      return win("Syntax is structure you can query. BOW cannot see it.");
    },
  },
];
