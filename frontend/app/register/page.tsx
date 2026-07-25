'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { register, setToken, setUser } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 font-sans text-[#1D1D1F]">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-md bg-[#0B6E4F] text-white font-bold text-lg mx-auto flex items-center justify-center mb-3">
            G
          </div>
          <h1 className="text-xl font-semibold text-[#1D1D1F] tracking-tight">Create Clinician Account</h1>
          <p className="text-xs text-[#6E6E73] mt-1">Join the GaitRehab Platform</p>
        </div>

        <div className="card-surface p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-md text-xs font-medium text-[#B3261E] bg-[#FDF2F2] border border-[#B3261E]/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">Full Name</label>
              <input
                id="name"
                type="text"
                className="input-form"
                placeholder="Dr. Viraj Pradhan"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">Email Address</label>
              <input
                id="email"
                type="email"
                className="input-form"
                placeholder="clinician@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                className="input-form"
                placeholder="Min 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              id="register-btn"
              type="submit"
              className="btn-accent w-full justify-center h-10 mt-2 text-xs"
              disabled={loading}
            >
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#E5E5E7] text-center">
            <p className="text-xs text-[#6E6E73]">
              Already have an account?{' '}
              <Link href="/login" className="text-[#0B6E4F] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
