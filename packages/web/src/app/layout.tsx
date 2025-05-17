import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZoundZ - 1/1 Music NFT Auctions',
  description: 'Auction your music NFTs on Base with Farcaster integration',
  openGraph: {
    title: 'ZoundZ - 1/1 Music NFT Auctions',
    description: 'Auction your music NFTs on Base with Farcaster integration',
    url: 'https://zoundz.xyz',
    siteName: 'ZoundZ',
    images: [
      {
        url: 'https://zoundz.xyz/og.png',
        width: 1200,
        height: 630,
        alt: 'ZoundZ OG Image',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`text-white bg-slate-900 ${inter.className}`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
