const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('gait_token')
}

export function setToken(token: string) {
  localStorage.setItem('gait_token', token)
}

export function clearToken() {
  localStorage.removeItem('gait_token')
  localStorage.removeItem('gait_user')
}

export function getUser() {
  if (typeof window === 'undefined') return null
  const u = localStorage.getItem('gait_user')
  return u ? JSON.parse(u) : null
}

export function setUser(user: object) {
  localStorage.setItem('gait_user', JSON.stringify(user))
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken()
  const headers: HeadersInit = {
    ...(opts.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  if (!(opts.body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json'
  }
  try {
    const res = await fetch(`${API}${path}`, { ...opts, headers })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || `HTTP ${res.status}`)
    }
    return res
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Unable to connect to Gait Analysis API backend at ' + API + '. Please verify FastAPI server on port 8000 is active.')
    }
    throw err
  }
}

export async function apiJson(path: string, opts: RequestInit = {}) {
  const res = await apiFetch(path, opts)
  return res.json()
}

export async function login(email: string, password: string) {
  return apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(name: string, email: string, password: string) {
  return apiJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export async function uploadVideo(
  file: File,
  patientName?: string,
  recordedDate?: string,
  recordedTime?: string
) {
  const fd = new FormData()
  fd.append('file', file)
  if (patientName) fd.append('patient_name', patientName)
  if (recordedDate) fd.append('recorded_date', recordedDate)
  if (recordedTime) fd.append('recorded_time', recordedTime)
  return apiJson('/api/jobs/upload', { method: 'POST', body: fd })
}

export async function listJobs() {
  return apiJson('/api/jobs/')
}

export async function getJob(id: string) {
  return apiJson(`/api/jobs/${id}`)
}

export async function getJobProgress(id: string) {
  return apiJson(`/api/jobs/${id}/progress`)
}

export async function listSessions() {
  return apiJson('/api/sessions')
}

export async function getSessionDetail(dateStr: string, sessionNum: string) {
  return apiJson(`/api/sessions/${dateStr}/${sessionNum}`)
}

export async function updateSessionPatientName(dateStr: string, sessionNum: string, patientName: string) {
  return apiJson(`/api/sessions/${dateStr}/${sessionNum}`, {
    method: 'PATCH',
    body: JSON.stringify({ patient_name: patientName }),
  })
}

export function getStaticUrl(relPath: string) {
  if (!relPath) return ''
  if (relPath.startsWith('http')) return relPath
  const clean = relPath.startsWith('/') ? relPath : `/${relPath}`
  return `${API}${clean}`
}

export function downloadUrl(jobId: string, type: 'video' | 'xlsx' | 'docx') {
  return `${API}/api/jobs/${jobId}/download/${type}`
}

export async function downloadFile(jobId: string, type: 'video' | 'xlsx' | 'docx') {
  const token = getToken()
  const res = await fetch(downloadUrl(jobId, type), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const ext = type === 'video' ? 'mp4' : type
  a.download = `gait_${type}_${jobId}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}
