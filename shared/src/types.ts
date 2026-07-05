export type CardId =
  | "Galoomba"
  | "winged-Galoomba"
  | "grand-Galoomba"
  | "goomba"
  | "paragoomba"
  | "grand-goomba"
  | "gloomba"
  | "cat-goomba"
  | "koopa-troopa"
  | "koopa-paratroopa"
  | "lakitu"
  | "dry-bones"
  | "paradrybones"
  | "spike"
  | "spike2"
  | "bowser-jr"
  | "bowser"
  | "shy-guy"
  | "fly-guy"
  | "piranha-plant"
  | "venus-fire-trap"
  | "pokey"
  | "stingby"
  | "ant-trooper"
  | "biddybud"
  | "para-biddybud"
  | "flutter"
  | "wiggler"
  | "fuzzler"
  | "conkdor"
  | "hammer-bro"
  | "sledge-bro"
  | "boomerang-bro"
  | "fire-bro"
  | "ice-bro"
  | "bob-omb"
  | "para-bomb"
  | "bullet-bill"
  | "banzai-bill"
  | "king-bob-omb"
  | "magikoopa"
  | "boo"
  | "big-boo"
  | "king-boo"
  | "monty-mole"
  | "morty-mole"
  | "rocky-wrench"
  | "chomp"
  | "thwomp"
  | "chargin-chuck"
  | "piranha-creeper"
  | "snow-pokey"
  | "cat-bullet-bill"
  | "bully"
  | "blockstepper"
  | "spiny-skipsqueak"
  | "fizzlit"
  | "blooper"
  | "cheep-cheep"
  | "splounder"
  | "peepa"
  | "daisy"
  | "peach"
  | "rosaline"
  | "toad"
  | "toadette"
  | "blue-toad"
  | "purple-toad"
  | "red-toad"
  | "yellow-toad"
  | "captain-toad"
  | "pauline"
  | "birdo"
  | "mario"
  | "luigi"
  | "yoshi"
  | "donkey-kong"
  | "plessiee"
  | "blue-yoshi"
  | "red-yoshi"
  | "yellow-yoshi"
  | "diddy-kong"
  | "wario"
  | "waluigi"
  | "luma"
  | "blue-luma"
  | "bomb-boo"
  | "bee"
  | "electrogoomba"
  | "octoguy"
  | "pokeyplant"
  | "spiny-piranha-plant"
  | "star-bunny"
  | "dixie-kong"
  | "queen-bee"
  | "dino-piranha";

export type CardRarity = "common" | "rare" | "legend" | "boss";

// Rarities split into two groups. "Normal" cards (common, rare) are the
// everyday deck filler; "Special" cards (legend, boss) are the powerful tier
// that deck rules key off of — a deck's type is set by how many it holds.
export type RarityGroup = "normal" | "special";

export function rarityGroup(rarity: CardRarity): RarityGroup {
  return rarity === "legend" || rarity === "boss" ? "special" : "normal";
}

/** True for the Special tier (legend or boss). */
export function isSpecialRarity(rarity: CardRarity): boolean {
  return rarityGroup(rarity) === "special";
}

// Source game of the card; "3D" is the generic bucket for cards not tied
// to a specific game (default when unknown)
export type CardGame = "3D" | "3DWorld" | "Galaxy";

// Creature families, used to group cards in the catalog and deck builder
export type CreatureType =
  | "goomba"
  | "koopa"
  | "shy-guy"
  | "plant"
  | "bro"
  | "bomb"
  | "mole"
  | "ghost"
  | "insect"
  | "animal"
  | "other"
  | "princess"
  | "toad"
  | "hero"
  | "dino"
  | "kong"
  | "fish"
  | "star";

export interface CardDefinition {
  id: CardId;
  name: string; // display name, e.g. "Goomba"
  creatureType: CreatureType;
  cost: number; // coins cost
  attack: number; // base attack
  health: number; // base health
  rarity: CardRarity;
  game: CardGame;
  stealth: boolean;
  taunt: boolean;
  quick: boolean;
  bomb: boolean; // attacks the turn it enters (like quick) but dies after its hit
  shield: boolean;
  fly: boolean;
  reach: boolean;
  colorType: string; // card background color (CSS color)
  image: string; // public asset path, e.g. "/cards-assets/Goomba.png"
}

// A card instance in a player's hand
export interface HandCard {
  instanceId: string; // unique uuid for this specific copy
  cardId: CardId;
}

// A creature instance in play on the board
export interface BoardCreature {
  instanceId: string;
  cardId: CardId;
  currentAttack: number;
  currentHealth: number;
  hasSummoningSickness: boolean;
  hasAttackedThisTurn: boolean;
  // Shield keyword: absorbs the next hit, then breaks
  shieldActive: boolean;
  // Stealth keyword: untargetable and ignores taunt, until it attacks
  stealthed: boolean;
}

export interface PlayerState {
  playerId: string;
  hp: number;
  coinsCurrent: number;
  coinsMax: number;
  deck: CardId[]; // top of deck = last element (draw = pop)
  hand: HandCard[];
  board: BoardCreature[];
}

export type GamePhase = "waiting" | "playing" | "finished";

export interface GameState {
  gameId: string;
  phase: GamePhase;
  players: [PlayerState, PlayerState];
  activePlayerIndex: 0 | 1;
  // Who took the very first turn; the round counter only advances when the
  // turn comes back around to this player (i.e. after both players played)
  firstPlayerIndex: 0 | 1;
  turnNumber: number;
  winnerPlayerId: string | null;
}

export type AttackTarget =
  | { type: "face" }
  | { type: "creature"; creatureInstanceId: string };

export type PlayerAction =
  | { kind: "play_card"; handInstanceId: string }
  | { kind: "attack"; attackerInstanceId: string; target: AttackTarget }
  | { kind: "end_turn" };

// ---- Client-facing (filtered) view of the game state ----
// The server never sends the opponent's hand contents or any deck contents.

export interface SelfView {
  playerId: string;
  hp: number;
  coinsCurrent: number;
  coinsMax: number;
  deckCount: number;
  hand: HandCard[];
  board: BoardCreature[];
}

export interface OpponentView {
  playerId: string;
  hp: number;
  coinsCurrent: number;
  coinsMax: number;
  deckCount: number;
  handCount: number;
  board: BoardCreature[];
}

export interface ClientGameState {
  gameId: string;
  phase: GamePhase;
  you: SelfView;
  opponent: OpponentView;
  yourTurn: boolean;
  turnNumber: number;
  winnerPlayerId: string | null;
}

export interface EngineResult {
  state: GameState;
  error?: string;
}
