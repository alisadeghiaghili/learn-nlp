/**
 * Engine unit tests: tokenize, normalize, vectorize, models, session commands.
 */

import { describe, expect, it } from "vitest";
import {
  loadCorpus,
  tokenize,
  normalize,
  stem,
  lemmatize,
  buildVocab,
  fitFeatures,
  cosine,
  fitText,
  predictAll,
  classificationMetrics,
  tagPos,
  extractEntities,
  attentionMap,
  fitTopics,
  Session,
  dispatch,
  buildEmbedding,
  lookup,
} from "../src/engine";

describe("corpora", () => {
  it("loads reviews with labels", () => {
    const c = loadCorpus("reviews");
    expect(c.docs.length).toBeGreaterThan(10);
    expect(c.labels).toContain("pos");
  });

  it("throws on unknown corpus", () => {
    expect(() => loadCorpus("nope" as never)).toThrow(/Unknown corpus/);
  });
});

describe("tokenize", () => {
  it("word tokens keep offsets", () => {
    const t = tokenize("Hello world.", "word");
    expect(t.map((x) => x.text)).toEqual(["Hello", "world", "."]);
    expect(t[0]?.start).toBe(0);
  });

  it("whitespace keeps punctuation attached", () => {
    const t = tokenize("Hello world.", "whitespace");
    expect(t).toHaveLength(2);
    expect(t[1]?.text).toBe("world.");
  });

  it("sentence splits on terminators", () => {
    const t = tokenize("One. Two! Three?", "sentence");
    expect(t.length).toBe(3);
  });

  it("subword emits pieces", () => {
    const t = tokenize("unbelievable", "subword");
    expect(t.length).toBeGreaterThan(1);
  });
});

describe("normalize", () => {
  it("stems running", () => {
    expect(stem("running")).toBe("run");
  });

  it("lemmatizes loved", () => {
    expect(lemmatize("loved")).toBe("love");
  });

  it("drops stopwords", () => {
    const tokens = tokenize("the cat sat", "word");
    const out = normalize(tokens, ["lower", "stopwords"]);
    expect(out.map((t) => t.text)).toEqual(["cat", "sat"]);
  });
});

describe("vectorize", () => {
  it("builds vocab and count matrix", () => {
    const docs = [tokenize("cat cat dog", "word"), tokenize("dog mouse", "word")];
    const vocab = buildVocab(docs);
    expect(vocab.length).toBe(3);
    const X = fitFeatures(docs, vocab, "count");
    expect(X.nDocs).toBe(2);
    expect(X.nTerms).toBe(3);
    expect(X.rows[0]).toHaveLength(3);
  });

  it("cosine of identical vectors is 1", () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });
});

describe("models", () => {
  it("naive bayes beats dummy on separable counts", () => {
    const a = tokenize("good great wonderful", "word");
    const b = tokenize("bad awful terrible", "word");
    const docs = [a, b, a, b, a, b];
    const y = ["pos", "neg", "pos", "neg", "pos", "neg"];
    const vocab = buildVocab(docs);
    const X = fitFeatures(docs, vocab, "count");
    const nb = fitText("naive_bayes", X, y);
    const preds = predictAll(nb, X);
    const acc = classificationMetrics(y, preds, ["pos", "neg"]).accuracy;
    expect(acc).toBeGreaterThan(0.9);
    const dummy = fitText("dummy", X, y);
    const dPreds = predictAll(dummy, X);
    const dAcc = classificationMetrics(y, dPreds, ["pos", "neg"]).accuracy;
    expect(acc).toBeGreaterThan(dAcc - 0.01);
  });
});

describe("sequence", () => {
  it("tags a noun", () => {
    const t = tagPos(tokenize("cat sat", "word"));
    expect(t[0]?.pos).toBe("NOUN");
    expect(t[1]?.pos).toBe("VERB");
  });

  it("extracts a year date entity", () => {
    const ents = extractEntities(tokenize("visited in 2016 today", "word"));
    expect(ents.some((e) => e.label === "DATE" && e.text === "2016")).toBe(true);
  });

  it("attention rows sum near 1", () => {
    const toks = tokenize("cat sat on mat", "word");
    const vectors = toks.map((_, i) => [i * 0.1, 1 - i * 0.05]);
    const cells = attentionMap(toks, vectors);
    const n = toks.length;
    const row0 = cells.filter((c) => c.from === 0);
    const s = row0.reduce((a, c) => a + c.weight, 0);
    expect(s).toBeCloseTo(1, 5);
    expect(cells).toHaveLength(n * n);
  });
});

describe("topics", () => {
  it("returns k topics with words", () => {
    const docs = [
      tokenize("sports football soccer match", "word"),
      tokenize("computers python code", "word"),
      tokenize("markets stocks bonds", "word"),
      tokenize("football soccer goal", "word"),
    ];
    const vocab = buildVocab(docs);
    const X = fitFeatures(docs, vocab, "count");
    const { topics } = fitTopics(X, 3, 1);
    expect(topics).toHaveLength(3);
    expect(topics[0]?.topWords.length).toBeGreaterThan(0);
  });
});

describe("embed", () => {
  it("builds word2vec-style table", () => {
    const docs = [tokenize("cat sat on the mat", "word"), tokenize("dog sat on the rug", "word")];
    const emb = buildEmbedding(docs, "word2vec");
    expect(emb.vectors.size).toBeGreaterThan(2);
    const { vector, oov } = lookup(emb, "cat");
    expect(vector.length).toBe(emb.dim);
    expect(oov).toBe(false);
  });

  it("fasttext has an OOV strategy", () => {
    const docs = [tokenize("running runner runs", "word")];
    const emb = buildEmbedding(docs, "fasttext");
    expect(emb.oovStrategy).toMatch(/subword/);
  });
});

describe("session + dispatch", () => {
  it("runs a classify pipeline", () => {
    const s = new Session();
    expect(dispatch(s, "load reviews").status).toBe("ok");
    expect(dispatch(s, "tokenize word").status).toBe("ok");
    expect(dispatch(s, "vectorize tfidf").status).toBe("ok");
    expect(dispatch(s, "split test_size=0.25").status).toBe("ok");
    expect(dispatch(s, "fit logistic").status).toBe("ok");
    const res = dispatch(s, "score test");
    expect(res.status).toBe("ok");
    expect(res.snapshot.metrics).toBeTruthy();
    expect(res.snapshot.scoredOn).toBe("test");
  });

  it("refuses fit before split", () => {
    const s = new Session();
    dispatch(s, "load reviews");
    dispatch(s, "tokenize word");
    dispatch(s, "vectorize tfidf");
    const res = dispatch(s, "fit logistic");
    expect(res.status).toBe("error");
  });

  it("undo restores snapshot", () => {
    const s = new Session();
    dispatch(s, "load reviews");
    dispatch(s, "tokenize word");
    const before = s.snapshot().tokens?.length ?? 0;
    expect(before).toBeGreaterThan(0);
    dispatch(s, "undo");
    expect(s.snapshot().tokens).toBeNull();
  });

  it("unknown command errors", () => {
    const s = new Session();
    const res = dispatch(s, "frobnicate");
    expect(res.status).toBe("error");
  });
});
