"use client";

import type { ClientGameState } from "@mario-cards/shared";

type SoundName = "attack" | "death" | "spawn";

const SOUND_VOLUME: Record<SoundName, number> = {
  attack: 0.4,
  death: 0.4,
  spawn: 0.4,
};

function play(name: SoundName): void {
  if (typeof window === "undefined") return;
  const audio = new Audio(`/sounds/_${name}.ogg`);
  audio.volume = SOUND_VOLUME[name];
  // Browsers block audio before the first user interaction — just skip.
  void audio.play().catch(() => {});
}

// --- Battle background music (Chomp Attack, looped at 30%) ---

// The audio element and "should be playing" flag live on globalThis so a
// dev hot-reload can't orphan a playing instance out of stop()'s reach.
const musicState = globalThis as typeof globalThis & {
  __battleMusic?: HTMLAudioElement;
  __battleMusicWanted?: boolean;
};

function getBattleMusic(): HTMLAudioElement {
  if (!musicState.__battleMusic) {
    const audio = new Audio("/sounds/chomp-attack.mp3");
    audio.loop = true;
    audio.volume = 0.3;
    musicState.__battleMusic = audio;
  }
  return musicState.__battleMusic;
}

export function startBattleMusic(): void {
  if (typeof window === "undefined") return;
  const music = getBattleMusic();
  musicState.__battleMusicWanted = true;
  if (!music.paused) return;
  void music.play().catch(() => {
    // Autoplay blocked before the first interaction: resume on it.
    window.addEventListener(
      "pointerdown",
      () => {
        if (musicState.__battleMusicWanted && music.paused) {
          void music.play().catch(() => {});
        }
      },
      { once: true }
    );
  });
}

export function stopBattleMusic(): void {
  musicState.__battleMusicWanted = false;
  const music = musicState.__battleMusic;
  if (music) {
    music.pause();
    music.currentTime = 0;
  }
}

/** Game-over jingle; also silences the battle music. */
export function playGameOver(): void {
  stopBattleMusic();
  if (typeof window === "undefined") return;
  const audio = new Audio("/sounds/_gameover.wav");
  audio.volume = 0.6;
  void audio.play().catch(() => {});
}

/** All creatures in play, keyed by instanceId, with their current health. */
function boardCreatures(view: ClientGameState): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of [...view.you.board, ...view.opponent.board]) {
    map.set(c.instanceId, c.currentHealth);
  }
  return map;
}

/**
 * Diff two consecutive views of the same game and play the matching sounds:
 * a creature appeared -> spawn, hp/creature damage -> attack, a creature
 * left the board -> death (slightly delayed so it lands after the attack).
 */
export function playTransitionSounds(
  prev: ClientGameState | null,
  next: ClientGameState
): void {
  if (!prev || prev.gameId !== next.gameId) return; // game start/reset: silent

  const before = boardCreatures(prev);
  const after = boardCreatures(next);

  let summoned = false;
  for (const id of after.keys()) {
    if (!before.has(id)) summoned = true;
  }

  let died = false;
  let attacked = next.you.hp < prev.you.hp || next.opponent.hp < prev.opponent.hp;
  for (const [id, hp] of before) {
    if (!after.has(id)) died = true;
    else if ((after.get(id) ?? hp) < hp) attacked = true;
  }
  if (died) attacked = true; // in v1 creatures only leave the board via combat

  if (summoned) play("spawn");
  if (attacked) play("attack");
  if (died) setTimeout(() => play("death"), 180);
}
