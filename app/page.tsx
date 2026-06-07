'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AuthProvider, ProtectedRoute, LoginForm, RegisterForm, UserMenu } from 'lyzr-architect/client'
import { Droplet, Heart, Activity } from 'lucide-react'
import Sidebar, { SectionKey } from './sections/Sidebar'
import Dashboard from './sections/Dashboard'
import DonorMatching from './sections/DonorMatching'
import WhatsAppSimulator from './sections/WhatsAppSimulator'
import InventoryAnalytics from './sections/InventoryAnalytics'
import RequestsManagement from './sections/RequestsManagement'
import DonorsManagement from './sections/DonorsManagement'
import Patients from './sections/Patients'
import BloodBridges from './sections/BloodBridges'
import AwsTools from './sections/AwsTools'
import EmergencyResponse from './sections/EmergencyResponse'
import HallOfFame from './sections/HallOfFame'
import DonorMap from './sections/DonorMap'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(40,55%,95%)] text-[hsl(20,25%,12%)]">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-[hsl(20,15%,40%)] mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-red-600 text-[hsl(40,50%,98%)] rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const PAGE_BG =
  'linear-gradient(135deg, hsl(40 55% 96%) 0%, hsl(30 50% 94%) 30%, hsl(35 55% 95%) 60%, hsl(20 45% 93%) 100%)'

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: PAGE_BG }}>
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-red-300 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-amber-200 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-56 h-56 rounded-full bg-red-200 blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg">
            <Droplet className="w-7 h-7 text-[hsl(40,50%,98%)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-red-700">RaktSetu AI</h1>
            <p className="text-xs text-[hsl(20,15%,40%)] uppercase tracking-widest">
              Intelligent Blood Bank Management
            </p>
          </div>
        </div>

        <div className="w-full max-w-md bg-[hsl(40,50%,98%)]/85 backdrop-blur-[16px] border border-[hsl(0,30%,80%)]/30 shadow-xl rounded-[14px] p-6">
          <h2 className="text-lg font-semibold text-[hsl(20,25%,12%)] mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-xs text-[hsl(20,15%,40%)] mb-5">
            {mode === 'login'
              ? 'Sign in to manage your blood bank operations.'
              : 'Register to start saving lives with AI-powered tools.'}
          </p>

          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>

        <p className="text-[11px] text-[hsl(20,15%,40%)] mt-6 text-center max-w-md">
          Powered by AI agents and a secure RAG knowledge base. Your data is private and protected.
        </p>
      </div>
    </div>
  )
}

function AppShell() {
  const [section, setSection] = useState<SectionKey>('dashboard')
  const [sampleMode, setSampleMode] = useState(false)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)

  const [inventory, setInventory] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [donors, setDonors] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [bridges, setBridges] = useState<any[]>([])
  const [transfusions, setTransfusions] = useState<any[]>([])

  const fetchJson = async (url: string) => {
    try {
      const res = await fetch(url, { credentials: 'include' })
      const data = await res.json()
      return Array.isArray(data?.data) ? data.data : []
    } catch {
      return []
    }
  }

  const refreshInventory = useCallback(async () => {
    setInventory(await fetchJson('/api/inventory'))
  }, [])
  const refreshRequests = useCallback(async () => {
    setRequests(await fetchJson('/api/blood-requests'))
  }, [])
  const refreshDonors = useCallback(async () => {
    setDonors(await fetchJson('/api/donors'))
  }, [])
  const refreshPatients = useCallback(async () => {
    setPatients(await fetchJson('/api/patients'))
  }, [])
  const refreshBridges = useCallback(async () => {
    setBridges(await fetchJson('/api/bridges'))
  }, [])
  const refreshTransfusions = useCallback(async () => {
    setTransfusions(await fetchJson('/api/transfusions'))
  }, [])

  useEffect(() => {
    refreshInventory()
    refreshRequests()
    refreshDonors()
    refreshPatients()
    refreshBridges()
    refreshTransfusions()
  }, [
    refreshInventory,
    refreshRequests,
    refreshDonors,
    refreshPatients,
    refreshBridges,
    refreshTransfusions,
  ])

  const agentInfo: { id: string; name: string; purpose: string }[] = [
    { id: '6a23dc4bb5c0c11ba8bdd087', name: 'Demand Forecasting', purpose: 'Predict blood demand' },
    { id: '6a23dc4b73f8cfd0274c2377', name: 'Donor Matching', purpose: 'Find compatible donors' },
    { id: '6a23dc4c4de1249a50b05684', name: 'Chat Simulation', purpose: 'WhatsApp coordinator' },
    { id: '6a23dc4c08932c26517945ab', name: 'Inventory Analytics', purpose: 'Stock & expiry analysis' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: PAGE_BG }}>
      <Sidebar active={section} onSelect={setSection} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-[hsl(40,50%,98%)]/85 backdrop-blur-[16px] border-b border-[hsl(30,25%,82%)] shadow-sm">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-[hsl(20,15%,40%)] text-xs">
                <Activity className="w-3.5 h-3.5" />
                <span>
                  {activeAgent
                    ? `Active agent: ${agentInfo.find((a) => a.id === activeAgent)?.name || 'Working...'}`
                    : 'All agents idle'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-1">
                {agentInfo.map((a) => (
                  <div
                    key={a.id}
                    title={`${a.name} — ${a.purpose}`}
                    className={`w-2 h-2 rounded-full transition-all ${
                      activeAgent === a.id
                        ? 'bg-red-600 animate-pulse ring-2 ring-red-300'
                        : 'bg-[hsl(30,25%,75%)]'
                    }`}
                  />
                ))}
              </div>
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {section === 'dashboard' && (
              <Dashboard
                inventory={inventory}
                requests={requests}
                donors={donors}
                sampleMode={sampleMode}
                setSampleMode={setSampleMode}
                setActiveAgent={setActiveAgent}
              />
            )}
            {section === 'donor-matching' && (
              <DonorMatching donors={donors} sampleMode={sampleMode} setActiveAgent={setActiveAgent} />
            )}
            {section === 'whatsapp' && (
              <WhatsAppSimulator sampleMode={sampleMode} setActiveAgent={setActiveAgent} />
            )}
            {section === 'inventory' && (
              <InventoryAnalytics
                inventory={inventory}
                refreshInventory={refreshInventory}
                sampleMode={sampleMode}
                setActiveAgent={setActiveAgent}
              />
            )}
            {section === 'requests' && (
              <RequestsManagement requests={requests} refreshRequests={refreshRequests} />
            )}
            {section === 'donors' && (
              <DonorsManagement donors={donors} refreshDonors={refreshDonors} />
            )}
            {section === 'patients' && (
              <Patients
                patients={patients}
                refreshPatients={refreshPatients}
                transfusions={transfusions}
              />
            )}
            {section === 'blood-bridges' && (
              <BloodBridges
                bridges={bridges}
                refreshBridges={refreshBridges}
                patients={patients}
                donors={donors}
              />
            )}
            {section === 'aws-tools' && <AwsTools donors={donors} />}
            {section === 'emergency-response' && (
              <EmergencyResponse donors={donors} setActiveAgent={setActiveAgent} />
            )}
            {section === 'hall-of-fame' && <HallOfFame donors={donors} />}
            {section === 'donor-map' && <DonorMap donors={donors} />}

            <div className="mt-10 bg-[hsl(40,50%,98%)]/70 backdrop-blur-[16px] border border-[hsl(30,25%,82%)] rounded-[14px] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-3.5 h-3.5 text-red-600" />
                <p className="text-[11px] uppercase tracking-wider text-[hsl(20,25%,12%)]/70 font-semibold">
                  Powered by Agents
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {agentInfo.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-[hsl(40,50%,98%)]/70 border border-[hsl(30,25%,82%)]"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activeAgent === a.id ? 'bg-red-600 animate-pulse' : 'bg-[hsl(30,25%,75%)]'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[hsl(20,25%,12%)] truncate">{a.name}</p>
                      <p className="text-[10px] text-[hsl(20,15%,40%)] truncate">{a.purpose}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProtectedRoute unauthenticatedFallback={<AuthScreen />}>
          <AppShell />
        </ProtectedRoute>
      </AuthProvider>
    </ErrorBoundary>
  )
}
