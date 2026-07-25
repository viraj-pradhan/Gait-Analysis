'use client'
import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

type RomPoint = { joint: string; left: number; right: number }

type Props = {
  data: RomPoint[]
  height?: number
}

export function RomComparisonChart({ data, height = 260 }: Props) {
  if (!data.length) {
    return <div className="chart-empty"><p>ROM data unavailable for this session.</p></div>
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="4 4" stroke="#E8EAED" vertical={false} />
          <XAxis dataKey="joint" stroke="#94A3B8" tick={{ fontSize: 12, fill: '#475569' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
          <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} unit="°" />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12 }}
            formatter={(value) => [`${Number(value ?? 0).toFixed(1)}°`, '']}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="left" name="Left ROM" fill="#0B6E4F" radius={[6, 6, 0, 0]} maxBarSize={48} />
          <Bar dataKey="right" name="Right ROM" fill="#38BDF8" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
