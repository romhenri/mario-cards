"use client";

import { useEffect, useRef } from "react";
import type { CardId, ClientGameState } from "@mario-cards/shared";
import type { Difficulty } from "./cpuAI";

const STORAGE_KEY = "mario-cards:match-history";
// Capped so localStorage can't grow without bound over a long play history.
const MAX_ENTRIES = 25;

export type MatchMode = "cpu" | "challenge" | "multiplayer";

export interface MatchHistoryEntry {
  gameId: string;
  ts: number;
  mode: MatchMode;
  result: "won" | "lost";
  opponentName: string;
  /** Boss art for challenge matches; no fixed art for cpu/multiplayer. */
  coverCardId: CardId | null;
  turnNumber: number;
  /** CPU difficulty the match was played at; omitted for multiplayer. */
  difficulty: Difficulty | null;
}

/** What a screen knows about the match before it finishes. */
export interface MatchMeta {
  mode: MatchMode;
  opponentName: string;
  coverCardId?: CardId | null;
  difficulty?: Difficulty | null;
}

function isMatchMode(value: unknown): value is MatchMode {
  return value === "cpu" || value === "challenge" || value === "multiplayer";
}

function sanitizeEntry(value: unknown): MatchHistoryEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.gameId !== "string" ||
    typeof v.ts !== "number" ||
    !isMatchMode(v.mode) ||
    (v.result !== "won" && v.result !== "lost") ||
    typeof v.opponentName !== "string" ||
    typeof v.turnNumber !== "number"
  ) {
    return null;
  }
  return {
    gameId: v.gameId,
    ts: v.ts,
    mode: v.mode,
    result: v.result,
    opponentName: v.opponentName,
    coverCardId: typeof v.coverCardId === "string" ? (v.coverCardId as CardId) : null,
    turnNumber: v.turnNumber,
    difficulty: typeof v.difficulty === "string" ? (v.difficulty as Difficulty) : null,
  };
}

/** Most recent match first. */
export function loadMatchHistory(): MatchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]"
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeEntry)
      .filter((e): e is MatchHistoryEntry => e !== null);
  } catch {
    return [];
  }
}

function recordMatchHistoryEntry(entry: MatchHistoryEntry): void {
  const history = [entry, ...loadMatchHistory()].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/** Appends a finished game to the match history exactly once per gameId.
 * Drop it in any screen that renders a live ClientGameState, alongside
 * useRecordMatchResult. */
export function useRecordMatchHistory(
  view: ClientGameState | null,
  meta: MatchMeta
): void {
  const recordedGameRef = useRef<string | null>(null);
  useEffect(() => {
    if (!view || view.phase !== "finished" || !view.winnerPlayerId) return;
    if (recordedGameRef.current === view.gameId) return;
    recordedGameRef.current = view.gameId;
    recordMatchHistoryEntry({
      gameId: view.gameId,
      ts: Date.now(),
      mode: meta.mode,
      result: view.winnerPlayerId === view.you.playerId ? "won" : "lost",
      opponentName: meta.opponentName,
      coverCardId: meta.coverCardId ?? null,
      turnNumber: view.turnNumber,
      difficulty: meta.difficulty ?? null,
    });
  }, [view, meta.mode, meta.opponentName, meta.coverCardId, meta.difficulty]);
}
