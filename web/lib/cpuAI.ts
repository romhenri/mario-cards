import {
  attack,
  BOARD_LIMIT,
  CARD_CATALOG,
  endTurn,
  legalAttackTargets,
  playCard,
  type AttackTarget,
  type BoardCreature,
  type GameState,
  type PlayerAction,
  type PlayerState,
} from "@mario-cards/shared";

/** How hard the CPU plays. Persisted as a global setting (see difficulty.ts). */
export type Difficulty = "easy" | "normal" | "hard" | "hardcore";

export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard", "hardcore"];

/**
 * Picks the CPU's whole turn up front, as a list of actions to replay.
 *
 * - easy:     plays random cards, always swings at the face. Never trades.
 * - normal:   greedy single pass — biggest card first, favorable trades, then face.
 * - hard:     normal + spends every coin it can, finds lethal, and picks the
 *             cheapest attacker for each kill.
 * - hardcore: searches the turn's action tree and scores each line by the board
 *             it leaves behind *after* the opponent's best greedy reply.
 */
export function decideCpuTurn(
  state: GameState,
  cpuPlayerId: string,
  difficulty: Difficulty = "normal",
  rng: () => number = Math.random
): PlayerAction[] {
  switch (difficulty) {
    case "easy":
      return easyTurn(state, cpuPlayerId, rng);
    case "normal":
      return normalTurn(state, cpuPlayerId);
    case "hard":
      return hardTurn(state, cpuPlayerId);
    case "hardcore":
      return hardcoreTurn(state, cpuPlayerId);
  }
}

// ---- Shared helpers -------------------------------------------------------

function self(state: GameState, playerId: string): PlayerState {
  return state.players.find((p) => p.playerId === playerId)!;
}

function foe(state: GameState, playerId: string): PlayerState {
  return state.players.find((p) => p.playerId !== playerId)!;
}

/** Creatures that are allowed to attack right now. */
function readyAttackers(player: PlayerState): BoardCreature[] {
  return player.board.filter(
    (c) => !c.hasSummoningSickness && !c.hasAttackedThisTurn && c.currentAttack > 0
  );
}

function affordable(player: PlayerState) {
  return player.hand.filter(
    (c) => CARD_CATALOG[c.cardId].cost <= player.coinsCurrent
  );
}

/** A hit only kills if it isn't eaten by a shield. */
function kills(attacker: BoardCreature, defender: BoardCreature): boolean {
  return !defender.shieldActive && attacker.currentAttack >= defender.currentHealth;
}

/** True if the attacker dies to the counter-attack. */
function diesToCounter(attacker: BoardCreature, defender: BoardCreature): boolean {
  return !attacker.shieldActive && defender.currentAttack >= attacker.currentHealth;
}

/** Rough worth of a creature on the board, used to rank trades and score states. */
function creatureValue(creature: BoardCreature): number {
  const card = CARD_CATALOG[creature.cardId];
  let value = creature.currentAttack + creature.currentHealth;
  if (card.taunt) value += 1;
  if (creature.shieldActive) value += 1;
  if (creature.stealthed) value += 0.5;
  if (card.fly) value += 0.5;
  if (card.reach) value += 0.5;
  return value;
}

function boardValue(board: BoardCreature[]): number {
  return board.reduce((sum, c) => sum + creatureValue(c), 0);
}

/** Runs one action through the engine, returning null if it was illegal. */
function step(
  state: GameState,
  playerId: string,
  action: PlayerAction
): GameState | null {
  const result =
    action.kind === "play_card"
      ? playCard(state, playerId, action.handInstanceId)
      : action.kind === "attack"
        ? attack(state, playerId, action.attackerInstanceId, action.target)
        : endTurn(state, playerId);
  return result.error ? null : result.state;
}

// ---- Easy -----------------------------------------------------------------

/** Dumps random cards on the board and always swings at the face when it can. */
function easyTurn(
  state: GameState,
  cpuPlayerId: string,
  rng: () => number
): PlayerAction[] {
  const actions: PlayerAction[] = [];
  let sim = state;

  while (self(sim, cpuPlayerId).board.length < BOARD_LIMIT) {
    const playable = affordable(self(sim, cpuPlayerId));
    if (playable.length === 0) break;

    const pick = playable[Math.floor(rng() * playable.length)];
    const next = step(sim, cpuPlayerId, {
      kind: "play_card",
      handInstanceId: pick.instanceId,
    });
    if (!next) break;
    sim = next;
    actions.push({ kind: "play_card", handInstanceId: pick.instanceId });
  }

  for (;;) {
    const attacker = readyAttackers(self(sim, cpuPlayerId))[0];
    if (!attacker) break;

    const legal = legalAttackTargets(attacker, foe(sim, cpuPlayerId).board);
    let target: AttackTarget;
    if (legal.face) {
      target = { type: "face" };
    } else if (legal.creatures.length > 0) {
      const victim = legal.creatures[Math.floor(rng() * legal.creatures.length)];
      target = { type: "creature", creatureInstanceId: victim.instanceId };
    } else {
      break; // nothing this creature can legally hit
    }

    const action: PlayerAction = {
      kind: "attack",
      attackerInstanceId: attacker.instanceId,
      target,
    };
    const next = step(sim, cpuPlayerId, action);
    if (!next) break;
    sim = next;
    actions.push(action);
    if (sim.phase === "finished") return actions;
  }

  actions.push({ kind: "end_turn" });
  return actions;
}

// ---- Normal (the original greedy AI) --------------------------------------

/**
 * Greedy single pass, no lookahead: play the most expensive affordable cards,
 * then attack — favorable trades first, otherwise go face.
 */
function normalTurn(state: GameState, cpuPlayerId: string): PlayerAction[] {
  const actions: PlayerAction[] = [];
  let sim = state;

  const me = () => self(sim, cpuPlayerId);
  const opp = () => foe(sim, cpuPlayerId);

  while (me().board.length < BOARD_LIMIT) {
    const playable = affordable(me())
      // Stable sort: ties keep hand order.
      .sort((a, b) => CARD_CATALOG[b.cardId].cost - CARD_CATALOG[a.cardId].cost);
    if (playable.length === 0) break;

    const pick = playable[0];
    const next = step(sim, cpuPlayerId, {
      kind: "play_card",
      handInstanceId: pick.instanceId,
    });
    if (!next) break;
    sim = next;
    actions.push({ kind: "play_card", handInstanceId: pick.instanceId });
  }

  const skipped = new Set<string>();
  for (;;) {
    const attacker = readyAttackers(me()).find((c) => !skipped.has(c.instanceId));
    if (!attacker) break;

    const legal = legalAttackTargets(attacker, opp().board);

    // Favorable trade: we kill it and survive the counter-attack.
    const trades = legal.creatures
      .filter((t) => kills(attacker, t) && !diesToCounter(attacker, t))
      .sort((a, b) => a.currentHealth - b.currentHealth);

    let target: AttackTarget;
    if (trades.length > 0) {
      target = { type: "creature", creatureInstanceId: trades[0].instanceId };
    } else if (legal.face) {
      target = { type: "face" };
    } else if (legal.creatures.length > 0) {
      // Taunt is blocking: chip the weakest one down.
      const weakest = [...legal.creatures].sort(
        (a, b) => a.currentHealth - b.currentHealth
      )[0];
      target = { type: "creature", creatureInstanceId: weakest.instanceId };
    } else {
      skipped.add(attacker.instanceId);
      continue;
    }

    const action: PlayerAction = {
      kind: "attack",
      attackerInstanceId: attacker.instanceId,
      target,
    };
    const next = step(sim, cpuPlayerId, action);
    if (!next) break;
    sim = next;
    actions.push(action);
    if (sim.phase === "finished") return actions;
  }

  actions.push({ kind: "end_turn" });
  return actions;
}

// ---- Hard -----------------------------------------------------------------

const MAX_KNAPSACK_HAND = 12; // beyond this, fall back to the greedy pick

/**
 * The subset of the hand that spends the most coins (ties broken by total
 * stats), respecting the free board slots. Wasting a coin is the single most
 * common greedy mistake — "biggest first" happily leaves 1 coin unspent with a
 * 1-cost card still in hand.
 */
function bestSpend(player: PlayerState): string[] {
  const slots = BOARD_LIMIT - player.board.length;
  if (slots <= 0) return [];

  const hand = player.hand.slice(0, MAX_KNAPSACK_HAND);
  let best: { ids: string[]; spent: number; stats: number } = {
    ids: [],
    spent: -1,
    stats: -1,
  };

  const walk = (index: number, ids: string[], spent: number, stats: number) => {
    if (spent > player.coinsCurrent) return;
    if (
      spent > best.spent ||
      (spent === best.spent && stats > best.stats)
    ) {
      best = { ids: [...ids], spent, stats };
    }
    if (index >= hand.length || ids.length >= slots) return;
    for (let i = index; i < hand.length; i++) {
      const card = CARD_CATALOG[hand[i].cardId];
      ids.push(hand[i].instanceId);
      walk(i + 1, ids, spent + card.cost, stats + card.attack + card.health);
      ids.pop();
    }
  };
  walk(0, [], 0, 0);

  // Play the expensive ones first: if the board fills up early, the cheap
  // leftovers are the ones we can most afford to lose.
  const costOf = (instanceId: string) =>
    CARD_CATALOG[player.hand.find((c) => c.instanceId === instanceId)!.cardId].cost;
  return best.ids.sort((a, b) => costOf(b) - costOf(a));
}

/** Total face damage available right now (ignoring creatures that are walled off). */
function faceDamageAvailable(state: GameState, playerId: string): number {
  const opponentBoard = foe(state, playerId).board;
  return readyAttackers(self(state, playerId))
    .filter((c) => legalAttackTargets(c, opponentBoard).face)
    .reduce((sum, c) => sum + c.currentAttack, 0);
}

function hardTurn(state: GameState, cpuPlayerId: string): PlayerAction[] {
  const actions: PlayerAction[] = [];
  let sim = state;

  for (const instanceId of bestSpend(self(sim, cpuPlayerId))) {
    const next = step(sim, cpuPlayerId, {
      kind: "play_card",
      handInstanceId: instanceId,
    });
    if (!next) continue;
    sim = next;
    actions.push({ kind: "play_card", handInstanceId: instanceId });
  }

  actions.push(...hardAttackPhase(sim, cpuPlayerId).actions);
  if (actions[actions.length - 1]?.kind !== "end_turn") {
    actions.push({ kind: "end_turn" });
  }
  return actions;
}

/** The attack half of the Hard AI, reused as the opponent model in hardcore. */
function hardAttackPhase(
  state: GameState,
  playerId: string
): { actions: PlayerAction[]; state: GameState } {
  const actions: PlayerAction[] = [];
  let sim = state;

  // Lethal: if everything that can reach the face adds up to the opponent's
  // remaining HP, stop thinking about trades and just swing.
  if (faceDamageAvailable(sim, playerId) >= foe(sim, playerId).hp) {
    for (const attacker of readyAttackers(self(sim, playerId))) {
      if (!legalAttackTargets(attacker, foe(sim, playerId).board).face) continue;
      const action: PlayerAction = {
        kind: "attack",
        attackerInstanceId: attacker.instanceId,
        target: { type: "face" },
      };
      const next = step(sim, playerId, action);
      if (!next) continue;
      sim = next;
      actions.push(action);
      if (sim.phase === "finished") return { actions, state: sim };
    }
  }

  const skipped = new Set<string>();
  for (;;) {
    const attackers = readyAttackers(self(sim, playerId)).filter(
      (c) => !skipped.has(c.instanceId)
    );
    if (attackers.length === 0) break;

    const opponent = foe(sim, playerId);
    // Push harder for the face once the opponent is in burst range.
    const faceWeight = opponent.hp <= 12 ? 1.6 : 1.0;

    let best: { action: PlayerAction; score: number; tiebreak: number } | null = null;
    const consider = (action: PlayerAction, score: number, tiebreak: number) => {
      if (!best || score > best.score || (score === best.score && tiebreak > best.tiebreak)) {
        best = { action, score, tiebreak };
      }
    };

    for (const attacker of attackers) {
      const legal = legalAttackTargets(attacker, opponent.board);
      let hasOption = false;

      for (const target of legal.creatures) {
        hasOption = true;
        const killed = kills(attacker, target);
        const lost = diesToCounter(attacker, target);
        // Partial damage is worth something, but far less than a kill.
        const chip = killed ? 0 : Math.min(attacker.currentAttack, target.currentHealth) * 0.3;
        const score =
          (killed ? creatureValue(target) : chip) - (lost ? creatureValue(attacker) : 0);
        // Among attackers that get the same kill, spend the cheapest one.
        consider(
          { kind: "attack", attackerInstanceId: attacker.instanceId, target: { type: "creature", creatureInstanceId: target.instanceId } },
          score,
          -creatureValue(attacker)
        );
      }

      if (legal.face) {
        hasOption = true;
        consider(
          { kind: "attack", attackerInstanceId: attacker.instanceId, target: { type: "face" } },
          attacker.currentAttack * faceWeight,
          -creatureValue(attacker)
        );
      }

      if (!hasOption) skipped.add(attacker.instanceId);
    }

    if (!best) break;
    const chosen: { action: PlayerAction; score: number } = best;
    const next = step(sim, playerId, chosen.action);
    if (!next) break;
    sim = next;
    actions.push(chosen.action);
    if (sim.phase === "finished") return { actions, state: sim };
  }

  return { actions, state: sim };
}

// ---- Hardcore -------------------------------------------------------------

const SEARCH_NODE_BUDGET = 8000;
const WIN_SCORE = 1e6;

/**
 * Scores a position from `playerId`'s side: HP lead, board lead, cards in hand.
 * Coins left unspent are a small penalty — they're gone at end of turn.
 */
function evaluate(state: GameState, playerId: string): number {
  const me = self(state, playerId);
  const opp = foe(state, playerId);
  if (opp.hp <= 0) return WIN_SCORE;
  if (me.hp <= 0) return -WIN_SCORE;

  return (
    (me.hp - opp.hp) * 1.5 +
    (boardValue(me.board) - boardValue(opp.board)) * 1.0 +
    (me.hand.length - opp.hand.length) * 1.0 -
    me.coinsCurrent * 0.25
  );
}

/**
 * Depth-first search over the turn's whole action tree (every play order, every
 * attack assignment), cut off by a node budget. Each finished line is scored by
 * evaluating the board *after* the opponent's greedy reply — so hardcore avoids
 * lines that hand the opponent a big swing back.
 */
function hardcoreTurn(state: GameState, cpuPlayerId: string): PlayerAction[] {
  let budget = SEARCH_NODE_BUDGET;
  let best: { score: number; actions: PlayerAction[] } = {
    score: -Infinity,
    actions: [],
  };

  /** Score of ending the turn here: let the opponent take its best greedy turn. */
  const scoreLine = (sim: GameState, actions: PlayerAction[]): void => {
    let scored = sim;
    if (scored.phase === "playing") {
      const ended = step(scored, cpuPlayerId, { kind: "end_turn" });
      if (ended) {
        scored = ended;
        const opponentId = foe(scored, cpuPlayerId).playerId;
        if (scored.activePlayerIndex === scored.players.findIndex((p) => p.playerId === opponentId)) {
          const reply = hardAttackPhase(scored, opponentId);
          scored = reply.state;
        }
      }
    }
    const score = evaluate(scored, cpuPlayerId);
    if (score > best.score) {
      best = { score, actions: [...actions, { kind: "end_turn" }] };
    }
  };

  const search = (sim: GameState, actions: PlayerAction[]): void => {
    if (sim.phase === "finished") {
      const score = evaluate(sim, cpuPlayerId);
      if (score > best.score) best = { score, actions: [...actions] };
      return;
    }

    // Ending the turn is always an option: score the line as it stands.
    scoreLine(sim, actions);
    if (budget <= 0) return;

    const me = self(sim, cpuPlayerId);
    const opponent = foe(sim, cpuPlayerId);
    const candidates: PlayerAction[] = [];

    if (me.board.length < BOARD_LIMIT) {
      // One branch per distinct card: two copies of the same card are the
      // same move, and expanding both doubles the tree for nothing.
      const seen = new Set<string>();
      for (const card of affordable(me)) {
        if (seen.has(card.cardId)) continue;
        seen.add(card.cardId);
        candidates.push({ kind: "play_card", handInstanceId: card.instanceId });
      }
    }

    for (const attacker of readyAttackers(me)) {
      const legal = legalAttackTargets(attacker, opponent.board);
      for (const target of legal.creatures) {
        candidates.push({
          kind: "attack",
          attackerInstanceId: attacker.instanceId,
          target: { type: "creature", creatureInstanceId: target.instanceId },
        });
      }
      if (legal.face) {
        candidates.push({
          kind: "attack",
          attackerInstanceId: attacker.instanceId,
          target: { type: "face" },
        });
      }
    }

    for (const action of candidates) {
      if (budget <= 0) return;
      budget--;
      const next = step(sim, cpuPlayerId, action);
      if (!next) continue;
      search(next, [...actions, action]);
    }
  };

  search(state, []);
  return best.actions.length > 0 ? best.actions : [{ kind: "end_turn" }];
}
