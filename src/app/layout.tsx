import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "LagerApp — Склад",
  description: "Складський облік радіодеталей та автозапчастин",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex bg-background text-foreground`}>
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
