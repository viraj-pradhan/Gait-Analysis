'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { register, setToken, setUser } from '@/lib/api'
import { Activity, Mail, Lock, User, Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const data = await register(name, email, password)
      setToken(data.access_token)
      setUser(data.user)
      router.replace('/sessions')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0A0F1D] text-slate-100 font-sans selection:bg-[#0B6E4F] selection:text-white">
      {/* Left panel — Premium Clinical Branding Banner */}
      <div className="hidden lg:flex lg:w-7/12 bg-gradient-to-br from-[#0A261E] via-[#0B4F3A] to-[#042B1E] p-16 flex-col justify-between relative overflow-hidden border-r border-emerald-900/30">
        {/* Glowing Background Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/20 blur-[120px]" />
          <div className="absolute top-1/2 right-10 w-[30rem] h-[30rem] rounded-full bg-teal-400/15 blur-[140px]" />
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-emerald-700/25 blur-[100px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
        </div>

        {/* Top Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-[#0B6E4F] flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-emerald-900/50 border border-emerald-300/30">
              G
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white block">GaitRehab</span>
              <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-widest block">Clinical Platform</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Join Clinician Network</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight max-w-lg">
            Create Your Medical Account & Access Gait Telemetry
          </h1>
          <p className="text-emerald-100/70 text-sm leading-relaxed mt-4 max-w-md">
            Generate Word (.docx) reports, compute Pearson joint correlation, and monitor patient recovery curves with MediaPipe tracking.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-4 my-8">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <Activity className="w-4 h-4" />
              <span>Multi-Joint ROM</span>
            </div>
            <p className="text-xs text-slate-300/80">Knee, Hip, and Ankle flexion & extension angle calculation.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Secure Storage</span>
            </div>
            <p className="text-xs text-slate-300/80">MongoDB encrypted patient records & video session exports.</p>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-emerald-800/40 flex items-center justify-between text-xs text-emerald-200/60 font-medium">
          <span>© 2026 GaitRehab Clinical Suite</span>
          <span>Fast & Secure Registration</span>
        </div>
      </div>

      {/* Right panel — Registration Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 bg-[#0F172A] relative">
        <div className="w-full max-w-md mx-auto my-auto space-y-8">
          {/* Mobile Header Logo */}
          <div className="lg:hidden text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-[#0B6E4F] text-white font-black text-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-950/50">
              G
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">GaitRehab</h1>
            <p className="text-xs text-slate-400">Clinical Account Setup</p>
          </div>

          {/* Form Header */}
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create Clinician Account</h2>
            <p className="text-xs text-slate-400 mt-1">Fill in your details to start analyzing gait telemetry</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Viraj Pradhan"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="clinician@hospital.org"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-[#0B6E4F] hover:from-emerald-400 hover:to-[#08553d] text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account…</span>
                </>
              ) : (
                <>
                  <span>Complete Account Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Redirect */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500 pt-6">
          Encrypted TLS 1.3 · GaitRehab Medical Telemetry Server
        </div>
      </div>
    </div>
  )
}
