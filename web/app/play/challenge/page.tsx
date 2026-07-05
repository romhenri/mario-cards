"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CARD_CATALOG, DECK_SIZE, isSpecialRarity } from "@mario-cards/shared";
import { cardStyle } from "../../../components/board/CardFace";
import { Header } from "../../../components/layout/Header";
import { CHALLENGES, type ChallengeSide } from "../../../lib/challenges";
import { loadCompletedChallenges } from "../../../lib/challengeStore";

const TABS: { side: ChallengeSide; label: string }[] = [
  { side: "hero", label: "Hero" },
  { side: "villain", label: "Villain" },
];

/** Play mode: pick a boss challenge, then your deck on the battle page.
 * Hero tab: face the villain decks. Villain tab: face the hero decks. */
export default function ChallengesPage() {
  const [side, setSide] = useState<ChallengeSide>("hero");
  // Read localStorage after mount so server and client render the same HTML.
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setDone(loadCompletedChallenges());
  }, []);

  return (
    <main className="page">
      <Header subtitle="Challenges" />

      <div className="challenge-tabs deck-sort" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.side}
            role="tab"
            aria-selected={side === tab.side}
            className={`deck-sort-option ${side === tab.side ? "active" : ""}`}
            onClick={() => setSide(tab.side)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="challenge-list">
        {CHALLENGES.filter((challenge) => challenge.side === side).map(
          (challenge) => {
            const boss = CARD_CATALOG[challenge.boss];
            const specials = challenge.deck.filter((id) =>
              isSpecialRarity(CARD_CATALOG[id].rarity)
            ).length;
            const cleared = done[challenge.id] === true;
            return (
              <Link
                key={challenge.id}
                className={`challenge-card ${cleared ? "done" : ""}`}
                href={`/play/challenge/${challenge.id}`}
              >
                <span className="deck-slot-card-art-wrap challenge-card-art">
                  <span
                    className="deck-slot-card-art-box"
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
                  <span className="deck-slot-card-badge">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        specials > 2
                          ? "/icons/RainbowStar.png"
                          : specials >= 1
                            ? "/icons/star.png"
                            : "/icons/mushroom.png"
                      }
                      alt={
                        specials > 2
                          ? "Unlimited-special deck"
                          : specials >= 1
                            ? "Special deck"
                            : "Standard deck"
                      }
                      draggable={false}
                    />
                  </span>
                </span>
                <span className="challenge-card-info">
                  <span className="challenge-card-name">{challenge.name}</span>
                  <span className="challenge-card-desc">
                    {challenge.description}
                  </span>
                  <span className="challenge-card-deck">
                    {DECK_SIZE} cards ·{" "}
                    {specials === 0
                      ? "no specials"
                      : `${specials} ${specials === 1 ? "special" : "specials"}`}
                  </span>
                </span>
                <span className="challenge-card-side">
                  {cleared && (
                    <span className="challenge-done" title="Challenge done">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/icons/trophy.png"
                        alt="Done"
                        draggable={false}
                      />
                    </span>
                  )}
                </span>
              </Link>
            );
          }
        )}
      </div>
    </main>
  );
}
