import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cálculos de Porcentagem",
  description: "Calculadoras de porcentagem rápidas e precisas, com explicações claras.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50`}>
        <div className="min-h-dvh flex flex-col">
          <header className="sticky top-0 z-50 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-zinc-950/60">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <a href="/" className="text-lg font-semibold">Cálculos de Porcentagem</a>
              <div className="flex items-center gap-3">
                <a href="/about" className="text-sm hover:underline">Como funciona</a>
                <a href="/feedback" className="text-sm hover:underline">Contato/Feedback</a>
                <a href="/history" className="text-sm hover:underline">Histórico</a>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="max-w-6xl mx-auto px-4 py-4 space-y-1">
              <p>Os resultados são fornecidos sem garantias; verifique antes de decisões importantes.</p>
              <p className="uppercase tracking-wide">DEV ALEKSANDRO ALVES</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
