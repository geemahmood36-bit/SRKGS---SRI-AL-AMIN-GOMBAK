import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";
import { isoTarikh, samarkanKp } from "@/lib/domain";

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
  const stafIdParam = searchParams.get("stafId");
  const tarikhMula = searchParams.get("tarikhMula");
  const tarikhAkhir = searchParams.get("tarikhAkhir");

  let stafId = stafIdParam ?? sesi.stafId;
  if (stafIdParam && stafIdParam !== sesi.stafId) {
    const dibenar = ["Admin", "Pengetua", "Penyelia"].includes(sesi.staf.peranan);
    if (!dibenar) return ralat("Akses ditolak", 403);
  }

  if (!tarikhMula || !tarikhAkhir) return ralat("tarikhMula dan tarikhAkhir diperlukan", 400);

  const mula = tarikhLocal(tarikhMula);
  const akhir = tarikhLocal(tarikhAkhir);

  const staf = await db.staf.findUnique({
    where: { id: stafId },
    include: { jabatan: true },
  });
  if (!staf) return ralat("Staf tidak dijumpai", 404);

  const rekod = await db.kehadiran.findMany({
    where: { stafId, tarikh: { gte: mula, lte: akhir } },
    orderBy: { tarikh: "asc" },
  });

  const hadir = rekod.filter((r) => r.status === "Hadir").length;
  const lewat = rekod.filter((r) => r.status === "Lewat").length;
  const cuti = rekod.filter((r) => r.status === "Cuti" || r.status === "TugasRasmi").length;
  const tidakHadir = rekod.filter((r) => r.status === "TidakHadir").length;
  const jamTotal = rekod.reduce((a, r) => a + (r.jamBekerja ?? 0), 0);
  const bilBerkesan = hadir + lewat;
  const purataJamBekerja = bilBerkesan > 0 ? Number((jamTotal / bilBerkesan).toFixed(2)) : 0;

  const { kataLaluanHash: _kh, ...stafSelamat } = staf as any;

  return json({
    staf: { ...stafSelamat, noKpSamar: samarkanKp(staf.noKpSamar) },
    rekod: rekod.map((r) => ({ ...r, tarikh: isoTarikh(r.tarikh) })),
    ringkasan: { hadir, lewat, cuti, tidakHadir, purataJamBekerja },
  });
}
