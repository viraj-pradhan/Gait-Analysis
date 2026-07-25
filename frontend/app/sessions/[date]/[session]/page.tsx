'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { JointTimeSeriesChart } from '@/components/charts/JointTimeSeriesChart'
import { fetchGaitCsv, GaitCsvRow } from '@/lib/csv'
import { getToken, getSessionDetail, getStaticUrl, updateSessionPatientName } from '@/lib/api'
import { 
  ArrowLeft, 
  Download, 
  Activity, 
  Clock, 
  AlertCircle,
  FileSpreadsheet,
  User,
  Calendar,
  ShieldCheck,
  Maximize2,
  X,
  Play,
  FileText,
  BarChart3,
  Video,
  Pencil,
  Check
} from 'lucide-react'

type SessionData = {
  meta: any
  report: any
  images: {
    comprehensive: string
    knee: string
    hip: string
    ankle: string
  }
  docx_url: string
  csv_url: string
}

export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const dateStr = params?.date as string
  const sessionNum = params?.session as string

  const [data, setData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'metrics' | 'plots' | 'video'>('metrics')
  const [activeImageModal, setActiveImageModal] = useState<{ src: string; title: string } | null>(null)

  // Interactive CSV Telemetry State
  const [csvData, setCsvData] = useState<GaitCsvRow[]>([])
  const [activeJoint, setActiveJoint] = useState<'knee' | 'hip' | 'ankle'>('knee')

  // Patient Name Editing State
  const [isEditingName, setIsEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (data?.csv_url) {
      fetchGaitCsv(getStaticUrl(data.csv_url), 1)
        .then(setCsvData)
        .catch(() => {})
    }
  }, [data])

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    if (dateStr && sessionNum) {
      fetchDetail()
    }
  }, [dateStr, sessionNum, router])

  async function fetchDetail() {
    try {
      const res = await getSessionDetail(dateStr, sessionNum)
      setData(res)
    } catch (err: any) {
      setError(err.message || 'Session not found')
    } finally {
      setLoading(false)
    }
  }

  async function handleSavePatientName() {
    if (!editNameValue.trim()) return
    setSavingName(true)
    try {
      await updateSessionPatientName(dateStr, sessionNum, editNameValue.trim())
      setIsEditingName(false)
      await fetchDetail()
    } catch (err: any) {
      alert(err.message || 'Failed to update patient name')
    } finally {
      setSavingName(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="p-12 text-center text-xs text-[#6E6E73]">
          Loading session biomechanics telemetry details…
        </div>
      </AppShell>
    )
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="bg-[#FFFFFF] p-8 text-center max-w-md mx-auto my-12 space-y-4 shadow-sm border border-[#E5E5E7] rounded-2xl">
          <AlertCircle className="w-8 h-8 text-[#B3261E] mx-auto" />
          <p className="text-sm font-semibold text-[#1D1D1F]">{error || 'Session not found'}</p>
          <Link href="/sessions" className="btn-outline text-xs inline-flex rounded-lg">
            Return to Sessions
          </Link>
        </div>
      </AppShell>
    )
  }

  const { meta, report, images, docx_url, csv_url } = data

  const getAsymmetryBadge = (deg: number) => {
    if (deg >= 20) return { label: 'High Asymmetry (≥20°)', class: 'badge-high' }
    if (deg >= 10) return { label: 'Mild Asymmetry (≥10°)', class: 'badge-mild' }
    return { label: 'Within Range (<10°)', class: 'badge-good' }
  }

  const getConfidenceBadge = (confFrac: number) => {
    const pct = confFrac * 100
    if (pct >= 70) return { label: `${pct.toFixed(1)}% Good`, class: 'badge-good' }
    if (pct >= 50) return { label: `${pct.toFixed(1)}% Mild`, class: 'badge-mild' }
    return { label: `${pct.toFixed(1)}% Low`, class: 'badge-high' }
  }

  const meanConf = meta.mean_confidence || report?.tracking?.mean || 0
  const confBadge = getConfidenceBadge(meanConf)
  const videoUrl = `/sessions/${dateStr}/${sessionNum}/output_annotated.mp4`

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header Breadcrumb & Actions Banner */}
        <div className="bg-[#FFFFFF] p-6 shadow-sm border border-[#E5E5E7] rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Link href="/sessions" className="p-2 rounded-xl hover:bg-[#FAFAFA] border border-[#E5E5E7] text-[#6E6E73] transition-colors mt-0.5">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2.5">
                  {/* Lucide User Icon Badge (No broken character glyph box!) */}
                  <div className="w-8 h-8 rounded-full bg-[#E7F5EA] border border-[#0B6E4F]/20 flex items-center justify-center text-[#0B6E4F] shrink-0 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>

                  {isEditingName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="input-form text-xs py-1 px-2.5 h-8 rounded-lg border-[#0B6E4F]"
                        autoFocus
                      />
                      <button
                        onClick={handleSavePatientName}
                        disabled={savingName}
                        className="p-1.5 rounded-lg bg-[#0B6E4F] text-white hover:bg-[#08553d]"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="p-1.5 rounded-lg bg-[#E5E5E7] text-[#1D1D1F] hover:bg-[#d0d0d2]"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-[#1D1D1F] tracking-tight">
                        {meta.patient_name || 'Patient'} — {meta.session_label || `Session ${meta.session_number}`}
                      </h1>
                      <button
                        onClick={() => {
                          setIsEditingName(true)
                          setEditNameValue(meta.patient_name || 'Patient')
                        }}
                        className="text-[#6E6E73] hover:text-[#0B6E4F] p-1 rounded-md transition-colors"
                        title="Edit misspelled patient name"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6E6E73] mt-1.5">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[#0B6E4F]" />
                    Recorded: {meta.recorded_date || meta.date} {meta.recorded_time ? `at ${meta.recorded_time}` : ''}
                  </span>
                  <span>·</span>
                  <span>File: <strong className="text-[#1D1D1F] font-semibold">{meta.video_filename}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {csv_url && (
                <a
                  href={getStaticUrl(csv_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline text-xs h-9 px-3.5 rounded-lg"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#6E6E73]" />
                  <span>CSV Telemetry</span>
                </a>
              )}
              {docx_url && (
                <a
                  href={getStaticUrl(docx_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-accent text-xs h-9 px-4 rounded-lg shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report (.docx)</span>
                </a>
              )}
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-2 border-t border-[#E5E5E7] pt-4">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'metrics' ? 'bg-[#0B6E4F] text-white' : 'text-[#6E6E73] hover:bg-[#FAFAFA] hover:text-[#1D1D1F]'}`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Clinical Metrics & ROM</span>
            </button>

            <button
              onClick={() => setActiveTab('plots')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'plots' ? 'bg-[#0B6E4F] text-white' : 'text-[#6E6E73] hover:bg-[#FAFAFA] hover:text-[#1D1D1F]'}`}
            >
              <Activity className="w-4 h-4" />
              <span>Biomechanics Figures ({images ? 4 : 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'video' ? 'bg-[#0B6E4F] text-white' : 'text-[#6E6E73] hover:bg-[#FAFAFA] hover:text-[#1D1D1F]'}`}
            >
              <Video className="w-4 h-4" />
              <span>Annotated Gait Video</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Clinical Metrics & ROM */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Top Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-[#FFFFFF] p-5 rounded-2xl shadow-sm border border-[#E5E5E7]">
                <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Session Duration</p>
                <p className="text-2xl font-extrabold text-[#1D1D1F]">{meta.duration_sec || report?.total_time_sec || 0}s</p>
                <p className="text-[10px] text-[#6E6E73] mt-0.5">{meta.fps || report?.fps || 30} FPS Rate</p>
              </div>

              <div className="bg-[#FFFFFF] p-5 rounded-2xl shadow-sm border border-[#E5E5E7]">
                <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Steps Detected</p>
                <p className="text-2xl font-extrabold text-[#0B6E4F]">{report?.total_steps || 0}</p>
                <p className="text-[10px] text-[#6E6E73] mt-0.5">Left: {report?.left_steps || 0} · Right: {report?.right_steps || 0}</p>
              </div>

              <div className="bg-[#FFFFFF] p-5 rounded-2xl shadow-sm border border-[#E5E5E7]">
                <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Walking Cadence</p>
                <p className="text-2xl font-extrabold text-[#1E7B34]">{meta.cadence_spm || report?.cadence_steps_per_min || 0} <span className="text-xs font-normal text-[#6E6E73]">spm</span></p>
                <p className="text-[10px] text-[#6E6E73] mt-0.5">Physiological pace</p>
              </div>

              <div className="bg-[#FFFFFF] p-5 rounded-2xl shadow-sm border border-[#E5E5E7]">
                <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Tracking Confidence</p>
                <div className="mt-1">
                  <span className={`badge-soft ${confBadge.class}`}>
                    {confBadge.label}
                  </span>
                </div>
                <p className="text-[10px] text-[#6E6E73] mt-1.5">
                  {report?.tracking?.good_frames || 0} / {report?.tracking?.total_frames || 0} visible frames
                </p>
              </div>
            </div>

            {/* ROM, Asymmetry & L-R Correlation Section */}
            {report && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">Joint Range of Motion (ROM) & Asymmetry</h2>
                  <span className="text-[11px] text-[#6E6E73]">3D trajectory vectors & Pearson L-R correlation</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['knee', 'hip', 'ankle'].map((j) => {
                    const romL = report.rom?.[j]?.left || 0
                    const romR = report.rom?.[j]?.right || 0
                    const asym = report.asymmetry_deg?.[j] || 0
                    const corr = report.correlation?.[j] ?? 'N/A'
                    const badge = getAsymmetryBadge(asym)

                    return (
                      <div key={j} className="bg-[#FFFFFF] p-5 space-y-3 shadow-sm border border-[#E5E5E7] rounded-2xl">
                        <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-2.5">
                          <h3 className="text-sm font-bold text-[#1D1D1F] capitalize">{j} Joint</h3>
                          <span className={`badge-soft ${badge.class}`}>{badge.label}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7]">
                            <p className="text-[10px] font-semibold text-[#6E6E73] tracking-wider">LEFT ROM</p>
                            <p className="text-lg font-extrabold text-[#0B6E4F] mt-0.5">{romL}°</p>
                          </div>
                          <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7]">
                            <p className="text-[10px] font-semibold text-[#6E6E73] tracking-wider">RIGHT ROM</p>
                            <p className="text-lg font-extrabold text-[#0B6E4F] mt-0.5">{romR}°</p>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1 text-xs">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAFA]">
                            <span className="text-[#6E6E73]">L-R Asymmetry:</span>
                            <span className="font-bold text-[#1D1D1F]">{asym}°</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAFA]">
                            <span className="text-[#6E6E73]">L-R Pearson Correlation:</span>
                            <span className="font-bold text-[#0B6E4F]">{corr}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Pelvis Movement Card */}
            {report?.pelvis && (
              <div className="bg-[#FFFFFF] p-5 space-y-3 shadow-sm border border-[#E5E5E7] rounded-2xl">
                <h3 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">Pelvis & Core Kinematics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] flex items-center justify-between">
                    <span className="text-[#6E6E73]">Pelvis Tilt ROM</span>
                    <span className="font-bold text-[#1D1D1F] text-base">{report.pelvis.tilt_rom_deg}°</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] flex items-center justify-between">
                    <span className="text-[#6E6E73]">Pelvis Rotation ROM</span>
                    <span className="font-bold text-[#1D1D1F] text-base">{report.pelvis.rotation_rom_deg}°</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E7] flex items-center justify-between">
                    <span className="text-[#6E6E73]">Mean Pelvis Tilt</span>
                    <span className="font-bold text-[#1D1D1F] text-base">{report.pelvis.mean_tilt_deg || 0}°</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3 SEPARATE LIVE GRAPHS: Knees, Hips, Ankles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#0B6E4F]" />
                    3 Live Telemetry Trajectory Graphs (Knees, Hips, Ankles)
                  </h3>
                  <p className="text-xs text-[#6E6E73] mt-0.5">Interactive frame-by-frame joint angle trajectories (Left vs Right)</p>
                </div>
              </div>

              {csvData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Graph 1: Knee */}
                  <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5E7] shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-2.5">
                      <h4 className="text-xs font-bold text-[#1D1D1F]">1. Knee Joint Flexion Curve</h4>
                      <span className="text-[10px] font-semibold text-[#0B6E4F] bg-[#E7F5EA] px-2 py-0.5 rounded-md">Left vs Right</span>
                    </div>
                    <JointTimeSeriesChart data={csvData} joint="knee" height={260} />
                  </div>

                  {/* Graph 2: Hip */}
                  <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5E7] shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-2.5">
                      <h4 className="text-xs font-bold text-[#1D1D1F]">2. Hip Joint Flexion Curve</h4>
                      <span className="text-[10px] font-semibold text-[#0B6E4F] bg-[#E7F5EA] px-2 py-0.5 rounded-md">Left vs Right</span>
                    </div>
                    <JointTimeSeriesChart data={csvData} joint="hip" height={260} />
                  </div>

                  {/* Graph 3: Ankle */}
                  <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5E7] shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-2.5">
                      <h4 className="text-xs font-bold text-[#1D1D1F]">3. Ankle Joint Angle Curve</h4>
                      <span className="text-[10px] font-semibold text-[#0B6E4F] bg-[#E7F5EA] px-2 py-0.5 rounded-md">Left vs Right</span>
                    </div>
                    <JointTimeSeriesChart data={csvData} joint="ankle" height={260} />
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#6E6E73] bg-[#FFFFFF] rounded-2xl border border-dashed border-[#E5E5E7]">
                  Loading live CSV joint telemetry data...
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Biomechanics Figures Grid */}
        {activeTab === 'plots' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1D1D1F]">Matplotlib Joint Angle Plots & Time-Series Visualizations</h2>
              <span className="text-xs text-[#6E6E73]">Click any plot to inspect in high-resolution lightbox</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: 'comprehensive', title: 'Figure 1: Comprehensive Gait Timeline & Asymmetry', src: images.comprehensive, desc: 'Overall joint angle trajectories over time, step event detection, and L-R asymmetry.' },
                { id: 'knee', title: 'Figure 2: Knee Joint Flexion & Extension Analysis', src: images.knee, desc: 'Left vs Right knee flexion time-series curves and angle frequency distribution.' },
                { id: 'hip', title: 'Figure 3: Hip Joint Flexion & Extension Analysis', src: images.hip, desc: 'Left vs Right hip extension curves and angular frequency distribution.' },
                { id: 'ankle', title: 'Figure 4: Ankle Dorsiflexion & Plantarflexion Analysis', src: images.ankle, desc: 'Left vs Right ankle dorsiflexion time-series and angular distribution.' },
              ].map((fig) => (
                <div key={fig.id} className="bg-[#FFFFFF] overflow-hidden p-4 shadow-sm border border-[#E5E5E7] rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-[#1D1D1F]">{fig.title}</h3>
                      <button 
                        onClick={() => setActiveImageModal({ src: getStaticUrl(fig.src), title: fig.title })}
                        className="text-[#6E6E73] hover:text-[#0B6E4F] p-1 rounded-md hover:bg-[#FAFAFA]"
                        title="Expand plot"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div 
                      className="bg-[#FAFAFA] rounded-xl border border-[#E5E5E7] p-2 flex items-center justify-center min-h-[240px] cursor-pointer hover:border-[#0B6E4F]/50 transition-colors"
                      onClick={() => setActiveImageModal({ src: getStaticUrl(fig.src), title: fig.title })}
                    >
                      <img 
                        src={getStaticUrl(fig.src)} 
                        alt={fig.title}
                        className="w-full h-auto rounded-lg object-contain max-h-[340px]" 
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6E6E73] mt-3 px-1 leading-relaxed">
                    {fig.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Annotated Gait Video Player */}
        {activeTab === 'video' && (
          <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E5E5E7] shadow-sm space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#0B6E4F]" />
                  MediaPipe Pose Annotated Video Playback
                </h3>
                <p className="text-xs text-[#6E6E73] mt-0.5">Includes real-time joint angle overlay & pose skeleton tracking</p>
              </div>
            </div>

            <div className="bg-black rounded-xl overflow-hidden shadow-md aspect-video flex items-center justify-center">
              <video
                controls
                className="w-full h-full object-contain"
                src={getStaticUrl(videoUrl)}
              >
                Your browser does not support HTML5 video playback.
              </video>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Image Modal */}
      {activeImageModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setActiveImageModal(null)}>
          <div className="bg-[#FFFFFF] rounded-2xl max-w-4xl w-full p-4 space-y-3 relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-3">
              <h3 className="text-sm font-bold text-[#1D1D1F]">{activeImageModal.title}</h3>
              <button 
                onClick={() => setActiveImageModal(null)}
                className="p-1 rounded-md text-[#6E6E73] hover:bg-[#FAFAFA] hover:text-[#1D1D1F]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto flex items-center justify-center bg-[#FAFAFA] rounded-xl p-2">
              <img src={activeImageModal.src} alt={activeImageModal.title} className="max-w-full h-auto rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
