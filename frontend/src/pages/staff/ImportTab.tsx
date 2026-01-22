import { useState, useEffect } from 'react'
import { importApi, ImportRun, ImportError as ImportErr } from '../../api/client'

export default function ImportTab() {
    const [selectedYears, setSelectedYears] = useState<number[]>([2025, 2026])
    const [mode, setMode] = useState<'FULL' | 'INCREMENTAL'>('FULL')
    const [isRunning, setIsRunning] = useState(false)
    const [runs, setRuns] = useState<ImportRun[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedRunErrors, setSelectedRunErrors] = useState<{ runId: number; errors: ImportErr[] } | null>(null)
    const [reviewRun, setReviewRun] = useState<ImportRun | null>(null)
    const [isCommitting, setIsCommitting] = useState(false)

    const loadRuns = async () => {
        try {
            const data = await importApi.listRuns(20, 0)
            setRuns(data || [])
        } catch (err) {
            console.error('Failed to load runs:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadRuns()
    }, [])

    const handleRunImport = async () => {
        if (selectedYears.length === 0) {
            setError('Please select at least one year')
            return
        }

        setIsRunning(true)
        setError(null)

        try {
            // Always run as dry_run first (Staging)
            await importApi.run(selectedYears, mode, true)
            await loadRuns()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed')
        } finally {
            setIsRunning(false)
        }
    }

    const handleCommit = async (runId: number) => {
        setIsCommitting(true)
        try {
            await importApi.commit(runId)
            setReviewRun(null)
            await loadRuns()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Commit failed')
        } finally {
            setIsCommitting(false)
        }
    }

    const handleDelete = async (runId: number) => {
        if (!confirm('Are you sure you want to delete this run? All associated data will be removed.')) return

        try {
            await importApi.delete(runId)
            if (reviewRun?.id === runId) setReviewRun(null)
            await loadRuns()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed')
        }
    }

    const toggleYear = (year: number) => {
        setSelectedYears(prev =>
            prev.includes(year)
                ? prev.filter(y => y !== year)
                : [...prev, year]
        )
    }

    const loadErrors = async (runId: number) => {
        try {
            const errors = await importApi.getErrors(runId, 50, 0)
            setSelectedRunErrors({ runId, errors: errors || [] })
        } catch (err) {
            console.error('Failed to load errors:', err)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'text-green-400'
            case 'FAILED': return 'text-red-400'
            case 'STAGED': return 'text-blue-400'
            case 'RUNNING': return 'text-yellow-400'
            default: return 'text-dark-400'
        }
    }

    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Import & QA</h2>

            {error && (
                <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white">×</button>
                </div>
            )}

            {/* Import Controls */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                        Source Years
                    </label>
                    <div className="flex gap-2">
                        {[2025, 2026].map(year => (
                            <button
                                key={year}
                                onClick={() => toggleYear(year)}
                                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${selectedYears.includes(year)
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                                    }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                        Import Mode
                    </label>
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as 'FULL' | 'INCREMENTAL')}
                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    >
                        <option value="FULL">Full Import</option>
                        <option value="INCREMENTAL">Incremental</option>
                    </select>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={handleRunImport}
                        disabled={isRunning || selectedYears.length === 0}
                        className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-lg hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isRunning ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Running...
                            </span>
                        ) : (
                            'RUN IMPORT (STAGE)'
                        )}
                    </button>
                </div>
            </div>

            {/* Import History */}
            <div>
                <h3 className="text-lg font-medium text-white mb-4">Recent Imports</h3>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                    </div>
                ) : runs.length === 0 ? (
                    <div className="bg-dark-900/50 rounded-xl p-6 text-center text-dark-500">
                        No import runs yet. Click "RUN IMPORT" to start.
                    </div>
                ) : (
                    <div className="bg-dark-900/50 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-dark-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Year</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">Fetched</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">Inserted</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">Errors</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-700">
                                {runs.map((run) => (
                                    <tr key={run.id} className="hover:bg-dark-800/50">
                                        <td className="px-4 py-3 text-white">#{run.id}</td>
                                        <td className="px-4 py-3 text-dark-300 text-sm">{formatDate(run.started_at)}</td>
                                        <td className="px-4 py-3 text-white">{run.source_year}</td>
                                        <td className={`px-4 py-3 font-medium ${getStatusColor(run.status)}`}>
                                            {run.status.toUpperCase()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-dark-300">{run.rows_fetched.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-green-400">{run.rows_inserted.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-red-400">{run.rows_errored.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            {run.status === 'STAGED' && (
                                                <button
                                                    onClick={() => setReviewRun(run)}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
                                                >
                                                    Review
                                                </button>
                                            )}
                                            {run.rows_errored > 0 && (
                                                <button
                                                    onClick={() => loadErrors(run.id)}
                                                    className="text-primary-400 hover:text-primary-300 text-sm"
                                                >
                                                    Errors
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDelete(run.id)}
                                                className="text-dark-500 hover:text-red-400 text-lg px-2"
                                                title="Delete Run"
                                            >
                                                ×
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {reviewRun && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-lg">
                        <h3 className="text-xl font-bold text-white mb-4">Review Import Run #{reviewRun.id}</h3>

                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-dark-900 p-3 rounded-lg">
                                    <div className="text-dark-400 text-xs uppercase">Source Year</div>
                                    <div className="text-white text-lg">{reviewRun.source_year}</div>
                                </div>
                                <div className="bg-dark-900 p-3 rounded-lg">
                                    <div className="text-dark-400 text-xs uppercase">Fetched Rows</div>
                                    <div className="text-white text-lg">{reviewRun.rows_fetched.toLocaleString()}</div>
                                </div>
                                <div className="bg-dark-900 p-3 rounded-lg">
                                    <div className="text-dark-400 text-xs uppercase">Pending Insert</div>
                                    <div className="text-green-400 text-lg">{(reviewRun.rows_fetched - reviewRun.rows_errored).toLocaleString()}</div>
                                </div>
                                <div className="bg-dark-900 p-3 rounded-lg">
                                    <div className="text-dark-400 text-xs uppercase">Errors</div>
                                    <div className="text-red-400 text-lg">{reviewRun.rows_errored.toLocaleString()}</div>
                                </div>
                            </div>

                            <p className="text-dark-300 text-sm">
                                This run is currently <strong>STAGED</strong>. The data has been fetched and validated but NOT yet inserted into the main database.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => handleCommit(reviewRun.id)}
                                disabled={isCommitting}
                                className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg disabled:opacity-50"
                            >
                                {isCommitting ? 'Committing...' : 'Confirm & Commit'}
                            </button>
                            <button
                                onClick={() => handleDelete(reviewRun.id)}
                                disabled={isCommitting}
                                className="flex-1 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 font-medium rounded-lg border border-red-800"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setReviewRun(null)}
                                disabled={isCommitting}
                                className="px-4 py-2 text-dark-400 hover:text-white"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Errors Modal */}
            {selectedRunErrors && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-white">
                                Errors for Import #{selectedRunErrors.runId}
                            </h3>
                            <button
                                onClick={() => setSelectedRunErrors(null)}
                                className="text-dark-400 hover:text-white text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        {selectedRunErrors.errors.length === 0 ? (
                            <p className="text-dark-500">No errors found.</p>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-auto">
                                {selectedRunErrors.errors.map((err) => (
                                    <div key={err.id} className="p-3 bg-dark-700 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="text-red-400 font-mono text-sm">{err.error_type}</span>
                                            <span className="text-dark-500">Row {err.sheet_row_number}</span>
                                        </div>
                                        <div className="text-dark-300 text-sm mt-1">{err.error_message}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
