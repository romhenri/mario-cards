"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CARD_CATALOG,
  DECK_SIZE,
  isSpecialRarity,
  type CardId,
} from "@mario-cards/shared";
import { CardFace, cardStyle } from "../../../../components/board/CardFace";
import { Header } from "../../../../components/layout/Header";
import { sortCards } from "../../../../lib/cardTypes";
import { CHALLENGES } from "../../../../lib/challenges";
import { loadDeckSlots } from "../../../../lib/deckStore";

interface ResolvedDeck {
  name: string;
  cards: CardId[];
}

/** Read-only view of a deck's contents: a challenge deck (by challenge id)
 * or a saved custom deck (by slot index). Reached from the profile page. */
export default function DeckViewPage() {
  const params = useParams<{ kind: string; id: string }>();
  const { kind, id } = params;
  const [deck, setDeck] = useState<ResolvedDeck | null | undefined>(undefined);

  useEffect(() => {
    if (kind === "challenge") {
      const c = CHALLENGES.find((ch) => ch.id === id);
      setDeck(c ? { name: c.name, cards: c.deck } : null);
    } else if (kind === "custom") {
      // Custom decks live in localStorage — read after mount.
      const slot = loadDeckSlots()[Number(id)];
      setDeck(slot ? { name: slot.name, cards: slot.cards } : null);
    } else {
      setDeck(null);
    }
  }, [kind, id]);

  // Collapse duplicates into {card, count}, sorted by family like the builder.
  const entries = useMemo(() => {
    if (!deck) return [];
    const counts = new Map<CardId, number>();
    for (const cardId of deck.cards) {
      counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
    }
    const defs = sortCards(
      [...counts.keys()].map((cardId) => CARD_CATALOG[cardId]),
      "type"
    );
    return defs.map((def) => ({ def, count: counts.get(def.id) ?? 0 }));
  }, [deck]);

  if (deck === undefined) {
    return (
      <main className="page">
        <Header subtitle="Deck" />
        <p className="info-message">Loading deck…</p>
      </main>
    );
  }

  if (deck === null) {
    return (
      <main className="page">
        <Header subtitle="Deck" />
        <p className="info-message">Deck not found.</p>
      </main>
    );
  }

  const specials = deck.cards.filter((cardId) =>
    isSpecialRarity(CARD_CATALOG[cardId].rarity)
  ).length;

  return (
    <main className="page">
      <Header subtitle="Deck" />

      <div className="deckview">
        <h2 className="deckview-title">{deck.name}</h2>
        <p className="deckview-summary">
          {deck.cards.length} cards
          {deck.cards.length !== DECK_SIZE && ` (of ${DECK_SIZE})`} ·{" "}
          {specials === 0
            ? "no specials"
            : `${specials} ${specials === 1 ? "special" : "specials"}`}
        </p>

        <div className="deckview-grid">
          {entries.map(({ def, count }) => (
            <div className="deckview-item" key={def.id}>
              <div className="card" style={cardStyle(def)}>
                <CardFace
                  def={def}
                  attack={def.attack}
                  health={def.health}
                  showCost
                />
              </div>
              {count > 1 && <span className="deckview-count">×{count}</span>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
