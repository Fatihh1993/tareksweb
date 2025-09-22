import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400"], display: "swap" });

export const metadata: Metadata = {
  title: "Tareks Portal",
  description: "Tareks islemlerini yonetin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
