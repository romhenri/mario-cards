"use client";

import { Fragment } from "react";
import { CARD_CATALOG } from "@mario-cards/shared";
import { CardFace, cardStyle } from "../../../components/board/CardFace";
import { Header } from "../../../components/layout/Header";
import { cardGroupLabel, sortCards } from "../../../lib/cardTypes";

/* The "3D" cards are the generic ones, not tied to any single game, so they
   get no collection of their own on /collections — this page is where they
   live. Grouped by creature family. */
const OTHERS = sortCards(
  Object.values(CARD_CATALOG).filter((def) => def.game === "3D"),
  "type"
);

export default function OtherCardsPage() {
  return (
    <main className="page">
      <Header subtitle="Others" backHref="/collections" />

      <div className="deck-grid cards-grid">
        {OTHERS.map((def, i) => {
          const prev = i > 0 ? OTHERS[i - 1] : null;
          const newGroup =
            !prev ||
            cardGroupLabel(prev, "type") !== cardGroupLabel(def, "type");
          return (
            <Fragment key={def.id}>
              {newGroup && (
                <div className="deck-cost-divider" role="separator">
                  <span className="deck-cost-divider-label">
                    {cardGroupLabel(def, "type")}
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
