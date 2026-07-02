"use client";

import { CARD_CATALOG, type BoardCreature } from "@mario-cards/shared";

interface CreatureSlotProps {
  creature: BoardCreature;
  /** Creature belongs to the local player and may be selected as an attacker */
  canAttack: boolean;
  /** Currently selected as the attacker */
  selected: boolean;
  /** Creature is a valid attack target (opponent side, attacker selected) */
  targetable: boolean;
  onClick: () => void;
}

export function CreatureSlot({
  creature,
  canAttack,
  selected,
  targetable,
  onClick,
}: CreatureSlotProps) {
  const def = CARD_CATALOG[creature.cardId];
  const classes = ["creature"];
  if (selected) classes.push("selected");
  else if (canAttack) classes.push("can-attack");
  if (targetable) classes.push("targetable");
  if (creature.hasSummoningSickness || creature.hasAttackedThisTurn) {
    classes.push("exhausted");
  }

  const clickable = canAttack || targetable;
  return (
    <button
      className={classes.join(" ")}
      style={{ background: def.colorType }}
      onClick={onClick}
      disabled={!clickable}
    >
      <div className="name">{def.name}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="card-art" src={def.image} alt={def.name} draggable={false} />
      <div className="stats">
        <span>{creature.currentAttack}</span>
        <span>{creature.currentHealth}</span>
      </div>
      {/* Always rendered so the card contents never shift between states */}
      <span className="tag">
        {creature.hasSummoningSickness
          ? "zzz (just played)"
          : creature.hasAttackedThisTurn
            ? "already attacked"
            : " "}
      </span>
    </button>
  );
}
