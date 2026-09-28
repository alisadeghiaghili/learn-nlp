/**
 * World 4 — Classification and honest metrics.
 */

import type { Level, WinResult } from "../engine/types";

function fail(feedback: string): WinResult {
  return { won: false, feedback };
}

function win(feedback = "Clear. Concept locked."): WinResult {
  return { won: true, feedback };
}

export const WORLD4_LEVELS: Level[] = [
  {
    id: "4.1",
    world: "w4",
    worldTitle: "Classification",
    title: "Split before you fit",
    concept: {
      title: "Test docs must never train the vectorizer",
      body:
        "Text leakage is easy and silent. If you fit TF-IDF on the full corpus, test documents influence the vocabulary and idf weights. The model then peeks at the future. Split first, fit the vectorizer on train, transform test with the frozen vectorizer.",
      whatHappens:
        "`split` reserves test docs. `fit logistic` rebuilds vocabulary on train only in this sandbox — exactly what sklearn Pipeline enforces in production. Fitting without a split is refused.",
      why:
        "Teams ship inflated benchmarks because the vectorizer saw the test set. The fix is structural: Pipeline and train-only fit.",
      callout: "The hold-out is sacred — including for CountVectorizer and TfidfVectorizer.",
      packages: ["sklearn train_test_split", "sklearn Pipeline"],
    },
    goal: "Split reviews, then fit logistic, then score on test.",
    hints: [
      "`load reviews` → `tokenize word` → `vectorize tfidf`",
      "`split test_size=0.25` → `fit logistic` → `score test`",
    ],
    learning: ["train/test split for text", "vectorizer leakage", "Pipeline discipline"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "vec",
        label: "Tokenize + vectorize",
        detail: "Features before split is ok; split before fit is mandatory.",
        command: "vectorize tfidf",
        check: (s) => Boolean(s.features),
      },
      {
        id: "split",
        label: "Split",
        detail: "Hold out test docs.",
        command: "split test_size=0.25",
        check: (s) => Boolean(s.split),
      },
      {
        id: "fit",
        label: "Fit logistic",
        detail: "Train-only fit.",
        command: "fit logistic",
        check: (s) => s.fitted && s.model === "logistic",
      },
      {
        id: "score",
        label: "Score on test",
        detail: "Honest estimate.",
        command: "score test",
        check: (s) => s.scoredOn === "test" && Boolean(s.metrics),
      },
    ],
    win: (s) => {
      if (!s.split) return fail("Split first.");
      if (!s.fitted || s.model !== "logistic") return fail("Fit logistic on the train split.");
      if (s.scoredOn !== "test" || !s.metrics) return fail("Score on test.");
      return win("Split → fit → score. That order is the product.");
    },
  },
  {
    id: "4.2",
    world: "w4",
    worldTitle: "Classification",
    title: "Baseline or bust",
    concept: {
      title: "Beat DummyClassifier before you celebrate",
      body:
        "A model that always predicts the majority class can look impressive on unbalanced data. Multinomial Naive Bayes is the classic text baseline: fast, strong on small bags of words, and honest about independence assumptions. Beat the dummy first; then argue about transformers.",
      whatHappens:
        "Fit `dummy` and `naive_bayes` on the same split. Compare `score test`. NB should win on reviews because sentiment words are informative and the class balance is fair.",
      why:
        "A baseline converts \"the model works\" into \"the model beats the obvious cheat.\" Without that, metrics are decoration.",
      callout: "If you have not beaten DummyClassifier, you do not have a model.",
      packages: ["sklearn DummyClassifier", "sklearn MultinomialNB"],
    },
    goal: "Score both dummy and naive_bayes on test.",
    hints: [
      "`fit dummy` → `score test`",
      "`fit naive_bayes` → `score test` and compare accuracy / f1.",
    ],
    learning: ["majority baseline", "Multinomial NB", "why baselines matter"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "split",
        label: "Split",
        detail: "Need a test set.",
        check: (s) => Boolean(s.split),
      },
      {
        id: "dummy",
        label: "Fit + score dummy",
        detail: "Majority class baseline.",
        command: "fit dummy",
        check: (s) => s.model === "dummy" && Boolean(s.metrics),
      },
      {
        id: "nb",
        label: "Fit + score naive_bayes",
        detail: "Classic text baseline.",
        command: "fit naive_bayes",
        check: (s) => s.model === "naive_bayes" && Boolean(s.metrics),
      },
    ],
    win: (s) => {
      if (!s.split) return fail("Split first.");
      if (s.model !== "naive_bayes" || !s.metrics) {
        return fail("Finish with naive_bayes so you can compare against dummy.");
      }
      return win("Baselines are how you know the number means anything.");
    },
  },
  {
    id: "4.3",
    world: "w4",
    worldTitle: "Classification",
    title: "Precision vs recall",
    concept: {
      title: "Accuracy hides the cost of errors",
      body:
        "In spam filtering, a false positive (ham marked spam) is worse than a miss. In medical screening, a false negative is worse. Precision and recall make those costs visible. The confusion matrix shows *which* mistakes dominate. F1 is the harmonic mean when you need one number.",
      whatHappens:
        "Fit logistic, `score test`, then `cm`. Read the off-diagonal cells. Tweak by changing model (`svm` vs `logistic`) and watch which error type moves.",
      why:
        "Stakeholders never ask for accuracy. They ask for \"don't miss fraud\" or \"don't block good users.\" Metrics must match that sentence.",
      formula: "precision = TP/(TP+FP) · recall = TP/(TP+FN) · F1 = 2PR/(P+R)",
      callout: "Pick the metric from the cost of the mistake, not from the leaderboard.",
      packages: ["sklearn precision_recall_fscore_support", "sklearn confusion_matrix"],
    },
    goal: "Score on test and open the confusion matrix.",
    hints: ["`fit logistic` → `score test` → `cm`."],
    learning: ["precision", "recall", "F1", "confusion matrix"],
    seedCorpus: "reviews",
    steps: [
      {
        id: "fit",
        label: "Fit a classifier",
        detail: "logistic or svm.",
        check: (s) => s.fitted,
      },
      {
        id: "score",
        label: "Score test",
        detail: "Read P/R/F1.",
        command: "score test",
        check: (s) => s.scoredOn === "test" && Boolean(s.metrics),
      },
      {
        id: "cm",
        label: "Confusion matrix",
        detail: "Which mistakes?",
        command: "cm",
        check: (s) => s.inspectedMetrics,
      },
    ],
    win: (s) => {
      if (!s.metrics || s.scoredOn !== "test") return fail("Score on test first.");
      if (!s.inspectedMetrics) return fail("Open `cm` and read the errors.");
      return win("Errors have names. Count them before you tune anything.");
    },
  },
  {
    id: "4.4",
    world: "w4",
    worldTitle: "Classification",
    title: "Short text is different",
    concept: {
      title: "Tweets break long-document assumptions",
      body:
        "Reviews have repeating vocabulary. Tweets are short, slang-heavy, and noisy. A TF-IDF matrix on tweets is even sparser; emoji and truncation matter; class boundaries blur (\"not bad\" is positive-ish). This is where feature craft and calibrated thresholds matter more than model size.",
      whatHappens:
        "`load tweets` (pos/neg/neu). Build TF-IDF, split, fit logistic, score. The sandbox will show lower absolute scores than reviews — that is the lesson, not a bug.",
      why:
        "If your demo only works on clean paragraphs, it will die in production messaging data.",
      callout: "Measure on the text distribution you will actually receive.",
      packages: ["sklearn TfidfVectorizer", "regex / tweet tokenizer (NLTK)"],
    },
    goal: "Train on tweets and publish a test score.",
    hints: [
      "`load tweets` → `tokenize word` → `normalize lower` → `vectorize tfidf`",
      "`split` → `fit logistic` → `score test`",
    ],
    learning: ["short text challenges", "class imbalance", "domain mismatch"],
    seedCorpus: "tweets",
    steps: [
      {
        id: "vec",
        label: "Vectorize tweets",
        detail: "Sparse short text.",
        command: "vectorize tfidf",
        check: (s) => Boolean(s.features),
      },
      {
        id: "fit",
        label: "Fit logistic",
        detail: "Three-way sentiment.",
        command: "fit logistic",
        check: (s) => s.fitted,
      },
      {
        id: "score",
        label: "Score test",
        detail: "Honest number.",
        check: (s) => s.scoredOn === "test" && Boolean(s.metrics),
      },
    ],
    win: (s) => {
      if (!s.metrics || s.scoredOn !== "test") return fail("Score on test.");
      return win("Short text is harder. Publish the number you can defend on real traffic.");
    },
  },
];
