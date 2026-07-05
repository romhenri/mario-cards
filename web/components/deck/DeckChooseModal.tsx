"use client";

import { useEffect, useState } from "react";
import { CARD_CATALOG, isSpecialRarity, type CardId } from "@mario-cards/shared";
import { CHALLENGES, isChallengeDeckUnlocked } from "../../lib/challenges";
import { loadCompletedChallenges } from "../../lib/challengeStore";
import { loadDeckSlots, type SavedDeck } from "../../lib/deckStore";
import { DeckSlotCard } from "./DeckSlotCard";

interface DeckChooseModalProps {
  /** Called with the chosen deck's cards, or null for a random deck. */
  onChoose: (deck: CardId[] | null) => void;
  onCancel?: () => void;
}

/** How many Special cards (legend or boss) a deck holds; the selector lists
 * decks from fewest specials to most. */
function specialCount(cards: CardId[]): number {
  return cards.filter((id) => isSpecialRarity(CARD_CATALOG[id].rarity)).length;
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
        <div className="deck-slots-row">
          {[...CHALLENGES]
            .sort((a, b) => specialCount(a.deck) - specialCount(b.deck))
            .map((challenge) => {
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
  );
}
