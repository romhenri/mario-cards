"use client";

import { Fragment } from "react";
import { CARD_CATALOG, type CardGame } from "@mario-cards/shared";
import { CardFace, cardStyle } from "../../components/board/CardFace";
import { Header } from "../../components/layout/Header";
import { sortCards } from "../../lib/cardTypes";

/** All Cards, but grouped by source game. Generic "3D" cards stay out —
 * only cards tied to a specific game show up in a collection. */
const GAMES: { game: CardGame; label: string }[] = [
  { game: "Galaxy", label: "Galaxy" },
  { game: "NewBrosU", label: "SM Bros U" },
  { game: "3DWorld", label: "3D World" },
  { game: "BowersFury", label: "Bowser's Fury" },
  { game: "Sunshine", label: "Sunshine" },
];

const COLLECTIONS = GAMES.map(({ game, label }) => ({
  game,
  label,
  cards: sortCards(
    Object.values(CARD_CATALOG).filter((def) => def.game === game),
    "type"
  ),
})).filter(({ cards }) => cards.length > 0);

export default function GameCollectionsPage() {
  const total = COLLECTIONS.reduce((sum, c) => sum + c.cards.length, 0);

  return (
    <main className="page">
      <Header subtitle="Games" />

      <div className="deck-toolbar">
        <span className="deck-count complete">{total} cards</span>
      </div>

      <div className="deck-grid cards-grid">
        {COLLECTIONS.map(({ game, label, cards }) => (
          <Fragment key={game}>
            <div className="deck-cost-divider" role="separator">
              <span className="deck-cost-divider-label">
                {label} · {cards.length}
              </span>
            </div>
            {cards.map((def) => (
              <div key={def.id} className="card" style={cardStyle(def)}>
                <CardFace
                  def={def}
                  attack={def.attack}
                  health={def.health}
                  showCost
                />
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </main>
  );
}
