import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const senarai = await db.notifikasi.findMany({
    where: { penerimaId: sesi.stafId },
    orderBy: { dicipta: "desc" },
    take: 100,
  });

  return json({ senarai });
}
