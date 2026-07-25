'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getToken, getJob, downloadFile } from '@/lib/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'

type Report = {
  total_frames: number
  total_time_sec: number
  fps: number
  total_steps: number
  left_steps: number
  right_steps: number
  cadence_steps_per_min: number
  rom: Record<string, { left: number; right: number }>
  mean_angles: Record<string, { left: number; right: number }>
  asymmetry_deg: Record<string, number>
  step_timing: { left?: { mean: number; std: number }; right?: { mean: number; std: number } }
  pelvis: { tilt_rom_deg: number; rotation_rom_deg: number }
  tracking: { mean: number; min: number; good_frames: number; total_frames: number }
  time_series: Record<string, (number | null)[]>
}

export default function JobResultPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params?.id as string

  const [job, setJob] = useState<any>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'angles' | 'rom'>('overview')

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return }
    fetchJob()
    const iv = setInterval(() => {
      if (job?.status !== 'done' && job?.status !== 'error') fetchJob()
    }, 3000)
    return () => clearInterval(iv)
  }, [jobId, job?.status])

  async function fetchJob() {
    try {
      const data = await getJob(jobId)
      setJob(data)
      if (data.report) setReport(data.report)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(type: 'video' | 'xlsx' | 'docx') {
    setDownloading(type)
    try { await downloadFile(jobId, type) }
    catch (e: any) { alert(`Download failed: ${e.message}`) }
    finally { setDownloading(null) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="apple-box p-6 text-center max-w-xs">
        <p className="text-xs font-semibold text-[#ff453a] mb-3">{error}</p>
        <Link href="/dashboard" className="apple-button-secondary text-xs">
          Return to Dashboard
        </Link>
      </div>
    </div>
  )

  const chartData = report?.time_series
    ? report.time_series.time_sec.map((t, i) => ({
        time: typeof t === 'number' ? `${t.toFixed(1)}s` : i,
        leftKnee: report.time_series.left_knee[i],
        rightKnee: report.time_series.right_knee[i],
        leftHip: report.time_series.left_hip[i],
        rightHip: report.time_series.right_hip[i],
        leftAnkle: report.time_series.left_ankle[i],
        rightAnkle: report.time_series.right_ankle[i],
        pelvisTilt: report.time_series.pelvis_tilt[i],
        pelvisRotation: report.time_series.pelvis_rotation[i],
      }))
    : []

  const romChartData = report
    ? ['knee', 'hip', 'ankle'].map(j => ({
        joint: j.charAt(0).toUpperCase() + j.slice(1),
        Left: report.rom[j].left,
        Right: report.rom[j].right,
        Asymmetry: report.asymmetry_deg[j],
      }))
    : []

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#1c1c1e',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 8,
      padding: '8px 12px',
    },
    labelStyle: { color: '#86868b', fontSize: 11, marginBottom: 2 },
    itemStyle: { fontSize: 12, padding: '1px 0' },
  }

  return (
    <div className="min-h-screen bg-black relative z-10 pb-16">
      {/* Top Navigation */}
      <header className="apple-nav px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs text-[#86868b] hover:text-white transition-colors">
            ← Dashboard
          </Link>
          <span className="text-white/20">|</span>
          <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">{job?.filename}</span>
        </div>

        {report && (
          <div className="flex items-center gap-2">
            <button
              id="download-video"
              className="apple-button-secondary text-xs px-3 py-1"
              onClick={() => handleDownload('video')}
              disabled={downloading === 'video'}
            >
              {downloading === 'video' ? 'Downloading…' : 'Video'}
            </button>
            <button
              id="download-xlsx"
              className="apple-button-secondary text-xs px-3 py-1"
              onClick={() => handleDownload('xlsx')}
              disabled={downloading === 'xlsx'}
            >
              {downloading === 'xlsx' ? 'Downloading…' : 'Excel'}
            </button>
            <button
              id="download-docx"
              className="apple-button-primary text-xs px-3 py-1"
              onClick={() => handleDownload('docx')}
              disabled={downloading === 'docx'}
            >
              {downloading === 'docx' ? 'Downloading…' : 'Word Report'}
            </button>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-8">
        {job?.status !== 'done' && (
          <div className="apple-box p-10 text-center">
            {job?.status === 'error' ? (
              <p className="text-xs font-semibold text-[#ff453a]">{job.error_message}</p>
            ) : (
              <div className="py-4">
                <div className="w-7 h-7 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-semibold text-white capitalize">Processing Telemetry…</p>
              </div>
            )}
          </div>
        )}

        {report && (
          <>
            {/* Metric Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="apple-box p-4">
                <p className="text-[10px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Duration</p>
                <p className="text-xl font-semibold text-white">{report.total_time_sec}<span className="text-xs font-normal text-[#86868b] ml-1">s</span></p>
                <p className="text-[10px] text-[#86868b] mt-0.5">{report.fps} FPS · {report.total_frames} frames</p>
              </div>

              <div className="apple-box p-4">
                <p className="text-[10px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Steps</p>
                <p className="text-xl font-semibold text-[#0071e3]">{report.total_steps}</p>
                <p className="text-[10px] text-[#86868b] mt-0.5">Left: {report.left_steps} · Right: {report.right_steps}</p>
              </div>

              <div className="apple-box p-4">
                <p className="text-[10px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Cadence</p>
                <p className="text-xl font-semibold text-[#30d158]">{report.cadence_steps_per_min}<span className="text-xs font-normal text-[#86868b] ml-1">spm</span></p>
                <p className="text-[10px] text-[#86868b] mt-0.5">Steps per minute</p>
              </div>

              <div className="apple-box p-4">
                <p className="text-[10px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Confidence</p>
                <p className="text-xl font-semibold text-[#64d2ff]">
                  {report.tracking.mean ? (report.tracking.mean * 100).toFixed(0) : 0}%
                </p>
                <p className="text-[10px] text-[#86868b] mt-0.5">{report.tracking.good_frames} / {report.tracking.total_frames} frames</p>
              </div>
            </div>

            {/* Apple Segmented Bar */}
            <div className="flex justify-center mb-6">
              <div className="bg-[#1c1c1e] p-1 rounded-lg border border-white/10 flex gap-1">
                <button
                  id="tab-overview"
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-1 rounded-md text-xs font-medium transition-colors ${activeTab === 'overview' ? 'bg-[#3a3a3c] text-white' : 'text-[#86868b]'}`}
                >
                  Overview
                </button>
                <button
                  id="tab-angles"
                  onClick={() => setActiveTab('angles')}
                  className={`px-4 py-1 rounded-md text-xs font-medium transition-colors ${activeTab === 'angles' ? 'bg-[#3a3a3c] text-white' : 'text-[#86868b]'}`}
                >
                  Joint Angle Graphs
                </button>
                <button
                  id="tab-rom"
                  onClick={() => setActiveTab('rom')}
                  className={`px-4 py-1 rounded-md text-xs font-medium transition-colors ${activeTab === 'rom' ? 'bg-[#3a3a3c] text-white' : 'text-[#86868b]'}`}
                >
                  ROM & Asymmetry
                </button>
              </div>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="apple-box p-5">
                  <h3 className="text-xs font-semibold text-white mb-3">Step Timing</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2.5 rounded-lg bg-white/5">
                      <span className="text-[#86868b]">Left Interval</span>
                      <span className="font-semibold text-[#0071e3]">
                        {report.step_timing.left ? `${report.step_timing.left.mean}s ± ${report.step_timing.left.std}s` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-lg bg-white/5">
                      <span className="text-[#86868b]">Right Interval</span>
                      <span className="font-semibold text-[#64d2ff]">
                        {report.step_timing.right ? `${report.step_timing.right.mean}s ± ${report.step_timing.right.std}s` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="apple-box p-5">
                  <h3 className="text-xs font-semibold text-white mb-3">Pelvis Kinematics</h3>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-[10px] text-[#86868b] mb-1">Tilt ROM</p>
                      <p className="text-base font-semibold text-[#ff9f0a]">{report.pelvis.tilt_rom_deg}°</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-[10px] text-[#86868b] mb-1">Rotation ROM</p>
                      <p className="text-base font-semibold text-[#bf5af2]">{report.pelvis.rotation_rom_deg}°</p>
                    </div>
                  </div>
                </div>

                <div className="apple-box p-5 md:col-span-2">
                  <h3 className="text-xs font-semibold text-white mb-3">Mean Joint Angles Summary</h3>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    {['knee', 'hip', 'ankle'].map(j => (
                      <div key={j} className="p-3 rounded-lg bg-white/5">
                        <p className="text-[10px] font-semibold text-white uppercase mb-1">{j}</p>
                        <div className="flex justify-around">
                          <span>L: <strong className="text-[#0071e3]">{report.mean_angles[j]?.left ?? '—'}°</strong></span>
                          <span>R: <strong className="text-[#64d2ff]">{report.mean_angles[j]?.right ?? '—'}°</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GRAPHS */}
            {activeTab === 'angles' && (
              <div className="space-y-4">
                <div className="apple-box p-5">
                  <h3 className="text-xs font-semibold text-white mb-3">Knee Flexion & Extension</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="time" stroke="#86868b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#86868b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="°" />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Line type="monotone" dataKey="leftKnee" name="Left Knee" stroke="#0071e3" dot={false} strokeWidth={1.8} connectNulls />
                      <Line type="monotone" dataKey="rightKnee" name="Right Knee" stroke="#64d2ff" dot={false} strokeWidth={1.8} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="apple-box p-5">
                  <h3 className="text-xs font-semibold text-white mb-3">Hip Flexion & Extension</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="time" stroke="#86868b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#86868b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="°" />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Line type="monotone" dataKey="leftHip" name="Left Hip" stroke="#ff9f0a" dot={false} strokeWidth={1.8} connectNulls />
                      <Line type="monotone" dataKey="rightHip" name="Right Hip" stroke="#30d158" dot={false} strokeWidth={1.8} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="apple-box p-5">
                  <h3 className="text-xs font-semibold text-white mb-3">Ankle Flexion</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="time" stroke="#86868b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#86868b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="°" />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Line type="monotone" dataKey="leftAnkle" name="Left Ankle" stroke="#bf5af2" dot={false} strokeWidth={1.8} connectNulls />
                      <Line type="monotone" dataKey="rightAnkle" name="Right Ankle" stroke="#64d2ff" dot={false} strokeWidth={1.8} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 3: ROM */}
            {activeTab === 'rom' && (
              <div className="space-y-4">
                <div className="apple-box p-5">
                  <h3 className="text-xs font-semibold text-white mb-3">Range of Motion Comparison</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={romChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="joint" stroke="#86868b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#86868b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="°" />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Bar dataKey="Left" fill="#0071e3" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Right" fill="#64d2ff" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Asymmetry" fill="#ff9f0a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="apple-box p-5">
                  <h3 className="text-xs font-semibold text-white mb-3">ROM & Asymmetry Data</h3>
                  <div className="divide-y divide-white/10 text-xs">
                    {['knee', 'hip', 'ankle'].map(j => (
                      <div key={j} className="py-2.5 flex items-center justify-between">
                        <span className="font-semibold text-white uppercase">{j}</span>
                        <div className="flex gap-5 text-[#86868b]">
                          <span>Left: <strong className="text-[#0071e3]">{report.rom[j].left}°</strong></span>
                          <span>Right: <strong className="text-[#64d2ff]">{report.rom[j].right}°</strong></span>
                          <span>Asymmetry: <strong className={report.asymmetry_deg[j] > 15 ? 'text-[#ff453a]' : 'text-[#30d158]'}>{report.asymmetry_deg[j]}°</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
