"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DIFFICULTY_HINTS,
  DIFFICULTY_LABELS,
  getDifficulty,
  setDifficulty,
  type Difficulty,
} from "@/lib/difficulty";

/** How many of the 4 pips are lit for each level. */
const PIPS: Record<Difficulty, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
  hardcore: 4,
};

/** Global CPU difficulty setting; sits next to the mute button. */
export function DifficultyButton() {
  // Start on the default and sync from localStorage after mount so the server
  // and first client render agree (avoids a hydration mismatch).
  const [difficulty, setDifficultyState] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDifficultyState(getDifficulty());
  }, []);

  // Close on an outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (next: Difficulty) => {
    setDifficultyState(next);
    setDifficulty(next);
    setOpen(false);
  };

  const lit = PIPS[difficulty];

  return (
    <div className="difficulty-control" ref={rootRef}>
      <button
        type="button"
        className="difficulty-button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`CPU difficulty: ${DIFFICULTY_LABELS[difficulty]}`}
        title={`CPU difficulty: ${DIFFICULTY_LABELS[difficulty]}`}
      >
        {/* Signal-bar meter: one bar per level, rising with difficulty. */}
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <rect
              key={index}
              x={2 + index * 5.5}
              y={20 - (index + 1) * 4}
              width="4"
              height={(index + 1) * 4}
              rx="1"
              fill={index < lit ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
              opacity={index < lit ? 1 : 0.35}
            />
          ))}
        </svg>
      </button>

      {open && (
        <div className="difficulty-menu" role="menu">
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              type="button"
              role="menuitemradio"
              aria-checked={level === difficulty}
              className={`difficulty-option${level === difficulty ? " selected" : ""}`}
              onClick={() => choose(level)}
            >
              <span className="difficulty-option-label">
                {DIFFICULTY_LABELS[level]}
              </span>
              <span className="difficulty-option-hint">
                {DIFFICULTY_HINTS[level]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
