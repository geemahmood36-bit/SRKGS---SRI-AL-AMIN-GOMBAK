import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const result = await db.notifikasi.updateMany({
    where: { penerimaId: sesi.stafId, dibaca: false },
    data: { dibaca: true },
  });

  return json({ ok: true, dikemaskini: result.count });
}
