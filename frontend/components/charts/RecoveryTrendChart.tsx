'use client'
import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

type TrendPoint = {
  name: string
  cadence: number
  confidence: number
  session?: string
  date?: string
}

type Props = {
  data: TrendPoint[]
  height?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="font-semibold text-slate-900 mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{entry.value}{entry.dataKey === 'confidence' ? '%' : ' spm'}</span>
        </p>
      ))}
    </div>
  )
}

export function RecoveryTrendChart({ data, height = 280 }: Props) {
  if (!data.length) {
    return (
      <div className="chart-empty">
        <p>No session data yet. Upload a gait video to see recovery trends.</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#E8EAED" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#94A3B8"
            tick={{ fontSize: 11, fill: '#64748B' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="cadence"
            stroke="#0B6E4F"
            tick={{ fontSize: 11, fill: '#0B6E4F' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
            label={{ value: 'Cadence (spm)', angle: -90, position: 'insideLeft', fill: '#0B6E4F', fontSize: 10, dx: 12 }}
          />
          <YAxis
            yAxisId="confidence"
            orientation="right"
            stroke="#B45309"
            tick={{ fontSize: 11, fill: '#B45309' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            label={{ value: 'Confidence (%)', angle: 90, position: 'insideRight', fill: '#B45309', fontSize: 10, dx: -8 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
          <Line
            yAxisId="cadence"
            type="monotone"
            dataKey="cadence"
            name="Cadence (spm)"
            stroke="#0B6E4F"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#0B6E4F', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          />
          <Line
            yAxisId="confidence"
            type="monotone"
            dataKey="confidence"
            name="Tracking Confidence (%)"
            stroke="#D97706"
            strokeWidth={2}
            dot={{ r: 3, fill: '#D97706', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
