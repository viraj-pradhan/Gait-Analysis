'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { getToken, listSessions, getStaticUrl, updateSessionPatientName } from '@/lib/api'
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
    const da = a.date || ''
    const db = b.date || ''
    return sortOrder === 'desc' ? db.localeCompare(da) : da.localeCompare(db)
  })

  const getConfidenceBadge = (confFrac: number) => {
    const pct = confFrac * 100
    if (pct >= 70) return { label: `${pct.toFixed(0)}% Good`, class: 'badge-good' }
    if (pct >= 50) return { label: `${pct.toFixed(0)}% Mild`, class: 'badge-mild' }
    return { label: `${pct.toFixed(0)}% Low`, class: 'badge-high' }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-[#FFFFFF] to-[#E7F5EA]/40 p-6 rounded-2xl border border-[#E5E5E7] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#E7F5EA] text-[#0B6E4F] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#0B6E4F]/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Clinical Documentation
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Clinical Reports & Documentation</h1>
            <p className="text-xs text-[#6E6E73] mt-1">Downloadable Word (.docx) biomechanics reports for medical review</p>
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="btn-outline text-xs h-9 px-4 rounded-xl shadow-xs self-start sm:self-auto"
          >
            <Calendar className="w-3.5 h-3.5 text-[#6E6E73]" />
            <span>Sort Date ({sortOrder.toUpperCase()})</span>
          </button>
        </div>

        {/* Reports Grid Cards */}
        {loading ? (
          <div className="p-12 text-center text-xs text-[#6E6E73]">Loading clinical reports list…</div>
        ) : reportsList.length === 0 ? (
          <div className="bg-[#FFFFFF] p-12 text-center rounded-2xl border border-[#E5E5E7] shadow-sm">
            <FileText className="w-8 h-8 text-[#6E6E73] mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-[#1D1D1F]">No generated reports found</p>
            <p className="text-[11px] text-[#6E6E73] mt-1">Upload a gait recording to generate clinical reports</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reportsList.map((r) => {
              const confBadge = getConfidenceBadge(r.mean_confidence || 0)
              const [datePart, sessionPart] = r.session_id.split('/')
              const isEditing = editingSessionId === r.session_id

              return (
                <div 
                  key={r.session_id} 
                  className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5E7] shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Card Header: Icon + Patient Name + Edit + Badge */}
                    <div className="flex items-start justify-between gap-2 border-b border-[#E5E5E7] pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#E7F5EA] border border-[#0B6E4F]/20 flex items-center justify-center text-[#0B6E4F] shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="input-form text-xs py-1 px-2 h-7 rounded-md border-[#0B6E4F]"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePatientName(r.session_id)}
                              disabled={savingName}
                              className="p-1 rounded bg-[#0B6E4F] text-white hover:bg-[#08553d]"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className="p-1 rounded bg-[#E5E5E7] text-[#1D1D1F] hover:bg-[#d0d0d2]"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="group flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-[#1D1D1F]">
                              {r.patient_name || 'Unknown Patient'}
                            </h3>
                            <button
                              onClick={() => {
                                setEditingSessionId(r.session_id)
                                setEditNameValue(r.patient_name || 'Unknown Patient')
                              }}
                              className="text-[#6E6E73] hover:text-[#0B6E4F] p-0.5 rounded transition-colors"
                              title="Edit misspelled patient name"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <span className={`badge-soft ${confBadge.class} shrink-0`}>
                        {confBadge.label}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-[#6E6E73]">
                      Session {r.session_number} — {r.recorded_date || r.date}
                    </p>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAFAFA] p-3 rounded-xl border border-[#E5E5E7]">
                      <div>
                        <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Date & Time</span>
                        <span className="font-bold text-[#1D1D1F] mt-0.5 block">{r.recorded_date || r.date}</span>
                        {r.recorded_time && <span className="text-[10px] text-[#6E6E73]">{r.recorded_time}</span>}
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Duration</span>
                        <span className="font-bold text-[#1D1D1F] mt-0.5 block">{r.duration_sec}s</span>
                      </div>

                      <div className="pt-2 border-t border-[#E5E5E7]">
                        <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Cadence</span>
                        <span className="font-bold text-[#0B6E4F] mt-0.5 block">{r.cadence_spm} spm</span>
                      </div>

                      <div className="pt-2 border-t border-[#E5E5E7]">
                        <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Session #</span>
                        <span className="font-bold text-[#1D1D1F] mt-0.5 block">#{r.session_number}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <a
                      href={getStaticUrl(r.report_docx)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-accent py-2 px-3 text-xs flex-1 rounded-xl shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Report</span>
                    </a>
                    <Link
                      href={`/sessions/${datePart}/${sessionPart}`}
                      className="btn-outline py-2 px-3 text-xs rounded-xl"
                    >
                      <span>View Patient Details & Graphs</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
