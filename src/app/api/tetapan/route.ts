import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  const tetapan = await db.tetapan.findUnique({ where: { id: 1 } });
  if (!tetapan) return ralat("Tetapan tidak dijumpai", 500);
  return json({ tetapan });
}

export async function PUT(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const sedia = await db.tetapan.findUnique({ where: { id: 1 } });
  if (!sedia) return ralat("Tetapan tidak dijumpai", 500);

  const medanDibenar = [
    "waktuMasuk", "bertolakAnsurMinit", "waktuTamat", "waktuTamatJumaat",
    "hariBekerja", "ramadanAktif", "ramadanMasukWaktu", "ramadanTamatWaktu",
    "aliranDuaPeringkat", "sekolahNama", "sekolahAlamat",
  ];
  const data: any = {};
  for (const k of medanDibenar) {
    if (k in body) data[k] = body[k];
  }
  // Ramadan tarikh
  if ("ramadanMula" in body) {
    if (body.ramadanMula) {
      const [y, m, d] = String(body.ramadanMula).split("-").map(Number);
      data.ramadanMula = y && m && d ? new Date(y, m - 1, d) : null;
    } else data.ramadanMula = null;
  }
  if ("ramadanTamat" in body) {
    if (body.ramadanTamat) {
      const [y, m, d] = String(body.ramadanTamat).split("-").map(Number);
      data.ramadanTamat = y && m && d ? new Date(y, m - 1, d) : null;
    } else data.ramadanTamat = null;
  }

  const dikemaskini = await db.tetapan.update({ where: { id: 1 }, data });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "KEMASKINI_TETAPAN",
    entiti: "Tetapan",
    entitiId: "1",
    nilaiLame: JSON.stringify(sedia),
    nilaiBaharu: JSON.stringify(dikemaskini),
  });

  return json({ tetapan: dikemaskini });
}
