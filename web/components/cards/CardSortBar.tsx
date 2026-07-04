"use client";

import type { CardSortMode } from "../../lib/cardTypes";

const OPTIONS: { mode: CardSortMode; label: string }[] = [
  { mode: "type", label: "By type" },
  { mode: "cost", label: "By cost" },
  { mode: "rarity", label: "By rarity" },
];

interface CardSortBarProps {
  sortMode: CardSortMode;
  onSortMode: (mode: CardSortMode) => void;
  grouped: boolean;
  onGrouped: (grouped: boolean) => void;
}

/** Sort mode picker + "Grouped" toggle shared by the deck builder and the
 * All Cards catalog. */
export function CardSortBar({
  sortMode,
  onSortMode,
  grouped,
  onGrouped,
}: CardSortBarProps) {
  return (
    <div className="deck-viewbar">
      <div className="deck-sort" role="group" aria-label="Sort cards">
        {OPTIONS.map(({ mode, label }) => (
          <button
            key={mode}
            className={`deck-sort-option ${sortMode === mode ? "active" : ""}`}
            onClick={() => onSortMode(mode)}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="check-option">
        <input
          type="checkbox"
          checked={grouped}
          onChange={(e) => onGrouped(e.target.checked)}
        />
        Grouped
      </label>
    </div>
  );
}
