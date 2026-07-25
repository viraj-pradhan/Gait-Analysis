import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GaitRehab – Underwater Gait Analysis',
  description: 'AI-powered underwater gait analysis for physiotherapy and rehabilitation. Upload a video and get instant joint angle reports, annotated video, and downloadable clinical reports.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="relative z-10">{children}</body>
    </html>
  )
}
