# LearnNLP

Interactive NLP sandbox and leveled curriculum.

**Live:** https://alisadeghiaghili.github.io/learn-nlp/

LearnNLP teaches the **NLP mental model** — tokenize, normalize, vectorize,
embed, model — and the production packages that implement it: NLTK, spaCy,
scikit-learn, Gensim, and Hugging Face Transformers. Every level opens with a
concept brief, the stage visualizes tokens / matrices / attention, and each
command prints the real Python API.

## Why

Text is invisible until you see tokens, sparsity, and attention as shapes.
LearnNLP makes those states the game — concepts first, package code second.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

## Modes

- **Levels** — Nine worlds from raw text to production package choices:
  1. Text is not numbers (tokens, normalization, OOV)
  2. Bag of words (counts, TF-IDF, sparsity)
  3. Geometry of meaning (cosine, retrieval, embeddings vs BoW)
  4. Classification (split discipline, baselines, P/R/F1, short text)
  5. Sequence structure (POS, NER, dependencies)
  6. Embeddings (Word2Vec, FastText, sentence vectors)
  7. Topics (LDA, NMF, mixtures)
  8. Transformers (subwords, attention, fine-tune budget)
  9. Package zoo (NLTK vs spaCy vs HF, classical baselines, Pipeline order)
- **Sandbox** — free play with the same command surface.

## Command surface

```text
load reviews|news|tweets|sentences|entities|docs
tokenize whitespace|word|subword|sentence
normalize lower|stopwords|stem|lemmatize
vectorize count|bow|tfidf
embed word2vec|fasttext|sbert
split test_size=0.25 seed=42
fit naive_bayes|logistic|svm|dummy
predict
score train|test
cm
similarity <docA> <docB>
nearest <word>
topic lda|nmf [k]
pos | ner | dep | attention
compare pkg nltk|spacy|sklearn|gensim|transformers
pipeline
show text|tokens|vocab|features|metrics|pipeline|code
goal | hint | levels | help | undo | reset
```

Example — the pipeline hygiene the levels enforce:

```text
$ load reviews
$ tokenize word
$ normalize lower lemmatize
$ vectorize tfidf
$ split test_size=0.25
$ fit logistic
$ score test
```

Under the dock you always see the Python form:

```python
from sklearn.pipeline import Pipeline
pipe = Pipeline([
  ('tfidf', TfidfVectorizer()),
  ('clf', LogisticRegression(max_iter=1000)),
])
pipe.fit(train_docs, y_train)
```

## Pedagogy rules

1. Concept before code.
2. Win checks encode the idea (e.g. test metrics *and* split before fit),
   not a single magic command string.
3. Failure feedback names the misconception.
4. Package equivalence is always one glance away.

## Architecture

```text
src/engine   pure TypeScript sandbox (corpora, tokens, vectors, models, session)
src/ui       canvas charts + shell wiring
src/levels   level definitions and win predicates
tests/       vitest engine tests
```

`src/engine` never touches the DOM. Add a level by appending to
`src/levels/world1.ts` (or a new world module) with a `Level` object and a
`win(snapshot)` predicate.

## Scope

v1 is a **client-side simulation** of the production NLP workflow (tokenize,
normalize, TF-IDF, embeddings, classical classifiers, sequence labelling). The
dock teaches the APIs you will use in real Python. A Pyodide backend is a
deliberate later step, not a silent claim in the UI.

## License

Apache License 2.0
