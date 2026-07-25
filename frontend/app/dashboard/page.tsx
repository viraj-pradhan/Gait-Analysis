'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { StatCard } from '@/components/ui/StatCard'
import { RecoveryTrendChart } from '@/components/charts/RecoveryTrendChart'
import { getToken, listSessions } from '@/lib/api'
import { buildTrendChartData, type SessionEntry } from '@/lib/session-utils'
import { getConfidenceTier } from '@/lib/badges'
import { Activity, TrendingUp, ShieldCheck, ChevronRight, Users, User } from 'lucide-react'

export default function DashboardOverviewPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!getToken()) {
      router.replace('/login')
      return
    }
    listSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [router])

  const validSessions = sessions.filter((s) => s.status === 'success')
  const totalSessions = sessions.length
  const uniquePatients = new Set(validSessions.map((s) => s.patient_name || s.session_id)).size
  const avgCadence = validSessions.length
    ? (validSessions.reduce((acc, s) => acc + (s.cadence_spm || 0), 0) / validSessions.length).toFixed(1)
    : '0.0'
  const avgConfidence = validSessions.length
    ? ((validSessions.reduce((acc, s) => acc + (s.mean_confidence || 0), 0) / validSessions.length) * 100).toFixed(1)
    : '0.0'

  const chartData = buildTrendChartData(sessions)
  const recentSessions = [...sessions].slice(0, 6)

  return (
    <AppShell>
      <div className="space-y-6 font-sans">
        {/* Banner */}
        <div className="page-banner">
          <div className="page-header">
            <h1 className="page-title">Clinical Overview</h1>
            <p className="page-subtitle">
              Track patient gait recovery with cadence trends, joint ROM analysis, and MediaPipe tracking quality across all sessions.
            </p>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Sessions" value={totalSessions} sub="Completed evaluations" icon={Activity} accent="green" />
          <StatCard label="Patients" value={uniquePatients} sub="Unique patient records" icon={Users} accent="blue" />
          <StatCard
            label="Avg Cadence"
            value={<>{avgCadence} <span className="text-xs font-semibold text-[#6E6E73]">spm</span></>}
            sub="Steps per minute"
            icon={TrendingUp}
            accent="green"
          />
          <StatCard label="Tracking Quality" value={`${avgConfidence}%`} sub="Mean pose confidence" icon={ShieldCheck} accent="amber" />
        </div>

        {/* Recovery Trend Chart Card */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] p-[24px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-[600] text-[#1D1D1F]">Recovery Trend Across Sessions</h3>
              <p className="text-[13px] font-[400] text-[#6E6E73] mt-[2px]">Cadence and tracking confidence over time — dual-axis for accurate comparison</p>
            </div>
            <Link href="/sessions" className="text-[13px] font-[500] text-[#0B6E4F] hover:underline flex items-center gap-[4px] shrink-0">
              All Sessions <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {mounted && <RecoveryTrendChart data={chartData} height={280} />}
        </div>

        {/* Recent Sessions Card */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] overflow-hidden">
          {/* Header Row (56px Height) */}
          <div className="h-[56px] px-[16px] border-b border-[#E5E5E7] flex items-center justify-between">
            <h3 className="text-[16px] font-[600] text-[#1D1D1F]">Recent Sessions</h3>
            <Link href="/sessions" className="text-[13px] font-[500] text-[#0B6E4F] hover:underline">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[13px] text-[#6E6E73]">Loading sessions…</div>
          ) : recentSessions.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-[#6E6E73]">No sessions recorded yet. Upload a video to get started.</div>
          ) : (
            <div>
              {recentSessions.map((s, idx) => {
                const [datePart, sessionPart] = s.session_id.split('/')
                const tier = getConfidenceTier(s.mean_confidence)
                const num = s.session_number || idx + 1
                const dateStr = s.recorded_date || s.date || datePart
                const titleText = `Session ${num} — ${dateStr}`
                const patientText = s.patient_name || 'Unassigned Patient'

                return (
                  <Link
                    key={s.session_id}
                    href={`/sessions/${datePart}/${sessionPart}`}
                    className={`h-[64px] px-[16px] flex items-center justify-between hover:bg-[#FAFAFA] transition-colors ${
                      idx > 0 ? 'border-t border-[#E5E5E7]' : ''
                    }`}
                  >
                    {/* Left side: Avatar + Session Title + Meta */}
                    <div className="flex items-center min-w-0">
                      <div className="w-[32px] h-[32px] rounded-[6px] bg-[#E7F5EA] text-[#0B6E4F] flex items-center justify-center font-bold shrink-0 mr-[12px]">
                        <User className="w-[16px] h-[16px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-[500] text-[#1D1D1F] truncate">
                          {titleText}
                        </p>
                        <p className="text-[12px] font-[400] text-[#6E6E73] mt-[2px] truncate">
                          {patientText} · {s.duration_sec || 0}s · <span className="font-[500] text-[#0B6E4F]">{s.cadence_spm || 0} spm</span>
                        </p>
                      </div>
                    </div>

                    {/* Right side: Badge + Chevron (8px gap) */}
                    <div className="flex items-center gap-[8px] shrink-0">
                      <span 
                        className="text-[11px] font-[500] px-[8px] py-[2px] rounded-[4px]"
                        style={{ color: tier.textColor, backgroundColor: tier.bgColor }}
                      >
                        {tier.fullLabel}
                      </span>
                      <ChevronRight className="w-[16px] h-[16px] text-[#6E6E73]" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
