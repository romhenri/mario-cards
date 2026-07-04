"use client";

import { useEffect, useState } from "react";
import type { CardId } from "@mario-cards/shared";
import { loadDeckSlots, type SavedDeck } from "../../lib/deckStore";
import { DeckSlotCard } from "./DeckSlotCard";

interface DeckChooseModalProps {
  /** Called with the chosen deck's cards, or null for a random deck. */
  onChoose: (deck: CardId[] | null) => void;
  onCancel?: () => void;
}

/** Match-start modal: pick one of the 5 saved decks or play a random one. */
export function DeckChooseModal({ onChoose, onCancel }: DeckChooseModalProps) {
  const [slots, setSlots] = useState<(SavedDeck | null)[] | null>(null);

  // Read localStorage after mount so server and client render the same HTML.
  useEffect(() => {
    setSlots(loadDeckSlots());
  }, []);

  return (
    <div className="modal-backdrop">
      <div className="deck-choose">
        <h2>Choose your deck</h2>
        <div className="deck-slots-row">
          {(slots ?? []).map((slot, i) => (
            <DeckSlotCard
              key={i}
              deck={slot}
              label={`Slot ${i + 1}`}
              disabled={!slot}
              onClick={() => slot && onChoose([...slot.cards])}
            />
          ))}
        </div>
        <div className="deck-choose-actions">
          <button className="deck-choose-random" onClick={() => onChoose(null)}>
            Random deck
          </button>
          {onCancel && (
            <button className="deck-choose-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
