import { useState, useRef, useEffect, useMemo } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { rowsApi, FactRow } from '../../api/client'

export default function DataTableTab() {
    // Filter State
    const [bar, setBar] = useState<string[]>([])
    const [year, setYear] = useState<number[]>([2025, 2026])
    const [month, setMonth] = useState<number[]>([])
    const [agent, setAgent] = useState<string[]>([]) // Changed to string array for BAR|ID keys
    const [search, setSearch] = useState('')
    const [filtersOpen, setFiltersOpen] = useState(false) // Mobile filter collapse

    // Derived filter object for API
    const filters = useMemo(() => ({
        bar: bar.length > 0 ? bar : undefined,
        year: year.length > 0 ? year : undefined,
        month: month.length > 0 ? month : undefined,
        agent: agent.length > 0 ? agent : undefined,
        staff_search: search || undefined,
    }), [bar, year, month, agent, search])

    // Fetch KPIs
    const { data: kpis } = useQuery({
        queryKey: ['rows_kpis', filters],
        queryFn: () => rowsApi.getKpis(filters),
    })

    // Fetch Rows (Infinite Scroll)
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['rows_list', filters],
        queryFn: ({ pageParam }) => rowsApi.list({
            ...filters,
            cursor: pageParam as number,
            limit: 50,
        }),
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (lastPage) => {
            if (!lastPage || lastPage.length < 50) return undefined
            return lastPage[lastPage.length - 1].id
        },
    })

    // Virtualizer setup
    const parentRef = useRef<HTMLDivElement>(null)
    const allRows = data ? data.pages.flatMap((d) => d) : []

    const rowVirtualizer = useVirtualizer({
        count: hasNextPage ? allRows.length + 1 : allRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 115, // Mobile card height (measured at 112px)
        overscan: 20,
    })

    // Load next page on scroll
    useEffect(() => {
        const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse()
        if (!lastItem) return

        if (
            lastItem.index >= allRows.length - 1 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            fetchNextPage()
        }
    }, [
        hasNextPage,
        fetchNextPage,
        allRows.length,
        isFetchingNextPage,
        rowVirtualizer.getVirtualItems(),
    ])

    const formatMoney = (val?: number | null) =>
        val ? `฿${val.toLocaleString()}` : '-'

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        })
    }

    return (
        <div className="p-3 md:p-6 h-[calc(100vh-64px)] flex flex-col overflow-x-hidden">
            <div className="flex items-center justify-between mb-3 md:mb-4">
                <h2 className="text-lg md:text-xl font-semibold text-white">Data Table</h2>
                {/* Mobile Filter Toggle */}
                <button
                    onClick={() => setFiltersOpen(!filtersOpen)}
                    className="md:hidden px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters {filtersOpen ? '▲' : '▼'}
                </button>
            </div>

            {/* Filters */}
            <div className={`flex flex-col md:flex-row md:flex-wrap gap-3 md:gap-4 mb-4 md:mb-6 bg-dark-800 p-3 md:p-4 rounded-xl border border-dark-700 items-start min-h-[320px] max-h-[65vh] overflow-y-auto ${filtersOpen ? 'flex' : 'hidden md:flex'
                }`}>

                {/* Bar Filter */}
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <label className="text-xs text-dark-400 font-medium uppercase">Bar</label>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setBar([])}
                            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${bar.length === 0
                                ? 'bg-primary-600 text-white border-primary-500'
                                : 'bg-dark-700 text-dark-300 border-dark-600 hover:bg-dark-600'
                                }`}
                        >
                            ALL BARS
                        </button>
                        {['MANDARIN', 'SHARK', 'RED DRAGON'].map(b => (
                            <button
                                key={b}
                                onClick={() => setBar(prev =>
                                    prev.includes(b)
                                        ? prev.filter(x => x !== b)
                                        : [...prev, b]
                                )}
                                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${bar.includes(b)
                                    ? 'bg-primary-600/50 text-white border-primary-500'
                                    : 'bg-dark-700 text-dark-300 border-dark-600 hover:bg-dark-600'
                                    }`}
                            >
                                {b}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-8 bg-dark-700 hidden md:block self-center"></div>

                {/* Year Filter */}
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <label className="text-xs text-dark-400 font-medium uppercase">Year</label>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setYear([2025, 2026])}
                            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${year.includes(2025) && year.includes(2026)
                                ? 'bg-primary-600 text-white border-primary-500'
                                : 'bg-dark-700 text-dark-300 border-dark-600 hover:bg-dark-600'
                                }`}
                        >
                            ALL
                        </button>
                        {[2025, 2026].map(y => (
                            <button
                                key={y}
                                onClick={() => {
                                    setYear(prev => {
                                        const isAll = prev.includes(2025) && prev.includes(2026)
                                        if (isAll) return [y]
                                        const newYears = prev.includes(y)
                                            ? prev.filter(v => v !== y)
                                            : [...prev, y]
                                        return newYears.length === 0 ? [2025, 2026] : newYears
                                    })
                                }}
                                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${year.includes(y) && !(year.includes(2025) && year.includes(2026))
                                    ? 'bg-primary-600 text-white border-primary-500'
                                    : 'bg-dark-700 text-dark-300 border-dark-600 hover:bg-dark-600'
                                    }`}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-8 bg-dark-700 hidden md:block self-center"></div>

                {/* Month Filter */}
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <label className="text-xs text-dark-400 font-medium uppercase">Month</label>
                    <div className="flex flex-wrap gap-1 w-full md:max-w-none">
                        <button
                            onClick={() => setMonth([])}
                            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${month.length === 0
                                ? 'bg-primary-600 text-white border-primary-500'
                                : 'bg-dark-700 text-dark-300 border-dark-600 hover:bg-dark-600'
                                }`}
                        >
                            ALL
                        </button>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <button
                                key={m}
                                onClick={() => setMonth(prev =>
                                    prev.includes(m) ? prev.filter(v => v !== m) : [...prev, m]
                                )}
                                className={`w-9 h-8 rounded-lg text-sm font-medium transition-colors border flex items-center justify-center ${month.includes(m)
                                    ? 'bg-primary-600/50 text-white border-primary-500'
                                    : 'bg-dark-700 text-dark-300 border-dark-600 hover:bg-dark-600'
                                    }`}
                                title={new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                            >
                                {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'short' })}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-auto bg-dark-700 hidden md:block self-stretch mx-2"></div>

                {/* Grouped Agent Filter */}
                <div className="flex flex-col gap-3 w-full md:min-w-[500px]">
                    <div className="flex items-center justify-between">
                        <label className="text-xs text-dark-400 font-medium uppercase tracking-wider">Agent Selection</label>
                        {agent.length > 0 && (
                            <button onClick={() => setAgent([])} className="text-[10px] text-primary-400 hover:text-white uppercase tracking-wider font-medium">
                                Reset All Agents
                            </button>
                        )}
                    </div>

                    <div className="grid gap-3">
                        {['MANDARIN', 'SHARK', 'RED DRAGON'].map(b => (
                            <div key={b} className="flex items-center gap-3 bg-dark-900/30 p-2 rounded-lg border border-dark-800/50">
                                <div className="w-24 text-[10px] text-dark-400 font-bold uppercase tracking-widest">{b}</div>

                                <div className="flex flex-wrap gap-1">
                                    {/* ALL Per Bar */}
                                    <button
                                        onClick={() => {
                                            const allKeysForBar = [
                                                `${b}|NULL`,
                                                ...Array.from({ length: 10 }, (_, i) => `${b}|${i + 1}`)
                                            ]
                                            // Check if all are already selected
                                            const allSelected = allKeysForBar.every(k => agent.includes(k))

                                            setAgent(prev => {
                                                if (allSelected) {
                                                    // Deselect all for this bar
                                                    return prev.filter(k => !k.startsWith(`${b}|`))
                                                } else {
                                                    // Select all for this bar (unique)
                                                    const otherAgents = prev.filter(k => !k.startsWith(`${b}|`))
                                                    return [...otherAgents, ...allKeysForBar]
                                                }
                                            })
                                        }}
                                        className={`h-7 px-2.5 rounded-md text-[10px] font-bold transition-all border shadow-sm ${
                                            // Active if all possible agents for this bar are selected
                                            [...Array.from({ length: 10 }, (_, i) => `${b}|${i + 1}`), `${b}|NULL`].every(k => agent.includes(k))
                                                ? 'bg-primary-600 text-white border-primary-500 shadow-primary-500/20'
                                                : 'bg-dark-700 text-dark-300 border-dark-600 hover:bg-dark-600'
                                            }`}
                                    >
                                        ALL
                                    </button>

                                    {/* House/No Agent Button */}
                                    <button
                                        onClick={() => {
                                            const key = `${b}|NULL`
                                            setAgent(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
                                        }}
                                        className={`h-7 px-2.5 rounded-md text-[10px] font-bold transition-all border shadow-sm ${agent.includes(`${b}|NULL`)
                                            ? 'bg-blue-600/80 text-white border-blue-500 shadow-blue-500/20'
                                            : 'bg-dark-700 text-dark-300 border-dark-600 hover:bg-dark-600'
                                            }`}
                                        title={`${b} House Staff`}
                                    >
                                        HOUSE
                                    </button>

                                    {/* Divider */}
                                    <div className="w-px h-4 bg-dark-700 self-center mx-1"></div>

                                    {/* Agents 1-10 */}
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map(a => {
                                        const key = `${b}|${a}`
                                        return (
                                            <button
                                                key={a}
                                                onClick={() => setAgent(prev =>
                                                    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                                                )}
                                                className={`w-7 h-7 rounded-md text-xs font-medium transition-all border shadow-sm flex items-center justify-center ${agent.includes(key)
                                                    ? 'bg-primary-600/80 text-white border-primary-500 shadow-primary-500/20'
                                                    : 'bg-dark-700 text-dark-400 border-dark-600 hover:bg-dark-600 hover:text-white'
                                                    }`}
                                                title={`${b} Agent #${a}`}
                                            >
                                                {a}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-8 bg-dark-700 hidden md:block self-center"></div>

                {/* Search */}
                <div className="w-full md:flex-1 md:min-w-[200px] md:mt-auto">
                    <input
                        type="text"
                        placeholder="Search Staff ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm"
                    />
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <KpiCard label="Total Rows" value={kpis?.total_rows.toLocaleString()} />
                <KpiCard label="Total Profit" value={formatMoney(kpis?.total_profit)} />
                <KpiCard label="Total Drinks" value={kpis?.total_drinks.toLocaleString()} />
                <KpiCard label="Avg Profit" value={formatMoney(kpis?.avg_profit)} />
                <KpiCard label="Unique Staff" value={kpis?.unique_staff.toLocaleString()} />
            </div>

            {/* Virtualized Table */}
            <div className="flex-1 min-h-[600px] bg-dark-900/50 rounded-xl overflow-hidden border border-dark-700 flex flex-col">
                <div className="hidden md:grid grid-cols-6 bg-dark-800 p-3 font-medium text-xs text-dark-400 uppercase tracking-wider border-b border-dark-700">
                    <div className="col-span-1">Date</div>
                    <div className="col-span-1">Bar</div>
                    <div className="col-span-1">Staff ID</div>
                    <div className="col-span-1">Agent</div>
                    <div className="col-span-1 text-right">Drinks</div>
                    <div className="col-span-1 text-right font-bold text-white">Profit</div>
                </div>

                <div ref={parentRef} className="flex-1 overflow-auto">
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const isLoaderRow = virtualRow.index > allRows.length - 1
                            const row = allRows[virtualRow.index] as FactRow

                            return (
                                <div
                                    key={virtualRow.index}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className={`hover:bg-dark-800/50 transition-colors border-b border-dark-800 ${virtualRow.index % 2 === 0 ? 'bg-dark-900/20' : ''
                                        }`}
                                >
                                    {isLoaderRow ? (
                                        <div className="text-center text-dark-500 py-2">Loading more...</div>
                                    ) : (
                                        <>
                                            {/* Mobile Layout */}
                                            <div className="md:hidden p-3 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="text-white font-medium text-sm">{row.bar}</div>
                                                        <div className="text-primary-300 font-mono text-xs">{row.staff_id}</div>
                                                        <div className="text-dark-400 text-xs">{formatDate(row.date)}</div>
                                                    </div>
                                                    <div className={`text-lg font-bold ${(row.profit || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {formatMoney(row.profit)}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <div className={`px-2 py-0.5 rounded-full ${row.agent_mismatch ? 'bg-red-900/50 text-red-300' : 'bg-dark-700 text-dark-300'}`}>
                                                        {row.agent_label || '-'}{row.agent_mismatch && ' (!)'}
                                                    </div>
                                                    <div className="text-dark-300">🍹 {row.drinks || '-'}</div>
                                                </div>
                                            </div>

                                            {/* Desktop Layout */}
                                            <div className="hidden md:grid grid-cols-6 p-3 text-sm items-center">
                                                <div className="col-span-1 text-dark-300 truncate">{formatDate(row.date)}</div>
                                                <div className="col-span-1 text-white font-medium truncate">{row.bar}</div>
                                                <div className="col-span-1 text-primary-300 font-mono truncate">{row.staff_id}</div>
                                                <div className="col-span-1">
                                                    <div className={`text-xs px-2 py-0.5 rounded-full w-fit ${row.agent_mismatch ? 'bg-red-900/50 text-red-300' : 'bg-dark-700 text-dark-300'}`}>
                                                        {row.agent_label || '-'}
                                                        {row.agent_mismatch && ' (!)'}
                                                    </div>
                                                </div>
                                                <div className="col-span-1 text-right text-dark-300">
                                                    {row.drinks || '-'}
                                                </div>
                                                <div className={`col-span-1 text-right text-lg font-bold ${(row.profit || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {formatMoney(row.profit)}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

function KpiCard({ label, value }: { label: string; value?: string }) {
    return (
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700 border-l-4 border-l-primary-500 shadow-lg">
            <div className="text-dark-400 text-xs uppercase mb-1 font-medium tracking-wide">{label}</div>
            <div className="text-white text-2xl font-bold tracking-tight">{value || '-'}</div>
        </div>
    )
}
