import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'PWAMEDIA Website Starter',
  description: 'Herbruikbare websitebasis voor PWAMEDIA-klanten.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body className={`${inter.variable} ${manrope.variable}`}>{children}</body>
    </html>
  )
}
