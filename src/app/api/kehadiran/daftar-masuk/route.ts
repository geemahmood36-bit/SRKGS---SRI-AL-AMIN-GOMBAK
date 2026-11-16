import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";
import { kiraStatusDaftarMasuk, parseHariBekerja, isHariBekerja, isoTarikh } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const tetapan = await db.tetapan.findUnique({ where: { id: 1 } });
  if (!tetapan) return ralat("Tetapan tidak dijumpai", 500);

  let body: any = {};
  try { body = await request.json(); } catch {}
  const sebabLewat = typeof body?.sebabLewat === "string" ? body.sebabLewat : null;

  const now = new Date();
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const isoHariIni = isoTarikh(hariIni);

  // Tetapan waktu masuk
  const waktuMasukAktif = tetapan.ramadanAktif ? tetapan.ramadanMasukWaktu : tetapan.waktuMasuk;
  const hariBekerja = parseHariBekerja(tetapan.hariBekerja);
  if (!isHariBekerja(hariIni, hariBekerja)) {
    return ralat("Hari ini bukan hari bekerja.", 400);
  }

  // Cuti umum
  const cutiUmum = await db.kalendar.findFirst({
    where: { tarikh: hariIni, jenis: "CutiUmum" },
  });
  if (cutiUmum) return ralat(`Hari ini cuti umum: ${cutiUmum.nama}`, 400);

  // Rekod sedia ada — jika ada rekod dengan masaMasuk (sudah daftar), tolak.
  // Jika rekod sedia ada tetapi status TidakHadir (auto-set oleh Tutup Hari), benarkan override.
  const sedia = await db.kehadiran.findUnique({
    where: { stafId_tarikh: { stafId: sesi.stafId, tarikh: hariIni } },
  });
  if (sedia && sedia.masaMasuk) {
    return ralat("Anda telah mendaftar masuk hari ini.", 400);
  }

  // Cuti diluluskan
  const cutiDiluluskan = await db.permohonanCuti.findFirst({
    where: {
      stafId: sesi.stafId,
      status: "Diluluskan",
      tarikhMula: { lte: hariIni },
      tarikhAkhir: { gte: hariIni },
    },
  });
  if (cutiDiluluskan) return ralat("Anda dalam cuti diluluskan pada hari ini.", 400);

  const masaMasuk = now;
  const status = kiraStatusDaftarMasuk({
    masaMasuk,
    waktuMasuk: waktuMasukAktif,
    bertolakAnsurMinit: tetapan.bertolakAnsurMinit,
  });

  // Jika ada rekod sedia (TidakHadir), update; jika tidak, create
  let rekod;
  if (sedia) {
    rekod = await db.kehadiran.update({
      where: { id: sedia.id },
      data: {
        masaMasuk,
        masaKeluar: null,
        status,
        sebabLewat: status === "Lewat" ? sebabLewat : null,
        sumber: "Sendiri",
        jamBekerja: null,
      },
    });
  } else {
    rekod = await db.kehadiran.create({
      data: {
        id: `KH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        stafId: sesi.stafId,
        tarikh: hariIni,
        masaMasuk,
        masaKeluar: null,
        status,
        sebabLewat: status === "Lewat" ? sebabLewat : null,
        sumber: "Sendiri",
      },
    });
  }

  return json({ rekod, tarikh: isoHariIni, status }, 201);
}
