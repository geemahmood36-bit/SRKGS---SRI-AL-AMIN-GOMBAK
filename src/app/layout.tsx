import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SRKGS — Sistem Rekod Kehadiran Guru & Staf | SRI Al-Amin Gombak",
  description:
    "Sistem rekod kehadiran guru dan staf Sekolah Rendah Islam Al-Amin Gombak. Prototaip mod demo dengan data rekaan.",
  keywords: [
    "kehadiran",
    "guru",
    "staf",
    "sekolah",
    "Al-Amin",
    "Gombak",
    "SRKGS",
  ],
  authors: [{ name: "Pentadbir Sekolah SRI Al-Amin Gombak" }],
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-center" />
      </body>
    </html>
  );
}
