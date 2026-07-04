"use client";

import { CARD_CATALOG, sanitizeDeck, type CardId } from "@mario-cards/shared";

export const DECK_SLOT_COUNT = 5;

const STORAGE_KEY = "mario-cards:decks";
const LEGACY_STORAGE_KEY = "mario-cards:deck";

/** A saved deck: a name, a cover creature that represents it, and its cards. */
export interface SavedDeck {
  name: string;
  cover: CardId;
  cards: CardId[];
}

function sanitizeSavedDeck(value: unknown): SavedDeck | null {
  if (typeof value !== "object" || value === null) return null;
  const { name, cover, cards } = value as Record<string, unknown>;
  const deck = sanitizeDeck(cards);
  if (!deck) return null;
  const coverId =
    typeof cover === "string" && cover in CARD_CATALOG
      ? (cover as CardId)
      : deck[0];
  return {
    name: typeof name === "string" && name.trim() ? name.trim() : "Unnamed deck",
    cover: coverId,
    cards: deck,
  };
}

/** All 5 deck slots; empty/invalid slots are null. Migrates the old
 * single-deck save into slot 1 the first time it runs. */
export function loadDeckSlots(): (SavedDeck | null)[] {
  const slots: (SavedDeck | null)[] = Array(DECK_SLOT_COUNT).fill(null);
  if (typeof window === "undefined") return slots;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (let i = 0; i < DECK_SLOT_COUNT; i++) {
          slots[i] = sanitizeSavedDeck(parsed[i]);
        }
      }
      return slots;
    }
    // First run on the new format: adopt the legacy single deck as slot 1.
    const legacy = sanitizeDeck(
      JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? "null")
    );
    if (legacy) {
      slots[0] = { name: "Deck 1", cover: legacy[0], cards: legacy };
      persist(slots);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // fall through to empty slots
  }
  return slots;
}

export function saveDeckSlot(index: number, deck: SavedDeck): void {
  const slots = loadDeckSlots();
  slots[index] = deck;
  persist(slots);
}

export function clearDeckSlot(index: number): void {
  const slots = loadDeckSlots();
  slots[index] = null;
  persist(slots);
}

function persist(slots: (SavedDeck | null)[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}
