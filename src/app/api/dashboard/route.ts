import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";
import { isoTarikh, parseHariBekerja, isHariBekerja, samarkanKp } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tarikhLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

async function getCutiUmumSet(tahun: number): Promise<Set<string>> {
  const senarai = await db.kalendar.findMany({
    where: { jenis: "CutiUmum" },
  });
  return new Set(senarai.map((k) => isoTarikh(k.tarikh)));
}

export async function GET(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const tetapan = await db.tetapan.findUnique({ where: { id: 1 } });
  if (!tetapan) return ralat("Tetapan tidak dijumpai", 500);
  const hariBekerja = parseHariBekerja(tetapan.hariBekerja);

  const now = new Date();
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const isoHariIni = isoTarikh(hariIni);

  const tahun = now.getFullYear();
  const bulan = now.getMonth() + 1; // 1-12
  const cutiUmumSet = await getCutiUmumSet(tahun);
  const isCutiUmumHariIni = cutiUmumSet.has(isoHariIni);
  const isWorkingDay = isHariBekerja(hariIni, hariBekerja);

  const peranan = sesi.staf.peranan;

  if (peranan === "Admin" || peranan === "Pengetua" || peranan === "Penyelia") {
    // ─── Ringkasan hari ini ────────────────────────────────────────────────
    const whereAktif: any = { aktif: true, peranan: { not: "Kiosk" } };
    if (peranan === "Penyelia") whereAktif.jabatanId = sesi.staf.jabatanId ?? "__TIADA__";

    const senaraiStafAktif = await db.staf.findMany({
      where: whereAktif,
      include: { jabatan: true },
    });

    const senaraiKehadiranHariIni = await db.kehadiran.findMany({
      where: { tarikh: hariIni },
      include: { staf: { include: { jabatan: true } } },
    });
    const mapKehadiran = new Map(senaraiKehadiranHariIni.map((k) => [k.stafId, k]));

    // Cuti diluluskan yang meliputi hari ini
    const cutiDiluluskan = await db.permohonanCuti.findMany({
      where: { status: "Diluluskan" },
    });
    const stafCutiHariIni = new Set<string>();
    for (const c of cutiDiluluskan) {
      const mula = new Date(c.tarikhMula); mula.setHours(0, 0, 0, 0);
      const akhir = new Date(c.tarikhAkhir); akhir.setHours(0, 0, 0, 0);
      if (hariIni >= mula && hariIni <= akhir) stafCutiHariIni.add(c.stafId);
    }

    let hadir = 0, lewat = 0, cuti = 0, tugasRasmi = 0, belumHadir = 0;
    const senaraiBelumHadir: any[] = [];
    const senaraiLewat: any[] = [];

    for (const staf of senaraiStafAktif) {
      const k = mapKehadiran.get(staf.id);
      if (stafCutiHariIni.has(staf.id)) {
        // TugasRasmi atau Cuti - cari jenis cuti untuk kategori
        const cutiStaf = cutiDiluluskan.find((c) => c.stafId === staf.id);
        const jc = cutiStaf ? await db.jenisCuti.findUnique({ where: { id: cutiStaf.jenisCutiId } }) : null;
        if (jc?.id === "JC5" || jc?.nama?.toLowerCase().includes("tugas")) {
          tugasRasmi += 1;
        } else {
          cuti += 1;
        }
        continue;
      }
      if (k) {
        if (k.status === "Hadir") hadir += 1;
        else if (k.status === "Lewat") {
          lewat += 1;
          senaraiLewat.push({
            id: staf.id,
            nama: staf.nama,
            jabatan: staf.jabatan?.nama ?? "—",
            masaMasuk: k.masaMasuk,
          });
        } else if (k.status === "TugasRasmi") tugasRasmi += 1;
        else if (k.status === "Cuti") cuti += 1;
        continue;
      }
      // Tiada rekod
      if (isWorkingDay && !isCutiUmumHariIni) {
        belumHadir += 1;
        senaraiBelumHadir.push({
          id: staf.id,
          nama: staf.nama,
          jabatan: staf.jabatan?.nama ?? "—",
          noKpSamar: samarkanKp(staf.noKpSamar),
        });
      }
    }

    const totalStaf = senaraiStafAktif.length;
    const peratus = totalStaf > 0 ? Math.round(((hadir + lewat) / totalStaf) * 100) : 0;

    const cutiMenunggu = await db.permohonanCuti.count({
      where: { status: "Menunggu" },
    });

    // ─── Trend 7 hari ──────────────────────────────────────────────────────
    const trend7Hari: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const t = new Date(hariIni);
      t.setDate(t.getDate() - i);
      const isoT = isoTarikh(t);
      const rekod = await db.kehadiran.findMany({ where: { tarikh: t } });
      const h = rekod.filter((r) => r.status === "Hadir").length;
      const l = rekod.filter((r) => r.status === "Lewat").length;
      const c = rekod.filter((r) => r.status === "Cuti" || r.status === "TugasRasmi").length;
      const tidakHadir = rekod.filter((r) => r.status === "TidakHadir").length;
      trend7Hari.push({ tarikh: isoT, hadir: h, lewat: l, tidakHadir, cuti: c });
    }

    // ─── Pecahan status ────────────────────────────────────────────────────
    const pecahanStatus = [
      { status: "Hadir", bil: hadir },
      { status: "Lewat", bil: lewat },
      { status: "Cuti", bil: cuti },
      { status: "TugasRasmi", bil: tugasRasmi },
      { status: "BelumHadir", bil: belumHadir },
    ];

    return json({
      peranan,
      ringkasan: {
        totalStaf,
        hadir,
        lewat,
        belumHadir,
        cuti,
        tugasRasmi,
        peratus,
        tarikh: isoHariIni,
        isCutiUmum: isCutiUmumHariIni,
        isWorkingDay,
      },
      senaraiBelumHadir,
      senaraiLewat,
      cutiMenunggu,
      trend7Hari,
      pecahanStatus,
    });
  }

  // ─── Guru / Staf biasa ──────────────────────────────────────────────────
  const rekodHariIni = await db.kehadiran.findFirst({
    where: { stafId: sesi.stafId, tarikh: hariIni },
  });

  // Ringkasan bulan semasa
  const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1);
  const akhirBulan = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const rekodBulan = await db.kehadiran.findMany({
    where: { stafId: sesi.stafId, tarikh: { gte: awalBulan, lte: akhirBulan } },
  });
  const ringkasanBulanIni = {
    hadir: rekodBulan.filter((r) => r.status === "Hadir").length,
    lewat: rekodBulan.filter((r) => r.status === "Lewat").length,
    cuti: rekodBulan.filter((r) => r.status === "Cuti" || r.status === "TugasRasmi").length,
    tidakHadir: rekodBulan.filter((r) => r.status === "TidakHadir").length,
  };

  // Baki cuti tahun semasa
  const bakiCuti = await db.bakiCuti.findMany({
    where: { stafId: sesi.stafId, tahun },
    include: { jenisCuti: true },
  });

  const notifikasiBelumDibaca = await db.notifikasi.count({
    where: { penerimaId: sesi.stafId, dibaca: false },
  });

  // Semak jika staf boleh daftar masuk hari ini
  // Dibenarkan jika: hari bekerja, bukan cuti umum, tiada cuti diluluskan,
  // DAN (tiada rekod sedia ada ATAU rekod sedia ada berstatus TidakHadir — boleh override)
  let daftarBoleh = false;
  if (isWorkingDay && !isCutiUmumHariIni) {
    const cutiHariIni = await db.permohonanCuti.findFirst({
      where: {
        stafId: sesi.stafId,
        status: "Diluluskan",
        tarikhMula: { lte: hariIni },
        tarikhAkhir: { gte: hariIni },
      },
    });
    if (!cutiHariIni) {
      if (!rekodHariIni) daftarBoleh = true;
      else if (rekodHariIni.status === "TidakHadir" && !rekodHariIni.masaMasuk) daftarBoleh = true;
    }
  }

  return json({
    peranan,
    rekodHariIni,
    ringkasanBulanIni,
    bakiCuti,
    notifikasiBelumDibaca,
    daftarBoleh,
    tarikh: isoHariIni,
    isCutiUmum: isCutiUmumHariIni,
    isWorkingDay,
  });
}
