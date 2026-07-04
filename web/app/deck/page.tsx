"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { CARD_CATALOG, DECK_SIZE, type CardId } from "@mario-cards/shared";
import { CardFace, cardStyle } from "../../components/board/CardFace";
import { DeckSlotCard } from "../../components/deck/DeckSlotCard";
import { Header } from "../../components/layout/Header";
import {
  clearDeckSlot,
  DECK_SLOT_COUNT,
  loadDeckSlots,
  saveDeckSlot,
  type SavedDeck,
} from "../../lib/deckStore";
import { TYPE_ORDER, typeLabel } from "../../lib/cardTypes";

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

type SortMode = "type" | "cost";

export default function DeckPage() {
  const [slots, setSlots] = useState<(SavedDeck | null)[]>(() =>
    Array(DECK_SLOT_COUNT).fill(null)
  );
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [counts, setCounts] = useState<Counts>({});
  const [deckName, setDeckName] = useState("");
  const [cover, setCover] = useState<CardId | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("type");
  const [grouped, setGrouped] = useState(false);

  const loadSlotIntoEditor = (all: (SavedDeck | null)[], index: number) => {
    const slot = all[index];
    setCounts(slot ? toCounts(slot.cards) : {});
    setDeckName(slot ? slot.name : "");
    setCover(slot ? slot.cover : null);
    setDirty(false);
  };

  useEffect(() => {
    const all = loadDeckSlots();
    setSlots(all);
    loadSlotIntoEditor(all, 0);
  }, []);

  const selectSlot = (index: number) => {
    if (index === selectedSlot) return;
    if (
      dirty &&
      !window.confirm("Discard unsaved changes to the current deck?")
    ) {
      return;
    }
    setSelectedSlot(index);
    setSavedMessage(null);
    loadSlotIntoEditor(slots, index);
  };

  const cards = useMemo(() => {
    const all = Object.values(CARD_CATALOG);
    if (sortMode === "cost") {
      return all.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    }
    return all.sort(
      (a, b) =>
        TYPE_ORDER.indexOf(a.creatureType) - TYPE_ORDER.indexOf(b.creatureType) ||
        a.cost - b.cost ||
        a.name.localeCompare(b.name)
    );
  }, [sortMode]);
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const complete = total === DECK_SIZE;

  const add = (id: CardId) => {
    if (total >= DECK_SIZE) return;
    setSavedMessage(null);
    setDirty(true);
    setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  };

  const remove = (id: CardId) => {
    setSavedMessage(null);
    setDirty(true);
    setCounts((c) => {
      const next = { ...c };
      const count = (next[id] ?? 0) - 1;
      if (count <= 0) {
        delete next[id];
        setCover((cv) => (cv === id ? null : cv));
      } else {
        next[id] = count;
      }
      return next;
    });
  };

  const pickCover = (id: CardId) => {
    setSavedMessage(null);
    setDirty(true);
    setCover(id);
  };

  const handleSave = () => {
    const deck = toDeck(counts);
    const saved: SavedDeck = {
      name: deckName.trim() || `Deck ${selectedSlot + 1}`,
      cover: cover && (counts[cover] ?? 0) > 0 ? cover : deck[0],
      cards: deck,
    };
    saveDeckSlot(selectedSlot, saved);
    setSlots((all) => all.map((s, i) => (i === selectedSlot ? saved : s)));
    setDeckName(saved.name);
    setCover(saved.cover);
    setDirty(false);
    setSavedMessage(
      `"${saved.name}" saved to slot ${selectedSlot + 1}! Pick it when a match starts.`
    );
  };

  const handleClear = () => {
    clearDeckSlot(selectedSlot);
    setSlots((all) => all.map((s, i) => (i === selectedSlot ? null : s)));
    setCounts({});
    setDeckName("");
    setCover(null);
    setDirty(false);
    setSavedMessage(`Slot ${selectedSlot + 1} cleared.`);
  };

  return (
    <main className="page">
      <Header subtitle="Deck Builder" />

      <div className="deck-slots-row">
        {slots.map((slot, i) => (
          <DeckSlotCard
            key={i}
            deck={slot}
            label={`Slot ${i + 1}`}
            selected={i === selectedSlot}
            onClick={() => selectSlot(i)}
          />
        ))}
      </div>

      <section className="deck-editor-panel" aria-label="Deck creation">
        <span
          className="deck-slot-card-art-box"
          style={cover ? cardStyle(CARD_CATALOG[cover]) : undefined}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="deck-slot-card-art"
              src={CARD_CATALOG[cover].image}
              alt={CARD_CATALOG[cover].name}
              draggable={false}
            />
          ) : (
            "?"
          )}
        </span>
        <input
          className="deck-name-input"
          placeholder={`Deck ${selectedSlot + 1}`}
          value={deckName}
          maxLength={20}
          onChange={(e) => {
            setDeckName(e.target.value);
            setDirty(true);
            setSavedMessage(null);
          }}
        />
        <span className={`deck-count ${complete ? "complete" : ""}`}>
          {total} / {DECK_SIZE}
        </span>
        <button className="deck-save" onClick={handleSave} disabled={!complete}>
          Save deck
        </button>
        <button className="deck-clear" onClick={handleClear}>
          Clear slot
        </button>
      </section>

      <div className="deck-viewbar">
        <div className="deck-sort" role="group" aria-label="Sort cards">
          <button
            className={`deck-sort-option ${sortMode === "type" ? "active" : ""}`}
            onClick={() => setSortMode("type")}
          >
            By type
          </button>
          <button
            className={`deck-sort-option ${sortMode === "cost" ? "active" : ""}`}
            onClick={() => setSortMode("cost")}
          >
            By cost
          </button>
        </div>
        <label className="check-option">
          <input
            type="checkbox"
            checked={grouped}
            onChange={(e) => setGrouped(e.target.checked)}
          />
          Grouped
        </label>
      </div>
      <p className="info-message">{savedMessage}</p>

      <div className="deck-grid">
        {cards.map((def, i) => {
          const count = counts[def.id] ?? 0;
          const prev = i > 0 ? cards[i - 1] : null;
          const newGroup =
            grouped &&
            (sortMode === "cost"
              ? !prev || prev.cost !== def.cost
              : !prev || prev.creatureType !== def.creatureType);
          return (
            <Fragment key={def.id}>
            {newGroup && (
              <div className="deck-cost-divider" role="separator">
                <span className="deck-cost-divider-label">
                  {sortMode === "cost"
                    ? `Cost ${def.cost}`
                    : typeLabel(def.creatureType)}
                </span>
              </div>
            )}
            <div className={`deck-slot ${count > 0 ? "picked" : ""}`}>
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
                <button
                  className={`deck-cover ${cover === def.id ? "active" : ""}`}
                  onClick={() => pickCover(def.id)}
                  disabled={count === 0}
                  title={`Make ${def.name} the deck cover`}
                >
                  ★
                </button>
              </div>
            </div>
            </Fragment>
          );
        })}
      </div>
    </main>
  );
}
