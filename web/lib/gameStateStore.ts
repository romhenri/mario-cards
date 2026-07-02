import type { ClientGameState } from "@mario-cards/shared";

export interface GameUiState {
  view: ClientGameState | null;
  /** Error/rejection feedback shown to the user */
  statusMessage: string | null;
  /** Neutral info line, e.g. "CPU is thinking..." */
  infoMessage: string | null;
}

export type GameUiAction =
  | { type: "set_view"; view: ClientGameState }
  | { type: "set_status"; message: string | null }
  | { type: "set_info"; message: string | null }
  | { type: "reset" };

export const initialGameUiState: GameUiState = {
  view: null,
  statusMessage: null,
  infoMessage: null,
};

export function gameUiReducer(
  state: GameUiState,
  action: GameUiAction
): GameUiState {
  switch (action.type) {
    case "set_view":
      // A new accepted state clears stale error feedback.
      return { ...state, view: action.view, statusMessage: null };
    case "set_status":
      return { ...state, statusMessage: action.message };
    case "set_info":
      return { ...state, infoMessage: action.message };
    case "reset":
      return initialGameUiState;
  }
}
