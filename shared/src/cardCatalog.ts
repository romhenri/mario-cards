import cardsJson from "./cards.json" with { type: "json" };
import type { CardDefinition, CardId } from "./types.js";

// The card database lives in cards.json — edit that file to tweak cards.
// (JSON imports widen literal ids to string, hence the cast.)
export const CARD_CATALOG = cardsJson as Record<CardId, CardDefinition>;
