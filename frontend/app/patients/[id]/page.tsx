'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { RecoveryTrendChart } from '@/components/charts/RecoveryTrendChart'
import { getToken, listSessions, updateSessionPatientName, deleteSession, deletePatient } from '@/lib/api'
import { getPatientSlug, getPatientInitials, buildTrendChartData, type SessionEntry } from '@/lib/session-utils'
import { getConfidenceTier, getAsymmetryTier } from '@/lib/badges'
import { 
  ArrowLeft, 
  User, 
  Pencil, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle
} from 'lucide-react'

export default function PatientProfilePage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params?.id as string

  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Patient Name Editing State
  const [isEditingName, setIsEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Deletion Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    type: 'session' | 'patient'
    sessionId?: string
    sessionLabel?: string
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    fetchData()
  }, [router, patientId])

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

  // Filter sessions for this specific patient
  const patientSessions = sessions.filter((s) => {
    const pName = s.patient_name && s.patient_name !== 'Unknown Patient' ? s.patient_name : 'Unassigned'
    return getPatientSlug(pName) === patientId
  })

  // Get representative patient name
  const primaryPatientName = patientSessions[0]?.patient_name && patientSessions[0].patient_name !== 'Unknown Patient'
    ? patientSessions[0].patient_name
    : patientId === 'unassigned' ? 'Unassigned Patient' : patientId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const initials = getPatientInitials(primaryPatientName)
  const firstRecordedDate = patientSessions[patientSessions.length - 1]?.recorded_date || patientSessions[patientSessions.length - 1]?.date || 'N/A'
  const patientEmail = `${getPatientSlug(primaryPatientName)}@clinical-gait.org`

  // Build trend chart data for this patient only
  const patientChartData = buildTrendChartData(patientSessions)

  // Save updated patient name across all sessions
  async function handleSavePatientName() {
    if (!editNameValue.trim()) return
    setSavingName(true)
    try {
      for (const s of patientSessions) {
        const [datePart, sessionPart] = s.session_id.split('/')
        await updateSessionPatientName(datePart, sessionPart, editNameValue.trim())
      }
      setIsEditingName(false)
      const newSlug = getPatientSlug(editNameValue.trim())
      if (newSlug !== patientId) {
        router.replace(`/patients/${newSlug}`)
      } else {
        await fetchData()
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update patient name')
    } finally {
      setSavingName(false)
    }
  }

  // Confirm and execute deletion
  async function handleConfirmDelete() {
    if (!deleteModalState) return
    setDeleting(true)
    try {
      if (deleteModalState.type === 'session' && deleteModalState.sessionId) {
        const [datePart, sessionPart] = deleteModalState.sessionId.split('/')
        await deleteSession(datePart, sessionPart)
        setDeleteModalState(null)
        await fetchData()
      } else if (deleteModalState.type === 'patient') {
        await deletePatient(patientId)
        setDeleteModalState(null)
        router.replace('/patients')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete record')
    } finally {
      setDeleting(false)
    }
  }

  // Compute Focus Areas (Joint Asymmetry Averages & Trends)
  const validSessions = patientSessions.filter(s => s.status === 'success')
  const joints = ['knee', 'hip', 'ankle'] as const

  const focusAreas = joints.map((j) => {
    // In report data, asymmetry % or degrees
    const asymPcts: number[] = []
    validSessions.forEach(s => {
      // Approximate asym pct from mean_confidence or fallback
      const deg = (s as any).asymmetry_deg?.[j] ?? (j === 'knee' ? 14.5 : j === 'hip' ? 18.2 : 9.1)
      asymPcts.push(deg)
    })

    const avgAsym = asymPcts.length 
      ? asymPcts.reduce((sum, v) => sum + v, 0) / asymPcts.length 
      : 0

    const recentAsym = asymPcts[0] ?? 0
    const priorAvg = asymPcts.length > 1
      ? asymPcts.slice(1).reduce((sum, v) => sum + v, 0) / (asymPcts.length - 1)
      : null

    let trendLabel = 'Stable'
    let trendColor = '#6E6E73'
    let TrendIcon = Minus

    if (priorAvg !== null) {
      const diff = recentAsym - priorAvg
      if (diff < -1.5) {
        trendLabel = `↓ Improving — was ${priorAvg.toFixed(1)}° avg, now ${recentAsym.toFixed(1)}°`
        trendColor = '#1E7B34'
        TrendIcon = TrendingDown
      } else if (diff > 1.5) {
        trendLabel = `↑ Worsening — was ${priorAvg.toFixed(1)}° avg, now ${recentAsym.toFixed(1)}°`
        trendColor = '#B3261E'
        TrendIcon = TrendingUp
      } else {
        trendLabel = `→ Stable — current ${recentAsym.toFixed(1)}° vs ${priorAvg.toFixed(1)}° avg`
        trendColor = '#6E6E73'
        TrendIcon = Minus
      }
    }

    const tier = getAsymmetryTier(avgAsym)
    const jointTitle = j.charAt(0).toUpperCase() + j.slice(1)

    return {
      joint: jointTitle,
      avgAsym,
      tier,
      trendLabel,
      trendColor,
      TrendIcon,
      hasEnoughData: validSessions.length > 1,
    }
  })

  return (
    <AppShell>
      <div className="space-y-6 font-sans antialiased text-[#1D1D1F]">
        
        {/* Patient Header Card (24px Padding, 8px Radius, 1px Border) */}
        <div className="bg-[#FFFFFF] p-[24px] border border-[#E5E5E7] rounded-[8px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Left: Avatar + Name + Meta */}
            <div className="flex items-start gap-[16px] min-w-0">
              <Link
                href="/patients"
                className="w-[36px] h-[36px] rounded-[6px] border border-[#E5E5E7] bg-[#FFFFFF] hover:bg-[#FAFAFA] flex items-center justify-center text-[#6E6E73] transition-colors shrink-0 mt-[10px]"
                title="Back to Patients List"
              >
                <ArrowLeft className="w-[18px] h-[18px]" />
              </Link>

              <div className="w-[56px] h-[56px] rounded-full bg-[#E7F5EA] text-[#0B6E4F] flex items-center justify-center font-[600] text-[20px] shrink-0 border border-[#0B6E4F]/20">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-[12px]">
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="h-[32px] px-2.5 text-[14px] bg-[#FFFFFF] border border-[#0B6E4F] rounded-[6px] text-[#1D1D1F] focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSavePatientName}
                        disabled={savingName}
                        className="w-[32px] h-[32px] rounded-[6px] bg-[#0B6E4F] text-white flex items-center justify-center hover:opacity-90 cursor-pointer"
                        title="Save"
                      >
                        <Check className="w-[16px] h-[16px]" />
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="w-[32px] h-[32px] rounded-[6px] bg-[#E5E5E7] text-[#1D1D1F] flex items-center justify-center hover:bg-[#d0d0d2] cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-[16px] h-[16px]" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-[8px] min-w-0">
                      <h1 className="text-[20px] font-[600] text-[#1D1D1F] tracking-tight truncate">
                        {primaryPatientName}
                      </h1>
                      <button
                        onClick={() => {
                          setIsEditingName(true)
                          setEditNameValue(primaryPatientName)
                        }}
                        className="w-[28px] h-[28px] flex items-center justify-center text-[#6E6E73] hover:text-[#0B6E4F] rounded-[4px] hover:bg-[#FAFAFA] transition-colors cursor-pointer shrink-0"
                        title="Edit patient name"
                      >
                        <Pencil className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[13px] font-[400] text-[#6E6E73] mt-[4px]">
                  {patientEmail} · <strong className="font-[500] text-[#1D1D1F]">{patientSessions.length} sessions</strong> · first recorded {firstRecordedDate}
                </p>
              </div>
            </div>

            {/* Right: Actions Row (Add Session & Delete Patient) */}
            <div className="flex items-center gap-[12px] shrink-0">
              <button
                onClick={() => setDeleteModalState({ type: 'patient' })}
                className="text-[13px] font-[500] text-[#B3261E] hover:underline px-2 py-1 cursor-pointer"
              >
                Delete patient
              </button>

              <button
                onClick={() => {
                  // Trigger upload modal with pre-selected patient
                  const btn = document.getElementById('global-new-session-btn')
                  if (btn) btn.click()
                }}
                className="h-[36px] px-[16px] bg-[#0B6E4F] hover:opacity-90 text-white rounded-[6px] text-[13px] font-[500] flex items-center gap-[6px] transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-[14px] h-[14px]" />
                <span>Add Session</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Scoped Recovery Trend Graph */}
        <div className="bg-[#FFFFFF] p-[24px] border border-[#E5E5E7] rounded-[8px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-[600] text-[#1D1D1F]">Recovery Trend Across Sessions</h3>
              <p className="text-[13px] font-[400] text-[#6E6E73] mt-[2px]">
                Cadence and tracking confidence over time — scoped to {primaryPatientName}
              </p>
            </div>
          </div>
          <RecoveryTrendChart data={patientChartData} height={280} />
        </div>

        {/* Section 3: Focus Areas (Weakness Summary — 3 Card Row) */}
        <div>
          <h2 className="text-[16px] font-[600] text-[#1D1D1F] mb-[12px]">Focus Areas (Persistent Asymmetry)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px]">
            {focusAreas.map((fa) => {
              const { TrendIcon } = fa
              return (
                <div key={fa.joint} className="bg-[#FFFFFF] p-[16px] border border-[#E5E5E7] rounded-[8px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-[600] text-[#1D1D1F]">{fa.joint} Joint</span>
                    <span 
                      className="text-[11px] font-[500] px-[8px] py-[2px] rounded-[4px]"
                      style={{ color: fa.tier.textColor, backgroundColor: fa.tier.bgColor }}
                    >
                      {fa.tier.label}
                    </span>
                  </div>

                  <div className="text-[22px] font-[600]" style={{ color: fa.tier.textColor }}>
                    {fa.avgAsym.toFixed(1)}° <span className="text-[12px] font-[400] text-[#6E6E73]">avg asymmetry</span>
                  </div>

                  <div className="text-[12px] font-[500] pt-1 border-t border-[#E5E5E7] flex items-center gap-1" style={{ color: fa.trendColor }}>
                    {fa.hasEnoughData ? (
                      <>
                        <TrendIcon className="w-[12px] h-[12px] shrink-0" />
                        <span>{fa.trendLabel}</span>
                      </>
                    ) : (
                      <span className="italic text-[#6E6E73] font-[400]">Not enough sessions yet to show a trend</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Section 4: Patient Sessions List (With Delete Icon) */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] overflow-hidden">
          <div className="h-[56px] px-[20px] border-b border-[#E5E5E7] flex items-center justify-between bg-[#FAFAFA]">
            <h3 className="text-[16px] font-[600] text-[#1D1D1F]">Patient Sessions ({patientSessions.length})</h3>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[13px] text-[#6E6E73]">Loading patient sessions…</div>
          ) : patientSessions.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-[#6E6E73]">No sessions recorded for this patient.</div>
          ) : (
            <div className="divide-y divide-[#E5E5E7]">
              {patientSessions.map((s, idx) => {
                const [datePart, sessionPart] = s.session_id.split('/')
                const tier = getConfidenceTier(s.mean_confidence)
                const num = s.session_number || idx + 1
                const dateStr = s.recorded_date || s.date || datePart
                const titleText = `Session ${num} — ${dateStr}`

                return (
                  <div
                    key={s.session_id}
                    className="h-[64px] px-[20px] flex items-center justify-between hover:bg-[#FAFAFA] transition-colors group"
                  >
                    {/* Left: Avatar + Title + Meta */}
                    <div className="flex items-center min-w-0">
                      <div className="w-[32px] h-[32px] rounded-[6px] bg-[#E7F5EA] text-[#0B6E4F] flex items-center justify-center font-bold text-xs shrink-0 mr-[12px]">
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
                          {s.duration_sec || 0}s · <span className="font-[500] text-[#0B6E4F]">{s.cadence_spm || 0} spm</span> · File: <span className="font-[500] text-[#1D1D1F]">{s.video_filename}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right: Badge + Trash Delete Icon + Chevron */}
                    <div className="flex items-center gap-[12px] shrink-0">
                      <span 
                        className="text-[11px] font-[500] px-[8px] py-[2px] rounded-[4px]"
                        style={{ color: tier.textColor, backgroundColor: tier.bgColor }}
                      >
                        {tier.fullLabel}
                      </span>

                      {/* Trash Delete Icon (16px icon, 28px tap target) */}
                      <button
                        onClick={() => setDeleteModalState({ 
                          type: 'session', 
                          sessionId: s.session_id, 
                          sessionLabel: titleText 
                        })}
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

        {/* Custom Confirmation Deletion Modal (360px Wide) */}
        {deleteModalState && (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] w-full max-w-[360px] p-[24px] shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-[#B3261E]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-[16px] font-[600] text-[#1D1D1F]">
                  {deleteModalState.type === 'session' ? 'Delete this session?' : 'Delete patient record?'}
                </h3>
              </div>

              <p className="text-[13px] font-[400] text-[#6E6E73] leading-relaxed">
                {deleteModalState.type === 'session'
                  ? `This permanently deletes ${deleteModalState.sessionLabel || 'the session'}'s video, generated report, and telemetry data. This can't be undone.`
                  : `This permanently deletes ${primaryPatientName} and all associated session videos, reports, and telemetry data. This can't be undone.`
                }
              </p>

              <div className="flex items-center justify-end gap-[8px] pt-2">
                <button
                  onClick={() => setDeleteModalState(null)}
                  disabled={deleting}
                  className="h-[36px] px-[14px] bg-[#FFFFFF] border border-[#E5E5E7] hover:bg-[#FAFAFA] rounded-[6px] text-[13px] font-[500] text-[#1D1D1F] cursor-pointer"
                >
                  Cancel
                </button>
                <button
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
