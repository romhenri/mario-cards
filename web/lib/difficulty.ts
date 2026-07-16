"use client";

import { DIFFICULTIES, type Difficulty } from "./cpuAI";

export { DIFFICULTIES, type Difficulty };

const STORAGE_KEY = "mario-cards:difficulty";

export const DEFAULT_DIFFICULTY: Difficulty = "normal";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
  hardcore: "Hardcore",
};

export const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  easy: "Plays at random and never trades",
  normal: "Greedy: big cards, good trades, then face",
  hard: "Spends every coin and hunts for lethal",
  hardcore: "Reads ahead to your next turn",
};

function isDifficulty(value: unknown): value is Difficulty {
  return DIFFICULTIES.includes(value as Difficulty);
}

/** The CPU difficulty setting; used by every vs-CPU match. */
export function getDifficulty(): Difficulty {
  if (typeof window === "undefined") return DEFAULT_DIFFICULTY;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isDifficulty(stored) ? stored : DEFAULT_DIFFICULTY;
  } catch {
    return DEFAULT_DIFFICULTY;
  }
}

export function setDifficulty(difficulty: Difficulty): void {
  try {
    localStorage.setItem(STORAGE_KEY, difficulty);
  } catch {
    // Private mode etc.: the preference just won't persist.
  }
}
