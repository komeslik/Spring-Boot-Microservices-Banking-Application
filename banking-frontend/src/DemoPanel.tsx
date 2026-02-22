import { useState, useCallback, useEffect } from 'react'
import { Users, ArrowRightLeft, RefreshCw, UserCircle, DollarSign, Activity, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import featureFlags from './featureFlags'

/* ── Proxy base URLs (same as App.tsx) ── */
const API = {
  users: '/proxy/users',
  accounts: '/proxy/accounts',
  fundTransfers: '/proxy/fund-transfers',
  transactions: '/proxy/transactions',
  sequence: '/proxy/sequence',
}

const ACC_PREFIX = '060014'

/* ── Types ── */
interface DemoUser {
  userId: number
  name: string
  email: string
  accountNumber: string
  accountId: number
}

interface AccountInfo {
  accountId: number
  accountNumber: string
  accountType: string
  accountStatus: string
  availableBalance: number
  userId: number
}

interface TransactionEntry {
  referenceId: string
  accountId: string
  transactionType: string
  amount: number
  localDateTime: string
  transactionStatus: string
  comments: string
}

type SetupStep = {
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  detail?: string
}

/* ── Helper: raw fetch with JSON ── */
async function api(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { ok: res.ok, status: res.status, data }
}

/* ================================================================
   DemoPanel – the main exported component
   ================================================================ */
export default function DemoPanel() {
  /* ── state ── */
  const [alice, setAlice] = useState<DemoUser | null>(null)
  const [bob, setBob] = useState<DemoUser | null>(null)
  const [activeUser, setActiveUser] = useState<'alice' | 'bob'>('alice')
  const [setupDone, setSetupDone] = useState(false)
  const [setupRunning, setSetupRunning] = useState(false)
  const [steps, setSteps] = useState<SetupStep[]>([])

  const [aliceAccount, setAliceAccount] = useState<AccountInfo | null>(null)
  const [bobAccount, setBobAccount] = useState<AccountInfo | null>(null)
  const [aliceTxns, setAliceTxns] = useState<TransactionEntry[]>([])
  const [bobTxns, setBobTxns] = useState<TransactionEntry[]>([])

  const [sendAmount, setSendAmount] = useState('50')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const currentUser = activeUser === 'alice' ? alice : bob
  const friendUser = activeUser === 'alice' ? bob : alice
  const currentAccount = activeUser === 'alice' ? aliceAccount : bobAccount
  const currentTxns = activeUser === 'alice' ? aliceTxns : bobTxns

  /* ── refresh account data ── */
  const refreshData = useCallback(async (a: DemoUser | null, b: DemoUser | null) => {
    if (a) {
      const accRes = await api('GET', `${API.accounts}/accounts/${a.userId}`)
      if (accRes.ok) setAliceAccount(accRes.data as AccountInfo)
      const txnRes = await api('GET', `${API.transactions}/transactions?accountId=${a.accountNumber}`)
      if (txnRes.ok && Array.isArray(txnRes.data)) setAliceTxns(txnRes.data as TransactionEntry[])
    }
    if (b) {
      const accRes = await api('GET', `${API.accounts}/accounts/${b.userId}`)
      if (accRes.ok) setBobAccount(accRes.data as AccountInfo)
      const txnRes = await api('GET', `${API.transactions}/transactions?accountId=${b.accountNumber}`)
      if (txnRes.ok && Array.isArray(txnRes.data)) setBobTxns(txnRes.data as TransactionEntry[])
    }
  }, [])

  /* ── helper: find account number for a userId by scanning sequence numbers ── */
  const findAccountNumber = async (userId: number): Promise<AccountInfo | null> => {
    // Get current sequence ceiling by calling POST /sequence
    const seqRes = await api('POST', `${API.sequence}/sequence`)
    const ceiling = (seqRes.data as { accountNumber: number }).accountNumber
    // Scan backwards from ceiling to find the account belonging to this userId
    for (let n = ceiling; n >= 1; n--) {
      const accNum = ACC_PREFIX + String(n).padStart(7, '0')
      const res = await api('GET', `${API.accounts}/accounts?accountNumber=${accNum}`)
      if (res.ok) {
        const acc = res.data as AccountInfo
        if (acc.userId === userId) return acc
      }
    }
    return null
  }

  /* ── seed function ── */
  const runSetup = async () => {
    setSetupRunning(true)
    setSendResult(null)
    const s: SetupStep[] = [
      { label: 'Register Alice', status: 'pending' },
      { label: 'Register Bob', status: 'pending' },
      { label: 'Update Alice\'s profile', status: 'pending' },
      { label: 'Update Bob\'s profile', status: 'pending' },
      { label: 'Approve Alice', status: 'pending' },
      { label: 'Approve Bob', status: 'pending' },
      { label: 'Create Alice\'s account', status: 'pending' },
      { label: 'Create Bob\'s account', status: 'pending' },
      { label: 'Deposit $1,000 to Alice', status: 'pending' },
      { label: 'Deposit $1,000 to Bob', status: 'pending' },
      { label: 'Activate Alice\'s account', status: 'pending' },
      { label: 'Activate Bob\'s account', status: 'pending' },
    ]
    setSteps([...s])

    const update = (idx: number, status: SetupStep['status'], detail?: string) => {
      s[idx] = { ...s[idx], status, detail }
      setSteps([...s])
    }

    try {
      // 1) Register Alice
      update(0, 'running')
      const aliceReg = await api('POST', `${API.users}/api/users/register`, {
        firstName: 'Alice', lastName: 'Johnson', emailId: `alice-${Date.now()}@demo.bank`,
        password: 'Demo1234!', contactNumber: '5551001001',
      })
      if (!aliceReg.ok) { update(0, 'error', JSON.stringify(aliceReg.data)); throw new Error('Alice registration failed') }
      update(0, 'done')

      // 2) Register Bob
      update(1, 'running')
      const bobReg = await api('POST', `${API.users}/api/users/register`, {
        firstName: 'Bob', lastName: 'Smith', emailId: `bob-${Date.now()}@demo.bank`,
        password: 'Demo1234!', contactNumber: '5551002002',
      })
      if (!bobReg.ok) { update(1, 'error', JSON.stringify(bobReg.data)); throw new Error('Bob registration failed') }
      update(1, 'done')

      // Fetch user list to get IDs
      const usersRes = await api('GET', `${API.users}/api/users`)
      const allUsers = (usersRes.data as Array<{ userId: number; userProfileDto: { firstName: string }; emailId: string }>)
      const aliceUser = allUsers[allUsers.length - 2] // second to last
      const bobUser = allUsers[allUsers.length - 1]   // last

      // 3) Update Alice's profile (all fields required before status change)
      update(2, 'running')
      const updAlice = await api('PUT', `${API.users}/api/users/${aliceUser.userId}`, {
        firstName: 'Alice', lastName: 'Johnson', contactNo: '5551001001',
        address: '123 Main St', gender: 'Female', occupation: 'Engineer',
        martialStatus: 'Single', nationality: 'US',
      })
      if (!updAlice.ok) { update(2, 'error', JSON.stringify(updAlice.data)); throw new Error('Alice profile update failed') }
      update(2, 'done')

      // 4) Update Bob's profile
      update(3, 'running')
      const updBob = await api('PUT', `${API.users}/api/users/${bobUser.userId}`, {
        firstName: 'Bob', lastName: 'Smith', contactNo: '5551002002',
        address: '456 Oak Ave', gender: 'Male', occupation: 'Designer',
        martialStatus: 'Single', nationality: 'US',
      })
      if (!updBob.ok) { update(3, 'error', JSON.stringify(updBob.data)); throw new Error('Bob profile update failed') }
      update(3, 'done')

      // 5) Approve Alice
      update(4, 'running')
      const actAlice = await api('PATCH', `${API.users}/api/users/${aliceUser.userId}`, { status: 'APPROVED' })
      if (!actAlice.ok) { update(4, 'error', JSON.stringify(actAlice.data)); throw new Error('Alice approval failed') }
      update(4, 'done')

      // 6) Approve Bob
      update(5, 'running')
      const actBob = await api('PATCH', `${API.users}/api/users/${bobUser.userId}`, { status: 'APPROVED' })
      if (!actBob.ok) { update(5, 'error', JSON.stringify(actBob.data)); throw new Error('Bob approval failed') }
      update(5, 'done')

      // 7) Create Alice's account
      update(6, 'running')
      const aliceAccCreate = await api('POST', `${API.accounts}/accounts`, {
        userId: aliceUser.userId, accountType: 'SAVINGS_ACCOUNT',
      })
      if (!aliceAccCreate.ok) { update(6, 'error', JSON.stringify(aliceAccCreate.data)); throw new Error('Alice account creation failed') }
      update(6, 'done')

      // 8) Create Bob's account
      update(7, 'running')
      const bobAccCreate = await api('POST', `${API.accounts}/accounts`, {
        userId: bobUser.userId, accountType: 'SAVINGS_ACCOUNT',
      })
      if (!bobAccCreate.ok) { update(7, 'error', JSON.stringify(bobAccCreate.data)); throw new Error('Bob account creation failed') }
      update(7, 'done')

      // Find account numbers by scanning (readAccountByAccountNumber works for PENDING accounts)
      const aliceAccData = await findAccountNumber(aliceUser.userId)
      if (!aliceAccData) throw new Error('Could not find Alice\'s account number')
      const bobAccData = await findAccountNumber(bobUser.userId)
      if (!bobAccData) throw new Error('Could not find Bob\'s account number')

      // 9) Deposit $1000 to Alice FIRST (before activation — activation requires balance >= 1000)
      update(8, 'running')
      const depAlice = await api('POST', `${API.transactions}/transactions`, {
        accountId: aliceAccData.accountNumber, transactionType: 'DEPOSIT', amount: 1000, description: 'Initial deposit',
      })
      if (!depAlice.ok) { update(8, 'error', JSON.stringify(depAlice.data)); throw new Error('Alice deposit failed') }
      update(8, 'done')

      // 10) Deposit $1000 to Bob
      update(9, 'running')
      const depBob = await api('POST', `${API.transactions}/transactions`, {
        accountId: bobAccData.accountNumber, transactionType: 'DEPOSIT', amount: 1000, description: 'Initial deposit',
      })
      if (!depBob.ok) { update(9, 'error', JSON.stringify(depBob.data)); throw new Error('Bob deposit failed') }
      update(9, 'done')

      // 11) Activate Alice's account (now balance >= 1000)
      update(10, 'running')
      const actAliceAcc = await api('PATCH', `${API.accounts}/accounts?accountNumber=${aliceAccData.accountNumber}`, { accountStatus: 'ACTIVE' })
      if (!actAliceAcc.ok) { update(10, 'error', JSON.stringify(actAliceAcc.data)); throw new Error('Alice account activation failed') }
      update(10, 'done')

      // 12) Activate Bob's account
      update(11, 'running')
      const actBobAcc = await api('PATCH', `${API.accounts}/accounts?accountNumber=${bobAccData.accountNumber}`, { accountStatus: 'ACTIVE' })
      if (!actBobAcc.ok) { update(11, 'error', JSON.stringify(actBobAcc.data)); throw new Error('Bob account activation failed') }
      update(11, 'done')

      // Build user objects
      const aliceObj: DemoUser = {
        userId: aliceUser.userId,
        name: 'Alice Johnson',
        email: aliceUser.emailId,
        accountNumber: aliceAccData.accountNumber,
        accountId: aliceAccData.accountId,
      }
      const bobObj: DemoUser = {
        userId: bobUser.userId,
        name: 'Bob Smith',
        email: bobUser.emailId,
        accountNumber: bobAccData.accountNumber,
        accountId: bobAccData.accountId,
      }

      setAlice(aliceObj)
      setBob(bobObj)
      setActiveUser('alice')
      setSetupDone(true)
      await refreshData(aliceObj, bobObj)
    } catch (err) {
      console.error('Setup failed:', err)
    }
    setSetupRunning(false)
  }

  /* ── send money ── */
  const sendMoney = async () => {
    if (!alice || !bob || !sendAmount) return
    setSending(true)
    setSendResult(null)
    const from = activeUser === 'alice' ? alice : bob
    const to = activeUser === 'alice' ? bob : alice
    const res = await api('POST', `${API.fundTransfers}/fund-transfers`, {
      fromAccount: from.accountNumber,
      toAccount: to.accountNumber,
      amount: Number(sendAmount),
    })
    if (res.ok) {
      setSendResult({ ok: true, msg: `Sent $${sendAmount} from ${from.name} to ${to.name}` })
    } else {
      setSendResult({ ok: false, msg: typeof res.data === 'string' ? res.data : JSON.stringify(res.data) })
    }
    setSending(false)
    await refreshData(alice, bob)
  }

  /* ── auto-refresh when switching users ── */
  useEffect(() => {
    if (setupDone && alice && bob) {
      refreshData(alice, bob)
    }
  }, [activeUser, setupDone, alice, bob, refreshData])

  /* ================================================================
     RENDER
     ================================================================ */

  // ── Setup screen ──
  if (!setupDone) {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Interactive Demo</h2>
        <p className="text-sm text-gray-500 mb-6">
          Set up two demo users (Alice & Bob) with funded accounts, then experience a realistic banking app flow.
        </p>

        {steps.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-emerald-600" size={36} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready to set up the demo?</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              This will create two users (Alice & Bob), open savings accounts for each, and deposit initial funds
              ($1,000 each).
            </p>
            <button
              onClick={runSetup}
              disabled={setupRunning}
              className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors text-base"
            >
              Set Up Demo
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50">
                {step.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}
                {step.status === 'running' && <Loader2 size={20} className="text-emerald-600 animate-spin" />}
                {step.status === 'done' && <CheckCircle2 size={20} className="text-emerald-600" />}
                {step.status === 'error' && <AlertCircle size={20} className="text-red-500" />}
                <span className={`text-sm ${step.status === 'error' ? 'text-red-700 font-medium' : step.status === 'done' ? 'text-gray-600' : 'text-gray-800'}`}>
                  {step.label}
                </span>
                {step.detail && <span className="text-xs text-red-500 ml-auto truncate max-w-xs">{step.detail}</span>}
              </div>
            ))}
            {!setupRunning && steps.some(s => s.status === 'error') && (
              <div className="pt-4 text-center">
                <button
                  onClick={runSetup}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Retry Setup
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Main demo view ──
  return (
    <div className="space-y-6">
      {/* Header with user switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg ${activeUser === 'alice' ? 'bg-purple-500' : 'bg-blue-500'}`}>
            {activeUser === 'alice' ? 'A' : 'B'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{currentUser?.name}'s Dashboard</h2>
            <p className="text-xs text-gray-500">{currentUser?.email}</p>
          </div>
        </div>
        <button
          onClick={() => setActiveUser(activeUser === 'alice' ? 'bob' : 'alice')}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          <ArrowRightLeft size={16} />
          Switch to {activeUser === 'alice' ? "Bob's" : "Alice's"} Account
        </button>
      </div>

      {/* Account Balance Card */}
      <div className={`rounded-xl p-6 text-white ${activeUser === 'alice' ? 'bg-gradient-to-r from-purple-600 to-purple-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Savings Account</p>
            <p className="text-xs opacity-60 font-mono mt-0.5">#{currentAccount?.accountNumber}</p>
          </div>
          <button
            onClick={() => refreshData(alice, bob)}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="mt-4">
          <p className="text-sm opacity-80">Available Balance</p>
          <p className="text-4xl font-bold mt-1">
            ${currentAccount?.availableBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs opacity-70">
          <span className={`inline-block w-2 h-2 rounded-full ${currentAccount?.accountStatus === 'ACTIVE' ? 'bg-green-300' : 'bg-yellow-300'}`} />
          {currentAccount?.accountStatus ?? 'UNKNOWN'}
        </div>
      </div>

      {/* Two-column: Activity + Friends/Send */}
      <div className="grid grid-cols-5 gap-6">
        {/* Recent Activity (3 cols) */}
        <div className="col-span-3 bg-gray-50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-gray-500" />
            <h3 className="font-semibold text-gray-800">Recent Activity</h3>
          </div>
          {currentTxns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No transactions yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {currentTxns.slice().reverse().map((txn, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-100">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const isPositive = (txn.amount ?? 0) >= 0
                      return (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          <DollarSign size={16} />
                        </div>
                      )
                    })()}
                    <div>
                      <p className="text-sm font-medium text-gray-800">{txn.transactionType}</p>
                      <p className="text-xs text-gray-500">{txn.comments || txn.referenceId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${(txn.amount ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(txn.amount ?? 0) >= 0 ? '+' : '-'}${Math.abs(txn.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {txn.localDateTime ? new Date(txn.localDateTime).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friends + Send Money (2 cols) */}
        <div className="col-span-2 space-y-5">
          {/* Friends List */}
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserCircle size={18} className="text-gray-500" />
              <h3 className="font-semibold text-gray-800">Friends</h3>
            </div>
            {friendUser && (
              <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 border border-gray-100">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${activeUser === 'alice' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                  {friendUser.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{friendUser.name}</p>
                  <p className="text-xs text-gray-500 font-mono">Account #{friendUser.accountNumber}</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            )}
          </div>

          {/* Send Money */}
          {featureFlags.ENABLE_SEND_MONEY ? (
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft size={18} className="text-gray-500" />
              <h3 className="font-semibold text-gray-800">Send Money</h3>
            </div>

            <div className="space-y-3">
              {/* Recipient (fixed to friend) */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Recipient</label>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${activeUser === 'alice' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                    {friendUser?.name.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-800">{friendUser?.name}</span>
                  <span className="text-xs text-gray-400 ml-auto font-mono">#{friendUser?.accountNumber}</span>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={e => setSendAmount(e.target.value)}
                  min="1"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="Enter amount"
                />
              </div>

              <button
                onClick={sendMoney}
                disabled={sending || !sendAmount || Number(sendAmount) <= 0}
                className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                {sending ? 'Sending...' : `Send $${sendAmount || '0'} to ${friendUser?.name}`}
              </button>

              {sendResult && (
                <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${sendResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {sendResult.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                  <span>{sendResult.msg}</span>
                </div>
              )}
            </div>
          </div>
          ) : (
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft size={18} className="text-gray-400" />
              <h3 className="font-semibold text-gray-400">Send Money</h3>
            </div>
            <p className="text-sm text-gray-400 text-center py-4">Send Money is currently disabled by feature flag.</p>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
