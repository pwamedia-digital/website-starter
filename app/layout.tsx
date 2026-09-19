import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' })

const noindex = process.env.NEXT_PUBLIC_NOINDEX !== 'false'

export const metadata: Metadata = {
  title: 'PWAMEDIA Website Starter',
  description: 'Herbruikbare websitebasis voor PWAMEDIA-klanten.',
  icons: { icon: '/favicon.svg' },
  robots: noindex
    ? { index: false, follow: false, nocache: true }
    : { index: true, follow: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body className={`${inter.variable} ${manrope.variable}`}>{children}</body>
    </html>
  )
}
