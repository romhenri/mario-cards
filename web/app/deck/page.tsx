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
import { CardSortBar } from "../../components/cards/CardSortBar";
import {
  cardGroupLabel,
  sortCards,
  type CardSortMode,
} from "../../lib/cardTypes";

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

const MAX_LEGEND_CARDS = 2;

const isLegend = (id: CardId) => CARD_CATALOG[id].rarity === "legend";

/** The card with the most copies in the deck (first added wins ties). */
function mostPopular(counts: Counts): CardId | null {
  let best: CardId | null = null;
  let bestCount = 0;
  for (const [id, count] of Object.entries(counts)) {
    if ((count ?? 0) > bestCount) {
      best = id as CardId;
      bestCount = count ?? 0;
    }
  }
  return best;
}

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
  const [sortMode, setSortMode] = useState<CardSortMode>("type");
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

  const cards = useMemo(
    () => sortCards(Object.values(CARD_CATALOG), sortMode),
    [sortMode]
  );
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const complete = total === DECK_SIZE;
  const legendTotal = Object.entries(counts).reduce(
    (sum, [id, n]) => sum + (isLegend(id as CardId) ? n ?? 0 : 0),
    0
  );
  const legendIds = Object.keys(counts).filter(
    (id) => (counts[id as CardId] ?? 0) > 0 && isLegend(id as CardId)
  ) as CardId[];

  // The cover follows the deck contents: a deck with legends is fronted by
  // its starred legend (first legend if none starred); otherwise the most
  // popular creature.
  const effectiveCover: CardId | null =
    legendIds.length > 0
      ? cover && legendIds.includes(cover)
        ? cover
        : legendIds[0]
      : mostPopular(counts);

  const add = (id: CardId) => {
    if (total >= DECK_SIZE) return;
    if (isLegend(id) && legendTotal >= MAX_LEGEND_CARDS) {
      setSavedMessage(`A deck can hold at most ${MAX_LEGEND_CARDS} legend cards.`);
      return;
    }
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
      cover: effectiveCover ?? deck[0],
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
          style={
            effectiveCover ? cardStyle(CARD_CATALOG[effectiveCover]) : undefined
          }
        >
          {effectiveCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="deck-slot-card-art"
              src={CARD_CATALOG[effectiveCover].image}
              alt={CARD_CATALOG[effectiveCover].name}
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

      <CardSortBar
        sortMode={sortMode}
        onSortMode={setSortMode}
        grouped={grouped}
        onGrouped={setGrouped}
      />
      <p className="info-message">{savedMessage}</p>

      <div className="deck-grid">
        {cards.map((def, i) => {
          const count = counts[def.id] ?? 0;
          const prev = i > 0 ? cards[i - 1] : null;
          const newGroup =
            grouped &&
            (!prev ||
              cardGroupLabel(prev, sortMode) !== cardGroupLabel(def, sortMode));
          return (
            <Fragment key={def.id}>
            {newGroup && (
              <div className="deck-cost-divider" role="separator">
                <span className="deck-cost-divider-label">
                  {cardGroupLabel(def, sortMode)}
                </span>
              </div>
            )}
            <div className={`deck-slot ${count > 0 ? "picked" : ""}`}>
              <button
                className="card playable"
                style={cardStyle(def)}
                onClick={() => add(def.id)}
                disabled={
                  total >= DECK_SIZE ||
                  (def.rarity === "legend" && legendTotal >= MAX_LEGEND_CARDS)
                }
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
                  disabled={
                    total >= DECK_SIZE ||
                    (def.rarity === "legend" && legendTotal >= MAX_LEGEND_CARDS)
                  }
                  title={`Add one ${def.name}`}
                >
                  +
                </button>
                {def.rarity === "legend" && (
                  <button
                    className={`deck-cover ${
                      effectiveCover === def.id ? "active" : ""
                    }`}
                    onClick={() => pickCover(def.id)}
                    disabled={count === 0}
                    title={`Make ${def.name} the favorite legend`}
                  >
                    ★
                  </button>
                )}
              </div>
            </div>
            </Fragment>
          );
        })}
      </div>
    </main>
  );
}
