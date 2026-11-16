import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, ralat } from "@/lib/server";
import { kiraStatusDaftarMasuk, kiraJamBekerja, parseHariBekerja, isHariBekerja, isoTarikh } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const noIdStaf = String(body?.noIdStaf ?? "").trim();
  const pin = String(body?.pin ?? "").trim();
  const jenis = body?.jenis === "keluar" ? "keluar" : "masuk";
  const sebabLewat = typeof body?.sebabLewat === "string" ? body.sebabLewat : null;

  if (!noIdStaf || !pin) return ralat("No. ID staf dan PIN diperlukan", 400);

  const staf = await db.staf.findUnique({ where: { noIdStaf }, include: { jabatan: true } });
  if (!staf || !staf.aktif) return ralat("Staf tidak dijumpai", 404);
  if (!staf.pin || staf.pin !== pin) return ralat("PIN tidak sah", 401);

  const tetapan = await db.tetapan.findUnique({ where: { id: 1 } });
  if (!tetapan) return ralat("Tetapan tidak dijumpai", 500);

  const now = new Date();
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const isoHariIni = isoTarikh(hariIni);
  const hariBekerja = parseHariBekerja(tetapan.hariBekerja);

  const cutiUmum = await db.kalendar.findFirst({
    where: { tarikh: hariIni, jenis: "CutiUmum" },
  });
  const isWorkingDay = isHariBekerja(hariIni, hariBekerja);

  if (jenis === "masuk") {
    if (!isWorkingDay) return ralat("Hari ini bukan hari bekerja.", 400);
    if (cutiUmum) return ralat(`Hari ini cuti umum: ${cutiUmum.nama}`, 400);

    const sedia = await db.kehadiran.findUnique({
      where: { stafId_tarikh: { stafId: staf.id, tarikh: hariIni } },
    });
    if (sedia && sedia.masaMasuk) return ralat("Staf telah mendaftar masuk hari ini.", 400);

    const cutiDiluluskan = await db.permohonanCuti.findFirst({
      where: {
        stafId: staf.id,
        status: "Diluluskan",
        tarikhMula: { lte: hariIni },
        tarikhAkhir: { gte: hariIni },
      },
    });
    if (cutiDiluluskan) return ralat("Staf dalam cuti diluluskan pada hari ini.", 400);

    const waktuMasukAktif = tetapan.ramadanAktif ? tetapan.ramadanMasukWaktu : tetapan.waktuMasuk;
    const status = kiraStatusDaftarMasuk({
      masaMasuk: now,
      waktuMasuk: waktuMasukAktif,
      bertolakAnsurMinit: tetapan.bertolakAnsurMinit,
    });

    let rekod;
    if (sedia) {
      // override TidakHadir record
      rekod = await db.kehadiran.update({
        where: { id: sedia.id },
        data: {
          masaMasuk: now,
          masaKeluar: null,
          status,
          sebabLewat: status === "Lewat" ? sebabLewat : null,
          sumber: "Kiosk",
          jamBekerja: null,
        },
      });
    } else {
      rekod = await db.kehadiran.create({
        data: {
          id: `KH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          stafId: staf.id,
          tarikh: hariIni,
          masaMasuk: now,
          masaKeluar: null,
          status,
          sebabLewat: status === "Lewat" ? sebabLewat : null,
          sumber: "Kiosk",
        },
      });
    }

    return json({ rekod, nama: staf.nama, tarikh: isoHariIni, status }, 201);
  }

  // jenis keluar
  const rekod = await db.kehadiran.findUnique({
    where: { stafId_tarikh: { stafId: staf.id, tarikh: hariIni } },
  });
  if (!rekod) return ralat("Tiada rekod daftar masuk hari ini.", 400);
  if (rekod.masaKeluar) return ralat("Staf telah mendaftar keluar hari ini.", 400);

  const jamBekerja = kiraJamBekerja(rekod.masaMasuk!, now);
  const dikemaskini = await db.kehadiran.update({
    where: { id: rekod.id },
    data: { masaKeluar: now, jamBekerja },
  });

  return json({ rekod: dikemaskini, nama: staf.nama, tarikh: isoHariIni });
}
