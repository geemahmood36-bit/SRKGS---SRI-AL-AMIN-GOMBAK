import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit } from "@/lib/server";
import { hashLaluanDummy, samarkanKp } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);

  const { searchParams } = new URL(request.url);
  const cari = searchParams.get("cari") ?? undefined;
  const jabatanId = searchParams.get("jabatanId") ?? undefined;
  const kategori = searchParams.get("kategori") ?? undefined;
  const peranan = searchParams.get("peranan") ?? undefined;
  const aktifParam = searchParams.get("aktif");

  const where: any = {};
  if (cari) {
    where.OR = [
      { nama: { contains: cari } },
      { noIdStaf: { contains: cari } },
      { emel: { contains: cari } },
    ];
  }
  if (jabatanId) where.jabatanId = jabatanId;
  if (kategori) where.kategori = kategori;
  if (peranan) where.peranan = peranan;
  if (aktifParam === "true" || aktifParam === "false") where.aktif = aktifParam === "true";

  const senarai = await db.staf.findMany({
    where,
    include: { jabatan: true },
    orderBy: { nama: "asc" },
  });

  // Jangan pulangkan kata laluan; samarkan no K/P
  const hasil = senarai.map((s) => {
    const { kataLaluanHash: _kh, ...selamat } = s as any;
    return { ...selamat, noKpSamar: samarkanKp(s.noKpSamar) };
  });

  return json({ senarai: hasil });
}

export async function POST(request: NextRequest) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  if (sesi.staf.peranan !== "Admin") return ralat("Akses ditolak", 403);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }

  const noIdStaf = String(body?.noIdStaf ?? "").trim();
  const nama = String(body?.nama ?? "").trim();
  const noKpSamar = String(body?.noKpSamar ?? "").trim();
  const jantina = String(body?.jantina ?? "").trim() === "P" ? "P" : "L";
  const jawatan = String(body?.jawatan ?? "").trim();
  const kategoriRaw = String(body?.kategori ?? "").trim();
  const kategori = ["Guru", "StafSokongan", "Pentadbiran"].includes(kategoriRaw)
    ? kategoriRaw
    : "Guru";
  const jabatanId = body?.jabatanId ? String(body.jabatanId) : null;
  const emel = body?.emel ? String(body.emel) : null;
  const telefon = body?.telefon ? String(body.telefon) : null;
  const tarikhLantikRaw = body?.tarikhLantik ? String(body.tarikhLantik) : "";
  const perananRaw = String(body?.peranan ?? "").trim();
  const peranan = ["Admin", "Pengetua", "Penyelia", "Guru", "Kiosk"].includes(perananRaw)
    ? perananRaw
    : "Guru";
  const kataLaluan = body?.kataLaluan
    ? String(body.kataLaluan)
    : "Demo@1234";
  const pin = body?.pin ? String(body.pin) : "1234";

  if (!noIdStaf || !nama || !noKpSamar || !jawatan) {
    return ralat("Medan wajib: noIdStaf, nama, noKpSamar, jawatan", 400);
  }

  const sedia = await db.staf.findUnique({ where: { noIdStaf } });
  if (sedia) return ralat("No. ID Staf telah wujud", 400);

  let tarikhLantik: Date | null = null;
  if (tarikhLantikRaw) {
    const [y, m, d] = tarikhLantikRaw.split("-").map(Number);
    if (y && m && d) tarikhLantik = new Date(y, m - 1, d);
  }

  const id = `S${Date.now().toString(36).toUpperCase()}`;
  const dicipta = await db.staf.create({
    data: {
      id,
      noIdStaf,
      nama,
      noKpSamar,
      jantina,
      jawatan,
      kategori,
      jabatanId,
      emel,
      telefon,
      tarikhLantik,
      peranan,
      kataLaluanHash: hashLaluanDummy(kataLaluan),
      pin,
      aktif: true,
      perluTukarLaluan: true,
    },
    include: { jabatan: true },
  });

  // Inisialisasi baki cuti tahun semasa untuk staf baharu
  const tahun = new Date().getFullYear();
  const jenisCutiList = await db.jenisCuti.findMany();
  for (const jc of jenisCutiList) {
    await db.bakiCuti.create({
      data: {
        id: `BC-${id}-${jc.id}-${tahun}`,
        stafId: id,
        jenisCutiId: jc.id,
        tahun,
        layak: jc.kelayakanTahunan,
        digunakan: 0,
      },
    });
  }

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: "CIPTA",
    entiti: "Staf",
    entitiId: id,
    nilaiBaharu: JSON.stringify({ ...dicipta, kataLaluanHash: "[disorok]" }),
  });

  const { kataLaluanHash: _kh, ...selamat } = dicipta as any;
  return json({ staf: { ...selamat, noKpSamar: samarkanKp(dicipta.noKpSamar) } }, 201);
}
