import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit, hantarNotifikasi } from "@/lib/server";
import { kiraHariBerkesanCuti, parseHariBekerja, isoTarikh } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const { searchParams } = new URL(request.url);
  const stafIdParam = searchParams.get("stafId");
  const status = searchParams.get("status");
  const semua = searchParams.get("semua") === "true";

  const peranan = sesi.staf.peranan;
  const bolehLihatSemua = ["Admin", "Pengetua", "Penyelia"].includes(peranan);

  // Tentukan stafId
  let stafId: string | undefined;
  if (semua && bolehLihatSemua) {
    stafId = undefined; // semua staf
  } else {
    stafId = stafIdParam ?? sesi.stafId;
    // Jika lihat cuti staf lain, perlu Admin/Pengetua/Penyelia
    if (stafIdParam && stafIdParam !== sesi.stafId) {
      if (!bolehLihatSemua) return ralat("Akses ditolak", 403);
    }
  }

  const where: any = {};
  if (stafId) where.stafId = stafId;
  if (status) where.status = status;

  const senarai = await db.permohonanCuti.findMany({
    where,
    include: { staf: { include: { jabatan: true } }, jenisCuti: true },
    orderBy: { dicipta: "desc" },
  });

  const hasil = senarai.map((c) => {
    const { kataLaluanHash: _kh, ...stafSelamat } = c.staf as any;
    return { ...c, staf: stafSelamat };
  });

  return json({ senarai: hasil });
}

export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const { jenisCutiId, tarikhMula, tarikhAkhir, separuhHari, sebab, lampiranNama } = body ?? {};
  if (!jenisCutiId || !tarikhMula || !tarikhAkhir || !sebab) {
    return ralat("Medan wajib: jenisCutiId, tarikhMula, tarikhAkhir, sebab", 400);
  }

  const [y1, m1, d1] = String(tarikhMula).split("-").map(Number);
  const [y2, m2, d2] = String(tarikhAkhir).split("-").map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return ralat("Format tarikh tidak sah", 400);
  const mula = new Date(y1, m1 - 1, d1);
  const akhir = new Date(y2, m2 - 1, d2);
  if (akhir < mula) return ralat("Tarikh akhir lebih awal dari tarikh mula", 400);

  const tetapan = await db.tetapan.findUnique({ where: { id: 1 } });
  if (!tetapan) return ralat("Tetapan tidak dijumpai", 500);
  const hariBekerja = parseHariBekerja(tetapan.hariBekerja);

  // Cuti umum
  const cutiUmumList = await db.kalendar.findMany({ where: { jenis: "CutiUmum" } });
  const tarikhCutiUmum = cutiUmumList.map((k) => {
    const t = new Date(k.tarikh); t.setHours(0, 0, 0, 0);
    return isoTarikh(t);
  });

  const bilHari = kiraHariBerkesanCuti({
    tarikhMula: mula,
    tarikhAkhir: akhir,
    hariBekerja,
    tarikhCutiUmum,
    separuhHari: Boolean(separuhHari),
  });

  const jenisCuti = await db.jenisCuti.findUnique({ where: { id: jenisCutiId } });
  if (!jenisCuti) return ralat("Jenis cuti tidak dijumpai", 400);

  // Semak baki cuti tahun semasa
  const tahun = new Date().getFullYear();
  const baki = await db.bakiCuti.findUnique({
    where: { stafId_jenisCutiId_tahun: { stafId: sesi.stafId, jenisCutiId, tahun } },
  });
  const layak = baki?.layak ?? jenisCuti.kelayakanTahunan;
  const digunakan = baki?.digunakan ?? 0;
  const bakiTinggal = layak - digunakan;

  // TugasRasmi (JC5) tidak perlukan baki
  const isTugasRasmi = jenisCuti.id === "JC5" || jenisCuti.nama.toLowerCase().includes("tugas");
  if (!isTugasRasmi && bilHari > bakiTinggal) {
    return ralat(`Baki cuti tidak mencukupi. Baki semasa: ${bakiTinggal} hari, dimohon: ${bilHari} hari.`, 400);
  }

  const dicipta = await db.permohonanCuti.create({
    data: {
      id: `PC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      stafId: sesi.stafId,
      jenisCutiId,
      tarikhMula: mula,
      tarikhAkhir: akhir,
      separuhHari: Boolean(separuhHari),
      bilHari,
      sebab: String(sebab),
      lampiranNama: lampiranNama ?? null,
      status: "Menunggu",
    },
    include: { jenisCuti: true, staf: { include: { jabatan: true } } },
  });

  // Hantar notifikasi kepada Pengetua
  const pengetua = await db.staf.findMany({ where: { peranan: "Pengetua", aktif: true } });
  for (const p of pengetua) {
    await hantarNotifikasi(
      p.id,
      "Permohonan Cuti Baru",
      `${sesi.staf.nama} memohon ${bilHari} hari ${jenisCuti.nama} dari ${tarikhMula} hingga ${tarikhAkhir}.`,
    );
  }

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "MOHON_CUTI",
    entiti: "PermohonanCuti",
    entitiId: dicipta.id,
    nilaiBaharu: JSON.stringify({ ...dicipta, staf: undefined }),
  });

  const { kataLaluanHash: _kh, ...stafSelamat } = dicipta.staf as any;
  return json({ permohonan: { ...dicipta, staf: stafSelamat } }, 201);
}
