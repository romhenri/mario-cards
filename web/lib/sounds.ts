"use client";

import type { ClientGameState } from "@mario-cards/shared";

type SoundName = "attack" | "death" | "spawn";

const SOUND_VOLUME: Record<SoundName, number> = {
  attack: 0.4,
  death: 0.4,
  spawn: 0.4,
};

function play(name: SoundName): void {
  if (typeof window === "undefined" || isMuted()) return;
  const audio = new Audio(`/sounds/_${name}.ogg`);
  audio.volume = SOUND_VOLUME[name];
  // Browsers block audio before the first user interaction — just skip.
  void audio.play().catch(() => {});
}

// --- Global mute (music + SFX), persisted across visits ---

const MUTE_STORAGE_KEY = "mario-cards-muted";

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  if (musicState.__soundMuted === undefined) {
    try {
      musicState.__soundMuted = localStorage.getItem(MUTE_STORAGE_KEY) === "1";
    } catch {
      musicState.__soundMuted = false;
    }
  }
  return musicState.__soundMuted;
}

export function setMuted(muted: boolean): void {
  musicState.__soundMuted = muted;
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // Private mode etc.: the preference just won't persist.
  }
  const music = musicState.__battleMusic;
  if (music) music.muted = muted;
}

// --- Battle background music: a random /public/music track per match, at 15% ---

// The audio element and "should be playing" flag live on globalThis so a
// dev hot-reload can't orphan a playing instance out of stop()'s reach.
const musicState = globalThis as typeof globalThis & {
  __battleMusic?: HTMLAudioElement;
  __battleMusicWanted?: boolean;
  __musicTracks?: Promise<string[]>;
  __soundMuted?: boolean;
};

/** Playlist served by /api/music (every audio file in public/music). */
function getMusicTracks(): Promise<string[]> {
  if (!musicState.__musicTracks) {
    musicState.__musicTracks = fetch("/api/music")
      .then((res) => (res.ok ? (res.json() as Promise<string[]>) : []))
      .catch(() => []);
  }
  return musicState.__musicTracks;
}

export function startBattleMusic(): void {
  if (typeof window === "undefined") return;
  musicState.__battleMusicWanted = true;
  // Already playing (e.g. a re-render mid-match): keep the current track.
  if (musicState.__battleMusic && !musicState.__battleMusic.paused) return;

  void getMusicTracks().then((tracks) => {
    if (!musicState.__battleMusicWanted || tracks.length === 0) return;
    const music = musicState.__battleMusic ?? new Audio();
    if (!music.paused) return; // a concurrent start() won the race
    music.src = tracks[Math.floor(Math.random() * tracks.length)];
    music.loop = true;
    music.volume = 0.15;
    music.muted = isMuted();
    musicState.__battleMusic = music;
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
  if (typeof window === "undefined" || isMuted()) return;
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
