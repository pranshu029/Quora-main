import React from 'react'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Source_Serif_4 } from 'next/font/google'

import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import Navbar from '@/components/navbar'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'QuestHub - Community Q&A',
  description: 'Ask questions, share knowledge, and connect with experts',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${sourceSerif.variable} bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <Navbar />
          <main className="min-h-[calc(100svh-4rem)]">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
