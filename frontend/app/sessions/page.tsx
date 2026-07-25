'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { JointTimeSeriesChart } from '@/components/charts/JointTimeSeriesChart'
import { getToken, listSessions, getStaticUrl, updateSessionPatientName } from '@/lib/api'
import { fetchGaitCsv, type GaitCsvRow } from '@/lib/csv'
import { 
  Activity, 
  Clock, 
  Download, 
  ChevronRight,
  TrendingUp,
  User,
  Search,
  Pencil,
  Check,
  X,
  Sparkles
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

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

export default function SessionsDashboardPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Interactive Live Joint Graph State
  const [csvData, setCsvData] = useState<GaitCsvRow[]>([])
  const [activeJoint, setActiveJoint] = useState<'knee' | 'hip' | 'ankle'>('knee')

  useEffect(() => {
    const valid = sessions.filter(s => s.status === 'success')
    if (valid.length > 0) {
      const latest = valid[0]
      const [dPart, sPart] = latest.session_id.split('/')
      fetchGaitCsv(getStaticUrl(`/sessions/${dPart}/${sPart}/gait_analysis_data.csv`), 1)
        .then(setCsvData)
        .catch(() => {})
    }
  }, [sessions])

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterQuality, setFilterQuality] = useState<'all' | 'good' | 'mild' | 'low'>('all')

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
    ? (validSessions.reduce((acc, s) => acc + (s.mean_confidence || 0), 0) / validSessions.length * 100).toFixed(1)
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
    if (filterQuality === 'mild' && (confPct < 50 || confPct >= 70)) return false
    if (filterQuality === 'low' && confPct >= 50) return false

    return true
  })

  // Chart data
  const chartData = validSessions.map((s) => ({
    name: s.patient_name ? `${s.patient_name}` : s.session_label || s.session_id,
    session: s.session_id,
    cadence: Number(s.cadence_spm || 0),
    confidence: Number(((s.mean_confidence || 0) * 100).toFixed(1)),
  }))

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
                <Sparkles className="w-3 h-3" /> GaitRehab Clinical Suite
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Sessions & Biomechanics Telemetry</h1>
            <p className="text-xs text-[#6E6E73] mt-1">Real-time joint angle trajectory analysis & patient recovery records</p>
          </div>
        </div>

        {/* Top Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5E7] shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider">Total Evaluated Sessions</p>
              <p className="text-2xl font-extrabold text-[#1D1D1F] mt-1">{totalSessions}</p>
              <p className="text-[11px] text-[#6E6E73] mt-0.5">Recorded patient evaluations</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#E7F5EA] flex items-center justify-center text-[#0B6E4F]">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5E7] shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider">Mean Underwater Cadence</p>
              <p className="text-2xl font-extrabold text-[#0B6E4F] mt-1">{avgCadence} <span className="text-xs font-normal text-[#6E6E73]">spm</span></p>
              <p className="text-[11px] text-[#6E6E73] mt-0.5">Steps per minute across sessions</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#EAF5ED] flex items-center justify-center text-[#1E7B34]">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5E7] shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider">MediaPipe Tracking Quality</p>
              <p className="text-2xl font-extrabold text-[#1D1D1F] mt-1">{avgConfidence}%</p>
              <p className="text-[11px] text-[#6E6E73] mt-0.5">Mean landmark visibility confidence</p>
            </div>
          </div>
        </div>

        {/* Interactive Live Telemetry Joint Trajectory Graphs (Knee, Hip, Ankle) */}
        {mounted && (
          <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E5E5E7] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E7] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0B6E4F]" />
                  Live Joint Angle Trajectory Graphs (Knee, Hip, Ankle)
                </h3>
                <p className="text-xs text-[#6E6E73] mt-0.5">Interactive frame-by-frame joint angle curves (Left vs Right)</p>
              </div>

              <div className="flex items-center gap-1.5 bg-[#FAFAFA] p-1 rounded-xl border border-[#E5E5E7]">
                {(['knee', 'hip', 'ankle'] as const).map((j) => (
                  <button
                    key={j}
                    onClick={() => setActiveJoint(j)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                      activeJoint === j
                        ? 'bg-[#0B6E4F] text-white shadow-xs'
                        : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {j} Joint
                  </button>
                ))}
              </div>
            </div>

            {csvData.length > 0 ? (
              <div className="w-full pt-2">
                <JointTimeSeriesChart data={csvData} joint={activeJoint} height={300} />
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#6E6E73] bg-[#FAFAFA] rounded-xl border border-dashed border-[#E5E5E7]">
                Loading live joint trajectory telemetry...
              </div>
            )}
          </div>
        )}

        {/* Recharts Recovery Trend Line Chart */}
        {mounted && chartData.length > 0 && (
          <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E5E5E7] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5E7] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0B6E4F]" />
                  Patient Recovery Trend Line
                </h3>
                <p className="text-xs text-[#6E6E73] mt-0.5">Comparison of walking cadence (spm) and pose tracking confidence (%) across evaluations</p>
              </div>
            </div>
            <div className="w-full h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E7" vertical={false} />
                  <XAxis dataKey="name" stroke="#6E6E73" tick={{ fontSize: 11 }} axisLine={{ stroke: '#E5E5E7' }} tickLine={false} />
                  <YAxis stroke="#6E6E73" tick={{ fontSize: 11 }} axisLine={{ stroke: '#E5E5E7' }} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E5E7', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} 
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="cadence" name="Cadence (spm)" stroke="#0B6E4F" strokeWidth={2.5} dot={{ r: 5, fill: '#0B6E4F' }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="confidence" name="Confidence (%)" stroke="#9C6B00" strokeWidth={2} dot={{ r: 4, fill: '#9C6B00' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Sessions Registry Card with Interactive Search & Filter */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5E7] shadow-sm overflow-hidden space-y-0">
          {/* Header & Controls Toolbar */}
          <div className="p-5 border-b border-[#E5E5E7] bg-[#FAFAFA] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#1D1D1F]">Patient Session Registry</h3>
              <p className="text-xs text-[#6E6E73] mt-0.5">Click any row to inspect per-joint ROMs, asymmetry, and plots</p>
            </div>

            {/* Search Input & Filter Pills */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-[#6E6E73] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient, date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-form text-xs pl-8 py-1.5 rounded-lg border-[#E5E5E7] bg-[#FFFFFF]"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#FFFFFF] border border-[#E5E5E7] p-1 rounded-lg">
                <button
                  onClick={() => setFilterQuality('all')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${filterQuality === 'all' ? 'bg-[#0B6E4F] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterQuality('good')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${filterQuality === 'good' ? 'bg-[#1E7B34] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}
                >
                  Good
                </button>
                <button
                  onClick={() => setFilterQuality('mild')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${filterQuality === 'mild' ? 'bg-[#9C6B00] text-white' : 'text-[#6E6E73] hover:text-[#1D1D1F]'}`}
                >
                  Mild
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[#6E6E73]">Loading sessions registry…</div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-8 h-8 text-[#6E6E73] mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-[#1D1D1F]">No matching session records</p>
              <p className="text-[11px] text-[#6E6E73] mt-1">Try clearing your search filter or use "+ New Session" to upload a recording</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E7] bg-[#FAFAFA] text-[#6E6E73] font-semibold">
                    <th className="py-3.5 px-5">Patient Name</th>
                    <th className="py-3.5 px-4">Recorded Date & Time</th>
                    <th className="py-3.5 px-4">Video Filename</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Cadence</th>
                    <th className="py-3.5 px-4">Tracking Quality</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E7]">
                  {filteredSessions.map((s) => {
                    const confBadge = getConfidenceBadge(s.mean_confidence || 0)
                    const parts = s.session_id.split('/')
                    const datePart = parts[0]
                    const sessionPart = parts[1]
                    const isEditing = editingSessionId === s.session_id

                    return (
                      <tr 
                        key={s.session_id} 
                        className="table-row-hover transition-colors cursor-pointer hover:bg-[#FAFAFA]"
                        onClick={() => router.push(`/sessions/${datePart}/${sessionPart}`)}
                      >
                        <td className="py-4 px-5 font-bold text-[#1D1D1F]" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2.5">
                            {/* Lucide User Icon Badge (No broken glyph box!) */}
                            <div className="w-8 h-8 rounded-full bg-[#E7F5EA] border border-[#0B6E4F]/20 flex items-center justify-center text-[#0B6E4F] shrink-0 shadow-xs">
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
                                  onClick={() => handleSavePatientName(s.session_id)}
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
                                <div>
                                  <p className="text-xs font-bold text-[#1D1D1F]">{s.patient_name || 'Unknown Patient'}</p>
                                  <p className="text-[10px] text-[#6E6E73] font-normal">{s.session_label}</p>
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingSessionId(s.session_id)
                                    setEditNameValue(s.patient_name || 'Unknown Patient')
                                  }}
                                  className="text-[#6E6E73] hover:text-[#0B6E4F] p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity"
                                  title="Edit misspelled patient name"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-[#6E6E73] font-medium">
                          {s.recorded_date || s.date} {s.recorded_time ? `at ${s.recorded_time}` : ''}
                        </td>
                        <td className="py-4 px-4 text-[#6E6E73] truncate max-w-[160px]" title={s.video_filename}>
                          {s.video_filename}
                        </td>
                        <td className="py-4 px-4 font-semibold text-[#1D1D1F]">{s.duration_sec}s</td>
                        <td className="py-4 px-4 font-bold text-[#0B6E4F]">
                          {s.cadence_spm} spm
                        </td>
                        <td className="py-4 px-4">
                          <span className={`badge-soft ${confBadge.class}`}>
                            {confBadge.label}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right space-x-2" onClick={e => e.stopPropagation()}>
                          {s.report_docx && (
                            <a
                              href={getStaticUrl(s.report_docx)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-outline py-1.5 px-3 text-[11px] rounded-lg"
                            >
                              <Download className="w-3.5 h-3.5 text-[#6E6E73]" />
                              <span>DOCX</span>
                            </a>
                          )}
                          <Link
                            href={`/sessions/${datePart}/${sessionPart}`}
                            className="btn-accent py-1.5 px-3 text-[11px] rounded-lg"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
