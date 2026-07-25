'use client'
import React, { useState } from 'react'
import { Maximize2, X, ImageIcon } from 'lucide-react'
import { getStaticUrl } from '@/lib/api'

type PlotItem = {
  id: string
  title: string
  subtitle: string
  src: string
  featured?: boolean
}

type Props = {
  images: {
    comprehensive: string
    knee: string
    hip: string
    ankle: string
  }
}

export function PlotGallery({ images }: Props) {
  const [modal, setModal] = useState<{ src: string; title: string } | null>(null)

  const plots: PlotItem[] = [
    {
      id: 'comprehensive',
      title: 'Comprehensive Gait Analysis',
      subtitle: 'Full timeline with step events and joint trajectories',
      src: images.comprehensive,
      featured: true,
    },
    {
      id: 'knee',
      title: 'Knee Analysis',
      subtitle: 'Flexion/extension curves and distribution',
      src: images.knee,
    },
    {
      id: 'hip',
      title: 'Hip Analysis',
      subtitle: 'Hip angle time-series and frequency',
      src: images.hip,
    },
    {
      id: 'ankle',
      title: 'Ankle Analysis',
      subtitle: 'Dorsiflexion/plantarflexion patterns',
      src: images.ankle,
    },
  ]

  const featured = plots.find((p) => p.featured)
  const rest = plots.filter((p) => !p.featured)

  function PlotCard({ plot, large = false }: { plot: PlotItem; large?: boolean }) {
    const url = getStaticUrl(plot.src)
    return (
      <div className={`plot-card ${large ? 'plot-card-featured' : ''}`}>
        <div className="plot-card-header">
          <div>
            <h3 className="plot-card-title">{plot.title}</h3>
            <p className="plot-card-sub">{plot.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ src: url, title: plot.title })}
            className="plot-expand-btn"
            aria-label={`Expand ${plot.title}`}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          className="plot-image-wrap"
          onClick={() => setModal({ src: url, title: plot.title })}
        >
          <img
            src={url}
            alt={plot.title}
            className={large ? 'plot-image plot-image-lg' : 'plot-image'}
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              target.parentElement?.classList.add('plot-image-error')
            }}
          />
          <div className="plot-image-fallback">
            <ImageIcon className="w-8 h-8 text-slate-300" />
            <span>Plot unavailable</span>
          </div>
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-5">
        {featured && <PlotCard plot={featured} large />}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {rest.map((plot) => (
            <PlotCard key={plot.id} plot={plot} />
          ))}
        </div>
      </div>

      {modal && (
        <div className="plot-modal-backdrop" onClick={() => setModal(null)} role="presentation">
          <div className="plot-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="plot-modal-header">
              <h3>{modal.title}</h3>
              <button type="button" onClick={() => setModal(null)} className="plot-expand-btn">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="plot-modal-body">
              <img src={modal.src} alt={modal.title} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
