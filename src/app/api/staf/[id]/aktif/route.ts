import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);
  const { id } = await params;

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const aktif = Boolean(body?.aktif);

  const sedia = await db.staf.findUnique({ where: { id } });
  if (!sedia) return ralat("Staf tidak dijumpai", 404);

  const dikemaskini = await db.staf.update({
    where: { id },
    data: { aktif },
  });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: aktif ? "AKTIFKAN" : "NYAHAKTIFKAN",
    entiti: "Staf",
    entitiId: id,
    nilaiLame: JSON.stringify({ aktif: sedia.aktif }),
    nilaiBaharu: JSON.stringify({ aktif }),
  });

  return json({ staf: { id: dikemaskini.id, aktif: dikemaskini.aktif } });
}
