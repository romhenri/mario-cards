import { DECK_SIZE, type CardId } from "@mario-cards/shared";

/** A boss battle: the CPU plays a fixed themed deck fronted by its boss. */
export interface Challenge {
  id: string;
  name: string;
  boss: CardId;
  description: string;
  deck: CardId[];
}

/** Themed 16-card boss decks (2-legend max, like player decks). */
export const CHALLENGES: Challenge[] = [
  {
    id: "king-bob-omb",
    name: "King Bob-omb",
    boss: "king-bob-omb",
    description: "Explosives royalty: bombs and every kind of bullet.",
    deck: [
      "king-bob-omb",
      "bob-omb",
      "bob-omb",
      "bob-omb",
      "para-bomb",
      "para-bomb",
      "para-bomb",
      "bullet-bill",
      "bullet-bill",
      "bullet-bill",
      "cat-bullet-bill",
      "cat-bullet-bill",
      "cat-bullet-bill",
      "banzai-bill",
      "banzai-bill",
      "banzai-bill",
    ],
  },
  {
    id: "king-boo",
    name: "King Boo",
    boss: "king-boo",
    description: "Haunted house: boos and the undead crew.",
    deck: [
      "king-boo",
      "boo",
      "boo",
      "boo",
      "boo",
      "big-boo",
      "big-boo",
      "big-boo",
      "dry-bones",
      "dry-bones",
      "dry-bones",
      "dry-bones",
      "paradrybones",
      "paradrybones",
      "paradrybones",
      "gloomba",
    ],
  },
  {
    id: "bowser-jr",
    name: "Bowser Jr.",
    boss: "bowser-jr",
    description: "The koopa army, with Magikoopa as the second legend.",
    deck: [
      "bowser-jr",
      "magikoopa",
      "koopa-troopa",
      "koopa-troopa",
      "koopa-troopa",
      "koopa-paratroopa",
      "koopa-paratroopa",
      "dry-bones",
      "dry-bones",
      "spike",
      "spike",
      "spike2",
      "spike2",
      "chargin-chuck",
      "chargin-chuck",
      "lakitu",
    ],
  },
];

for (const challenge of CHALLENGES) {
  if (challenge.deck.length !== DECK_SIZE) {
    throw new Error(
      `Challenge "${challenge.id}" deck has ${challenge.deck.length} cards, expected ${DECK_SIZE}`
    );
  }
}
