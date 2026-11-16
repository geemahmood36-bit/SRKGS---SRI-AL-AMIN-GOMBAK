import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sahLogMasuk, ciptaSesi, json, ralat } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return ralat("Format JSON tidak sah", 400);
  }
  const noIdStaf = String(body?.noIdStaf ?? "").trim();
  const kataLaluan = String(body?.kataLaluan ?? "");
  if (!noIdStaf || !kataLaluan) {
    return ralat("No. ID staf dan kata laluan diperlukan", 400);
  }
  const staf = await sahLogMasuk(noIdStaf, kataLaluan);
  if (!staf) {
    return ralat("No. ID staf atau kata laluan tidak sah", 401);
  }
  await ciptaSesi(staf.id);
  // Jangan pulangkan kata laluan
  const { kataLaluanHash: _kh, ...stafSelamat } = staf as any;
  return json({ staf: stafSelamat });
}
