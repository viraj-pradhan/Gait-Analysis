'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const token = localStorage.getItem('gait_token')
    if (token) router.replace('/dashboard')
    else router.replace('/login')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="gradient-text text-2xl font-bold">Loading…</div>
    </div>
  )
}
