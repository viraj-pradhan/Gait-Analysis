'use client'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function DeleteConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, loading, onCancel])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="delete-modal-backdrop"
      onClick={() => { if (!loading) onCancel() }}
      role="presentation"
    >
      <div
        className="delete-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="delete-modal-icon">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="delete-modal-title" className="text-base font-semibold text-slate-900">
              {title}
            </h3>
            <div className="text-sm text-slate-600 mt-2 leading-relaxed">{message}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-outline text-sm h-9 px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="delete-modal-confirm-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
