import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";
import { parseHariBekerja, isHariBekerja, isoTarikh } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tarikhLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }
  const tarikhStr = String(body?.tarikh ?? "");
  if (!tarikhStr) return ralat("Tarikh diperlukan", 400);

  const tarikhDate = tarikhLocal(tarikhStr);

  const tetapan = await db.tetapan.findUnique({ where: { id: 1 } });
  if (!tetapan) return ralat("Tetapan tidak dijumpai", 500);
  const hariBekerja = parseHariBekerja(tetapan.hariBekerja);

  // Cuti umum pada tarikh ini
  const cutiUmum = await db.kalendar.findFirst({
    where: { tarikh: tarikhDate, jenis: "CutiUmum" },
  });

  let ditandakan = 0;
  let dilangkau = 0;

  if (!isHariBekerja(tarikhDate, hariBekerja) || cutiUmum) {
    // Hujung minggu / cuti umum - langkau sahaja
    await tulisAudit({
      penggunaId: sesi.stafId,
      tindakan: "TUTUP_HARI",
      entiti: "Kehadiran",
      entitiId: tarikhStr,
      nilaiBaharu: JSON.stringify({ tarikh: tarikhStr, dilangkau: true, sebab: cutiUmum ? "cutiUmum" : "hujungMinggu" }),
    });
    return json({ ditandakan: 0, dilangkau: 0, mesej: "Tarikh adalah hujung minggu / cuti umum." });
  }

  // Senarai staf aktif bukan Kiosk
  const senaraiStaf = await db.staf.findMany({
    where: { aktif: true, peranan: { not: "Kiosk" } },
  });

  // Cuti diluluskan yang meliputi tarikh ini
  const cutiDiluluskan = await db.permohonanCuti.findMany({
    where: { status: "Diluluskan", tarikhMula: { lte: tarikhDate }, tarikhAkhir: { gte: tarikhDate } },
  });
  const stafCuti = new Set(cutiDiluluskan.map((c) => c.stafId));

  for (const staf of senaraiStaf) {
    if (stafCuti.has(staf.id)) { dilangkau += 1; continue; }
    const sedia = await db.kehadiran.findUnique({
      where: { stafId_tarikh: { stafId: staf.id, tarikh: tarikhDate } },
    });
    if (sedia) { dilangkau += 1; continue; }
    await db.kehadiran.create({
      data: {
        id: `KH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${staf.id}`,
        stafId: staf.id,
        tarikh: tarikhDate,
        masaMasuk: null,
        masaKeluar: null,
        status: "TidakHadir",
        sumber: "Admin",
        catatan: "Tutup hari automatik",
      },
    });
    ditandakan += 1;
  }

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "TUTUP_HARI",
    entiti: "Kehadiran",
    entitiId: tarikhStr,
    nilaiBaharu: JSON.stringify({ tarikh: tarikhStr, ditandakan, dilangkau }),
  });

  return json({ ditandakan, dilangkau, tarikh: isoTarikh(tarikhDate) });
}
