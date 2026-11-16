import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  const senarai = await db.jenisCuti.findMany({ orderBy: { nama: "asc" } });
  return json({ senarai });
}

export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const { nama, kelayakanTahunan, perluLampiran } = body ?? {};
  if (!nama) return ralat("nama diperlukan", 400);

  const id = `JC${Date.now().toString(36).toUpperCase().slice(-4)}`;
  const dicipta = await db.jenisCuti.create({
    data: {
      id,
      nama: String(nama),
      kelayakanTahunan: Number(kelayakanTahunan ?? 0),
      perluLampiran: Boolean(perluLampiran),
    },
  });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "CIPTA",
    entiti: "JenisCuti",
    entitiId: id,
    nilaiBaharu: JSON.stringify(dicipta),
  });

  return json({ jenisCuti: dicipta }, 201);
}
