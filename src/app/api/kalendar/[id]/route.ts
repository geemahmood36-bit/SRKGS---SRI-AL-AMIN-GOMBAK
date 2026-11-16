import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);
  const { id } = await params;

  const sedia = await db.kalendar.findUnique({ where: { id } });
  if (!sedia) return ralat("Entri kalendar tidak dijumpai", 404);

  await db.kalendar.delete({ where: { id } });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "PADAM",
    entiti: "Kalendar",
    entitiId: id,
    nilaiLame: JSON.stringify(sedia),
  });

  return json({ ok: true });
}
