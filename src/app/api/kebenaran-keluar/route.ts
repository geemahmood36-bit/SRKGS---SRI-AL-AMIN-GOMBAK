import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const { searchParams } = new URL(request.url);
  const stafIdParam = searchParams.get("stafId");
  const status = searchParams.get("status");

  let stafId = stafIdParam ?? sesi.stafId;
  if (stafIdParam && stafIdParam !== sesi.stafId) {
    const dibenar = ["Admin", "Pengetua", "Penyelia"].includes(sesi.staf.peranan);
    if (!dibenar) return ralat("Akses ditolak", 403);
  }

  const where: any = { stafId };
  if (status) where.status = status;

  const senarai = await db.kebenaranKeluar.findMany({
    where,
    include: { staf: { include: { jabatan: true } } },
    orderBy: { dicipta: "desc" },
  });

  const hasil = senarai.map((k) => {
    const { kataLaluanHash: _kh, ...stafSelamat } = k.staf as any;
    return { ...k, staf: stafSelamat };
  });

  return json({ senarai: hasil });
}

export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const { tarikh, masaKeluar, masaKembali, sebab } = body ?? {};
  if (!tarikh || !masaKeluar || !masaKembali || !sebab) {
    return ralat("Medan wajib: tarikh, masaKeluar, masaKembali, sebab", 400);
  }
  const [y, m, d] = String(tarikh).split("-").map(Number);
  if (!y || !m || !d) return ralat("Format tarikh tidak sah", 400);
  const tarikhDate = new Date(y, m - 1, d);

  const dicipta = await db.kebenaranKeluar.create({
    data: {
      id: `KK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      stafId: sesi.stafId,
      tarikh: tarikhDate,
      masaKeluar: String(masaKeluar),
      masaKembali: String(masaKembali),
      sebab: String(sebab),
      status: "Menunggu",
    },
    include: { staf: { include: { jabatan: true } } },
  });

  // Notifikasi kepada Pengetua/Penyelia
  const penerima = await db.staf.findMany({
    where: { peranan: { in: ["Pengetua", "Penyelia"] }, aktif: true },
  });
  for (const p of penerima) {
    await hantarNotifikasi(
      p.id,
      "Permohonan Kebenaran Keluar",
      `${sesi.staf.nama} memohon kebenaran keluar pada ${tarikh} (${masaKeluar} - ${masaKembali}).`,
    );
  }

  const { kataLaluanHash: _kh, ...stafSelamat } = dicipta.staf as any;
  return json({ kebenaran: { ...dicipta, staf: stafSelamat } }, 201);
}

import { hantarNotifikasi } from "@/lib/server";
