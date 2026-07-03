"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CARD_CATALOG, DECK_SIZE, type CardId } from "@mario-cards/shared";
import { CardFace, cardStyle } from "../../components/board/CardFace";
import { SiteTitle } from "../../components/layout/SiteTitle";
import { clearDeck, loadDeck, saveDeck } from "../../lib/deckStore";

type Counts = Partial<Record<CardId, number>>;

function toCounts(deck: CardId[]): Counts {
  const counts: Counts = {};
  for (const id of deck) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

function toDeck(counts: Counts): CardId[] {
  const deck: CardId[] = [];
  for (const [id, count] of Object.entries(counts)) {
    for (let i = 0; i < (count ?? 0); i++) deck.push(id as CardId);
  }
  return deck;
}

export default function DeckPage() {
  const [counts, setCounts] = useState<Counts>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadDeck();
    if (saved) setCounts(toCounts(saved));
  }, []);

  const cards = useMemo(
    () =>
      Object.values(CARD_CATALOG).sort(
        (a, b) => a.cost - b.cost || a.name.localeCompare(b.name)
      ),
    []
  );
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const complete = total === DECK_SIZE;

  const add = (id: CardId) => {
    if (total >= DECK_SIZE) return;
    setSavedMessage(null);
    setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  };

  const remove = (id: CardId) => {
    setSavedMessage(null);
    setCounts((c) => {
      const next = { ...c };
      const count = (next[id] ?? 0) - 1;
      if (count <= 0) delete next[id];
      else next[id] = count;
      return next;
    });
  };

  const handleSave = () => {
    saveDeck(toDeck(counts));
    setSavedMessage("Deck saved! It will be used in your next games.");
  };

  const handleClear = () => {
    clearDeck();
    setCounts({});
    setSavedMessage("Deck cleared — games will use a random deck.");
  };

  return (
    <main className="page">
      <SiteTitle subtitle="Deck Builder" />
      <p className="deck-hint">
        Pick {DECK_SIZE} cards. Duplicates are allowed — the more copies of a
        card, the more often you draw it.
      </p>

      <div className="deck-toolbar">
        <span className={`deck-count ${complete ? "complete" : ""}`}>
          {total} / {DECK_SIZE}
        </span>
        <button className="deck-save" onClick={handleSave} disabled={!complete}>
          Save deck
        </button>
        <button className="deck-clear" onClick={handleClear}>
          Clear
        </button>
        <Link href="/">Back to menu</Link>
      </div>
      <p className="info-message">{savedMessage}</p>

      <div className="deck-grid">
        {cards.map((def) => {
          const count = counts[def.id] ?? 0;
          return (
            <div key={def.id} className={`deck-slot ${count > 0 ? "picked" : ""}`}>
              <button
                className="card playable"
                style={cardStyle(def)}
                onClick={() => add(def.id)}
                disabled={total >= DECK_SIZE}
                title={`Add ${def.name}`}
              >
                <CardFace
                  def={def}
                  attack={def.attack}
                  health={def.health}
                  showCost
                />
              </button>
              <div className="deck-slot-controls">
                <button
                  className="deck-minus"
                  onClick={() => remove(def.id)}
                  disabled={count === 0}
                  title={`Remove one ${def.name}`}
                >
                  −
                </button>
                <span className="deck-copies">x{count}</span>
                <button
                  className="deck-plus"
                  onClick={() => add(def.id)}
                  disabled={total >= DECK_SIZE}
                  title={`Add one ${def.name}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
