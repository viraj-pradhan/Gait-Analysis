import { getConfidenceTier, getAsymmetryTier } from './badges'

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

export { getConfidenceTier, getAsymmetryTier }

export function getPatientSlug(patientName?: string): string {
  if (!patientName || patientName === 'Unknown Patient') return 'unassigned'
  return patientName.trim().toLowerCase().replace(/\s+/g, '-')
}

export function getPatientInitials(patientName?: string): string {
  if (!patientName || patientName === 'Unknown Patient' || patientName === 'Unassigned') return 'UA'
  const parts = patientName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function getConfidenceBadge(confFrac: number) {
  const tier = getConfidenceTier(confFrac)
  return { 
    label: tier.fullLabel, 
    class: tier.label === 'Good' ? 'badge-good' : tier.label === 'Fair' ? 'badge-mild' : 'badge-high' 
  }
}

export function buildTrendChartData(sessions: SessionEntry[]) {
  return sessions
    .filter((s) => s.status === 'success')
    .sort((a, b) => {
      const dateCmp = (a.date || a.recorded_date || '').localeCompare(b.date || b.recorded_date || '')
      if (dateCmp !== 0) return dateCmp
      return (a.session_number || 0) - (b.session_number || 0)
    })
    .map((s) => {
      const num = s.session_number || 1
      const dateStr = s.recorded_date || s.date || ''
      const sessionLabel = `Session ${num} — ${dateStr}`
      return {
        name: sessionLabel,
        session: sessionLabel,
        patient: s.patient_name || 'Unassigned',
        date: dateStr,
        cadence: Number((s.cadence_spm || 0).toFixed(1)),
        confidence: Number(((s.mean_confidence || 0) * 100).toFixed(1)),
      }
    })
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
