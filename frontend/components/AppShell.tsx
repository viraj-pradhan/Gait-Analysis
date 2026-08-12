'use client'
import React, { useState, useEffect, useRef, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getUser, clearToken, uploadVideo, getJobProgress } from '@/lib/api'
import { Sidebar } from '@/components/Sidebar'
import { NewSessionModal } from '@/components/NewSessionModal'
import { Plus, Menu, X } from 'lucide-react'

interface AppShellProps {
  children: ReactNode
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/sessions': 'Sessions',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith('/sessions/') && pathname.split('/').length > 3) return 'Session Detail'
  return pageTitles[pathname] || 'GaitRehab'
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [preFilledPatientName, setPreFilledPatientName] = useState('')
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setUser(getUser())

    const handleCustomOpen = (e: Event) => {
      const customEv = e as CustomEvent<{ patientName?: string }>
      if (customEv.detail?.patientName) {
        setPreFilledPatientName(customEv.detail.patientName)
      } else {
        setPreFilledPatientName('')
      }
      setUploadModalOpen(true)
    }

    window.addEventListener('open-new-session-modal', handleCustomOpen)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      window.removeEventListener('open-new-session-modal', handleCustomOpen)
    }
  }, [])

  function handleLogout() {
    clearToken()
    router.replace('/login')
  }

  async function handleUploadSubmit(data: {
    patientName: string
    recordedDate: string
    recordedTime: string
    file: File
  }) {
    setUploading(true)
    setUploadError('')
    setUploadProgress(0)
    try {
      const res = await uploadVideo(
        data.file,
        data.patientName || 'Unknown Patient',
        data.recordedDate,
        data.recordedTime
      )

      if (res.job_id) {
        // Start polling progress
        pollRef.current = setInterval(async () => {
          try {
            const prog = await getJobProgress(res.job_id)
            setUploadProgress(prog.progress || 0)
            const isDone = ['success', 'done', 'completed'].includes(prog.status) || prog.progress >= 100
            const isError = prog.status === 'error' || prog.status === 'failed'
            if (isDone) {
              if (pollRef.current) clearInterval(pollRef.current)
              setUploadModalOpen(false)
              setUploading(false)
              setUploadProgress(0)
              // Navigate to specific session if we have the session_id, else session list
              if (prog.session_id) {
                const parts = prog.session_id.split('/')
                if (parts.length === 2) {
                  router.push(`/sessions/${parts[0]}/${parts[1]}`)
                } else {
                  router.push('/sessions')
                }
              } else {
                router.push('/sessions')
              }
            } else if (isError) {
              if (pollRef.current) clearInterval(pollRef.current)
              setUploadError('Analysis failed. Please try again.')
              setUploading(false)
              setUploadProgress(0)
            }
          } catch {
            // Ignore polling errors
          }
        }, 1000)
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed')
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="app-shell">
      {/* Mobile header */}
      <div className="app-mobile-header">
        <div className="flex items-center gap-2.5">
          <div className="sidebar-logo sidebar-logo-sm">G</div>
          <span className="font-bold text-sm tracking-tight text-slate-900">GaitRehab</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setUploadModalOpen(true)} className="btn-accent py-1.5 px-3 text-xs">
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-50 text-slate-500"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="sidebar-overlay md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <Sidebar
        user={user}
        onLogout={handleLogout}
        onNavClick={() => setMobileMenuOpen(false)}
        className={mobileMenuOpen ? 'sidebar-open' : ''}
      />

      <div className="app-main">
        <header className="app-desktop-header">
          <div>
            <h2 className="font-bold text-base text-slate-900">{getPageTitle(pathname)}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Biomechanics & recovery tracking</p>
          </div>
          <button onClick={() => setUploadModalOpen(true)} className="btn-accent">
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </header>

        <main className="app-content">{children}</main>
      </div>

      <NewSessionModal
        open={uploadModalOpen}
        onClose={() => { setUploadModalOpen(false); setUploadError(''); setPreFilledPatientName('') }}
        onSubmit={handleUploadSubmit}
        uploading={uploading}
        error={uploadError}
        progress={uploadProgress}
        defaultPatientName={preFilledPatientName}
      />
    </div>
  )
}
