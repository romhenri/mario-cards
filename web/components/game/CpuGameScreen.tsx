"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CardId } from "@mario-cards/shared";
import { GameBoard } from "../board/GameBoard";
import { DeckChooseModal } from "../deck/DeckChooseModal";
import { Header } from "../layout/Header";
import { useCpuGame } from "../../lib/cpuGameClient";

interface CpuGameScreenProps {
  /** Play mode opens the deck chooser; Quick Match skips straight into a
   * random all-cards deck. */
  chooseDeck: boolean;
}

export function CpuGameScreen({ chooseDeck }: CpuGameScreenProps) {
  const router = useRouter();
  // undefined = still choosing; null = random deck
  const [deck, setDeck] = useState<CardId[] | null | undefined>(
    chooseDeck ? undefined : null
  );
  const { ui, handleAction, resetGame } = useCpuGame(deck);

  return (
    <main className="page">
      <Header small />
      {deck === undefined ? (
        <DeckChooseModal onChoose={setDeck} onCancel={() => router.push("/")} />
      ) : ui.view ? (
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
