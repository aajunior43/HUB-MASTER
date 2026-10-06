import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider } from './context/ThemeContext'
import SkipLinks from './components/accessibility/SkipLinks'
import AccessibilityToolbar from './components/accessibility/AccessibilityToolbar'
import ToastSystem from './components/ToastSystem'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Diagramas IA - Criação Inteligente de Diagramas',
  description: 'Plataforma avançada para criação automática de diagramas usando Inteligência Artificial. Crie fluxogramas, mapas mentais, diagramas de classe e muito mais com apenas um prompt.',
  keywords: 'diagramas, fluxogramas, IA, Gemini, editor visual, criação automática, mapas mentais, UML, arquitetura, design',
  authors: [{ name: 'Equipe Diagramas IA' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'Diagramas IA - Criação Inteligente de Diagramas',
    description: 'Crie diagramas profissionais automaticamente usando IA. Rápido, intuitivo e poderoso.',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Diagramas IA',
    description: 'Criação automática de diagramas com IA',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <ThemeProvider>
            {/* Skip Links para acessibilidade */}
            <SkipLinks />
            
            {/* Conteúdo principal */}
            <div id="root">
              {children}
            </div>
            
            {/* Ferramentas de acessibilidade */}
            <AccessibilityToolbar />
            
            {/* Sistema de toast global */}
            <ToastSystem position="bottom-right" maxToasts={5} />
            
            {/* Screen reader announcements */}
            <div id="aria-live-region" aria-live="polite" aria-atomic="true" className="sr-only" />
            <div id="aria-live-assertive" aria-live="assertive" aria-atomic="true" className="sr-only" />
          </ThemeProvider>
        </ErrorBoundary>
        
        {/* Service Worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('SW registered: ', registration);
                  }).catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}