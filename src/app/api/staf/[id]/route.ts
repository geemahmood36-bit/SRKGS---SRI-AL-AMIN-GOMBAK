import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";
import { samarkanKp } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  const { id } = await params;

  const staf = await db.staf.findUnique({
    where: { id },
    include: { jabatan: true },
  });
  if (!staf) return ralat("Staf tidak dijumpai", 404);

  const tahun = new Date().getFullYear();
  const bakiCuti = await db.bakiCuti.findMany({
    where: { stafId: id, tahun },
    include: { jenisCuti: true },
  });

  const { kataLaluanHash: _kh, ...selamat } = staf as any;
  return json({ staf: { ...selamat, noKpSamar: samarkanKp(staf.noKpSamar) }, bakiCuti });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);
  const { id } = await params;

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const sedia = await db.staf.findUnique({ where: { id }, include: { jabatan: true } });
  if (!sedia) return ralat("Staf tidak dijumpai", 404);

  const medanDibenar = [
    "nama", "noKpSamar", "jantina", "jawatan", "kategori", "jabatanId",
    "emel", "telefon", "tarikhLantik", "peranan", "pin", "aktif",
  ];
  const data: any = {};
  for (const k of medanDibenar) {
    if (k in body) {
      if (k === "tarikhLantik" && body[k]) {
        const [y, m, d] = String(body[k]).split("-").map(Number);
        data[k] = y && m && d ? new Date(y, m - 1, d) : null;
      } else {
        data[k] = body[k];
      }
    }
  }

  const dikemaskini = await db.staf.update({
    where: { id },
    data,
    include: { jabatan: true },
  });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "KEMASKINI",
    entiti: "Staf",
    entitiId: id,
    nilaiLame: JSON.stringify({ ...sedia, kataLaluanHash: "[disorok]" }),
    nilaiBaharu: JSON.stringify({ ...dikemaskini, kataLaluanHash: "[disorok]" }),
  });

  const { kataLaluanHash: _kh, ...selamat } = dikemaskini as any;
  return json({ staf: { ...selamat, noKpSamar: samarkanKp(dikemaskini.noKpSamar) } });
}
