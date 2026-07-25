'use client'
import React, { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import type { GaitCsvRow } from '@/lib/csv'

type JointKey = 'knee' | 'hip' | 'ankle'

const jointConfig: Record<JointKey, { left: keyof GaitCsvRow; right: keyof GaitCsvRow; label: string }> = {
  knee: { left: 'leftKnee', right: 'rightKnee', label: 'Knee Flexion' },
  hip: { left: 'leftHip', right: 'rightHip', label: 'Hip Flexion' },
  ankle: { left: 'leftAnkle', right: 'rightAnkle', label: 'Ankle Angle' },
}

type Props = {
  data: GaitCsvRow[]
  joint: JointKey
  height?: number
}

export function JointTimeSeriesChart({ data, joint, height = 280 }: Props) {
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
    return <div className="chart-empty"><p>Time-series data not loaded.</p></div>
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#E8EAED" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#94A3B8"
            tick={{ fontSize: 10, fill: '#64748B' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
            label={{ value: 'Time (s)', position: 'insideBottom', offset: -2, fill: '#94A3B8', fontSize: 10 }}
          />
          <YAxis
            stroke="#94A3B8"
            tick={{ fontSize: 10, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
            unit="°"
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12 }}
            labelFormatter={(t) => `Time: ${t}s`}
            formatter={(value, name) => [`${Number(value ?? 0).toFixed(1)}°`, name === 'left' ? 'Left' : 'Right']}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line type="monotone" dataKey="left" name="Left" stroke="#0B6E4F" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="right" name="Right" stroke="#0284C7" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function getJointLabel(joint: JointKey) {
  return jointConfig[joint].label
}
