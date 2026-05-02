import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Danmark Monitor',
  description: 'Real-time Danish situational awareness dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="overflow-hidden antialiased">{children}</body>
    </html>
  )
}
