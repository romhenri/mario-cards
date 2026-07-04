import { CARD_CATALOG } from "@mario-cards/shared";

/** Creature families in catalog order (cards.json is grouped by type). */
export const TYPE_ORDER = [
  ...new Set(Object.values(CARD_CATALOG).map((c) => c.creatureType)),
];

/** "shy-guy" -> "Shy Guy" */
export function typeLabel(type: string): string {
  return type
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
