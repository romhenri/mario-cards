// Headless check: two AIs play each other via decideCpuTurn until someone wins.
//
//   npx tsx scripts/cpu-selfplay.mts               # legality smoke test, all levels
//   npx tsx scripts/cpu-selfplay.mts --tournament  # win rates for every matchup
import {
  attack,
  createGame,
  endTurn,
  playCard,
  type GameState,
  type PlayerAction,
} from "@mario-cards/shared";
import { decideCpuTurn, DIFFICULTIES, type Difficulty } from "../web/lib/cpuAI";

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

/** Plays one game; p0 uses `a`, p1 uses `b`. Returns the winning player id. */
function playGame(a: Difficulty, b: Difficulty, seed: number): string {
  let state = createGame("p0", "p1", seed);
  let guard = 0;
  while (state.phase === "playing" && guard++ < 1000) {
    const activeId = state.players[state.activePlayerIndex].playerId;
    const level = activeId === "p0" ? a : b;
    for (const action of decideCpuTurn(state, activeId, level)) {
      const result = apply(state, activeId, action);
      if (result.error) {
        console.error(
          `${a} vs ${b} (seed ${seed}): ${level} AI produced an invalid action`,
          action,
          result.error
        );
        process.exit(1);
      }
      state = result.state;
      if (state.phase === "finished") break;
    }
  }
  if (state.phase !== "finished") {
    console.error(`${a} vs ${b} (seed ${seed}): did not finish within 1000 turns`);
    process.exit(1);
  }
  return state.winnerPlayerId!;
}

const GAMES = 60;

if (process.argv.includes("--tournament")) {
  // Every ordered pair, so each level gets an equal share of going first.
  for (const a of DIFFICULTIES) {
    for (const b of DIFFICULTIES) {
      if (a === b) continue;
      let wins = 0;
      const started = Date.now();
      for (let game = 0; game < GAMES; game++) {
        if (playGame(a, b, game * 7919 + 13) === "p0") wins++;
      }
      const rate = ((wins / GAMES) * 100).toFixed(0).padStart(3);
      const perGame = ((Date.now() - started) / GAMES).toFixed(0).padStart(4);
      console.log(
        `${a.padEnd(8)} vs ${b.padEnd(8)}  ${rate}% win  (${perGame} ms/game)`
      );
    }
  }
} else {
  for (const level of DIFFICULTIES) {
    for (let game = 0; game < 10; game++) {
      playGame(level, level, game * 7919);
    }
    console.log(`${level.padEnd(8)}: 10 mirror games finished with a winner ✅`);
  }
  console.log("CPU self-play: every difficulty produced only legal actions ✅");
}
