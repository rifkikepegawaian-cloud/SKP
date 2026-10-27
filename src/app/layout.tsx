import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HRIS Smart-Performance — SKP Universitas Diponegoro",
  description: "Sistem Manajemen Kinerja Terintegrasi Universitas Diponegoro. Platform SKP digital berbasis IKU untuk PNS dan Tenaga Kependidikan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
      </head>
      <body className="min-h-screen text-on-surface font-body-md antialiased">
        {children}
      </body>
    </html>
  );
}
