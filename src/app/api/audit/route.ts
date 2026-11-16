import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tarikhLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export async function GET(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  const dibenar = ["Admin", "Pengetua"].includes(sesi.staf.peranan);
  if (!dibenar) return ralat("Akses ditolak", 403);

  const { searchParams } = new URL(request.url);
  const entiti = searchParams.get("entiti") ?? undefined;
  const penggunaId = searchParams.get("penggunaId") ?? undefined;
  const tarikhMula = searchParams.get("tarikhMula");
  const tarikhAkhir = searchParams.get("tarikhAkhir");

  const where: any = {};
  if (entiti) where.entiti = entiti;
  if (penggunaId) where.penggunaId = penggunaId;
  if (tarikhMula || tarikhAkhir) {
    where.capMasa = {};
    if (tarikhMula) where.capMasa.gte = tarikhLocal(tarikhMula);
    if (tarikhAkhir) {
      const t = tarikhLocal(tarikhAkhir);
      t.setHours(23, 59, 59, 999);
      where.capMasa.lte = t;
    }
  }

  const senarai = await db.logAudit.findMany({
    where,
    include: { pengguna: { select: { id: true, nama: true, noIdStaf: true } } },
    orderBy: { capMasa: "desc" },
    take: 200,
  });

  const hasil = senarai.map((a) => ({
    id: a.id,
    penggunaId: a.penggunaId,
    pengguna: a.pengguna ? { id: a.pengguna.id, nama: a.pengguna.nama, noIdStaf: a.pengguna.noIdStaf } : null,
    tindakan: a.tindakan,
    entiti: a.entiti,
    entitiId: a.entitiId,
    nilaiLama: a.nilaiLama,
    nilaiBaharu: a.nilaiBaharu,
    capMasa: a.capMasa,
  }));

  return json({ senarai: hasil });
}
