import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";
import { hashLaluanDummy } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/profil/tukar-laluan — tukar kata laluan staf yang log masuk.
export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return ralat("Format JSON tidak sah", 400);
  }

  const kataLaluanBaharu = String(body?.kataLaluanBaharu ?? "");
  if (!kataLaluanBaharu) return ralat("kataLaluanBaharu diperlukan", 400);
  if (kataLaluanBaharu.length < 8) {
    return ralat("Kata laluan baharu mestilah sekurang-kurangnya 8 aksara.", 400);
  }
  if (!/[A-Za-z]/.test(kataLaluanBaharu) || !/[0-9]/.test(kataLaluanBaharu)) {
    return ralat("Kata laluan baharu mesti mengandungi huruf dan nombor.", 400);
  }

  const sedia = await db.staf.findUnique({ where: { id: sesi.stafId } });
  if (!sedia) return ralat("Staf tidak dijumpai", 404);

  const hashBaharu = hashLaluanDummy(kataLaluanBaharu);
  await db.staf.update({
    where: { id: sesi.stafId },
    data: {
      kataLaluanHash: hashBaharu,
      perluTukarLaluan: false,
    },
  });

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "TUKAR_LALUAN",
    entiti: "Staf",
    entitiId: sesi.stafId,
    nilaiLame: "***",
    nilaiBaharu: "***",
  });

  return json({ ok: true });
}
