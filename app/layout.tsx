import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OAuthDomainRedirector from "@/components/oauth/OAuthDomainRedirector";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Performance optimization
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Performance optimization
  preload: false, // Only preload main font
});

export const metadata: Metadata = {
  title: "DocMile - Generador Professional de Documents",
  description: "Transforma plantilles Word i dades Excel en documents personalitzats amb qualitat professional",
  keywords: ["documents", "word", "excel", "plantilles", "generador"],
  authors: [{ name: "Aitor Gilabert Juan" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100`}
      >
        <OAuthDomainRedirector />
        {children}
      </body>
    </html>
  );
}
