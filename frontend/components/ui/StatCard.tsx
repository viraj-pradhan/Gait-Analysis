'use client'
import React from 'react'
import { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: React.ReactNode
  sub?: string
  icon: LucideIcon
  accent?: 'green' | 'blue' | 'amber' | 'neutral'
}

const accentStyles = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  blue: 'bg-sky-50 text-sky-700 ring-sky-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  neutral: 'bg-slate-50 text-slate-700 ring-slate-100',
}

export function StatCard({ label, value, sub, icon: Icon, accent = 'neutral' }: StatCardProps) {
  return (
    <div className="metric-card group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="metric-label">{label}</p>
          <p className="metric-value mt-1">{value}</p>
          {sub && <p className="metric-sub mt-1">{sub}</p>}
        </div>
        <div className={`metric-icon ${accentStyles[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
