"use client";

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
}: PlayerHudProps) {
  return (
    <div className="hud">
      <span className="name">
        {name} {isActive && <span className="active-marker">◄ turn</span>}
      </span>
      <span className="hp">HP: {hp}</span>
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
