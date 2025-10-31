import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans_JP } from "next/font/google"; // 本文用に柔らかいフォントを追加
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans", // 見出し用に --font-heading (globals.cssで定義)
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp", // 本文用に --font-sans (globals.cssで定義)
  subsets: ["latin"],
  weight: ["400", "500", "700"], // 必要なウェイト
  display: "swap",
});

export const metadata: Metadata = {
  title: "EmoCare - AI感情可視化・共感ケア支援システム",
  description: "患者の感情を可視化し、適切なケアを提供するためのシステムです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      {/* エラー修正: <html> と <body> の間に空白やコメントを入れない 
      */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansJp.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}