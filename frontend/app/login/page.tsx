'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login, setToken, setUser } from '@/lib/api'
import { Activity } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      setToken(data.access_token)
      setUser(data.user)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0B6E4F] via-[#08553d] to-[#064E3B] p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-emerald-300 blur-3xl" />
        </div>
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold text-xl mb-8">
            G
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
            Underwater Gait<br />Analysis Platform
          </h1>
          <p className="text-emerald-100/80 mt-4 text-sm leading-relaxed max-w-sm">
            AI-powered joint angle tracking, ROM analysis, and recovery trend monitoring for clinical rehabilitation.
          </p>
        </div>
        <div className="relative flex items-center gap-3 text-emerald-100/70 text-xs">
          <Activity className="w-4 h-4" />
          MediaPipe pose · Matplotlib reports · Interactive charts
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#F4F6F8]">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden text-center mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0B6E4F] to-[#08553d] text-white font-bold text-lg mx-auto flex items-center justify-center mb-3 shadow-sm">
              G
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">GaitRehab</h1>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-md space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Sign in</h2>
              <p className="text-sm text-slate-500 mt-1">Access your clinical dashboard</p>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-sm font-medium text-red-700 bg-red-50 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
                <input
                  type="email"
                  className="input-form"
                  placeholder="clinician@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password</label>
                <input
                  type="password"
                  className="input-form"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-accent w-full justify-center h-11 text-sm mt-1" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="text-sm text-slate-500 text-center pt-2">
              No account?{' '}
              <Link href="/register" className="text-[#0B6E4F] font-semibold hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
