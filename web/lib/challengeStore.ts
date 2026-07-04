"use client";

const STORAGE_KEY = "mario-cards:challenges-done";

/** Ids of the challenges the player has beaten. */
export function loadCompletedChallenges(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}"
    );
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => v === true)
    ) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function markChallengeCompleted(id: string): void {
  const done = loadCompletedChallenges();
  if (done[id]) return;
  done[id] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
}
