'use client'
import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

type TrendPoint = {
  name: string
  cadence: number
  confidence: number
  patient?: string
  session?: string
  date?: string
}

type Props = {
  data: TrendPoint[]
  height?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const pt = payload[0]?.payload
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[6px] p-[10px_12px] shadow-sm text-xs font-sans space-y-1">
      <p className="font-[600] text-[#1D1D1F]">{label}</p>
      {pt?.patient && <p className="text-[11px] text-[#6E6E73]">Patient: <span className="font-[500] text-[#1D1D1F]">{pt.patient}</span></p>}
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-[12px]" style={{ color: entry.color }}>
          {entry.name}: <span className="font-[600]">{entry.value}{entry.dataKey === 'confidence' ? '%' : ' spm'}</span>
        </p>
      ))}
    </div>
  )
}

export function RecoveryTrendChart({ data, height = 280 }: Props) {
  if (!data.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-xs text-[#6E6E73] bg-[#FAFAFA] border border-[#E5E5E7] rounded-[8px]">
        <p>No session data available yet. Upload a gait video to track recovery trends.</p>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#E5E5E7" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#6E6E73"
            tick={{ fontSize: 11, fill: '#6E6E73' }}
            axisLine={{ stroke: '#E5E5E7' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="cadence"
            stroke="#0B6E4F"
            tick={{ fontSize: 11, fill: '#0B6E4F' }}
            axisLine={false}
            tickLine={false}
            domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax + 10))]}
            label={{ value: 'Cadence (spm)', angle: -90, position: 'insideLeft', fill: '#0B6E4F', fontSize: 11, dx: 12 }}
          />
          <YAxis
            yAxisId="confidence"
            orientation="right"
            stroke="#9C6B00"
            tick={{ fontSize: 11, fill: '#9C6B00' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 105]}
            label={{ value: 'Confidence (%)', angle: 90, position: 'insideRight', fill: '#9C6B00', fontSize: 11, dx: -8 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }} 
            iconType="circle" 
            iconSize={8}
          />
          <Line
            yAxisId="cadence"
            type="monotone"
            dataKey="cadence"
            name="Cadence (spm)"
            stroke="#0B6E4F"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#0B6E4F', strokeWidth: 2, stroke: '#FFFFFF' }}
            activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
          />
          <Line
            yAxisId="confidence"
            type="monotone"
            dataKey="confidence"
            name="Tracking Confidence (%)"
            stroke="#9C6B00"
            strokeWidth={2}
            dot={{ r: 3, fill: '#9C6B00', strokeWidth: 2, stroke: '#FFFFFF' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
