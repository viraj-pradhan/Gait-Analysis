'use client'
import React, { useRef, useState, useEffect } from 'react'
import { X, Upload, Video, User, Calendar, Clock, CheckCircle2, Loader2, FileVideo } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    patientName: string
    recordedDate: string
    recordedTime: string
    file: File
  }) => Promise<void>
  uploading: boolean
  error: string
  progress?: number
}

export function NewSessionModal({ open, onClose, onSubmit, uploading, error, progress = 0 }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [patientName, setPatientName] = useState('')
  const [recordedDate, setRecordedDate] = useState('')
  const [recordedTime, setRecordedTime] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0]
      const nowTime = new Date().toTimeString().split(' ')[0].substring(0, 5)
      setRecordedDate(today)
      setRecordedTime(nowTime)
    }
  }, [open])

  if (!open) return null

  function resetAndClose() {
    if (uploading) return
    setStep(1)
    setPatientName('')
    setSelectedFile(null)
    onClose()
  }

  function handleFilePick(file: File | undefined) {
    if (file && (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov)$/i))) {
      setSelectedFile(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return
    await onSubmit({ patientName, recordedDate, recordedTime, file: selectedFile })
    setStep(1)
    setPatientName('')
    setSelectedFile(null)
  }

  return (
    <div className="modal-backdrop" onClick={resetAndClose} role="presentation">
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Left accent panel */}
        <div className="modal-accent hidden sm:flex">
          <div className="modal-accent-inner">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-white leading-snug">New Gait Session</h2>
            <p className="text-emerald-100/80 text-sm mt-2 leading-relaxed">
              Upload an underwater gait video to generate joint ROM analysis, asymmetry reports, and annotated playback.
            </p>

            <div className="mt-auto space-y-3 pt-8">
              {[
                { n: 1, label: 'Patient details', done: step > 1 },
                { n: 2, label: 'Upload video', done: false, active: step === 2 },
              ].map((s) => (
                <div key={s.n} className={`modal-step ${s.active ? 'modal-step-active' : ''} ${s.done ? 'modal-step-done' : ''}`}>
                  <div className="modal-step-num">
                    {s.done ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                  </div>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="modal-form">
          <div className="modal-form-header">
            <div>
              <p className="text-xs font-semibold text-[#0B6E4F] uppercase tracking-wider">Step {step} of 2</p>
              <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                {step === 1 ? 'Patient Information' : 'Upload Gait Video'}
              </h3>
            </div>
            <button type="button" onClick={resetAndClose} className="modal-close-btn" disabled={uploading}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 rounded-xl text-sm font-medium text-red-700 bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="modal-form-body">
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="modal-label">
                    <User className="w-3.5 h-3.5" />
                    Patient Name
                  </label>
                  <input
                    type="text"
                    className="input-form"
                    placeholder="e.g. Viraj Pradhan"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="modal-label">
                      <Calendar className="w-3.5 h-3.5" />
                      Recorded Date
                    </label>
                    <input
                      type="date"
                      className="input-form"
                      value={recordedDate}
                      onChange={(e) => setRecordedDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="modal-label">
                      <Clock className="w-3.5 h-3.5" />
                      Recorded Time
                    </label>
                    <input
                      type="time"
                      className="input-form"
                      value={recordedTime}
                      onChange={(e) => setRecordedTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`modal-dropzone ${dragOver ? 'modal-dropzone-active' : ''} ${selectedFile ? 'modal-dropzone-filled' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    handleFilePick(e.dataTransfer.files[0])
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,.mp4,.mov"
                    className="hidden"
                    onChange={(e) => handleFilePick(e.target.files?.[0])}
                  />
                  {selectedFile ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                        <FileVideo className="w-7 h-7 text-[#0B6E4F]" />
                      </div>
                      <p className="text-sm font-bold text-[#0B6E4F] truncate max-w-xs mx-auto">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Click to change</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">Drag & drop video here</p>
                      <p className="text-xs text-slate-500 mt-1">or click to browse · MP4 / MOV up to 500 MB</p>
                    </>
                  )}
                </div>

                <div className="modal-info-box">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">{patientName || 'Patient'}</strong>
                    {' · '}{recordedDate} at {recordedTime}
                  </p>
                </div>
              </div>
            )}

            <div className="modal-form-footer">
              {step === 1 ? (
                <>
                  <button type="button" onClick={resetAndClose} className="btn-outline">Cancel</button>
                  <button
                    type="button"
                    className="btn-accent"
                    onClick={() => setStep(2)}
                    disabled={!patientName || !recordedDate || !recordedTime}
                  >
                    Continue
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setStep(1)} className="btn-outline" disabled={uploading}>
                    Back
                  </button>
                  <button type="submit" className="btn-accent min-w-[140px]" disabled={!selectedFile || uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {progress > 0 ? `Analyzing ${progress}%` : 'Uploading…'}
                      </>
                    ) : (
                      'Start Analysis'
                    )}
                  </button>
                </>
              )}

              {uploading && progress > 0 && (
                <div className="col-span-2 mt-2">
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min(progress, 100)}%`,
                        background: 'linear-gradient(90deg, #0B6E4F, #10B981)',
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 text-center">
                    {progress < 30 ? 'Detecting pose landmarks…' :
                     progress < 70 ? 'Analyzing joint angles…' :
                     progress < 95 ? 'Generating report…' :
                     'Finalizing…'}
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
