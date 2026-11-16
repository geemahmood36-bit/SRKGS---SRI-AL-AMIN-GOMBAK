import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";
import { hashLaluanDummy } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LALUAN_LALAI = "Demo@1234";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);
  const { id } = await params;

  const staf = await db.staf.findUnique({ where: { id } });
  if (!staf) return ralat("Staf tidak dijumpai", 404);

  await db.staf.update({
    where: { id },
    data: {
      kataLaluanHash: hashLaluanDummy(LALUAN_LALAI),
      perluTukarLaluan: true,
    },
  });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "TUKAR_LALUAN",
    entiti: "Staf",
    entitiId: id,
    nilaiBaharu: JSON.stringify({ perluTukarLaluan: true }),
  });

  return json({ ok: true, mesej: "Kata laluan telah diset semula kepada Demo@1234." });
}
