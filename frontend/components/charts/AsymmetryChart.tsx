'use client'
import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'

type AsymPoint = { joint: string; asymmetry: number }

const barColor = (value: number) => {
  if (value >= 20) return '#DC2626'
  if (value >= 10) return '#D97706'
  return '#16A34A'
}

type Props = {
  data: AsymPoint[]
  height?: number
}

export function AsymmetryChart({ data, height = 220 }: Props) {
  if (!data.length) {
    return <div className="chart-empty"><p>Asymmetry data unavailable.</p></div>
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#E8EAED" horizontal={false} />
          <XAxis type="number" stroke="#94A3B8" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} unit="°" />
          <YAxis type="category" dataKey="joint" stroke="#475569" tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12 }}
            formatter={(value) => [`${Number(value ?? 0).toFixed(1)}°`, 'L-R Asymmetry']}
          />
          <ReferenceLine x={10} stroke="#D97706" strokeDasharray="4 4" label={{ value: 'Mild 10°', fill: '#D97706', fontSize: 10, position: 'top' }} />
          <ReferenceLine x={20} stroke="#DC2626" strokeDasharray="4 4" label={{ value: 'High 20°', fill: '#DC2626', fontSize: 10, position: 'top' }} />
          <Bar dataKey="asymmetry" name="Asymmetry" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry) => (
              <Cell key={entry.joint} fill={barColor(entry.asymmetry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
