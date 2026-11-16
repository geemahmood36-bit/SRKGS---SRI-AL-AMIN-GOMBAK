import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";
import { kiraJamBekerja, isHariBekerja, parseHariBekerja, isoTarikh } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const tetapan = await db.tetapan.findUnique({ where: { id: 1 } });
  if (!tetapan) return ralat("Tetapan tidak dijumpai", 500);

  const now = new Date();
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const isoHariIni = isoTarikh(hariIni);

  const rekod = await db.kehadiran.findUnique({
    where: { stafId_tarikh: { stafId: sesi.stafId, tarikh: hariIni } },
  });
  if (!rekod) return ralat("Tiada rekod daftar masuk hari ini.", 400);
  if (rekod.masaKeluar) return ralat("Anda telah mendaftar keluar hari ini.", 400);

  const masaKeluar = now;
  const jamBekerja = kiraJamBekerja(rekod.masaMasuk!, masaKeluar);

  // Waktu tamat berdasarkan hari
  const hariBekerja = parseHariBekerja(tetapan.hariBekerja);
  const jsDay = hariIni.getDay();
  const isJumaat = jsDay === 5;
  const waktuTamat = tetapan.ramadanAktif
    ? tetapan.ramadanTamatWaktu
    : isJumaat
      ? tetapan.waktuTamatJumaat
      : tetapan.waktuTamat;

  let amaran: string | null = null;
  const [th, tm] = waktuTamat.split(":").map(Number);
  const minitTamat = th * 60 + tm;
  const minitKeluar = masaKeluar.getHours() * 60 + masaKeluar.getMinutes();
  if (minitKeluar < minitTamat) {
    amaran = `Anda mendaftar keluar sebelum waktu tamat (${waktuTamat}).`;
  }

  const dikemaskini = await db.kehadiran.update({
    where: { id: rekod.id },
    data: { masaKeluar, jamBekerja },
  });

  return json({ rekod: dikemaskini, tarikh: isoHariIni, amaran });
}
