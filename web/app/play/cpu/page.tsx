"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CARD_CATALOG, DECK_SIZE } from "@mario-cards/shared";
import { cardStyle } from "../../../components/board/CardFace";
import { Header } from "../../../components/layout/Header";
import { CHALLENGES } from "../../../lib/challenges";
import { loadCompletedChallenges } from "../../../lib/challengeStore";

/** Play mode: pick a boss challenge, then your deck on the battle page. */
export default function ChallengesPage() {
  // Read localStorage after mount so server and client render the same HTML.
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setDone(loadCompletedChallenges());
  }, []);

  return (
    <main className="page">
      <Header subtitle="Challenges" />

      <div className="challenge-list">
        {CHALLENGES.map((challenge) => {
          const boss = CARD_CATALOG[challenge.boss];
          const legends = challenge.deck.filter(
            (id) => CARD_CATALOG[id].rarity === "legend"
          ).length;
          return (
            <Link
              key={challenge.id}
              className="challenge-card"
              href={`/play/cpu/${challenge.id}`}
            >
              <span
                className="deck-slot-card-art-box challenge-card-art"
                style={cardStyle(boss)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="deck-slot-card-art"
                  src={boss.image}
                  alt={boss.name}
                  draggable={false}
                />
              </span>
              <span className="challenge-card-info">
                <span className="challenge-card-name">{challenge.name}</span>
                <span className="challenge-card-desc">
                  {challenge.description}
                </span>
                <span className="challenge-card-deck">
                  {DECK_SIZE} cards · {legends}{" "}
                  {legends === 1 ? "legend" : "legends"}
                </span>
              </span>
              <span className="challenge-card-side">
                {done[challenge.id] && (
                  <span className="challenge-done" title="Challenge cleared">
                    ✓ Cleared
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
