/**
 * Command DSL parser and dispatcher for the terminal dock.
 */

import { CORPUS_NAMES, describeCorpora } from "./corpora";
import type { CommandResult, Session } from "./session";
import type {
  CorpusName,
  EmbedderName,
  ModelName,
  NormalizerName,
  TokenizerName,
  TopicModel,
  VectorizerName,
} from "./types";

export interface DispatchExtras {
  onShowLevels?: () => string[];
  onShowGoal?: () => string[];
  onHint?: () => string[];
  onRunLevel?: (id: string) => string[];
  onShow?: (what: string) => string[];
}

const HELP_LINES = [
  "LearnNLP commands (production NLP mental model)",
  "",
  "  load <corpus>              load a built-in text corpus",
  "  tokenize <strategy>        whitespace | word | subword | sentence",
  "  normalize <op> [op...]     lower | stopwords | stem | lemmatize",
  "  vectorize <mode>           count | bow | tfidf",
  "  embed <mode>               word2vec | fasttext | sbert",
  "  split test_size=0.25       hold out a test set (before fit)",
  "  fit <model>                naive_bayes | logistic | svm | dummy",
  "  predict                    predict the test set",
  "  score [train|test]         classification metrics",
  "  cm                         confusion matrix",
  "  similarity <a> <b>         cosine between two docs (ids)",
  "  nearest <word>             nearest neighbors in embedding space",
  "  topic lda|nmf [k]          topic model top words",
  "  pos | ner | dep            spaCy-style sequence labelling",
  "  attention                  attention map over doc tokens",
  "  compare pkg <a> <b>        NLTK / spaCy / sklearn / gensim / transformers",
  "  pipeline                   production pipeline order lesson",
  "  show text|tokens|vocab|features|metrics|pipeline|code",
  "  goal | hint | levels | run <id> | reset | undo | clear | help",
  "",
  `corpora:  ${CORPUS_NAMES.join(", ")}`,
  "tokenizers: whitespace, word, subword, sentence",
  "models:   naive_bayes, logistic, svm, dummy",
  "",
  "Each command prints the real package API below the dock.",
];

function parseKwargs(tokens: string[]): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const tok of tokens) {
    const eq = tok.indexOf("=");
    if (eq <= 0) {
      throw new Error(`Expected key=value, got '${tok}'`);
    }
    const key = tok.slice(0, eq);
    const raw = tok.slice(eq + 1);
    const num = Number(raw);
    out[key] = /^-?\d+(\.\d+)?$/.test(raw) ? num : raw;
  }
  return out;
}

function ok(lines: string[], snapshot: CommandResult["snapshot"], packageApi: string | null = null): CommandResult {
  return { lines, packageApi, status: "ok", snapshot };
}

/**
 * Execute one command line against a Session.
 *
 * Args:
 *   session: Mutable sandbox session.
 *   line: Raw user input.
 *   extras: UI callbacks for levels/goal/hint/show.
 *
 * Returns:
 *   CommandResult with echo lines, optional package API, and snapshot.
 *
 * Raises:
 *   Error: On unknown commands (caught by the terminal UI via status).
 *
 * Examples:
 *   >>> dispatch(session, "load reviews").lines[0]
 *   'Loaded \'reviews\''
 */
export function dispatch(
  session: Session,
  line: string,
  extras: DispatchExtras = {},
): CommandResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return ok([], session.snapshot());
  }
  const tokens = trimmed.split(/\s+/);
  const cmd = (tokens[0] ?? "").toLowerCase();
  const args = tokens.slice(1);

  switch (cmd) {
    case "help":
    case "?":
      return ok([...HELP_LINES], session.snapshot());
    case "levels":
      return ok(extras.onShowLevels?.() ?? ["No level list wired."], session.snapshot());
    case "goal":
      return ok(extras.onShowGoal?.() ?? ["No goal wired."], session.snapshot());
    case "hint":
      return ok(extras.onHint?.() ?? ["No hints wired."], session.snapshot());
    case "run": {
      const id = args[0] ?? "";
      return ok(extras.onRunLevel?.(id) ?? [`Unknown level '${id}'`], session.snapshot());
    }
    case "show": {
      const what = args[0] ?? "text";
      return ok(extras.onShow?.(what) ?? [`show ${what}: not wired`], session.snapshot());
    }
    case "clear":
    case "reset":
      return session.reset();
    case "undo":
      return session.undo();
    case "load": {
      const name = args[0] as CorpusName;
      return session.load(name);
    }
    case "tokenize": {
      const strategy = (args[0] ?? "word") as TokenizerName;
      return session.runTokenize(strategy);
    }
    case "normalize":
    case "norm": {
      const ops = args as NormalizerName[];
      if (ops.length === 0) {
        return {
          lines: ["Usage: normalize lower|stopwords|stem|lemmatize [more...]"],
          packageApi: null,
          status: "error",
          snapshot: session.snapshot(),
        };
      }
      return session.runNormalize(ops);
    }
    case "vectorize":
    case "vec": {
      const mode = (args[0] ?? "tfidf") as VectorizerName;
      return session.runVectorize(mode);
    }
    case "embed": {
      const mode = (args[0] ?? "word2vec") as EmbedderName;
      return session.runEmbed(mode);
    }
    case "split": {
      const kw = parseKwargs(args.filter((a) => a.includes("=")));
      const testSize = Number(kw.test_size ?? 0.25);
      const seed = Number(kw.seed ?? kw.random_state ?? 42);
      return session.runSplit(testSize, seed);
    }
    case "fit": {
      const model = (args[0] ?? "logistic") as ModelName;
      return session.runFit(model);
    }
    case "predict":
      return session.runPredict();
    case "score": {
      const on = (args[0] ?? "test") as "train" | "test";
      return session.runScore(on);
    }
    case "cm":
      return session.runCm();
    case "similarity":
    case "sim": {
      const a = args[0] ?? "";
      const b = args[1] ?? "";
      return session.runSimilarity(a, b);
    }
    case "nearest":
    case "nn": {
      const w = args[0] ?? "";
      return session.runNearest(w);
    }
    case "topic": {
      const model = (args[0] ?? "lda") as TopicModel;
      const k = Number(args[1] ?? 3);
      return session.runTopic(model, k);
    }
    case "pos":
      return session.runPos();
    case "ner":
      return session.runNer();
    case "dep":
      return session.runDep();
    case "attention":
    case "attn":
      return session.runAttention();
    case "compare": {
      // compare pkg nltk spaCy
      const parts = args[0] === "pkg" ? args.slice(1) : args;
      return session.runCompare(parts[0] ?? "", parts[1] ?? "");
    }
    case "pipeline":
      return session.runPipelineLesson();
    case "corpora":
    case "datasets":
      return ok(describeCorpora(), session.snapshot());
    default:
      return {
        lines: [`Unknown command '${cmd}'. Type 'help'.`],
        packageApi: null,
        status: "error",
        snapshot: session.snapshot(),
      };
  }
}
