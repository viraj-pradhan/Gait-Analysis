export type SessionEntry = {
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

export function getConfidenceBadge(confFrac: number) {
  const pct = confFrac * 100
  if (pct >= 70) return { label: `${pct.toFixed(0)}% Good`, class: 'badge-good' as const }
  if (pct >= 50) return { label: `${pct.toFixed(0)}% Fair`, class: 'badge-mild' as const }
  return { label: `${pct.toFixed(0)}% Low`, class: 'badge-high' as const }
}

export function getAsymmetryBadge(deg: number) {
  if (deg >= 20) return { label: 'High', class: 'badge-high' as const }
  if (deg >= 10) return { label: 'Mild', class: 'badge-mild' as const }
  return { label: 'Normal', class: 'badge-good' as const }
}

export function buildTrendChartData(sessions: SessionEntry[]) {
  return sessions
    .filter((s) => s.status === 'success')
    .sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '')
      if (dateCmp !== 0) return dateCmp
      return (a.session_number || 0) - (b.session_number || 0)
    })
    .map((s) => ({
      name: s.patient_name || s.session_label || `S${s.session_number}`,
      session: s.session_label || s.session_id,
      date: s.recorded_date || s.date,
      cadence: Number(s.cadence_spm || 0),
      confidence: Number(((s.mean_confidence || 0) * 100).toFixed(1)),
    }))
}

export function buildRomChartData(report: {
  rom?: Record<string, { left: number; right: number }>
}) {
  if (!report?.rom) return []
  return (['knee', 'hip', 'ankle'] as const).map((joint) => ({
    joint: joint.charAt(0).toUpperCase() + joint.slice(1),
    left: report.rom?.[joint]?.left ?? 0,
    right: report.rom?.[joint]?.right ?? 0,
  }))
}

export function buildAsymmetryChartData(report: {
  asymmetry_deg?: Record<string, number>
}) {
  if (!report?.asymmetry_deg) return []
  return (['knee', 'hip', 'ankle'] as const).map((joint) => ({
    joint: joint.charAt(0).toUpperCase() + joint.slice(1),
    asymmetry: report.asymmetry_deg?.[joint] ?? 0,
  }))
}
