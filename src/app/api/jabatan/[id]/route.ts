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

  const sedia = await db.jabatan.findUnique({ where: { id } });
  if (!sedia) return ralat("Jabatan tidak dijumpai", 404);

  const data: any = {};
  if (typeof body?.nama === "string") data.nama = body.nama;
  if (typeof body?.kod === "string") {
    const kod = String(body.kod).trim().toUpperCase();
    // pastikan unik
    const konflik = await db.jabatan.findFirst({ where: { kod, NOT: { id } } });
    if (konflik) return ralat("Kod jabatan telah digunakan", 400);
    data.kod = kod;
  }
  if ("ketuaId" in body) data.ketuaId = body.ketuaId ?? null;

  const dikemaskini = await db.jabatan.update({ where: { id }, data });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "KEMASKINI",
    entiti: "Jabatan",
    entitiId: id,
    nilaiLame: JSON.stringify(sedia),
    nilaiBaharu: JSON.stringify(dikemaskini),
  });

  return json({ jabatan: dikemaskini });
}
