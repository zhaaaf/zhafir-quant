import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zhafir's Quant Investing",
  description: "Portfolio optimization using mathematical models: Markowitz MVO, CVaR, Random Matrix Theory, Quantum-Inspired, Maximum Entropy.",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="bg-[#0a0a0f] text-[#cdd6f4] h-full">
        <Sidebar />
        {/* Desktop: offset left by sidebar width. Mobile: full width + bottom nav padding */}
        <main className="md:ml-56 min-h-screen pb-20 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
