"use client";

import { CARD_CATALOG, type HandCard } from "@mario-cards/shared";
import { CardFace, cardStyle } from "./CardFace";

interface CardViewProps {
  card: HandCard;
  playable: boolean;
  onClick: () => void;
}

export function CardView({ card, playable, onClick }: CardViewProps) {
  const def = CARD_CATALOG[card.cardId];
  return (
    <button
      className={`card ${playable ? "playable" : "unplayable"}`}
      style={cardStyle(def)}
      onClick={onClick}
      disabled={!playable}
      title={playable ? `Play ${def.name}` : "Not enough mana (or not your turn)"}
    >
      <CardFace def={def} attack={def.attack} health={def.health} showCost />
    </button>
  );
}
