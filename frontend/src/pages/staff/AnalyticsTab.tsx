import { useState, useEffect, useMemo } from 'react'
import { analyticsApi, AgentPayroll, LeaderboardEntry } from '../../api/client'
import { Loader2, TrendingUp, Trophy, Users, AlertCircle, Search, Filter, LayoutList, Globe, FileDown } from 'lucide-react'
import ProfileModal from '../../components/ProfileModal'

// Constants
const BARS = ['MANDARIN', 'SHARK', 'RED DRAGON']
const YEARS = [2025, 2026]
const MONTHS = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
]

export default function AnalyticsTab() {
    const [activeTab, setActiveTab] = useState<'payroll' | 'leaderboard'>('leaderboard')

    // Global Filters
    const [selectedYear, setSelectedYear] = useState<number | null>(null)
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
    const [selectedBar, setSelectedBar] = useState<string>('') // '' = All

    // Reset month to "All" when year changes to "All Years"
    useEffect(() => {
        if (!selectedYear) setSelectedMonth(null)
    }, [selectedYear])

    const filterContext = `${selectedBar || 'All Bars'} · ${selectedYear || 'All Years'}${selectedMonth ? ' · ' + MONTHS[selectedMonth - 1].label : ''}`

    return (
        <div className="flex flex-col h-full bg-dark-900 text-white min-h-[calc(100vh-140px)]">
            {/* Header / Filter Bar */}
            <div className="p-4 border-b border-dark-700 bg-dark-800 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">

                {/* Tab Switcher */}
                <div className="flex bg-dark-900 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('payroll')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'payroll'
                                ? 'bg-primary-600 text-white shadow-lg'
                                : 'text-dark-400 hover:text-white'
                            }`}
                    >
                        <TrendingUp size={16} />
                        Agent Payroll
                    </button>
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'leaderboard'
                                ? 'bg-primary-600 text-white shadow-lg'
                                : 'text-dark-400 hover:text-white'
                            }`}
                    >
                        <Trophy size={16} />
                        Leaderboards
                    </button>
                </div>

                {/* Common Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Bar Selector */}
                    <div className="relative">
                        <select
                            value={selectedBar}
                            onChange={(e) => setSelectedBar(e.target.value)}
                            className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none pr-8 cursor-pointer"
                        >
                            <option value="">All Bars</option>
                            {BARS.map(bar => <option key={bar} value={bar}>{bar}</option>)}
                        </select>
                        <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
                    </div>

                    {/* Year Selector */}
                    <select
                        value={selectedYear ?? ''}
                        onChange={(e) => setSelectedYear(e.target.value === '' ? null : Number(e.target.value))}
                        className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
                    >
                        <option value="">All Years</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    {/* Month Selector - disabled when "All Years" */}
                    <select
                        value={selectedMonth ?? ''}
                        onChange={(e) => setSelectedMonth(e.target.value === '' ? null : Number(e.target.value))}
                        disabled={!selectedYear}
                        className={`border rounded-lg px-3 py-2 text-sm outline-none ${
                            !selectedYear
                                ? 'bg-dark-700 border-dark-700 text-dark-500 cursor-not-allowed'
                                : 'bg-dark-900 border-dark-600 focus:ring-2 focus:ring-primary-500 cursor-pointer'
                        }`}
                    >
                        <option value="">All Months</option>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 overflow-y-auto">
                {activeTab === 'payroll' ? (
                    <PayrollView
                        year={selectedYear}
                        month={selectedMonth}
                        bar={selectedBar}
                    />
                ) : (
                    <LeaderboardView
                        year={selectedYear}
                        month={selectedMonth}
                        bar={selectedBar}
                        filterContext={filterContext}
                    />
                )}
            </div>
        </div>
    )
}

function PayrollView({ year, month, bar }: { year: number | null, month: number | null, bar: string }) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<AgentPayroll[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchPayroll = async () => {
            setLoading(true)
            try {
                const actualYear = year ?? new Date().getFullYear()
                const start = month
                    ? new Date(actualYear, month - 1, 1)
                    : new Date(actualYear, 0, 1)
                const end = month
                    ? new Date(actualYear, month, 0)
                    : new Date(actualYear, 11, 31)

                const fmt = (d: Date) => d.toISOString().split('T')[0]

                const resp = await analyticsApi.getPayroll(fmt(start), fmt(end), bar || undefined)
                if (resp) {
                    setData(resp.agents)
                }
                setError(null)
            } catch (err: any) {
                console.error("Payroll fetch error:", err)
                setError(err.message || "Failed to load payroll data")
            } finally {
                setLoading(false)
            }
        }
        fetchPayroll()
    }, [year, month, bar])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-dark-400">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>Calculating bonuses & pools...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
                <AlertCircle className="mb-4" size={32} />
                <p>{error}</p>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-dark-400">
                <p>No payroll data found for this period.</p>
            </div>
        )
    }

    // Sort by Total Estimate descending
    const sortedData = [...data].sort((a, b) => b.total_estimate - a.total_estimate)

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val)

    return (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedData.map((agent) => {
                // Normalize progress bar 0-100% relative to 40
                const progressPercent = Math.min(100, (agent.avg_daily_staff / 40) * 100)

                return (
                    <div key={agent.agent_id} className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden shadow-lg hover:border-primary-500/50 transition-colors">
                        {/* Card Header */}
                        <div className="p-4 bg-dark-900 border-b border-dark-700 flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-lg text-white">{agent.agent_name}</h3>
                                <div className="text-xs text-dark-400 flex items-center gap-1">
                                    <Users size={12} /> Pool: <span className="text-primary-400">{agent.pool_active}</span> Active / {agent.pool_total} Total
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-dark-500 uppercase tracking-wider">Est. Pay</div>
                                <div className="text-xl font-bold text-green-400">{formatCurrency(agent.total_estimate)}</div>
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-4">
                            {/* Bonus A */}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-dark-300">Bonus A (Volume)</span>
                                <span className="font-mono font-medium">{formatCurrency(agent.bonus_a_total)}</span>
                            </div>

                            {/* Bonus B */}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-dark-300">Bonus B (Quality)</span>
                                <span className="font-mono font-medium">{formatCurrency(agent.bonus_b_total)}</span>
                            </div>

                            <div className="h-px bg-dark-700 my-2" />

                            {/* Bonus C */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-white">Bonus C (Consistency)</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${agent.current_tier > 0 ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'}`}>
                                        Tier: {agent.current_tier > 0 ? formatCurrency(agent.current_tier) : 'None'}
                                    </span>
                                </div>

                                <div className="text-xs text-dark-400 mb-2">
                                    Current Avg: <strong className="text-white">{agent.avg_daily_staff}</strong> / {agent.next_tier_target || 'Max'}
                                    <span className="mx-1">•</span>
                                    {agent.days_counted} days data, {agent.days_remaining} left
                                </div>

                                {/* Progress Bar */}
                                <div className="h-2 bg-dark-700 rounded-full overflow-hidden relative">
                                    <div
                                        className="absolute top-0 left-[50%] h-full w-px bg-dark-900/50" title="20" />
                                    <div className="absolute top-0 left-[75%] h-full w-px bg-dark-900/50" title="30" />
                                    <div
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                    {/* Markers for 20, 30, 40 */}
                                </div>
                                <div className="flex justify-between text-[10px] text-dark-500 mt-1 px-1">
                                    <span>0</span>
                                    <span>20</span>
                                    <span>30</span>
                                    <span>40+</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function LeaderboardView({ year, month, bar, filterContext }: { year: number | null, month: number | null, bar: string, filterContext: string }) {
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<LeaderboardEntry[]>([])

    // Local Filters
    const [type, setType] = useState<'STAFF' | 'AGENT'>('STAFF')
    const [mode, setMode] = useState<'TOP10' | 'FLOP10' | 'ALL'>('ALL')
    const [sortBy, setSortBy] = useState<'PROFIT' | 'DRINKS' | 'DAYS'>('PROFIT')
    const [search, setSearch] = useState('')
    const [viewMode, setViewMode] = useState<'GLOBAL' | 'BY_AGENT'>('BY_AGENT')

    // Profile Modal state
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
    const [selectedStaffRank, setSelectedStaffRank] = useState<number | undefined>()

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true)
            try {
                const resp = await analyticsApi.getLeaderboard(
                    type,
                    mode,
                    sortBy,
                    search || undefined,
                    bar || undefined,
                    year ?? undefined,
                    month ?? undefined
                )
                if (resp) setRows(resp.entries)
            } catch (err) {
                console.error("Leaderboard fetch error", err)
            } finally {
                setLoading(false)
            }
        }

        // Debounce search
        const timeoutId = setTimeout(fetchLeaderboard, 300)
        return () => clearTimeout(timeoutId)

    }, [year, month, bar, type, mode, sortBy, search, viewMode])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val)

    const handleOpenProfile = (row: LeaderboardEntry) => {
        if (type !== 'STAFF') return
        setSelectedStaffId(row.name)
        setSelectedStaffRank(row.rank)
    }

    // PDF-safe currency formatter (THB prefix instead of ฿ which breaks in PDF fonts)
    const formatTHB = (val: number) => `THB ${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`

    // PDF Export (lazy-loaded to reduce bundle size)
    const exportToPDF = async () => {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

        // Title
        doc.setFontSize(18)
        const title = viewMode === 'BY_AGENT'
            ? 'Staff Performance by Agent'
            : 'Staff Performance Leaderboard'
        doc.text(title, 14, 20)

        // Filters
        doc.setFontSize(10)
        doc.text(filterContext, 14, 28)
        doc.text(`Exported: ${new Date().toLocaleDateString('en-GB')} | ${rows.length} entries`, 14, 34)

        let yOffset = 40

        if (viewMode === 'BY_AGENT' && groupedData && type === 'STAFF') {
            // GROUPED VIEW: Export each agent separately
            groupedData.forEach((group, index) => {
                // Agent header
                doc.setFontSize(12)
                doc.text(`${group.agent} (${group.bar}) - Staff: ${group.count}, Profit: ${formatTHB(group.totalProfit)}`, 14, yOffset)
                yOffset += 5

                // Staff table for this agent
                const tableData = group.rows.map((row, idx) => [
                    idx + 1,
                    row.name,
                    formatTHB(row.profit),
                    row.drinks,
                    formatTHB(row.bonus),
                    row.days
                ])

                autoTable(doc, {
                    head: [['#', 'Name', 'Profit', 'Drinks', 'Bonus', 'Days']],
                    body: tableData,
                    startY: yOffset,
                    styles: { fontSize: 7 },
                    headStyles: { fillColor: [51, 65, 85] },
                    margin: { left: 14 }
                })

                yOffset = (doc as any).lastAutoTable.finalY + 10

                // New page if needed
                if (yOffset > 270 && index < groupedData.length - 1) {
                    doc.addPage()
                    yOffset = 20
                }
            })
        } else {
            // GLOBAL VIEW: Single table
            const tableData = rows.map((row) => [
                row.rank,
                row.name,
                row.bar || '-',
                formatTHB(row.profit),
                row.drinks,
                formatTHB(row.bonus),
                row.days,
                `${formatTHB(row.rentability)}/day`
            ])

            autoTable(doc, {
                head: [['Rank', 'Name', 'Bar', 'Profit', 'Drinks', 'Bonus', 'Days', 'Rentability']],
                body: tableData,
                startY: yOffset,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [51, 65, 85] },
                alternateRowStyles: { fillColor: [241, 245, 249] }
            })
        }

        const safeContext = filterContext.replace(/[^a-zA-Z0-9·-]/g, '_').replace(/_+/g, '_')
        doc.save(`leaderboard-${safeContext}-${new Date().toISOString().split('T')[0]}.pdf`)
    }

    // Grouping Logic
    const groupedData = useMemo(() => {
        if (viewMode === 'GLOBAL') return null

        const groups: Record<string, { bar: string, agent: string, rows: LeaderboardEntry[], totalProfit: number, count: number }> = {}

        rows.forEach(row => {
            const agentKey = row.agent_id ? `${row.bar}|${row.agent_id}` : `Other|${row.bar}`
            if (!groups[agentKey]) {
                groups[agentKey] = {
                    bar: row.bar || 'Unknown',
                    agent: row.agent_id ? `Agent ${row.agent_id}` : 'House / Unassigned',
                    rows: [],
                    totalProfit: 0,
                    count: 0
                }
            }
            groups[agentKey].rows.push(row)
            groups[agentKey].totalProfit += row.profit
            groups[agentKey].count += 1
        })

        // Sort groups by Bar then Agent ID
        return Object.values(groups).sort((a, b) => a.bar.localeCompare(b.bar) || a.agent.localeCompare(b.agent))
    }, [rows, viewMode])

    const renderMedal = (rank: number, isMobile = false) => {
        const size = isMobile ? 'text-xl' : 'text-2xl md:text-3xl'
        if (rank === 1) return <span className={size}>🥇</span>
        if (rank === 2) return <span className={size}>🥈</span>
        if (rank === 3) return <span className={size}>🥉</span>
        return <span className="text-slate-400 text-lg">#{rank}</span>
    }

    // Desktop table
    const renderTable = (data: LeaderboardEntry[]) => (
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-dark-900 text-dark-400 text-xs uppercase tracking-wider">
                    <th className="p-4 w-16 text-center">Rank</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Bar</th>
                    <th
                        className="p-4 text-right cursor-pointer hover:text-white transition-colors"
                        onClick={() => setSortBy('PROFIT')}
                    >
                        Total Profit {sortBy === 'PROFIT' && '↓'}
                    </th>
                    <th
                        className="p-4 text-right cursor-pointer hover:text-white transition-colors"
                        onClick={() => setSortBy('DRINKS')}
                    >
                        Total Drinks {sortBy === 'DRINKS' && '↓'}
                    </th>
                    {/* CRITICAL: BONUS column must NEVER be removed - core metric */}
                    <th className="p-4 text-right">Total Bonus</th>
                    <th
                        className="p-4 text-right cursor-pointer hover:text-white transition-colors"
                        onClick={() => setSortBy('DAYS')}
                    >
                        Days Worked {sortBy === 'DAYS' && '↓'}
                    </th>
                    <th className="p-4 text-right">Rentability</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
                {data.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="p-8 text-center text-dark-500">
                            No results found.
                        </td>
                    </tr>
                ) : (
                    data.map((row) => (
                        <tr key={`${row.id}-${row.rank}`} className="hover:bg-dark-700/50 transition-colors">
                            <td className="p-4 text-center">{renderMedal(row.rank)}</td>
                            <td className="p-4 font-medium">
                                {type === 'STAFF' ? (
                                    <button
                                        onClick={() => handleOpenProfile(row)}
                                        className="text-blue-400 hover:text-blue-300 hover:underline font-medium text-left"
                                    >
                                        {row.name}
                                    </button>
                                ) : (
                                    <span className="text-white">{row.name}</span>
                                )}
                            </td>
                            <td className="p-4 text-dark-300">{row.bar || '-'}</td>
                            <td className={`p-4 text-right font-bold ${row.profit >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                {formatCurrency(row.profit)}
                            </td>
                            <td className="p-4 text-right font-mono text-purple-300">{row.drinks}</td>
                            {/* CRITICAL: BONUS cell must NEVER be removed */}
                            <td className={`p-4 text-right font-semibold ${row.bonus >= 0 ? 'text-purple-400' : 'text-red-500'}`}>
                                {formatCurrency(row.bonus)}
                            </td>
                            <td className="p-4 text-right text-dark-300">{row.days}</td>
                            <td className={`p-4 text-right text-xs ${row.rentability >= 0 ? 'text-dark-400' : 'text-red-500'}`}>
                                {formatCurrency(row.rentability)}/day
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    )

    // Mobile cards
    const renderMobileCards = (data: LeaderboardEntry[]) => (
        <div className="space-y-3">
            {data.length === 0 ? (
                <div className="p-8 text-center text-dark-500 bg-dark-800 rounded-xl border border-dark-700">
                    No results found.
                </div>
            ) : (
                data.map((row) => (
                    <div key={`${row.id}-${row.rank}-mobile`} className="bg-dark-800 rounded-lg p-4 border border-dark-700">
                        {/* Rank + Name */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                {renderMedal(row.rank, true)}
                                {type === 'STAFF' ? (
                                    <button
                                        onClick={() => handleOpenProfile(row)}
                                        className="text-lg font-bold text-blue-400 text-left"
                                    >
                                        {row.name}
                                    </button>
                                ) : (
                                    <span className="text-lg font-bold text-white">{row.name}</span>
                                )}
                            </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <div className="text-dark-400 text-xs">Bar</div>
                                <div className="font-semibold text-white">{row.bar || '-'}</div>
                            </div>
                            <div>
                                <div className="text-dark-400 text-xs">Days</div>
                                <div className="font-semibold text-white">{row.days}</div>
                            </div>
                            <div>
                                <div className="text-dark-400 text-xs">Profit</div>
                                <div className={`font-semibold ${row.profit >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                    {formatCurrency(row.profit)}
                                </div>
                            </div>
                            <div>
                                <div className="text-dark-400 text-xs">Drinks</div>
                                <div className="font-semibold text-blue-400">{row.drinks}</div>
                            </div>
                            {/* CRITICAL: BONUS must NEVER be removed */}
                            <div>
                                <div className="text-dark-400 text-xs">Bonus</div>
                                <div className={`font-semibold ${row.bonus >= 0 ? 'text-purple-400' : 'text-red-500'}`}>
                                    {formatCurrency(row.bonus)}
                                </div>
                            </div>
                            <div>
                                <div className="text-dark-400 text-xs">Rentability</div>
                                <div className={`font-semibold ${row.rentability >= 0 ? 'text-dark-300' : 'text-red-500'}`}>
                                    {formatCurrency(row.rentability)}/day
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    )

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 bg-dark-800 p-4 rounded-xl border border-dark-700 items-center">

                {/* View Mode Toggle (Only for Staff) */}
                {type === 'STAFF' && (
                    <div className="flex bg-dark-900 rounded-lg p-1 h-10 border border-dark-600">
                        <button
                            onClick={() => setViewMode('GLOBAL')}
                            className={`px-3 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'GLOBAL' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}
                        >
                            <Globe size={14} /> Global
                        </button>
                        <button
                            onClick={() => { setViewMode('BY_AGENT'); setMode('ALL'); }}
                            className={`px-3 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'BY_AGENT' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}
                        >
                            <LayoutList size={14} /> By Agent
                        </button>
                    </div>
                )}

                {/* Type Toggle */}
                <div className="flex bg-dark-900 rounded-lg p-1 h-10">
                    <button
                        onClick={() => setType('STAFF')}
                        className={`px-4 rounded-md text-sm font-medium transition-all ${type === 'STAFF' ? 'bg-indigo-600 text-white' : 'text-dark-400 hover:text-white'}`}
                    >
                        Staff
                    </button>
                    <button
                        onClick={() => { setType('AGENT'); setViewMode('GLOBAL'); }} // Force global for agents
                        className={`px-4 rounded-md text-sm font-medium transition-all ${type === 'AGENT' ? 'bg-indigo-600 text-white' : 'text-dark-400 hover:text-white'}`}
                    >
                        Agents
                    </button>
                </div>

                {/* Mode Toggle - hidden in BY_AGENT view (forced to ALL) */}
                {viewMode !== 'BY_AGENT' && (
                    <div className="flex bg-dark-900 rounded-lg p-1 h-10">
                        <button
                            onClick={() => setMode('TOP10')}
                            className={`px-3 rounded-md text-sm font-medium transition-all ${mode === 'TOP10' ? 'bg-green-600 text-white' : 'text-dark-400 hover:text-white'}`}
                        >
                            Top 10
                        </button>
                        <button
                            onClick={() => setMode('FLOP10')}
                            className={`px-3 rounded-md text-sm font-medium transition-all ${mode === 'FLOP10' ? 'bg-red-600 text-white' : 'text-dark-400 hover:text-white'}`}
                        >
                            Flop 10
                        </button>
                        <button
                            onClick={() => setMode('ALL')}
                            className={`px-3 rounded-md text-sm font-medium transition-all ${mode === 'ALL' ? 'bg-dark-600 text-white' : 'text-dark-400 hover:text-white'}`}
                        >
                            All
                        </button>
                    </div>
                )}

                {/* Search */}
                <div className="relative flex-1 w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                    <input
                        type="text"
                        placeholder={type === 'STAFF' ? "Search Staff ID..." : "Search Agent..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-600 rounded-lg pl-10 pr-4 h-10 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>

                {/* PDF Export */}
                <button
                    onClick={exportToPDF}
                    disabled={rows.length === 0}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 text-sm font-medium transition-colors h-10 shrink-0"
                >
                    <FileDown size={16} />
                    <span className="hidden md:inline">Export PDF</span>
                </button>
            </div>

            {/* Table or Grouped View */}
            {loading ? (
                <div className="p-12 text-center text-dark-500 bg-dark-800 rounded-xl border border-dark-700">
                    <Loader2 className="animate-spin inline-block mb-2" size={24} />
                    <div>Loading leaderboard...</div>
                </div>
            ) : viewMode === 'BY_AGENT' && type === 'STAFF' && groupedData ? (
                <div className="space-y-6">
                    {groupedData.map((group) => (
                        <div key={`${group.bar}-${group.agent}`} className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                            {/* Group Header */}
                            <div className="bg-dark-900/50 p-3 px-4 border-b border-dark-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-lg text-white">{group.agent}</h3>
                                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-dark-700 text-dark-300">{group.bar}</span>
                                </div>
                                <div className="text-sm text-dark-400 space-x-4">
                                    <span>Staff: <strong className="text-white">{group.count}</strong></span>
                                    <span>Profit: <strong className={group.totalProfit >= 0 ? 'text-green-400' : 'text-red-500'}>{formatCurrency(group.totalProfit)}</strong></span>
                                </div>
                            </div>
                            {/* Group Table (Desktop) */}
                            <div className="hidden md:block overflow-x-auto">
                                {renderTable(group.rows)}
                            </div>
                            {/* Group Cards (Mobile) */}
                            <div className="md:hidden p-3">
                                {renderMobileCards(group.rows)}
                            </div>
                        </div>
                    ))}
                    {groupedData.length === 0 && (
                        <div className="p-12 text-center text-dark-500 bg-dark-800 rounded-xl border border-dark-700">
                            No results found.
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            {renderTable(rows)}
                        </div>
                    </div>
                    {/* Mobile Cards */}
                    <div className="md:hidden">
                        {renderMobileCards(rows)}
                    </div>
                </>
            )}

            {/* Profile Modal */}
            {selectedStaffId && (
                <ProfileModal
                    staffId={selectedStaffId}
                    onClose={() => { setSelectedStaffId(null); setSelectedStaffRank(undefined); }}
                    rank={selectedStaffRank}
                    context={filterContext}
                />
            )}
        </div>
    )
}
