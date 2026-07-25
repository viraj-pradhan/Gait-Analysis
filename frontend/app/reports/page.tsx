'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { JointTimeSeriesChart } from '@/components/charts/JointTimeSeriesChart'
import { getToken, listSessions, getStaticUrl, updateSessionPatientName } from '@/lib/api'
import { fetchGaitCsv, type GaitCsvRow } from '@/lib/csv'
import { 
  FileText, 
  Download, 
  Calendar, 
  ChevronRight, 
  User, 
  Pencil, 
  Check, 
  X,
  Activity,
  ChevronDown,
  ChevronUp,
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

  // Expanded Telemetry Graphs per Report Card State
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
  const [csvMap, setCsvMap] = useState<Record<string, GaitCsvRow[]>>({})
  const [loadingCsv, setLoadingCsv] = useState(false)

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

  async function handleToggleExpand(sessionId: string) {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null)
      return
    }

    setExpandedSessionId(sessionId)

    if (!csvMap[sessionId]) {
      setLoadingCsv(true)
      const [datePart, sessionPart] = sessionId.split('/')
      try {
        const rows = await fetchGaitCsv(getStaticUrl(`/sessions/${datePart}/${sessionPart}/gait_analysis_data.csv`), 1)
        setCsvMap((prev) => ({ ...prev, [sessionId]: rows }))
      } catch (err) {
        console.error('Failed to load CSV telemetry for report:', err)
      } finally {
        setLoadingCsv(false)
      }
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
                <Sparkles className="w-3 h-3" /> Clinical Documentation & Telemetry
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Clinical Reports & Telemetry Graphs</h1>
            <p className="text-xs text-[#6E6E73] mt-1">Downloadable Word (.docx) reports with embedded 3-joint live trajectory graphs (Knee, Hip, Ankle)</p>
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="btn-outline text-xs h-9 px-4 rounded-xl shadow-xs self-start sm:self-auto"
          >
            <Calendar className="w-3.5 h-3.5 text-[#6E6E73]" />
            <span>Sort Date ({sortOrder.toUpperCase()})</span>
          </button>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-[#6E6E73]">Loading clinical reports list…</div>
        ) : reportsList.length === 0 ? (
          <div className="bg-[#FFFFFF] p-12 text-center rounded-2xl border border-[#E5E5E7] shadow-sm">
            <FileText className="w-8 h-8 text-[#6E6E73] mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-[#1D1D1F]">No generated reports found</p>
            <p className="text-[11px] text-[#6E6E73] mt-1">Upload a gait recording to generate clinical reports</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reportsList.map((r) => {
              const confBadge = getConfidenceBadge(r.mean_confidence || 0)
              const [datePart, sessionPart] = r.session_id.split('/')
              const isEditing = editingSessionId === r.session_id
              const isExpanded = expandedSessionId === r.session_id
              const reportCsvData = csvMap[r.session_id] || []

              return (
                <div 
                  key={r.session_id} 
                  className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E5E5E7] shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E5E7] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E7F5EA] border border-[#0B6E4F]/20 flex items-center justify-center text-[#0B6E4F] shrink-0">
                        <User className="w-5 h-5" />
                      </div>

                      <div>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="input-form text-xs py-1 px-2.5 h-8 rounded-lg border-[#0B6E4F]"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePatientName(r.session_id)}
                              disabled={savingName}
                              className="p-1.5 rounded-lg bg-[#0B6E4F] text-white hover:bg-[#08553d]"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className="p-1.5 rounded-lg bg-[#E5E5E7] text-[#1D1D1F] hover:bg-[#d0d0d2]"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-[#1D1D1F]">
                              {r.patient_name || 'Unknown Patient'}
                            </h3>
                            <button
                              onClick={() => {
                                setEditingSessionId(r.session_id)
                                setEditNameValue(r.patient_name || 'Unknown Patient')
                              }}
                              className="text-[#6E6E73] hover:text-[#0B6E4F] p-1 rounded transition-colors"
                              title="Edit misspelled patient name"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-[#6E6E73] mt-0.5">
                          Session #{r.session_number} · Recorded: <strong className="text-[#1D1D1F]">{r.recorded_date || r.date}</strong> {r.recorded_time ? `at ${r.recorded_time}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`badge-soft ${confBadge.class}`}>
                        {confBadge.label}
                      </span>
                      <button
                        onClick={() => handleToggleExpand(r.session_id)}
                        className="btn-outline text-xs h-9 px-3.5 rounded-xl border-[#0B6E4F]/30 text-[#0B6E4F] font-semibold hover:bg-[#E7F5EA]/50 flex items-center gap-1.5"
                      >
                        <Activity className="w-4 h-4 text-[#0B6E4F]" />
                        <span>{isExpanded ? 'Hide Live Joint Graphs' : 'View 3 Live Joint Graphs (Knee, Hip, Ankle)'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <a
                        href={getStaticUrl(r.report_docx)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-accent text-xs h-9 px-4 rounded-xl shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Report</span>
                      </a>
                      <Link
                        href={`/sessions/${datePart}/${sessionPart}`}
                        className="btn-outline text-xs h-9 px-3.5 rounded-xl"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#FAFAFA] p-3.5 rounded-xl border border-[#E5E5E7]">
                    <div>
                      <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Duration</span>
                      <span className="font-bold text-[#1D1D1F] text-sm mt-0.5 block">{r.duration_sec}s</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Walking Cadence</span>
                      <span className="font-bold text-[#0B6E4F] text-sm mt-0.5 block">{r.cadence_spm} spm</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Video File</span>
                      <span className="font-bold text-[#1D1D1F] text-xs mt-0.5 block truncate">{r.video_filename}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider block">Session Path</span>
                      <span className="font-bold text-[#1D1D1F] text-xs mt-0.5 block truncate">{r.session_id}</span>
                    </div>
                  </div>

                  {/* 3 SEPARATE LIVE GRAPHS: Knee, Hip, Ankle inside Report Card */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-[#E5E5E7] space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#0B6E4F]" />
                          3 Live Telemetry Graphs (Knee, Hip, Ankle) for {r.patient_name || 'Patient'}
                        </h4>
                        <span className="text-xs text-[#6E6E73]">Frame-by-frame joint angle trajectories (Left vs Right)</span>
                      </div>

                      {loadingCsv ? (
                        <div className="p-8 text-center text-xs text-[#6E6E73] bg-[#FAFAFA] rounded-xl border border-dashed border-[#E5E5E7]">
                          Loading live CSV trajectory telemetry...
                        </div>
                      ) : reportCsvData.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* GRAPH 1: Knee Joint */}
                          <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E7] space-y-2">
                            <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-2">
                              <h5 className="text-xs font-bold text-[#1D1D1F]">1. Knee Joint Flexion</h5>
                              <span className="text-[10px] font-semibold text-[#0B6E4F] bg-[#E7F5EA] px-2 py-0.5 rounded-md">Left vs Right</span>
                            </div>
                            <JointTimeSeriesChart data={reportCsvData} joint="knee" height={220} />
                          </div>

                          {/* GRAPH 2: Hip Joint */}
                          <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E7] space-y-2">
                            <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-2">
                              <h5 className="text-xs font-bold text-[#1D1D1F]">2. Hip Joint Flexion</h5>
                              <span className="text-[10px] font-semibold text-[#0B6E4F] bg-[#E7F5EA] px-2 py-0.5 rounded-md">Left vs Right</span>
                            </div>
                            <JointTimeSeriesChart data={reportCsvData} joint="hip" height={220} />
                          </div>

                          {/* GRAPH 3: Ankle Joint */}
                          <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#E5E5E7] space-y-2">
                            <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-2">
                              <h5 className="text-xs font-bold text-[#1D1D1F]">3. Ankle Joint Angle</h5>
                              <span className="text-[10px] font-semibold text-[#0B6E4F] bg-[#E7F5EA] px-2 py-0.5 rounded-md">Left vs Right</span>
                            </div>
                            <JointTimeSeriesChart data={reportCsvData} joint="ankle" height={220} />
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-[#6E6E73] bg-[#FAFAFA] rounded-xl border border-dashed border-[#E5E5E7]">
                          No telemetry trajectory data found for this report.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
