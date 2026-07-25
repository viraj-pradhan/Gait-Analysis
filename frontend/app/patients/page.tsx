'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { getToken, listSessions } from '@/lib/api'
import { getPatientSlug, getPatientInitials, type SessionEntry } from '@/lib/session-utils'
import { getConfidenceTier } from '@/lib/badges'
import { Users, Search, ChevronRight, Activity, Calendar } from 'lucide-react'

type PatientSummary = {
  id: string
  name: string
  sessionCount: number
  lastDate: string
  firstDate: string
  avgConfidence: number
  avgCadence: number
}

export default function PatientsListPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    listSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [router])

  // Aggregate sessions by patient ID / name
  const patientMap = new Map<string, { name: string; sessions: SessionEntry[] }>()

  sessions.forEach((s) => {
    const pName = s.patient_name && s.patient_name !== 'Unknown Patient' ? s.patient_name : 'Unassigned'
    const slug = getPatientSlug(pName)

    if (!patientMap.has(slug)) {
      patientMap.set(slug, { name: pName, sessions: [] })
    }
    patientMap.get(slug)!.sessions.push(s)
  })

  const patientsList: PatientSummary[] = Array.from(patientMap.entries()).map(([slug, data]) => {
    const pSessions = data.sessions.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    const valid = pSessions.filter(s => s.status === 'success')

    const lastDate = pSessions[0]?.recorded_date || pSessions[0]?.date || 'N/A'
    const firstDate = pSessions[pSessions.length - 1]?.recorded_date || pSessions[pSessions.length - 1]?.date || 'N/A'

    const avgConf = valid.length
      ? valid.reduce((sum, s) => sum + (s.mean_confidence || 0), 0) / valid.length
      : 0

    const avgCad = valid.length
      ? valid.reduce((sum, s) => sum + (s.cadence_spm || 0), 0) / valid.length
      : 0

    return {
      id: slug,
      name: data.name,
      sessionCount: pSessions.length,
      lastDate,
      firstDate,
      avgConfidence: avgConf,
      avgCadence: avgCad,
    }
  })

  const filteredPatients = patientsList.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppShell>
      <div className="space-y-6 font-sans antialiased text-[#1D1D1F]">
        {/* Standard Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-[600] text-[#1D1D1F] tracking-tight">Patients</h1>
            <p className="text-[13px] font-[400] text-[#6E6E73] mt-[2px]">
              Patient clinical records and biomechanics recovery profiles
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-[260px]">
            <Search className="w-[14px] h-[14px] text-[#6E6E73] absolute left-[12px] top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-[36px] w-full pl-[36px] pr-[12px] text-[13px] bg-[#FFFFFF] border border-[#E5E5E7] rounded-[6px] text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-[#0B6E4F] focus:ring-2 focus:ring-[#0B6E4F]/20 transition-all"
            />
          </div>
        </div>

        {/* Patients Grid */}
        {loading ? (
          <div className="p-12 text-center text-[13px] text-[#6E6E73]">Loading patient records…</div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-[#FFFFFF] p-12 text-center rounded-[8px] border border-[#E5E5E7]">
            <Users className="w-8 h-8 text-[#6E6E73] mx-auto mb-2 opacity-50" />
            <p className="text-[14px] font-[600] text-[#1D1D1F]">No patient records found</p>
            <p className="text-[13px] font-[400] text-[#6E6E73] mt-1">Upload a gait recording to create patient records</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]">
            {filteredPatients.map((p) => {
              const tier = getConfidenceTier(p.avgConfidence)
              const initials = getPatientInitials(p.name)

              return (
                <Link
                  key={p.id}
                  href={`/patients/${p.id}`}
                  className="bg-[#FFFFFF] p-[20px] rounded-[8px] border border-[#E5E5E7] hover:border-[#0B6E4F] hover:shadow-xs transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-[12px] min-w-0">
                      <div className="w-[40px] h-[40px] rounded-full bg-[#E7F5EA] text-[#0B6E4F] flex items-center justify-center font-[600] text-[14px] shrink-0 border border-[#0B6E4F]/20">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[16px] font-[600] text-[#1D1D1F] group-hover:text-[#0B6E4F] transition-colors truncate">
                          {p.name}
                        </h3>
                        <p className="text-[12px] font-[400] text-[#6E6E73] mt-[2px]">
                          {p.sessionCount} {p.sessionCount === 1 ? 'session' : 'sessions'}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-[16px] h-[16px] text-[#6E6E73] group-hover:text-[#0B6E4F] transition-colors shrink-0 mt-1" />
                  </div>

                  <div className="pt-[12px] border-t border-[#E5E5E7] flex items-center justify-between text-[12px]">
                    <span className="text-[#6E6E73] flex items-center gap-1">
                      <Calendar className="w-[12px] h-[12px]" /> Last: {p.lastDate}
                    </span>

                    <span 
                      className="text-[11px] font-[500] px-[8px] py-[2px] rounded-[4px]"
                      style={{ color: tier.textColor, backgroundColor: tier.bgColor }}
                    >
                      {tier.fullLabel}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
