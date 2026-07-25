'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { getToken, listSessions, getStaticUrl, updateSessionPatientName } from '@/lib/api'
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
            <div className="w-12 h-12 rounded-xl bg-[#FEF8E7] flex items-center justify-center text-[#9C6B00]">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

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
              <h3 className="text-sm font-bold text-[#1D1D1F]">All Recorded Evaluations</h3>
              <p className="text-xs text-[#6E6E73] mt-0.5">Filter by patient name, video filename, or pose quality</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#6E6E73] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search patient or file..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-form pl-8 text-xs py-1.5 h-9 w-full sm:w-56 rounded-xl"
                />
              </div>

              {/* Quality Filter Pills */}
              <div className="flex items-center gap-1 bg-[#FFFFFF] p-1 rounded-xl border border-[#E5E5E7]">
                {(['all', 'good', 'mild', 'low'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setFilterQuality(q)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition-colors ${
                      filterQuality === q 
                        ? 'bg-[#0B6E4F] text-white shadow-xs' 
                        : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table list */}
          {loading ? (
            <div className="p-12 text-center text-xs text-[#6E6E73]">Loading sessions registry…</div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#6E6E73]">
              No sessions match your search filter criteria.
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E7]">
              {filteredSessions.map((s) => {
                const confBadge = getConfidenceBadge(s.mean_confidence || 0)
                const [datePart, sessionPart] = s.session_id.split('/')
                const isEditing = editingSessionId === s.session_id

                return (
                  <div
                    key={s.session_id}
                    className="p-4 hover:bg-[#FAFAFA] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* SVG User Badge */}
                      <div className="w-10 h-10 rounded-full bg-[#E7F5EA] border border-[#0B6E4F]/20 flex items-center justify-center text-[#0B6E4F] font-bold text-sm shrink-0 shadow-xs">
                        <User className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                className="input-form text-xs py-1 px-2.5 h-7 rounded-lg border-[#0B6E4F]"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSavePatientName(s.session_id)}
                                disabled={savingName}
                                className="p-1 rounded-lg bg-[#0B6E4F] text-white hover:bg-[#08553d]"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingSessionId(null)}
                                className="p-1 rounded-lg bg-[#E5E5E7] text-[#1D1D1F] hover:bg-[#d0d0d2]"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-[#1D1D1F] truncate">
                                {s.patient_name || 'Patient'} — {s.session_label || `Session ${s.session_number}`}
                              </h4>
                              <button
                                onClick={() => {
                                  setEditingSessionId(s.session_id)
                                  setEditNameValue(s.patient_name || 'Patient')
                                }}
                                className="text-[#6E6E73] hover:text-[#0B6E4F] p-0.5 rounded transition-colors"
                                title="Edit misspelled patient name"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-[#6E6E73] flex flex-wrap items-center gap-2">
                          <span>Recorded: <strong className="text-[#1D1D1F]">{s.recorded_date || s.date}</strong> {s.recorded_time ? `at ${s.recorded_time}` : ''}</span>
                          <span>·</span>
                          <span>File: <strong className="text-[#1D1D1F]">{s.video_filename}</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-[#0B6E4F]">{s.cadence_spm || 0} spm</p>
                        <p className="text-[10px] text-[#6E6E73]">{s.duration_sec || 0}s duration</p>
                      </div>

                      <span className={`badge-soft ${confBadge.class}`}>
                        {confBadge.label}
                      </span>

                      {s.report_docx && (
                        <a
                          href={getStaticUrl(s.report_docx)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl text-[#6E6E73] hover:text-[#0B6E4F] hover:bg-[#E7F5EA] transition-colors"
                          title="Download Word Report (.docx)"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}

                      <Link
                        href={`/sessions/${datePart}/${sessionPart}`}
                        className="btn-outline text-xs py-1.5 px-3 rounded-xl group-hover:border-[#0B6E4F] group-hover:text-[#0B6E4F] transition-all flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
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
