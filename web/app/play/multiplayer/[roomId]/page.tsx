"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";
import type { ClientGameState } from "@mario-cards/shared";
import { GameBoard } from "../../../../components/board/GameBoard";
import { Header } from "../../../../components/layout/Header";
import {
  gameUiReducer,
  initialGameUiState,
} from "../../../../lib/gameStateStore";
import { playTransitionSounds } from "../../../../lib/sounds";
import { getWsClient, type ServerMessage } from "../../../../lib/wsClient";

export default function MultiplayerRoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = String(params.roomId ?? "").toUpperCase();
  const router = useRouter();
  const [ui, dispatch] = useReducer(gameUiReducer, initialGameUiState);
  const joinAttemptedRef = useRef(false);
  const lastViewRef = useRef<ClientGameState | null>(null);

  useEffect(() => {
    const client = getWsClient();

    const unsubscribe = client.subscribe((msg: ServerMessage) => {
      switch (msg.type) {
        case "game_start":
        case "state_update":
          playTransitionSounds(lastViewRef.current, msg.payload.state);
          lastViewRef.current = msg.payload.state;
          dispatch({ type: "set_view", view: msg.payload.state });
          break;
        case "action_rejected":
          dispatch({ type: "set_status", message: msg.payload.reason });
          break;
        case "opponent_disconnected":
          dispatch({ type: "set_info", message: "Opponent disconnected" });
          dispatch({
            type: "set_status",
            message: "Your opponent left the game.",
          });
          break;
        case "error":
          dispatch({ type: "set_status", message: msg.payload.message });
          break;
      }
    });

    if (client.roomId === roomId) {
      // Came from the lobby: the socket is live; render any buffered state
      // (game_start can arrive before this page mounts). No sound: it isn't
      // a transition, just a late render.
      if (client.lastView) {
        lastViewRef.current = client.lastView;
        dispatch({ type: "set_view", view: client.lastView });
      }
    } else if (!joinAttemptedRef.current) {
      // Opened the room URL directly: connect and join now.
      joinAttemptedRef.current = true;
      client
        .connect()
        .then(() => client.joinRoom(roomId))
        .catch((err: unknown) => {
          dispatch({
            type: "set_status",
            message: err instanceof Error ? err.message : "Failed to join room",
          });
        });
    }

    return unsubscribe;
  }, [roomId]);

  const leaveToLobby = () => {
    getWsClient().leaveRoom();
    router.push("/play/multiplayer");
  };

  return (
    <main className="page">
      <Header small subtitle="Multiplayer" backHref="/play/multiplayer" />
      {ui.view ? (
        <GameBoard
          view={ui.view}
          youLabel="You"
          opponentLabel="Opponent"
          statusMessage={ui.statusMessage}
          infoMessage={ui.infoMessage}
          onAction={(action) => {
            try {
              getWsClient().sendAction(action);
            } catch (err) {
              dispatch({
                type: "set_status",
                message: err instanceof Error ? err.message : "Send failed",
              });
            }
          }}
          gameOverActions={
            <div className="controls-row" style={{ justifyContent: "center" }}>
              <button className="end-turn" onClick={leaveToLobby}>
                Back to lobby
              </button>
              <Link href="/">Back to home</Link>
            </div>
          }
        />
      ) : (
        <div className="lobby">
          <section>
            <h2>Waiting for an opponent...</h2>
            <p className="info-message">Share this room code:</p>
            <div className="room-code">{roomId}</div>
            <div className="status-message">{ui.statusMessage}</div>
            <button onClick={leaveToLobby}>Leave room</button>
          </section>
        </div>
      )}
    </main>
  );
}
