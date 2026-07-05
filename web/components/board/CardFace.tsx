"use client";

import type { CSSProperties, ReactElement } from "react";
import type { CardDefinition } from "@mario-cards/shared";

function darken(hex: string, amount = 0.35): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * (1 - amount));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Inline style for a card/creature frame: colorType background plus a
 * darker shade of it as the border (state classes still override it). */
export function cardStyle(def: CardDefinition): CSSProperties {
  return {
    background: def.colorType,
    "--card-border": darken(def.colorType),
  } as CSSProperties;
}

/* Monochrome keyword icons drawn in currentColor (white on the dark badge):
   quick = lightning bolt, bomb = lit bomb, fly = wings, reach = bow,
   stealth = crossed-out eye, taunt = target, shield = shield. */
export const KEYWORD_ICONS: Record<string, ReactElement> = {
  quick: (
    <path d="M13 2 L4 14 h7 l-2 8 L20 9 h-8 Z" fill="currentColor" />
  ),
  bomb: (
    <g fill="currentColor">
      <circle cx="10" cy="14.5" r="7" />
      <path
        d="M13.5 8.5 L17 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M19 1.5 l1 2.1 2.1 1 -2.1 1 -1 2.1 -1-2.1 -2.1-1 2.1-1 Z" />
    </g>
  ),
  fly: (
    <g fill="currentColor" transform="translate(0 2)">
      <g>
        <path d="M12 15 C13 8.5 16.5 4 22.5 3.5 C18.5 6 15.5 9.5 14 13 Z" />
        <path d="M12 15 C14 10.5 18 7.5 23 8 C19.5 9.8 16.5 12 14.8 14.5 Z" />
        <path d="M12 15 C14.5 12.5 17.5 11.5 21.5 13 C18.5 13.8 16 14.8 14 16.5 Z" />
      </g>
      <g transform="scale(-1,1) translate(-24,0)">
        <path d="M12 15 C13 8.5 16.5 4 22.5 3.5 C18.5 6 15.5 9.5 14 13 Z" />
        <path d="M12 15 C14 10.5 18 7.5 23 8 C19.5 9.8 16.5 12 14.8 14.5 Z" />
        <path d="M12 15 C14.5 12.5 17.5 11.5 21.5 13 C18.5 13.8 16 14.8 14 16.5 Z" />
      </g>
    </g>
  ),
  reach: (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8 Q15 9 16 20" />
      <path d="M4 8 L16 20" />
      <path d="M10 14 L21 3" />
      <path d="M15 3 h6 v6" />
    </g>
  ),
  stealth: (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M2 12 C5 6 8.5 4.5 12 4.5 S19 6 22 12 C19 18 15.5 19.5 12 19.5 S5 18 2 12 Z" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
      <path d="M4 21 L20 3" />
    </g>
  ),
  taunt: (
    <g fill="none" stroke="currentColor" strokeWidth="2.4">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </g>
  ),
  shield: (
    <path
      d="M12 2 L20 5 V11 C20 16.5 16.6 20.7 12 22 C7.4 20.7 4 16.5 4 11 V5 Z"
      fill="currentColor"
    />
  ),
};

export const KEYWORDS = [
  ["quick", "Quick"],
  ["bomb", "Bomb"],
  ["fly", "Fly"],
  ["reach", "Reach"],
  ["stealth", "Stealth"],
  ["taunt", "Taunt"],
  ["shield", "Shield"],
] as const;

interface CardFaceProps {
  def: CardDefinition;
  /** Current values (board creatures may differ from the printed ones) */
  attack: number;
  health: number;
  showCost?: boolean;
  /** Board creatures: once the shield breaks on the first hit, its icon is
      hidden. Hand cards and the deck builder always show the printed icon. */
  shieldActive?: boolean;
}

/** Inner layout shared by hand cards, board creatures and the deck builder. */
export function CardFace({
  def,
  attack,
  health,
  showCost = false,
  shieldActive = true,
}: CardFaceProps) {
  const active = KEYWORDS.filter(
    ([key]) => def[key] && (key !== "shield" || shieldActive),
  );
  return (
    <>
      {showCost && <span className="cost-badge">{def.cost}</span>}
      <div className={showCost ? "name with-cost" : "name"}>{def.name}</div>
      {/* White circle backdrop sits behind the art (see .card-art-box) */}
      <div className="card-art-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="card-art" src={def.image} alt={def.name} draggable={false} />
      </div>
      <div className="stats">
        <span className="stat attack">{attack}</span>
        <span className={`stat health ${health < def.health ? "hurt" : ""}`}>
          {health}
        </span>
      </div>
      {/* Always rendered so cards with and without keywords line up */}
      <div className="keywords">
        {active.map(([key, label]) => (
          <span key={key} className={`keyword ${key}`} title={label}>
            <svg viewBox="0 0 24 24" aria-label={label} role="img">
              {KEYWORD_ICONS[key]}
            </svg>
          </span>
        ))}
      </div>
    </>
  );
}
