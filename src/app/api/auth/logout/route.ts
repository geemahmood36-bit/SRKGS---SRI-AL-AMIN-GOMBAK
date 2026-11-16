import { tutupSesi, json } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await tutupSesi();
  return json({ ok: true });
}
