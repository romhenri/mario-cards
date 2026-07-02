"use client";

import Link from "next/link";
import { GameBoard } from "../../../components/board/GameBoard";
import { useCpuGame } from "../../../lib/cpuGameClient";

export default function CpuGamePage() {
  const { ui, handleAction, resetGame } = useCpuGame();

  return (
    <main className="page">
      <h1 className="title small">🍄 Mario Cards — vs CPU</h1>
      {ui.view ? (
        <GameBoard
          view={ui.view}
          youLabel="You"
          opponentLabel="CPU"
          statusMessage={ui.statusMessage}
          infoMessage={ui.infoMessage}
          onAction={handleAction}
          gameOverActions={
            <div className="controls-row" style={{ justifyContent: "center" }}>
              <button className="end-turn" onClick={resetGame}>
                Play again
              </button>
              <Link href="/">Back to home</Link>
            </div>
          }
        />
      ) : (
        <p className="info-message">Setting up the game...</p>
      )}
    </main>
  );
}
