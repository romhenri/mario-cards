"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CardId } from "@mario-cards/shared";
import { DeckChooseModal } from "../../../components/deck/DeckChooseModal";
import { Header } from "../../../components/layout/Header";
import { getWsClient } from "../../../lib/wsClient";

/** Which action is waiting on the deck-choose modal. */
type PendingAction = { kind: "create" } | { kind: "join"; code: string };

export default function MultiplayerLobbyPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPending = async (action: PendingAction, deck: CardId[] | null) => {
    setPending(null);
    setBusy(true);
    setError(null);
    try {
      const client = getWsClient();
      await client.connect();
      const { roomId } =
        action.kind === "create"
          ? await client.createRoom(deck)
          : await client.joinRoom(action.code, deck);
      router.push(`/play/multiplayer/${roomId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : action.kind === "create"
            ? "Failed to create room"
            : "Failed to join room"
      );
      setBusy(false);
    }
  };

  const requestJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setPending({ kind: "join", code });
  };

  return (
    <main className="page">
      <Header subtitle="Multiplayer" />
      <div className="lobby">
        <section>
          <h2>Create a room</h2>
          <p className="info-message">
            You&apos;ll get a room code to share with your opponent.
          </p>
          <button onClick={() => setPending({ kind: "create" })} disabled={busy}>
            Create room
          </button>
        </section>
        <section>
          <h2>Join a room</h2>
          <input
            placeholder="Room code (e.g. AB2CD3)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") requestJoin();
            }}
            maxLength={6}
            disabled={busy}
          />
          <button onClick={requestJoin} disabled={busy || joinCode.trim().length === 0}>
            Join room
          </button>
        </section>
        <div className="status-message">{error}</div>
        <Link href="/">Back to home</Link>
      </div>
      {pending && (
        <DeckChooseModal
          onChoose={(deck) => void startPending(pending, deck)}
          onCancel={() => setPending(null)}
        />
      )}
    </main>
  );
}
