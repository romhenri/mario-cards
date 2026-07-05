"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CardId } from "@mario-cards/shared";
import { GameBoard } from "../board/GameBoard";
import { DeckChooseModal } from "../deck/DeckChooseModal";
import { Header } from "../layout/Header";
import { useCpuGame } from "../../lib/cpuGameClient";
import type { Challenge } from "../../lib/challenges";
import { markChallengeCompleted } from "../../lib/challengeStore";
import { useRecordMatchResult } from "../../lib/statsStore";

interface CpuGameScreenProps {
  /** Boss challenge: opens the deck chooser and pits the player against the
   * boss's themed deck. Omitted for Quick Match, which jumps straight into
   * random special-free decks. */
  challenge?: Challenge;
}

export function CpuGameScreen({ challenge }: CpuGameScreenProps) {
  const router = useRouter();
  const chooseDeck = challenge !== undefined;
  // undefined = still choosing; null = random deck
  const [deck, setDeck] = useState<CardId[] | null | undefined>(
    chooseDeck ? undefined : null
  );
  // Quick Match (no deck chooser) keeps special cards out of the random decks.
  const { ui, handleAction, resetGame } = useCpuGame(
    deck,
    !chooseDeck,
    challenge?.deck ?? null
  );

  // Beating a boss marks its challenge as cleared.
  const view = ui.view;
  useRecordMatchResult(view);
  useEffect(() => {
    if (
      challenge &&
      view &&
      view.phase === "finished" &&
      view.winnerPlayerId === view.you.playerId
    ) {
      markChallengeCompleted(challenge.id);
    }
  }, [challenge, view]);

  return (
    <main className="page">
      <Header small />
      {deck === undefined ? (
        <DeckChooseModal
          onChoose={setDeck}
          onCancel={() => router.push(chooseDeck ? "/play/challenge" : "/")}
        />
      ) : ui.view ? (
        <GameBoard
          view={ui.view}
          youLabel="You"
          opponentLabel={challenge ? challenge.name : "CPU"}
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
