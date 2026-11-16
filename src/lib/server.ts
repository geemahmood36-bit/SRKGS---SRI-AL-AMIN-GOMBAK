// Utiliti pelayan: sesi cookie, hash kata laluan, dll.
import { cookies } from "next/headers";
import { db } from "./db";
import { sahkanLaluan } from "./domain";
import type { Peranan } from "./types";

export const NAMA_COOKIE_SESI = "srkgs_sesi";

// Baca token sesi dari cookie, kembalikan staf jika sah
export async function getSesiSemasa() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NAMA_COOKIE_SESI)?.value;
  if (!token) return null;
  const sesi = await db.sesi.findUnique({
    where: { token },
    include: { staf: { include: { jabatan: true } } },
  });
  if (!sesi) return null;
  if (sesi.tamat < new Date()) {
    await db.sesi.delete({ where: { id: sesi.id } });
    return null;
  }
  return sesi;
}

// Sahkan log masuk
export async function sahLogMasuk(noIdStaf: string, kataLaluan: string) {
  const staf = await db.staf.findUnique({ where: { noIdStaf }, include: { jabatan: true } });
  if (!staf || !staf.aktif) return null;
  if (!sahkanLaluan(kataLaluan, staf.kataLaluanHash)) return null;
  return staf;
}

// Cipta sesi baru dan set cookie
export async function ciptaSesi(stafId: string) {
  const token = `${stafId}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const tamat = new Date(Date.now() + 30 * 60 * 1000); // 30 minit
  const sesi = await db.sesi.create({
    data: { id: `SES-${token}`, stafId, token, tamat },
  });
  const cookieStore = await cookies();
  cookieStore.set(NAMA_COOKIE_SESI, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: tamat,
  });
  return sesi;
}

// Tutup sesi (log keluar)
export async function tutupSesi() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NAMA_COOKIE_SESI)?.value;
  if (token) {
    try { await db.sesi.deleteMany({ where: { token } }); } catch {}
  }
  cookieStore.delete(NAMA_COOKIE_SESI);
}

// Semak peranan
export function perluPeranan(perananDibenar: Peranan[]) {
  return async () => {
    const sesi = await getSesiSemasa();
    if (!sesi) return { ok: false as const, sesi: null };
    if (!perananDibenar.includes(sesi.staf.peranan as Peranan)) {
      return { ok: false as const, sesi };
    }
    return { ok: true as const, sesi };
  };
}

// Bangkit respons JSON piawai
export function json<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

// Respons ralat
export function ralat(mesej: string, status = 400) {
  return Response.json({ ralat: mesej }, { status });
}

// Tulis log audit
export async function tulisAudit(params: {
  penggunaId?: string | null;
  tindakan: string;
  entiti: string;
  entitiId?: string | null;
  nilaiLame?: string | null;
  nilaiBaharu?: string | null;
}) {
  await db.logAudit.create({
    data: {
      id: `LA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      penggunaId: params.penggunaId ?? null,
      tindakan: params.tindakan,
      entiti: params.entiti,
      entitiId: params.entitiId ?? null,
      nilaiLama: params.nilaiLame ?? null,
      nilaiBaharu: params.nilaiBaharu ?? null,
    },
  });
}

// Hantar notifikasi
export async function hantarNotifikasi(penerimaId: string, tajuk: string, mesej: string) {
  await db.notifikasi.create({
    data: {
      id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      penerimaId,
      tajuk,
      mesej,
      dibaca: false,
    },
  });
}
