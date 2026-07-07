"use client";

import { STARTING_HP } from "@mario-cards/shared";

interface PlayerHudProps {
  name: string;
  hp: number;
  coinsCurrent: number;
  coinsMax: number;
  handCount: number;
  isActive: boolean;
  /** Lets the board target this HUD for face-attack animations */
  rootRef?: React.Ref<HTMLDivElement>;
}

export function PlayerHud({
  name,
  hp,
  coinsCurrent,
  coinsMax,
  handCount,
  isActive,
  rootRef,
}: PlayerHudProps) {
  const remaining = Math.max(0, Math.min(STARTING_HP, hp));
  return (
    <div className="hud" ref={rootRef}>
      {/* Left: life */}
      <span className="hud-left">
        <span className="hp-num">{hp}</span>
        <span
          className="hp-bar"
          role="img"
          aria-label={`HP: ${hp}/${STARTING_HP}`}
          title={`HP: ${hp}/${STARTING_HP}`}
        >
          {Array.from({ length: STARTING_HP }, (_, i) => (
            <span key={i} className={`hp-seg ${i < remaining ? "filled" : "lost"}`} />
          ))}
        </span>
      </span>

      {/* Center: name */}
      <span className="name">
        {/* Always rendered so the HUD doesn't shift when the turn changes */}
        <span
          className={`turn-dot ${isActive ? "on" : ""}`}
          title={isActive ? "Their turn" : ""}
        />
        {name}
      </span>

      {/* Right: coins */}
      <span className="hud-right">
        <span className="coins">
          Coins: {coinsCurrent}/{coinsMax}
        </span>
        <span>Hand: {handCount}</span>
      </span>
    </div>
  );
}
