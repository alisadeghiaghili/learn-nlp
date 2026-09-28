/** Progress persistence: localStorage + cookie so a new session resumes. */

import { ALL_LEVELS } from "../levels";

export const STORAGE_KEY = "learn-nlp-progress-v1";
export const COOKIE_KEY = "learn_nlp_progress";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export interface LevelProgress {
  solved: boolean;
  bestCommands?: number;
  solvedAt?: string;
}

export interface PersistBlob {
  progress: Record<string, LevelProgress>;
  savedAt?: string;
}

export interface CurriculumItem {
  id: string;
  name: string;
  worldTitle: string;
  learning: string[];
  bestCommands?: number;
}

export interface CurriculumSummary {
  solvedCount: number;
  total: number;
  learned: CurriculumItem[];
  remaining: CurriculumItem[];
  next: CurriculumItem | null;
  percent: number;
}

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey !== COOKIE_KEY) continue;
    try {
      return decodeURIComponent(rest.join("="));
    } catch {
      return rest.join("=");
    }
  }
  return null;
}

function writeCookie(payload: string): void {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(payload);
  document.cookie = `${COOKIE_KEY}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function parseBlob(raw: string | null): Record<string, LevelProgress> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistBlob | Record<string, LevelProgress>;
    if (parsed && typeof parsed === "object" && "progress" in parsed) {
      return (parsed as PersistBlob).progress ?? {};
    }
    return parsed as Record<string, LevelProgress>;
  } catch {
    return null;
  }
}

export function loadProgress(): Record<string, LevelProgress> {
  let fromLocal: Record<string, LevelProgress> | null = null;
  let fromCookie: Record<string, LevelProgress> | null = null;
  try {
    fromLocal = parseBlob(localStorage.getItem(STORAGE_KEY));
  } catch {
    fromLocal = null;
  }
  try {
    fromCookie = parseBlob(readCookie());
  } catch {
    fromCookie = null;
  }
  // merge: prefer the richer map
  const a = fromLocal ?? {};
  const b = fromCookie ?? {};
  const out: Record<string, LevelProgress> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const prev = out[k];
    if (!prev || (v.solved && !prev.solved)) out[k] = v;
  }
  return out;
}

export function saveProgress(progress: Record<string, LevelProgress>): void {
  const blob: PersistBlob = { progress, savedAt: new Date().toISOString() };
  const raw = JSON.stringify(blob);
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // private mode etc.
  }
  writeCookie(raw);
}

export function summarizeCurriculum(
  progress: Record<string, LevelProgress>,
): CurriculumSummary {
  const learned: CurriculumItem[] = [];
  const remaining: CurriculumItem[] = [];
  for (const lv of ALL_LEVELS) {
    const p = progress[lv.id];
    const item: CurriculumItem = {
      id: lv.id,
      name: lv.title,
      worldTitle: lv.worldTitle,
      learning: [...lv.learning],
      bestCommands: p?.bestCommands,
    };
    if (p?.solved) learned.push(item);
    else remaining.push(item);
  }
  return {
    solvedCount: learned.length,
    total: ALL_LEVELS.length,
    learned,
    remaining,
    next: remaining[0] ?? null,
    percent: ALL_LEVELS.length === 0 ? 0 : learned.length / ALL_LEVELS.length,
  };
}

export function resumeLine(progress: Record<string, LevelProgress>): string {
  const summary = summarizeCurriculum(progress);
  if (summary.solvedCount === 0) {
    return "No levels solved yet. Start with World 1.";
  }
  if (summary.next) {
    return `Progress ${summary.solvedCount}/${summary.total}. Next: ${summary.next.id} · ${summary.next.name}`;
  }
  return `Curriculum complete — ${summary.total} levels solved.`;
}
