import { getSesiSemasa, json, ralat } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  const { kataLaluanHash: _kh, ...stafSelamat } = sesi.staf as any;
  return json({ staf: stafSelamat });
}
