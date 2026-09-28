/**
 * Session state machine: the sandbox workspace a level or free play runs in.
 */

import { loadCorpus, makeRng } from "./corpora";
import { tokenize, TOKENIZER_PACKAGE_API } from "./tokenize";
import { normalize, NORMALIZER_PACKAGE_API } from "./normalize";
import {
  buildVocab,
  fitFeatures,
  cosine,
  topTerms,
  VECTORIZER_PACKAGE_API,
} from "./vectorize";
import {
  buildEmbedding,
  lookup,
  sentenceVector,
  nearest,
  EMBED_PACKAGE_API,
} from "./embed";
import {
  fitText,
  predictAll,
  topFeatures,
  classificationMetrics,
  formatClassification,
  modelPackageApi,
  type FittedModel,
} from "./models";
import {
  tagPos,
  extractEntities,
  parseDeps,
  attentionMap,
  SEQUENCE_PACKAGE_API,
} from "./sequence";
import { fitTopics, topicPackageApi } from "./topics";
import type {
  AttentionCell,
  ClassificationMetrics,
  Corpus,
  CorpusName,
  EmbedderName,
  Embedding,
  FeatureMatrix,
  ModelName,
  NormalizerName,
  PipelineStep,
  SessionSnapshot,
  SimilarityResult,
  TextSplit,
  Token,
  TokenizerName,
  Topic,
  TopicModel,
  VectorizerName,
  VocabEntry,
} from "./types";

export interface CommandResult {
  readonly lines: string[];
  readonly packageApi: string | null;
  readonly status: "ok" | "error" | "warn";
  readonly snapshot: SessionSnapshot;
}

interface SessionState {
  corpus: Corpus | null;
  tokens: Token[] | null;
  docsTokens: Token[][] | null;
  tokenizer: TokenizerName | null;
  normalizers: NormalizerName[];
  vocab: VocabEntry[] | null;
  features: FeatureMatrix | null;
  trainFeatures: FeatureMatrix | null;
  testFeatures: FeatureMatrix | null;
  vectorizer: VectorizerName | null;
  vectorizerLeaked: boolean;
  embedding: Embedding | null;
  split: TextSplit | null;
  model: FittedModel | null;
  fitted: boolean;
  predictions: string[] | null;
  metrics: ClassificationMetrics | null;
  trainMetrics: ClassificationMetrics | null;
  similarities: SimilarityResult[];
  topics: Topic[] | null;
  topicDoc: number[] | null;
  attention: AttentionCell[] | null;
  posTags: Token[] | null;
  entities: { text: string; label: string; start: number; end: number }[] | null;
  deps: { word: string; head: string; rel: string }[] | null;
  clusters: number[] | null;
  compared: string[] | null;
  pipelineSaved: boolean;
  steps: PipelineStep[];
  commandCount: number;
  scoredOn: "train" | "test" | null;
  inspectedText: boolean;
  inspectedTokens: boolean;
  inspectedVocab: boolean;
  inspectedFeatures: boolean;
  inspectedMetrics: boolean;
}

function emptyState(): SessionState {
  return {
    corpus: null,
    tokens: null,
    docsTokens: null,
    tokenizer: null,
    normalizers: [],
    vocab: null,
    features: null,
    trainFeatures: null,
    testFeatures: null,
    vectorizer: null,
    vectorizerLeaked: false,
    embedding: null,
    split: null,
    model: null,
    fitted: false,
    predictions: null,
    metrics: null,
    trainMetrics: null,
    similarities: [],
    topics: null,
    topicDoc: null,
    attention: null,
    posTags: null,
    entities: null,
    deps: null,
    clusters: null,
    compared: null,
    pipelineSaved: false,
    steps: [],
    commandCount: 0,
    scoredOn: null,
    inspectedText: false,
    inspectedTokens: false,
    inspectedVocab: false,
    inspectedFeatures: false,
    inspectedMetrics: false,
  };
}

function cloneState(s: SessionState): SessionState {
  return {
    ...s,
    normalizers: [...s.normalizers],
    similarities: [...s.similarities],
    steps: s.steps.map((x) => ({ ...x })),
  };
}

export class Session {
  private state: SessionState = emptyState();
  private history: SessionState[] = [];

  snapshot(): SessionSnapshot {
    const s = this.state;
    return {
      corpus: s.corpus,
      tokens: s.tokens,
      tokenizer: s.tokenizer,
      normalizers: s.normalizers,
      vocab: s.vocab,
      features: s.features,
      vectorizer: s.vectorizer,
      vectorizerLeaked: s.vectorizerLeaked,
      embedding: s.embedding,
      split: s.split,
      model: s.model?.name ?? null,
      fitted: s.fitted,
      predictions: s.predictions,
      metrics: s.metrics,
      trainMetrics: s.trainMetrics,
      similarities: s.similarities,
      topics: s.topics,
      topicDoc: s.topicDoc,
      attention: s.attention,
      posTags: s.posTags,
      entities: s.entities,
      deps: s.deps,
      clusters: s.clusters,
      compared: s.compared,
      pipelineSaved: s.pipelineSaved,
      steps: s.steps,
      commandCount: s.commandCount,
      scoredOn: s.scoredOn,
      inspectedText: s.inspectedText,
      inspectedTokens: s.inspectedTokens,
      inspectedVocab: s.inspectedVocab,
      inspectedFeatures: s.inspectedFeatures,
      inspectedMetrics: s.inspectedMetrics,
    };
  }

  private checkpoint(): void {
    this.history.push(cloneState(this.state));
    if (this.history.length > 40) this.history.shift();
  }

  private push(step: PipelineStep, packageApi: string | null, lines: string[], status: CommandResult["status"] = "ok"): CommandResult {
    this.state = {
      ...this.state,
      steps: [...this.state.steps, step],
      commandCount: this.state.commandCount + 1,
    };
    return { lines, packageApi, status, snapshot: this.snapshot() };
  }

  private err(message: string): CommandResult {
    return {
      lines: [message],
      packageApi: null,
      status: "error",
      snapshot: this.snapshot(),
    };
  }

  markInspected(kind: "text" | "tokens" | "vocab" | "features" | "metrics"): void {
    this.state = {
      ...this.state,
      inspectedText: this.state.inspectedText || kind === "text",
      inspectedTokens: this.state.inspectedTokens || kind === "tokens",
      inspectedVocab: this.state.inspectedVocab || kind === "vocab",
      inspectedFeatures: this.state.inspectedFeatures || kind === "features",
      inspectedMetrics: this.state.inspectedMetrics || kind === "metrics",
    };
  }

  reset(): CommandResult {
    this.checkpoint();
    this.state = emptyState();
    return this.push(
      { kind: "reset", label: "reset", packageApi: "# session cleared", status: "ok" },
      "# session cleared",
      ["Session reset."],
    );
  }

  undo(): CommandResult {
    const prev = this.history.pop();
    if (!prev) return this.err("Nothing to undo.");
    this.state = prev;
    return {
      lines: ["Undid last step."],
      packageApi: null,
      status: "ok",
      snapshot: this.snapshot(),
    };
  }

  load(name: CorpusName): CommandResult {
    this.checkpoint();
    try {
      const corpus = loadCorpus(name);
      this.state = {
        ...emptyState(),
        corpus,
        commandCount: this.state.commandCount,
        steps: this.state.steps,
      };
      return this.push(
        {
          kind: "load",
          label: `load ${name}`,
          packageApi: "docs = list(corpus.texts())",
          status: "ok",
        },
        `# corpus: ${name}\ndocs = load_corpus('${name}')`,
        [
          `Loaded '${name}' — ${corpus.docs.length} docs · task=${corpus.task} · labels=${corpus.labels.join("/")}`,
          ...corpus.docs.slice(0, 3).map((d) => `  ${d.id} [${d.label}] ${d.text.slice(0, 72)}${d.text.length > 72 ? "…" : ""}`),
          corpus.docs.length > 3 ? `  … ${corpus.docs.length - 3} more` : "",
        ].filter(Boolean),
      );
    } catch (e) {
      return this.err(e instanceof Error ? e.message : String(e));
    }
  }

  runTokenize(strategy: TokenizerName): CommandResult {
    if (!this.state.corpus) return this.err("Load a corpus first: load reviews");
    this.checkpoint();
    try {
      const docsTokens = this.state.corpus.docs.map((d) => tokenize(d.text, strategy));
      const first = this.state.corpus.docs[0];
      const firstTokens = docsTokens[0] ?? [];
      this.state = {
        ...this.state,
        docsTokens,
        tokens: firstTokens,
        tokenizer: strategy,
      };
      return this.push(
        {
          kind: "tokenize",
          label: `tokenize ${strategy}`,
          packageApi: TOKENIZER_PACKAGE_API[strategy],
          status: "ok",
        },
        TOKENIZER_PACKAGE_API[strategy],
        [
          `Tokenized ${docsTokens.length} docs with '${strategy}'.`,
          `doc ${first?.id ?? "?"}: ${firstTokens.length} tokens`,
          `  ${firstTokens.slice(0, 16).map((t) => t.text).join(" | ")}${firstTokens.length > 16 ? " …" : ""}`,
        ],
      );
    } catch (e) {
      return this.err(e instanceof Error ? e.message : String(e));
    }
  }

  runNormalize(ops: NormalizerName[]): CommandResult {
    if (!this.state.docsTokens) return this.err("Tokenize first: tokenize word");
    this.checkpoint();
    try {
      const docsTokens = this.state.docsTokens.map((ts) => normalize(ts, ops));
      const first = docsTokens[0] ?? [];
      this.state = {
        ...this.state,
        docsTokens,
        tokens: first,
        normalizers: [...this.state.normalizers, ...ops],
      };
      const api = ops.map((o) => NORMALIZER_PACKAGE_API[o]).join("\n");
      return this.push(
        {
          kind: "normalize",
          label: `normalize ${ops.join("+")}`,
          packageApi: api,
          status: "ok",
        },
        api,
        [
          `Normalized with ${ops.join(" → ")}.`,
          `doc0: ${first.length} tokens remain`,
          `  ${first.slice(0, 16).map((t) => t.norm ?? t.text).join(" | ")}${first.length > 16 ? " …" : ""}`,
        ],
      );
    } catch (e) {
      return this.err(e instanceof Error ? e.message : String(e));
    }
  }

  runVectorize(mode: VectorizerName): CommandResult {
    if (!this.state.docsTokens || !this.state.corpus) {
      return this.err("Tokenize (and optionally normalize) first.");
    }
    this.checkpoint();
    try {
      // train/test hygiene: if a split exists, fit vocab on train only
      let trainTokens = this.state.docsTokens;
      let leaked = false;
      if (this.state.split) {
        const trainSet = new Set(this.state.split.trainIds);
        const idMap = new Map(this.state.corpus.docs.map((d, i) => [d.id, i]));
        trainTokens = this.state.docsTokens.filter((_, i) => {
          const id = this.state.corpus!.docs[i]?.id;
          return id !== undefined && trainSet.has(id);
        });
        if (trainTokens.length === 0) trainTokens = this.state.docsTokens;
        void idMap;
        leaked = false;
      } else {
        leaked = false;
      }
      const vocab = buildVocab(trainTokens);
      const features = fitFeatures(this.state.docsTokens, vocab, mode);
      this.state = {
        ...this.state,
        vocab,
        features,
        vectorizer: mode,
        vectorizerLeaked: leaked,
      };
      const nnz = features.rows.reduce((a, r) => a + r.filter((v) => v !== 0).length, 0);
      const density = features.nDocs * features.nTerms === 0 ? 0 : nnz / (features.nDocs * features.nTerms);
      return this.push(
        {
          kind: "vectorize",
          label: `vectorize ${mode}`,
          packageApi: VECTORIZER_PACKAGE_API[mode],
          status: "ok",
        },
        VECTORIZER_PACKAGE_API[mode],
        [
          `Built ${mode} matrix ${features.nDocs}×${features.nTerms}.`,
          `density ${(density * 100).toFixed(1)}% · nnz=${nnz}`,
          `top terms by weight (doc0): ${topTerms(features.rows[0] ?? [], features.terms, 8).map((t) => t.term).join(", ")}`,
        ],
      );
    } catch (e) {
      return this.err(e instanceof Error ? e.message : String(e));
    }
  }

  runEmbed(mode: EmbedderName): CommandResult {
    if (!this.state.docsTokens) return this.err("Tokenize first: tokenize word");
    this.checkpoint();
    try {
      const emb = buildEmbedding(this.state.docsTokens, mode);
      this.state = { ...this.state, embedding: emb };
      const sample = [...emb.vectors.keys()].slice(0, 6);
      return this.push(
        {
          kind: "embed",
          label: `embed ${mode}`,
          packageApi: EMBED_PACKAGE_API[mode],
          status: "ok",
        },
        EMBED_PACKAGE_API[mode],
        [
          `Built ${mode} embeddings · dim=${emb.dim} · vocab=${emb.vectors.size}`,
          `oov policy: ${emb.oovStrategy}`,
          `sample: ${sample.join(", ")}`,
        ],
      );
    } catch (e) {
      return this.err(e instanceof Error ? e.message : String(e));
    }
  }

  runSplit(testSize = 0.25, seed = 42): CommandResult {
    if (!this.state.corpus) return this.err("Load a corpus first: load reviews");
    this.checkpoint();
    const docs = this.state.corpus.docs;
    const idx = docs.map((_, i) => i);
    const rng = makeRng(seed);
    for (let i = idx.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = idx[i]!;
      idx[i] = idx[j]!;
      idx[j] = tmp;
    }
    const nTest = Math.max(1, Math.round(docs.length * testSize));
    const testIdx = idx.slice(0, nTest);
    const trainIdx = idx.slice(nTest);
    const split: TextSplit = {
      trainIds: trainIdx.map((i) => docs[i]!.id),
      testIds: testIdx.map((i) => docs[i]!.id),
      testSize,
      seed,
    };
    this.state = {
      ...this.state,
      split,
      fitted: false,
      model: null,
      predictions: null,
      metrics: null,
      trainMetrics: null,
      scoredOn: null,
    };
    return this.push(
      {
        kind: "split",
        label: `split test_size=${testSize}`,
        packageApi:
          "from sklearn.model_selection import train_test_split\ntrain_docs, test_docs = train_test_split(docs, test_size=" +
          testSize +
          ", random_state=" +
          seed +
          ")",
        status: "ok",
      },
      `train_test_split(docs, test_size=${testSize}, random_state=${seed})`,
      [
        `Split ${docs.length} docs → train=${split.trainIds.length} / test=${split.testIds.length}`,
        "Fit vectorizers and models on train only.",
      ],
    );
  }

  runFit(model: ModelName): CommandResult {
    if (!this.state.features || !this.state.corpus) {
      return this.err("Need features first: load → tokenize → vectorize");
    }
    if (!this.state.split) {
      return this.err("Split first — fitting on all docs then scoring test is leakage theatre.");
    }
    this.checkpoint();
    try {
      const docs = this.state.corpus.docs;
      const labels = docs.map((d) => d.label);
      const trainSet = new Set(this.state.split.trainIds);
      const trainIdx: number[] = [];
      const testIdx: number[] = [];
      docs.forEach((d, i) => {
        if (trainSet.has(d.id)) trainIdx.push(i);
        else testIdx.push(i);
      });
      // Rebuild vocab/features on train only to honor the contract.
      const docsTokens = this.state.docsTokens ?? [];
      const trainTokens = trainIdx.map((i) => docsTokens[i] ?? []).filter((t) => t.length > 0);
      const vocab = buildVocab(trainTokens.length ? trainTokens : docsTokens);
      const trainFeatures = fitFeatures(trainIdx.map((i) => docsTokens[i] ?? []), vocab, this.state.vectorizer ?? "tfidf");
      const testFeatures = fitFeatures(testIdx.map((i) => docsTokens[i] ?? []), vocab, this.state.vectorizer ?? "tfidf");
      const yTrain = trainIdx.map((i) => labels[i]!);
      const fitted = fitText(model, trainFeatures, yTrain);
      const predsTrain = predictAll(fitted, trainFeatures);
      const predsTest = predictAll(fitted, testFeatures);
      const yTest = testIdx.map((i) => labels[i]!);
      const labelList = this.state.corpus.labels;
      this.state = {
        ...this.state,
        vocab,
        features: fitFeatures(docsTokens, vocab, this.state.vectorizer ?? "tfidf"),
        trainFeatures,
        testFeatures,
        model: fitted,
        fitted: true,
        predictions: predsTest,
        metrics: classificationMetrics(yTest, predsTest, labelList),
        trainMetrics: classificationMetrics(yTrain, predsTrain, labelList),
        scoredOn: null,
      };
      const top = topFeatures(fitted, fitted.labels[0] ?? "", 5).map((t) => `${t.term}(${t.weight.toFixed(2)})`);
      return this.push(
        {
          kind: "fit",
          label: `fit ${model}`,
          packageApi: modelPackageApi(model),
          status: "ok",
        },
        modelPackageApi(model),
        [
          `Fitted ${model} on train (${trainFeatures.nDocs} docs × ${trainFeatures.nTerms} terms).`,
          `classes: ${fitted.labels.join(", ")}`,
          `top ${fitted.labels[0] ?? ""}: ${top.join(", ")}`,
          "Now `predict` and `score test`.",
        ],
      );
    } catch (e) {
      return this.err(e instanceof Error ? e.message : String(e));
    }
  }

  runPredict(): CommandResult {
    if (!this.state.model || !this.state.split || !this.state.docsTokens || !this.state.corpus) {
      return this.err("Fit a model first (after split + vectorize).");
    }
    this.checkpoint();
    const docs = this.state.corpus.docs;
    const trainSet = new Set(this.state.split.trainIds);
    const testIdx: number[] = [];
    docs.forEach((d, i) => {
      if (!trainSet.has(d.id)) testIdx.push(i);
    });
    const preds = this.state.predictions ?? [];
    return this.push(
      {
        kind: "predict",
        label: "predict",
        packageApi: "preds = clf.predict(X_test)",
        status: "ok",
      },
      "preds = clf.predict(X_test)",
      [
        `Predicted ${preds.length} test docs.`,
        ...testIdx.slice(0, 6).map((i, k) => {
          const d = docs[i]!;
          return `  ${d.id} true=${d.label} pred=${preds[k] ?? "?"}`;
        }),
      ],
    );
  }

  runScore(on: "train" | "test" = "test"): CommandResult {
    if (!this.state.model || !this.state.metrics || !this.state.trainMetrics) {
      return this.err("Fit a model first.");
    }
    this.checkpoint();
    const m = on === "test" ? this.state.metrics : this.state.trainMetrics;
    this.state = { ...this.state, scoredOn: on };
    this.markInspected("metrics");
    return this.push(
      {
        kind: "score",
        label: `score ${on}`,
        packageApi:
          on === "test"
            ? "from sklearn.metrics import classification_report\nprint(classification_report(y_test, preds))"
            : "print(classification_report(y_train, clf.predict(X_train)))",
        status: "ok",
      },
      `classification_report(y_${on}, preds)`,
      [`— ${on} metrics —`, ...formatClassification(m)],
    );
  }

  runCm(): CommandResult {
    const m = this.state.scoredOn === "train" ? this.state.trainMetrics : this.state.metrics;
    if (!m) return this.err("Score first: score test");
    this.checkpoint();
    this.markInspected("metrics");
    const header = `      ${m.labels.map((l) => l.slice(0, 6).padStart(6)).join("")}`;
    const rows = m.confusion.map((row, i) => {
      const name = (m.labels[i] ?? "").slice(0, 6).padStart(6);
      return `${name} ${row.map((v) => String(v).padStart(6)).join("")}`;
    });
    return this.push(
      {
        kind: "score",
        label: "cm",
        packageApi: "from sklearn.metrics import confusion_matrix\nconfusion_matrix(y_test, preds, labels=labels)",
        status: "ok",
      },
      "confusion_matrix(y_test, preds, labels=labels)",
      ["confusion matrix (rows=true, cols=pred)", header, ...rows],
    );
  }

  runSimilarity(a: string, b: string): CommandResult {
    if (!this.state.docsTokens || !this.state.corpus) return this.err("Tokenize first.");
    this.checkpoint();
    const docs = this.state.corpus.docs;
    const findDoc = (key: string) => docs.find((d) => d.id === key) ?? docs.find((d) => d.text.toLowerCase().includes(key.toLowerCase()));
    const da = findDoc(a);
    const db = findDoc(b);
    if (!da || !db) return this.err(`Could not find docs '${a}' and '${b}'. Use ids like r1, s2.`);
    const ia = docs.indexOf(da);
    const ib = docs.indexOf(db);
    let score = 0;
    let method = "tfidf-cosine";
    if (this.state.features) {
      score = cosine(this.state.features.rows[ia] ?? [], this.state.features.rows[ib] ?? []);
    } else if (this.state.embedding) {
      method = "embedding-cosine";
      const va = sentenceVector(this.state.embedding, this.state.docsTokens[ia] ?? []);
      const vb = sentenceVector(this.state.embedding, this.state.docsTokens[ib] ?? []);
      score = cosine(va, vb);
    } else {
      const ta = new Set((this.state.docsTokens[ia] ?? []).map((t) => (t.norm ?? t.text).toLowerCase()));
      const tb = new Set((this.state.docsTokens[ib] ?? []).map((t) => (t.norm ?? t.text).toLowerCase()));
      const inter = [...ta].filter((x) => tb.has(x)).length;
      score = inter / Math.max(1, Math.sqrt(ta.size * tb.size));
      method = "token-jaccard-ish";
    }
    const result: SimilarityResult = { a: da.id, b: db.id, score, method };
    this.state = { ...this.state, similarities: [...this.state.similarities, result] };
    return this.push(
      {
        kind: "similarity",
        label: `similarity ${da.id} ${db.id}`,
        packageApi:
          "from sklearn.metrics.pairwise import cosine_similarity\ncosine_similarity(X[a], X[b])",
        status: "ok",
      },
      "cosine_similarity(X[a], X[b])",
      [
        `sim(${da.id}, ${db.id}) via ${method} = ${score.toFixed(3)}`,
        `A: ${da.text.slice(0, 70)}`,
        `B: ${db.text.slice(0, 70)}`,
      ],
    );
  }

  runNearest(target: string): CommandResult {
    if (!this.state.embedding && !this.state.features) {
      return this.err("Build embeddings or features first.");
    }
    this.checkpoint();
    if (this.state.embedding) {
      const { vector, oov } = lookup(this.state.embedding, target);
      const nn = nearest(this.state.embedding, vector, 5, target.toLowerCase());
      return this.push(
        {
          kind: "similarity",
          label: `nearest ${target}`,
          packageApi: "model.wv.most_similar('word')",
          status: "ok",
        },
        "model.wv.most_similar('word')",
        [
          `nearest('${target}')${oov ? " [OOV — " + this.state.embedding.oovStrategy + "]" : ""}`,
          ...nn.map((n) => `  ${n.word.padEnd(16)} ${n.score.toFixed(3)}`),
        ],
      );
    }
    return this.err("Use `embed` first for nearest neighbors.");
  }

  runTopic(model: TopicModel, k = 3): CommandResult {
    if (!this.state.features) return this.err("Vectorize first: vectorize tfidf");
    this.checkpoint();
    try {
      const { topics, docTopic } = fitTopics(this.state.features, k, 42, model);
      this.state = {
        ...this.state,
        topics,
        topicDoc: docTopic[0] ?? null,
      };
      return this.push(
        {
          kind: "topic",
          label: `topic ${model} k=${k}`,
          packageApi: topicPackageApi(model),
          status: "ok",
        },
        topicPackageApi(model),
        [
          `Fitted ${model} with k=${k}.`,
          ...topics.map(
            (t) => `topic ${t.id}: ${t.topWords.slice(0, 6).map((w) => `${w.term}(${w.weight.toFixed(2)})`).join(" ")}`,
          ),
          docTopic[0] ? `doc0 mixture: ${docTopic[0].map((v) => v.toFixed(2)).join(" / ")}` : "",
        ].filter(Boolean),
      );
    } catch (e) {
      return this.err(e instanceof Error ? e.message : String(e));
    }
  }

  runPos(): CommandResult {
    const tokens = this.state.tokens;
    if (!tokens || tokens.length === 0) return this.err("Tokenize first: tokenize word");
    this.checkpoint();
    const tagged = tagPos(tokens);
    this.state = { ...this.state, posTags: tagged };
    return this.push(
      {
        kind: "pos",
        label: "pos",
        packageApi: SEQUENCE_PACKAGE_API.pos,
        status: "ok",
      },
      SEQUENCE_PACKAGE_API.pos,
      ["POS tags (doc0):", tagged.map((t) => `${t.text}/${t.pos}`).join(" ")],
    );
  }

  runNer(): CommandResult {
    const tokens = this.state.tokens;
    if (!tokens || tokens.length === 0) {
      // try entities corpus
      if (this.state.corpus) {
        this.checkpoint();
        const all = this.state.corpus.docs.flatMap((d) => extractEntities(tokenize(d.text, "word")));
        this.state = { ...this.state, entities: all };
        return this.push(
          {
            kind: "ner",
            label: "ner",
            packageApi: SEQUENCE_PACKAGE_API.ner,
            status: "ok",
          },
          SEQUENCE_PACKAGE_API.ner,
          [
            `Found ${all.length} entities.`,
            ...all.slice(0, 8).map((e) => `  ${e.label.padEnd(7)} ${e.text}`),
          ],
        );
      }
      return this.err("Tokenize first.");
    }
    this.checkpoint();
    const ents = extractEntities(tokens);
    this.state = { ...this.state, entities: ents };
    return this.push(
      {
        kind: "ner",
        label: "ner",
        packageApi: SEQUENCE_PACKAGE_API.ner,
        status: "ok",
      },
      SEQUENCE_PACKAGE_API.ner,
      [
        `Found ${ents.length} entities.`,
        ...ents.map((e) => `  ${e.label.padEnd(7)} ${e.text}`),
      ],
    );
  }

  runDep(): CommandResult {
    const tokens = this.state.tokens;
    if (!tokens || tokens.length === 0) return this.err("Tokenize first: tokenize word");
    this.checkpoint();
    const deps = parseDeps(tokens);
    this.state = { ...this.state, deps };
    return this.push(
      {
        kind: "dep",
        label: "dep",
        packageApi: SEQUENCE_PACKAGE_API.dep,
        status: "ok",
      },
      SEQUENCE_PACKAGE_API.dep,
      ["Dependency relations (doc0):", ...deps.map((d) => `  ${d.word} ←${d.rel}─ ${d.head}`)],
    );
  }

  runAttention(): CommandResult {
    const tokens = this.state.tokens;
    if (!tokens || tokens.length === 0) return this.err("Tokenize first: tokenize word");
    this.checkpoint();
    if (!this.state.embedding) {
      // auto-build a tiny embedding so the map is meaningful
      if (this.state.docsTokens) {
        this.state = {
          ...this.state,
          embedding: buildEmbedding(this.state.docsTokens, "word2vec"),
        };
      } else {
        return this.err("Build embeddings first: embed word2vec");
      }
    }
    const emb = this.state.embedding!;
    const vectors = tokens.map((t) => lookup(emb, t.norm ?? t.text).vector);
    const cells = attentionMap(tokens, vectors);
    this.state = { ...this.state, attention: cells };
    const n = tokens.length;
    return this.push(
      {
        kind: "attention",
        label: "attention",
        packageApi: SEQUENCE_PACKAGE_API.attention,
        status: "ok",
      },
      SEQUENCE_PACKAGE_API.attention,
      [
        `Attention map ${n}×${n} from token embeddings.`,
        tokens.slice(0, 10).map((t) => t.text).join(" | "),
      ],
    );
  }

  runCompare(a: string, b: string): CommandResult {
    this.checkpoint();
    const notes: Record<string, string> = {
      nltk: "classic teaching library: corpora, tokenizers, stemmers, WordNet. Great for learning; slower pipelines.",
      spacy: "industrial NLP: POS/NER/dep, fast Cython, opinionated pipelines. Default for production tagging.",
      sklearn: "text features + classical ML: TfidfVectorizer, LinearSVC. Often beats deep models on small data.",
      gensim: "topic models and word embeddings: LDA, Word2Vec, FastText. Scales to large corpora.",
      transformers: "contextual embeddings, fine-tuning, SOTA quality. Heavy; needs GPU for big models.",
      tokenizers: "fast BPE/WordPiece trainers used under Transformers. Subword is why OOV shrinks.",
    };
    const keyA = a.toLowerCase();
    const keyB = b.toLowerCase();
    const lineA = notes[keyA] ?? `Unknown package '${a}'.`;
    const lineB = notes[keyB] ?? `Unknown package '${b}'.`;
    this.state = {
      ...this.state,
      compared: [keyA, keyB],
    };
    return this.push(
      {
        kind: "compare",
        label: `compare pkg ${a} ${b}`,
        packageApi: "# choose the right tool for the job",
        status: "ok",
      },
      "# choose the right tool for the job",
      [`=== ${a} ===`, lineA, `=== ${b} ===`, lineB],
    );
  }

  runPipelineLesson(): CommandResult {
    this.checkpoint();
    this.state = { ...this.state, pipelineSaved: true };
    return this.push(
      {
        kind: "pipeline",
        label: "pipeline",
        packageApi:
          "from sklearn.pipeline import Pipeline\npipe = Pipeline([\n  ('tfidf', TfidfVectorizer()),\n  ('clf', LogisticRegression(max_iter=1000)),\n])\npipe.fit(train_docs, y_train)",
        status: "ok",
      },
      "Pipeline([('tfidf', TfidfVectorizer()), ('clf', LogisticRegression())])",
      [
        "Production order that does not leak:",
        "  1. split docs (and labels)",
        "  2. fit vectorizer on train",
        "  3. transform test with the SAME fitted vectorizer",
        "  4. fit classifier on train vectors",
        "  5. score once on test",
        "sklearn Pipeline wraps 2–4 so the order cannot drift.",
      ],
    );
  }
}
