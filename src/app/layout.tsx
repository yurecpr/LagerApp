import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "SpeedLabor — LagerApp",
  description: "Warehouse inventory / Складський облік",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className="h-full antialiased">
      <body className="min-h-full flex bg-background text-foreground font-sans">
        <LanguageProvider>
          <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
