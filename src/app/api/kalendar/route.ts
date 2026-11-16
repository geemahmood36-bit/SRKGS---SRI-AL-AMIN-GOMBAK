import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";
import { isoTarikh } from "@/lib/domain";

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
  const now = new Date();
  const tahun = Number(searchParams.get("tahun") ?? now.getFullYear());

  const awalTahun = new Date(tahun, 0, 1);
  const akhirTahun = new Date(tahun, 11, 31, 23, 59, 59);

  const senarai = await db.kalendar.findMany({
    where: { tarikh: { gte: awalTahun, lte: akhirTahun } },
    orderBy: { tarikh: "asc" },
  });

  const hasil = senarai.map((k) => ({ ...k, tarikh: isoTarikh(k.tarikh) }));
  return json({ senarai: hasil, tahun });
}

export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const { tarikh, nama, jenis } = body ?? {};
  if (!tarikh || !nama || !jenis) return ralat("Medan wajib: tarikh, nama, jenis", 400);
  const tarikhDate = tarikhLocal(String(tarikh));

  // Pastikan tiada pendua
  const sedia = await db.kalendar.findFirst({ where: { tarikh: tarikhDate } });
  if (sedia) return ralat("Entri kalendar untuk tarikh ini telah wujud", 400);

  const dicipta = await db.kalendar.create({
    data: {
      id: `KL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tarikh: tarikhDate,
      nama: String(nama),
      jenis: String(jenis),
    },
  });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "CIPTA",
    entiti: "Kalendar",
    entitiId: dicipta.id,
    nilaiBaharu: JSON.stringify(dicipta),
  });

  return json({ kalendar: { ...dicipta, tarikh: isoTarikh(dicipta.tarikh) } }, 201);
}
