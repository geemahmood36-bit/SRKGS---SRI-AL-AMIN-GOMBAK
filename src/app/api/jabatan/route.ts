import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const senarai = await db.jabatan.findMany({
    include: { _count: { select: { staf: true } } },
    orderBy: { nama: "asc" },
  });

  const hasil = senarai.map((j) => ({
    id: j.id,
    nama: j.nama,
    kod: j.kod,
    ketuaId: j.ketuaId,
    bilStaf: j._count.staf,
  }));

  return json({ senarai: hasil });
}

export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const nama = String(body?.nama ?? "").trim();
  const kod = String(body?.kod ?? "").trim().toUpperCase();
  if (!nama || !kod) return ralat("Nama dan kod diperlukan", 400);

  const sedia = await db.jabatan.findUnique({ where: { kod } });
  if (sedia) return ralat("Kod jabatan telah wujud", 400);

  const id = `J${Date.now().toString(36).toUpperCase()}`;
  const dicipta = await db.jabatan.create({ data: { id, nama, kod } });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "CIPTA",
    entiti: "Jabatan",
    entitiId: id,
    nilaiBaharu: JSON.stringify(dicipta),
  });

  return json({ jabatan: dicipta }, 201);
}
