/**
 * Terminal view: log, history (↑/↓), Tab completion, ghost suffix.
 */

export type LogKind = "cmd" | "out" | "err" | "meta" | "ok" | "sk";

export interface LogLine {
  kind: LogKind;
  text: string;
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

const BASE_COMMANDS = [
  "load reviews",
  "load news",
  "load tweets",
  "load sentences",
  "load entities",
  "load docs",
  "tokenize whitespace",
  "tokenize word",
  "tokenize subword",
  "tokenize sentence",
  "normalize lower",
  "normalize lower stopwords",
  "normalize lower lemmatize",
  "normalize lower stopwords stem",
  "vectorize count",
  "vectorize bow",
  "vectorize tfidf",
  "embed word2vec",
  "embed fasttext",
  "embed sbert",
  "split test_size=0.25",
  "split test_size=0.3 seed=7",
  "fit naive_bayes",
  "fit logistic",
  "fit svm",
  "fit dummy",
  "predict",
  "score test",
  "score train",
  "cm",
  "similarity s1 s2",
  "similarity r1 r7",
  "nearest king",
  "topic lda 3",
  "topic nmf 3",
  "pos",
  "ner",
  "dep",
  "attention",
  "compare pkg nltk spaCy",
  "compare pkg sklearn transformers",
  "pipeline",
  "show text",
  "show tokens",
  "show vocab",
  "show features",
  "show metrics",
  "show pipeline",
  "show code",
  "goal",
  "hint",
  "levels",
  "help",
  "reset",
  "undo",
  "clear",
];

export class TerminalView {
  private logEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private hintEl: HTMLElement;
  private history: string[] = [];
  private histIdx = -1;
  private onCommand: (cmd: string) => void;

  constructor(root: HTMLElement, onCommand: (cmd: string) => void) {
    this.onCommand = onCommand;
    root.innerHTML = `
      <div class="term-log" role="log" aria-live="polite"></div>
      <div class="term-hint" hidden></div>
      <div class="term-input-row">
        <span class="dock-prompt">nlp&gt;</span>
        <input class="term-input" type="text" spellcheck="false" autocomplete="off"
          aria-label="NLP command input" placeholder="type a command — try help" />
      </div>
    `;
    this.logEl = root.querySelector(".term-log") as HTMLElement;
    this.inputEl = root.querySelector(".term-input") as HTMLInputElement;
    this.hintEl = root.querySelector(".term-hint") as HTMLElement;

    this.inputEl.addEventListener("keydown", (e) => this.onKey(e));
    this.inputEl.addEventListener("input", () => this.updateHint());
    root.addEventListener("click", () => this.inputEl.focus());
  }

  focus(): void {
    this.inputEl.focus();
  }

  push(kind: LogKind, text: string): void {
    const div = document.createElement("div");
    div.className = kind;
    div.textContent = text;
    this.logEl.appendChild(div);
    this.logEl.scrollTop = this.logEl.scrollHeight;
    while (this.logEl.childElementCount > 200) {
      this.logEl.firstElementChild?.remove();
    }
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      const value = this.inputEl.value;
      if (value.trim()) {
        this.push("cmd", `nlp> ${value}`);
        this.history.push(value);
        this.histIdx = this.history.length;
        this.inputEl.value = "";
        this.updateHint();
        this.onCommand(value);
      }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowUp") {
      if (this.histIdx > 0) {
        this.histIdx -= 1;
        this.inputEl.value = this.history[this.histIdx] ?? "";
        this.updateHint();
      }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      if (this.histIdx < this.history.length - 1) {
        this.histIdx += 1;
        this.inputEl.value = this.history[this.histIdx] ?? "";
      } else {
        this.histIdx = this.history.length;
        this.inputEl.value = "";
      }
      this.updateHint();
      e.preventDefault();
      return;
    }
    if (e.key === "Tab") {
      const suggestion = this.suggest(this.inputEl.value);
      if (suggestion) {
        this.inputEl.value = suggestion;
        this.updateHint();
      }
      e.preventDefault();
    }
  }

  private suggest(prefix: string): string | null {
    if (!prefix.trim()) return null;
    const match = BASE_COMMANDS.find((c) => c.startsWith(prefix.trim()));
    return match ?? null;
  }

  private updateHint(): void {
    const v = this.inputEl.value;
    if (!v.trim()) {
      this.hintEl.hidden = true;
      return;
    }
    const s = this.suggest(v);
    if (s && s !== v) {
      this.hintEl.hidden = false;
      this.hintEl.innerHTML = `<code>Tab</code> → ${escapeHtml(s)}`;
    } else {
      this.hintEl.hidden = true;
    }
  }
}
