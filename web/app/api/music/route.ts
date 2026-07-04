import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

// Reads the folder on every request so tracks dropped into public/music
// show up without a rebuild.
export const dynamic = "force-dynamic";

const AUDIO_EXTENSIONS = /\.(mp3|ogg|wav|m4a)$/i;

export async function GET() {
  const dir = path.join(process.cwd(), "public", "music");
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => AUDIO_EXTENSIONS.test(f));
  } catch {
    // Missing folder: return an empty playlist.
  }
  return NextResponse.json(files.map((f) => `/music/${encodeURIComponent(f)}`));
}
