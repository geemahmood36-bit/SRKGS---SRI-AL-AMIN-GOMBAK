"use client";

// StafView (FR-F01, FR-F02) — Sistem Rekod Kehadiran Guru & Staf SRI Al-Amin Gombak.
// Pengurusan Staf (CRUD) & Jabatan/Panitia (CRUD). Admin sahaja.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2, KeyRound, Loader2, Lock, Pencil, Plus,
  Power, Search, Users,
} from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { LABEL_PERANAN, samarkanKp } from "@/lib/domain";
import type { Jabatan, Jantina, KategoriStaf, Peranan, Staf } from "@/lib/types";

// ---------- Jenis ringkas (mengikut respons API) ----------
interface JabatanRingkas {
  id: string;
  nama: string;
  kod: string;
  bilStaf?: number;
}

type StafRespons = Staf;

// Pilihan filter
const PILIHAN_KATEGORI: { nilai: string; label: string }[] = [
  { nilai: "Semua", label: "Semua Kategori" },
  { nilai: "Guru", label: "Guru" },
  { nilai: "StafSokongan", label: "Staf Sokongan" },
  { nilai: "Pentadbiran", label: "Pentadbiran" },
];

const PILIHAN_PERANAN: { nilai: string; label: string }[] = [
  { nilai: "Semua", label: "Semua Peranan" },
  ...Object.entries(LABEL_PERANAN).map(([nilai, label]) => ({ nilai, label })),
];

const PILIHAN_STATUS: { nilai: string; label: string }[] = [
  { nilai: "Semua", label: "Semua Status" },
  { nilai: "true", label: "Aktif" },
  { nilai: "false", label: "Nyahaktif" },
];

const KATEGORI_LABEL: Record<KategoriStaf, string> = {
  Guru: "Guru",
  StafSokongan: "Staf Sokongan",
  Pentadbiran: "Pentadbiran",
};

// ---------- Borang staf ----------
interface FormStaf {
  noIdStaf: string;
  nama: string;
  noKpSamar: string;
  jantina: Jantina;
  jawatan: string;
  kategori: KategoriStaf;
  jabatanId: string;
  emel: string;
  telefon: string;
  tarikhLantik: string;
  peranan: Peranan;
  kataLaluan: string;
}

const FORM_STAF_KOSONG: FormStaf = {
  noIdStaf: "",
  nama: "",
  noKpSamar: "",
  jantina: "L",
  jawatan: "",
  kategori: "Guru",
  jabatanId: "",
  emel: "",
  telefon: "",
  tarikhLantik: "",
  peranan: "Guru",
  kataLaluan: "Demo@1234",
};

// ---------- Borang jabatan ----------
interface FormJabatan {
  nama: string;
  kod: string;
}

const FORM_JAB_KOSONG: FormJabatan = { nama: "", kod: "" };

// ============================================================
// Komponen utama
// ============================================================
export function StafView() {
  const { staf: pengguna } = useAuth();

  const [tab, setTab] = useState<"staf" | "jabatan">("staf");

  // Data staf
  const [senStaf, setSenStaf] = useState<StafRespons[]>([]);
  const [senJabatan, setSenJabatan] = useState<JabatanRingkas[]>([]);
  const [memuatStaf, setMemuatStaf] = useState(true);
  const [memuatJab, setMemuatJab] = useState(true);

  // Penapis staf
  const [cari, setCari] = useState("");
  const [fJabatan, setFJabatan] = useState("Semua");
  const [fKategori, setFKategori] = useState("Semua");
  const [fPeranan, setFPeranan] = useState("Semua");
  const [fStatus, setFStatus] = useState("Semua");

  // Dialog staf
  const [dialogStafBuka, setDialogStafBuka] = useState(false);
  const [editStaf, setEditStaf] = useState<Staf | null>(null);
  const [formStaf, setFormStaf] = useState<FormStaf>(FORM_STAF_KOSONG);
  const [hantarStaf, setHantarStaf] = useState(false);

  // Dialog jabatan
  const [dialogJabBuka, setDialogJabBuka] = useState(false);
  const [editJab, setEditJab] = useState<JabatanRingkas | null>(null);
  const [formJab, setFormJab] = useState<FormJabatan>(FORM_JAB_KOSONG);
  const [hantarJab, setHantarJab] = useState(false);

  // Pengesahan tindakan
  const [pengesahan, setPengesahan] = useState<
    | { jenis: "aktif" | "reset"; staf: Staf }
    | null
  >(null);
  const [memproses, setMemproses] = useState(false);

  const isAdmin = pengguna?.peranan === "Admin";

  // ---------- Muat jabatan ----------
  const muatJabatan = useCallback(async () => {
    setMemuatJab(true);
    try {
      const r = await apiFetch<{ senarai: JabatanRingkas[] }>("/api/jabatan");
      setSenJabatan(r.senarai || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuatkan jabatan.");
    } finally {
      setMemuatJab(false);
    }
  }, []);

  // ---------- Muat staf ----------
  const muatStaf = useCallback(async () => {
    setMemuatStaf(true);
    try {
      const params = new URLSearchParams();
      if (cari.trim()) params.set("cari", cari.trim());
      if (fJabatan && fJabatan !== "Semua") params.set("jabatanId", fJabatan);
      if (fKategori && fKategori !== "Semua") params.set("kategori", fKategori);
      if (fPeranan && fPeranan !== "Semua") params.set("peranan", fPeranan);
      if (fStatus && fStatus !== "Semua") params.set("aktif", fStatus);
      const qs = params.toString();
      const r = await apiFetch<{ senarai: StafRespons[] }>(
        `/api/staf${qs ? `?${qs}` : ""}`,
      );
      setSenStaf(r.senarai || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuatkan staf.");
    } finally {
      setMemuatStaf(false);
    }
  }, [cari, fJabatan, fKategori, fPeranan, fStatus]);

  useEffect(() => {
    muatJabatan();
  }, [muatJabatan]);

  useEffect(() => {
    if (tab === "staf") muatStaf();
  }, [tab, muatStaf]);

  // ---------- Staf CRUD ----------
  function bukaTambahStaf() {
    setEditStaf(null);
    setFormStaf({
      ...FORM_STAF_KOSONG,
      jabatanId: senJabatan[0]?.id ?? "",
      kataLaluan: "Demo@1234",
    });
    setDialogStafBuka(true);
  }

  function bukaUbahStaf(s: Staf) {
    setEditStaf(s);
    const tLantik = s.tarikhLantik
      ? (() => {
          const d = new Date(s.tarikhLantik);
          if (isNaN(d.getTime())) return "";
          const off = d.getTimezoneOffset();
          const local = new Date(d.getTime() - off * 60 * 1000);
          return local.toISOString().slice(0, 10);
        })()
      : "";
    setFormStaf({
      noIdStaf: s.noIdStaf,
      nama: s.nama,
      noKpSamar: s.noKpSamar,
      jantina: (s.jantina === "P" ? "P" : "L"),
      jawatan: s.jawatan || "",
      kategori: (s.kategori as KategoriStaf) || "Guru",
      jabatanId: s.jabatanId || "",
      emel: s.emel || "",
      telefon: s.telefon || "",
      tarikhLantik: tLantik,
      peranan: (s.peranan as Peranan) || "Guru",
      kataLaluan: "Demo@1234",
    });
    setDialogStafBuka(true);
  }

  function tutupDialogStaf() {
    setDialogStafBuka(false);
    setEditStaf(null);
    setFormStaf(FORM_STAF_KOSONG);
    setHantarStaf(false);
  }

  async function hantarStafFn() {
    if (!formStaf.noIdStaf.trim() || !formStaf.nama.trim() || !formStaf.jawatan.trim()) {
      toast.error("No. ID Staf, Nama dan Jawatan diperlukan.");
      return;
    }
    setHantarStaf(true);
    try {
      const muatan: Record<string, unknown> = {
        noIdStaf: formStaf.noIdStaf.trim(),
        nama: formStaf.nama.trim(),
        noKpSamar: formStaf.noKpSamar.trim(),
        jantina: formStaf.jantina,
        jawatan: formStaf.jawatan.trim(),
        kategori: formStaf.kategori,
        jabatanId: formStaf.jabatanId || null,
        emel: formStaf.emel || null,
        telefon: formStaf.telefon || null,
        tarikhLantik: formStaf.tarikhLantik || null,
        peranan: formStaf.peranan,
      };
      if (editStaf) {
        await apiFetch<{ staf: Staf }>(`/api/staf/${editStaf.id}`, {
          method: "PUT",
          body: JSON.stringify(muatan),
        });
        toast.success(`Staf ${formStaf.nama} telah dikemaskini.`);
      } else {
        muatan.kataLaluan = formStaf.kataLaluan || "Demo@1234";
        await apiFetch<{ staf: Staf }>("/api/staf", {
          method: "POST",
          body: JSON.stringify(muatan),
        });
        toast.success(`Staf baharu ${formStaf.nama} telah ditambah.`);
      }
      tutupDialogStaf();
      await muatStaf();
      await muatJabatan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan staf.");
    } finally {
      setHantarStaf(false);
    }
  }

  async function tukarAktif(s: Staf) {
    setMemproses(true);
    try {
      await apiFetch(`/api/staf/${s.id}/aktif`, {
        method: "PATCH",
        body: JSON.stringify({ aktif: !s.aktif }),
      });
      toast.success(
        s.aktif
          ? `${s.nama} telah dinyahaktifkan.`
          : `${s.nama} telah diaktifkan semula.`,
      );
      setPengesahan(null);
      await muatStaf();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status.");
    } finally {
      setMemproses(false);
    }
  }

  async function resetLaluan(s: Staf) {
    setMemproses(true);
    try {
      const r = await apiFetch<{ mesej?: string }>(
        `/api/staf/${s.id}/reset-laluan`,
        { method: "POST", body: JSON.stringify({}) },
      );
      toast.success(r.mesej || `Kata laluan ${s.nama} telah diset semula kepada Demo@1234.`);
      setPengesahan(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal reset kata laluan.");
    } finally {
      setMemproses(false);
    }
  }

  // ---------- Jabatan CRUD ----------
  function bukaTambahJab() {
    setEditJab(null);
    setFormJab(FORM_JAB_KOSONG);
    setDialogJabBuka(true);
  }

  function bukaUbahJab(j: JabatanRingkas) {
    setEditJab(j);
    setFormJab({ nama: j.nama, kod: j.kod });
    setDialogJabBuka(true);
  }

  function tutupDialogJab() {
    setDialogJabBuka(false);
    setEditJab(null);
    setFormJab(FORM_JAB_KOSONG);
    setHantarJab(false);
  }

  async function hantarJabFn() {
    if (!formJab.nama.trim() || !formJab.kod.trim()) {
      toast.error("Nama dan Kod jabatan diperlukan.");
      return;
    }
    setHantarJab(true);
    try {
      const muatan = {
        nama: formJab.nama.trim(),
        kod: formJab.kod.trim().toUpperCase(),
      };
      if (editJab) {
        await apiFetch(`/api/jabatan/${editJab.id}`, {
          method: "PUT",
          body: JSON.stringify(muatan),
        });
        toast.success(`Jabatan ${muatan.nama} telah dikemaskini.`);
      } else {
        await apiFetch("/api/jabatan", {
          method: "POST",
          body: JSON.stringify(muatan),
        });
        toast.success(`Jabatan ${muatan.nama} telah ditambah.`);
      }
      tutupDialogJab();
      await muatJabatan();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan jabatan.");
    } finally {
      setHantarJab(false);
    }
  }

  // ---------- Peta jabatan untuk paparan nama ----------
  const petaJabatan = useMemo(() => {
    const m = new Map<string, JabatanRingkas>();
    for (const j of senJabatan) m.set(j.id, j);
    return m;
  }, [senJabatan]);

  // ---------- Akses ----------
  if (pengguna && !isAdmin) {
    return (
      <div className="skeuo-card p-8 text-center text-stone-500">
        <Lock className="mx-auto mb-2 text-stone-400" size={24} />
        Halaman ini hanya untuk Pentadbir.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="skeuo-panel p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
              <Users size={14} /> Pengurusan Staf
            </div>
            <div className="text-lg sm:text-xl font-bold text-stone-800">
              Staf &amp; Jabatan / Panitia
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              Tambah, ubah, nyahaktifkan dan urus staf serta jabatan sekolah.
            </div>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "staf" | "jabatan")}>
        <TabsList className="skeuo-card-inset p-1">
          <TabsTrigger value="staf" className="gap-1.5">
            <Users size={14} /> Staf
          </TabsTrigger>
          <TabsTrigger value="jabatan" className="gap-1.5">
            <Building2 size={14} /> Jabatan / Panitia
          </TabsTrigger>
        </TabsList>

        {/* ============= Tab Staf ============= */}
        <TabsContent value="staf" className="mt-4 space-y-4">
          {/* Penapis + butang tambah */}
          <div className="skeuo-card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-1">
                <Label className="text-xs font-semibold text-stone-600">Cari</Label>
                <div className="relative mt-1">
                  <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <Input
                    placeholder="Nama / No. ID / Jawatan"
                    value={cari}
                    onChange={(e) => setCari(e.target.value)}
                    className="skeuo-input pl-8"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-stone-600">Jabatan</Label>
                <Select value={fJabatan} onValueChange={setFJabatan}>
                  <SelectTrigger className="skeuo-input mt-1">
                    <SelectValue placeholder="Semua Jabatan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua">Semua Jabatan</SelectItem>
                    {senJabatan.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.nama} ({j.kod})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-stone-600">Kategori</Label>
                <Select value={fKategori} onValueChange={setFKategori}>
                  <SelectTrigger className="skeuo-input mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PILIHAN_KATEGORI.map((k) => (
                      <SelectItem key={k.nilai} value={k.nilai}>{k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-stone-600">Peranan</Label>
                <Select value={fPeranan} onValueChange={setFPeranan}>
                  <SelectTrigger className="skeuo-input mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PILIHAN_PERANAN.map((p) => (
                      <SelectItem key={p.nilai} value={p.nilai}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-stone-600">Status</Label>
                <Select value={fStatus} onValueChange={setFStatus}>
                  <SelectTrigger className="skeuo-input mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PILIHAN_STATUS.map((s) => (
                      <SelectItem key={s.nilai} value={s.nilai}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                onClick={bukaTambahStaf}
                className="skeuo-btn h-9 px-4 gap-1.5"
                disabled={senJabatan.length === 0}
              >
                <Plus size={15} /> Tambah Staf
              </Button>
            </div>
            {senJabatan.length === 0 && (
              <p className="mt-2 text-[11px] text-amber-700">
                Sila tambah sekurang-kurangnya satu jabatan sebelum menambah staf.
              </p>
            )}
          </div>

          {/* Jadual staf */}
          <div className="skeuo-card p-0 overflow-hidden">
            <div className="max-h-[60vh] overflow-y-auto custom-scroll">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-stone-50">
                  <TableRow className="border-stone-200 hover:bg-stone-50">
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">No. ID</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Nama</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">No. K/P</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Jawatan</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Jabatan</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Kategori</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Peranan</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500 text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memuatStaf ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        {Array.from({ length: 9 }).map((__, j) => (
                          <TableCell key={`skc-${i}-${j}`}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : senStaf.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-stone-500 py-12">
                        <Users className="mx-auto mb-2 text-stone-300" size={28} />
                        Tiada rekod staf dijumpai untuk penapis semasa.
                      </TableCell>
                    </TableRow>
                  ) : (
                    senStaf.map((s) => {
                      const jab = s.jabatan || (s.jabatanId ? petaJabatan.get(s.jabatanId) : null);
                      return (
                        <TableRow key={s.id} className="border-stone-100">
                          <TableCell className="font-mono text-xs text-stone-700">{s.noIdStaf}</TableCell>
                          <TableCell className="font-semibold text-stone-800">
                            {s.nama}
                            {s.perluTukarLaluan && (
                              <span className="ml-1.5 inline-flex items-center text-[10px] text-amber-700 align-middle">
                                <KeyRound size={11} className="mr-0.5" /> perlu tukar
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-stone-600">{samarkanKp(s.noKpSamar)}</TableCell>
                          <TableCell className="text-stone-700">{s.jawatan || "—"}</TableCell>
                          <TableCell className="text-stone-700">{jab ? jab.nama : "—"}</TableCell>
                          <TableCell className="text-stone-700">{KATEGORI_LABEL[s.kategori as KategoriStaf] ?? s.kategori}</TableCell>
                          <TableCell className="text-stone-700">{LABEL_PERANAN[s.peranan] ?? s.peranan}</TableCell>
                          <TableCell>
                            {s.aktif ? (
                              <span className="skeuo-pill bg-emerald-100 text-emerald-800">
                                <span className="led bg-emerald-600" /> Aktif
                              </span>
                            ) : (
                              <span className="skeuo-pill bg-slate-200 text-slate-700">
                                <span className="led bg-slate-500" /> Nyahaktif
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => bukaUbahStaf(s)}
                                className="h-8 px-2 gap-1 text-stone-700 hover:bg-stone-100"
                              >
                                <Pencil size={13} /> Ubah
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPengesahan({ jenis: "aktif", staf: s })}
                                className={
                                  s.aktif
                                    ? "h-8 px-2 gap-1 text-amber-700 hover:bg-amber-50"
                                    : "h-8 px-2 gap-1 text-emerald-700 hover:bg-emerald-50"
                                }
                              >
                                <Power size={13} /> {s.aktif ? "Nyahaktif" : "Aktifkan"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPengesahan({ jenis: "reset", staf: s })}
                                className="h-8 px-2 gap-1 text-stone-700 hover:bg-stone-100"
                              >
                                <KeyRound size={13} /> Reset Laluan
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ============= Tab Jabatan ============= */}
        <TabsContent value="jabatan" className="mt-4 space-y-4">
          <div className="skeuo-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-stone-800">Senarai Jabatan / Panitia</div>
              <div className="text-xs text-stone-500">
                {senJabatan.length} jabatan berdaftar.
              </div>
            </div>
            <Button onClick={bukaTambahJab} className="skeuo-btn h-9 px-4 gap-1.5">
              <Plus size={15} /> Tambah Jabatan
            </Button>
          </div>

          <div className="skeuo-card p-0 overflow-hidden">
            <div className="max-h-[55vh] overflow-y-auto custom-scroll">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-stone-50">
                  <TableRow className="border-stone-200 hover:bg-stone-50">
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Kod</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Nama</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Bil. Staf</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-stone-500 text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memuatJab ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={`jsk-${i}`}>
                        {Array.from({ length: 4 }).map((__, j) => (
                          <TableCell key={`jsc-${i}-${j}`}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : senJabatan.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-stone-500 py-12">
                        <Building2 className="mx-auto mb-2 text-stone-300" size={28} />
                        Tiada jabatan berdaftar. Klik &quot;Tambah Jabatan&quot; untuk mula.
                      </TableCell>
                    </TableRow>
                  ) : (
                    senJabatan.map((j) => (
                      <TableRow key={j.id} className="border-stone-100">
                        <TableCell className="font-mono text-xs text-stone-700">{j.kod}</TableCell>
                        <TableCell className="font-semibold text-stone-800">{j.nama}</TableCell>
                        <TableCell className="text-stone-700 tabular-nums">{j.bilStaf ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => bukaUbahJab(j)}
                            className="h-8 px-2 gap-1 text-stone-700 hover:bg-stone-100"
                          >
                            <Pencil size={13} /> Ubah
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ============= Dialog Staf (Tambah/Ubah) ============= */}
      <Dialog open={dialogStafBuka} onOpenChange={(o) => { if (!o) tutupDialogStaf(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scroll">
          <DialogHeader>
            <DialogTitle>{editStaf ? "Ubah Staf" : "Tambah Staf Baharu"}</DialogTitle>
            <DialogDescription>
              {editStaf
                ? `Kemaskini maklumat staf: ${editStaf.nama}`
                : "Isikan maklumat staf baharu. Kata laluan lalai ialah Demo@1234."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-stone-600">No. ID Staf *</Label>
              <Input
                value={formStaf.noIdStaf}
                onChange={(e) => setFormStaf({ ...formStaf, noIdStaf: e.target.value })}
                className="skeuo-input mt-1"
                placeholder="cth: G013"
                disabled={!!editStaf}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Nama Penuh *</Label>
              <Input
                value={formStaf.nama}
                onChange={(e) => setFormStaf({ ...formStaf, nama: e.target.value })}
                className="skeuo-input mt-1"
                placeholder="Nama staf"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">No. K/P (samarkan)</Label>
              <Input
                value={formStaf.noKpSamar}
                onChange={(e) => setFormStaf({ ...formStaf, noKpSamar: e.target.value })}
                className="skeuo-input mt-1"
                placeholder="850101-14-5521"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Jantina</Label>
              <RadioGroup
                value={formStaf.jantina}
                onValueChange={(v) => setFormStaf({ ...formStaf, jantina: v as Jantina })}
                className="mt-2 flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="L" id="jantina-l" />
                  <Label htmlFor="jantina-l" className="text-sm font-normal">Lelaki</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="P" id="jantina-p" />
                  <Label htmlFor="jantina-p" className="text-sm font-normal">Perempuan</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Jawatan *</Label>
              <Input
                value={formStaf.jawatan}
                onChange={(e) => setFormStaf({ ...formStaf, jawatan: e.target.value })}
                className="skeuo-input mt-1"
                placeholder="cth: Guru Bahasa Melayu"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Kategori</Label>
              <Select
                value={formStaf.kategori}
                onValueChange={(v) => setFormStaf({ ...formStaf, kategori: v as KategoriStaf })}
              >
                <SelectTrigger className="skeuo-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Guru">Guru</SelectItem>
                  <SelectItem value="StafSokongan">Staf Sokongan</SelectItem>
                  <SelectItem value="Pentadbiran">Pentadbiran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Jabatan / Panitia</Label>
              <Select
                value={formStaf.jabatanId}
                onValueChange={(v) => setFormStaf({ ...formStaf, jabatanId: v })}
              >
                <SelectTrigger className="skeuo-input mt-1"><SelectValue placeholder="— Tiada —" /></SelectTrigger>
                <SelectContent>
                  {senJabatan.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.nama} ({j.kod})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Peranan</Label>
              <Select
                value={formStaf.peranan}
                onValueChange={(v) => setFormStaf({ ...formStaf, peranan: v as Peranan })}
              >
                <SelectTrigger className="skeuo-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LABEL_PERANAN).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Emel</Label>
              <Input
                type="email"
                value={formStaf.emel}
                onChange={(e) => setFormStaf({ ...formStaf, emel: e.target.value })}
                className="skeuo-input mt-1"
                placeholder="nama@alamin.edu.my"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Telefon</Label>
              <Input
                value={formStaf.telefon}
                onChange={(e) => setFormStaf({ ...formStaf, telefon: e.target.value })}
                className="skeuo-input mt-1"
                placeholder="012-3456789"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Tarikh Lantik</Label>
              <Input
                type="date"
                value={formStaf.tarikhLantik}
                onChange={(e) => setFormStaf({ ...formStaf, tarikhLantik: e.target.value })}
                className="skeuo-input mt-1"
              />
            </div>
            {!editStaf && (
              <div>
                <Label className="text-xs font-semibold text-stone-600">Kata Laluan Awal</Label>
                <Input
                  value={formStaf.kataLaluan}
                  onChange={(e) => setFormStaf({ ...formStaf, kataLaluan: e.target.value })}
                  className="skeuo-input mt-1"
                  placeholder="Demo@1234"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Staf akan diminta menukar kata laluan selepas log masuk pertama.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={tutupDialogStaf} className="h-9">Batal</Button>
            <Button
              onClick={hantarStafFn}
              disabled={hantarStaf}
              className="skeuo-btn h-9 gap-1.5"
            >
              {hantarStaf && <Loader2 size={15} className="animate-spin" />}
              {editStaf ? "Simpan Perubahan" : "Tambah Staf"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============= Dialog Jabatan (Tambah/Ubah) ============= */}
      <Dialog open={dialogJabBuka} onOpenChange={(o) => { if (!o) tutupDialogJab(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editJab ? "Ubah Jabatan" : "Tambah Jabatan Baharu"}</DialogTitle>
            <DialogDescription>
              {editJab
                ? `Kemaskini maklumat jabatan: ${editJab.nama}`
                : "Tambah jabatan / panitia baharu untuk sekolah."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-stone-600">Nama Jabatan *</Label>
              <Input
                value={formJab.nama}
                onChange={(e) => setFormJab({ ...formJab, nama: e.target.value })}
                className="skeuo-input mt-1"
                placeholder="cth: Panitia Sains"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Kod *</Label>
              <Input
                value={formJab.kod}
                onChange={(e) => setFormJab({ ...formJab, kod: e.target.value.toUpperCase() })}
                className="skeuo-input mt-1 font-mono"
                placeholder="cth: SN"
                maxLength={8}
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Kod ringkas unik (huruf besar).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={tutupDialogJab} className="h-9">Batal</Button>
            <Button
              onClick={hantarJabFn}
              disabled={hantarJab}
              className="skeuo-btn h-9 gap-1.5"
            >
              {hantarJab && <Loader2 size={15} className="animate-spin" />}
              {editJab ? "Simpan Perubahan" : "Tambah Jabatan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============= Pengesahan tindakan ============= */}
      <AlertDialog
        open={!!pengesahan}
        onOpenChange={(o) => { if (!o) setPengesahan(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pengesahan?.jenis === "aktif"
                ? pengesahan.staf.aktif
                  ? "Nyahaktifkan Staf?"
                  : "Aktifkan Semula Staf?"
                : "Reset Kata Laluan?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pengesahan?.jenis === "aktif" ? (
                pengesahan.staf.aktif
                  ? `${pengesahan.staf.nama} tidak akan dapat log masuk selepas dinyahaktifkan. Rekod sedia ada kekal.`
                  : `${pengesahan.staf.nama} akan diaktifkan semula dan boleh log masuk seperti biasa.`
              ) : (
                <>
                  Kata laluan <strong>{pengesahan?.staf.nama}</strong> akan diset semula kepada
                  {" "}<code className="font-mono">Demo@1234</code>. Staf perlu menukar kata laluan
                  {" "}selepas log masuk berikutnya.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9" disabled={memproses}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="h-9 gap-1.5"
              disabled={memproses}
              onClick={(e) => {
                e.preventDefault();
                if (!pengesahan) return;
                if (pengesahan.jenis === "aktif") tukarAktif(pengesahan.staf);
                else resetLaluan(pengesahan.staf);
              }}
            >
              {memproses && <Loader2 size={15} className="animate-spin" />}
              Sahkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default StafView;
