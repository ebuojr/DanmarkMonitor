import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Danmark Monitor',
    template: '%s — Danmark Monitor',
  },
  description:
    'Realtids situationsoverblik over Danmark — live vejr, energi, transport, vejtrafikk, elpriser, nyheder og Storebælt-kamera i ét command center.',
  keywords: [
    'Danmark', 'live kort', 'vejr', 'DMI', 'energi', 'elspot', 'transport', 'S-tog',
    'metro', 'bus', 'vejtrafikk', 'nyheder', 'Storebælt', 'realtid', 'dashboard',
  ],
  authors: [{ name: 'DanmarkMonitor' }],
  creator: 'DanmarkMonitor',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'da_DK',
    title: 'Danmark Monitor',
    description: 'Realtids situationsoverblik over Danmark — vejr, energi, transport og nyheder.',
    siteName: 'Danmark Monitor',
  },
  twitter: {
    card: 'summary',
    title: 'Danmark Monitor',
    description: 'Realtids situationsoverblik over Danmark — vejr, energi, transport og nyheder.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="overflow-hidden antialiased">{children}</body>
    </html>
  )
}
