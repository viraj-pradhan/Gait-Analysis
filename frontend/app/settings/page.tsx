'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { getToken, getUser } from '@/lib/api'
import { Settings, User, Database, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    setUser(getUser())
  }, [router])

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-[#FFFFFF] to-[#E7F5EA]/40 p-6 rounded-2xl border border-[#E5E5E7] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#E7F5EA] text-[#0B6E4F] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#0B6E4F]/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> System Preferences
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Clinical Settings & Parameters</h1>
            <p className="text-xs text-[#6E6E73] mt-1">Configure user profile, database connections, and pose pipeline engine</p>
          </div>
        </div>

        {/* Account Info Card */}
        <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E5E5E7] shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#E5E5E7] pb-3">
            <div className="w-8 h-8 rounded-full bg-[#E7F5EA] border border-[#0B6E4F]/20 flex items-center justify-center text-[#0B6E4F]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">Clinician Account Profile</h3>
              <p className="text-xs text-[#6E6E73]">Authenticated clinician user details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7]">
              <span className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wider block mb-1">Clinician Name</span>
              <span className="font-bold text-[#1D1D1F] text-sm">{user?.name || 'Dr. Viraj Pradhan'}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7]">
              <span className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wider block mb-1">Email Address</span>
              <span className="font-bold text-[#1D1D1F] text-sm">{user?.email || 'pradhanviraj48@gmail.com'}</span>
            </div>
          </div>
        </div>

        {/* System & Database Info Card */}
        <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E5E5E7] shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#E5E5E7] pb-3">
            <div className="w-8 h-8 rounded-full bg-[#EAF5ED] border border-[#1E7B34]/20 flex items-center justify-center text-[#1E7B34]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">Database & Kinematics Engine</h3>
              <p className="text-xs text-[#6E6E73]">Storage registry & pose detection parameters</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7]">
              <div>
                <span className="font-bold text-[#1D1D1F] block text-sm">Storage Registry</span>
                <span className="text-[11px] text-[#6E6E73]">Per-session metadata registry index</span>
              </div>
              <span className="font-mono text-xs font-semibold text-[#0B6E4F] bg-[#E7F5EA] px-3 py-1.5 rounded-lg border border-[#0B6E4F]/20">
                sessions/index.json
              </span>
            </div>

            <div className="flex justify-between items-center p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7]">
              <div>
                <span className="font-bold text-[#1D1D1F] block text-sm">MediaPipe Pose Tracking Engine</span>
                <span className="text-[11px] text-[#6E6E73]">Pinned for 3D landmark visibility stability</span>
              </div>
              <span className="font-semibold text-xs text-[#1E7B34] bg-[#EAF5ED] px-3 py-1.5 rounded-lg border border-[#1E7B34]/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> v0.10.14 Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
