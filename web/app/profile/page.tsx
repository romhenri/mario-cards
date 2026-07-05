"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DeckSlotCard } from "../../components/deck/DeckSlotCard";
import { Header } from "../../components/layout/Header";
import {
  CHALLENGES,
  isChallengeDeckUnlocked,
  sortedChallenges,
  type ChallengeSide,
} from "../../lib/challenges";
import { loadCompletedChallenges } from "../../lib/challengeStore";
import {
  DECK_SLOT_COUNT,
  loadDeckSlots,
  type SavedDeck,
} from "../../lib/deckStore";
import { loadMatchStats, type MatchStats } from "../../lib/statsStore";

function challengeProgress(
  side: ChallengeSide,
  done: Record<string, boolean>
): { done: number; total: number; percent: number } {
  const all = CHALLENGES.filter((c) => c.side === side);
  const cleared = all.filter((c) => done[c.id]).length;
  return {
    done: cleared,
    total: all.length,
    percent: all.length === 0 ? 0 : Math.round((cleared / all.length) * 100),
  };
}

export default function ProfilePage() {
  const router = useRouter();
  // Read localStorage after mount so server and client render the same HTML.
  const [stats, setStats] = useState<MatchStats>({
    played: 0,
    won: 0,
    lost: 0,
  });
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [slots, setSlots] = useState<(SavedDeck | null)[]>(() =>
    Array(DECK_SLOT_COUNT).fill(null)
  );
  useEffect(() => {
    setStats(loadMatchStats());
    setDone(loadCompletedChallenges());
    setSlots(loadDeckSlots());
  }, []);

  const villain = challengeProgress("villains", done);
  const heroes = challengeProgress("heroes", done);

  return (
    <main className="page">
      <Header subtitle="Profile" />

      <div className="profile-sections">
        <section className="profile-section" aria-label="Match record">
          <h3>Matches</h3>
          <div className="profile-stats-row">
            <div className="profile-stat">
              <span className="profile-stat-value">{stats.played}</span>
              <span className="profile-stat-label">Played</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value won">{stats.won}</span>
              <span className="profile-stat-label">Won</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value lost">{stats.lost}</span>
              <span className="profile-stat-label">Lost</span>
            </div>
          </div>
        </section>

        <section className="profile-section" aria-label="Challenge progress">
          <h3>Challenges</h3>
          {[
            { label: "Villains", progress: villain },
            { label: "Heroes", progress: heroes },
          ].map(({ label, progress }) => (
            <div className="profile-progress" key={label}>
              <span className="profile-progress-label">{label}</span>
              <span className="profile-progress-track">
                <span
                  className="profile-progress-fill"
                  style={{ width: `${progress.percent}%` }}
                />
              </span>
              <span className="profile-progress-value">
                {progress.percent}% ({progress.done}/{progress.total})
              </span>
            </div>
          ))}
        </section>

        <section className="profile-section" aria-label="Deck slots">
          <h3>Decks</h3>
          <div className="deck-slots-row">
            {sortedChallenges().map((challenge) => {
              const unlocked = isChallengeDeckUnlocked(challenge, done);
              return (
                <DeckSlotCard
                  key={challenge.id}
                  deck={{
                    name: challenge.name,
                    cover: challenge.boss,
                    cards: challenge.deck,
                  }}
                  locked={!unlocked}
                  onClick={() =>
                    router.push(`/decks/challenge/${challenge.id}`)
                  }
                />
              );
            })}
          </div>
          <p className="deck-group-label">Custom decks</p>
          <div className="deck-slots-row">
            {slots.map((slot, i) => (
              <DeckSlotCard
                key={i}
                deck={slot}
                onClick={() =>
                  router.push(slot ? `/decks/custom/${i}` : "/deck")
                }
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
