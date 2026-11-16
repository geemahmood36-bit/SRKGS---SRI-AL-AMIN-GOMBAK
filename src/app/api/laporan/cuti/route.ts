import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";

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
  const jabatanId = searchParams.get("jabatanId") ?? undefined;

  const whereStaf: any = { aktif: true, peranan: { not: "Kiosk" } };
  if (sesi.staf.peranan === "Penyelia") whereStaf.jabatanId = sesi.staf.jabatanId ?? "__TIADA__";
  else if (jabatanId) whereStaf.jabatanId = jabatanId;

  const senaraiStaf = await db.staf.findMany({
    where: whereStaf,
    include: { jabatan: true },
    orderBy: { nama: "asc" },
  });

  const senaraiBaki = await db.bakiCuti.findMany({
    where: { tahun },
    include: { jenisCuti: true },
  });
  // Index stafId -> bakiCuti[]
  const mapBaki = new Map<string, any[]>();
  for (const b of senaraiBaki) {
    if (!mapBaki.has(b.stafId)) mapBaki.set(b.stafId, []);
    mapBaki.get(b.stafId)!.push(b);
  }

  const semuaJenisCuti = await db.jenisCuti.findMany();

  const hasil = senaraiStaf.map((s) => {
    const bakiStaf = mapBaki.get(s.id) ?? [];
    // pastikan setiap jenis cuti ada entri
    const bakiPenuh = semuaJenisCuti.map((jc) => {
      const entri = bakiStaf.find((b) => b.jenisCutiId === jc.id);
      const layak = entri?.layak ?? jc.kelayakanTahunan;
      const digunakan = entri?.digunakan ?? 0;
      return {
        jenisCutiId: jc.id,
        jenisCuti: jc.nama,
        layak,
        digunakan,
        baki: Number((layak - digunakan).toFixed(2)),
      };
    });
    return {
      stafId: s.id,
      nama: s.nama,
      jabatan: s.jabatan?.nama ?? "—",
      bakiCuti: bakiPenuh,
    };
  });

  return json({ tahun, senarai: hasil });
}
