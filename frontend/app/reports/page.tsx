'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { getToken, listSessions, getStaticUrl, updateSessionPatientName, deleteSession } from '@/lib/api'
import { getConfidenceTier } from '@/lib/badges'
import { getPatientSlug } from '@/lib/session-utils'
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal'
import { 
  FileText, 
  Download, 
  Calendar, 
  ChevronRight, 
  User, 
  Pencil, 
  Check, 
  X,
  Trash2,
} from 'lucide-react'

type SessionEntry = {
  session_id: string
  patient_name?: string
  recorded_date?: string
  recorded_time?: string
  video_filename: string
  date: string
  session_number: number
  session_label: string
  processed_at: string
  fps: number
  duration_sec: number
  cadence_spm: number
  mean_confidence: number
  status: string
  report_docx: string
}

export default function ReportsDashboardPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Patient Name Editing State
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Deletion Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    sessionId: string
    sessionLabel: string
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
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

  async function handleConfirmDelete() {
    if (!deleteModalState?.sessionId) return
    setDeleting(true)
    try {
      const [datePart, sessionPart] = deleteModalState.sessionId.split('/')
      await deleteSession(datePart, sessionPart)
      setSessions((prev) => prev.filter((s) => s.session_id !== deleteModalState.sessionId))
      setDeleteModalState(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete report session')
    } finally {
      setDeleting(false)
    }
  }

  const validSessions = sessions.filter((s) => s.status === 'success')

  return (
    <AppShell>
      <div className="space-y-6 font-sans antialiased text-[#1D1D1F]">
        
        {/* Standard Single Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-[600] text-[#1D1D1F] tracking-tight">Clinical Reports</h1>
            <p className="text-[13px] font-[400] text-[#6E6E73] mt-[2px]">
              Downloadable Word documents & structured biomechanics evaluations
            </p>
          </div>
        </div>

        {/* 2-Column Bounded Card Grid (16px Gap) */}
        {loading ? (
          <div className="p-12 text-center text-[13px] text-[#6E6E73]">Loading reports…</div>
        ) : validSessions.length === 0 ? (
          <div className="bg-[#FFFFFF] p-12 text-center rounded-[8px] border border-[#E5E5E7]">
            <FileText className="w-8 h-8 text-[#6E6E73] mx-auto mb-2 opacity-50" />
            <p className="text-[14px] font-[600] text-[#1D1D1F]">No generated reports found</p>
            <p className="text-[13px] font-[400] text-[#6E6E73] mt-1">Upload a gait evaluation to generate clinical reports</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
            {validSessions.map((r) => {
              const [datePart, sessionPart] = r.session_id.split('/')
              const tier = getConfidenceTier(r.mean_confidence)
              const isEditing = editingSessionId === r.session_id

              const hasRealName = r.patient_name && r.patient_name !== 'Unknown Patient'
              const patientDisplayName = hasRealName ? r.patient_name! : 'Unassigned Patient'

              return (
                <div
                  key={r.session_id}
                  className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] p-[20px] shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Patient Avatar + Name/Edit + Confidence Badge */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-[10px] min-w-0">
                        <div className="w-[32px] h-[32px] rounded-[6px] bg-[#E7F5EA] text-[#0B6E4F] flex items-center justify-center font-bold text-xs shrink-0">
                          <User className="w-[16px] h-[16px]" />
                        </div>

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
                              type="button"
                              onClick={() => handleSavePatientName(r.session_id)}
                              disabled={savingName}
                              className="w-[28px] h-[28px] rounded-[4px] bg-[#0B6E4F] text-white flex items-center justify-center hover:opacity-90 cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-[14px] h-[14px]" />
                            </button>
                            <button
                              type="button"
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
                              href={`/patients/${getPatientSlug(r.patient_name)}`}
                              className={`text-[14px] font-[600] hover:underline truncate ${hasRealName ? 'text-[#1D1D1F]' : 'text-[#6E6E73] italic'}`}
                            >
                              {patientDisplayName}
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSessionId(r.session_id)
                                setEditNameValue(hasRealName ? r.patient_name! : '')
                              }}
                              className="w-[24px] h-[24px] flex items-center justify-center text-[#6E6E73] hover:text-[#0B6E4F] transition-colors rounded-[4px] hover:bg-[#FAFAFA] cursor-pointer shrink-0"
                              title={hasRealName ? "Edit patient name" : "Assign patient name"}
                            >
                              <Pencil className="w-[12px] h-[12px]" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right: Standardized Confidence Badge */}
                      <span 
                        className="text-[11px] font-[500] px-[8px] py-[2px] rounded-[4px] shrink-0"
                        style={{ color: tier.textColor, backgroundColor: tier.bgColor }}
                      >
                        {tier.fullLabel}
                      </span>
                    </div>

                    {/* Session Label + Date */}
                    <div className="text-[13px] font-[400] text-[#6E6E73] mt-[8px]">
                      Session {r.session_number} — {r.recorded_date || r.date}
                    </div>

                    {/* 2x2 Stat Grid */}
                    <div className="grid grid-cols-2 gap-[12px] mt-[16px] p-[12px] bg-[#FAFAFA] border border-[#E5E5E7] rounded-[6px]">
                      <div>
                        <span className="text-[11px] font-[500] uppercase tracking-[0.02em] text-[#6E6E73] block">Date & Time</span>
                        <span className="text-[14px] font-[600] text-[#1D1D1F] mt-[2px] block">
                          {r.recorded_date || r.date}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-[500] uppercase tracking-[0.02em] text-[#6E6E73] block">Duration</span>
                        <span className="text-[14px] font-[600] text-[#1D1D1F] mt-[2px] block">
                          {r.duration_sec}s
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-[500] uppercase tracking-[0.02em] text-[#6E6E73] block">Cadence</span>
                        <span className="text-[14px] font-[600] text-[#0B6E4F] mt-[2px] block">
                          {r.cadence_spm} spm
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-[500] uppercase tracking-[0.02em] text-[#6E6E73] block">Session Number</span>
                        <span className="text-[14px] font-[600] text-[#1D1D1F] mt-[2px] block">
                          #{r.session_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Row */}
                  <div className="flex items-center gap-[8px] mt-[16px]">
                    <a
                      href={getStaticUrl(r.report_docx)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 h-[36px] bg-[#0B6E4F] hover:opacity-90 text-white rounded-[6px] text-[13px] font-[500] flex items-center justify-center gap-[6px] transition-all cursor-pointer"
                    >
                      <Download className="w-[14px] h-[14px]" />
                      <span>Download Report</span>
                    </a>
                    <Link
                      href={`/sessions/${datePart}/${sessionPart}`}
                      className="h-[36px] px-[12px] bg-[#FFFFFF] border border-[#E5E5E7] hover:bg-[#FAFAFA] text-[#1D1D1F] rounded-[6px] text-[13px] font-[500] flex items-center justify-center gap-[4px] transition-all cursor-pointer shrink-0"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-[14px] h-[14px] text-[#6E6E73]" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteModalState({
                          sessionId: r.session_id,
                          sessionLabel: `${patientDisplayName} — Session ${r.session_number} (${r.recorded_date || r.date})`,
                        })
                      }}
                      className="icon-action-btn icon-action-btn-danger w-9 h-9 border border-[#E5E5E7] bg-white rounded-md"
                      title="Delete session report"
                      aria-label="Delete session report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <DeleteConfirmModal
          open={!!deleteModalState}
          title="Delete this session report?"
          message={
            <>
              This permanently deletes <strong>{deleteModalState?.sessionLabel}</strong> — including video, report, and telemetry. This cannot be undone.
            </>
          }
          loading={deleting}
          onCancel={() => setDeleteModalState(null)}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </AppShell>
  )
}
