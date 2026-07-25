'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { JointTimeSeriesChart } from '@/components/charts/JointTimeSeriesChart'
import { fetchGaitCsv, GaitCsvRow } from '@/lib/csv'
import { getToken, getSessionDetail, getStaticUrl, updateSessionPatientName } from '@/lib/api'
import { getConfidenceTier } from '@/lib/badges'
import { getPatientSlug } from '@/lib/session-utils'
import { 
  ArrowLeft, 
  Download, 
  AlertCircle,
  X,
  Play,
  FileText,
  Video,
  Pencil,
  Check,
  Maximize2,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw
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
  const [activeTab, setActiveTab] = useState<'report' | 'telemetry' | 'video'>('report')
  const [activeImageModal, setActiveImageModal] = useState<{ src: string; title: string } | null>(null)

  // Interactive CSV Telemetry & Zoom State
  const [csvData, setCsvData] = useState<GaitCsvRow[]>([])
  const [zoomScale, setZoomScale] = useState<number>(1.0)

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
          Loading session report telemetry…
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

  const { meta, report, images, docx_url } = data
  const videoUrl = `/sessions/${dateStr}/${sessionNum}/output_annotated.mp4`

  const hasRealName = meta.patient_name && meta.patient_name !== 'Unknown Patient'
  const patientDisplayName = hasRealName ? meta.patient_name! : 'Unassigned Patient'

  // Formatting helpers for Section 1 Overview
  const leftTiming = report?.step_timing?.left
  const rightTiming = report?.step_timing?.right
  const leftIntervalStr = leftTiming?.mean ? `${leftTiming.mean}s ± ${leftTiming.std}s` : 'N/A'
  const rightIntervalStr = rightTiming?.mean ? `${rightTiming.mean}s ± ${rightTiming.std}s` : 'N/A'

  // Tracking quality tier
  const meanConfPct = report?.tracking?.mean ? report.tracking.mean * 100 : 0
  const trackingTier = getConfidenceTier(report?.tracking?.mean)

  return (
    <AppShell>
      <div className="space-y-6 font-sans antialiased text-[#1D1D1F]">
        {/* Header Card (24px Padding, 8px Radius, 1px Border) */}
        <div className="bg-[#FFFFFF] p-[24px] border border-[#E5E5E7] rounded-[8px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Title & Back Arrow Row */}
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
                        <Link 
                          href={`/patients/${getPatientSlug(meta.patient_name)}`}
                          className="hover:underline"
                        >
                          {patientDisplayName}
                        </Link> — {meta.session_label || `Session ${meta.session_number}`}
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

                {/* Meta Row Below */}
                <div className="text-[13px] font-[400] text-[#6E6E73] mt-[8px] flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Recorded: <strong className="font-[500] text-[#1D1D1F]">{meta.recorded_date || meta.date}</strong> {meta.recorded_time ? `at ${meta.recorded_time}` : ''}</span>
                  <span>·</span>
                  <span className="truncate max-w-xs sm:max-w-md" title={meta.video_filename}>
                    File: <strong className="font-[500] text-[#1D1D1F]">{meta.video_filename}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Row — EXACTLY ONE BUTTON: Download Report (.docx) */}
            <div className="flex items-center gap-[8px] shrink-0">
              {docx_url && (
                <a
                  href={getStaticUrl(docx_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="h-[36px] px-[16px] bg-[#0B6E4F] hover:opacity-90 text-white rounded-[6px] text-[13px] font-[500] flex items-center gap-[6px] transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-[14px] h-[14px]" />
                  <span>Download Report (.docx)</span>
                </a>
              )}
            </div>
          </div>

          {/* Navigation Tabs — THREE TABS: Report, Live Telemetry, Annotated Gait Video */}
          <div className="flex items-center gap-[8px] border-t border-[#E5E5E7] pt-[16px] mt-[20px]">
            <button
              onClick={() => setActiveTab('report')}
              className={`h-[36px] px-[16px] text-[13px] font-[500] rounded-[6px] flex items-center gap-[6px] transition-all cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-[#0B6E4F] text-white'
                  : 'bg-transparent text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#FAFAFA]'
              }`}
            >
              <FileText className="w-[14px] h-[14px]" />
              <span>Report</span>
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`h-[36px] px-[16px] text-[13px] font-[500] rounded-[6px] flex items-center gap-[6px] transition-all cursor-pointer ${
                activeTab === 'telemetry'
                  ? 'bg-[#0B6E4F] text-white'
                  : 'bg-transparent text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#FAFAFA]'
              }`}
            >
              <Activity className="w-[14px] h-[14px]" />
              <span>Live Telemetry</span>
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

        {/* TAB 1: Rebuilt Clinical Report (Section for Section per docx spec) */}
        {activeTab === 'report' && (
          <div className="space-y-[32px]">

            {/* SECTION 1: Session Overview */}
            <div>
              <h2 className="text-[16px] font-[600] text-[#1D1D1F] border-b-2 border-[#0B6E4F] pb-[4px] mt-[8px] mb-[16px]">
                1. Session Overview
              </h2>
              <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] p-[20px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[24px] gap-y-[16px] text-left">
                  <div>
                    <span className="text-[12px] font-[500] text-[#6E6E73] block">Duration</span>
                    <span className="text-[14px] font-[600] text-[#1D1D1F] block mt-[2px]">
                      {report?.total_time_sec || meta.duration_sec || 0}s
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] font-[500] text-[#6E6E73] block">Frame rate</span>
                    <span className="text-[14px] font-[600] text-[#1D1D1F] block mt-[2px]">
                      {report?.fps || meta.fps || 30} FPS
                    </span>
                  </div>

                  <div>
                    <span className="text-[12px] font-[500] text-[#6E6E73] block">Total frames</span>
                    <span className="text-[14px] font-[600] text-[#1D1D1F] block mt-[2px]">
                      {report?.total_frames || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] font-[500] text-[#6E6E73] block">Total steps</span>
                    <span className="text-[14px] font-[600] text-[#1D1D1F] block mt-[2px]">
                      {report?.total_steps || 0}
                    </span>
                  </div>

                  <div>
                    <span className="text-[12px] font-[500] text-[#6E6E73] block">Left / Right steps</span>
                    <span className="text-[14px] font-[600] text-[#1D1D1F] block mt-[2px]">
                      {report?.left_steps || 0} L / {report?.right_steps || 0} R
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] font-[500] text-[#6E6E73] block">Cadence</span>
                    <span className="text-[14px] font-[600] text-[#0B6E4F] block mt-[2px]">
                      {report?.cadence_steps_per_min || meta.cadence_spm || 0} spm
                    </span>
                  </div>

                  <div>
                    <span className="text-[12px] font-[500] text-[#6E6E73] block">Left step interval (mean ± std)</span>
                    <span className="text-[14px] font-[600] text-[#1D1D1F] block mt-[2px]">
                      {leftIntervalStr}
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] font-[500] text-[#6E6E73] block">Right step interval (mean ± std)</span>
                    <span className="text-[14px] font-[600] text-[#1D1D1F] block mt-[2px]">
                      {rightIntervalStr}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Range of Motion & Asymmetry */}
            {report && (
              <div>
                <h2 className="text-[16px] font-[600] text-[#1D1D1F] border-b-2 border-[#0B6E4F] pb-[4px] mt-[32px] mb-[16px]">
                  2. Range of Motion & Asymmetry
                </h2>
                <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px] border-collapse">
                      <thead>
                        <tr className="bg-[#0B6E4F] text-white font-[600]">
                          <th className="p-[10px_12px] font-[600]">Joint</th>
                          <th className="p-[10px_12px] font-[600] text-center">Left ROM</th>
                          <th className="p-[10px_12px] font-[600] text-center">Right ROM</th>
                          <th className="p-[10px_12px] font-[600] text-center">Asym (°)</th>
                          <th className="p-[10px_12px] font-[600] text-center">Asym %</th>
                          <th className="p-[10px_12px] font-[600] text-center">Mean L</th>
                          <th className="p-[10px_12px] font-[600] text-center">Mean R</th>
                          <th className="p-[10px_12px] font-[600] text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E5E7]">
                        {(['knee', 'hip', 'ankle'] as const).map((j) => {
                          const romL = report.rom?.[j]?.left || 0
                          const romR = report.rom?.[j]?.right || 0
                          const meanL = report.mean_angles?.[j]?.left ?? 'N/A'
                          const meanR = report.mean_angles?.[j]?.right ?? 'N/A'
                          const asymDeg = report.asymmetry_deg?.[j] || 0
                          
                          const maxRom = Math.max(romL, romR)
                          const asymPct = maxRom > 0 ? (asymDeg / maxRom) * 100 : 0
                          const formattedAsymPct = `${asymPct.toFixed(1)}%`

                          let statusText = 'Typical'
                          let tierBg = '#E7F5EA'
                          let tierColor = '#1E7B34'

                          if (asymPct >= 20) {
                            statusText = 'Notable Asymmetry'
                            tierBg = '#FCEAE9'
                            tierColor = '#B3261E'
                          } else if (asymPct >= 10) {
                            statusText = 'Mild Asymmetry'
                            tierBg = '#FFF4E0'
                            tierColor = '#9C6B00'
                          }

                          const jointLabel = j.charAt(0).toUpperCase() + j.slice(1)

                          return (
                            <tr key={j} className="hover:bg-[#FAFAFA]">
                              <td className="p-[10px_12px] font-[600] text-[#1D1D1F]">{jointLabel}</td>
                              <td className="p-[10px_12px] text-center font-[500]">{romL}°</td>
                              <td className="p-[10px_12px] text-center font-[500]">{romR}°</td>
                              <td className="p-[10px_12px] text-center font-[600] text-[#1D1D1F]">{asymDeg}°</td>
                              <td 
                                className="p-[10px_12px] text-center font-[600]"
                                style={{ backgroundColor: tierBg, color: tierColor }}
                              >
                                {formattedAsymPct}
                              </td>
                              <td className="p-[10px_12px] text-center font-[400] text-[#6E6E73]">{meanL !== 'N/A' ? `${meanL}°` : 'N/A'}</td>
                              <td className="p-[10px_12px] text-center font-[400] text-[#6E6E73]">{meanR !== 'N/A' ? `${meanR}°` : 'N/A'}</td>
                              <td className="p-[10px_12px] text-center">
                                <span 
                                  className="inline-block px-[8px] py-[2px] rounded-[4px] text-[11px] font-[500]"
                                  style={{ backgroundColor: tierBg, color: tierColor }}
                                >
                                  {statusText}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Legend Row Below Table */}
                <div className="text-[12px] text-[#6E6E73] mt-[8px] flex items-center gap-[6px]">
                  <span className="w-[8px] h-[8px] rounded-full bg-[#0B6E4F] inline-block" />
                  <span>&lt; 10% typical / 10–20% mild asymmetry / ≥ 20% notable asymmetry</span>
                </div>
              </div>
            )}

            {/* SECTION 3: Pelvis Movement */}
            {report?.pelvis && (
              <div>
                <h2 className="text-[16px] font-[600] text-[#1D1D1F] border-b-2 border-[#0B6E4F] pb-[4px] mt-[32px] mb-[16px]">
                  3. Pelvis Movement
                </h2>
                <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] overflow-hidden">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead>
                      <tr className="bg-[#0B6E4F] text-white font-[600]">
                        <th className="p-[10px_12px] font-[600] text-center">Pelvis Tilt ROM</th>
                        <th className="p-[10px_12px] font-[600] text-center">Pelvis Rotation ROM</th>
                        <th className="p-[10px_12px] font-[600] text-center">Mean Tilt</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-[10px_12px] text-center font-[600] text-[#1D1D1F] text-[14px]">
                          {report.pelvis.tilt_rom_deg}°
                        </td>
                        <td className="p-[10px_12px] text-center font-[600] text-[#1D1D1F] text-[14px]">
                          {report.pelvis.rotation_rom_deg}°
                        </td>
                        <td className="p-[10px_12px] text-center font-[600] text-[#1D1D1F] text-[14px]">
                          {report.pelvis.mean_tilt_deg || 0}°
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 4: Tracking Quality */}
            {report?.tracking && (
              <div>
                <h2 className="text-[16px] font-[600] text-[#1D1D1F] border-b-2 border-[#0B6E4F] pb-[4px] mt-[32px] mb-[16px]">
                  4. Tracking Quality
                </h2>
                <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] overflow-hidden">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead>
                      <tr className="bg-[#0B6E4F] text-white font-[600]">
                        <th className="p-[10px_12px] font-[600] text-center">Mean Confidence</th>
                        <th className="p-[10px_12px] font-[600] text-center">Min Confidence</th>
                        <th className="p-[10px_12px] font-[600] text-center">Good Frames (&gt;70%)</th>
                        <th className="p-[10px_12px] font-[600] text-center">Good Frame %</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td 
                          className="p-[10px_12px] text-center font-[600]"
                          style={{ backgroundColor: trackingTier.bgColor, color: trackingTier.textColor }}
                        >
                          {trackingTier.pctText} ({trackingTier.label})
                        </td>
                        <td className="p-[10px_12px] text-center font-[500] text-[#1D1D1F]">
                          {report.tracking.min ? `${(report.tracking.min * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="p-[10px_12px] text-center font-[500] text-[#1D1D1F]">
                          {report.tracking.good_frames || 0} / {report.tracking.total_frames || 0}
                        </td>
                        <td className="p-[10px_12px] text-center font-[500] text-[#1D1D1F]">
                          {report.tracking.total_frames ? `${((report.tracking.good_frames / report.tracking.total_frames) * 100).toFixed(1)}%` : '0%'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Conditional Note Below Table */}
                {meanConfPct < 50 ? (
                  <p className="text-[12px] italic text-[#6E6E73] mt-[8px]">
                    Treat joint-angle figures as indicative, not precise due to low tracking confidence (&lt;50%).
                  </p>
                ) : (
                  <p className="text-[12px] italic text-[#6E6E73] mt-[8px]">
                    Tracking confidence was adequate for quantitative comparison across sessions.
                  </p>
                )}
              </div>
            )}

            {/* SECTION 5: Left-Right Symmetry (Correlation) */}
            {report?.correlation && (
              <div>
                <h2 className="text-[16px] font-[600] text-[#1D1D1F] border-b-2 border-[#0B6E4F] pb-[4px] mt-[32px] mb-[16px]">
                  5. Left-Right Symmetry (Correlation)
                </h2>
                <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] overflow-hidden">
                  <table className="w-full text-left text-[13px] border-collapse">
                    <thead>
                      <tr className="bg-[#0B6E4F] text-white font-[600]">
                        <th className="p-[10px_12px] font-[600] text-center">Knee L-R Correlation</th>
                        <th className="p-[10px_12px] font-[600] text-center">Hip L-R Correlation</th>
                        <th className="p-[10px_12px] font-[600] text-center">Ankle L-R Correlation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {(['knee', 'hip', 'ankle'] as const).map((j) => {
                          const val = report.correlation?.[j]
                          return (
                            <td key={j} className="p-[10px_12px] text-center font-[600] text-[#1D1D1F]">
                              {val != null && typeof val === 'number' ? (
                                <span className="text-[#0B6E4F] font-[600]">{val}</span>
                              ) : (
                                <span className="text-[12px] font-[400] text-[#6E6E73] italic">
                                  Insufficient data
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 6: Visual Summary (Stacked 4 Figures) */}
            {images && (
              <div>
                <h2 className="text-[16px] font-[600] text-[#1D1D1F] border-b-2 border-[#0B6E4F] pb-[4px] mt-[32px] mb-[16px]">
                  6. Visual Summary
                </h2>
                <div className="space-y-[24px]">
                  {[
                    { 
                      id: 'comprehensive', 
                      title: 'Figure 1. Full joint-angle, step-detection, and asymmetry timeline overview.', 
                      src: images.comprehensive 
                    },
                    { 
                      id: 'knee', 
                      title: 'Figure 2. Left vs Right knee flexion time-series curves and angle distribution.', 
                      src: images.knee 
                    },
                    { 
                      id: 'hip', 
                      title: 'Figure 3. Left vs Right hip flexion time-series curves and angle distribution.', 
                      src: images.hip 
                    },
                    { 
                      id: 'ankle', 
                      title: 'Figure 4. Left vs Right ankle dorsiflexion time-series curves and angle distribution.', 
                      src: images.ankle 
                    },
                  ].map((fig) => (
                    <div key={fig.id} className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[8px] p-[16px]">
                      <div 
                        className="relative cursor-pointer rounded-[6px] overflow-hidden border border-[#E5E5E7] bg-[#FAFAFA] group"
                        onClick={() => setActiveImageModal({ src: getStaticUrl(fig.src), title: fig.title })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={getStaticUrl(fig.src)} 
                          alt={fig.title} 
                          className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform duration-200" 
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                          <Maximize2 className="w-4 h-4" /> Click to expand high-resolution figure
                        </div>
                      </div>
                      <p className="text-[12px] italic text-[#6E6E73] text-center mt-[12px]">
                        {fig.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Live Joint Trajectory Telemetry (Interactive Frame-by-Frame Charts) */}
        {activeTab === 'telemetry' && (
          <div className="space-y-[20px]">
            {/* Pinned 36px Height Zoom Control Toolbar inside the tab container */}
            <div className="bg-[#FFFFFF] p-[8px_16px] border border-[#E5E5E7] rounded-[8px] flex items-center justify-between h-[36px]">
              <div className="flex items-center gap-[6px] text-[13px] font-[500] text-[#1D1D1F]">
                <Activity className="w-[14px] h-[14px] text-[#0B6E4F]" />
                <span>Interactive Joint Trajectories (Left vs Right)</span>
              </div>

              {/* Zoom Controls: Readout, −/+, Reset */}
              <div className="flex items-center gap-[8px]">
                <span className="text-[12px] font-[500] text-[#6E6E73]">
                  Zoom: <strong className="text-[#1D1D1F]">{Math.round(zoomScale * 100)}%</strong>
                </span>

                <button
                  onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.15))}
                  className="w-[28px] h-[28px] rounded-[6px] border border-[#E5E5E7] bg-[#FFFFFF] hover:bg-[#FAFAFA] flex items-center justify-center text-[#1D1D1F] cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-[14px] h-[14px]" />
                </button>

                <button
                  onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.15))}
                  className="w-[28px] h-[28px] rounded-[6px] border border-[#E5E5E7] bg-[#FFFFFF] hover:bg-[#FAFAFA] flex items-center justify-center text-[#1D1D1F] cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-[14px] h-[14px]" />
                </button>

                <button
                  onClick={() => setZoomScale(1.0)}
                  className="text-[12px] font-[500] text-[#0B6E4F] hover:underline flex items-center gap-[4px] ml-[4px] cursor-pointer"
                  title="Reset Zoom Scale"
                >
                  <RotateCcw className="w-[12px] h-[12px]" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* 3 Joint Chart Cards (20px gap, 340px fixed chart height, 20px padding) */}
            {csvData.length > 0 ? (
              <div className="space-y-[20px]">
                {/* Chart 1: Knee */}
                <div className="bg-[#FFFFFF] p-[20px] rounded-[8px] border border-[#E5E5E7]">
                  <div className="flex items-center justify-between mb-[16px]">
                    <h3 className="text-[14px] font-[600] text-[#1D1D1F]">1. Knee Joint Flexion Curve</h3>
                    <span className="text-[12px] font-[500] text-[#6E6E73]">Left vs Right</span>
                  </div>
                  <JointTimeSeriesChart data={csvData} joint="knee" height={340} zoomScale={zoomScale} />
                </div>

                {/* Chart 2: Hip */}
                <div className="bg-[#FFFFFF] p-[20px] rounded-[8px] border border-[#E5E5E7]">
                  <div className="flex items-center justify-between mb-[16px]">
                    <h3 className="text-[14px] font-[600] text-[#1D1D1F]">2. Hip Joint Flexion Curve</h3>
                    <span className="text-[12px] font-[500] text-[#6E6E73]">Left vs Right</span>
                  </div>
                  <JointTimeSeriesChart data={csvData} joint="hip" height={340} zoomScale={zoomScale} />
                </div>

                {/* Chart 3: Ankle */}
                <div className="bg-[#FFFFFF] p-[20px] rounded-[8px] border border-[#E5E5E7]">
                  <div className="flex items-center justify-between mb-[16px]">
                    <h3 className="text-[14px] font-[600] text-[#1D1D1F]">3. Ankle Joint Angle Curve</h3>
                    <span className="text-[12px] font-[500] text-[#6E6E73]">Left vs Right</span>
                  </div>
                  <JointTimeSeriesChart data={csvData} joint="ankle" height={340} zoomScale={zoomScale} />
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-[13px] text-[#6E6E73] bg-[#FFFFFF] rounded-[8px] border border-dashed border-[#E5E5E7]">
                Loading telemetry CSV frame data for live joint curves...
              </div>
            )}
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
