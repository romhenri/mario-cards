"use client";

import { CARD_CATALOG } from "@mario-cards/shared";
import { cardStyle } from "../board/CardFace";
import { DIFFICULTY_LABELS } from "../../lib/difficulty";
import type { MatchHistoryEntry, MatchMode } from "../../lib/matchHistoryStore";

const MODE_LABELS: Record<MatchMode, string> = {
  cpu: "Quick Match",
  challenge: "Boss Challenge",
  multiplayer: "Multiplayer",
};

function formatPlayedAt(ts: number): string {
  const date = new Date(ts);
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** One row in the profile's match history: result, opponent, mode and when
 * it was played. Mirrors the challenge-card / deck-slot-card visual style. */
export function MatchHistoryCard({ entry }: { entry: MatchHistoryEntry }) {
  const cover = entry.coverCardId ? CARD_CATALOG[entry.coverCardId] : null;
  const subtitle = entry.difficulty
    ? `${MODE_LABELS[entry.mode]} · ${DIFFICULTY_LABELS[entry.difficulty]}`
    : MODE_LABELS[entry.mode];

  return (
    <div className={`match-history-card ${entry.result}`}>
      <span
        className="match-history-card-art-box"
        style={cover ? cardStyle(cover) : undefined}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="match-history-card-art"
            src={cover.image}
            alt={cover.name}
            draggable={false}
          />
        ) : (
          entry.opponentName.charAt(0).toUpperCase()
        )}
      </span>
      <span className="match-history-card-info">
        <span className="match-history-card-name">{entry.opponentName}</span>
        <span className="match-history-card-sub">{subtitle}</span>
        <span className="match-history-card-date">
          {formatPlayedAt(entry.ts)}
        </span>
      </span>
      <span className="match-history-card-side">
        <span className={`match-history-card-result ${entry.result}`}>
          {entry.result === "won" ? "Won" : "Lost"}
        </span>
        <span className="match-history-card-turns">Turn {entry.turnNumber}</span>
      </span>
    </div>
  );
}
