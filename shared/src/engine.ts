import { CARD_CATALOG } from "./cardCatalog.js";
import type {
  AttackTarget,
  BoardCreature,
  CardId,
  ClientGameState,
  EngineResult,
  GameState,
  PlayerState,
} from "./types.js";

export const STARTING_HP = 30;
export const MANA_CAP = 10;
export const BOARD_LIMIT = 7;
export const INITIAL_HAND_SIZE = 3;
export const COIN_BONUS_CARDS = 1; // extra card for the player going second
export const DECK_COPIES_PER_CARD = 15; // 15x goombo + 15x goomba = 30 cards

// Deterministic PRNG (mulberry32) so games are reproducible from a seed.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function newInstanceId(): string {
  return globalThis.crypto.randomUUID();
}

function buildDeck(rng: () => number): CardId[] {
  const deck: CardId[] = [];
  for (let i = 0; i < DECK_COPIES_PER_CARD; i++) deck.push("goombo", "goomba");
  return shuffle(deck, rng);
}

// Draw one card into hand. Empty deck: no draw, no damage (no fatigue in v1).
function draw(player: PlayerState): void {
  const cardId = player.deck.pop();
  if (cardId !== undefined) {
    player.hand.push({ instanceId: newInstanceId(), cardId });
  }
}

// Start-of-turn sequence for the (already switched) active player.
function beginTurn(player: PlayerState): void {
  player.manaMax = Math.min(MANA_CAP, player.manaMax + 1);
  player.manaCurrent = player.manaMax;
  for (const creature of player.board) {
    creature.hasSummoningSickness = false;
    creature.hasAttackedThisTurn = false;
  }
  draw(player);
}

export function createGame(
  playerAId: string,
  playerBId: string,
  rngSeed?: number
): GameState {
  const rng = mulberry32(rngSeed ?? Math.floor(Math.random() * 2 ** 31));

  const makePlayer = (playerId: string): PlayerState => ({
    playerId,
    hp: STARTING_HP,
    manaCurrent: 0,
    manaMax: 0,
    deck: buildDeck(rng),
    hand: [],
    board: [],
  });

  const players: [PlayerState, PlayerState] = [
    makePlayer(playerAId),
    makePlayer(playerBId),
  ];
  const firstPlayerIndex: 0 | 1 = rng() < 0.5 ? 0 : 1;
  const secondPlayerIndex = firstPlayerIndex === 0 ? 1 : 0;

  for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
    draw(players[firstPlayerIndex]);
    draw(players[secondPlayerIndex]);
  }
  // "The coin": the player going second draws one extra card.
  for (let i = 0; i < COIN_BONUS_CARDS; i++) {
    draw(players[secondPlayerIndex]);
  }

  const state: GameState = {
    gameId: newInstanceId(),
    phase: "playing",
    players,
    activePlayerIndex: firstPlayerIndex,
    turnNumber: 1,
    winnerPlayerId: null,
  };
  beginTurn(state.players[firstPlayerIndex]);
  return state;
}

function playerIndexOf(state: GameState, playerId: string): 0 | 1 | -1 {
  if (state.players[0].playerId === playerId) return 0;
  if (state.players[1].playerId === playerId) return 1;
  return -1;
}

// Common validation: game running + it's this player's turn.
// Returns the cloned state to mutate, or an error.
function beginAction(
  state: GameState,
  playerId: string
): { next?: GameState; error?: string } {
  if (state.phase !== "playing") return { error: "The game is not in progress" };
  const index = playerIndexOf(state, playerId);
  if (index === -1) return { error: "Unknown player" };
  if (state.activePlayerIndex !== index) return { error: "It's not your turn" };
  return { next: structuredClone(state) };
}

export function playCard(
  state: GameState,
  playerId: string,
  handInstanceId: string
): EngineResult {
  const { next, error } = beginAction(state, playerId);
  if (!next) return { state, error };

  const player = next.players[next.activePlayerIndex];
  const handIndex = player.hand.findIndex((c) => c.instanceId === handInstanceId);
  if (handIndex === -1) return { state, error: "Card is not in your hand" };

  const card = CARD_CATALOG[player.hand[handIndex].cardId];
  if (player.manaCurrent < card.cost) return { state, error: "Not enough mana" };
  if (player.board.length >= BOARD_LIMIT) return { state, error: "Your board is full" };

  player.manaCurrent -= card.cost;
  const [handCard] = player.hand.splice(handIndex, 1);
  const creature: BoardCreature = {
    instanceId: handCard.instanceId,
    cardId: card.id,
    currentAttack: card.attack,
    currentHealth: card.health,
    hasSummoningSickness: true,
    hasAttackedThisTurn: false,
  };
  player.board.push(creature);
  return { state: next };
}

export function attack(
  state: GameState,
  playerId: string,
  attackerInstanceId: string,
  target: AttackTarget
): EngineResult {
  const { next, error } = beginAction(state, playerId);
  if (!next) return { state, error };

  const player = next.players[next.activePlayerIndex];
  const opponent = next.players[next.activePlayerIndex === 0 ? 1 : 0];

  const attacker = player.board.find((c) => c.instanceId === attackerInstanceId);
  if (!attacker) return { state, error: "Attacker is not on your board" };
  if (attacker.hasSummoningSickness)
    return { state, error: "Creature can't attack the turn it was played" };
  if (attacker.hasAttackedThisTurn)
    return { state, error: "Creature already attacked this turn" };

  if (target.type === "face") {
    opponent.hp -= attacker.currentAttack;
  } else {
    const defender = opponent.board.find(
      (c) => c.instanceId === target.creatureInstanceId
    );
    if (!defender) return { state, error: "Target creature is not on the opponent's board" };
    defender.currentHealth -= attacker.currentAttack;
    attacker.currentHealth -= defender.currentAttack; // counter-attack
    opponent.board = opponent.board.filter((c) => c.currentHealth > 0);
    player.board = player.board.filter((c) => c.currentHealth > 0);
  }

  const winnerId = checkWinner(next);
  if (winnerId !== null) {
    next.phase = "finished";
    next.winnerPlayerId = winnerId;
    return { state: next };
  }

  // Attacker may have died in the trade; only mark it if it survived.
  const survivingAttacker = player.board.find(
    (c) => c.instanceId === attackerInstanceId
  );
  if (survivingAttacker) survivingAttacker.hasAttackedThisTurn = true;
  return { state: next };
}

export function endTurn(state: GameState, playerId: string): EngineResult {
  const { next, error } = beginAction(state, playerId);
  if (!next) return { state, error };

  next.activePlayerIndex = next.activePlayerIndex === 0 ? 1 : 0;
  next.turnNumber += 1;
  beginTurn(next.players[next.activePlayerIndex]);
  return { state: next };
}

export function checkWinner(state: GameState): string | null {
  const [a, b] = state.players;
  if (a.hp <= 0) return b.playerId;
  if (b.hp <= 0) return a.playerId;
  return null;
}

// Filtered per-player view: opponent hand/deck contents are never exposed.
export function toClientState(
  state: GameState,
  viewerIndex: 0 | 1
): ClientGameState {
  const you = state.players[viewerIndex];
  const opp = state.players[viewerIndex === 0 ? 1 : 0];
  return {
    gameId: state.gameId,
    phase: state.phase,
    you: {
      playerId: you.playerId,
      hp: you.hp,
      manaCurrent: you.manaCurrent,
      manaMax: you.manaMax,
      deckCount: you.deck.length,
      hand: structuredClone(you.hand),
      board: structuredClone(you.board),
    },
    opponent: {
      playerId: opp.playerId,
      hp: opp.hp,
      manaCurrent: opp.manaCurrent,
      manaMax: opp.manaMax,
      deckCount: opp.deck.length,
      handCount: opp.hand.length,
      board: structuredClone(opp.board),
    },
    yourTurn: state.activePlayerIndex === viewerIndex,
    turnNumber: state.turnNumber,
    winnerPlayerId: state.winnerPlayerId,
  };
}
