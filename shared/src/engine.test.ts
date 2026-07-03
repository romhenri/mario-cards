import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  attack,
  BOARD_LIMIT,
  checkWinner,
  createGame,
  DECK_SIZE,
  endTurn,
  INITIAL_HAND_SIZE,
  MANA_CAP,
  playCard,
  sanitizeDeck,
  STARTING_HP,
  toClientState,
} from "./engine.js";
import type { BoardCreature, GameState, PlayerState } from "./types.js";

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    playerId: "p0",
    hp: STARTING_HP,
    manaCurrent: 1,
    manaMax: 1,
    deck: [],
    hand: [],
    board: [],
    ...overrides,
  };
}

function makeCreature(overrides: Partial<BoardCreature> = {}): BoardCreature {
  return {
    instanceId: "c-" + Math.random().toString(36).slice(2),
    cardId: "Galoomba",
    currentAttack: 2,
    currentHealth: 2,
    hasSummoningSickness: false,
    hasAttackedThisTurn: false,
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: "g1",
    phase: "playing",
    players: [
      makePlayer({ playerId: "p0" }),
      makePlayer({ playerId: "p1" }),
    ],
    activePlayerIndex: 0,
    turnNumber: 1,
    winnerPlayerId: null,
    ...overrides,
  };
}

describe("createGame", () => {
  it("sets up 30 hp and both players opening with exactly 3 cards", () => {
    const state = createGame("alice", "bob", 42);
    const first = state.players[state.activePlayerIndex];
    const second = state.players[state.activePlayerIndex === 0 ? 1 : 0];

    assert.equal(first.hp, STARTING_HP);
    assert.equal(second.hp, STARTING_HP);
    // No draw on the very first turn and no coin bonus: both open with 3.
    assert.equal(first.hand.length, INITIAL_HAND_SIZE);
    assert.equal(second.hand.length, INITIAL_HAND_SIZE);
    assert.equal(first.deck.length, DECK_SIZE - INITIAL_HAND_SIZE);
    assert.equal(second.deck.length, DECK_SIZE - INITIAL_HAND_SIZE);
    // First player starts with 1/1 mana; second still at 0 until their turn.
    assert.equal(first.manaMax, 1);
    assert.equal(first.manaCurrent, 1);
    assert.equal(second.manaMax, 0);
    assert.equal(state.turnNumber, 1);
    assert.equal(state.phase, "playing");
  });

  it("is deterministic for the same seed", () => {
    const a = createGame("alice", "bob", 7);
    const b = createGame("alice", "bob", 7);
    assert.equal(a.activePlayerIndex, b.activePlayerIndex);
    assert.deepEqual(a.players[0].deck, b.players[0].deck);
    assert.deepEqual(
      a.players[0].hand.map((c) => c.cardId),
      b.players[0].hand.map((c) => c.cardId)
    );
  });

  it("uses a provided custom deck (shuffled, same cards)", () => {
    const custom = Array<"goomba" | "Galoomba">(DECK_SIZE).fill("goomba");
    custom[0] = "Galoomba";
    const state = createGame("alice", "bob", 42, [custom, null]);
    const alice = state.players[0];
    const dealt = [...alice.deck, ...alice.hand.map((c) => c.cardId)];
    assert.deepEqual([...dealt].sort(), [...custom].sort());
  });
});

describe("sanitizeDeck", () => {
  it("accepts exactly DECK_SIZE known card ids", () => {
    const deck = Array(DECK_SIZE).fill("goomba");
    assert.deepEqual(sanitizeDeck(deck), deck);
  });

  it("rejects wrong sizes, unknown ids, and non-arrays", () => {
    assert.equal(sanitizeDeck(Array(DECK_SIZE - 1).fill("goomba")), null);
    assert.equal(sanitizeDeck(Array(DECK_SIZE).fill("mario")), null);
    assert.equal(sanitizeDeck("goomba"), null);
    assert.equal(sanitizeDeck(null), null);
  });
});

describe("playCard", () => {
  it("plays a card: debits mana, moves it to the board with sickness", () => {
    const state = makeState();
    state.players[0].manaCurrent = 2;
    state.players[0].manaMax = 2;
    state.players[0].hand = [{ instanceId: "h1", cardId: "Galoomba" }];

    const { state: next, error } = playCard(state, "p0", "h1");
    assert.equal(error, undefined);
    const player = next.players[0];
    assert.equal(player.manaCurrent, 0);
    assert.equal(player.hand.length, 0);
    assert.equal(player.board.length, 1);
    assert.equal(player.board[0].currentAttack, 2);
    assert.equal(player.board[0].currentHealth, 2);
    assert.equal(player.board[0].hasSummoningSickness, true);
    // original state untouched (immutability)
    assert.equal(state.players[0].hand.length, 1);
  });

  it("rejects playing a card without enough mana", () => {
    const state = makeState();
    state.players[0].manaCurrent = 1;
    state.players[0].hand = [{ instanceId: "h1", cardId: "Galoomba" }]; // costs 2

    const { state: next, error } = playCard(state, "p0", "h1");
    assert.equal(error, "Not enough mana");
    assert.equal(next, state);
  });

  it("rejects playing a card out of turn", () => {
    const state = makeState();
    state.players[1].hand = [{ instanceId: "h1", cardId: "goomba" }];
    const { error } = playCard(state, "p1", "h1");
    assert.equal(error, "It's not your turn");
  });

  it("rejects playing onto a full board", () => {
    const state = makeState();
    state.players[0].manaCurrent = 10;
    state.players[0].board = Array.from({ length: BOARD_LIMIT }, () =>
      makeCreature()
    );
    state.players[0].hand = [{ instanceId: "h1", cardId: "goomba" }];
    const { error } = playCard(state, "p0", "h1");
    assert.equal(error, "Your board is full");
  });
});

describe("attack", () => {
  it("rejects attacking with a summoning-sick creature", () => {
    const state = makeState();
    state.players[0].board = [
      makeCreature({ instanceId: "a1", hasSummoningSickness: true }),
    ];
    const { error } = attack(state, "p0", "a1", { type: "face" });
    assert.equal(error, "Creature can't attack the turn it was played");
  });

  it("rejects attacking twice with the same creature", () => {
    const state = makeState();
    state.players[0].board = [makeCreature({ instanceId: "a1" })];

    const first = attack(state, "p0", "a1", { type: "face" });
    assert.equal(first.error, undefined);
    const second = attack(first.state, "p0", "a1", { type: "face" });
    assert.equal(second.error, "Creature already attacked this turn");
  });

  it("deals attack damage to the opponent's face", () => {
    const state = makeState();
    state.players[0].board = [makeCreature({ instanceId: "a1", currentAttack: 2 })];

    const { state: next, error } = attack(state, "p0", "a1", { type: "face" });
    assert.equal(error, undefined);
    assert.equal(next.players[1].hp, STARTING_HP - 2);
    assert.equal(next.players[0].board[0].hasAttackedThisTurn, true);
  });

  it("resolves creature combat with counter-attack damage", () => {
    const state = makeState();
    // Galoomba 2/2 attacks Goomba 1/1: goomba dies, Galoomba survives at 2/1.
    state.players[0].board = [makeCreature({ instanceId: "a1" })];
    state.players[1].board = [
      makeCreature({ instanceId: "d1", cardId: "goomba", currentAttack: 1, currentHealth: 1 }),
    ];

    const { state: next, error } = attack(state, "p0", "a1", {
      type: "creature",
      creatureInstanceId: "d1",
    });
    assert.equal(error, undefined);
    assert.equal(next.players[1].board.length, 0);
    assert.equal(next.players[0].board.length, 1);
    assert.equal(next.players[0].board[0].currentHealth, 1);
    assert.equal(next.players[0].board[0].hasAttackedThisTurn, true);
  });

  it("kills both creatures on an even trade (simultaneous death)", () => {
    const state = makeState();
    state.players[0].board = [makeCreature({ instanceId: "a1" })]; // 2/2
    state.players[1].board = [makeCreature({ instanceId: "d1" })]; // 2/2

    const { state: next, error } = attack(state, "p0", "a1", {
      type: "creature",
      creatureInstanceId: "d1",
    });
    assert.equal(error, undefined);
    assert.equal(next.players[0].board.length, 0);
    assert.equal(next.players[1].board.length, 0);
  });

  it("rejects an invalid creature target", () => {
    const state = makeState();
    state.players[0].board = [makeCreature({ instanceId: "a1" })];
    const { error } = attack(state, "p0", "a1", {
      type: "creature",
      creatureInstanceId: "nope",
    });
    assert.equal(error, "Target creature is not on the opponent's board");
  });

  it("ends the game when face damage drops the opponent to 0 or less", () => {
    const state = makeState();
    state.players[1].hp = 2;
    state.players[0].board = [makeCreature({ instanceId: "a1", currentAttack: 2 })];

    const { state: next, error } = attack(state, "p0", "a1", { type: "face" });
    assert.equal(error, undefined);
    assert.equal(next.phase, "finished");
    assert.equal(next.winnerPlayerId, "p0");

    // No further actions are processed after the game ends.
    const after = endTurn(next, "p0");
    assert.equal(after.error, "The game is not in progress");
  });
});

describe("endTurn / mana progression", () => {
  it("passes the turn, grows and refills the new player's mana, and draws", () => {
    const state = makeState();
    state.players[1].deck = ["Galoomba", "Galoomba"];
    state.players[1].manaMax = 3;
    state.players[1].manaCurrent = 0;

    const { state: next, error } = endTurn(state, "p0");
    assert.equal(error, undefined);
    assert.equal(next.activePlayerIndex, 1);
    assert.equal(next.turnNumber, 2);
    assert.equal(next.players[1].manaMax, 4);
    assert.equal(next.players[1].manaCurrent, 4);
    assert.equal(next.players[1].hand.length, 1);
    assert.equal(next.players[1].deck.length, 1);
  });

  it("clears summoning sickness and attack flags at the owner's turn start", () => {
    const state = makeState();
    state.players[1].board = [
      makeCreature({ instanceId: "c1", hasSummoningSickness: true, hasAttackedThisTurn: true }),
    ];
    const { state: next } = endTurn(state, "p0");
    assert.equal(next.players[1].board[0].hasSummoningSickness, false);
    assert.equal(next.players[1].board[0].hasAttackedThisTurn, false);
  });

  it("caps mana at MANA_CAP and skips the draw on an empty deck without damage", () => {
    const state = makeState();
    state.players[1].manaMax = MANA_CAP;
    state.players[1].deck = [];
    state.players[1].hp = 10;

    const { state: next } = endTurn(state, "p0");
    assert.equal(next.players[1].manaMax, MANA_CAP);
    assert.equal(next.players[1].manaCurrent, MANA_CAP);
    assert.equal(next.players[1].hand.length, 0);
    assert.equal(next.players[1].hp, 10); // no fatigue damage in v1
  });

  it("rejects ending the opponent's turn", () => {
    const state = makeState();
    const { error } = endTurn(state, "p1");
    assert.equal(error, "It's not your turn");
  });
});

describe("checkWinner", () => {
  it("returns null while both players are alive", () => {
    assert.equal(checkWinner(makeState()), null);
  });

  it("returns the surviving player's id", () => {
    const state = makeState();
    state.players[0].hp = 0;
    assert.equal(checkWinner(state), "p1");
  });
});

describe("toClientState", () => {
  it("hides opponent hand contents and all deck contents", () => {
    const state = createGame("alice", "bob", 42);
    const view = toClientState(state, 0);

    assert.equal(view.you.playerId, "alice");
    assert.equal(view.opponent.playerId, "bob");
    assert.equal(typeof view.opponent.handCount, "number");
    assert.equal((view.opponent as Record<string, unknown>)["hand"], undefined);
    assert.equal((view.you as Record<string, unknown>)["deck"], undefined);
    assert.equal(view.you.deckCount, state.players[0].deck.length);
    assert.equal(view.yourTurn, state.activePlayerIndex === 0);
  });
});
