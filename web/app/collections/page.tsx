"use client";

import Link from "next/link";
import { Fragment } from "react";
import { CARD_CATALOG, type CardGame } from "@mario-cards/shared";
import { CardFace, cardStyle } from "../../components/board/CardFace";
import { Header } from "../../components/layout/Header";
import { sortCards } from "../../lib/cardTypes";

/** All Cards, but grouped by source game. Generic "3D" cards stay out —
 * only cards tied to a specific game show up in a collection. */
const GAMES: { game: CardGame; label: string }[] = [
  { game: "Bros", label: "Super Mario Bros" },
  { game: "MarioWorld", label: "Mario World" },
  { game: "Mario64", label: "Mario 64" },
  { game: "LuigisMassion", label: "Luigi's Mansion" },
  { game: "Sunshine", label: "Sunshine" },
  { game: "Galaxy", label: "Galaxy" },
  { game: "NewBros", label: "SM Bros U" },
  { game: "3DLand", label: "3D Land" },
  { game: "3DWorld", label: "3D World" },
  { game: "BowersFury", label: "Bowser's Fury" },
  { game: "Wonder", label: "Wonder" },
  { game: "Jamboree", label: "Jamboree" },
  { game: "TenisFever", label: "Tennis Fever" },
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
  return (
    <main className="page">
      <Header
        subtitle="Games"
        action={
          <Link className="nav-pill" href="/collections/others">
            <span className="header-back-label">Others</span>
            <span aria-hidden="true">⋯</span>
          </Link>
        }
      />

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
