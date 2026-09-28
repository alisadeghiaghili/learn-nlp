/**
 * Canvas stage: token stream, feature heatmap, attention map, embedding scatter.
 */

import type { SessionSnapshot } from "../engine/types";

export interface DrawState {
  snapshot: SessionSnapshot;
  mode: "tokens" | "features" | "attention" | "embed" | "idle";
}

const C = {
  void: "#0A1018",
  surface: "#13202C",
  chalk: "#C5CED6",
  dim: "#7D8B96",
  signal: "#F0B429",
  calm: "#2A9D8F",
  alarm: "#E23D51",
  c0: "#5B8DEF",
  c1: "#F0B429",
  c2: "#9B7EDE",
  grid: "#243545",
};

function fitCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const parent = canvas.parentElement;
  if (!parent) return null;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(320, parent.clientWidth);
  const h = Math.max(220, parent.clientHeight);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function drawStage(canvas: HTMLCanvasElement, state: DrawState): void {
  const ctx = fitCanvas(canvas);
  if (!ctx) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, w, h);

  const snap = state.snapshot;
  const mode = pickMode(state.mode, snap);

  if (mode === "idle") {
    drawIdle(ctx, w, h, snap);
    return;
  }
  if (mode === "tokens") {
    drawTokens(ctx, w, h, snap);
    return;
  }
  if (mode === "features") {
    drawFeatures(ctx, w, h, snap);
    return;
  }
  if (mode === "attention") {
    drawAttention(ctx, w, h, snap);
    return;
  }
  drawEmbed(ctx, w, h, snap);
}

function pickMode(preferred: DrawState["mode"], snap: SessionSnapshot): DrawState["mode"] {
  if (preferred !== "idle") return preferred;
  if (snap.attention && snap.attention.length) return "attention";
  if (snap.embedding) return "embed";
  if (snap.features) return "features";
  if (snap.tokens && snap.tokens.length) return "tokens";
  return "idle";
}

function drawIdle(ctx: CanvasRenderingContext2D, w: number, h: number, snap: SessionSnapshot): void {
  ctx.fillStyle = C.dim;
  ctx.font = "12px IBM Plex Mono, monospace";
  ctx.textAlign = "center";
  const lines = [
    "LearnNLP stage",
    snap.corpus ? `corpus: ${snap.corpus.name}` : "no corpus loaded",
    "try: load reviews → tokenize word → vectorize tfidf",
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, h / 2 - 16 + i * 18);
  });
  // faint grid
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  for (let x = 40; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
}

function drawTokens(ctx: CanvasRenderingContext2D, w: number, h: number, snap: SessionSnapshot): void {
  const tokens = (snap.tokens ?? []).slice(0, 36);
  if (!tokens.length) {
    drawIdle(ctx, w, h, snap);
    return;
  }
  ctx.fillStyle = C.dim;
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.textAlign = "left";
  ctx.fillText(`tokens (${tokens.length})`, 16, 22);

  const padX = 16;
  const padY = 40;
  const chipH = 28;
  const gap = 6;
  let x = padX;
  let y = padY;
  tokens.forEach((t, i) => {
    const text = t.norm ?? t.text;
    ctx.font = "12px IBM Plex Mono, monospace";
    const tw = ctx.measureText(text).width + 14;
    if (x + tw > w - padX) {
      x = padX;
      y += chipH + gap;
      if (y > h - chipH) return;
    }
    const color = i % 3 === 0 ? C.c0 : i % 3 === 1 ? C.signal : C.calm;
    ctx.fillStyle = "#1A2C3A";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, tw, chipH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.chalk;
    ctx.fillText(text, x + 7, y + 18);
    x += tw + gap;
  });
}

function drawFeatures(ctx: CanvasRenderingContext2D, w: number, h: number, snap: SessionSnapshot): void {
  const f = snap.features;
  if (!f || !f.rows.length) {
    drawIdle(ctx, w, h, snap);
    return;
  }
  ctx.fillStyle = C.dim;
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillText(`document–term matrix  ${f.nDocs}×${f.nTerms}`, 16, 22);

  const nRows = Math.min(12, f.nDocs);
  const nCols = Math.min(16, f.nTerms);
  const left = 48;
  const top = 40;
  const cellW = (w - left - 20) / nCols;
  const cellH = Math.min(18, (h - top - 30) / nRows);

  // column labels (every other)
  ctx.fillStyle = C.dim;
  ctx.font = "9px IBM Plex Mono, monospace";
  for (let j = 0; j < nCols; j += 1) {
    const term = (f.terms[j] ?? "").slice(0, 6);
    ctx.save();
    ctx.translate(left + j * cellW + cellW / 2, top - 8);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText(term, 0, 0);
    ctx.restore();
  }

  let max = 1e-9;
  for (let r = 0; r < nRows; r += 1) {
    for (let c = 0; c < nCols; c += 1) {
      max = Math.max(max, Math.abs(f.rows[r]?.[c] ?? 0));
    }
  }
  for (let r = 0; r < nRows; r += 1) {
    ctx.fillStyle = C.dim;
    ctx.font = "10px IBM Plex Mono, monospace";
    ctx.fillText(String(r), 28, top + r * cellH + cellH * 0.7);
    for (let c = 0; c < nCols; c += 1) {
      const v = f.rows[r]?.[c] ?? 0;
      const t = Math.pow(Math.abs(v) / max, 0.6);
      ctx.fillStyle = v === 0 ? "#13202C" : mix(C.void, C.signal, t);
      ctx.fillRect(left + c * cellW + 1, top + r * cellH + 1, cellW - 2, cellH - 2);
    }
  }
  ctx.fillStyle = C.dim;
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillText("darker → stronger weight", left, h - 12);
}

function drawAttention(ctx: CanvasRenderingContext2D, w: number, h: number, snap: SessionSnapshot): void {
  const cells = snap.attention ?? [];
  const tokens = snap.tokens ?? [];
  if (!cells.length || !tokens.length) {
    drawIdle(ctx, w, h, snap);
    return;
  }
  const n = tokens.length;
  const size = Math.min((w - 100) / n, (h - 100) / n, 36);
  const left = 80;
  const top = 40;
  ctx.fillStyle = C.dim;
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillText("attention (rows=query, cols=key)", 16, 22);

  for (const cell of cells) {
    const x = left + cell.to * size;
    const y = top + cell.from * size;
    ctx.fillStyle = mix(C.void, C.signal, Math.pow(cell.weight, 0.45));
    ctx.fillRect(x, y, size - 1, size - 1);
  }
  ctx.fillStyle = C.chalk;
  ctx.font = "9px IBM Plex Mono, monospace";
  for (let i = 0; i < Math.min(n, 12); i += 1) {
    const label = (tokens[i]?.text ?? "").slice(0, 5);
    ctx.fillText(label, left - 4, top + i * size + size * 0.65);
    ctx.save();
    ctx.translate(left + i * size + size * 0.65, top - 6);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
}

function drawEmbed(ctx: CanvasRenderingContext2D, w: number, h: number, snap: SessionSnapshot): void {
  const emb = snap.embedding;
  if (!emb) {
    drawIdle(ctx, w, h, snap);
    return;
  }
  ctx.fillStyle = C.dim;
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillText(`${emb.name} · dim=${emb.dim} · ${emb.vectors.size} words`, 16, 22);

  // 2D projection of first two dims (or hash)
  const words = [...emb.vectors.entries()].slice(0, 40);
  const xs = words.map(([, v]) => v[0] ?? 0);
  const ys = words.map(([, v]) => v[1] ?? 0);
  const minX = Math.min(...xs, -1);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, -1);
  const maxY = Math.max(...ys, 1);
  const px = (x: number) => 40 + ((x - minX) / (maxX - minX || 1)) * (w - 80);
  const py = (y: number) => 40 + ((y - minY) / (maxY - minY || 1)) * (h - 70);

  words.forEach(([word, vec], i) => {
    const x = px(vec[0] ?? 0);
    const y = py(vec[1] ?? 0);
    const color = i % 3 === 0 ? C.c0 : i % 3 === 1 ? C.calm : C.c2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (i % 3 === 0) {
      ctx.fillStyle = C.chalk;
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText(word.slice(0, 10), x + 6, y + 3);
    }
  });
  ctx.fillStyle = C.dim;
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillText("first two dims (toy projection)", 16, h - 12);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function hex(s: string): [number, number, number] {
  const m = s.replace("#", "");
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}
