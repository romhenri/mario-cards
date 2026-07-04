"use client";

import { useRouter } from "next/navigation";

/* Tile colors mirror the card colorType palette in cards.json
   (green #2e7d32, red #c62828, blue #1565c0). */
export function ModeSelect() {
  const router = useRouter();
  return (
    <div className="home-menu">
      <button
        className="menu-tile green"
        onClick={() => router.push("/play/cpu")}
      >
        <span className="menu-tile-icon"></span>
        <span className="menu-tile-label">Quick Match</span>
        <span className="menu-tile-sub">all cards chalenge</span>
      </button>
      <button
        className="menu-tile red"
        onClick={() => router.push("/play/multiplayer")}
      >
        <span className="menu-tile-icon"></span>
        <span className="menu-tile-label">Multiplayer</span>
        <span className="menu-tile-sub">online</span>
      </button>
      <button className="menu-tile blue wide" onClick={() => router.push("/deck")}>
        <span className="menu-tile-icon"></span>
        <span className="menu-tile-label">Deck Builder</span>
        <span className="menu-tile-sub">build your 16</span>
      </button>
    </div>
  );
}
