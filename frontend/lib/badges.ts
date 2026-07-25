/**
 * App-wide Standardized Badge Vocabulary & Styling Tokens
 */

export interface ConfidenceTier {
  label: string
  pctText: string
  fullLabel: string
  textColor: string
  bgColor: string
}

export function getConfidenceTier(confidence: number | null | undefined): ConfidenceTier {
  if (confidence == null || isNaN(confidence)) {
    return {
      label: 'N/A',
      pctText: 'N/A',
      fullLabel: 'N/A',
      textColor: '#6E6E73',
      bgColor: '#F4F4F5',
    }
  }

  // Convert 0.0-1.0 float to 0-100 percentage
  const pct = confidence <= 1.0 ? confidence * 100 : confidence
  const formattedPct = `${pct.toFixed(1)}%`

  if (pct >= 70) {
    return {
      label: 'Good',
      pctText: formattedPct,
      fullLabel: `${formattedPct} Good`,
      textColor: '#1E7B34',
      bgColor: '#E7F5EA',
    }
  } else if (pct >= 50) {
    return {
      label: 'Fair',
      pctText: formattedPct,
      fullLabel: `${formattedPct} Fair`,
      textColor: '#9C6B00',
      bgColor: '#FFF4E0',
    }
  } else {
    return {
      label: 'Low',
      pctText: formattedPct,
      fullLabel: `${formattedPct} Low`,
      textColor: '#B3261E',
      bgColor: '#FCEAE9',
    }
  }
}

export interface AsymmetryTier {
  label: string
  textColor: string
  bgColor: string
}

export function getAsymmetryTier(diffDeg: number | null | undefined): AsymmetryTier {
  if (diffDeg == null || isNaN(diffDeg)) {
    return {
      label: 'N/A',
      textColor: '#6E6E73',
      bgColor: '#F4F4F5',
    }
  }

  if (diffDeg >= 20) {
    return {
      label: 'High Asymmetry (≥20°)',
      textColor: '#B3261E',
      bgColor: '#FCEAE9',
    }
  } else if (diffDeg >= 10) {
    return {
      label: 'Mild Asymmetry (≥10°)',
      textColor: '#9C6B00',
      bgColor: '#FFF4E0',
    }
  } else {
    return {
      label: 'Within Range (<10°)',
      textColor: '#1E7B34',
      bgColor: '#E7F5EA',
    }
  }
}
