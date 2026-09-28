/** Progress-aware social share (LinkedIn / X / Facebook + copy). */

import type { CurriculumSummary } from "./progress";

export const LIVE_URL = "https://alisadeghiaghili.github.io/learn-nlp/";
export const SHARE_URL = "https://alisadeghiaghili.github.io/learn-nlp/";
export const REPO_URL = "https://github.com/alisadeghiaghili/learn-nlp";
export const COFFEE_URL = "https://www.buymeacoffee.com/alisadeghil";
export const PUBLISHER = "Ali Sadeghi Aghili";
export const COFFEE_BUTTON_HTML = `<a href="${COFFEE_URL}" target="_blank" rel="noopener noreferrer"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=alisadeghil&button_colour=2a3a4a&font_colour=ffffff&font_family=Cookie&outline_colour=ffffff&coffee_colour=FFDD00" alt="Buy me a coffee" /></a>`;

export const TITLE = "LearnNLP — interactive NLP sandbox";

export interface ShareContext {
  levelName: string;
  levelId: string;
  commands: number | null;
  curriculum: CurriculumSummary;
}

function bulletList(
  items: { name: string; worldTitle: string; learning?: string[] }[],
  limit?: number,
): string[] {
  const list = limit ? items.slice(0, limit) : items;
  const lines = list.map((l) => `• ${l.worldTitle}: ${l.name}`);
  if (limit && items.length > limit) lines.push(`• …and ${items.length - limit} more`);
  return lines;
}

export function shareMessageLinkedIn(ctx: ShareContext): string {
  const c = ctx.curriculum;
  const learned = c.learned.length ? bulletList(c.learned) : [];
  const topics = c.learned.flatMap((l) => l.learning ?? []).slice(0, 8);
  const topicLines = topics.map((t) => `• ${t}`);
  const parts = [
    "I am really happy — I just learned practical NLP with NLTK, spaCy, and Transformers on LearnNLP!",
    "",
    c.solvedCount > 0
      ? `Latest win: ${ctx.levelName} (${ctx.levelId})${
          ctx.commands !== null ? ` · ${ctx.commands} commands` : ""
        }`
      : "Just starting the curriculum.",
    "",
    learned.length ? "What I have learned so far:" : "",
    ...learned,
    topicLines.length ? "" : "",
    ...topicLines,
    "",
    `Progress: ${c.solvedCount}/${c.total} levels.`,
    "",
    "If you want to understand tokens, vectors, and honest text metrics — not just type code — try it. Free, no login:",
    SHARE_URL,
  ];
  return parts.filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n");
}

export function shareMessageX(ctx: ShareContext): string {
  const c = ctx.curriculum;
  const head = `Learned real NLP concepts on LearnNLP — ${c.solvedCount}/${c.total} levels.`;
  const first = c.learned[0] ? `• ${c.learned[0].name}` : "• text is not numbers";
  let text = `${head}\n${first}\n${SHARE_URL}`;
  if (text.length > 275) text = `${head}\n${SHARE_URL}`;
  return text;
}

export function buildShareTargets(ctx: ShareContext) {
  const li = encodeURIComponent(shareMessageLinkedIn(ctx));
  const tw = encodeURIComponent(shareMessageX(ctx));
  const title = encodeURIComponent(TITLE);
  const url = encodeURIComponent(SHARE_URL);
  return {
    linkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    linkedInText: li,
    x: `https://twitter.com/intent/tweet?text=${tw}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    copy: shareMessageLinkedIn(ctx),
    title,
    url,
  };
}

export async function shareWithClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
