"use client";

import { STARTING_HP } from "@mario-cards/shared";

interface PlayerHudProps {
  name: string;
  hp: number;
  manaCurrent: number;
  manaMax: number;
  handCount: number;
  isActive: boolean;
  /** Shown as an attackable "face" button while an attacker is selected */
  faceTargetable?: boolean;
  onFaceClick?: () => void;
  /** Lets the board target this HUD for face-attack animations */
  rootRef?: React.Ref<HTMLDivElement>;
}

export function PlayerHud({
  name,
  hp,
  manaCurrent,
  manaMax,
  handCount,
  isActive,
  faceTargetable = false,
  onFaceClick,
  rootRef,
}: PlayerHudProps) {
  const remaining = Math.max(0, Math.min(STARTING_HP, hp));
  return (
    <div className="hud" ref={rootRef}>
      <span className="name">
        {/* Always rendered so the HUD doesn't shift when the turn changes */}
        <span
          className={`turn-dot ${isActive ? "on" : ""}`}
          title={isActive ? "Their turn" : ""}
        />
        {name}
      </span>
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
      <span className="mana">
        Mana: {manaCurrent}/{manaMax}
      </span>
      <span>Hand: {handCount}</span>
      {faceTargetable && (
        <button className="face-target" onClick={onFaceClick}>
          Attack face
        </button>
      )}
    </div>
  );
}
