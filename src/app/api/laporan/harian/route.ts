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

export async function GET(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const tarikhStr = searchParams.get("tarikh") ?? isoTarikh(now);
  const jabatanId = searchParams.get("jabatanId") ?? undefined;

  const tarikhDate = tarikhLocal(tarikhStr);

  const tetapan = await db.tetapan.findUnique({ where: { id: 1 } });
  if (!tetapan) return ralat("Tetapan tidak dijumpai", 500);
  const hariBekerja = parseHariBekerja(tetapan.hariBekerja);

  const cutiUmum = await db.kalendar.findFirst({
    where: { tarikh: tarikhDate, jenis: "CutiUmum" },
  });
  const isWeekend = !isHariBekerja(tarikhDate, hariBekerja);

  const whereStaf: any = { aktif: true, peranan: { not: "Kiosk" } };
  if (sesi.staf.peranan === "Penyelia") whereStaf.jabatanId = sesi.staf.jabatanId ?? "__TIADA__";
  else if (jabatanId) whereStaf.jabatanId = jabatanId;

  const senaraiStaf = await db.staf.findMany({
    where: whereStaf,
    include: { jabatan: true },
    orderBy: { nama: "asc" },
  });

  const kehadiranList = await db.kehadiran.findMany({
    where: { tarikh: tarikhDate },
  });
  const mapKehadiran = new Map(kehadiranList.map((k) => [k.stafId, k]));

  let statusRingkasGlobal = "";
  if (cutiUmum) statusRingkasGlobal = "Cuti Umum";
  else if (isWeekend) statusRingkasGlobal = "Hujung Minggu";

  const senarai = senaraiStaf.map((s) => {
    const k = mapKehadiran.get(s.id);
    let statusRingkas = statusRingkasGlobal;
    if (!statusRingkas) {
      if (k) statusRingkas = k.status;
      else statusRingkas = "Belum Hadir";
    }
    return {
      staf: {
        id: s.id,
        nama: s.nama,
        noIdStaf: s.noIdStaf,
        jawatan: s.jawatan,
        jabatan: s.jabatan?.nama ?? "—",
        noKpSamar: samarkanKp(s.noKpSamar),
      },
      kehadiran: k ?? null,
      statusRingkas,
    };
  });

  return json({
    tarikh: tarikhStr,
    tetapan,
    isCutiUmum: !!cutiUmum,
    cutiUmum: cutiUmum?.nama ?? null,
    isHujungMinggu: isWeekend,
    senarai,
  });
}
