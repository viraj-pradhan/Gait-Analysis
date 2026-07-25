'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Activity, Users, FileText, Settings, LogOut } from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  match?: (pathname: string) => boolean
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Sessions',
    href: '/sessions',
    icon: Activity,
    match: (p) => p === '/sessions',
  },
  {
    label: 'Patients',
    href: '/patients',
    icon: Users,
    match: (p) => p === '/patients' || p.startsWith('/patients/'),
  },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
]

type Props = {
  user: { name?: string; email?: string } | null
  onLogout: () => void
  onNavClick?: () => void
  className?: string
}

export function Sidebar({ user, onLogout, onNavClick, className = '' }: Props) {
  const pathname = usePathname()

  return (
    <aside className={`sidebar ${className}`}>
      <div className="sidebar-brand">
        <div className="sidebar-logo">G</div>
        <div>
          <h1 className="sidebar-brand-title">GaitRehab</h1>
          <p className="sidebar-brand-sub">Underwater Gait Analysis</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.match ? item.match(pathname) : pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <p className="sidebar-user-name">{user?.name || user?.email || 'Clinician'}</p>
          <p className="sidebar-user-role">{user?.email || 'Physical Therapist'}</p>
        </div>
        <button type="button" onClick={onLogout} className="sidebar-logout">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
