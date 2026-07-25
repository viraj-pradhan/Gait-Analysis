'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { getToken, listSessions, getStaticUrl, updateSessionPatientName } from '@/lib/api'
import { getConfidenceTier } from '@/lib/badges'
import { getPatientSlug } from '@/lib/session-utils'
import { 
  FileText, 
  Download, 
  Calendar, 
  ChevronRight, 
  User, 
  Pencil, 
  Check, 
  X,
  Sparkles
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

export default function ReportsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  // Patient Name Editing State
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    fetchSessions()
  }, [router])

  async function fetchSessions() {
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
      await fetchSessions()
    } catch (err: any) {
      alert(err.message || 'Failed to update patient name')
    } finally {
      setSavingName(false)
    }
  }

  const reportsList = sessions.filter(s => s.report_docx && s.status === 'success')

  reportsList.sort((a, b) => {
    const da = a.date || a.recorded_date || ''
    const db = b.date || b.recorded_date || ''
    return sortOrder === 'desc' ? db.localeCompare(da) : da.localeCompare(db)
  })

  return (
    <AppShell>
      <div className="space-y-6 font-sans">
        {/* Banner Header */}
        <div className="bg-[#FFFFFF] p-[24px] rounded-[8px] border border-[#E5E5E7] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#E7F5EA] text-[#0B6E4F] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#0B6E4F]/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Clinical Documentation
              </span>
            </div>
            <h1 className="text-[20px] font-[600] text-[#1D1D1F] tracking-tight">Clinical Reports & Documentation</h1>
            <p className="text-[13px] font-[400] text-[#6E6E73] mt-[2px]">Downloadable Word (.docx) gait biomechanics reports for clinical recordkeeping</p>
          </div>
        </div>

        {/* Sort Control Row — Flush Right Above Grid (32px Height) */}
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-[500] text-[#6E6E73]">
            {reportsList.length} {reportsList.length === 1 ? 'Report' : 'Reports'} Available
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="h-[32px] px-[12px] bg-[#FFFFFF] border border-[#E5E5E7] rounded-[6px] text-[13px] font-[500] text-[#1D1D1F] hover:bg-[#FAFAFA] transition-colors flex items-center gap-[6px] shrink-0 cursor-pointer"
          >
            <Calendar className="w-[14px] h-[14px] text-[#6E6E73]" />
            <span>Sort Date ({sortOrder.toUpperCase()})</span>
          </button>
        </div>

        {/* Reports 2-Column Bounded Card Grid */}
        {loading ? (
          <div className="p-12 text-center text-[13px] text-[#6E6E73]">Loading clinical reports list…</div>
        ) : reportsList.length === 0 ? (
          <div className="bg-[#FFFFFF] p-12 text-center rounded-[8px] border border-[#E5E5E7]">
            <FileText className="w-8 h-8 text-[#6E6E73] mx-auto mb-2 opacity-50" />
            <p className="text-[14px] font-[600] text-[#1D1D1F]">No generated reports found</p>
            <p className="text-[13px] font-[400] text-[#6E6E73] mt-1">Upload a gait recording to generate clinical reports</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
            {reportsList.map((r) => {
              const tier = getConfidenceTier(r.mean_confidence)
              const [datePart, sessionPart] = r.session_id.split('/')
              const isEditing = editingSessionId === r.session_id

              const hasRealName = r.patient_name && r.patient_name !== 'Unknown Patient'
              const patientDisplayName = hasRealName ? r.patient_name! : 'Unassigned'

              return (
                <div 
                  key={r.session_id} 
                  className="bg-[#FFFFFF] p-[20px] rounded-[8px] border border-[#E5E5E7] flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header Row (36px Height) */}
                    <div className="h-[36px] flex items-center justify-between">
                      {/* Left: Avatar + Name + Edit Pencil */}
                      <div className="flex items-center gap-[12px] min-w-0">
                        <div className="w-[28px] h-[28px] rounded-[6px] bg-[#E7F5EA] text-[#0B6E4F] flex items-center justify-center font-bold text-xs shrink-0">
                          <User className="w-[14px] h-[14px]" />
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
                              onClick={() => handleSavePatientName(r.session_id)}
                              disabled={savingName}
                              className="w-[28px] h-[28px] rounded-[4px] bg-[#0B6E4F] text-white flex items-center justify-center hover:opacity-90 cursor-pointer"
                              title="Save Patient Name"
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
                          <div className="flex items-center gap-[12px] min-w-0">
                            <Link
                              href={`/patients/${getPatientSlug(r.patient_name)}`}
                              className={`text-[14px] font-[600] hover:underline truncate ${hasRealName ? 'text-[#1D1D1F]' : 'text-[#6E6E73] italic'}`}
                            >
                              {patientDisplayName}
                            </Link>
                            <button
                              onClick={() => {
                                setEditingSessionId(r.session_id)
                                setEditNameValue(hasRealName ? r.patient_name! : '')
                              }}
                              className="w-[28px] h-[28px] flex items-center justify-center text-[#6E6E73] hover:text-[#0B6E4F] transition-colors rounded-[4px] hover:bg-[#FAFAFA] cursor-pointer shrink-0"
                              title={hasRealName ? "Edit patient name" : "Assign patient name"}
                            >
                              <Pencil className="w-[14px] h-[14px]" />
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

                    {/* 2x2 Stat Grid (12px gap, 16px mt) */}
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

                  {/* Action Row (16px mt, 8px gap) */}
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
                      <span>View Details & Graphs</span>
                      <ChevronRight className="w-[14px] h-[14px] text-[#6E6E73]" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
