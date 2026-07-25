'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login, setToken, setUser } from '@/lib/api'
import { Activity, Mail, Lock, Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      setError(err.message || 'Authentication failed. Please check your credentials.')
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
            <span>AI-Powered Biomechanics Telemetry v2.4</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight max-w-lg">
            Precision Underwater Gait & Joint Trajectory Intelligence
          </h1>
          <p className="text-emerald-100/70 text-sm leading-relaxed mt-4 max-w-md">
            Automated pose estimation, 3D joint angle ROM calculation, step detection, and automated Word report generation for rehabilitation clinics.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-4 my-8">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <Activity className="w-4 h-4" />
              <span>Sub-second Pose Tracking</span>
            </div>
            <p className="text-xs text-slate-300/80">Real-time MediaPipe skeletal tracking with CLAHE frame enhancement.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Clinical Compliance</span>
            </div>
            <p className="text-xs text-slate-300/80">Standardized ROM metrics, Pearson correlation, and automated reports.</p>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-emerald-800/40 flex items-center justify-between text-xs text-emerald-200/60 font-medium">
          <span>© 2026 GaitRehab Clinical Suite</span>
          <div className="flex items-center gap-4">
            <span>HIPAA Ready</span>
            <span>·</span>
            <span>Multi-Joint Telemetry</span>
          </div>
        </div>
      </div>

      {/* Right panel — Modern Authentication Form Card */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 bg-[#0F172A] relative">
        <div className="hidden lg:block absolute top-6 right-6 text-xs text-slate-400 font-medium">
          Need assistance? <a href="#" className="text-emerald-400 hover:underline">Contact Support</a>
        </div>

        <div className="w-full max-w-md mx-auto my-auto space-y-8">
          {/* Mobile Header Logo */}
          <div className="lg:hidden text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-[#0B6E4F] text-white font-black text-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-950/50">
              G
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">GaitRehab</h1>
            <p className="text-xs text-slate-400">Clinical Underwater Gait Intelligence</p>
          </div>

          {/* Form Header */}
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to Account</h2>
            <p className="text-xs text-slate-400 mt-1">Enter your clinician credentials to access patient telemetry</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 animate-shake">
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <a href="#" className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20" defaultChecked />
                <span>Keep me signed in</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-[#0B6E4F] hover:from-emerald-400 hover:to-[#08553d] text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Redirect */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-center text-xs text-slate-400">
            Don&apos;t have a clinician account?{' '}
            <Link href="/register" className="text-emerald-400 font-bold hover:underline">
              Create New Account
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
