/**
 * Shared engine types for the LearnNLP sandbox.
 *
 * Mirrors the production NLP mental model (tokenize → normalize → vectorize
 * → model) without depending on a real Python runtime.
 */

export type CorpusName =
  | "reviews"
  | "news"
  | "tweets"
  | "sentences"
  | "entities"
  | "docs";

export type TokenizerName = "whitespace" | "word" | "subword" | "sentence";

export type NormalizerName = "lower" | "stem" | "lemmatize" | "stopwords";

export type VectorizerName = "count" | "bow" | "tfidf";

export type EmbedderName = "word2vec" | "fasttext" | "sbert";

export type ModelName = "naive_bayes" | "logistic" | "svm" | "dummy";

export type SequenceTask = "pos" | "ner" | "dep";

export type TopicModel = "lda" | "nmf";

export interface Doc {
  readonly id: string;
  readonly text: string;
  readonly label: string;
}

export interface Corpus {
  readonly name: CorpusName;
  readonly task: "classification" | "sequence" | "similarity" | "topics";
  readonly labels: readonly string[];
  readonly docs: readonly Doc[];
}

export interface Token {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly norm?: string;
  readonly lemma?: string;
  readonly pos?: string;
  readonly isStop?: boolean;
}

export interface VocabEntry {
  readonly term: string;
  readonly df: number;
  readonly idf: number;
}

export interface FeatureMatrix {
  readonly nDocs: number;
  readonly nTerms: number;
  readonly terms: readonly string[];
  readonly rows: readonly number[][];
}

export interface Embedding {
  readonly name: EmbedderName;
  readonly dim: number;
  readonly vectors: ReadonlyMap<string, readonly number[]>;
  readonly oovStrategy: string;
}

export interface ClassificationMetrics {
  readonly accuracy: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly confusion: readonly (readonly number[])[];
  readonly labels: readonly string[];
  readonly n: number;
}

export interface SimilarityResult {
  readonly a: string;
  readonly b: string;
  readonly score: number;
  readonly method: string;
}

export interface TopicWord {
  readonly term: string;
  readonly weight: number;
}

export interface Topic {
  readonly id: number;
  readonly topWords: readonly TopicWord[];
}

export interface AttentionCell {
  readonly from: number;
  readonly to: number;
  readonly weight: number;
}

export interface SequenceSpan {
  readonly text: string;
  readonly label: string;
  readonly start: number;
  readonly end: number;
}

export type StepKind =
  | "load"
  | "tokenize"
  | "normalize"
  | "vectorize"
  | "embed"
  | "split"
  | "fit"
  | "predict"
  | "score"
  | "similarity"
  | "topic"
  | "pos"
  | "ner"
  | "dep"
  | "attention"
  | "cluster"
  | "compare"
  | "pipeline"
  | "reset";

export interface PipelineStep {
  readonly kind: StepKind;
  readonly label: string;
  readonly packageApi: string;
  readonly status: "ok" | "warn" | "error";
  readonly detail?: string;
}

export interface WinResult {
  readonly won: boolean;
  readonly feedback: string;
}

export interface ConceptBrief {
  readonly title: string;
  readonly body: string;
  readonly whatHappens: string;
  readonly why: string;
  readonly formula?: string;
  readonly callout?: string;
  readonly packages?: readonly string[];
}

export interface GoalStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly command?: string;
  readonly check: (state: SessionSnapshot) => boolean;
}

export interface Level {
  readonly id: string;
  readonly world: string;
  readonly worldTitle: string;
  readonly title: string;
  readonly concept: ConceptBrief;
  readonly goal: string;
  readonly hints: readonly string[];
  readonly learning: readonly string[];
  readonly steps: readonly GoalStep[];
  readonly seedCorpus?: CorpusName;
  readonly win: (state: SessionSnapshot) => WinResult;
}

export interface TextSplit {
  readonly trainIds: readonly string[];
  readonly testIds: readonly string[];
  readonly testSize: number;
  readonly seed: number;
}

export interface SessionSnapshot {
  readonly corpus: Corpus | null;
  readonly tokens: readonly Token[] | null;
  readonly tokenizer: TokenizerName | null;
  readonly normalizers: readonly NormalizerName[];
  readonly vocab: readonly VocabEntry[] | null;
  readonly features: FeatureMatrix | null;
  readonly vectorizer: VectorizerName | null;
  readonly vectorizerLeaked: boolean;
  readonly embedding: Embedding | null;
  readonly split: TextSplit | null;
  readonly model: ModelName | null;
  readonly fitted: boolean;
  readonly predictions: readonly string[] | null;
  readonly metrics: ClassificationMetrics | null;
  readonly trainMetrics: ClassificationMetrics | null;
  readonly similarities: readonly SimilarityResult[];
  readonly topics: readonly Topic[] | null;
  readonly topicDoc: readonly number[] | null;
  readonly attention: readonly AttentionCell[] | null;
  readonly posTags: readonly Token[] | null;
  readonly entities: readonly SequenceSpan[] | null;
  readonly deps: readonly { word: string; head: string; rel: string }[] | null;
  readonly clusters: readonly number[] | null;
  readonly compared: readonly string[] | null;
  readonly pipelineSaved: boolean;
  readonly steps: readonly PipelineStep[];
  readonly commandCount: number;
  readonly scoredOn: "train" | "test" | null;
  readonly inspectedText: boolean;
  readonly inspectedTokens: boolean;
  readonly inspectedVocab: boolean;
  readonly inspectedFeatures: boolean;
  readonly inspectedMetrics: boolean;
}
