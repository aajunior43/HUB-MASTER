import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PDFMaster Pro - Editor de PDF Online",
  description: "Plataforma web revolucionária para edição, manipulação e gerenciamento de documentos PDF. Edite texto, adicione anotações, assinaturas digitais e muito mais.",
  keywords: "PDF, editor, online, assinatura digital, anotações, conversão, OCR, segurança",
  authors: [{ name: "PDFMaster Pro Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#3B82F6",
  openGraph: {
    title: "PDFMaster Pro - Editor de PDF Online",
    description: "A solução completa para visualizar, editar e converter seus documentos PDF",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
