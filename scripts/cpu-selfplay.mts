// Headless check: two AIs play each other via decideCpuTurn until someone wins.
import {
  attack,
  createGame,
  endTurn,
  playCard,
  type GameState,
  type PlayerAction,
} from "@mario-cards/shared";
import { decideCpuTurn } from "../web/lib/cpuAI";

function apply(state: GameState, playerId: string, action: PlayerAction) {
  switch (action.kind) {
    case "play_card":
      return playCard(state, playerId, action.handInstanceId);
    case "attack":
      return attack(state, playerId, action.attackerInstanceId, action.target);
    case "end_turn":
      return endTurn(state, playerId);
  }
}

for (let game = 0; game < 20; game++) {
  let state = createGame("p0", "p1", game * 7919);
  let guard = 0;
  while (state.phase === "playing" && guard++ < 1000) {
    const activeId = state.players[state.activePlayerIndex].playerId;
    for (const action of decideCpuTurn(state, activeId)) {
      const result = apply(state, activeId, action);
      if (result.error) {
        console.error(`game ${game}: AI produced invalid action`, action, result.error);
        process.exit(1);
      }
      state = result.state;
      if (state.phase === "finished") break;
    }
  }
  if (state.phase !== "finished") {
    console.error(`game ${game}: did not finish within 1000 turns`);
    process.exit(1);
  }
  console.log(
    `game ${game}: winner ${state.winnerPlayerId} on turn ${state.turnNumber}`
  );
}
console.log("CPU self-play: all 20 games finished with a winner ✅");
