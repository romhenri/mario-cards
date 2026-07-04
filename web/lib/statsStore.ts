"use client";

import { useEffect, useRef } from "react";
import type { ClientGameState } from "@mario-cards/shared";

const STORAGE_KEY = "mario-cards:match-stats";

export interface MatchStats {
  played: number;
  won: number;
  lost: number;
}

const EMPTY: MatchStats = { played: 0, won: 0, lost: 0 };

export function loadMatchStats(): MatchStats {
  if (typeof window === "undefined") return EMPTY;
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null"
    );
    if (typeof parsed !== "object" || parsed === null) return EMPTY;
    const { played, won, lost } = parsed as Record<string, unknown>;
    if (
      typeof played !== "number" ||
      typeof won !== "number" ||
      typeof lost !== "number"
    ) {
      return EMPTY;
    }
    return { played, won, lost };
  } catch {
    return EMPTY;
  }
}

function recordMatchResult(won: boolean): void {
  const stats = loadMatchStats();
  stats.played += 1;
  if (won) stats.won += 1;
  else stats.lost += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

/** Records a finished game into the match stats exactly once per gameId.
 * Drop it in any screen that renders a live ClientGameState. */
export function useRecordMatchResult(view: ClientGameState | null): void {
  const recordedGameRef = useRef<string | null>(null);
  useEffect(() => {
    if (!view || view.phase !== "finished" || !view.winnerPlayerId) return;
    if (recordedGameRef.current === view.gameId) return;
    recordedGameRef.current = view.gameId;
    recordMatchResult(view.winnerPlayerId === view.you.playerId);
  }, [view]);
}
