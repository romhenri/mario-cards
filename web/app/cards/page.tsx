"use client";

import { Fragment, useState } from "react";
import { CARD_CATALOG } from "@mario-cards/shared";
import { CardFace, cardStyle } from "../../components/board/CardFace";
import { Header } from "../../components/layout/Header";
import { TYPE_ORDER, typeLabel } from "../../lib/cardTypes";

const CARDS = Object.values(CARD_CATALOG).sort(
  (a, b) =>
    TYPE_ORDER.indexOf(a.creatureType) - TYPE_ORDER.indexOf(b.creatureType) ||
    a.cost - b.cost ||
    a.name.localeCompare(b.name)
);

export default function AllCardsPage() {
  const [grouped, setGrouped] = useState(false);

  return (
    <main className="page">
      <Header subtitle="All Cards" />

      <div className="deck-toolbar">
        <span className="deck-count complete">{CARDS.length} cards</span>
        <label className="check-option">
          <input
            type="checkbox"
            checked={grouped}
            onChange={(e) => setGrouped(e.target.checked)}
          />
          Grouped
        </label>
      </div>

      <div className="deck-grid cards-grid">
        {CARDS.map((def, i) => {
          const newType =
            grouped &&
            (i === 0 || CARDS[i - 1].creatureType !== def.creatureType);
          return (
            <Fragment key={def.id}>
              {newType && (
                <div className="deck-cost-divider" role="separator">
                  <span className="deck-cost-divider-label">
                    {typeLabel(def.creatureType)}
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
