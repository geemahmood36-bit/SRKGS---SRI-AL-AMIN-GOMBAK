import { NextRequest } from "next/server";
import { getSesiSemasa, json, ralat } from "@/lib/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  if (body?.pengesahan !== "SET SEMULA") {
    return ralat('Pengesahan diperlukan: taip "SET SEMULA"', 400);
  }

  try {
    const { stdout, stderr } = await execAsync("bun run scripts/seed.ts", {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    });
    return json({
      ok: true,
      mesej: "Data demo telah diset semula.",
      stdout: stdout.slice(-2000),
      stderr: stderr ? stderr.slice(-2000) : null,
    });
  } catch (err: any) {
    return ralat(`Gagal menetapkan semula: ${err.message ?? err}`, 500);
  }
}
