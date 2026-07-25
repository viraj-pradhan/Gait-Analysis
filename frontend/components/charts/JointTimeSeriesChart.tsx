'use client'
import React, { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { GaitCsvRow } from '@/lib/csv'

type JointKey = 'knee' | 'hip' | 'ankle'

const jointConfig: Record<JointKey, { left: keyof GaitCsvRow; right: keyof GaitCsvRow; label: string }> = {
  knee: { left: 'leftKnee', right: 'rightKnee', label: '1. Knee Joint Flexion Curve' },
  hip: { left: 'leftHip', right: 'rightHip', label: '2. Hip Joint Flexion Curve' },
  ankle: { left: 'leftAnkle', right: 'rightAnkle', label: '3. Ankle Joint Angle Curve' },
}

type Props = {
  data: GaitCsvRow[]
  joint: JointKey
  height?: number
  zoomScale?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E7] rounded-[6px] p-[8px_12px] shadow-sm text-xs font-sans space-y-1">
      <p className="font-[600] text-[#1D1D1F]">Time: {label}s</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-[12px]" style={{ color: entry.color }}>
          {entry.name}: <span className="font-[600]">{entry.value}°</span>
        </p>
      ))}
    </div>
  )
}

export function JointTimeSeriesChart({ data, joint, height = 340, zoomScale = 1.0 }: Props) {
  const cfg = jointConfig[joint]

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        time: Number(row.time.toFixed(2)),
        left: Number((row[cfg.left] as number).toFixed(1)),
        right: Number((row[cfg.right] as number).toFixed(1)),
      })),
    [data, cfg.left, cfg.right]
  )

  if (!chartData.length) {
    return (
      <div className="h-[340px] flex items-center justify-center text-xs text-[#6E6E73] bg-[#FAFAFA] border border-[#E5E5E7] rounded-[8px]">
        <p>Telemetry CSV data loading...</p>
      </div>
    )
  }

  // Calculate clean tick interval to show ~8-10 ticks max across the axis
  const tickInterval = Math.max(1, Math.floor(chartData.length / 8))
  const actualHeight = Math.round(height * zoomScale)

  return (
    <div className="w-full" style={{ height: `${actualHeight}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#E5E5E7" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#6E6E73"
            tick={{ fontSize: 11, fill: '#6E6E73' }}
            axisLine={{ stroke: '#E5E5E7' }}
            tickLine={false}
            interval={tickInterval}
            minTickGap={35}
            unit="s"
          />
          <YAxis
            stroke="#6E6E73"
            tick={{ fontSize: 11, fill: '#6E6E73' }}
            axisLine={false}
            tickLine={false}
            unit="°"
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }} 
            iconType="circle" 
            iconSize={8}
          />
          {/* Left = #0B6E4F (Accent Green), Right = #2C6E7F (Muted Teal-Blue) */}
          <Line 
            type="monotone" 
            dataKey="left" 
            name="Left" 
            stroke="#0B6E4F" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2 }} 
          />
          <Line 
            type="monotone" 
            dataKey="right" 
            name="Right" 
            stroke="#2C6E7F" 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function getJointLabel(joint: JointKey) {
  return jointConfig[joint].label
}
