/**
 * Level registry — worlds compose into the rail and `levels` command.
 */

import type { Level } from "../engine/types";
import { WORLD1_LEVELS } from "./world1";
import { WORLD2_LEVELS } from "./world2";
import { WORLD3_LEVELS } from "./world3";
import { WORLD4_LEVELS } from "./world4";
import { WORLD5_LEVELS } from "./world5";
import { WORLD6_LEVELS } from "./world6";
import { WORLD7_LEVELS } from "./world7";
import { WORLD8_LEVELS } from "./world8";
import { WORLD9_LEVELS } from "./world9";

export const ALL_LEVELS: Level[] = [
  ...WORLD1_LEVELS,
  ...WORLD2_LEVELS,
  ...WORLD3_LEVELS,
  ...WORLD4_LEVELS,
  ...WORLD5_LEVELS,
  ...WORLD6_LEVELS,
  ...WORLD7_LEVELS,
  ...WORLD8_LEVELS,
  ...WORLD9_LEVELS,
];

export function findLevel(id: string): Level | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}

export const WORLD_LABELS: Record<string, string> = {
  w1: "WORLD 1 · TEXT IS NOT NUMBERS",
  w2: "WORLD 2 · BAG OF WORDS",
  w3: "WORLD 3 · GEOMETRY OF MEANING",
  w4: "WORLD 4 · CLASSIFICATION",
  w5: "WORLD 5 · SEQUENCE STRUCTURE",
  w6: "WORLD 6 · EMBEDDINGS",
  w7: "WORLD 7 · TOPICS",
  w8: "WORLD 8 · TRANSFORMERS",
  w9: "WORLD 9 · PACKAGE ZOO",
};

export {
  WORLD1_LEVELS,
  WORLD2_LEVELS,
  WORLD3_LEVELS,
  WORLD4_LEVELS,
  WORLD5_LEVELS,
  WORLD6_LEVELS,
  WORLD7_LEVELS,
  WORLD8_LEVELS,
  WORLD9_LEVELS,
};
