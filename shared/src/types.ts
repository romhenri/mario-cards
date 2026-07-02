export type CardId = "goombo" | "goomba";

export interface CardDefinition {
  id: CardId;
  name: string; // display name, e.g. "Goomba"
  cost: number; // mana cost
  attack: number; // base attack
  health: number; // base health
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
}

export interface PlayerState {
  playerId: string;
  hp: number;
  manaCurrent: number;
  manaMax: number;
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
  manaCurrent: number;
  manaMax: number;
  deckCount: number;
  hand: HandCard[];
  board: BoardCreature[];
}

export interface OpponentView {
  playerId: string;
  hp: number;
  manaCurrent: number;
  manaMax: number;
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
