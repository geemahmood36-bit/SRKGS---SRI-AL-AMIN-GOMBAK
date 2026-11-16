import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";
import { isoTarikh, parseHariBekerja, isHariBekerja, samarkanKp } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  const dibenar = ["Admin", "Pengetua", "Penyelia"].includes(sesi.staf.peranan);
  if (!dibenar) return ralat("Akses ditolak", 403);

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const tahun = Number(searchParams.get("tahun") ?? now.getFullYear());
  const bulan = Number(searchParams.get("bulan") ?? now.getMonth() + 1);
  const jabatanId = searchParams.get("jabatanId") ?? undefined;

  const tetapan = await db.tetapan.findUnique({ where: { id: 1 } });
  if (!tetapan) return ralat("Tetapan tidak dijumpai", 500);
  const hariBekerja = parseHariBekerja(tetapan.hariBekerja);

  const bilHariDalamBulan = new Date(tahun, bulan, 0).getDate();

  // Senarai tarikh (ISO)
  const tarikhList: string[] = [];
  const tarikhDateList: Date[] = [];
  for (let d = 1; d <= bilHariDalamBulan; d++) {
    const td = new Date(tahun, bulan - 1, d, 0, 0, 0, 0);
    tarikhList.push(isoTarikh(td));
    tarikhDateList.push(td);
  }

  // Cuti umum dalam bulan
  const awalBulan = new Date(tahun, bulan - 1, 1);
  const akhirBulan = new Date(tahun, bulan, 0, 23, 59, 59);
  const cutiUmumList = await db.kalendar.findMany({
    where: { tarikh: { gte: awalBulan, lte: akhirBulan }, jenis: "CutiUmum" },
  });
  const mapCutiUmum = new Map(cutiUmumList.map((k) => [isoTarikh(k.tarikh), k.nama]));

  // Senarai staf
  const whereStaf: any = { aktif: true, peranan: { not: "Kiosk" } };
  if (sesi.staf.peranan === "Penyelia") whereStaf.jabatanId = sesi.staf.jabatanId ?? "__TIADA__";
  else if (jabatanId) whereStaf.jabatanId = jabatanId;

  const senaraiStaf = await db.staf.findMany({
    where: whereStaf,
    include: { jabatan: true },
    orderBy: { nama: "asc" },
  });

  // Semua kehadiran dalam bulan
  const kehadiranList = await db.kehadiran.findMany({
    where: { tarikh: { gte: awalBulan, lte: akhirBulan } },
  });
  // Index: stafId -> tarikhISO -> rekod
  const mapKehadiran = new Map<string, Map<string, any>>();
  for (const k of kehadiranList) {
    const iso = isoTarikh(k.tarikh);
    if (!mapKehadiran.has(k.stafId)) mapKehadiran.set(k.stafId, new Map());
    mapKehadiran.get(k.stafId)!.set(iso, k);
  }

  const sel: { stafId: string; tarikh: string; status: string }[] = [];
  const stafRingkasan: { stafId: string; nama: string; hadir: number; lewat: number; cuti: number; tidakHadir: number; jamBekerjaTotal: number }[] = [];

  for (const staf of senaraiStaf) {
    let hadir = 0, lewat = 0, cuti = 0, tidakHadir = 0, jamTotal = 0;
    const rekodStaf = mapKehadiran.get(staf.id) ?? new Map();
    for (const td of tarikhDateList) {
      const iso = isoTarikh(td);
      const isWeekend = !isHariBekerja(td, hariBekerja);
      const isCutiUmum = mapCutiUmum.has(iso);
      let status = "—";
      if (isCutiUmum) status = "Cuti Umum";
      else if (isWeekend) status = "Hujung Minggu";
      else {
        const k = rekodStaf.get(iso);
        if (k) {
          status = k.status;
          if (k.status === "Hadir") hadir += 1;
          else if (k.status === "Lewat") lewat += 1;
          else if (k.status === "Cuti" || k.status === "TugasRasmi") cuti += 1;
          else if (k.status === "TidakHadir") tidakHadir += 1;
          if (k.jamBekerja) jamTotal += k.jamBekerja;
        } else {
          status = "Belum Hadir";
        }
      }
      sel.push({ stafId: staf.id, tarikh: iso, status });
    }
    stafRingkasan.push({
      stafId: staf.id,
      nama: staf.nama,
      hadir, lewat, cuti, tidakHadir,
      jamBekerjaTotal: jamTotal,
    });
  }

  // Summary keseluruhan
  const totalHadir = stafRingkasan.reduce((a, s) => a + s.hadir, 0);
  const totalLewat = stafRingkasan.reduce((a, s) => a + s.lewat, 0);
  const totalTidakHadir = stafRingkasan.reduce((a, s) => a + s.tidakHadir, 0);
  const totalJam = stafRingkasan.reduce((a, s) => a + s.jamBekerjaTotal, 0);
  const bilHadirBerkesan = totalHadir + totalLewat;
  const peratusHadir = bilHadirBerkesan + totalTidakHadir > 0
    ? Math.round((bilHadirBerkesan / (bilHadirBerkesan + totalTidakHadir)) * 100)
    : 0;
  const purataJamBekerja = bilHadirBerkesan > 0 ? Number((totalJam / bilHadirBerkesan).toFixed(2)) : 0;

  const teratasLewat = [...stafRingkasan]
    .filter((s) => s.lewat > 0)
    .sort((a, b) => b.lewat - a.lewat)
    .slice(0, 5)
    .map((s) => ({ stafId: s.stafId, nama: s.nama, bilLewat: s.lewat }));

  const stafHasil = senaraiStaf.map((s) => ({
    id: s.id,
    nama: s.nama,
    noIdStaf: s.noIdStaf,
    jawatan: s.jawatan,
    jabatan: s.jabatan?.nama ?? "—",
    noKpSamar: samarkanKp(s.noKpSamar),
  }));

  return json({
    tahun,
    bulan,
    tetapan,
    staf: stafHasil,
    tarikh: tarikhList,
    sel,
    summary: {
      peratusHadir,
      jumlahLewat: totalLewat,
      purataJamBekerja,
      teratasLewat,
    },
  });
}
