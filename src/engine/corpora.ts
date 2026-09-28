/**
 * Built-in toy corpora for the sandbox.
 *
 * Each corpus is small, readable, and shaped for one teaching job
 * (classification, sequence labelling, similarity, or topics).
 */

import type { Corpus, CorpusName, Doc } from "./types";

function doc(id: string, text: string, label: string): Doc {
  return { id, text, label };
}

const REVIEWS: Corpus = {
  name: "reviews",
  task: "classification",
  labels: ["pos", "neg"],
  docs: [
    doc("r1", "I loved this film. The acting was superb and the story moved me.", "pos"),
    doc("r2", "What a wonderful experience. Beautiful soundtrack and great pacing.", "pos"),
    doc("r3", "Brilliant performances. I would watch this again tomorrow.", "pos"),
    doc("r4", "A charming story with warm characters and a satisfying ending.", "pos"),
    doc("r5", "Excellent direction. The dialogue felt honest and sharp.", "pos"),
    doc("r6", "This movie was fantastic. Highly recommended for everyone.", "pos"),
    doc("r7", "Terrible waste of time. The plot made no sense at all.", "neg"),
    doc("r8", "Awful acting and a boring script. I almost walked out.", "neg"),
    doc("r9", "Disappointing and dull. The ending was especially weak.", "neg"),
    doc("r10", "Horrible film. The characters were flat and unlikable.", "neg"),
    doc("r11", "A complete mess. I regret paying for this ticket.", "neg"),
    doc("r12", "Boring and predictable. Nothing surprising happens.", "neg"),
    doc("r13", "Great cast, wonderful moments, truly enjoyable night.", "pos"),
    doc("r14", "I hated every minute. Poor writing throughout.", "neg"),
    doc("r15", "Smart, funny, and deeply human. A joy to watch.", "pos"),
    doc("r16", "Dreadful pacing. The movie felt endless and empty.", "neg"),
    doc("r17", "An inspiring story with beautiful cinematography.", "pos"),
    doc("r18", "Cheap jokes and lazy direction. Not worth it.", "neg"),
    doc("r19", "Moving, thoughtful, and quietly powerful.", "pos"),
    doc("r20", "Frustrating plot holes ruined whatever good idea it had.", "neg"),
    doc("r21", "I smiled the whole time. Lovely performances all around.", "pos"),
    doc("r22", "The script was a disaster and the editing was worse.", "neg"),
    doc("r23", "Heartwarming and well crafted from start to finish.", "pos"),
    doc("r24", "Painfully slow. I checked my phone constantly.", "neg"),
  ],
};

const NEWS: Corpus = {
  name: "news",
  task: "classification",
  labels: ["sports", "tech", "politics"],
  docs: [
    doc("n1", "The team won the championship after a dramatic final match.", "sports"),
    doc("n2", "Star player scores twice in the league opener last night.", "sports"),
    doc("n3", "Olympic athletes prepare for the summer games with new coaches.", "sports"),
    doc("n4", "Football club signs a record deal for the striker position.", "sports"),
    doc("n5", "Tennis champion defends the title in straight sets.", "sports"),
    doc("n6", "Basketball playoffs tip off with a surprising upset.", "sports"),
    doc("n7", "The startup released a new open source machine learning framework.", "tech"),
    doc("n8", "Engineers ship a faster browser engine and improved security.", "tech"),
    doc("n9", "Cloud provider announces a cheaper GPU instance for training.", "tech"),
    doc("n10", "Researchers publish a paper on efficient transformer inference.", "tech"),
    doc("n11", "Smartphone chip maker unveils a new neural processing unit.", "tech"),
    doc("n12", "Database company adds vector search to its flagship product.", "tech"),
    doc("n13", "The senate voted on the new infrastructure bill yesterday.", "politics"),
    doc("n14", "Election results reshaped the majority in parliament.", "politics"),
    doc("n15", "The president signed the climate agreement in a public ceremony.", "politics"),
    doc("n16", "Diplomats negotiate a trade deal between neighboring states.", "politics"),
    doc("n17", "Mayoral candidates debate housing policy on live television.", "politics"),
    doc("n18", "Opposition party demands a full inquiry into the budget.", "politics"),
    doc("n19", "Midfielder injury forces the coach to change the lineup.", "sports"),
    doc("n20", "Open source contributors fix a critical security vulnerability.", "tech"),
    doc("n21", "Lawmakers propose a new data privacy framework for citizens.", "politics"),
    doc("n22", "The marathon world record fell on a cool morning in Berlin.", "sports"),
    doc("n23", "A new programming language aims to simplify data pipelines.", "tech"),
    doc("n24", "Local government approves funding for public transit upgrades.", "politics"),
  ],
};

const TWEETS: Corpus = {
  name: "tweets",
  task: "classification",
  labels: ["pos", "neg", "neu"],
  docs: [
    doc("t1", "just shipped a new feature. feeling good.", "pos"),
    doc("t2", "this coffee is amazing ☕", "pos"),
    doc("t3", "love the new update. smooth and fast.", "pos"),
    doc("t4", "best concert of my life last night", "pos"),
    doc("t5", "server down again. this is unacceptable.", "neg"),
    doc("t6", "worst customer support I have ever dealt with", "neg"),
    doc("t7", "missed the train and now I am late for work", "neg"),
    doc("t8", "the app crashed three times today. awful.", "neg"),
    doc("t9", "meeting at 3pm. bring the slides.", "neu"),
    doc("t10", "docs are in the shared folder.", "neu"),
    doc("t11", "the train leaves from platform 4.", "neu"),
    doc("t12", "version 2.1 was released this morning.", "neu"),
    doc("t13", "finally fixed that nasty bug. relieved.", "pos"),
    doc("t14", "flight delayed two hours. exhausting day.", "neg"),
    doc("t15", "agenda for tomorrow is attached.", "neu"),
    doc("t16", "brilliant talk on transformers today.", "pos"),
  ],
};

const SENTENCES: Corpus = {
  name: "sentences",
  task: "similarity",
  labels: ["text"],
  docs: [
    doc("s1", "The cat sat on the mat.", "text"),
    doc("s2", "A feline rested on the rug.", "text"),
    doc("s3", "Dogs are barking in the yard.", "text"),
    doc("s4", "The stock market fell sharply today.", "text"),
    doc("s5", "Equity prices dropped during trading.", "text"),
    doc("s6", "She enjoys reading science fiction novels.", "text"),
    doc("s7", "He loves to read sci-fi books.", "text"),
    doc("s8", "The weather is cold and rainy this week.", "text"),
    doc("s9", "Neural networks learn representations from data.", "text"),
    doc("s10", "Deep learning models map inputs to vectors.", "text"),
    doc("s11", "I bought groceries from the corner store.", "text"),
    doc("s12", "The chef prepared a delicate seafood dish.", "text"),
    doc("s13", "Airline travel was chaotic after the storm.", "text"),
    doc("s14", "Flights were cancelled because of severe weather.", "text"),
    doc("s15", "The museum opened a new modern art wing.", "text"),
  ],
};

const ENTITIES: Corpus = {
  name: "entities",
  task: "sequence",
  labels: ["O"],
  docs: [
    doc(
      "e1",
      "Barack Obama visited Berlin and met Angela Merkel in 2016.",
      "O",
    ),
    doc(
      "e2",
      "Apple was founded by Steve Jobs in Cupertino, California.",
      "O",
    ),
    doc(
      "e3",
      "The World Health Organization warned governments about the outbreak.",
      "O",
    ),
    doc(
      "e4",
      "Elon Musk announced a new factory near Austin, Texas last Tuesday.",
      "O",
    ),
    doc(
      "e5",
      "Researchers at Stanford University published results in Nature.",
      "O",
    ),
    doc(
      "e6",
      "Google and Microsoft compete in cloud computing services.",
      "O",
    ),
    doc(
      "e7",
      "The European Union negotiated trade with Japan and Canada.",
      "O",
    ),
    doc(
      "e8",
      "Marie Curie won the Nobel Prize in Physics in 1903.",
      "O",
    ),
  ],
};

const DOCS: Corpus = {
  name: "docs",
  task: "topics",
  labels: ["mixed"],
  docs: [
    doc("d1", "Machine learning models need clean training data and careful evaluation.", "mixed"),
    doc("d2", "Neural networks and deep learning power modern speech recognition.", "mixed"),
    doc("d3", "Football clubs compete for the league title every autumn season.", "mixed"),
    doc("d4", "The basketball playoffs featured dramatic overtime victories.", "mixed"),
    doc("d5", "Central banks raised interest rates to fight inflation this quarter.", "mixed"),
    doc("d6", "Stock markets reacted strongly to the latest economic report.", "mixed"),
    doc("d7", "Python and SQL remain essential tools for data engineering teams.", "mixed"),
    doc("d8", "Open source libraries accelerate natural language processing research.", "mixed"),
    doc("d9", "Tennis stars prepare for the grand slam tournaments each spring.", "mixed"),
    doc("d10", "Inflation and employment figures shape government policy debates.", "mixed"),
    doc("d11", "Transformers and attention mechanisms improved language understanding.", "mixed"),
    doc("d12", "Cloud platforms host scalable machine learning training pipelines.", "mixed"),
    doc("d13", "Soccer transfer rumors dominate sports news every summer.", "mixed"),
    doc("d14", "Bond yields moved after the central bank press conference.", "mixed"),
    doc("d15", "Tokenization and embeddings are foundations of text representation.", "mixed"),
    doc("d16", "Coaches adjust strategies after painful playoff eliminations.", "mixed"),
    doc("d17", "Data quality issues silently destroy production model performance.", "mixed"),
    doc("d18", "Currency markets swung after surprising unemployment data.", "mixed"),
  ],
};

const CORPORA: Record<CorpusName, Corpus> = {
  reviews: REVIEWS,
  news: NEWS,
  tweets: TWEETS,
  sentences: SENTENCES,
  entities: ENTITIES,
  docs: DOCS,
};

export const CORPUS_NAMES: CorpusName[] = [
  "reviews",
  "news",
  "tweets",
  "sentences",
  "entities",
  "docs",
];

/**
 * Look up a built-in corpus by name.
 *
 * Args:
 *   name: Corpus identifier.
 *
 * Returns:
 *   Corpus object with docs and labels.
 *
 * Raises:
 *   Error: If the corpus is unknown.
 *
 * Examples:
 *   >>> loadCorpus("reviews").docs.length > 0
 *   true
 */
export function loadCorpus(name: CorpusName): Corpus {
  const c = CORPORA[name];
  if (!c) {
    throw new Error(`Unknown corpus '${name}'. Try: ${CORPUS_NAMES.join(", ")}`);
  }
  return c;
}

/**
 * Describe available corpora for the help command.
 */
export function describeCorpora(): string[] {
  return CORPUS_NAMES.map((n) => {
    const c = CORPORA[n];
    return `${n.padEnd(12)} ${String(c.task).padEnd(14)} ${String(c.docs.length).padStart(2)} docs · ${c.labels.join("/")}`;
  });
}

/**
 * Tiny deterministic PRNG (mulberry32) for splits and sampling.
 */
export function makeRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
