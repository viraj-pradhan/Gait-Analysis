'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { StatCard } from '@/components/ui/StatCard'
import { RecoveryTrendChart } from '@/components/charts/RecoveryTrendChart'
import { getToken, listSessions } from '@/lib/api'
import { buildTrendChartData, getConfidenceBadge, type SessionEntry } from '@/lib/session-utils'
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
      <div className="space-y-6">
        <div className="page-banner">
          <div className="page-header">
            <h1 className="page-title">Clinical Overview</h1>
            <p className="page-subtitle">
              Track patient gait recovery with cadence trends, joint ROM analysis, and MediaPipe tracking quality across all sessions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Sessions" value={totalSessions} sub="Completed evaluations" icon={Activity} accent="green" />
          <StatCard label="Patients" value={uniquePatients} sub="Unique patient records" icon={Users} accent="blue" />
          <StatCard
            label="Avg Cadence"
            value={<>{avgCadence} <span className="text-sm font-semibold text-slate-400">spm</span></>}
            sub="Steps per minute"
            icon={TrendingUp}
            accent="green"
          />
          <StatCard label="Tracking Quality" value={`${avgConfidence}%`} sub="Mean pose confidence" icon={ShieldCheck} accent="amber" />
        </div>

        {/* Recovery Trend Dual-Axis Line Chart */}
        <div className="section-card section-card-padded">
          <div className="section-card-header">
            <div>
              <h3 className="section-card-title">Recovery Trend Across Sessions</h3>
              <p className="section-card-desc">Cadence and tracking confidence over time — dual-axis for accurate comparison</p>
            </div>
            <Link href="/sessions" className="text-xs text-[#0B6E4F] font-bold hover:underline flex items-center gap-1 shrink-0">
              All Sessions <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {mounted && <RecoveryTrendChart data={chartData} height={300} />}
        </div>

        {/* Recent Sessions Table */}
        <div className="section-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/80">
            <h3 className="text-sm font-bold text-slate-900">Recent Sessions</h3>
            <Link href="/sessions" className="text-xs text-[#0B6E4F] font-bold hover:underline">View all</Link>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">Loading sessions…</div>
          ) : recentSessions.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No sessions yet. Upload a gait video to get started.</div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {recentSessions.map((s) => {
                const [datePart, sessionPart] = s.session_id.split('/')
                const badge = getConfidenceBadge(s.mean_confidence || 0)
                return (
                  <Link
                    key={s.session_id}
                    href={`/sessions/${datePart}/${sessionPart}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#0B6E4F] font-bold text-sm shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{s.patient_name || 'Patient'} — {s.session_label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {s.recorded_date || s.date} · {s.duration_sec}s · <span className="text-[#0B6E4F] font-semibold">{s.cadence_spm} spm</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`badge-soft ${badge.class} hidden sm:inline-flex`}>{badge.label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0B6E4F] transition-colors" />
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
