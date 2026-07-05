"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  attack,
  buildRandomDeck,
  createGame,
  endTurn,
  playCard,
  toClientState,
  type CardId,
  type EngineResult,
  type GameState,
  type PlayerAction,
} from "@mario-cards/shared";
import { decideCpuTurn } from "./cpuAI";
import { playTransitionSounds } from "./sounds";
import {
  gameUiReducer,
  initialGameUiState,
  type GameUiState,
} from "./gameStateStore";

const HUMAN_PLAYER_ID = "you";
const CPU_PLAYER_ID = "cpu";
const HUMAN_INDEX = 0;
const CPU_INDEX = 1;
const CPU_ACTION_DELAY_MS = 550;

function applyAction(
  state: GameState,
  playerId: string,
  action: PlayerAction
): EngineResult {
  switch (action.kind) {
    case "play_card":
      return playCard(state, playerId, action.handInstanceId);
    case "attack":
      return attack(state, playerId, action.attackerInstanceId, action.target);
    case "end_turn":
      return endTurn(state, playerId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CpuGame {
  ui: GameUiState;
  handleAction: (action: PlayerAction) => void;
  resetGame: () => void;
}

/** `deck` is the human's chosen deck (null = random). While it is still
 * `undefined` (deck-choose modal open) the game does not start.
 * `excludeSpecials` keeps Special cards (legend/boss) out of the random decks
 * (used by Quick Match). `cpuDeck` fixes the CPU's deck (challenge
 * bosses); null falls back to a random one. */
export function useCpuGame(
  deck: CardId[] | null | undefined,
  excludeSpecials = false,
  cpuDeck: CardId[] | null = null
): CpuGame {
  const [ui, dispatch] = useReducer(gameUiReducer, initialGameUiState);
  const stateRef = useRef<GameState | null>(null);
  const cpuRunningRef = useRef(false);
  const startedRef = useRef(false);

  const publish = useCallback((state: GameState) => {
    const prev = stateRef.current;
    const view = toClientState(state, HUMAN_INDEX);
    playTransitionSounds(prev ? toClientState(prev, HUMAN_INDEX) : null, view);
    stateRef.current = state;
    dispatch({ type: "set_view", view });
  }, []);

  const runCpuTurn = useCallback(async () => {
    if (cpuRunningRef.current) return;
    cpuRunningRef.current = true;
    dispatch({ type: "set_info", message: "CPU is thinking..." });
    try {
      const turnStart = stateRef.current;
      if (
        !turnStart ||
        turnStart.phase !== "playing" ||
        turnStart.activePlayerIndex !== CPU_INDEX
      ) {
        return;
      }
      const actions = decideCpuTurn(turnStart, CPU_PLAYER_ID);
      for (const action of actions) {
        await sleep(CPU_ACTION_DELAY_MS);
        const current = stateRef.current;
        // Bail out if the game ended or was replaced while we slept.
        if (
          !current ||
          current.gameId !== turnStart.gameId ||
          current.phase !== "playing"
        ) {
          break;
        }
        const result = applyAction(current, CPU_PLAYER_ID, action);
        if (result.error) break;
        publish(result.state);
      }
    } finally {
      cpuRunningRef.current = false;
      dispatch({ type: "set_info", message: null });
    }
  }, [publish]);

  const resetGame = useCallback(() => {
    // Human uses the deck chosen at match start (if any); the CPU plays
    // its challenge deck, or a random one outside challenges.
    const randomDeck = () =>
      buildRandomDeck(Math.random, { excludeSpecials });
    const state = createGame(HUMAN_PLAYER_ID, CPU_PLAYER_ID, undefined, [
      deck ?? randomDeck(),
      cpuDeck ? [...cpuDeck] : randomDeck(),
    ]);
    publish(state);
    if (state.activePlayerIndex === CPU_INDEX) void runCpuTurn();
  }, [deck, cpuDeck, excludeSpecials, publish, runCpuTurn]);

  useEffect(() => {
    if (deck === undefined) return; // still choosing a deck
    if (startedRef.current) return; // survive React StrictMode double-mount
    startedRef.current = true;
    resetGame();
  }, [deck, resetGame]);

  const handleAction = useCallback(
    (action: PlayerAction) => {
      const current = stateRef.current;
      if (!current || cpuRunningRef.current) return;
      const result = applyAction(current, HUMAN_PLAYER_ID, action);
      if (result.error) {
        dispatch({ type: "set_status", message: result.error });
        return;
      }
      publish(result.state);
      if (
        result.state.phase === "playing" &&
        result.state.activePlayerIndex === CPU_INDEX
      ) {
        void runCpuTurn();
      }
    },
    [publish, runCpuTurn]
  );

  return { ui, handleAction, resetGame };
}
