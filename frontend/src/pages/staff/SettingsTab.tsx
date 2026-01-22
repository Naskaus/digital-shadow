import { useState, useEffect } from 'react'
import { settingsApi, DataSource, DataSourceInput } from '../../api/client'

interface DiscoveredSheet {
    id: string
    name: string
    tabs: string[]
}

export default function SettingsTab() {
    const [sources, setSources] = useState<DataSource[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editingYear, setEditingYear] = useState<number | null>(null)
    const [discoveredSheets, setDiscoveredSheets] = useState<DiscoveredSheet[]>([])
    const [loadingSheets, setLoadingSheets] = useState(false)
    const [formData, setFormData] = useState<DataSourceInput>({
        year: 2025,
        sheet_id: '',
        tab_name: '',
        range_spec: 'A:Q',
        is_active: true,
    })

    const loadSources = async () => {
        try {
            setLoading(true)
            const data = await settingsApi.listSources()
            setSources(data || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sources')
        } finally {
            setLoading(false)
        }
    }

    const loadDiscoveredSheets = async () => {
        try {
            setLoadingSheets(true)
            const data = await settingsApi.discoverSheets()
            setDiscoveredSheets(data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to discover sheets')
        } finally {
            setLoadingSheets(false)
        }
    }

    useEffect(() => {
        loadSources()
    }, [])

    const openEdit = (source: DataSource) => {
        setEditingYear(source.year)
        setFormData({
            year: source.year,
            sheet_id: source.sheet_id,
            tab_name: source.tab_name,
            range_spec: source.range_spec,
            is_active: source.is_active,
        })
        loadDiscoveredSheets()
    }

    const openCreate = (year: number) => {
        setEditingYear(year)
        setFormData({
            year,
            sheet_id: '',
            tab_name: '',
            range_spec: 'A:Q',
            is_active: true,
        })
        loadDiscoveredSheets()
    }

    const handleSave = async () => {
        if (!formData.sheet_id || !formData.tab_name) {
            setError('Please select a sheet and tab')
            return
        }

        try {
            const existing = sources.find(s => s.year === formData.year)
            if (existing) {
                await settingsApi.updateSource(formData.year, formData)
            } else {
                await settingsApi.createSource(formData)
            }
            setEditingYear(null)
            loadSources()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
        }
    }

    const handleSheetChange = (sheetId: string) => {
        setFormData({ ...formData, sheet_id: sheetId, tab_name: '' })
    }

    const getSourceStatus = (year: number) => {
        const source = sources.find(s => s.year === year)
        if (!source) return { configured: false, text: 'Not configured' }

        // Find sheet name from discovered or just show tab
        const sheet = discoveredSheets.find(s => s.id === source.sheet_id)
        const sheetName = sheet?.name || source.sheet_id.substring(0, 15) + '...'

        return {
            configured: true,
            text: `${source.tab_name} (${source.is_active ? 'Active' : 'Inactive'})`,
            sheetName,
        }
    }

    const selectedSheet = discoveredSheets.find(s => s.id === formData.sheet_id)

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Settings</h2>

            {error && (
                <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white">×</button>
                </div>
            )}

            <div className="space-y-8">
                {/* Data Sources */}
                <section>
                    <h3 className="text-lg font-medium text-white mb-4">Data Sources</h3>
                    <div className="bg-dark-900/50 rounded-xl p-6">
                        <div className="space-y-4">
                            {[2025, 2026].map((year) => {
                                const status = getSourceStatus(year)
                                return (
                                    <div key={year} className="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
                                        <div>
                                            <div className="text-white font-medium">{year} Sheet</div>
                                            <div className={`text-sm ${status.configured ? 'text-green-400' : 'text-dark-500'}`}>
                                                {status.text}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => status.configured ? openEdit(sources.find(s => s.year === year)!) : openCreate(year)}
                                            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-500 transition-colors"
                                        >
                                            {status.configured ? 'Edit' : 'Configure'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                {/* Edit Modal */}
                {editingYear !== null && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md">
                            <h3 className="text-lg font-medium text-white mb-4">
                                Configure {editingYear} Data Source
                            </h3>

                            {loadingSheets ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                                    <span className="ml-3 text-dark-300">Discovering sheets...</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-dark-300 mb-2">
                                            Select Sheet
                                        </label>
                                        <select
                                            value={formData.sheet_id}
                                            onChange={(e) => handleSheetChange(e.target.value)}
                                            className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                        >
                                            <option value="">-- Select a Google Sheet --</option>
                                            {discoveredSheets.map(sheet => (
                                                <option key={sheet.id} value={sheet.id}>
                                                    {sheet.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedSheet && (
                                        <div>
                                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                                Select Tab
                                            </label>
                                            <select
                                                value={formData.tab_name}
                                                onChange={(e) => setFormData({ ...formData, tab_name: e.target.value })}
                                                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                            >
                                                <option value="">-- Select a tab --</option>
                                                {selectedSheet.tabs.map(tab => (
                                                    <option key={tab} value={tab}>{tab}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-dark-300 mb-2">Range</label>
                                        <input
                                            type="text"
                                            value={formData.range_spec}
                                            onChange={(e) => setFormData({ ...formData, range_spec: e.target.value })}
                                            placeholder="A:Q"
                                            className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <label htmlFor="is_active" className="text-white">Active</label>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setEditingYear(null)}
                                    className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loadingSheets || !formData.sheet_id || !formData.tab_name}
                                    className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Agent Range Rules */}
                <section>
                    <h3 className="text-lg font-medium text-white mb-4">Agent Range Rules</h3>
                    <div className="bg-dark-900/50 rounded-xl p-6">
                        <p className="text-dark-500 text-sm mb-4">
                            Configure staff number ranges for each agent per bar.
                        </p>
                        <button className="px-4 py-2 bg-dark-700 text-white text-sm rounded-lg hover:bg-dark-600 transition-colors">
                            Manage Rules
                        </button>
                    </div>
                </section>

                {/* User Management */}
                <section>
                    <h3 className="text-lg font-medium text-white mb-4">User Management</h3>
                    <div className="bg-dark-900/50 rounded-xl p-6">
                        <p className="text-dark-500 text-sm mb-4">
                            Manage system users and their roles.
                        </p>
                        <button className="px-4 py-2 bg-dark-700 text-white text-sm rounded-lg hover:bg-dark-600 transition-colors">
                            Manage Users
                        </button>
                    </div>
                </section>
            </div>
        </div>
    )
}
