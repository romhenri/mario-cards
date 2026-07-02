"use client";

import { CARD_CATALOG, type HandCard } from "@mario-cards/shared";
import { CardView } from "./CardView";

interface HandProps {
  cards: HandCard[];
  manaCurrent: number;
  /** Whether the local player may act right now (their turn, game running) */
  canAct: boolean;
  onPlayCard: (handInstanceId: string) => void;
}

export function Hand({ cards, manaCurrent, canAct, onPlayCard }: HandProps) {
  return (
    <div className="hand-row">
      {cards.length === 0 && <span className="info-message">(empty hand)</span>}
      {cards.map((card) => (
        <CardView
          key={card.instanceId}
          card={card}
          playable={canAct && CARD_CATALOG[card.cardId].cost <= manaCurrent}
          onClick={() => onPlayCard(card.instanceId)}
        />
      ))}
    </div>
  );
}
