'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { StatCard } from '@/components/ui/StatCard'
import { RecoveryTrendChart } from '@/components/charts/RecoveryTrendChart'
import { getToken, listSessions, updateSessionPatientName } from '@/lib/api'
import { buildTrendChartData, type SessionEntry } from '@/lib/session-utils'
import { getConfidenceTier } from '@/lib/badges'
import { 
  Activity, 
  Clock, 
  ChevronRight, 
  TrendingUp, 
  User, 
  Search, 
  Pencil, 
  Check, 
  X
} from 'lucide-react'

export default function SessionsDashboardPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterQuality, setFilterQuality] = useState<'all' | 'good' | 'fair' | 'low'>('all')

  // Patient Name Editing State
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!getToken()) {
      router.replace('/login')
      return
    }
    fetchData()
  }, [router])

  async function fetchData() {
    try {
      const data = await listSessions()
      setSessions(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSavePatientName(sessionId: string) {
    if (!editNameValue.trim()) return
    const [datePart, sessionPart] = sessionId.split('/')
    setSavingName(true)
    try {
      await updateSessionPatientName(datePart, sessionPart, editNameValue.trim())
      setEditingSessionId(null)
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to update patient name')
    } finally {
      setSavingName(false)
    }
  }

  const validSessions = sessions.filter(s => s.status === 'success')
  const totalSessions = sessions.length
  const avgCadence = validSessions.length > 0 
    ? (validSessions.reduce((acc, s) => acc + (s.cadence_spm || 0), 0) / validSessions.length).toFixed(1)
    : '0.0'
  const avgConfidence = validSessions.length > 0
    ? ((validSessions.reduce((acc, s) => acc + (s.mean_confidence || 0), 0) / validSessions.length) * 100).toFixed(1)
    : '0.0'

  // Filter logic
  const filteredSessions = sessions.filter((s) => {
    const searchMatch = 
      (s.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.video_filename || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.date || '').includes(searchTerm) ||
      (s.session_label || '').toLowerCase().includes(searchTerm.toLowerCase())

    if (!searchMatch) return false

    const confPct = (s.mean_confidence || 0) * 100
    if (filterQuality === 'good' && confPct < 70) return false
    if (filterQuality === 'fair' && (confPct < 50 || confPct >= 70)) return false
    if (filterQuality === 'low' && confPct >= 50) return false

    return true
  })

  // Trend chart data (uses Session N — YYYY-MM-DD for X-axis)
  const chartData = buildTrendChartData(sessions)

  return (
    <AppShell>
      <div className="space-y-6 font-sans text-[#1D1D1F]">
        
        {/* Standard Single Page Header */}
        <div className="page-header">
          <h1 className="page-title">Sessions</h1>
          <p className="page-subtitle">Real-time joint angle trajectory analysis & patient recovery records</p>
        </div>

        {/* Top Summary Stat Cards (3-Column Bounded Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px]">
          <StatCard 
            label="Total Evaluated Sessions" 
            value={totalSessions} 
            sub="Recorded patient evaluations" 
            icon={Activity} 
            accent="green" 
          />
          <StatCard 
            label="Mean Underwater Cadence" 
            value={<>{avgCadence} <span className="text-[12px] font-[400] text-[#6E6E73]">spm</span></>} 
            sub="Steps per minute across sessions" 
            icon={TrendingUp} 
            accent="green" 
          />
          <StatCard 
            label="MediaPipe Tracking Quality" 
            value={`${avgConfidence}%`} 
            sub="Mean landmark visibility confidence" 
            icon={Clock} 
            accent="amber" 
          />
        </div>

        {/* Patient Recovery Trend Chart Card */}
        <div className="bg-[#FFFFFF] p-[24px] border border-[#E5E5E7] rounded-[8px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-[600] text-[#1D1D1F]">Patient Recovery Trend Line</h3>
              <p className="text-[13px] font-[400] text-[#6E6E73] mt-[2px]">
                Comparison of walking cadence (spm) and pose tracking confidence (%) across evaluations
              </p>
            </div>
          </div>
          {mounted && <RecoveryTrendChart data={chartData} height={280} />}
        </div>

        {/* Sessions Registry Card */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] overflow-hidden">
          {/* Header & Controls Toolbar */}
          <div className="p-[20px] border-b border-[#E5E5E7] bg-[#FAFAFA] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-[16px] font-[600] text-[#1D1D1F]">All Recorded Evaluations</h3>
              <p className="text-[13px] font-[400] text-[#6E6E73] mt-[2px]">Filter by patient name, video filename, or pose quality</p>
            </div>

            <div className="flex flex-col gap-[12px]">
              {/* Search input (36px Height, 6px Radius, Icon at 12px) */}
              <div className="relative">
                <Search className="w-[14px] h-[14px] text-[#6E6E73] absolute left-[12px] top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient or file..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-[36px] w-full sm:w-[260px] pl-[36px] pr-[12px] text-[13px] bg-[#FFFFFF] border border-[#E5E5E7] rounded-[6px] text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-[#0B6E4F] focus:ring-2 focus:ring-[#0B6E4F]/20 transition-all"
                />
              </div>

              {/* Quality Filter Pills (28px Height, 6px Radius, Active Accent Color #0B6E4F) */}
              <div className="flex items-center gap-[8px]">
                {(['all', 'good', 'fair', 'low'] as const).map((q) => {
                  const isActive = filterQuality === q
                  return (
                    <button
                      key={q}
                      onClick={() => setFilterQuality(q)}
                      className={`h-[28px] px-[12px] py-[4px] rounded-[6px] text-[12px] font-[500] capitalize transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#0B6E4F] text-white shadow-xs'
                          : 'bg-transparent text-[#6E6E73] border border-[#E5E5E7] hover:text-[#1D1D1F] hover:bg-[#FAFAFA]'
                      }`}
                    >
                      {q}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sessions List */}
          {loading ? (
            <div className="p-10 text-center text-[13px] text-[#6E6E73]">Loading sessions list…</div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-[#6E6E73]">
              No matching sessions found. Try adjusting your search query or filter.
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E7]">
              {filteredSessions.map((s, idx) => {
                const [datePart, sessionPart] = s.session_id.split('/')
                const tier = getConfidenceTier(s.mean_confidence)
                const isEditing = editingSessionId === s.session_id

                const hasRealName = s.patient_name && s.patient_name !== 'Unknown Patient'
                const patientDisplayName = hasRealName ? s.patient_name! : 'Unassigned Patient'

                return (
                  <div
                    key={s.session_id}
                    className="p-[16px] hover:bg-[#FAFAFA] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    {/* Left: Patient Icon + Name / Editable Field + Session Meta */}
                    <div className="flex items-start gap-[12px] min-w-0">
                      <div className="w-[32px] h-[32px] rounded-[6px] bg-[#E7F5EA] text-[#0B6E4F] flex items-center justify-center font-bold text-xs shrink-0 mt-[2px]">
                        <User className="w-[16px] h-[16px]" />
                      </div>

                      <div className="min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="h-[28px] px-2 text-[13px] bg-[#FFFFFF] border border-[#0B6E4F] rounded-[4px] text-[#1D1D1F] focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePatientName(s.session_id)}
                              disabled={savingName}
                              className="w-[28px] h-[28px] rounded-[4px] bg-[#0B6E4F] text-white flex items-center justify-center hover:opacity-90 cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-[14px] h-[14px]" />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className="w-[28px] h-[28px] rounded-[4px] bg-[#E5E5E7] text-[#1D1D1F] flex items-center justify-center hover:bg-[#d0d0d2] cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-[14px] h-[14px]" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-[8px] min-w-0">
                            <Link
                              href={`/sessions/${datePart}/${sessionPart}`}
                              className="text-[14px] font-[600] text-[#1D1D1F] hover:text-[#0B6E4F] hover:underline truncate"
                            >
                              {patientDisplayName} — Session {s.session_number}
                            </Link>
                            <button
                              onClick={() => {
                                setEditingSessionId(s.session_id)
                                setEditNameValue(hasRealName ? s.patient_name! : '')
                              }}
                              className="w-[24px] h-[24px] flex items-center justify-center text-[#6E6E73] hover:text-[#0B6E4F] rounded-[4px] hover:bg-[#E5E5E7] transition-colors cursor-pointer shrink-0"
                              title={hasRealName ? "Edit patient name" : "Assign patient name"}
                            >
                              <Pencil className="w-[12px] h-[12px]" />
                            </button>
                          </div>
                        )}

                        <p className="text-[12px] font-[400] text-[#6E6E73] mt-[2px]">
                          Recorded: {s.recorded_date || s.date} · Duration: {s.duration_sec || 0}s · Cadence: <span className="font-[500] text-[#0B6E4F]">{s.cadence_spm || 0} spm</span> · File: <span className="font-[500] text-[#1D1D1F]">{s.video_filename}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right: Badge + View Details Link */}
                    <div className="flex items-center gap-[12px] shrink-0">
                      <span 
                        className="text-[11px] font-[500] px-[8px] py-[2px] rounded-[4px]"
                        style={{ color: tier.textColor, backgroundColor: tier.bgColor }}
                      >
                        {tier.fullLabel}
                      </span>

                      <Link
                        href={`/sessions/${datePart}/${sessionPart}`}
                        className="h-[32px] px-[12px] bg-[#FFFFFF] border border-[#E5E5E7] hover:bg-[#FAFAFA] text-[#1D1D1F] text-[13px] font-[500] rounded-[6px] flex items-center gap-[4px] transition-all cursor-pointer"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-[14px] h-[14px] text-[#6E6E73]" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
