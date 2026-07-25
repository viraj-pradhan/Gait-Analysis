'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { StatCard } from '@/components/ui/StatCard'
import { RecoveryTrendChart } from '@/components/charts/RecoveryTrendChart'
import { getToken, listSessions, deleteSession } from '@/lib/api'
import { buildTrendChartData, getConfidenceTier, type SessionEntry } from '@/lib/session-utils'
import { Activity, Clock, TrendingUp, ChevronRight, User, Trash2, AlertTriangle } from 'lucide-react'

export default function OverviewPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Deletion Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    sessionId: string
    sessionLabel: string
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  async function handleConfirmDelete() {
    if (!deleteModalState?.sessionId) return
    setDeleting(true)
    try {
      const [datePart, sessionPart] = deleteModalState.sessionId.split('/')
      await deleteSession(datePart, sessionPart)
      setSessions((prev) => prev.filter((s) => s.session_id !== deleteModalState.sessionId))
      setDeleteModalState(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete session')
    } finally {
      setDeleting(false)
    }
  }

  const validSessions = sessions.filter((s) => s.status === 'success')
  const totalSessions = sessions.length
  const avgCadence = validSessions.length > 0 
    ? (validSessions.reduce((acc, s) => acc + (s.cadence_spm || 0), 0) / validSessions.length).toFixed(1)
    : '0.0'
  const avgConfidence = validSessions.length > 0
    ? ((validSessions.reduce((acc, s) => acc + (s.mean_confidence || 0), 0) / validSessions.length) * 100).toFixed(1)
    : '0.0'

  const chartData = buildTrendChartData(sessions)
  const recentSessions = [...sessions]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 5)

  return (
    <AppShell>
      <div className="space-y-6 font-sans text-[#1D1D1F]">
        
        {/* Top Summary Metric Cards (3-Column Bounded Grid) */}
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

        {/* Recovery Trend Line Chart Card */}
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

        {/* Recent Sessions Registry Card */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] overflow-hidden">
          <div className="h-[56px] px-[20px] border-b border-[#E5E5E7] flex items-center justify-between bg-[#FAFAFA]">
            <div>
              <h3 className="text-[16px] font-[600] text-[#1D1D1F]">Recent Recorded Sessions</h3>
            </div>
            <Link href="/sessions" className="text-[13px] font-[500] text-[#0B6E4F] hover:underline">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[13px] text-[#6E6E73]">Loading sessions…</div>
          ) : recentSessions.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-[#6E6E73]">No sessions recorded yet. Upload a video to get started.</div>
          ) : (
            <div className="divide-y divide-[#E5E5E7]">
              {recentSessions.map((s, idx) => {
                const [datePart, sessionPart] = s.session_id.split('/')
                const tier = getConfidenceTier(s.mean_confidence)
                const num = s.session_number || idx + 1
                const dateStr = s.recorded_date || s.date || datePart
                const titleText = `Session ${num} — ${dateStr}`
                const patientText = s.patient_name || 'Unassigned Patient'

                return (
                  <div
                    key={s.session_id}
                    className="h-[64px] px-[20px] flex items-center justify-between hover:bg-[#FAFAFA] transition-colors group"
                  >
                    {/* Left side: Avatar + Session Title + Meta */}
                    <div className="flex items-center min-w-0">
                      <div className="w-[32px] h-[32px] rounded-[6px] bg-[#E7F5EA] text-[#0B6E4F] flex items-center justify-center font-bold shrink-0 mr-[12px]">
                        <User className="w-[16px] h-[16px]" />
                      </div>
                      <div className="min-w-0">
                        <Link 
                          href={`/sessions/${datePart}/${sessionPart}`}
                          className="text-[14px] font-[500] text-[#1D1D1F] hover:text-[#0B6E4F] hover:underline truncate block"
                        >
                          {titleText}
                        </Link>
                        <p className="text-[12px] font-[400] text-[#6E6E73] mt-[2px] truncate">
                          {patientText} · {s.duration_sec || 0}s · <span className="font-[500] text-[#0B6E4F]">{s.cadence_spm || 0} spm</span>
                        </p>
                      </div>
                    </div>

                    {/* Right side: Badge + Trash Delete + View Link */}
                    <div className="flex items-center gap-[12px] shrink-0">
                      <span 
                        className="text-[11px] font-[500] px-[8px] py-[2px] rounded-[4px]"
                        style={{ color: tier.textColor, backgroundColor: tier.bgColor }}
                      >
                        {tier.fullLabel}
                      </span>

                      {/* Trash Delete Icon */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setDeleteModalState({
                            sessionId: s.session_id,
                            sessionLabel: `${patientText} — Session ${num} (${dateStr})`,
                          })
                        }}
                        className="w-[28px] h-[28px] rounded-[4px] flex items-center justify-center text-[#6E6E73] hover:text-[#B3261E] hover:bg-[#FCEAE9] transition-colors cursor-pointer"
                        title="Delete this session"
                      >
                        <Trash2 className="w-[16px] h-[16px]" />
                      </button>

                      <Link href={`/sessions/${datePart}/${sessionPart}`}>
                        <ChevronRight className="w-[16px] h-[16px] text-[#6E6E73] group-hover:text-[#0B6E4F] transition-colors" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalState && (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] w-full max-w-[360px] p-[24px] shadow-xl space-y-4 font-sans">
              <div className="flex items-center gap-2 text-[#B3261E]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-[16px] font-[600] text-[#1D1D1F]">Delete this session?</h3>
              </div>

              <p className="text-[13px] font-[400] text-[#6E6E73] leading-relaxed">
                This permanently deletes <strong>{deleteModalState.sessionLabel}</strong>'s video, generated report, and telemetry data. This can't be undone.
              </p>

              <div className="flex items-center justify-end gap-[8px] pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalState(null)}
                  disabled={deleting}
                  className="h-[36px] px-[14px] bg-[#FFFFFF] border border-[#E5E5E7] hover:bg-[#FAFAFA] rounded-[6px] text-[13px] font-[500] text-[#1D1D1F] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="h-[36px] px-[16px] bg-[#B3261E] hover:opacity-90 rounded-[6px] text-[13px] font-[500] text-white cursor-pointer transition-all"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
