export type GaitCsvRow = {
  time: number
  leftKnee: number
  rightKnee: number
  leftHip: number
  rightHip: number
  leftAnkle: number
  rightAnkle: number
  pelvisTilt: number
  pelvisRotation: number
}

export async function fetchGaitCsv(url: string, sampleEvery = 3): Promise<GaitCsvRow[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load gait CSV data')
  const text = await res.text()
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const rows: GaitCsvRow[] = []
  for (let i = 1; i < lines.length; i += sampleEvery) {
    const cols = lines[i].split(',')
    if (cols.length < 10) continue
    rows.push({
      time: parseFloat(cols[1]),
      leftKnee: parseFloat(cols[2]),
      rightKnee: parseFloat(cols[3]),
      leftHip: parseFloat(cols[4]),
      rightHip: parseFloat(cols[5]),
      leftAnkle: parseFloat(cols[6]),
      rightAnkle: parseFloat(cols[7]),
      pelvisTilt: parseFloat(cols[8]),
      pelvisRotation: parseFloat(cols[9]),
    })
  }
  return rows
}
