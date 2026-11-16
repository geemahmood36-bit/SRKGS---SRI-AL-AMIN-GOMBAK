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

  const { searchParams } = new URL(request.url);
  const stafId = searchParams.get("stafId");
  const tarikhMula = searchParams.get("tarikhMula");
  const tarikhAkhir = searchParams.get("tarikhAkhir");
  const jabatanId = searchParams.get("jabatanId");
  const status = searchParams.get("status");

  // Jika tiada stafId, perlu Admin/Pengetua/Penyelia
  if (!stafId) {
    const dibenar = ["Admin", "Pengetua", "Penyelia"].includes(sesi.staf.peranan);
    if (!dibenar) return ralat("Akses ditolak", 403);
  }

  const where: any = {};
  if (stafId) where.stafId = stafId;
  if (status) where.status = status;

  if (tarikhMula || tarikhAkhir) {
    where.tarikh = {};
    if (tarikhMula) where.tarikh.gte = tarikhLocal(tarikhMula);
    if (tarikhAkhir) where.tarikh.lte = tarikhLocal(tarikhAkhir);
  }

  // Penapis jabatan (untuk Penyelia, hanya jabatan sendiri)
  if (sesi.staf.peranan === "Penyelia") {
    // gabung dengan staf jabatan sendiri
    const stafIds = await db.staf.findMany({
      where: { jabatanId: sesi.staf.jabatanId ?? "__TIADA__" },
      select: { id: true },
    });
    where.stafId = { in: stafIds.map((s) => s.id) };
  } else if (jabatanId) {
    const stafIds = await db.staf.findMany({
      where: { jabatanId },
      select: { id: true },
    });
    where.stafId = { in: stafIds.map((s) => s.id) };
  }

  const senarai = await db.kehadiran.findMany({
    where,
    include: { staf: { include: { jabatan: true } } },
    orderBy: { tarikh: "desc" },
  });

  const hasil = senarai.map((k) => {
    const { kataLaluanHash: _kh, ...stafSelamat } = k.staf as any;
    return { ...k, staf: stafSelamat };
  });

  return json({ senarai: hasil });
}
