import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const tahun = Number(searchParams.get("tahun") ?? now.getFullYear());
  const bulan = Number(searchParams.get("bulan") ?? now.getMonth() + 1);

  const awalBulan = new Date(tahun, bulan - 1, 1, 0, 0, 0, 0);
  const akhirBulan = new Date(tahun, bulan, 0, 23, 59, 59, 999);

  const senarai = await db.kehadiran.findMany({
    where: {
      stafId: sesi.stafId,
      tarikh: { gte: awalBulan, lte: akhirBulan },
    },
    orderBy: { tarikh: "asc" },
  });

  return json({ senarai });
}
