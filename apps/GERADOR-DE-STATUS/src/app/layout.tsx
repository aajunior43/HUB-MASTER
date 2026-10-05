import type { Metadata } from "next";
import { Inter, Playfair_Display, Montserrat, Poppins, Lato, Open_Sans, Crimson_Text } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-opensans",
  display: "swap",
});

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-crimson",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StatusAI Creator - Crie Status Incríveis com IA",
    template: "%s | StatusAI Creator",
  },
  description: "Transforme suas ideias em imagens de status profissionais para redes sociais. Design elegante, IA avançada e resultados instantâneos.",
  keywords: [
    "status creator",
    "IA",
    "inteligência artificial", 
    "design",
    "redes sociais",
    "Instagram",
    "stories",
    "Gemini AI"
  ],
  authors: [{ name: "StatusAI Team" }],
  creator: "StatusAI Creator",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://statusai.com.br",
    title: "StatusAI Creator - Crie Status Incríveis com IA",
    description: "Transforme suas ideias em imagens de status profissionais para redes sociais. Design elegante, IA avançada e resultados instantâneos.",
    siteName: "StatusAI Creator",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "StatusAI Creator - Crie Status Incríveis com IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StatusAI Creator - Crie Status Incríveis com IA",
    description: "Transforme suas ideias em imagens de status profissionais para redes sociais.",
    images: ["/og-image.jpg"],
    creator: "@statusai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  other: {
    "theme-color": "#D4AF37",
    "color-scheme": "dark",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} ${playfair.variable} ${montserrat.variable} ${poppins.variable} ${lato.variable} ${openSans.variable} ${crimsonText.variable} font-inter antialiased bg-black-deep text-white-pure`}>
        {children}
      </body>
    </html>
  );
}
