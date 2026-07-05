"use client";

import { useEffect, useState } from "react";
import type { CardId } from "@mario-cards/shared";
import { isChallengeDeckUnlocked, sortedChallenges } from "../../lib/challenges";
import { loadCompletedChallenges } from "../../lib/challengeStore";
import { loadDeckSlots, type SavedDeck } from "../../lib/deckStore";
import { DeckSlotCard } from "./DeckSlotCard";

interface DeckChooseModalProps {
  /** Called with the chosen deck's cards, or null for a random deck. */
  onChoose: (deck: CardId[] | null) => void;
  onCancel?: () => void;
}

/** Match-start modal: pick a saved deck, an unlocked challenge deck, or a
 * random one. Challenge decks unlock by beating their challenge. */
export function DeckChooseModal({ onChoose, onCancel }: DeckChooseModalProps) {
  const [slots, setSlots] = useState<(SavedDeck | null)[] | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  // Read localStorage after mount so server and client render the same HTML.
  useEffect(() => {
    setSlots(loadDeckSlots());
    setDone(loadCompletedChallenges());
  }, []);

  return (
    <div className="modal-backdrop">
      <div className="deck-choose">
        <div className="deck-choose-header">
          {onCancel ? (
            <button className="deck-choose-cancel" onClick={onCancel}>
              Back
            </button>
          ) : (
            <span aria-hidden />
          )}
          <h2>Choose your deck</h2>
          <button
            className="deck-choose-random"
            onClick={() => onChoose(null)}
          >
            Random deck
          </button>
        </div>
        <div className="deck-choose-body">
        <div className="deck-slots-row">
          {sortedChallenges().map((challenge) => {
            const unlocked = isChallengeDeckUnlocked(challenge, done);
            return (
              <DeckSlotCard
                key={challenge.id}
                deck={{
                  name: challenge.name,
                  cover: challenge.boss,
                  cards: challenge.deck,
                }}
                locked={!unlocked}
                disabled={!unlocked}
                onClick={() => unlocked && onChoose([...challenge.deck])}
              />
            );
          })}
        </div>
        <p className="deck-group-label">Custom decks</p>
        <div className="deck-slots-row">
          {(slots ?? []).map((slot, i) => (
            <DeckSlotCard
              key={i}
              deck={slot}
              disabled={!slot}
              onClick={() => slot && onChoose([...slot.cards])}
            />
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
