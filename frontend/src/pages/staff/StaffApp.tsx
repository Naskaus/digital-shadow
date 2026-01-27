import { useState, useEffect } from 'react'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import ImportTab from './ImportTab'
import DataTableTab from './DataTableTab'
import AnalyticsTab from './AnalyticsTab'
import SettingsTab from './SettingsTab'
import AIAnalystTab from './AIAnalystTab'
import { authApi, User } from '../../api/client'

const allTabs = [
    { name: 'Import', path: 'import', roles: ['admin'] },
    { name: 'Data', path: 'data', roles: ['admin', 'viewer'] },
    { name: 'Analytics', path: 'analytics', roles: ['admin', 'viewer'] },
    { name: 'Settings', path: 'settings', roles: ['admin'] },
    { name: 'AI Analyst', path: 'ai-analyst', roles: ['seb'] },
]

export default function StaffApp() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await authApi.getMe()
                setUser(userData)
            } catch (err) {
                console.error('Failed to load user', err)
                // If failed to load user (e.g. 401), redirect to login
                window.location.href = '/login'
            } finally {
                setLoading(false)
            }
        }
        loadUser()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!user) return null

    // Filter tabs based on role + special "seb" check
    const allowedTabs = allTabs.filter(tab => {
        // Special case: "seb" pseudo-role for Seb-only features
        if (tab.roles.includes('seb')) {
            return user.username === 'seb'
        }
        // Regular role-based filtering
        return tab.roles.includes(user.role)
    })

    // Determine default tab
    // Admin -> import (first tab)
    // Viewer -> data (second tab in list, but first allowed)
    const defaultTab = allowedTabs.length > 0 ? allowedTabs[0].path : 'data'

    return (
        <Layout title="Staff">
            {/* Tab Navigation - scrollable on mobile */}
            <div className="mb-4 md:mb-6 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto">
                <nav className="flex gap-1 bg-dark-800 rounded-xl p-1 w-max md:w-fit">
                    {allowedTabs.map((tab) => (
                        <NavLink
                            key={tab.path}
                            to={`/staff/${tab.path}`}
                            className={({ isActive }) =>
                                `px-3 py-2 md:px-4 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${isActive
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                                    : 'text-dark-400 hover:text-white hover:bg-dark-700'
                                }`
                            }
                        >
                            {tab.name}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-dark-800 rounded-xl md:rounded-2xl border border-dark-700 min-h-[400px] md:min-h-[600px] overflow-hidden">
                <Routes>
                    {user.role === 'admin' && <Route path="import" element={<ImportTab />} />}
                    <Route path="data" element={<DataTableTab />} />
                    <Route path="analytics" element={<AnalyticsTab />} />
                    {user.role === 'admin' && <Route path="settings" element={<SettingsTab />} />}
                    {user.username === 'seb' && <Route path="ai-analyst" element={<AIAnalystTab />} />}
                    <Route path="*" element={<Navigate to={defaultTab} replace />} />
                </Routes>
            </div>
        </Layout>
    )
}

