"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteTitle } from "../../../components/layout/SiteTitle";
import { loadDeck } from "../../../lib/deckStore";
import { getWsClient } from "../../../lib/wsClient";

export default function MultiplayerLobbyPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    setBusy(true);
    setError(null);
    try {
      const client = getWsClient();
      await client.connect();
      const { roomId } = await client.createRoom(loadDeck());
      router.push(`/play/multiplayer/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
      setBusy(false);
    }
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      const client = getWsClient();
      await client.connect();
      const { roomId } = await client.joinRoom(code, loadDeck());
      router.push(`/play/multiplayer/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <SiteTitle subtitle="Multiplayer" />
      <div className="lobby">
        <section>
          <h2>Create a room</h2>
          <p className="info-message">
            You&apos;ll get a room code to share with your opponent.
          </p>
          <button onClick={createRoom} disabled={busy}>
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
              if (e.key === "Enter") void joinRoom();
            }}
            maxLength={6}
            disabled={busy}
          />
          <button onClick={joinRoom} disabled={busy || joinCode.trim().length === 0}>
            Join room
          </button>
        </section>
        <div className="status-message">{error}</div>
        <Link href="/">Back to home</Link>
      </div>
    </main>
  );
}
