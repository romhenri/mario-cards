"use client";

import { useRouter } from "next/navigation";

/* Tile colors mirror the card colorType palette in cards.json
   (green #2e7d32, red #c62828, blue #1565c0) plus coin yellow. */
export function ModeSelect() {
  const router = useRouter();
  return (
    <div className="home-menu">
      <button
        className="menu-tile green"
        onClick={() => router.push("/play/quick")}
      >
        <span className="menu-tile-icon"></span>
        <span className="menu-tile-label">Quick Match</span>
        <span className="menu-tile-sub">all cards</span>
      </button>
      <button
        className="menu-tile blue"
        onClick={() => router.push("/play/challenge")}
      >
        <span className="menu-tile-icon"></span>
        <span className="menu-tile-label">Play</span>
        <span className="menu-tile-sub">your deck</span>
      </button>
      <button
        className="menu-tile red"
        onClick={() => router.push("/play/multiplayer")}
      >
        <span className="menu-tile-icon"></span>
        <span className="menu-tile-label">Multiplayer</span>
        <span className="menu-tile-sub">online</span>
      </button>

      <nav className="home-nav">
        <button
          className="nav-pill yellow"
          onClick={() => router.push("/cards")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="nav-pill-icon"
            src="/cards-assets/Goomba.png"
            alt=""
          />
          <span className="nav-pill-label">All Cards</span>
        </button>
        <button className="nav-pill blue" onClick={() => router.push("/deck")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="nav-pill-icon"
            src="/cards-assets/KoopaTroopa.png"
            alt=""
          />
          <span className="nav-pill-label">My Decks</span>
        </button>
        <button
          className="nav-pill green"
          onClick={() => router.push("/profile")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="nav-pill-icon"
            src="/cards-assets/PiranhaPlant.png"
            alt=""
          />
          <span className="nav-pill-label">Profile</span>
        </button>
      </nav>
    </div>
  );
}
