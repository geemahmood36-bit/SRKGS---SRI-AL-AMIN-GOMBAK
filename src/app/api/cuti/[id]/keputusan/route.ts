import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSesiSemasa, json, ralat, tulisAudit, hantarNotifikasi } from "@/lib/server";
import { isoTarikh } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tarikhLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await getSesiSemasa();
  if (!sesi) return ralat("Tidak log masuk", 401);
  const { id } = await params;

  const dibenar = ["Pengetua", "Penyelia", "Admin"].includes(sesi.staf.peranan);
  if (!dibenar) return ralat("Akses ditolak", 403);

  let body: any;
  try { body = await request.json(); } catch { return ralat("Format JSON tidak sah", 400); }
  const keputusan = body?.keputusan === "Diluluskan" ? "Diluluskan" : body?.keputusan === "Ditolak" ? "Ditolak" : null;
  const catatan = typeof body?.catatan === "string" ? body.catatan : null;
  if (!keputusan) return ralat("keputusan mesti 'Diluluskan' atau 'Ditolak'", 400);

  const permohonan = await db.permohonanCuti.findUnique({
    where: { id },
    include: { jenisCuti: true },
  });
  if (!permohonan) return ralat("Permohonan cuti tidak dijumpai", 404);
  if (permohonan.status !== "Menunggu") return ralat("Permohonan telah diputuskan", 400);

  // Jika aliran dua peringkat dan Penyelia belum diluluskan oleh Pengetua
  // Untuk prototaip: Penyelia boleh lulus jika bukan dua peringkat, jika dua peringkat Penyelia hanya cadang
  const tetapan = await db.tetapan.findUnique({ where: { id: 1 } });
  const duaPeringkat = tetapan?.aliranDuaPeringkat ?? false;
  if (duaPeringkat && sesi.staf.peranan === "Penyelia" && keputusan === "Diluluskan") {
    // Penyelia cadang, tunggu Pengetua sahkan - tetapi untuk prototaip kita benarkan
  }

  const nilaiLame = JSON.stringify(permohonan);

  const dikemaskini = await db.permohonanCuti.update({
    where: { id },
    data: {
      status: keputusan,
      diputuskanOleh: sesi.stafId,
      catatanKeputusan: catatan,
      tarikhKeputusan: new Date(),
    },
  });

  // Jika diluluskan: update baki + upsert kehadiran
  const isTugasRasmi = permohonan.jenisCuti.id === "JC5" || permohonan.jenisCuti.nama.toLowerCase().includes("tugas");
  if (keputusan === "Diluluskan") {
    if (!isTugasRasmi) {
      const tahun = new Date(permohonan.tarikhMula).getFullYear();
      const baki = await db.bakiCuti.findUnique({
        where: {
          stafId_jenisCutiId_tahun: {
            stafId: permohonan.stafId,
            jenisCutiId: permohonan.jenisCutiId,
            tahun,
          },
        },
      });
      if (baki) {
        await db.bakiCuti.update({
          where: { id: baki.id },
          data: { digunakan: baki.digunakan + permohonan.bilHari },
        });
      }
    }

    // Untuk setiap hari bekerja dalam julat, upsert Kehadiran = Cuti / TugasRasmi
    const mula = new Date(permohonan.tarikhMula); mula.setHours(0, 0, 0, 0);
    const akhir = new Date(permohonan.tarikhAkhir); akhir.setHours(0, 0, 0, 0);
    const statusKehadiran = isTugasRasmi ? "TugasRasmi" : "Cuti";

    const cutiUmumList = await db.kalendar.findMany({ where: { jenis: "CutiUmum" } });
    const setCutiUmum = new Set(cutiUmumList.map((k) => {
      const t = new Date(k.tarikh); t.setHours(0, 0, 0, 0);
      return isoTarikh(t);
    }));

    const cur = new Date(mula);
    while (cur <= akhir) {
      const iso = isoTarikh(cur);
      if (!setCutiUmum.has(iso)) {
        const sedia = await db.kehadiran.findUnique({
          where: { stafId_tarikh: { stafId: permohonan.stafId, tarikh: new Date(cur) } },
        });
        if (sedia) {
          await db.kehadiran.update({
            where: { id: sedia.id },
            data: { status: statusKehadiran, masaMasuk: null, masaKeluar: null, catatan: `Cuti: ${permohonan.jenisCuti.nama}` },
          });
        } else {
          await db.kehadiran.create({
            data: {
              id: `KH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cur.getTime()}`,
              stafId: permohonan.stafId,
              tarikh: new Date(cur),
              masaMasuk: null,
              masaKeluar: null,
              status: statusKehadiran,
              sumber: "Admin",
              catatan: `Cuti: ${permohonan.jenisCuti.nama}`,
            },
          });
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  await hantarNotifikasi(
    permohonan.stafId,
    `Permohonan Cuti ${keputusan}`,
    `Permohonan cuti anda (${permohonan.jenisCuti.nama}) telah ${keputusan.toLowerCase()}. ${catatan ? `Catatan: ${catatan}` : ""}`,
  );

  await tulisAudit({
    penggunaId: sesi.stafId,
    tindakan: `KEPUTUSAN_CUTI_${keputusan.toUpperCase()}`,
    entiti: "PermohonanCuti",
    entitiId: id,
    nilaiLame,
    nilaiBaharu: JSON.stringify(dikemaskini),
  });

  return json({ permohonan: dikemaskini });
}
