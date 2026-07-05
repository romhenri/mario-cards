import {
  CARD_CATALOG,
  type CardDefinition,
  type CardRarity,
} from "@mario-cards/shared";

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

export type CardSortMode = "type" | "cost" | "rarity";

// Best first: rarity sorts top-down through the Special tier (boss, legend)
// then the Normal tier (rare, common).
const RARITY_ORDER: CardRarity[] = ["boss", "legend", "rare", "common"];

/** Sorted copy of `cards`; ties always break by cost then name so the
 * grid order is stable across modes. */
export function sortCards(
  cards: CardDefinition[],
  mode: CardSortMode
): CardDefinition[] {
  const byCostName = (a: CardDefinition, b: CardDefinition) =>
    a.cost - b.cost || a.name.localeCompare(b.name);
  const byType = (a: CardDefinition, b: CardDefinition) =>
    TYPE_ORDER.indexOf(a.creatureType) - TYPE_ORDER.indexOf(b.creatureType);
  const sorted = [...cards];
  switch (mode) {
    case "cost":
      return sorted.sort(byCostName);
    case "rarity":
      return sorted.sort(
        (a, b) =>
          RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) ||
          byType(a, b) ||
          byCostName(a, b)
      );
    case "type":
      return sorted.sort((a, b) => byType(a, b) || byCostName(a, b));
  }
}

/** Divider label of the group a card falls in for the given sort mode. */
export function cardGroupLabel(
  def: CardDefinition,
  mode: CardSortMode
): string {
  switch (mode) {
    case "cost":
      return `Cost ${def.cost}`;
    case "rarity":
      return def.rarity[0].toUpperCase() + def.rarity.slice(1);
    case "type":
      return typeLabel(def.creatureType);
  }
}
