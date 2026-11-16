"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { LogMasukSkrin } from "@/views/auth/LogMasukSkrin";
import { AppShell, NamaLaluan } from "@/views/common/AppShell";
import { DashboardView } from "@/views/dashboard/DashboardView";
import { KehadiranSayaView } from "@/views/kehadiran/KehadiranSayaView";
import KioskView from "@/views/kiosk/KioskView";
import { UrusKehadiranView } from "@/views/kehadiran/UrusKehadiranView";
import { CutiSayaView } from "@/views/cuti/CutiSayaView";
import { KelulusanCutiView } from "@/views/cuti/KelulusanCutiView";
import { LaporanView } from "@/views/laporan/LaporanView";
import { StafView } from "@/views/staf/StafView";
import { KalendarView } from "@/views/kalendar/KalendarView";
import TetapanView from "@/views/tetapan/TetapanView";
import AuditView from "@/views/audit/AuditView";
import NotifikasiView from "@/views/notifikasi/NotifikasiView";
import ProfilView from "@/views/profil/ProfilView";

function AppInner() {
  const { staf, memuat } = useAuth();
  const [laluan, setLaluan] = useState<NamaLaluan>("dashboard");
  const [bilNotif, setBilNotif] = useState(0);

  useEffect(() => {
    if (!staf) return;
    apiFetch<{ id: string }[]>("/api/notifikasi")
      .then((data) => setBilNotif(data.filter((n) => !(n as { dibaca?: boolean }).dibaca).length))
      .catch(() => {});
  }, [staf, laluan]);

  if (memuat) {
    return (
      <div className="min-h-screen bg-wood flex items-center justify-center">
        <div className="skeuo-card p-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-700/30 border-t-emerald-700 rounded-full animate-spin" />
          <div className="text-sm text-stone-600">Memuatkan sistem…</div>
        </div>
      </div>
    );
  }

  if (!staf) {
    return <LogMasukSkrin />;
  }

  function tukarLaluan(l: NamaLaluan) {
    setLaluan(l);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const kanak = (() => {
    switch (laluan) {
      case "dashboard": return <DashboardView />;
      case "kehadiran-saya": return <KehadiranSayaView />;
      case "kiosk": return <KioskView />;
      case "kehadiran-urus": return <UrusKehadiranView />;
      case "cuti": return <CutiSayaView />;
      case "cuti-kelulusan": return <KelulusanCutiView />;
      case "laporan": return <LaporanView />;
      case "staf": return <StafView />;
      case "kalendar": return <KalendarView />;
      case "tetapan": return <TetapanView />;
      case "audit": return <AuditView />;
      case "notifikasi": return <NotifikasiView />;
      case "profil": return <ProfilView />;
      default: return <DashboardView />;
    }
  })();

  // Kiosk role langsung papar kiosk tanpa shell
  if (staf.peranan === "Kiosk" && laluan !== "profil") {
    return <KioskView fullscreen />;
  }

  return (
    <AppShell
      laluanAktif={laluan}
      onTukarLaluan={tukarLaluan}
      bilNotifikasiBelumDibaca={bilNotif}
      kanak={kanak}
    />
  );
}

export default function HalamanUtama() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
