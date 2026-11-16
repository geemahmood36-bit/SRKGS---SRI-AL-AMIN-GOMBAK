import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, hantarNotifikasi, tulisAudit } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  const { id } = await params;

  const dibenar = ["Pengetua", "Penyelia", "Admin"].includes(sesi.staf.peranan);
  if (!dibenar) return ralat("Akses ditolak", 403);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }
  const keputusan = body?.keputusan === "Diluluskan" ? "Diluluskan" : body?.keputusan === "Ditolak" ? "Ditolak" : null;
  const catatan = typeof body?.catatan === "string" ? body.catatan : null;
  if (!keputusan) return ralat("keputusan mesti 'Diluluskan' atau 'Ditolak'", 400);

  const sedia = await db.kebenaranKeluar.findUnique({ where: { id } });
  if (!sedia) return ralat("Permohonan tidak dijumpai", 404);
  if (sedia.status !== "Menunggu") return ralat("Permohonan telah diputuskan", 400);

  const dikemaskini = await db.kebenaranKeluar.update({
    where: { id },
    data: {
      status: keputusan,
      diputuskanOleh: sesi.stafId,
    },
  });

  await hantarNotifikasi(
    sedia.stafId,
    `Kebenaran Keluar ${keputusan}`,
    `Permohonan kebenaran keluar anda telah ${keputusan.toLowerCase()}. ${catatan ? `Catatan: ${catatan}` : ""}`,
  );

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: `KEPUTUSAN_KEBENARAN_${keputusan.toUpperCase()}`,
    entiti: "KebenaranKeluar",
    entitiId: id,
    nilaiLame: JSON.stringify(sedia),
    nilaiBaharu: JSON.stringify(dikemaskini),
  });

  return json({ kebenaran: dikemaskini });
}
