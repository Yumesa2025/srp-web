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
  title: "Smart Raid Planner (SRP) 베타",
  description: "WoW 공대 구성, 전술 편집, 클리닉 분석을 한 곳에서. Smart Raid Planner.",
  openGraph: {
    title: "Smart Raid Planner (SRP) 베타",
    description: "WoW 공대 구성, 전술 편집, 클리닉 분석을 한 곳에서. Smart Raid Planner.",
    url: "https://healthy-feedback.com",
    siteName: "Smart Raid Planner",
    images: [
      {
        url: "https://healthy-feedback.com/og/srp.jpg",
        width: 1200,
        height: 630,
        alt: "Smart Raid Planner (SRP)",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Raid Planner (SRP) 베타",
    description: "WoW 공대 구성, 전술 편집, 클리닉 분석을 한 곳에서. Smart Raid Planner.",
    images: ["https://healthy-feedback.com/og/srp.jpg"],
  },
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
