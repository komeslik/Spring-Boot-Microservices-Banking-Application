import { useState, useEffect, useCallback, Fragment } from 'react'
import './App.css'
import {
  Flag,
  Trash2,
  ExternalLink,
  Server,
  Monitor,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  X,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Network,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ArrowUpCircle,
  Package,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8090'

// ── Types ──

interface FeatureFlag {
  id: string
  name: string
  description: string
  type: 'backend' | 'frontend'
  service: string
  location: string
  config_location: string
  property: string
  field_name: string
  status: string
  staleness_days?: number
  dependencies?: string[]
  dependents?: string[]
  dependent_count?: number
  removal?: {
    flag_id: string
    session_id: string
    session_url: string
    status: string
    pull_request?: string
  }
}

interface ServiceVersion {
  id: string
  name: string
  type: 'backend' | 'frontend'
  port: number
  versions: Record<string, string>
  latest: Record<string, string>
  outdated: string[]
  upgrade?: {
    service_id: string
    session_id: string
    session_url: string
    status: string
    pull_request?: string
  }
}

type TabId = 'flags' | 'versions'

const VERSION_LABELS: Record<string, string> = {
  spring_boot: 'Spring Boot',
  java: 'Java',
  spring_cloud: 'Spring Cloud',
  react: 'React',
  typescript: 'TypeScript',
  vite: 'Vite',
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('flags')

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <Flag className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900">Developer Dashboard</h1>
              <p className="text-xs text-zinc-500">Banking Microservices</p>
            </div>
          </div>
          <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('flags')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'flags'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Flag size={14} />
              Feature Flags
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'versions'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Package size={14} />
              Versions
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'flags' ? <FeatureFlagsTab /> : <VersionsTab />}

      <p className="text-center text-xs text-zinc-400 pb-4">
        Developer Dashboard &middot; Powered by{' '}
        <a href="https://devin.ai" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Devin AI</a>
      </p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS TAB
// ══════════════════════════════════════════════════════════════════════════════

function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removalResult, setRemovalResult] = useState<{ success: boolean; message: string; session_url?: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'backend' | 'frontend'>('all')
  const [expandedDeps, setExpandedDeps] = useState<Set<string>>(new Set())

  const toggleDeps = (flagId: string) => {
    setExpandedDeps((prev) => { const next = new Set(prev); if (next.has(flagId)) { next.delete(flagId) } else { next.add(flagId) }; return next })
  }
  const getFlagNameById = (id: string): string => { const flag = flags.find((f) => f.id === id); return flag ? flag.name : id }
  const getStalenessColor = (days: number | undefined) => {
    if (!days) return { bg: 'bg-zinc-100', text: 'text-zinc-600', label: 'Unknown' }
    if (days >= 90) return { bg: 'bg-red-100', text: 'text-red-700', label: 'Stale' }
    if (days >= 30) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Aging' }
    return { bg: 'bg-green-100', text: 'text-green-700', label: 'Fresh' }
  }
  const getSafetyInfo = (flag: FeatureFlag) => {
    const count = flag.dependent_count ?? 0
    if (count === 0) return { icon: ShieldCheck, color: 'text-green-500', label: 'Safe', description: 'No flags depend on this' }
    if (count <= 2) return { icon: Shield, color: 'text-amber-500', label: 'Caution', description: `${count} flag${count > 1 ? 's' : ''} depend on this` }
    return { icon: ShieldAlert, color: 'text-red-500', label: 'Risky', description: `${count} flags depend on this` }
  }

  const fetchFlags = useCallback(async () => {
    try { setLoading(true); const res = await fetch(`${API_BASE}/api/flags`); if (!res.ok) throw new Error(`Failed: ${res.status}`); const data = await res.json(); setFlags(data.flags); setError(null) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to fetch flags') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchFlags() }, [fetchFlags])

  const handleRemoveFlag = async (flag: FeatureFlag) => {
    setRemoving(true); setRemovalResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/flags/${flag.id}/remove`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (res.ok) { setRemovalResult({ success: true, message: data.message, session_url: data.session?.session_url }); fetchFlags() }
      else { setRemovalResult({ success: false, message: data.detail || 'Failed to trigger removal' }) }
    } catch (err) { setRemovalResult({ success: false, message: err instanceof Error ? err.message : 'Network error' }) }
    finally { setRemoving(false) }
  }

  const filteredFlags = flags.filter((flag) => {
    const matchesSearch = searchQuery === '' || flag.name.toLowerCase().includes(searchQuery.toLowerCase()) || flag.service.toLowerCase().includes(searchQuery.toLowerCase()) || flag.property.toLowerCase().includes(searchQuery.toLowerCase()) || flag.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch && (filterType === 'all' || flag.type === filterType)
  })
  const backendCount = flags.filter((f) => f.type === 'backend').length
  const frontendCount = flags.filter((f) => f.type === 'frontend').length
  const staleCount = flags.filter((f) => (f.staleness_days ?? 0) >= 90).length

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-500">Total Flags</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-zinc-900">{flags.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-500">Backend</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Server size={18} className="text-blue-500" /><span className="text-3xl font-bold text-zinc-900">{backendCount}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-500">Frontend</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Monitor size={18} className="text-purple-500" /><span className="text-3xl font-bold text-zinc-900">{frontendCount}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-500">Stale (&ge;90d)</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Clock size={18} className="text-red-500" /><span className="text-3xl font-bold text-zinc-900">{staleCount}</span></div></CardContent></Card>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input type="text" placeholder="Search flags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-10 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
          {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"><X size={14} /></button>)}
        </div>
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
          {(['all', 'backend', 'frontend'] as const).map((t) => (<button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterType === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
        </div>
        <Button variant="outline" size="sm" onClick={fetchFlags} disabled={loading}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh</Button>
      </div>
      {error && (<div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700"><AlertCircle size={16} />{error}</div>)}
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead className="w-56">Flag</TableHead><TableHead>Type</TableHead><TableHead>Service</TableHead><TableHead>Age</TableHead><TableHead>Safety</TableHead><TableHead>Deps</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading && flags.length === 0 ? (<TableRow><TableCell colSpan={8} className="text-center py-12 text-zinc-400"><Loader2 size={24} className="animate-spin mx-auto mb-2" />Loading...</TableCell></TableRow>)
          : filteredFlags.length === 0 ? (<TableRow><TableCell colSpan={8} className="text-center py-12 text-zinc-400">No feature flags found.</TableCell></TableRow>)
          : filteredFlags.map((flag) => {
            const staleness = getStalenessColor(flag.staleness_days); const safety = getSafetyInfo(flag); const SafetyIcon = safety.icon
            const hasDeps = (flag.dependencies?.length ?? 0) > 0 || (flag.dependents?.length ?? 0) > 0; const isExpanded = expandedDeps.has(flag.id)
            return (<Fragment key={flag.id}>
              <TableRow className="group">
                <TableCell><div><p className="font-medium text-zinc-900">{flag.name}</p><p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{flag.description}</p></div></TableCell>
                <TableCell><Badge variant={flag.type === 'backend' ? 'default' : 'secondary'} className={flag.type === 'backend' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-purple-100 text-purple-700 hover:bg-purple-100'}>{flag.type === 'backend' ? <Server size={10} className="mr-1" /> : <Monitor size={10} className="mr-1" />}{flag.type}</Badge></TableCell>
                <TableCell className="text-sm text-zinc-600">{flag.service}</TableCell>
                <TableCell><div className="flex items-center gap-1.5"><span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${staleness.bg} ${staleness.text}`}><Clock size={10} />{flag.staleness_days}d</span><span className={`text-[10px] ${staleness.text}`}>{staleness.label}</span></div></TableCell>
                <TableCell><div className="flex items-center gap-1.5" title={safety.description}><SafetyIcon size={16} className={safety.color} /><span className={`text-xs font-medium ${safety.color}`}>{safety.label}</span></div></TableCell>
                <TableCell>{hasDeps ? (<button onClick={() => toggleDeps(flag.id)} className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900"><Network size={14} className="text-zinc-400" /><span>{flag.dependencies?.length ?? 0} in / {flag.dependents?.length ?? 0} out</span>{isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</button>) : (<span className="text-xs text-zinc-400">None</span>)}</TableCell>
                <TableCell>
                  {flag.removal?.status === 'in_progress' ? (<div className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin text-orange-500" /><span className="text-xs text-orange-600 font-medium">Removing...</span>{flag.removal.session_url && (<a href={flag.removal.session_url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-700"><ExternalLink size={12} /></a>)}</div>)
                  : flag.removal?.status === 'completed' ? (<div className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-green-500" /><span className="text-xs text-green-600 font-medium">Removed</span></div>)
                  : (<div className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Enabled</span></div>)}
                </TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setSelectedFlag(flag); setDialogOpen(true); setRemovalResult(null) }} disabled={flag.removal?.status === 'in_progress' || flag.removal?.status === 'completed'}><Trash2 size={14} className="mr-1" />Remove</Button></TableCell>
              </TableRow>
              {isExpanded && hasDeps && (<TableRow className="bg-zinc-50/80"><TableCell colSpan={8} className="py-3 px-6"><div className="flex gap-8">
                {(flag.dependencies?.length ?? 0) > 0 && (<div className="flex-1"><p className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Depends on ({flag.dependencies?.length})</p><div className="flex flex-wrap gap-1.5">{flag.dependencies?.map((d) => (<span key={d} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md"><ArrowRight size={10} />{getFlagNameById(d)}</span>))}</div></div>)}
                {(flag.dependents?.length ?? 0) > 0 && (<div className="flex-1"><p className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Required by ({flag.dependents?.length})</p><div className="flex flex-wrap gap-1.5">{flag.dependents?.map((d) => (<span key={d} className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded-md"><ArrowRight size={10} />{getFlagNameById(d)}</span>))}</div></div>)}
              </div></TableCell></TableRow>)}
            </Fragment>)
          })}
        </TableBody>
      </Table></CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Trash2 size={18} className="text-red-500" />Remove Feature Flag</DialogTitle><DialogDescription>This will create a Devin session to automatically remove the feature flag from the codebase, update tests, and create a PR.</DialogDescription></DialogHeader>
          {selectedFlag && !removalResult && (<div className="space-y-4 py-2">
            <div className="bg-zinc-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between"><span className="text-sm text-zinc-500">Flag</span><span className="text-sm font-medium">{selectedFlag.name}</span></div>
              <div className="flex justify-between"><span className="text-sm text-zinc-500">Property</span><code className="text-xs bg-zinc-200 px-1.5 py-0.5 rounded font-mono">{selectedFlag.property}</code></div>
              <div className="flex justify-between"><span className="text-sm text-zinc-500">Service</span><span className="text-sm">{selectedFlag.service}</span></div>
              <div className="flex justify-between"><span className="text-sm text-zinc-500">Location</span><span className="text-xs font-mono text-zinc-600">{selectedFlag.location}</span></div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
              <p className="font-medium">What Devin will do:</p>
              <ul className="mt-1 list-disc list-inside text-xs space-y-0.5"><li>Remove the flag check from the controller/component</li><li>Remove the flag from configuration files</li><li>Update or remove related unit tests</li><li>Run tests to verify nothing breaks</li><li>Create a PR with all changes documented</li></ul>
            </div>
          </div>)}
          {removalResult && (<div className="py-2"><div className={`flex items-start gap-3 rounded-lg px-4 py-3 ${removalResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {removalResult.success ? <CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" /> : <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />}
            <div><p className={`text-sm font-medium ${removalResult.success ? 'text-green-700' : 'text-red-700'}`}>{removalResult.message}</p>
            {removalResult.session_url && (<a href={removalResult.session_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium"><ExternalLink size={14} />View Devin Session</a>)}</div>
          </div></div>)}
          <DialogFooter>
            {!removalResult ? (<><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={removing}>Cancel</Button><Button variant="destructive" onClick={() => selectedFlag && handleRemoveFlag(selectedFlag)} disabled={removing}>{removing ? (<><Loader2 size={14} className="mr-1 animate-spin" />Creating Devin Session...</>) : (<><Trash2 size={14} className="mr-1" />Remove Flag</>)}</Button></>) : (<Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>)}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VERSIONS TAB
// ══════════════════════════════════════════════════════════════════════════════

function VersionsTab() {
  const [services, setServices] = useState<ServiceVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [outdatedCount, setOutdatedCount] = useState(0)
  const [selectedService, setSelectedService] = useState<ServiceVersion | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeResult, setUpgradeResult] = useState<{ success: boolean; message: string; session_url?: string } | null>(null)

  const fetchVersions = useCallback(async () => {
    try { setLoading(true); const res = await fetch(`${API_BASE}/api/versions`); if (!res.ok) throw new Error(`Failed: ${res.status}`); const data = await res.json(); setServices(data.services); setOutdatedCount(data.outdated_count); setError(null) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to fetch versions') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchVersions() }, [fetchVersions])

  const handleUpgrade = async (svc: ServiceVersion) => {
    setUpgrading(true); setUpgradeResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/versions/${svc.id}/upgrade`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (res.ok) { setUpgradeResult({ success: true, message: data.message, session_url: data.session?.session_url }); fetchVersions() }
      else { setUpgradeResult({ success: false, message: data.detail || 'Failed to trigger upgrade' }) }
    } catch (err) { setUpgradeResult({ success: false, message: err instanceof Error ? err.message : 'Network error' }) }
    finally { setUpgrading(false) }
  }

  const backendSvcs = services.filter((s) => s.type === 'backend')
  const frontendSvcs = services.filter((s) => s.type === 'frontend')
  const upToDateCount = services.filter((s) => s.outdated.length === 0).length

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-500">Total Services</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-zinc-900">{services.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-500">Backend</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Server size={18} className="text-blue-500" /><span className="text-3xl font-bold text-zinc-900">{backendSvcs.length}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-500">Up to Date</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-green-500" /><span className="text-3xl font-bold text-zinc-900">{upToDateCount}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-500">Needs Upgrade</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><ArrowUpCircle size={18} className="text-orange-500" /><span className="text-3xl font-bold text-zinc-900">{outdatedCount}</span></div></CardContent></Card>
      </div>
      <div className="flex items-center justify-end"><Button variant="outline" size="sm" onClick={fetchVersions} disabled={loading}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh</Button></div>
      {error && (<div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700"><AlertCircle size={16} />{error}</div>)}

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow><TableHead className="w-56">Service</TableHead><TableHead>Type</TableHead><TableHead>Port</TableHead><TableHead>Current Versions</TableHead><TableHead>Latest Available</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
        <TableBody>
          {loading && services.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center py-12 text-zinc-400"><Loader2 size={24} className="animate-spin mx-auto mb-2" />Loading service versions...</TableCell></TableRow>)
          : services.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center py-12 text-zinc-400">No services found.</TableCell></TableRow>)
          : [...backendSvcs, ...frontendSvcs].map((svc) => {
            const hasOutdated = svc.outdated.length > 0
            return (<TableRow key={svc.id} className="group">
              <TableCell><p className="font-medium text-zinc-900">{svc.name}</p></TableCell>
              <TableCell><Badge variant={svc.type === 'backend' ? 'default' : 'secondary'} className={svc.type === 'backend' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-purple-100 text-purple-700 hover:bg-purple-100'}>{svc.type === 'backend' ? <Server size={10} className="mr-1" /> : <Monitor size={10} className="mr-1" />}{svc.type}</Badge></TableCell>
              <TableCell><code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded font-mono">{svc.port}</code></TableCell>
              <TableCell><div className="space-y-1">{Object.entries(svc.versions).map(([key, val]) => (<div key={key} className="flex items-center gap-2"><span className="text-xs text-zinc-500 w-24">{VERSION_LABELS[key] || key}</span><code className={`text-xs px-1.5 py-0.5 rounded font-mono ${svc.outdated.includes(key) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{val}</code></div>))}</div></TableCell>
              <TableCell><div className="space-y-1">{Object.entries(svc.latest).map(([key, val]) => (<div key={key} className="flex items-center gap-2"><span className="text-xs text-zinc-500 w-24">{VERSION_LABELS[key] || key}</span><code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-zinc-700">{val}</code></div>))}</div></TableCell>
              <TableCell>
                {svc.upgrade?.status === 'in_progress' ? (<div className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin text-orange-500" /><span className="text-xs text-orange-600 font-medium">Upgrading...</span>{svc.upgrade.session_url && (<a href={svc.upgrade.session_url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-700"><ExternalLink size={12} /></a>)}</div>)
                : svc.upgrade?.status === 'completed' ? (<div className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-green-500" /><span className="text-xs text-green-600 font-medium">PR Created</span></div>)
                : hasOutdated ? (<div className="flex items-center gap-1.5"><ArrowUpCircle size={14} className="text-orange-500" /><span className="text-xs text-orange-600 font-medium">{svc.outdated.length} update{svc.outdated.length > 1 ? 's' : ''}</span></div>)
                : (<div className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Up to date</span></div>)}
              </TableCell>
              <TableCell className="text-right">{hasOutdated && (<Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setSelectedService(svc); setDialogOpen(true); setUpgradeResult(null) }} disabled={svc.upgrade?.status === 'in_progress' || svc.upgrade?.status === 'completed'}><ArrowUpCircle size={14} className="mr-1" />Upgrade</Button>)}</TableCell>
            </TableRow>)
          })}
        </TableBody>
      </Table></CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowUpCircle size={18} className="text-orange-500" />Upgrade Service</DialogTitle><DialogDescription>This will create a Devin session to automatically upgrade the service, migrate code, run tests, and create a PR.</DialogDescription></DialogHeader>
          {selectedService && !upgradeResult && (<div className="space-y-4 py-2">
            <div className="bg-zinc-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between"><span className="text-sm text-zinc-500">Service</span><span className="text-sm font-medium">{selectedService.name}</span></div>
              <div className="flex justify-between"><span className="text-sm text-zinc-500">Type</span><Badge variant={selectedService.type === 'backend' ? 'default' : 'secondary'} className={selectedService.type === 'backend' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-purple-100 text-purple-700 hover:bg-purple-100'}>{selectedService.type}</Badge></div>
              <div className="flex justify-between"><span className="text-sm text-zinc-500">Port</span><code className="text-xs bg-zinc-200 px-1.5 py-0.5 rounded font-mono">{selectedService.port}</code></div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-orange-800 mb-2">Versions to upgrade:</p>
              <div className="space-y-1.5">{selectedService.outdated.map((key) => (<div key={key} className="flex items-center gap-2 text-xs"><span className="text-orange-700 font-medium w-24">{VERSION_LABELS[key] || key}</span><code className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-mono">{selectedService.versions[key]}</code><ArrowRight size={12} className="text-orange-400" /><code className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-mono">{selectedService.latest[key]}</code></div>))}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
              <p className="font-medium">What Devin will do:</p>
              <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                {selectedService.type === 'backend' ? (<><li>Update pom.xml with new Spring Boot, Java, and Spring Cloud versions</li><li>Migrate javax to jakarta namespace</li><li>Update GlobalExceptionHandler for Spring Boot 3.x API</li><li>Update test files for compatibility</li><li>Build and run tests to verify</li><li>Create a PR with test results</li></>) : (<><li>Update React, TypeScript, and Vite to latest versions</li><li>Fix any breaking changes</li><li>Build and run tests to verify</li><li>Create a PR with test results</li></>)}
              </ul>
            </div>
          </div>)}
          {upgradeResult && (<div className="py-2"><div className={`flex items-start gap-3 rounded-lg px-4 py-3 ${upgradeResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {upgradeResult.success ? <CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" /> : <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />}
            <div><p className={`text-sm font-medium ${upgradeResult.success ? 'text-green-700' : 'text-red-700'}`}>{upgradeResult.message}</p>
            {upgradeResult.session_url && (<a href={upgradeResult.session_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium"><ExternalLink size={14} />View Devin Session</a>)}</div>
          </div></div>)}
          <DialogFooter>
            {!upgradeResult ? (<><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={upgrading}>Cancel</Button><Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => selectedService && handleUpgrade(selectedService)} disabled={upgrading}>{upgrading ? (<><Loader2 size={14} className="mr-1 animate-spin" />Creating Devin Session...</>) : (<><ArrowUpCircle size={14} className="mr-1" />Start Upgrade</>)}</Button></>) : (<Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>)}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default App
