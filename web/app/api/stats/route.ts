import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const run = promisify(execFile);

/** Regenerate web/public/stats.json from the card catalog by running the
 * Python analyzer, then return the fresh stats. Powers the /stats "Update"
 * button. Dev/local tool — needs python3 and the repo checked out. */
export async function POST() {
  // The Next server runs from the web/ dir; the repo root is one level up.
  const root = path.join(process.cwd(), "..");
  const script = path.join(root, "scripts", "generate_stats.py");
  try {
    await run("python3", [script], { cwd: root });
    const json = await readFile(
      path.join(root, "web", "public", "stats.json"),
      "utf-8"
    );
    return new NextResponse(json, {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
