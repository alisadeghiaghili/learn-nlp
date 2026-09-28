/**
 * Text classifiers: Multinomial NB, logistic regression, linear SVM-ish, dummy.
 */

import type { ClassificationMetrics, FeatureMatrix, ModelName } from "./types";

export interface FittedModel {
  readonly name: ModelName;
  readonly labels: readonly string[];
  /** label → log-prior or intercept */
  readonly priors: readonly number[];
  /** label × term weights */
  readonly weights: readonly number[][];
  readonly terms: readonly string[];
}

const EPS = 1e-9;

/**
 * Fit a text classifier on a feature matrix and labels.
 *
 * Args:
 *   model: naive_bayes | logistic | svm | dummy.
 *   X: Document-term matrix (train).
 *   y: Label per train document.
 *
 * Returns:
 *   FittedModel ready for predict.
 *
 * Raises:
 *   Error: On unknown model or empty train set.
 *
 * Examples:
 *   >>> fitText("dummy", X, y).name
 *   'dummy'
 */
export function fitText(
  model: ModelName,
  X: FeatureMatrix,
  y: readonly string[],
): FittedModel {
  if (X.nDocs === 0) throw new Error("Cannot fit on an empty training set");
  if (X.nDocs !== y.length) throw new Error("X rows and y length must match");
  const labels = [...new Set(y)].sort();
  const li = new Map(labels.map((l, i) => [l, i]));
  const nLabels = labels.length;
  const nTerms = X.nTerms;

  if (model === "dummy") {
    const counts = labels.map((l) => y.filter((v) => v === l).length);
    const best = counts.indexOf(Math.max(...counts));
    const weights = labels.map((_, i) =>
      new Array<number>(nTerms).fill(i === best ? 0 : -Infinity),
    );
    return {
      name: model,
      labels,
      priors: counts.map((c) => c / y.length),
      weights,
      terms: X.terms,
    };
  }

  if (model === "naive_bayes") {
    const counts = labels.map(() => new Array<number>(nTerms).fill(1)); // Laplace
    const priors = labels.map(() => 1);
    for (let r = 0; r < X.nDocs; r += 1) {
      const lab = y[r];
      const idx = lab === undefined ? -1 : (li.get(lab) ?? -1);
      if (idx < 0) continue;
      const row = X.rows[r] ?? [];
      priors[idx] = (priors[idx] ?? 0) + 1;
      const c = counts[idx];
      if (!c) continue;
      for (let j = 0; j < nTerms; j += 1) {
        c[j] = (c[j] ?? 0) + (row[j] ?? 0);
      }
    }
    const total = y.length + nLabels;
    const weights = counts.map((c) => {
      const sum = c.reduce((a, b) => a + b, 0) + EPS;
      return c.map((v) => Math.log((v + EPS) / sum));
    });
    return {
      name: model,
      labels,
      priors: priors.map((p) => Math.log((p + EPS) / (total + EPS))),
      weights,
      terms: X.terms,
    };
  }

  // logistic / svm: one-vs-rest SGD on hinge or logistic loss
  const weights = labels.map(() => new Array<number>(nTerms).fill(0));
  const bias = labels.map(() => 0);
  const epochs = model === "svm" ? 40 : 30;
  const lr = 0.35;
  for (let ep = 0; ep < epochs; ep += 1) {
    for (let r = 0; r < X.nDocs; r += 1) {
      const row = X.rows[r] ?? [];
      const truth = y[r];
      for (let k = 0; k < nLabels; k += 1) {
        const w = weights[k]!;
        let score = bias[k] ?? 0;
        for (let j = 0; j < nTerms; j += 1) {
          const v = row[j] ?? 0;
          if (v !== 0) score += v * (w[j] ?? 0);
        }
        const sign = truth === labels[k] ? 1 : -1;
        const margin = sign * score;
        let grad = 0;
        if (model === "svm") {
          grad = margin < 1 ? -sign : 0;
        } else {
          const p = 1 / (1 + Math.exp(-score));
          grad = -(truth === labels[k] ? 1 - p : p);
        }
        if (grad !== 0) {
          for (let j = 0; j < nTerms; j += 1) {
            const v = row[j] ?? 0;
            if (v !== 0) w[j] = (w[j] ?? 0) - lr * grad * v;
          }
          bias[k] = (bias[k] ?? 0) - lr * grad;
        }
      }
    }
  }
  return {
    name: model,
    labels,
    priors: bias,
    weights,
    terms: X.terms,
  };
}

/**
 * Decision scores for each class.
 */
export function decisionScores(model: FittedModel, row: readonly number[]): number[] {
  return model.weights.map((w, k) => {
    let s = model.priors[k] ?? 0;
    if (s === -Infinity) return -Infinity;
    for (let j = 0; j < model.terms.length; j += 1) {
      const v = row[j] ?? 0;
      if (v !== 0) s += v * (w[j] ?? 0);
    }
    return s;
  });
}

export function predictOne(model: FittedModel, row: readonly number[]): string {
  const scores = decisionScores(model, row);
  let best = 0;
  for (let i = 1; i < scores.length; i += 1) {
    if ((scores[i] ?? -Infinity) > (scores[best] ?? -Infinity)) best = i;
  }
  return model.labels[best] ?? model.labels[0] ?? "?";
}

export function predictAll(model: FittedModel, X: FeatureMatrix): string[] {
  return X.rows.map((row) => predictOne(model, row));
}

export function topFeatures(model: FittedModel, label: string, k = 8): { term: string; weight: number }[] {
  const idx = model.labels.indexOf(label);
  if (idx < 0) return [];
  const w = model.weights[idx] ?? [];
  return model.terms
    .map((term, j) => ({ term, weight: w[j] ?? 0 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, k);
}

export function modelPackageApi(model: ModelName): string {
  switch (model) {
    case "naive_bayes":
      return "from sklearn.naive_bayes import MultinomialNB\nclf = MultinomialNB()\nclf.fit(X_train, y_train)";
    case "logistic":
      return "from sklearn.linear_model import LogisticRegression\nclf = LogisticRegression(max_iter=1000)\nclf.fit(X_train, y_train)";
    case "svm":
      return "from sklearn.svm import LinearSVC\nclf = LinearSVC()\nclf.fit(X_train, y_train)";
    case "dummy":
      return "from sklearn.dummy import DummyClassifier\nclf = DummyClassifier(strategy='most_frequent')\nclf.fit(X_train, y_train)";
    default:
      return "clf.fit(X_train, y_train)";
  }
}

export function classificationMetrics(
  yTrue: readonly string[],
  yPred: readonly string[],
  labels: readonly string[],
): ClassificationMetrics {
  const n = yTrue.length;
  const labelList = labels.length ? labels : [...new Set([...yTrue, ...yPred])].sort();
  const index = new Map(labelList.map((l, i) => [l, i]));
  const confusion = labelList.map(() => labelList.map(() => 0));
  let correct = 0;
  for (let i = 0; i < n; i += 1) {
    const t = yTrue[i] ?? "";
    const p = yPred[i] ?? "";
    if (t === p) correct += 1;
    const ti = index.get(t);
    const pi = index.get(p);
    if (ti !== undefined && pi !== undefined) {
      const row = confusion[ti];
      if (row) row[pi] = (row[pi] ?? 0) + 1;
    }
  }
  // binary metrics on first label if binary, else macro
  const metricsFor = (pos: string) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (let i = 0; i < n; i += 1) {
      const t = yTrue[i] === pos;
      const p = yPred[i] === pos;
      if (p && t) tp += 1;
      else if (p && !t) fp += 1;
      else if (!p && t) fn += 1;
    }
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    return { precision, recall, f1, tp, fp, fn };
  };
  const posLabel = labelList.length >= 2 ? (labelList.find((l) => l !== "neg" && l !== "neu") ?? labelList[0] ?? "") : (labelList[0] ?? "");
  const m = metricsFor(posLabel);
  // macro F1
  const macro = labelList.map((l) => metricsFor(l).f1);
  const f1 = macro.length ? macro.reduce((a, b) => a + b, 0) / macro.length : 0;
  const precisions = labelList.map((l) => metricsFor(l).precision);
  const recalls = labelList.map((l) => metricsFor(l).recall);
  return {
    accuracy: n === 0 ? 0 : correct / n,
    precision: precisions.reduce((a, b) => a + b, 0) / Math.max(1, precisions.length),
    recall: recalls.reduce((a, b) => a + b, 0) / Math.max(1, recalls.length),
    f1: labelList.length === 2 ? m.f1 : f1,
    confusion,
    labels: labelList,
    n,
  };
}

export function formatClassification(m: ClassificationMetrics): string[] {
  return [
    `n=${m.n}  labels=${m.labels.join("/")}`,
    `accuracy  ${m.accuracy.toFixed(3)}`,
    `precision ${m.precision.toFixed(3)}`,
    `recall    ${m.recall.toFixed(3)}`,
    `f1        ${m.f1.toFixed(3)}`,
  ];
}
