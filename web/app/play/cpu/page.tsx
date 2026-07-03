"use client";

import Link from "next/link";
import { GameBoard } from "../../../components/board/GameBoard";
import { SiteTitle } from "../../../components/layout/SiteTitle";
import { useCpuGame } from "../../../lib/cpuGameClient";

export default function CpuGamePage() {
  const { ui, handleAction, resetGame } = useCpuGame();

  return (
    <main className="page">
      <SiteTitle small />
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
