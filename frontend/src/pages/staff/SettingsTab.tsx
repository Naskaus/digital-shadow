import { useState, useEffect } from 'react'
import { settingsApi, DataSource, DataSourceInput, usersApi, User, UserUpdateInput, contractsApi, ContractType, ContractTypeInput } from '../../api/client'

interface DiscoveredSheet {
    id: string
    name: string
    tabs: string[]
}

type ModalType = 'none' | 'addUser' | 'editUser' | 'resetPassword' | 'toggleStatus' | 'deleteUser' | 'addContract' | 'editContract' | 'deleteContract'

interface UserFormData {
    email: string
    password: string
    role: 'admin' | 'viewer'
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

    // User Management State
    const [users, setUsers] = useState<User[]>([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [userModalType, setUserModalType] = useState<ModalType>('none')
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [userFormData, setUserFormData] = useState<UserFormData>({
        email: '',
        password: '',
        role: 'viewer',
    })
    const [newPassword, setNewPassword] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    // Contract Types State
    const [contracts, setContracts] = useState<ContractType[]>([])
    const [loadingContracts, setLoadingContracts] = useState(false)
    const [contractModalType, setContractModalType] = useState<ModalType>('none')
    const [selectedContract, setSelectedContract] = useState<ContractType | null>(null)
    const [contractFormData, setContractFormData] = useState<ContractTypeInput>({
        name: '',
        duration_days: 1,
        late_cutoff_time: '19:29:00',
        first_minute_penalty_thb: 0.0,
        additional_minutes_penalty_thb: 5.0,
        drink_price_thb: 220.0,
        staff_commission_thb: 100.0,
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

    const loadUsers = async () => {
        try {
            setLoadingUsers(true)
            const data = await usersApi.getAll()
            setUsers(data || [])
        } catch (err) {
            // Only show error if it's not an auth issue (admin check)
            if (err instanceof Error && !err.message.includes('Admin')) {
                setError(err instanceof Error ? err.message : 'Failed to load users')
            }
        } finally {
            setLoadingUsers(false)
        }
    }

    const loadContracts = async () => {
        try {
            setLoadingContracts(true)
            const data = await contractsApi.getAll()
            setContracts(data || [])
        } catch (err) {
            if (err instanceof Error && !err.message.includes('Admin')) {
                setError(err instanceof Error ? err.message : 'Failed to load contract types')
            }
        } finally {
            setLoadingContracts(false)
        }
    }


    useEffect(() => {
        loadSources()
        loadUsers()
        loadContracts()
    }, [])

    // Set current user once users are loaded
    useEffect(() => {
        if (users.length > 0) {
            // Find the admin user (likely the logged-in one for now)
            const adminUser = users.find(u => u.role === 'admin')
            if (adminUser) {
                setCurrentUser(adminUser)
            }
        }
    }, [users])

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

    // User Management Functions
    const openAddUser = () => {
        setUserFormData({ email: '', password: '', role: 'viewer' })
        setUserModalType('addUser')
    }

    const openEditUser = (user: User) => {
        setSelectedUser(user)
        setUserFormData({ email: user.email, password: '', role: user.role })
        setUserModalType('editUser')
    }

    const openResetPassword = (user: User) => {
        setSelectedUser(user)
        setNewPassword('')
        setUserModalType('resetPassword')
    }

    const openToggleStatus = (user: User) => {
        setSelectedUser(user)
        setUserModalType('toggleStatus')
    }

    const openDeleteUser = (user: User) => {
        setSelectedUser(user)
        setUserModalType('deleteUser')
    }

    const closeUserModal = () => {
        setUserModalType('none')
        setSelectedUser(null)
        setUserFormData({ email: '', password: '', role: 'viewer' })
        setNewPassword('')
    }

    const handleCreateUser = async () => {
        if (!userFormData.email || !userFormData.password) {
            setError('Email and password are required')
            return
        }

        try {
            setActionLoading(true)
            await usersApi.create({
                email: userFormData.email,
                password: userFormData.password,
                role: userFormData.role,
            })
            closeUserModal()
            loadUsers()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create user')
        } finally {
            setActionLoading(false)
        }
    }

    const handleUpdateUser = async () => {
        if (!selectedUser) return

        try {
            setActionLoading(true)
            const updates: UserUpdateInput = {}
            if (userFormData.email !== selectedUser.email) {
                updates.email = userFormData.email
            }
            if (userFormData.role !== selectedUser.role) {
                updates.role = userFormData.role
            }
            await usersApi.update(selectedUser.id, updates)
            closeUserModal()
            loadUsers()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update user')
        } finally {
            setActionLoading(false)
        }
    }

    const handleResetPassword = async () => {
        if (!selectedUser || !newPassword) {
            setError('Password is required')
            return
        }

        try {
            setActionLoading(true)
            await usersApi.resetPassword(selectedUser.id, newPassword)
            closeUserModal()
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset password')
        } finally {
            setActionLoading(false)
        }
    }

    const handleToggleStatus = async () => {
        if (!selectedUser) return

        try {
            setActionLoading(true)
            await usersApi.update(selectedUser.id, { is_active: !selectedUser.is_active })
            closeUserModal()
            loadUsers()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update status')
        } finally {
            setActionLoading(false)
        }
    }

    const handleDeleteUser = async () => {
        if (!selectedUser) return

        try {
            setActionLoading(true)
            await usersApi.delete(selectedUser.id)
            closeUserModal()
            loadUsers()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete user')
        } finally {
            setActionLoading(false)
        }
    }

    const isCurrentUser = (user: User) => {
        return currentUser?.id === user.id
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    // Contract Type Management Functions
    const openAddContract = () => {
        setContractFormData({
            name: '',
            duration_days: 1,
            late_cutoff_time: '19:29:00',
            first_minute_penalty_thb: 0.0,
            additional_minutes_penalty_thb: 5.0,
            drink_price_thb: 220.0,
            staff_commission_thb: 100.0,
            is_active: true,
        })
        setContractModalType('addContract')
    }

    const openEditContract = (contract: ContractType) => {
        setSelectedContract(contract)
        setContractFormData({
            name: contract.name,
            duration_days: contract.duration_days,
            late_cutoff_time: contract.late_cutoff_time,
            first_minute_penalty_thb: contract.first_minute_penalty_thb,
            additional_minutes_penalty_thb: contract.additional_minutes_penalty_thb,
            drink_price_thb: contract.drink_price_thb,
            staff_commission_thb: contract.staff_commission_thb,
            is_active: contract.is_active,
        })
        setContractModalType('editContract')
    }

    const openDeleteContract = (contract: ContractType) => {
        setSelectedContract(contract)
        setContractModalType('deleteContract')
    }

    const closeContractModal = () => {
        setContractModalType('none')
        setSelectedContract(null)
        setContractFormData({
            name: '',
            duration_days: 1,
            late_cutoff_time: '19:29:00',
            first_minute_penalty_thb: 0.0,
            additional_minutes_penalty_thb: 5.0,
            drink_price_thb: 220.0,
            staff_commission_thb: 100.0,
            is_active: true,
        })
    }

    const handleCreateContract = async () => {
        if (!contractFormData.name) {
            setError('Contract name is required')
            return
        }

        try {
            setActionLoading(true)
            await contractsApi.create(contractFormData)
            closeContractModal()
            loadContracts()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create contract type')
        } finally {
            setActionLoading(false)
        }
    }

    const handleUpdateContract = async () => {
        if (!selectedContract) return

        try {
            setActionLoading(true)
            await contractsApi.update(selectedContract.id, contractFormData)
            closeContractModal()
            loadContracts()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update contract type')
        } finally {
            setActionLoading(false)
        }
    }

    const handleDeleteContract = async () => {
        if (!selectedContract) return

        try {
            setActionLoading(true)
            await contractsApi.delete(selectedContract.id)
            closeContractModal()
            loadContracts()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete contract type')
        } finally {
            setActionLoading(false)
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

                {/* Edit Data Source Modal */}
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

                {/* Contract Types */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white">Contract Types</h3>
                        <button
                            onClick={openAddContract}
                            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-500 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add New Contract
                        </button>
                    </div>
                    <div className="bg-dark-900/50 rounded-xl p-6">
                        {loadingContracts ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                            </div>
                        ) : contracts.length === 0 ? (
                            <div className="text-center text-dark-500 py-8">
                                No contract types configured
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {contracts.map((contract) => (
                                    <div key={contract.id} className="bg-dark-800 rounded-lg p-4 border border-dark-700">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-white font-bold text-lg">{contract.name}</h3>
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${contract.is_active
                                                ? 'bg-green-500/20 text-green-300'
                                                : 'bg-red-500/20 text-red-300'
                                                }`}>
                                                {contract.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-dark-400">Duration:</span>
                                                <span className="text-white">{contract.duration_days} day(s)</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-dark-400">Late Cutoff:</span>
                                                <span className="text-white">{contract.late_cutoff_time.substring(0, 5)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-dark-400">First Min Penalty:</span>
                                                <span className="text-white">{contract.first_minute_penalty_thb} THB</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-dark-400">Additional Min Penalty:</span>
                                                <span className="text-white">{contract.additional_minutes_penalty_thb} THB/min</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-dark-400">Drink Price:</span>
                                                <span className="text-white">{contract.drink_price_thb} THB</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-dark-400">Staff Commission:</span>
                                                <span className="text-white">{contract.staff_commission_thb} THB</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-4 pt-4 border-t border-dark-700">
                                            <button
                                                onClick={() => openEditContract(contract)}
                                                className="flex-1 px-3 py-2 bg-dark-700 text-white text-sm rounded-lg hover:bg-dark-600 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => openDeleteContract(contract)}
                                                className="flex-1 px-3 py-2 bg-red-600/20 text-red-400 text-sm rounded-lg hover:bg-red-600/30 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* User Management */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white">User Management</h3>
                        <button
                            onClick={openAddUser}
                            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-500 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add User
                        </button>
                    </div>
                    <div className="bg-dark-900/50 rounded-xl overflow-hidden">
                        {loadingUsers ? (
                            <div className="p-8 flex items-center justify-center">
                                <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="p-8 text-center text-dark-500">
                                No users found
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-dark-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Created</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-700">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-dark-800/50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white">{user.email}</span>
                                                    {isCurrentUser(user) && (
                                                        <span className="text-xs bg-primary-600/30 text-primary-300 px-2 py-0.5 rounded">You</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${user.role === 'admin'
                                                    ? 'bg-purple-500/20 text-purple-300'
                                                    : 'bg-blue-500/20 text-blue-300'
                                                    }`}>
                                                    {user.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${user.is_active
                                                    ? 'bg-green-500/20 text-green-300'
                                                    : 'bg-red-500/20 text-red-300'
                                                    }`}>
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-dark-400 text-sm">
                                                {formatDate(user.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditUser(user)}
                                                        className="text-dark-400 hover:text-white transition-colors p-1"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => openResetPassword(user)}
                                                        className="text-dark-400 hover:text-yellow-400 transition-colors p-1"
                                                        title="Reset Password"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                        </svg>
                                                    </button>
                                                    {!isCurrentUser(user) && (
                                                        <>
                                                            <button
                                                                onClick={() => openToggleStatus(user)}
                                                                className={`transition-colors p-1 ${user.is_active ? 'text-dark-400 hover:text-orange-400' : 'text-dark-400 hover:text-green-400'}`}
                                                                title={user.is_active ? 'Disable' : 'Enable'}
                                                            >
                                                                {user.is_active ? (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteUser(user)}
                                                                className="text-dark-400 hover:text-red-400 transition-colors p-1"
                                                                title="Delete"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </div>

            {/* Add User Modal */}
            {userModalType === 'addUser' && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-medium text-white mb-4">Add New User</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={userFormData.email}
                                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                                    placeholder="user@example.com"
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Password</label>
                                <input
                                    type="password"
                                    value={userFormData.password}
                                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                                    placeholder="Minimum 8 characters"
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Role</label>
                                <select
                                    value={userFormData.role}
                                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'admin' | 'viewer' })}
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeUserModal}
                                className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateUser}
                                disabled={actionLoading || !userFormData.email || !userFormData.password}
                                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {userModalType === 'editUser' && selectedUser && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-medium text-white mb-4">Edit User</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={userFormData.email}
                                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Role</label>
                                <select
                                    value={userFormData.role}
                                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'admin' | 'viewer' })}
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeUserModal}
                                className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                disabled={actionLoading || !userFormData.email}
                                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {userModalType === 'resetPassword' && selectedUser && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-medium text-white mb-4">Reset Password</h3>
                        <p className="text-dark-400 text-sm mb-4">
                            Set a new password for <span className="text-white">{selectedUser.email}</span>
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minimum 8 characters"
                                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeUserModal}
                                className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetPassword}
                                disabled={actionLoading || !newPassword || newPassword.length < 8}
                                className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Status Confirmation Modal */}
            {userModalType === 'toggleStatus' && selectedUser && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-medium text-white mb-4">
                            {selectedUser.is_active ? 'Disable User' : 'Enable User'}
                        </h3>
                        <p className="text-dark-400 mb-6">
                            {selectedUser.is_active
                                ? <>Are you sure you want to <span className="text-orange-400">disable</span> <span className="text-white">{selectedUser.email}</span>? They will not be able to log in.</>
                                : <>Are you sure you want to <span className="text-green-400">enable</span> <span className="text-white">{selectedUser.email}</span>? They will be able to log in again.</>
                            }
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={closeUserModal}
                                className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleToggleStatus}
                                disabled={actionLoading}
                                className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selectedUser.is_active ? 'bg-orange-600 hover:bg-orange-500' : 'bg-green-600 hover:bg-green-500'
                                    }`}
                            >
                                {actionLoading ? 'Processing...' : (selectedUser.is_active ? 'Disable' : 'Enable')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Confirmation Modal */}
            {userModalType === 'deleteUser' && selectedUser && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-medium text-white mb-4">Delete User</h3>
                        <p className="text-dark-400 mb-6">
                            Are you sure you want to <span className="text-red-400">permanently delete</span> <span className="text-white">{selectedUser.email}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={closeUserModal}
                                className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? 'Deleting...' : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Contract Type Modal */}
            {contractModalType === 'addContract' && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-medium text-white mb-4">Add New Contract Type</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={contractFormData.name}
                                    onChange={(e) => setContractFormData({ ...contractFormData, name: e.target.value })}
                                    placeholder="e.g., 1-Day, 10-days, 1-Month"
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Duration (days)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={contractFormData.duration_days}
                                        onChange={(e) => setContractFormData({ ...contractFormData, duration_days: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Late Cutoff Time</label>
                                    <input
                                        type="time"
                                        value={contractFormData.late_cutoff_time}
                                        onChange={(e) => setContractFormData({ ...contractFormData, late_cutoff_time: e.target.value + ':00' })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">First Min Penalty (THB)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={contractFormData.first_minute_penalty_thb}
                                        onChange={(e) => setContractFormData({ ...contractFormData, first_minute_penalty_thb: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Additional Min Penalty (THB)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={contractFormData.additional_minutes_penalty_thb}
                                        onChange={(e) => setContractFormData({ ...contractFormData, additional_minutes_penalty_thb: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Drink Price (THB)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={contractFormData.drink_price_thb}
                                        onChange={(e) => setContractFormData({ ...contractFormData, drink_price_thb: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Staff Commission (THB)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={contractFormData.staff_commission_thb}
                                        onChange={(e) => setContractFormData({ ...contractFormData, staff_commission_thb: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="contract_is_active"
                                    checked={contractFormData.is_active}
                                    onChange={(e) => setContractFormData({ ...contractFormData, is_active: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="contract_is_active" className="text-white">Active</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeContractModal}
                                className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateContract}
                                disabled={actionLoading || !contractFormData.name}
                                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? 'Creating...' : 'Create Contract'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Contract Type Modal */}
            {contractModalType === 'editContract' && selectedContract && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-medium text-white mb-4">Edit Contract Type</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={contractFormData.name}
                                    onChange={(e) => setContractFormData({ ...contractFormData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Duration (days)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={contractFormData.duration_days}
                                        onChange={(e) => setContractFormData({ ...contractFormData, duration_days: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Late Cutoff Time</label>
                                    <input
                                        type="time"
                                        value={contractFormData.late_cutoff_time.substring(0, 5)}
                                        onChange={(e) => setContractFormData({ ...contractFormData, late_cutoff_time: e.target.value + ':00' })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">First Min Penalty (THB)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={contractFormData.first_minute_penalty_thb}
                                        onChange={(e) => setContractFormData({ ...contractFormData, first_minute_penalty_thb: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Additional Min Penalty (THB)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={contractFormData.additional_minutes_penalty_thb}
                                        onChange={(e) => setContractFormData({ ...contractFormData, additional_minutes_penalty_thb: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Drink Price (THB)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={contractFormData.drink_price_thb}
                                        onChange={(e) => setContractFormData({ ...contractFormData, drink_price_thb: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Staff Commission (THB)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={contractFormData.staff_commission_thb}
                                        onChange={(e) => setContractFormData({ ...contractFormData, staff_commission_thb: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="contract_is_active_edit"
                                    checked={contractFormData.is_active}
                                    onChange={(e) => setContractFormData({ ...contractFormData, is_active: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="contract_is_active_edit" className="text-white">Active</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeContractModal}
                                className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateContract}
                                disabled={actionLoading || !contractFormData.name}
                                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Contract Type Confirmation Modal */}
            {contractModalType === 'deleteContract' && selectedContract && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-medium text-white mb-4">Delete Contract Type</h3>
                        <p className="text-dark-400 mb-6">
                            Are you sure you want to <span className="text-red-400">permanently delete</span> the <span className="text-white">{selectedContract.name}</span> contract type? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={closeContractModal}
                                className="flex-1 px-4 py-3 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteContract}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? 'Deleting...' : 'Delete Contract'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
