# LearnNLP — Product & Design Spec

Interactive NLP sandbox and leveled tutorial.
Curriculum and API vocabulary follow the real production stack:
NLTK, spaCy, scikit-learn, Gensim, Hugging Face Transformers / Tokenizers,
FastText, and SentenceTransformers. The product teaches **concepts first**,
then the package code that expresses them.

## Product thesis

Language is invisible until you see tokens, vectors, sparsity, and attention
as shapes. LearnNLP makes those states visible and challengeable.

Three modes, same shell:

1. **Sandbox** — free command play.
2. **Levels** — short challenges with a win condition and a concept brief.
3. **Concept labs** — parameter playgrounds (TF-IDF, cosine, attention)
   where the lesson is watching a surface change.

Every user action is a pipeline step. The stage always shows:

- text space (raw text → tokens → features)
- model state (vectors, similarity heatmap, attention map)
- evaluation panel
- pipeline graph
- the real Python / package equivalent of the last command

## Out of scope (v1)

- Real CPython / spaCy / Transformers execution (Pyodide is a later backend).
- Multilingual deep production systems, speech, OCR.
- User accounts, remote progress sync.

v1 ships a faithful **NLP mental model** engine in TypeScript:
tokenize / normalize / vectorize / embed / classify / tag / attend / evaluate.
Code panels show the real package APIs the learner will meet in production.

## Information architecture

```text
Chrome:  LearnNLP · levels · sandbox · goal
Left:    level rail (worlds → levels, solved markers)
Center:  concept brief (paper) + visual stage (dark lab)
Bottom:  command dock + package equivalent + status
```

### Level schema

```ts
interface Level {
  id: string;
  title: string;
  world: string;
  concept: ConceptBrief;
  goal: string;
  hints: string[];
  win: (session: SessionSnapshot) => WinResult;
}
```

### Command grammar (maps 1:1 to real packages)

```text
help | levels | goal | hint | reset | undo | clear
load <corpus>
show text|tokens|vocab|features|pipeline|metrics|code|about
tokenize [whitespace|word|subword|sentence]
normalize [lower|stem|lemmatize|stopwords]
vectorize bow|tfidf|count
similarity <a> <b>
embed word2vec|fasttext|sbert
cluster kmeans
topic lda|nmf
fit naive_bayes|logistic|svm|dummy
predict
score
cm
pos
ner
dep
attention
compare pkg <a> <b>
```

Example equivalence taught in the dock:

```text
tokenize word
→ from nltk import word_tokenize
→ tokens = word_tokenize(text)
```

## Pedagogy rules

1. Concept brief opens every level in plain language (no jargon dump).
2. Win checks encode the *idea*, not a magic command sequence
   (e.g. “test F1 ≥ 0.75 **and** vectorizer fit on train only”).
3. Failure feedback is diagnostic: name the misconception, not “wrong”.
4. The package line is always visible after a DSL command.
5. Golf counters (commands used) exist as a stretch goal, not the main score.

## World map (v1 content)

**World 1 — Text is not numbers**

| id | concept | win sketch |
|----|---------|------------|
| 1.1 | Raw text vs tokens | load + tokenize + show tokens |
| 1.2 | Normalization (case, stop, stem/lemma) | normalize then show tokens |
| 1.3 | Vocabulary and OOV | show vocab; handle unknown |

**World 2 — Bag of words**

| id | concept | win sketch |
|----|---------|------------|
| 2.1 | Count vectors / document-term matrix | vectorize count |
| 2.2 | TF-IDF weights rare terms | vectorize tfidf |
| 2.3 | Sparsity and n-grams | inspect feature matrix |

**World 3 — Geometry of meaning**

| id | concept | win sketch |
|----|---------|------------|
| 3.1 | Cosine similarity | similarity two docs |
| 3.2 | Nearest neighbors retrieval | find nearest |
| 3.3 | Embedding space vs BoW | embed then compare |

**World 4 — Classification**

| id | concept | win sketch |
|----|---------|------------|
| 4.1 | Train/test split for text | split then fit |
| 4.2 | Naive Bayes baseline | fit nb, beat dummy |
| 4.3 | Logistic regression + TF-IDF | F1 ≥ threshold |
| 4.4 | Precision vs recall tradeoff | score + cm |

**World 5 — Sequence structure (spaCy)**

| id | concept | win sketch |
|----|---------|------------|
| 5.1 | POS tagging | pos on sample |
| 5.2 | NER spans | ner entities |
| 5.3 | Dependency parse | dep relations |

**World 6 — Embeddings**

| id | concept | win sketch |
|----|---------|------------|
| 6.1 | Word2Vec distributional | embed word2vec |
| 6.2 | Subword / FastText OOV | embed fasttext |
| 6.3 | Sentence embeddings | embed sbert |

**World 7 — Topics**

| id | concept | win sketch |
|----|---------|------------|
| 7.1 | Topic as word distribution | topic lda |
| 7.2 | Document mixture | inspect theta |

**World 8 — Transformers**

| id | concept | win sketch |
|----|---------|------------|
| 8.1 | Tokens vs words (BPE/WordPiece) | tokenize subword |
| 8.2 | Attention as soft alignment | attention |
| 8.3 | Fine-tune mental model | compare frozen vs tuned |

**World 9 — Package zoo**

| id | concept | win sketch |
|----|---------|------------|
| 9.1 | NLTK vs spaCy vs HF | compare pkg |
| 9.2 | When TF-IDF still wins | fit logistic on short text |
| 9.3 | Production pipeline order | pipeline lesson |

## Visual system

**Style anchor:** laboratory instrument face + cool editorial notebook.
Shared DNA with the rest of the learn-* family (void / paper / signal).

**Palette**

| token | hex | role |
|-------|-----|------|
| void | `#0A1018` | stage / terminal ground |
| surface | `#13202C` | elevated dark panels |
| paper | `#E6E9E4` | concept brief (cool sage paper) |
| ink | `#0F1518` | text on paper |
| chalk | `#C5CED6` | text on dark |
| signal | `#F0B429` | primary accent — active / fitted |
| alarm | `#E23D51` | leakage, errors |
| calm | `#2A9D8F` | solved, valid |
| class0 | `#5B8DEF` | class / series A |
| class1 | `#F0B429` | class / series B |
| class2 | `#9B7EDE` | class / series C |

**Typography**

- Display / concept titles: `Newsreader`
- UI / body labels: `IBM Plex Sans`
- Code / terminal / metrics: `IBM Plex Mono`

Scale: concept title 28–32px / 500; brief body 16px / 1.55; UI 13–14px;
mono 12–13px. Max measure for brief text ≈ 62ch.

**Layout rhythm**

8px base. Shell is a full-viewport instrument panel (same grid as learn-ml):
chrome 48px · rail 220px · brief + stage · dock 132px.

**Signature moments**

1. **Token bloom** — on successful `tokenize`, tokens scatter into place and
   the vocabulary panel ignites `signal`.
2. **Attention heat** — `attention` draws a soft alignment map; illegal order
   (e.g. `fit` before `vectorize`) paints the pipeline edge `alarm`.

Motion respects `prefers-reduced-motion`. Focus rings are 2px `signal`.

## Architecture

```text
src/engine   pure TS state machine (corpora, tokens, vectors, models,
             metrics, pipeline, command parser). No DOM.
src/ui       DOM + canvas renderers (terminal, stage, charts, pipeline graph).
src/levels   level definitions + win predicates.
tests/       engine unit tests (vitest).
```

Dependency inversion: UI depends on `engine` public API only. Levels depend on
`SessionSnapshot` read model. Engine never imports UI.

## Tech

- Vite + TypeScript (strict)
- Vitest for engine tests
- No UI framework — deliberate: terminal + canvas control matters more than
  component bookkeeping.
- Fonts via Google Fonts (same stack as the rest of the family).

## Success criteria for v1

1. Sandbox usable end-to-end for tokenize → vectorize → classify.
2. Worlds 1–5 completable with concept briefs and honest win checks.
3. Every command prints its real package equivalent.
4. `npm test` green; `npm run build` produces a static `dist/`.
5. README explains pedagogy and how to add a level.
