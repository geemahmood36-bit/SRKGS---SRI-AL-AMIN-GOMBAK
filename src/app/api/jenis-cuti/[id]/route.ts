import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);
  const { id } = await params;

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const sedia = await db.jenisCuti.findUnique({ where: { id } });
  if (!sedia) return ralat("Jenis cuti tidak dijumpai", 404);

  const data: any = {};
  if (typeof body?.nama === "string") data.nama = body.nama;
  if (body?.kelayakanTahunan !== undefined) data.kelayakanTahunan = Number(body.kelayakanTahunan);
  if (body?.perluLampiran !== undefined) data.perluLampiran = Boolean(body.perluLampiran);

  const dikemaskini = await db.jenisCuti.update({ where: { id }, data });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "KEMASKINI",
    entiti: "JenisCuti",
    entitiId: id,
    nilaiLame: JSON.stringify(sedia),
    nilaiBaharu: JSON.stringify(dikemaskini),
  });

  return json({ jenisCuti: dikemaskini });
}
