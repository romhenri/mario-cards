"use client";

import { Fragment, useMemo, useState } from "react";
import { CARD_CATALOG } from "@mario-cards/shared";
import { CardFace, cardStyle } from "../../components/board/CardFace";
import { CardSortBar } from "../../components/cards/CardSortBar";
import { Header } from "../../components/layout/Header";
import {
  cardGroupLabel,
  sortCards,
  type CardSortMode,
} from "../../lib/cardTypes";

export default function AllCardsPage() {
  const [sortMode, setSortMode] = useState<CardSortMode>("type");
  const [grouped, setGrouped] = useState(false);

  const cards = useMemo(
    () => sortCards(Object.values(CARD_CATALOG), sortMode),
    [sortMode]
  );

  return (
    <main className="page">
      <Header subtitle="All Cards" />

      <div className="deck-toolbar">
        <span className="deck-count complete">{cards.length} cards</span>
      </div>

      <CardSortBar
        sortMode={sortMode}
        onSortMode={setSortMode}
        grouped={grouped}
        onGrouped={setGrouped}
      />

      <div className="deck-grid cards-grid">
        {cards.map((def, i) => {
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
              <div className="card" style={cardStyle(def)}>
                <CardFace
                  def={def}
                  attack={def.attack}
                  health={def.health}
                  showCost
                />
              </div>
            </Fragment>
          );
        })}
      </div>
    </main>
  );
}
