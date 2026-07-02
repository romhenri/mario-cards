"use client";

import { CARD_CATALOG, type HandCard } from "@mario-cards/shared";

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
      style={{ background: def.colorType }}
      onClick={onClick}
      disabled={!playable}
      title={playable ? `Play ${def.name}` : "Not enough mana (or not your turn)"}
    >
      <div className="name">
        <span className="cost">[{def.cost}]</span> {def.name}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="card-art" src={def.image} alt={def.name} draggable={false} />
      <div className="stats">
        <span>{def.attack}</span>
        <span>{def.health}</span>
      </div>
    </button>
  );
}
