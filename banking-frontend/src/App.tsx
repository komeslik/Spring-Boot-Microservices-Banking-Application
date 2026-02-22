import { useState } from 'react'
import { Users, Wallet, ArrowRightLeft, Receipt, Key, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Play } from 'lucide-react'
import DemoPanel from './DemoPanel'
import featureFlags from './featureFlags'

const DIRECT_API = {
  users: '/proxy/users',
  accounts: '/proxy/accounts',
  fundTransfers: '/proxy/fund-transfers',
  transactions: '/proxy/transactions',
  sequence: '/proxy/sequence',
}
const API_BASE = '/proxy/gateway'
const KEYCLOAK_URL = '/proxy/keycloak'
const KEYCLOAK_REALM = 'banking-service'
const KEYCLOAK_CLIENT_ID = 'banking-service-client'
const KEYCLOAK_CLIENT_SECRET = 'Au6eAD2JgB5MH0G2tNrPLfKqObswfSPb'

const PROXY_TO_REAL: Record<string, string> = {
  '/proxy/users': 'http://localhost:8082',
  '/proxy/accounts': 'http://localhost:8081',
  '/proxy/fund-transfers': 'http://localhost:8085',
  '/proxy/transactions': 'http://localhost:8084',
  '/proxy/sequence': 'http://localhost:8083',
  '/proxy/gateway': 'http://localhost:8080',
  '/proxy/keycloak': 'http://localhost:8571',
}

function toDisplayUrl(proxyUrl: string): string {
  for (const [prefix, real] of Object.entries(PROXY_TO_REAL)) {
    if (proxyUrl.startsWith(prefix)) {
      return proxyUrl.replace(prefix, real)
    }
  }
  return proxyUrl
}

type TabName = 'auth' | 'users' | 'accounts' | 'transfers' | 'transactions' | 'demo'

interface LogEntry {
  id: number
  timestamp: string
  method: string
  url: string
  status: number | string
  response: string
  success: boolean
}

function App() {
  const [activeTab, setActiveTab] = useState<TabName>('auth')
  const [token, setToken] = useState('')
  const [useGateway, setUseGateway] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [expandedLog, setExpandedLog] = useState<number | null>(null)

  const addLog = (method: string, url: string, status: number | string, response: string, success: boolean) => {
    const entry: LogEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      method,
      url,
      status,
      response: typeof response === 'object' ? JSON.stringify(response, null, 2) : response,
      success,
    }
    setLogs(prev => [entry, ...prev])
  }

  const apiCall = async (method: string, url: string, body?: unknown) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token && useGateway) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { data = text }
      const responseStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : data
      addLog(method, toDisplayUrl(url), res.status, responseStr, res.ok)
      return { ok: res.ok, status: res.status, data }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      addLog(method, toDisplayUrl(url), 'ERR', errMsg, false)
      return { ok: false, status: 0, data: errMsg }
    }
  }

  const getBase = (service: keyof typeof DIRECT_API) => {
    return useGateway ? API_BASE : DIRECT_API[service]
  }

  const tabs: { name: TabName; label: string; icon: React.ReactNode }[] = [
    { name: 'auth', label: 'Auth (Keycloak)', icon: <Key size={18} /> },
    { name: 'users', label: 'Users', icon: <Users size={18} /> },
    { name: 'accounts', label: 'Accounts', icon: <Wallet size={18} /> },
    { name: 'transfers', label: 'Fund Transfers', icon: <ArrowRightLeft size={18} /> },
    { name: 'transactions', label: 'Transactions', icon: <Receipt size={18} /> },
    ...(featureFlags.ENABLE_DEMO_TAB ? [{ name: 'demo' as TabName, label: 'Demo', icon: <Play size={18} /> }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Wallet className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Banking Microservices</h1>
              <p className="text-xs text-gray-500">API Testing Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={useGateway}
                onChange={e => setUseGateway(e.target.checked)}
                className="accent-emerald-600"
              />
              Use API Gateway (port 8080)
            </label>
            {token && (
              <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                <CheckCircle2 size={14} /> Authenticated
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <nav className="w-56 shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {tabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.name
                    ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {activeTab === 'auth' && <AuthPanel token={token} setToken={setToken} addLog={addLog} />}
            {activeTab === 'users' && <UsersPanel apiCall={apiCall} getBase={getBase} />}
            {activeTab === 'accounts' && <AccountsPanel apiCall={apiCall} getBase={getBase} />}
            {activeTab === 'transfers' && <TransfersPanel apiCall={apiCall} getBase={getBase} />}
            {activeTab === 'transactions' && <TransactionsPanel apiCall={apiCall} getBase={getBase} />}
            {activeTab === 'demo' && <DemoPanel />}
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Request Log</h3>
              {logs.length > 0 && (
                <button onClick={() => setLogs([])} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="px-6 py-8 text-gray-400 text-center text-sm">No requests yet. Try an endpoint above.</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="border-b border-gray-100 last:border-0">
                    <button
                      className="w-full px-6 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {log.success ? (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-red-500 shrink-0" />
                      )}
                      <MethodBadge method={log.method} />
                      <span className="text-sm text-gray-700 truncate flex-1 font-mono">{log.url}</span>
                      <span className={`text-xs font-bold ${log.success ? 'text-emerald-600' : 'text-red-600'}`}>{log.status}</span>
                      <span className="text-xs text-gray-400">{log.timestamp}</span>
                      {expandedLog === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {expandedLog === log.id && (
                      <pre className="px-6 py-3 bg-gray-900 text-green-400 text-xs overflow-x-auto font-mono whitespace-pre-wrap">{log.response}</pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    PATCH: 'bg-purple-100 text-purple-700',
    DELETE: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${colors[method] || 'bg-gray-100 text-gray-700'}`}>
      {method}
    </span>
  )
}

function Section({ title, method, path, children }: { title: string; method: string; path: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <MethodBadge method={method} />
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        <span className="text-xs font-mono text-gray-400 ml-auto">{path}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || label}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
    </div>
  )
}

function ActionButton({ onClick, children, variant = 'primary' }: { onClick: () => void; children: React.ReactNode; variant?: 'primary' | 'danger' }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
      variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
    }`}>{children}</button>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

/* ==================== AUTH PANEL ==================== */
function AuthPanel({ token, setToken, addLog }: {
  token: string; setToken: (t: string) => void
  addLog: (method: string, url: string, status: number | string, response: string, success: boolean) => void
}) {
  const [loading, setLoading] = useState(false)

  const getToken = async () => {
    setLoading(true)
    const url = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`
    const displayUrl = `http://localhost:8571/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: KEYCLOAK_CLIENT_ID,
          client_secret: KEYCLOAK_CLIENT_SECRET,
        }),
      })
      const data = await res.json()
      if (data.access_token) {
        setToken(data.access_token)
        addLog('POST', displayUrl, res.status, JSON.stringify(data, null, 2), true)
      } else {
        addLog('POST', displayUrl, res.status, JSON.stringify(data, null, 2), false)
      }
    } catch (err) {
      addLog('POST', displayUrl, 'ERR', err instanceof Error ? err.message : String(err), false)
    }
    setLoading(false)
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Keycloak Authentication</h2>
      <p className="text-sm text-gray-500 mb-6">Get a JWT token from Keycloak to authenticate API Gateway requests.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoBox label="Keycloak URL" value="http://localhost:8571" />
          <InfoBox label="Realm" value={KEYCLOAK_REALM} />
          <InfoBox label="Client ID" value={KEYCLOAK_CLIENT_ID} />
          <InfoBox label="Grant Type" value="client_credentials" />
        </div>
        <button onClick={getToken} disabled={loading}
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {loading ? 'Getting Token...' : 'Get JWT Token'}
        </button>
        {token && (
          <div className="bg-gray-50 rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Access Token</span>
              <button onClick={() => navigator.clipboard.writeText(token)} className="text-xs text-emerald-600 hover:underline">Copy</button>
            </div>
            <p className="font-mono text-xs text-gray-600 break-all max-h-20 overflow-y-auto">{token}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 p-3 rounded">
      <span className="text-gray-500">{label}:</span>
      <p className="font-mono text-gray-800">{value}</p>
    </div>
  )
}

/* ==================== USERS PANEL ==================== */
function UsersPanel({ apiCall, getBase }: {
  apiCall: (method: string, url: string, body?: unknown) => Promise<{ ok: boolean; status: number; data: unknown }>
  getBase: (service: keyof typeof DIRECT_API) => string
}) {
  const [regForm, setRegForm] = useState({ firstName: '', lastName: '', emailId: '', password: '', contactNumber: '' })
  const [updateForm, setUpdateForm] = useState({ userId: '', firstName: '', lastName: '' })
  const [statusForm, setStatusForm] = useState({ userId: '', status: 'ACTIVE' })
  const [lookupId, setLookupId] = useState('')
  const [users, setUsers] = useState<unknown[]>([])

  const getAllUsers = async () => {
    const res = await apiCall('GET', `${getBase('users')}/api/users`)
    if (res.ok && Array.isArray(res.data)) setUsers(res.data)
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">User Service</h2>
      <p className="text-sm text-gray-500 mb-6">Port 8082 — Manage users and registration.</p>
      <div className="space-y-6">
        <Section title="Register User" method="POST" path="/api/users/register">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={regForm.firstName} onChange={v => setRegForm(p => ({ ...p, firstName: v }))} />
            <Input label="Last Name" value={regForm.lastName} onChange={v => setRegForm(p => ({ ...p, lastName: v }))} />
            <Input label="Email" value={regForm.emailId} onChange={v => setRegForm(p => ({ ...p, emailId: v }))} />
            <Input label="Password" value={regForm.password} onChange={v => setRegForm(p => ({ ...p, password: v }))} type="password" />
            <Input label="Contact Number" value={regForm.contactNumber} onChange={v => setRegForm(p => ({ ...p, contactNumber: v }))} />
          </div>
          <ActionButton onClick={() => apiCall('POST', `${getBase('users')}/api/users/register`, regForm)}>Register</ActionButton>
        </Section>

        <Section title="Get All Users" method="GET" path="/api/users">
          <ActionButton onClick={getAllUsers}>Fetch All Users</ActionButton>
          {users.length > 0 && (
            <pre className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto mt-3 max-h-60 overflow-y-auto">{JSON.stringify(users, null, 2)}</pre>
          )}
        </Section>

        <Section title="Get User by ID" method="GET" path="/api/users/{userId}">
          <div className="flex gap-3 items-end">
            <Input label="User ID" value={lookupId} onChange={setLookupId} />
            <ActionButton onClick={() => apiCall('GET', `${getBase('users')}/api/users/${lookupId}`)}>Fetch</ActionButton>
          </div>
        </Section>

        <Section title="Update User" method="PUT" path="/api/users/{id}">
          <div className="grid grid-cols-3 gap-3">
            <Input label="User ID" value={updateForm.userId} onChange={v => setUpdateForm(p => ({ ...p, userId: v }))} />
            <Input label="First Name" value={updateForm.firstName} onChange={v => setUpdateForm(p => ({ ...p, firstName: v }))} />
            <Input label="Last Name" value={updateForm.lastName} onChange={v => setUpdateForm(p => ({ ...p, lastName: v }))} />
          </div>
          <ActionButton onClick={() => apiCall('PUT', `${getBase('users')}/api/users/${updateForm.userId}`, { firstName: updateForm.firstName, lastName: updateForm.lastName })}>Update</ActionButton>
        </Section>

        <Section title="Update User Status" method="PATCH" path="/api/users/{id}">
          <div className="flex gap-3 items-end">
            <Input label="User ID" value={statusForm.userId} onChange={v => setStatusForm(p => ({ ...p, userId: v }))} />
            <SelectField label="Status" value={statusForm.status} onChange={v => setStatusForm(p => ({ ...p, status: v }))}
              options={[{ value: 'ACTIVE', label: 'ACTIVE' }, { value: 'PENDING', label: 'PENDING' }, { value: 'INACTIVE', label: 'INACTIVE' }]} />
            <ActionButton onClick={() => apiCall('PATCH', `${getBase('users')}/api/users/${statusForm.userId}`, { status: statusForm.status })}>Update Status</ActionButton>
          </div>
        </Section>
      </div>
    </div>
  )
}

/* ==================== ACCOUNTS PANEL ==================== */
function AccountsPanel({ apiCall, getBase }: {
  apiCall: (method: string, url: string, body?: unknown) => Promise<{ ok: boolean; status: number; data: unknown }>
  getBase: (service: keyof typeof DIRECT_API) => string
}) {
  const [createForm, setCreateForm] = useState({ userId: '', accountType: 'SAVINGS_ACCOUNT', accountStatus: 'ACTIVE' })
  const [accountNumber, setAccountNumber] = useState('')
  const [userId, setUserId] = useState('')
  const [balanceAccNum, setBalanceAccNum] = useState('')
  const [txnAccountId, setTxnAccountId] = useState('')
  const [closeAccNum, setCloseAccNum] = useState('')

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Account Service</h2>
      <p className="text-sm text-gray-500 mb-6">Port 8081 — Manage bank accounts.</p>
      <div className="space-y-6">
        <Section title="Create Account" method="POST" path="/accounts">
          <div className="grid grid-cols-3 gap-3">
            <Input label="User ID" value={createForm.userId} onChange={v => setCreateForm(p => ({ ...p, userId: v }))} />
            <SelectField label="Account Type" value={createForm.accountType} onChange={v => setCreateForm(p => ({ ...p, accountType: v }))}
              options={[{ value: 'SAVINGS_ACCOUNT', label: 'SAVINGS_ACCOUNT' }, { value: 'FIXED_DEPOSIT', label: 'FIXED_DEPOSIT' }, { value: 'LOAN_ACCOUNT', label: 'LOAN_ACCOUNT' }]} />
            <SelectField label="Status" value={createForm.accountStatus} onChange={v => setCreateForm(p => ({ ...p, accountStatus: v }))}
              options={[{ value: 'ACTIVE', label: 'ACTIVE' }, { value: 'INACTIVE', label: 'INACTIVE' }]} />
          </div>
          <ActionButton onClick={() => apiCall('POST', `${getBase('accounts')}/accounts`, { userId: Number(createForm.userId), accountType: createForm.accountType, accountStatus: createForm.accountStatus })}>Create Account</ActionButton>
        </Section>

        <Section title="Get Account by Number" method="GET" path="/accounts?accountNumber=...">
          <div className="flex gap-3 items-end">
            <Input label="Account Number" value={accountNumber} onChange={setAccountNumber} />
            <ActionButton onClick={() => apiCall('GET', `${getBase('accounts')}/accounts?accountNumber=${accountNumber}`)}>Fetch</ActionButton>
          </div>
        </Section>

        <Section title="Get Account by User ID" method="GET" path="/accounts/{userId}">
          <div className="flex gap-3 items-end">
            <Input label="User ID" value={userId} onChange={setUserId} />
            <ActionButton onClick={() => apiCall('GET', `${getBase('accounts')}/accounts/${userId}`)}>Fetch</ActionButton>
          </div>
        </Section>

        <Section title="Get Account Balance" method="GET" path="/accounts/balance?accountNumber=...">
          <div className="flex gap-3 items-end">
            <Input label="Account Number" value={balanceAccNum} onChange={setBalanceAccNum} />
            <ActionButton onClick={() => apiCall('GET', `${getBase('accounts')}/accounts/balance?accountNumber=${balanceAccNum}`)}>Check Balance</ActionButton>
          </div>
        </Section>

        <Section title="Get Account Transactions" method="GET" path="/accounts/{accountId}/transactions">
          <div className="flex gap-3 items-end">
            <Input label="Account ID" value={txnAccountId} onChange={setTxnAccountId} />
            <ActionButton onClick={() => apiCall('GET', `${getBase('accounts')}/accounts/${txnAccountId}/transactions`)}>Get Transactions</ActionButton>
          </div>
        </Section>

        <Section title="Close Account" method="PUT" path="/accounts/closure?accountNumber=...">
          <div className="flex gap-3 items-end">
            <Input label="Account Number" value={closeAccNum} onChange={setCloseAccNum} />
            <ActionButton onClick={() => apiCall('PUT', `${getBase('accounts')}/accounts/closure?accountNumber=${closeAccNum}`)} variant="danger">Close Account</ActionButton>
          </div>
        </Section>
      </div>
    </div>
  )
}

/* ==================== FUND TRANSFERS PANEL ==================== */
function TransfersPanel({ apiCall, getBase }: {
  apiCall: (method: string, url: string, body?: unknown) => Promise<{ ok: boolean; status: number; data: unknown }>
  getBase: (service: keyof typeof DIRECT_API) => string
}) {
  const [transferForm, setTransferForm] = useState({ fromAccount: '', toAccount: '', amount: '' })
  const [refId, setRefId] = useState('')
  const [accountId, setAccountId] = useState('')

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Fund Transfer Service</h2>
      <p className="text-sm text-gray-500 mb-6">Port 8085 — Transfer funds between accounts.</p>
      <div className="space-y-6">
        <Section title="Initiate Fund Transfer" method="POST" path="/fund-transfers">
          <div className="grid grid-cols-3 gap-3">
            <Input label="From Account" value={transferForm.fromAccount} onChange={v => setTransferForm(p => ({ ...p, fromAccount: v }))} />
            <Input label="To Account" value={transferForm.toAccount} onChange={v => setTransferForm(p => ({ ...p, toAccount: v }))} />
            <Input label="Amount" value={transferForm.amount} onChange={v => setTransferForm(p => ({ ...p, amount: v }))} type="number" />
          </div>
          <ActionButton onClick={() => apiCall('POST', `${getBase('fundTransfers')}/fund-transfers`, { fromAccount: transferForm.fromAccount, toAccount: transferForm.toAccount, amount: Number(transferForm.amount) })}>Transfer</ActionButton>
        </Section>

        <Section title="Get Transfer by Reference ID" method="GET" path="/fund-transfers/{referenceId}">
          <div className="flex gap-3 items-end">
            <Input label="Reference ID" value={refId} onChange={setRefId} />
            <ActionButton onClick={() => apiCall('GET', `${getBase('fundTransfers')}/fund-transfers/${refId}`)}>Fetch</ActionButton>
          </div>
        </Section>

        <Section title="Get Transfers by Account" method="GET" path="/fund-transfers?accountId=...">
          <div className="flex gap-3 items-end">
            <Input label="Account ID" value={accountId} onChange={setAccountId} />
            <ActionButton onClick={() => apiCall('GET', `${getBase('fundTransfers')}/fund-transfers?accountId=${accountId}`)}>Fetch</ActionButton>
          </div>
        </Section>
      </div>
    </div>
  )
}

/* ==================== TRANSACTIONS PANEL ==================== */
function TransactionsPanel({ apiCall, getBase }: {
  apiCall: (method: string, url: string, body?: unknown) => Promise<{ ok: boolean; status: number; data: unknown }>
  getBase: (service: keyof typeof DIRECT_API) => string
}) {
  const [txnForm, setTxnForm] = useState({ accountId: '', transactionType: 'DEPOSIT', amount: '', description: '' })
  const [accountId, setAccountId] = useState('')
  const [refId, setRefId] = useState('')

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Transaction Service</h2>
      <p className="text-sm text-gray-500 mb-6">Port 8084 — Deposits, withdrawals, and transaction history.</p>
      <div className="space-y-6">
        <Section title="Add Transaction (Deposit/Withdrawal)" method="POST" path="/transactions">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Account ID" value={txnForm.accountId} onChange={v => setTxnForm(p => ({ ...p, accountId: v }))} />
            <SelectField label="Type" value={txnForm.transactionType} onChange={v => setTxnForm(p => ({ ...p, transactionType: v }))}
              options={[{ value: 'DEPOSIT', label: 'DEPOSIT' }, { value: 'WITHDRAWAL', label: 'WITHDRAWAL' }]} />
            <Input label="Amount" value={txnForm.amount} onChange={v => setTxnForm(p => ({ ...p, amount: v }))} type="number" />
            <Input label="Description" value={txnForm.description} onChange={v => setTxnForm(p => ({ ...p, description: v }))} />
          </div>
          <ActionButton onClick={() => apiCall('POST', `${getBase('transactions')}/transactions`, { accountId: txnForm.accountId, transactionType: txnForm.transactionType, amount: Number(txnForm.amount), description: txnForm.description })}>Submit Transaction</ActionButton>
        </Section>

        <Section title="Get Transactions by Account" method="GET" path="/transactions?accountId=...">
          <div className="flex gap-3 items-end">
            <Input label="Account ID" value={accountId} onChange={setAccountId} />
            <ActionButton onClick={() => apiCall('GET', `${getBase('transactions')}/transactions?accountId=${accountId}`)}>Fetch</ActionButton>
          </div>
        </Section>

        <Section title="Get Transaction by Reference" method="GET" path="/transactions/{referenceId}">
          <div className="flex gap-3 items-end">
            <Input label="Reference ID" value={refId} onChange={setRefId} />
            <ActionButton onClick={() => apiCall('GET', `${getBase('transactions')}/transactions/${refId}`)}>Fetch</ActionButton>
          </div>
        </Section>
      </div>
    </div>
  )
}

export default App
