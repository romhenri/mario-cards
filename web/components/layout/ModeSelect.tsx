"use client";

import { useRouter } from "next/navigation";

export function ModeSelect() {
  const router = useRouter();
  return (
    <div className="mode-select">
      <button className="mode-button" onClick={() => router.push("/play/cpu")}>
        Play vs CPU
      </button>
      <button
        className="mode-button"
        onClick={() => router.push("/play/multiplayer")}
      >
        Multiplayer
      </button>
      <button className="mode-button" onClick={() => router.push("/deck")}>
        Deck Builder
      </button>
    </div>
  );
}
