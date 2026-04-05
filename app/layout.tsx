import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'Swift-Invoice - Professional GST Invoicing for Indian Businesses',
    template: '%s | Swift-Invoice',
  },
  description: 'Create professional GST-compliant invoices, manage clients, track payments, and generate financial reports. Built for Indian freelancers and small businesses.',
  keywords: ['invoice', 'GST', 'billing', 'India', 'accounting', 'freelancer', 'small business'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
