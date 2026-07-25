'use client'
import { useState, FormEvent, FocusEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { register, setToken, setUser } from '@/lib/api'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Validation & Auth State
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)

  // Validation handlers (onBlur)
  function validateNameOnBlur(e: FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim()
    if (!val) {
      setNameError('Full name is required.')
    } else {
      setNameError('')
    }
  }

  function validateEmailOnBlur(e: FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim()
    if (!val) {
      setEmailError('Email address is required.')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailError('Please enter a valid email address.')
    } else {
      setEmailError('')
    }
  }

  function validatePasswordOnBlur(e: FocusEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!val) {
      setPasswordError('Password is required.')
    } else if (val.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
    } else {
      setPasswordError('')
    }
  }

  // Button disabled state: empty fields or validation errors
  const isFormValid = name.trim().length > 0 && email.trim().length > 0 && password.length >= 6 && !nameError && !emailError && !passwordError

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setAuthError('')
    setNameError('')
    setEmailError('')
    setPasswordError('')

    let valid = true
    if (!name.trim()) {
      setNameError('Full name is required.')
      valid = false
    }
    if (!email.trim()) {
      setEmailError('Email address is required.')
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address.')
      valid = false
    }
    if (!password) {
      setPasswordError('Password is required.')
      valid = false
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      valid = false
    }

    if (!valid) return

    setLoading(true)
    try {
      const data = await register(name.trim(), email.trim(), password)
      setToken(data.access_token)
      setUser(data.user)
      router.replace('/sessions')
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 font-sans antialiased text-[#1D1D1F]">
      {/* Centered Single Card Container (Fixed 400px on desktop) */}
      <div 
        className="w-full sm:w-[400px] bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] p-[28px_20px] sm:p-[40px]"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }}
      >
        {/* Logo / Mark */}
        <div className="w-[28px] h-[28px] rounded-[6px] bg-[#0B6E4F] text-white font-bold text-xs flex items-center justify-center mx-auto mb-[16px]">
          G
        </div>

        {/* Heading Block */}
        <div className="text-center mb-[32px]">
          <h1 className="text-[20px] font-[600] text-[#1D1D1F] tracking-tight">
            Create clinician account.
          </h1>
          <p className="text-[13px] font-[400] text-[#6E6E73] mt-[4px]">
            Join the GaitRehab clinical platform.
          </p>
        </div>

        {/* Error Banner */}
        {authError && (
          <div 
            role="alert" 
            className="mb-[16px] bg-[#FCEAE9] border border-[#F5C6C2] rounded-[6px] p-[10px_12px] text-[13px] text-[#B3261E] flex items-center gap-[8px]"
          >
            <AlertCircle className="w-[14px] h-[14px] shrink-0 text-[#B3261E]" />
            <span>{authError}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name Field Block */}
          <div className="mb-[16px]">
            <label htmlFor="name" className="block text-[13px] font-[500] text-[#1D1D1F] mb-[6px]">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError('')
              }}
              onBlur={validateNameOnBlur}
              placeholder="Dr. Viraj Pradhan"
              disabled={loading}
              className={`w-full h-[40px] px-[12px] text-[14px] font-[400] text-[#1D1D1F] bg-[#FFFFFF] border rounded-[6px] placeholder:text-[#6E6E73] transition-all focus:outline-none ${
                nameError
                  ? 'border-[#B3261E]'
                  : 'border-[#E5E5E7] focus:border-[#0B6E4F] focus:shadow-[0_0_0_3px_rgba(11,110,79,0.15)]'
              }`}
            />
            {nameError && (
              <p role="alert" className="text-[12px] font-[400] text-[#B3261E] mt-[4px]">
                {nameError}
              </p>
            )}
          </div>

          {/* Email Field Block */}
          <div className="mb-[16px]">
            <label htmlFor="email" className="block text-[13px] font-[500] text-[#1D1D1F] mb-[6px]">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) setEmailError('')
              }}
              onBlur={validateEmailOnBlur}
              placeholder="clinician@example.com"
              disabled={loading}
              className={`w-full h-[40px] px-[12px] text-[14px] font-[400] text-[#1D1D1F] bg-[#FFFFFF] border rounded-[6px] placeholder:text-[#6E6E73] transition-all focus:outline-none ${
                emailError
                  ? 'border-[#B3261E]'
                  : 'border-[#E5E5E7] focus:border-[#0B6E4F] focus:shadow-[0_0_0_3px_rgba(11,110,79,0.15)]'
              }`}
            />
            {emailError && (
              <p role="alert" className="text-[12px] font-[400] text-[#B3261E] mt-[4px]">
                {emailError}
              </p>
            )}
          </div>

          {/* Password Field Block */}
          <div className="mb-[24px]">
            <label htmlFor="password" className="block text-[13px] font-[500] text-[#1D1D1F] mb-[6px]">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError('')
                }}
                onBlur={validatePasswordOnBlur}
                placeholder="Min 6 characters"
                disabled={loading}
                className={`w-full h-[40px] pl-[12px] pr-[36px] text-[14px] font-[400] text-[#1D1D1F] bg-[#FFFFFF] border rounded-[6px] placeholder:text-[#6E6E73] transition-all focus:outline-none ${
                  passwordError
                    ? 'border-[#B3261E]'
                    : 'border-[#E5E5E7] focus:border-[#0B6E4F] focus:shadow-[0_0_0_3px_rgba(11,110,79,0.15)]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={0}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#6E6E73] hover:text-[#1D1D1F] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E4F] rounded-[4px]"
              >
                {showPassword ? (
                  <EyeOff className="w-[16px] h-[16px]" />
                ) : (
                  <Eye className="w-[16px] h-[16px]" />
                )}
              </button>
            </div>
            {passwordError && (
              <p role="alert" className="text-[12px] font-[400] text-[#B3261E] mt-[4px]">
                {passwordError}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || loading}
            className={`w-full h-[40px] rounded-[6px] font-[500] text-[14px] text-white flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0B6E4F] ${
              !isFormValid
                ? 'bg-[#A8CFC0] cursor-not-allowed'
                : 'bg-[#0B6E4F] hover:opacity-90 active:opacity-85 cursor-pointer'
            }`}
          >
            {loading ? (
              <Loader2 className="w-[16px] h-[16px] animate-spin text-white" />
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>

      {/* Footer Link (Centered Below Card) */}
      <div className="mt-[20px] text-center text-[13px] text-[#6E6E73]">
        Already have an account?{' '}
        <Link 
          href="/login" 
          className="font-[500] text-[#0B6E4F] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E4F] rounded-[2px]"
        >
          Sign in.
        </Link>
      </div>
    </div>
  )
}
