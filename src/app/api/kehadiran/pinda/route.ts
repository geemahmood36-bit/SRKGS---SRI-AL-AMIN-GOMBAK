import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit, hantarNotifikasi } from "@/lib/server";
import { kiraStatusDaftarMasuk, kiraJamBekerja, isoTarikh } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tarikhLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function masaToDate(tarikh: Date, masa: string): Date | null {
  if (!masa) return null;
  const [h, m] = masa.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return new Date(tarikh.getFullYear(), tarikh.getMonth(), tarikh.getDate(), h, m, 0, 0);
}

export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const { stafId, tarikh, masaMasuk, masaKeluar, status, sebabLewat, catatan, alasan } = body ?? {};
  if (!stafId || !tarikh || !status || !alasan) {
    return ralat("Medan wajib: stafId, tarikh, status, alasan", 400);
  }

  const tarikhDate = tarikhLocal(String(tarikh));
  const staf = await db.staf.findUnique({ where: { id: stafId } });
  if (!staf) return ralat("Staf tidak dijumpai", 404);

  const sedia = await db.kehadiran.findUnique({
    where: { stafId_tarikh: { stafId, tarikh: tarikhDate } },
  });

  const nilaiLame = sedia ? JSON.stringify(sedia) : null;

  const masaMasukDate = masaMasuk ? masaToDate(tarikhDate, String(masaMasuk)) : (sedia?.masaMasuk ?? null);
  const masaKeluarDate = masaKeluar ? masaToDate(tarikhDate, String(masaKeluar)) : (sedia?.masaKeluar ?? null);
  let jamBekerja = sedia?.jamBekerja ?? null;
  if (masaMasukDate && masaKeluarDate) {
    jamBekerja = kiraJamBekerja(masaMasukDate, masaKeluarDate);
  }

  // Status akhir - jika diberi "Hadir/Lewat" dan ada masaMasuk, kira semula jika tidak sepadan
  let statusAkhir = String(status);
  if (masaMasukDate && (statusAkhir === "Hadir" || statusAkhir === "Lewat")) {
    const tetapan = await db.tetapan.findUnique({ where: { id: 1 } });
    if (tetapan) {
      const waktuMasukAktif = tetapan.ramadanAktif ? tetapan.ramadanMasukWaktu : tetapan.waktuMasuk;
      statusAkhir = kiraStatusDaftarMasuk({
        masaMasuk: masaMasukDate,
        waktuMasuk: waktuMasukAktif,
        bertolakAnsurMinit: tetapan.bertolakAnsurMinit,
      });
    }
  }

  const data: any = {
    masaMasuk: masaMasukDate,
    masaKeluar: masaKeluarDate,
    status: statusAkhir,
    sebabLewat: sebabLewat ?? null,
    catatan: catatan ?? null,
    jamBekerja,
    dikemaskiniOleh: sesi.stafId,
  };

  let rekod;
  if (sedia) {
    rekod = await db.kehadiran.update({ where: { id: sedia.id }, data });
  } else {
    rekod = await db.kehadiran.create({
      data: {
        id: `KH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        stafId,
        tarikh: tarikhDate,
        sumber: "Admin",
        ...data,
      },
    });
  }

  const nilaiBaharu = JSON.stringify(rekod);

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "PINDA_KEHADIRAN",
    entiti: "Kehadiran",
    entitiId: rekod.id,
    nilaiLame,
    nilaiBaharu,
  });

  await hantarNotifikasi(
    stafId,
    "Rekod Kehadiran Dikemaskini",
    `Rekod kehadiran anda pada ${isoTarikh(tarikhDate)} telah dikemaskini oleh pentadbir. Sebab: ${alasan}`,
  );

  return json({ rekod });
}
