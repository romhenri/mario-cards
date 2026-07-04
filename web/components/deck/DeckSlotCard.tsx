"use client";

import { CARD_CATALOG } from "@mario-cards/shared";
import { cardStyle } from "../board/CardFace";
import type { SavedDeck } from "../../lib/deckStore";

interface DeckSlotCardProps {
  deck: SavedDeck | null;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/** One of the 5 deck slots: the cover creature and deck name, or an
 * empty placeholder. Used atop the deck builder and in the match-start
 * deck chooser. */
export function DeckSlotCard({
  deck,
  label,
  selected = false,
  disabled = false,
  onClick,
}: DeckSlotCardProps) {
  const cover = deck ? CARD_CATALOG[deck.cover] : null;
  return (
    <button
      className={`deck-slot-card ${selected ? "selected" : ""} ${
        deck ? "" : "empty"
      }`}
      onClick={onClick}
      disabled={disabled}
      title={deck ? deck.name : `${label} (empty)`}
    >
      <span className="deck-slot-card-label">{label}</span>
      {cover ? (
        <span className="deck-slot-card-art-box" style={cardStyle(cover)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="deck-slot-card-art"
            src={cover.image}
            alt={cover.name}
            draggable={false}
          />
        </span>
      ) : (
        <span className="deck-slot-card-art-box">?</span>
      )}
      <span className="deck-slot-card-name">{deck ? deck.name : "Empty"}</span>
    </button>
  );
}
