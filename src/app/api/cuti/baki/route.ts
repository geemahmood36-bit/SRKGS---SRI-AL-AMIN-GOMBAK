import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const { searchParams } = new URL(request.url);
  const stafIdParam = searchParams.get("stafId");
  const now = new Date();
  const tahun = Number(searchParams.get("tahun") ?? now.getFullYear());

  let stafId = stafIdParam ?? sesi.stafId;
  if (stafIdParam && stafIdParam !== sesi.stafId) {
    const dibenar = ["Admin", "Pengetua", "Penyelia"].includes(sesi.staf.peranan);
    if (!dibenar) return ralat("Akses ditolak", 403);
  }

  const senarai = await db.bakiCuti.findMany({
    where: { stafId, tahun },
    include: { jenisCuti: true },
  });

  return json({ senarai, tahun });
}
