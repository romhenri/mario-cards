"use client";

import { CARD_CATALOG, type BoardCreature } from "@mario-cards/shared";
import { CardFace, cardStyle } from "./CardFace";

interface CreatureSlotProps {
  creature: BoardCreature;
  /** Creature belongs to the local player and may be selected as an attacker */
  canAttack: boolean;
  /** Currently selected as the attacker */
  selected: boolean;
  /** Creature is a valid attack target (opponent side, attacker selected) */
  targetable: boolean;
  /** Just died: rendered as a non-interactive ghost while the death
      animation plays, then removed */
  dying?: boolean;
  onClick: () => void;
  /** Lets the board track this slot's DOM node for attack animations */
  slotRef?: (el: HTMLButtonElement | null) => void;
}

export function CreatureSlot({
  creature,
  canAttack,
  selected,
  targetable,
  dying = false,
  onClick,
  slotRef,
}: CreatureSlotProps) {
  const def = CARD_CATALOG[creature.cardId];
  const classes = ["creature"];
  if (dying) {
    classes.push("dying");
  } else {
    if (selected) classes.push("selected");
    else if (canAttack) classes.push("can-attack");
    if (targetable) classes.push("targetable");
    if (creature.hasSummoningSickness || creature.hasAttackedThisTurn) {
      classes.push("exhausted");
    }
  }
  if (creature.shieldActive) classes.push("shielded");
  if (creature.stealthed) classes.push("stealthed");

  const clickable = !dying && (canAttack || targetable);
  return (
    <button
      ref={slotRef}
      className={classes.join(" ")}
      style={cardStyle(def)}
      onClick={onClick}
      disabled={!clickable}
    >
      <CardFace
        def={def}
        attack={creature.currentAttack}
        health={creature.currentHealth}
        shieldActive={creature.shieldActive}
      />
    </button>
  );
}
