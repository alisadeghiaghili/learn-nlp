/**
 * LearnNLP shell: chrome, level rail, concept brief, stage, command dock,
 * goal checklist with current-step neon, and level-complete celebration.
 */

import "./styles/app.css";
import {
  Session,
  dispatch,
  type CommandResult,
  type Level,
  type SessionSnapshot,
} from "./engine";
import { ALL_LEVELS, findLevel, WORLD_LABELS } from "./levels";
import { drawStage } from "./ui/charts";
import { TerminalView, type LogLine } from "./ui/terminal";
import { escapeHtml, renderMarkdown, showModal } from "./ui/dialog";
import { launchConfetti, playFanfare } from "./ui/confetti";
import {
  buildShareTargets,
  shareWithClipboard,
  COFFEE_BUTTON_HTML,
  REPO_URL,
  LIVE_URL,
} from "./ui/share";
import {
  loadProgress,
  saveProgress,
  summarizeCurriculum,
  resumeLine,
  type LevelProgress,
} from "./ui/progress";

type Mode = "level" | "sandbox";

const CHEERS = [
  "Locked in. That concept is yours now.",
  "Clean win. The pipeline told the truth.",
  "Good — you measured the future, not the homework.",
  "Nice. That is production hygiene, not notebook luck.",
];

function nextLevel(id: string): Level | undefined {
  const idx = ALL_LEVELS.findIndex((l) => l.id === id);
  return idx >= 0 ? ALL_LEVELS[idx + 1] : undefined;
}

export function mount(root: HTMLElement): void {
  const progress: Record<string, LevelProgress> = loadProgress();
  let mode: Mode = "level";
  let levelId = ALL_LEVELS[0]?.id ?? "1.1";
  let session = new Session();
  let winFeedback: string | null = null;
  let winOk = false;
  let celebratedFor = "";
  let lastCmdCount = 0;

  function currentLevel(): Level | null {
    return findLevel(levelId) ?? null;
  }

  function persistProgress(id: string, cmds: number): void {
    const prev = progress[id] ?? { solved: false };
    progress[id] = {
      solved: true,
      bestCommands:
        prev.bestCommands === undefined ? cmds : Math.min(prev.bestCommands, cmds),
      solvedAt: prev.solvedAt ?? new Date().toISOString(),
    };
    saveProgress(progress);
  }

  const elChrome = document.createElement("header");
  elChrome.className = "chrome";
  elChrome.innerHTML = `
    <div class="brand">
      <img class="brand-logo" src="logo.svg" alt="" width="28" height="28" />
      <div>Learn<span>NLP</span></div>
      <div class="brand-sub">LANGUAGE LAB</div>
    </div>
    <nav class="chrome-nav">
      <button type="button" data-nav="levels" class="is-active">levels</button>
      <button type="button" data-nav="sandbox">sandbox</button>
      <button type="button" data-nav="help">help</button>
    </nav>
    <div class="chrome-meta">NLP mental model · progress in cookie</div>
  `;

  const elBody = document.createElement("div");
  elBody.className = "body";
  const elRail = document.createElement("aside");
  elRail.className = "rail";
  const elMain = document.createElement("div");
  elMain.className = "main";
  const elBrief = document.createElement("section");
  elBrief.className = "brief";
  const elStage = document.createElement("section");
  elStage.className = "stage";
  const elViz = document.createElement("div");
  elViz.className = "stage-viz";
  const canvas = document.createElement("canvas");
  elViz.append(canvas);
  const elSide = document.createElement("div");
  elSide.className = "stage-side";
  elStage.append(elViz, elSide);
  elMain.append(elBrief, elStage);
  elBody.append(elRail, elMain);

  const elDock = document.createElement("footer");
  elDock.className = "dock";
  const termRoot = document.createElement("div");
  termRoot.className = "term-root";
  const elApi = document.createElement("div");
  elApi.className = "dock-api";
  elDock.append(termRoot, elApi);

  root.append(elChrome, elBody, elDock);

  const terminal = new TerminalView(termRoot, (cmd) => runCommand(cmd));

  function setPackageApi(text: string | null): void {
    elApi.innerHTML = text
      ? `<div class="lbl">package · python</div><pre>${escapeHtml(text)}</pre>`
      : `<div class="lbl">package · python</div><pre>ready</pre>`;
  }

  function pushLines(kind: LogLine["kind"], texts: string[]): void {
    for (const text of texts) {
      terminal.push(kind, text);
    }
  }

  function renderRail(): void {
    elRail.replaceChildren();
    const worlds = new Map<string, Level[]>();
    for (const lv of ALL_LEVELS) {
      const list = worlds.get(lv.world) ?? [];
      list.push(lv);
      worlds.set(lv.world, list);
    }
    for (const [world, levels] of worlds) {
      const head = document.createElement("div");
      head.className = "rail-world";
      head.textContent = WORLD_LABELS[world] ?? world.toUpperCase();
      elRail.append(head);
      for (const lv of levels) {
        const solved = Boolean(progress[lv.id]?.solved);
        const active = mode === "level" && levelId === lv.id;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `level-btn${solved ? " is-solved" : ""}${active ? " is-active" : ""}`;
        btn.innerHTML = `<span class="id">${escapeHtml(lv.id)}</span><span class="title">${escapeHtml(lv.title)}</span><span class="mark">${solved ? "✓" : ""}</span>`;
        btn.addEventListener("click", () => openLevel(lv.id));
        elRail.append(btn);
      }
    }
  }

  function renderSide(snap: SessionSnapshot): void {
    elSide.replaceChildren();

    if (mode === "level") {
      const lv = currentLevel();
      if (lv) {
        const stepHtml = (lv.steps ?? []).map((st) => {
          const met = st.check(snap);
          const firstUnmet = (lv.steps ?? []).find((s) => !s.check(snap));
          const current = firstUnmet?.id === st.id;
          const cls = met ? "met" : current ? "current" : "";
          return `<li class="${cls}">
            <div class="g-label">${escapeHtml(st.label)}</div>
            <div class="g-detail">${escapeHtml(st.detail)}</div>
            ${st.command ? `<code class="g-cmd">${escapeHtml(st.command)}</code>` : ""}
          </li>`;
        });
        const goalBox = document.createElement("div");
        goalBox.className = "panel goal-panel";
        goalBox.innerHTML = `<h2>CHECKLIST</h2><ol class="goal-list">${stepHtml.join("")}</ol>`;
        elSide.append(goalBox);
      }
    }

    const pipePanel = document.createElement("div");
    pipePanel.className = "panel";
    pipePanel.innerHTML = `<h2>PIPELINE</h2>`;
    const pipe = document.createElement("div");
    pipe.className = "pipeline";
    if (snap.steps.length === 0) {
      pipe.append(
        Object.assign(document.createElement("div"), {
          className: "pipe-node",
          textContent: "no steps yet",
        }),
      );
    } else {
      for (const step of snap.steps.slice(-8)) {
        const node = document.createElement("div");
        node.className = `pipe-node is-${step.status}`;
        node.innerHTML = `<span class="dot"></span><span>${escapeHtml(step.label)}</span>`;
        pipe.append(node);
        if (step.detail) {
          const d = document.createElement("div");
          d.className = "pipe-detail";
          d.textContent = step.detail;
          pipe.append(d);
        }
      }
    }
    pipePanel.append(pipe);
    elSide.append(pipePanel);

    const metricsPanel = document.createElement("div");
    metricsPanel.className = "panel";
    metricsPanel.innerHTML = `<h2>METRICS</h2>`;
    const table = document.createElement("table");
    table.className = "metrics-table";
    const m = snap.metrics;
    const rows: [string, string][] = m
      ? [
          ["accuracy", m.accuracy.toFixed(3)],
          ["precision", m.precision.toFixed(3)],
          ["recall", m.recall.toFixed(3)],
          ["f1", m.f1.toFixed(3)],
          ["n", String(m.n)],
          ["scored on", snap.scoredOn ?? "—"],
        ]
      : [
          ["corpus", snap.corpus?.name ?? "—"],
          ["tokens", snap.tokens ? String(snap.tokens.length) : "—"],
          ["vocab", snap.vocab ? String(snap.vocab.length) : "—"],
          ["features", snap.features ? `${snap.features.nDocs}×${snap.features.nTerms}` : "—"],
          ["embed", snap.embedding ? snap.embedding.name : "—"],
        ];
    table.innerHTML = rows
      .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
      .join("");
    metricsPanel.append(table);
    elSide.append(metricsPanel);

    if (mode === "level") {
      const lv = currentLevel();
      if (lv?.hints?.length) {
        const hintPanel = document.createElement("div");
        hintPanel.className = "panel";
        hintPanel.innerHTML = `<h2>HINTS</h2><ul class="hint-list">${lv.hints
          .map((h) => `<li>${escapeHtml(h)}</li>`)
          .join("")}</ul>`;
        elSide.append(hintPanel);
      }
    }
  }

  function renderBrief(_snap: SessionSnapshot): void {
    if (mode === "sandbox") {
      elBrief.innerHTML = `
        <div class="brief-kicker">SANDBOX · free play</div>
        <h1>Sandbox</h1>
        <p class="brief-body">
          Same command surface as the levels. Load a corpus, tokenize, normalize,
          vectorize, embed, classify, tag, or compare packages. Every command
          prints the real Python API in the dock.
        </p>
        <div class="brief-goal"><span class="goal-chip">try</span>
          <code>load reviews → tokenize word → vectorize tfidf → split → fit logistic → score test</code>
        </div>
      `;
      return;
    }
    const lv = currentLevel();
    if (!lv) {
      elBrief.innerHTML = `<p class="brief-body">No level selected.</p>`;
      return;
    }
    const pkgs = lv.concept.packages ?? [];
    elBrief.innerHTML = `
      <div class="brief-kicker">${escapeHtml(lv.worldTitle)} · level ${escapeHtml(lv.id)}</div>
      <h1>${escapeHtml(lv.concept.title)}</h1>
      <p class="brief-body">${escapeHtml(lv.concept.body)}</p>
      <p class="brief-body"><strong>What happens.</strong> ${escapeHtml(lv.concept.whatHappens)}</p>
      <p class="brief-body"><strong>Why it matters.</strong> ${escapeHtml(lv.concept.why)}</p>
      ${lv.concept.formula ? `<div class="brief-formula">${escapeHtml(lv.concept.formula)}</div>` : ""}
      ${lv.concept.callout ? `<div class="brief-callout">${escapeHtml(lv.concept.callout)}</div>` : ""}
      ${
        pkgs.length
          ? `<div class="pkg-tags">${pkgs.map((p) => `<span class="pkg-tag">${escapeHtml(p)}</span>`).join("")}</div>`
          : ""
      }
      <div class="brief-goal">
        <span class="goal-chip">goal</span>
        <span>${escapeHtml(lv.goal)}</span>
        ${
          winFeedback
            ? `<div class="win-feedback ${winOk ? "is-win" : "is-fail"}">${escapeHtml(winFeedback)}</div>`
            : ""
        }
      </div>
    `;
  }

  function redraw(): void {
    const snap = session.snapshot();
    renderRail();
    renderBrief(snap);
    renderSide(snap);
    drawStage(canvas, {
      snapshot: snap,
      mode: snap.attention?.length
        ? "attention"
        : snap.embedding
          ? "embed"
          : snap.features
            ? "features"
            : snap.tokens?.length
              ? "tokens"
              : "idle",
    });
  }

  function openLevel(id: string): void {
    const lv = findLevel(id);
    if (!lv) {
      pushLines("err", [`Unknown level '${id}'`]);
      return;
    }
    mode = "level";
    levelId = id;
    winFeedback = null;
    winOk = false;
    celebratedFor = "";
    session = new Session();
    lastCmdCount = 0;
    setNav("levels");
    if (lv.seedCorpus) {
      session.load(lv.seedCorpus);
    }
    pushLines("meta", [`— level ${lv.id}: ${lv.title} —`]);
    pushLines("meta", [`goal: ${lv.goal}`]);
    terminal.focus();
    redraw();
  }

  function setNav(nav: string): void {
    for (const btn of elChrome.querySelectorAll<HTMLButtonElement>(".chrome-nav button")) {
      btn.classList.toggle("is-active", btn.dataset.nav === nav);
    }
  }

  function checkWin(): void {
    if (mode !== "level") return;
    const lv = currentLevel();
    if (!lv) return;
    const snap = session.snapshot();
    const result = lv.win(snap);
    winOk = result.won;
    winFeedback = result.feedback;
    if (result.won && celebratedFor !== lv.id) {
      celebratedFor = lv.id;
      persistProgress(lv.id, snap.commandCount);
      const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)] ?? CHEERS[0];
      launchConfetti();
      playFanfare();
      const nxt = nextLevel(lv.id);
      showModal({
        title: "Level complete",
        variant: "celebrate",
        bodyHtml: renderMarkdown(
          `**${escapeHtml(lv.title)}**\n\n${escapeHtml(result.feedback)}\n\n${escapeHtml(cheer ?? "")}\n\nProgress: ${summarizeCurriculum(progress).solvedCount}/${summarizeCurriculum(progress).total}`,
        ),
        actions: [
          {
            label: "Replay",
            onClick: () => openLevel(lv.id),
          },
          nxt
            ? {
                label: `Next · ${nxt.id}`,
                className: "primary",
                onClick: () => openLevel(nxt.id),
              }
            : {
                label: "Share win",
                className: "primary",
                onClick: () => showShare(),
              },
        ],
      });
    }
  }

  function showShare(): void {
    const summary = summarizeCurriculum(progress);
    const lv = currentLevel();
    const ctx = {
      levelName: lv?.title ?? "LearnNLP",
      levelId: lv?.id ?? "—",
      commands: session.snapshot().commandCount || null,
      curriculum: summary,
    };
    const targets = buildShareTargets(ctx);
    showModal({
      title: "Share progress",
      bodyHtml: `
        <p>Progress is stored on this device. Share if this helped — it tells others where the free lab lives.</p>
        <pre>${escapeHtml(targets.copy.slice(0, 500))}</pre>
        <div class="share-bar">
          <a href="${targets.linkedIn}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="${targets.x}" target="_blank" rel="noopener noreferrer">X</a>
          <a href="${targets.facebook}" target="_blank" rel="noopener noreferrer">Facebook</a>
          <button type="button" data-copy="1">Copy text</button>
          <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">Repository</a>
        </div>
        <p>${COFFEE_BUTTON_HTML}</p>
      `,
      actions: [{ label: "Close", onClick: () => undefined }],
    });
    const btn = document.querySelector<HTMLButtonElement>("[data-copy]");
    btn?.addEventListener("click", () => {
      void shareWithClipboard(targets.copy).then((ok) => {
        btn.textContent = ok ? "Copied" : "Copy failed";
      });
    });
  }

  function showHelp(): void {
    showModal({
      title: "How LearnNLP works",
      bodyHtml: renderMarkdown(
        `LearnNLP teaches the **NLP mental model** — tokenize, normalize, vectorize, embed, model — and the production packages that implement it.

**Modes**
- **levels** — concept briefs, checklists, honest win checks
- **sandbox** — free play on the same commands

**Package panel**
Every command prints the real Python API (NLTK, spaCy, scikit-learn, Gensim, Hugging Face).

**Progress**
Solved levels are stored in localStorage and a cookie on this device.

\`\`\`
load reviews
tokenize word
normalize lower lemmatize
vectorize tfidf
split test_size=0.25
fit logistic
score test
cm
\`\`\`

Live: ${LIVE_URL}
`,
      ),
      actions: [{ label: "Close", onClick: () => undefined }],
    });
  }

  function runCommand(line: string): void {
    const result: CommandResult = dispatch(session, line, {
      onShowLevels: () =>
        ALL_LEVELS.map((l) => `${l.id.padEnd(5)} ${l.worldTitle} · ${l.title}`),
      onShowGoal: () => {
        const lv = currentLevel();
        return lv
          ? [`goal: ${lv.goal}`, `hints:`, ...lv.hints.map((h) => `  - ${h}`)]
          : ["No active level."];
      },
      onHint: () => {
        const lv = currentLevel();
        return lv ? lv.hints.map((h, i) => `${i + 1}. ${h}`) : ["No hints."];
      },
      onRunLevel: (id) => {
        openLevel(id);
        return [`Opened level ${id}`];
      },
      onShow: (what) => {
        const snap = session.snapshot();
        switch (what) {
          case "text": {
            session.markInspected("text");
            const docs = snap.corpus?.docs ?? [];
            return docs
              .slice(0, 6)
              .map((d) => `${d.id} [${d.label}] ${d.text}`)
              .concat(docs.length > 6 ? [`… ${docs.length - 6} more`] : []);
          }
          case "tokens": {
            session.markInspected("tokens");
            const toks = snap.tokens ?? [];
            return [
              `tokens (${toks.length}):`,
              toks.map((t) => t.text).join(" | "),
              `norms: ${toks.map((t) => t.norm ?? t.text).join(" | ")}`,
            ];
          }
          case "vocab": {
            session.markInspected("vocab");
            const v = snap.vocab ?? [];
            return [
              `vocab (${v.length} terms):`,
              ...v.slice(0, 12).map((e) => `  ${e.term.padEnd(16)} df=${e.df}  idf=${e.idf.toFixed(2)}`),
            ];
          }
          case "features": {
            session.markInspected("features");
            const f = snap.features;
            if (!f) return ["No feature matrix. Run `vectorize` first."];
            return [
              `matrix ${f.nDocs}×${f.nTerms}`,
              `terms: ${f.terms.slice(0, 12).join(", ")}${f.terms.length > 12 ? " …" : ""}`,
              `doc0 nonzero: ${f.rows[0]?.filter((x) => x !== 0).length ?? 0}`,
            ];
          }
          case "metrics": {
            session.markInspected("metrics");
            const m = snap.metrics;
            if (!m) return ["No metrics. Fit + score first."];
            return [
              `accuracy=${m.accuracy.toFixed(3)} precision=${m.precision.toFixed(3)} recall=${m.recall.toFixed(3)} f1=${m.f1.toFixed(3)}`,
            ];
          }
          case "pipeline":
            return [
              "pipeline order:",
              "  load → tokenize → normalize → vectorize → split → fit → predict → score",
            ];
          case "code":
            return [
              "see the package panel under the dock",
              "it shows the real Python for the last command",
            ];
          default:
            return [`show ${what}: unknown`];
        }
      },
    });
    if (result.lines.length) {
      pushLines(result.status === "error" ? "err" : "out", result.lines);
    }
    if (result.packageApi) {
      setPackageApi(result.packageApi);
    } else if (result.status === "ok" && result.lines.length && result.packageApi === null) {
      // leave previous API visible
    }
    lastCmdCount = result.snapshot.commandCount;
    checkWin();
    redraw();
  }

  // nav
  elChrome.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button");
    if (!btn) return;
    const nav = btn.dataset.nav;
    if (nav === "levels") {
      mode = "level";
      setNav("levels");
      openLevel(levelId);
    } else if (nav === "sandbox") {
      mode = "sandbox";
      setNav("sandbox");
      session = new Session();
      winFeedback = null;
      pushLines("meta", ["— sandbox — free play"]);
      terminal.focus();
      redraw();
    } else if (nav === "help") {
      showHelp();
    }
  });

  // welcome
  const summary = summarizeCurriculum(progress);
  if (summary.solvedCount > 0) {
    pushLines("meta", [resumeLine(progress)]);
  } else {
    showModal({
      title: "Welcome to LearnNLP",
      variant: "welcome",
      bodyHtml: renderMarkdown(
        `Language is invisible until you see **tokens, vectors, and attention** as shapes.

LearnNLP teaches NLP concepts from the ground up — and the production packages
(NLTK, spaCy, scikit-learn, Gensim, Hugging Face) that implement them.

Start with World 1, or jump to the sandbox:

\`\`\`
load reviews
tokenize word
show tokens
\`\`\`

Progress saves on this device. No account.
`,
      ),
      actions: [
        {
          label: "Start World 1",
          className: "primary",
          onClick: () => openLevel(ALL_LEVELS[0]?.id ?? "1.1"),
        },
        {
          label: "Sandbox",
          onClick: () => {
            mode = "sandbox";
            setNav("sandbox");
            redraw();
            terminal.focus();
          },
        },
      ],
    });
  }

  openLevel(ALL_LEVELS[0]?.id ?? "1.1");
  void lastCmdCount;
}

const app = document.getElementById("app");
if (app) {
  mount(app);
}
