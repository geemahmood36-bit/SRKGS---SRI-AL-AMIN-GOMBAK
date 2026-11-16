import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  const { id } = await params;

  const notifikasi = await db.notifikasi.findUnique({ where: { id } });
  if (!notifikasi) return ralat("Notifikasi tidak dijumpai", 404);
  if (notifikasi.penerimaId !== sesi.stafId) return ralat("Akses ditolak", 403);

  const dikemaskini = await db.notifikasi.update({
    where: { id },
    data: { dibaca: true },
  });

  return json({ notifikasi: dikemaskini });
}
