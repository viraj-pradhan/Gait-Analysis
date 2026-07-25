'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { JointTimeSeriesChart } from '@/components/charts/JointTimeSeriesChart'
import { fetchGaitCsv, GaitCsvRow } from '@/lib/csv'
import { getToken, getSessionDetail, getStaticUrl, updateSessionPatientName } from '@/lib/api'
import { getConfidenceTier, getAsymmetryTier } from '@/lib/badges'
import { 
  ArrowLeft, 
  Download, 
  Activity, 
  AlertCircle,
  FileSpreadsheet,
  User,
  Calendar,
  Maximize2,
  X,
  Play,
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
        <div className="p-12 text-center text-[13px] text-[#6E6E73] font-sans">
          Loading session biomechanics telemetry details…
        </div>
      </AppShell>
    )
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="bg-[#FFFFFF] p-[32px] text-center max-w-md mx-auto my-12 space-y-4 border border-[#E5E5E7] rounded-[8px] font-sans">
          <AlertCircle className="w-8 h-8 text-[#B3261E] mx-auto" />
          <p className="text-[14px] font-[600] text-[#1D1D1F]">{error || 'Session not found'}</p>
          <Link href="/sessions" className="h-[36px] px-4 bg-[#FFFFFF] border border-[#E5E5E7] rounded-[6px] text-[13px] font-[500] text-[#1D1D1F] inline-flex items-center justify-center">
            Return to Sessions
          </Link>
        </div>
      </AppShell>
    )
  }

  const { meta, report, images, docx_url, csv_url } = data

  const meanConf = meta.mean_confidence || report?.tracking?.mean || 0
  const confTier = getConfidenceTier(meanConf)
  const videoUrl = `/sessions/${dateStr}/${sessionNum}/output_annotated.mp4`

  const hasRealName = meta.patient_name && meta.patient_name !== 'Unknown Patient'
  const patientDisplayName = hasRealName ? meta.patient_name! : 'Unassigned Patient'

  return (
    <AppShell>
      <div className="space-y-6 font-sans antialiased text-[#1D1D1F]">
        {/* Header Card (24px Padding, 8px Radius, 1px Border) */}
        <div className="bg-[#FFFFFF] p-[24px] border border-[#E5E5E7] rounded-[8px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Title & Back Arrow Row (18px Arrow & Title, Single Row, 12px Gaps) */}
            <div className="flex items-start gap-[12px] min-w-0">
              <Link 
                href="/sessions" 
                className="w-[36px] h-[36px] rounded-[6px] border border-[#E5E5E7] bg-[#FFFFFF] hover:bg-[#FAFAFA] flex items-center justify-center text-[#6E6E73] transition-colors shrink-0 mt-[2px]"
                title="Back to Sessions"
              >
                <ArrowLeft className="w-[18px] h-[18px]" />
              </Link>
              
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
                      <h1 className="text-[18px] font-[600] text-[#1D1D1F] tracking-tight truncate">
                        {patientDisplayName} — {meta.session_label || `Session ${meta.session_number}`}
                      </h1>
                      <button
                        onClick={() => {
                          setIsEditingName(true)
                          setEditNameValue(hasRealName ? meta.patient_name! : '')
                        }}
                        className="w-[28px] h-[28px] flex items-center justify-center text-[#6E6E73] hover:text-[#0B6E4F] rounded-[4px] hover:bg-[#FAFAFA] transition-colors cursor-pointer shrink-0"
                        title={hasRealName ? "Edit patient name" : "Assign patient name"}
                      >
                        <Pencil className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Meta Row Below (13px/400 #6E6E73, 8px Margin-Top) */}
                <div className="text-[13px] font-[400] text-[#6E6E73] mt-[8px] flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Recorded: <strong className="font-[500] text-[#1D1D1F]">{meta.recorded_date || meta.date}</strong> {meta.recorded_time ? `at ${meta.recorded_time}` : ''}</span>
                  <span>·</span>
                  <span className="truncate max-w-xs sm:max-w-md" title={meta.video_filename}>
                    File: <strong className="font-[500] text-[#1D1D1F]">{meta.video_filename}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons Row (36px Height, 8px Gap) */}
            <div className="flex items-center gap-[8px] shrink-0">
              {csv_url && (
                <a
                  href={getStaticUrl(csv_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="h-[36px] px-[14px] bg-[#FFFFFF] border border-[#E5E5E7] hover:bg-[#FAFAFA] text-[#1D1D1F] rounded-[6px] text-[13px] font-[500] flex items-center gap-[6px] transition-all"
                >
                  <FileSpreadsheet className="w-[14px] h-[14px] text-[#6E6E73]" />
                  <span>CSV Telemetry</span>
                </a>
              )}
              {docx_url && (
                <a
                  href={getStaticUrl(docx_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="h-[36px] px-[16px] bg-[#0B6E4F] hover:opacity-90 text-white rounded-[6px] text-[13px] font-[500] flex items-center gap-[6px] transition-all cursor-pointer"
                >
                  <Download className="w-[14px] h-[14px]" />
                  <span>Download Report (.docx)</span>
                </a>
              )}
            </div>
          </div>

          {/* Navigation Tabs (36px Height, 8px Gap, 20px Margin-Top) */}
          <div className="flex items-center gap-[8px] border-t border-[#E5E5E7] pt-[16px] mt-[20px]">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`h-[36px] px-[16px] text-[13px] font-[500] rounded-[6px] flex items-center gap-[6px] transition-all cursor-pointer ${
                activeTab === 'metrics'
                  ? 'bg-[#0B6E4F] text-white'
                  : 'bg-transparent text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#FAFAFA]'
              }`}
            >
              <BarChart3 className="w-[14px] h-[14px]" />
              <span>Clinical Metrics & ROM</span>
            </button>

            <button
              onClick={() => setActiveTab('plots')}
              className={`h-[36px] px-[16px] text-[13px] font-[500] rounded-[6px] flex items-center gap-[6px] transition-all cursor-pointer ${
                activeTab === 'plots'
                  ? 'bg-[#0B6E4F] text-white'
                  : 'bg-transparent text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#FAFAFA]'
              }`}
            >
              <Activity className="w-[14px] h-[14px]" />
              <span>Biomechanics Figures ({images ? 4 : 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('video')}
              className={`h-[36px] px-[16px] text-[13px] font-[500] rounded-[6px] flex items-center gap-[6px] transition-all cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-[#0B6E4F] text-white'
                  : 'bg-transparent text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#FAFAFA]'
              }`}
            >
              <Video className="w-[14px] h-[14px]" />
              <span>Annotated Gait Video</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Clinical Metrics & ROM */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Stat Cards Row (4-Column Grid, 12px Gap) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
              {/* Card 1: Session Duration */}
              <div className="bg-[#FFFFFF] p-[16px] border border-[#E5E5E7] rounded-[8px]">
                <span className="text-[12px] font-[500] text-[#6E6E73] uppercase tracking-[0.02em] block">
                  Session Duration
                </span>
                <span className="text-[20px] font-[600] text-[#1D1D1F] mt-[4px] block">
                  {meta.duration_sec || report?.total_time_sec || 0}s
                </span>
                <span className="text-[11px] font-[400] text-[#6E6E73] mt-[4px] block">
                  {meta.fps || report?.fps || 30} FPS Rate
                </span>
              </div>

              {/* Card 2: Steps Detected */}
              <div className="bg-[#FFFFFF] p-[16px] border border-[#E5E5E7] rounded-[8px]">
                <span className="text-[12px] font-[500] text-[#6E6E73] uppercase tracking-[0.02em] block">
                  Steps Detected
                </span>
                <span className="text-[20px] font-[600] text-[#0B6E4F] mt-[4px] block">
                  {report?.total_steps || 0}
                </span>
                <span className="text-[11px] font-[400] text-[#6E6E73] mt-[4px] block">
                  Left: {report?.left_steps || 0} · Right: {report?.right_steps || 0}
                </span>
              </div>

              {/* Card 3: Walking Cadence */}
              <div className="bg-[#FFFFFF] p-[16px] border border-[#E5E5E7] rounded-[8px]">
                <span className="text-[12px] font-[500] text-[#6E6E73] uppercase tracking-[0.02em] block">
                  Walking Cadence
                </span>
                <span className="text-[20px] font-[600] text-[#0B6E4F] mt-[4px] block">
                  {meta.cadence_spm || report?.cadence_steps_per_min || 0} <span className="text-[12px] font-[400] text-[#6E6E73]">spm</span>
                </span>
                <span className="text-[11px] font-[400] text-[#6E6E73] mt-[4px] block">
                  Physiological pace
                </span>
              </div>

              {/* Card 4: Tracking Confidence */}
              <div className="bg-[#FFFFFF] p-[16px] border border-[#E5E5E7] rounded-[8px]">
                <span className="text-[12px] font-[500] text-[#6E6E73] uppercase tracking-[0.02em] block">
                  Tracking Confidence
                </span>
                <div className="mt-[4px]">
                  <span 
                    className="text-[11px] font-[500] px-[8px] py-[2px] rounded-[4px] inline-block"
                    style={{ color: confTier.textColor, backgroundColor: confTier.bgColor }}
                  >
                    {confTier.fullLabel}
                  </span>
                </div>
                <span className="text-[11px] font-[400] text-[#6E6E73] mt-[4px] block">
                  {report?.tracking?.good_frames || 0} / {report?.tracking?.total_frames || 0} visible frames
                </span>
              </div>
            </div>

            {/* Joint ROM & Asymmetry Section (Bounded Cards) */}
            {report && (
              <div className="space-y-3">
                <h2 className="text-[14px] font-[600] text-[#1D1D1F]">Joint Range of Motion (ROM) & Asymmetry</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px]">
                  {(['knee', 'hip', 'ankle'] as const).map((j) => {
                    const romL = report.rom?.[j]?.left || 0
                    const romR = report.rom?.[j]?.right || 0
                    const asym = report.asymmetry_deg?.[j] || 0
                    const corr = report.correlation?.[j]
                    const asymTier = getAsymmetryTier(asym)
                    const jointTitle = j.charAt(0).toUpperCase() + j.slice(1)

                    return (
                      <div key={j} className="bg-[#FFFFFF] p-[16px] border border-[#E5E5E7] rounded-[8px] space-y-3">
                        {/* Header Row: Joint Name Left, Asymmetry Badge Right */}
                        <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-[10px]">
                          <h3 className="text-[15px] font-[600] text-[#1D1D1F]">{jointTitle} Joint</h3>
                          <span 
                            className="text-[11px] font-[500] px-[8px] py-[2px] rounded-[4px]"
                            style={{ color: asymTier.textColor, backgroundColor: asymTier.bgColor }}
                          >
                            {asymTier.label}
                          </span>
                        </div>

                        {/* ROM Values (2-Column Grid, 12px Gap, 12px Margin-Top) */}
                        <div className="grid grid-cols-2 gap-[12px] mt-[12px] text-center">
                          <div className="p-[10px] bg-[#FAFAFA] border border-[#E5E5E7] rounded-[6px]">
                            <span className="text-[11px] font-[500] text-[#6E6E73] uppercase tracking-[0.02em] block">LEFT ROM</span>
                            <span className="text-[18px] font-[600] text-[#0B6E4F] mt-[2px] block">{romL}°</span>
                          </div>
                          <div className="p-[10px] bg-[#FAFAFA] border border-[#E5E5E7] rounded-[6px]">
                            <span className="text-[11px] font-[500] text-[#6E6E73] uppercase tracking-[0.02em] block">RIGHT ROM</span>
                            <span className="text-[18px] font-[600] text-[#0B6E4F] mt-[2px] block">{romR}°</span>
                          </div>
                        </div>

                        {/* Asymmetry + Correlation (2-Column Row, 12px Margin-Top) */}
                        <div className="grid grid-cols-2 gap-[12px] mt-[12px] pt-[8px] border-t border-[#E5E5E7] text-[13px]">
                          <div>
                            <span className="text-[11px] font-[500] text-[#6E6E73] block">L-R Asymmetry</span>
                            <span className="font-[600] text-[#1D1D1F] block mt-[2px]">{asym}°</span>
                          </div>
                          <div>
                            <span className="text-[11px] font-[500] text-[#6E6E73] block">L-R Pearson Correlation</span>
                            {corr != null && typeof corr === 'number' ? (
                              <span className="font-[600] text-[#0B6E4F] block mt-[2px]">{corr}</span>
                            ) : (
                              <span className="text-[12px] font-[400] text-[#6E6E73] italic block mt-[2px]">
                                Insufficient tracked frames for correlation
                              </span>
                            )}
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
              <div className="bg-[#FFFFFF] p-[16px] border border-[#E5E5E7] rounded-[8px] space-y-3">
                <h3 className="text-[14px] font-[600] text-[#1D1D1F]">Pelvis & Core Kinematics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] text-[13px]">
                  <div className="p-[12px] bg-[#FAFAFA] border border-[#E5E5E7] rounded-[6px] flex items-center justify-between">
                    <span className="text-[#6E6E73]">Pelvis Tilt ROM</span>
                    <span className="font-[600] text-[#1D1D1F] text-[16px]">{report.pelvis.tilt_rom_deg}°</span>
                  </div>
                  <div className="p-[12px] bg-[#FAFAFA] border border-[#E5E5E7] rounded-[6px] flex items-center justify-between">
                    <span className="text-[#6E6E73]">Pelvis Rotation ROM</span>
                    <span className="font-[600] text-[#1D1D1F] text-[16px]">{report.pelvis.rotation_rom_deg}°</span>
                  </div>
                  <div className="p-[12px] bg-[#FAFAFA] border border-[#E5E5E7] rounded-[6px] flex items-center justify-between">
                    <span className="text-[#6E6E73]">Mean Pelvis Tilt</span>
                    <span className="font-[600] text-[#1D1D1F] text-[16px]">{report.pelvis.mean_tilt_deg || 0}°</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3 SEPARATE LIVE GRAPHS: Knees, Hips, Ankles */}
            <div className="space-y-4">
              <div className="border-b border-[#E5E5E7] pb-3">
                <h3 className="text-[16px] font-[600] text-[#1D1D1F] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0B6E4F]" />
                  3 Live Joint Trajectory Telemetry Graphs
                </h3>
                <p className="text-[13px] font-[400] text-[#6E6E73] mt-[2px]">Interactive frame-by-frame joint angle trajectories (Left vs Right)</p>
              </div>

              {csvData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
                  {/* Graph 1: Knee */}
                  <div className="bg-[#FFFFFF] p-[16px] rounded-[8px] border border-[#E5E5E7] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-[8px]">
                      <h4 className="text-[13px] font-[600] text-[#1D1D1F]">1. Knee Joint Flexion Curve</h4>
                      <span className="text-[11px] font-[500] text-[#0B6E4F] bg-[#E7F5EA] px-2 py-0.5 rounded-[4px]">Left vs Right</span>
                    </div>
                    <JointTimeSeriesChart data={csvData} joint="knee" height={240} />
                  </div>

                  {/* Graph 2: Hip */}
                  <div className="bg-[#FFFFFF] p-[16px] rounded-[8px] border border-[#E5E5E7] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-[8px]">
                      <h4 className="text-[13px] font-[600] text-[#1D1D1F]">2. Hip Joint Flexion Curve</h4>
                      <span className="text-[11px] font-[500] text-[#0B6E4F] bg-[#E7F5EA] px-2 py-0.5 rounded-[4px]">Left vs Right</span>
                    </div>
                    <JointTimeSeriesChart data={csvData} joint="hip" height={240} />
                  </div>

                  {/* Graph 3: Ankle */}
                  <div className="bg-[#FFFFFF] p-[16px] rounded-[8px] border border-[#E5E5E7] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-[8px]">
                      <h4 className="text-[13px] font-[600] text-[#1D1D1F]">3. Ankle Joint Angle Curve</h4>
                      <span className="text-[11px] font-[500] text-[#0B6E4F] bg-[#E7F5EA] px-2 py-0.5 rounded-[4px]">Left vs Right</span>
                    </div>
                    <JointTimeSeriesChart data={csvData} joint="ankle" height={240} />
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-[13px] text-[#6E6E73] bg-[#FFFFFF] rounded-[8px] border border-dashed border-[#E5E5E7]">
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
              <h2 className="text-[16px] font-[600] text-[#1D1D1F]">Matplotlib Joint Angle Plots & Time-Series Visualizations</h2>
              <span className="text-[13px] font-[400] text-[#6E6E73]">Click any plot to inspect in high-resolution lightbox</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
              {[
                { id: 'comprehensive', title: 'Figure 1: Comprehensive Gait Timeline & Asymmetry', src: images.comprehensive, desc: 'Overall joint angle trajectories over time, step event detection, and L-R asymmetry.' },
                { id: 'knee', title: 'Figure 2: Knee Joint Flexion & Extension Analysis', src: images.knee, desc: 'Left vs Right knee flexion time-series curves and angle frequency distribution.' },
                { id: 'hip', title: 'Figure 3: Hip Joint Flexion & Extension Analysis', src: images.hip, desc: 'Left vs Right hip extension curves and angular frequency distribution.' },
                { id: 'ankle', title: 'Figure 4: Ankle Dorsiflexion & Plantarflexion Analysis', src: images.ankle, desc: 'Left vs Right ankle dorsiflexion time-series and angular distribution.' },
              ].map((fig) => (
                <div key={fig.id} className="bg-[#FFFFFF] overflow-hidden p-[16px] border border-[#E5E5E7] rounded-[8px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[13px] font-[600] text-[#1D1D1F]">{fig.title}</h3>
                      <button
                        onClick={() => setActiveImageModal({ src: getStaticUrl(fig.src), title: fig.title })}
                        className="p-1 rounded-[4px] text-[#6E6E73] hover:text-[#0B6E4F] hover:bg-[#FAFAFA] transition-colors"
                        title="Expand Image"
                      >
                        <Maximize2 className="w-[14px] h-[14px]" />
                      </button>
                    </div>
                    <p className="text-[12px] font-[400] text-[#6E6E73] mb-[12px]">{fig.desc}</p>
                  </div>
                  <div 
                    className="relative cursor-pointer rounded-[6px] overflow-hidden border border-[#E5E5E7] bg-[#FAFAFA] group"
                    onClick={() => setActiveImageModal({ src: getStaticUrl(fig.src), title: fig.title })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={getStaticUrl(fig.src)} 
                      alt={fig.title} 
                      className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-200" 
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                      Click to expand
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Annotated Gait Video */}
        {activeTab === 'video' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-[600] text-[#1D1D1F]">Annotated Skeleton Telemetry Video Playback</h2>
              <span className="text-[13px] font-[400] text-[#6E6E73]">Includes MediaPipe 3D joint landmarks and real-time tracking confidence</span>
            </div>

            <div className="bg-[#FFFFFF] p-[16px] border border-[#E5E5E7] rounded-[8px] space-y-3 max-w-4xl mx-auto">
              <div className="relative rounded-[6px] overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video 
                  controls 
                  preload="metadata" 
                  className="w-full h-full object-contain"
                  src={getStaticUrl(videoUrl)}
                >
                  Your browser does not support HTML5 video playback.
                </video>
              </div>
              <div className="flex items-center justify-between text-[12px] font-[400] text-[#6E6E73] px-1">
                <span className="flex items-center gap-1"><Play className="w-3.5 h-3.5 text-[#0B6E4F]" /> MP4 Annotated Render</span>
                <span>Subsampled CLAHE Enhanced Frame Capture</span>
              </div>
            </div>
          </div>
        )}

        {/* Image Lightbox Modal */}
        {activeImageModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-[#E5E5E7] flex items-center justify-between">
                <h3 className="text-[14px] font-[600] text-[#1D1D1F]">{activeImageModal.title}</h3>
                <button
                  onClick={() => setActiveImageModal(null)}
                  className="p-1 rounded-[4px] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#FAFAFA]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-[#FAFAFA]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={activeImageModal.src} 
                  alt={activeImageModal.title} 
                  className="max-w-full max-h-[75vh] object-contain rounded-[4px]" 
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
