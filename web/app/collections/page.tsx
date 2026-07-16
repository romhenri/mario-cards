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
  { game: "Kong", label: "Donkey Kong" },
  { game: "KongCountry", label: "Kong Country" },
  { game: "Bros", label: "Super Mario Bros" },
  { game: "MarioWorld", label: "Mario World" },
  { game: "Land", label: "Mario Land" },
  { game: "Kart", label: "Kart" },
  { game: "Mario64", label: "Mario 64" },
  { game: "YoshisIsland", label: "Yoshi's Island" },
  { game: "YoshisIslandDS", label: "Yoshi's Island DS" },
  { game: "PaperMario", label: "Paper Mario" },
  { game: "LuigisMassion", label: "Luigi's Mansion" },
  { game: "Sunshine", label: "Sunshine" },
  { game: "64DS", label: "64 DS" },
  { game: "Galaxy", label: "Galaxy" },
  { game: "NewBros", label: "SM Bros U" },
  { game: "3DLand", label: "3D Land" },
  { game: "3DWorld", label: "3D World" },
  { game: "MarioMaker", label: "Mario Maker" },
  { game: "Odyssey", label: "Odyssey" },
  { game: "BowersFury", label: "Bowser's Fury" },
  { game: "Wonder", label: "Wonder" },
  { game: "Jamboree", label: "Jamboree" },
  { game: "Tennis", label: "Tennis" },
  { game: "TennisFever", label: "Tennis Fever" },
];

const COLLECTIONS = GAMES.map(({ game, label }) => ({
  game,
  label,
  cards: sortCards(
    Object.values(CARD_CATALOG).filter((def) => def.game === game),
    "type"
  ),
})).filter(({ cards }) => cards.length > 0);

const OTHERS_COUNT = Object.values(CARD_CATALOG).filter(
  (def) => def.game === "3D"
).length;

export default function GameCollectionsPage() {
  return (
    <main className="page">
      <Header
        subtitle="Games"
        action={
          OTHERS_COUNT > 0 ? (
            <Link className="nav-pill" href="/collections/others">
              <span className="header-back-label">Others</span>
              <span aria-hidden="true">⋯</span>
            </Link>
          ) : undefined
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
