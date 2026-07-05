"use client";

import {
  BOARD_LIMIT,
  COINS_CAP,
  DECK_SIZE,
  INITIAL_HAND_SIZE,
  STARTING_HP,
} from "@mario-cards/shared";
import { KEYWORDS, KEYWORD_ICONS } from "../../components/board/CardFace";
import { Header } from "../../components/layout/Header";

/** What each keyword does, in plain terms: mirrors the engine rules. */
const KEYWORD_HELP: Record<string, string> = {
  quick: "No summoning sickness: it can attack the same turn you play it.",
  bomb: "Strikes the turn it enters, then explodes and dies after its hit.",
  fly: "Evasive: only Fly or Reach creatures are able to attack it.",
  reach: "Grounded but far-hitting: it can attack Flying creatures.",
  stealth:
    "Untargetable until it attacks. It also slips past enemy Taunts and hits anything.",
  taunt:
    "A wall: enemies must attack it before they can hit your face or other creatures.",
  shield: "Absorbs the first hit completely, then the shield breaks.",
};

/** Card rarities, split into two groups. Normal cards (Common, Rare) are the
 * everyday filler; Special cards (Legend, Boss) are the powerful tier a
 * deck's type keys off of. */
const RARITIES: { name: string; group: string; color: string; text: string }[] =
  [
    {
      name: "Common",
      group: "Normal",
      color: "#5a6072",
      text: "A normal card. The everyday creatures your deck is built from.",
    },
    {
      name: "Rare",
      group: "Normal",
      color: "#5a6072",
      text: "Also a normal card. 'Rare' is just a label: it is not stronger than a Common.",
    },
    {
      name: "Legend",
      group: "Special",
      color: "#c29a06",
      text: "A Special card: a powerful hero or ally.",
    },
    {
      name: "Boss",
      group: "Special",
      color: "#d64500",
      text: "A Special card: a fearsome boss enemy.",
    },
  ];

/** The three deck badges, keyed by how many Special cards a deck holds. */
const DECK_BADGES: { name: string; src: string; text: string }[] = [
  {
    name: "Mushroom",
    src: "/icons/mushroom.png",
    text: "A standard deck with no Specials. Quick Match always deals you one of these.",
  },
  {
    name: "Star",
    src: "/icons/star.png",
    text: "A deck holding one or two Specials, the usual limit.",
  },
  {
    name: "Colored Star",
    src: "/icons/RainbowStar.png",
    text: "A special deck with no Special-card limit at all.",
  },
];

export default function HowToPlayPage() {
  return (
    <main className="page">
      <Header subtitle="How to Play" />

      <div className="guide-sections">
        <section className="guide-section">
          <h3>The Camp</h3>
          <p className="guide-lead">
            Each player starts with {STARTING_HP} HP and a personal camp: a
            deck, a hand, and a board where creatures fight.
          </p>
          <ul className="guide-list">
            <li>
              <strong>Deck</strong>: {DECK_SIZE} cards, shuffled. You draw 1
              from it at the start of every turn.
            </li>
            <li>
              <strong>Hand</strong>: you open with {INITIAL_HAND_SIZE} cards.
              Cards wait here until you can pay for them.
            </li>
            <li>
              <strong>Coins</strong>: your energy. You gain +1 max coin each
              turn (up to {COINS_CAP}) and refill to full at the start of your
              turn. Playing a card costs its coin value.
            </li>
            <li>
              <strong>Board</strong>: where creatures you play stand and battle.
              It holds up to {BOARD_LIMIT} creatures at once.
            </li>
            <li>
              <strong>Cards</strong>: each shows its coin cost (top-left),
              attack and health (bottom), and any skill icons it carries.
            </li>
          </ul>
        </section>

        <section className="guide-section">
          <h3>The Fight &amp; The Goal</h3>
          <p className="guide-lead">
            Drop your opponent from {STARTING_HP} HP to 0 and you win. You take
            turns; on yours you spend coins, then attack.
          </p>
          <ul className="guide-list">
            <li>
              <strong>Play creatures</strong> by paying their coin cost. A fresh
              creature has <em>summoning sickness</em>: it can&apos;t attack the
              turn it lands (unless it has Quick or Bomb).
            </li>
            <li>
              <strong>Attack</strong> with each creature once per turn, aiming
              at the enemy face or at an enemy creature.
            </li>
            <li>
              <strong>Trades</strong>: when you strike a creature it strikes
              back at the same time. Both deal their attack; anyone at 0 health
              dies.
            </li>
            <li>
              <strong>Face damage</strong>: hitting the enemy directly lowers
              their HP. Empty their board, then race their life total to 0.
            </li>
          </ul>
        </section>

        <section className="guide-section">
          <h3>Skills</h3>
          <p className="guide-lead">
            Keyword abilities printed on a card. They stack, and some families
            always carry the same one.
          </p>
          <div className="guide-skills">
            {KEYWORDS.map(([key, label]) => (
              <div className="guide-skill" key={key}>
                <span className={`guide-skill-icon keyword ${key}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {KEYWORD_ICONS[key]}
                  </svg>
                </span>
                <span className="guide-skill-text">
                  <strong>{label}</strong>
                  <span>{KEYWORD_HELP[key]}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="guide-section">
          <h3>Card Types</h3>
          <p className="guide-lead">
            Every card has a rarity and belongs to a creature family.
          </p>

          <p className="guide-sublabel">Rarity</p>
          <p className="guide-body">
            Rarities fall into two groups: <strong>Normal</strong> (Common,
            Rare) and <strong>Special</strong> (Legend, Boss). Deck rules key
            off how many Special cards you run.
          </p>
          <div className="guide-rarities">
            {RARITIES.map((r) => (
              <div className="guide-rarity" key={r.name}>
                <span
                  className="guide-rarity-dot"
                  style={{ background: r.color }}
                />
                <span className="guide-skill-text">
                  <strong>
                    {r.name} <em>· {r.group}</em>
                  </strong>
                  <span>{r.text}</span>
                </span>
              </div>
            ))}
          </div>

          <p className="guide-sublabel">Families</p>
          <p className="guide-body">
            Cards belong to creature families (Goombas, Koopas, Toads, Bros…)
            that share a signature skill. Build around a single theme or mix
            them freely.
          </p>
        </section>

        <section className="guide-section">
          <h3>Deck Types</h3>
          <p className="guide-lead">
            A deck is exactly {DECK_SIZE} cards, duplicates allowed: the more
            copies of a card you run, the more often you draw it. Each deck
            wears a badge for how many Special cards it holds.
          </p>
          <div className="guide-badges">
            {DECK_BADGES.map((b) => (
              <div className="guide-badge" key={b.name}>
                <span className="guide-badge-icon">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.src} alt="" draggable={false} />
                </span>
                <span className="guide-skill-text">
                  <strong>{b.name}</strong>
                  <span>{b.text}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
