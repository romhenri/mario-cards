"use client";

import { sanitizeDeck, type CardId } from "@mario-cards/shared";

const STORAGE_KEY = "mario-cards:deck";

/** The saved custom deck, or null if none/invalid (e.g. cards were removed). */
export function loadDeck(): CardId[] | null {
  if (typeof window === "undefined") return null;
  try {
    return sanitizeDeck(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function saveDeck(deck: CardId[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
}

export function clearDeck(): void {
  localStorage.removeItem(STORAGE_KEY);
}
