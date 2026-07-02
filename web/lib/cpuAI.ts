import {
  attack,
  BOARD_LIMIT,
  CARD_CATALOG,
  playCard,
  type AttackTarget,
  type GameState,
  type PlayerAction,
} from "@mario-cards/shared";

/**
 * Greedy single-pass AI (no lookahead), decided once at the start of the
 * CPU's turn: play the most expensive affordable cards, then attack —
 * favorable trades first, otherwise go face. Ends with end_turn.
 */
export function decideCpuTurn(
  state: GameState,
  cpuPlayerId: string
): PlayerAction[] {
  const actions: PlayerAction[] = [];
  let sim = state;

  const me = () => sim.players.find((p) => p.playerId === cpuPlayerId)!;
  const opp = () => sim.players.find((p) => p.playerId !== cpuPlayerId)!;

  // 1. Play cards: always the highest-cost card that fits the remaining mana.
  while (me().board.length < BOARD_LIMIT) {
    const playable = me()
      .hand.filter((c) => CARD_CATALOG[c.cardId].cost <= me().manaCurrent)
      // Stable sort: ties keep hand order.
      .sort((a, b) => CARD_CATALOG[b.cardId].cost - CARD_CATALOG[a.cardId].cost);
    if (playable.length === 0) break;

    const pick = playable[0];
    const result = playCard(sim, cpuPlayerId, pick.instanceId);
    if (result.error) break;
    sim = result.state;
    actions.push({ kind: "play_card", handInstanceId: pick.instanceId });
  }

  // 2. Attack with every eligible creature, in board order.
  for (;;) {
    const attacker = me().board.find(
      (c) =>
        !c.hasSummoningSickness && !c.hasAttackedThisTurn && c.currentAttack > 0
    );
    if (!attacker) break;

    // Favorable trade: we kill it and survive the counter-attack.
    const trades = opp()
      .board.filter(
        (t) =>
          attacker.currentAttack >= t.currentHealth &&
          attacker.currentHealth > t.currentAttack
      )
      .sort((a, b) => a.currentHealth - b.currentHealth);

    const target: AttackTarget =
      trades.length > 0
        ? { type: "creature", creatureInstanceId: trades[0].instanceId }
        : { type: "face" };

    const result = attack(sim, cpuPlayerId, attacker.instanceId, target);
    if (result.error) break;
    sim = result.state;
    actions.push({
      kind: "attack",
      attackerInstanceId: attacker.instanceId,
      target,
    });

    // Lethal reached: the game is over, no end_turn needed.
    if (sim.phase === "finished") return actions;
  }

  actions.push({ kind: "end_turn" });
  return actions;
}
