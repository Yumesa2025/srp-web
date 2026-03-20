import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import PostHogProvider from "./components/analytics/PostHogProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Raid Planner (SRP)",
  description: "WoW 공대 구성, 전술 편집, 클리닉 분석을 한 곳에서. Smart Raid Planner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
      >
        <PostHogProvider>
          <Header />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
