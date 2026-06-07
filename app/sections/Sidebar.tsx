'use client'

import { LayoutDashboard, Users, MessageCircle, Package, FileText, Heart, Droplet, Cloud, Siren, Trophy, Stethoscope, GitBranch, Map } from 'lucide-react'

export type SectionKey =
  | 'dashboard'
  | 'donor-matching'
  | 'whatsapp'
  | 'inventory'
  | 'requests'
  | 'donors'
  | 'patients'
  | 'blood-bridges'
  | 'aws-tools'
  | 'emergency-response'
  | 'hall-of-fame'
  | 'donor-map'

interface SidebarProps {
  active: SectionKey
  onSelect: (key: SectionKey) => void
}

const navItems: { key: SectionKey; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'donor-matching', label: 'Donor Matching', icon: Heart },
  { key: 'whatsapp', label: 'Bridge Simulator', icon: MessageCircle },
  { key: 'inventory', label: 'Inventory Analytics', icon: Package },
  { key: 'requests', label: 'Requests', icon: FileText },
  { key: 'donors', label: 'Donors', icon: Users },
  { key: 'patients', label: 'Patients', icon: Stethoscope },
  { key: 'blood-bridges', label: 'Blood Bridges', icon: GitBranch },
  { key: 'aws-tools', label: 'Lifeline Hub', icon: Cloud },
  { key: 'emergency-response', label: 'Emergency Response', icon: Siren },
  { key: 'hall-of-fame', label: 'Hall of Fame', icon: Trophy },
  { key: 'donor-map', label: 'Donor Map', icon: Map },
]

export default function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-[hsl(40,50%,96%)]/85 backdrop-blur-[16px] border-r border-[hsl(30,25%,82%)] shadow-md flex flex-col">
      <div className="px-5 py-5 border-b border-[hsl(30,25%,82%)] flex items-center gap-2">
        <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md">
          <Droplet className="w-5 h-5 text-[hsl(40,50%,98%)]" />
        </div>
        <div>
          <h1 className="text-base font-bold text-red-700 leading-tight">RaktSetu AI</h1>
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.key
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all border-l-4 ${
                isActive
                  ? 'bg-red-50 text-red-800 border-l-red-600 shadow-sm'
                  : 'text-[hsl(20,25%,12%)] border-l-transparent hover:bg-[hsl(40,30%,90%)]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-600' : 'text-[hsl(20,15%,40%)]'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

    </aside>
  )
}
