import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  const { id } = await params;

  const permohonan = await db.permohonanCuti.findUnique({ where: { id } });
  if (!permohonan) return ralat("Permohonan cuti tidak dijumpai", 404);
  if (permohonan.stafId !== sesi.stafId) return ralat("Anda tidak dibenarkan membatalkan permohonan orang lain", 403);
  if (permohonan.status !== "Menunggu") return ralat("Hanya permohonan menunggu boleh dibatalkan", 400);

  const dikemaskini = await db.permohonanCuti.update({
    where: { id },
    data: { status: "Dibatalkan" },
  });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "BATAL_CUTI",
    entiti: "PermohonanCuti",
    entitiId: id,
    nilaiLame: JSON.stringify(permohonan),
    nilaiBaharu: JSON.stringify(dikemaskini),
  });

  return json({ permohonan: dikemaskini });
}
