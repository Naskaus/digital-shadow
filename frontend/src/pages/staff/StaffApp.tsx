import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import ImportTab from './ImportTab'
import DataTableTab from './DataTableTab'
import AnalyticsTab from './AnalyticsTab'
import SettingsTab from './SettingsTab'

const tabs = [
    { name: 'Import', path: 'import' },
    { name: 'Data', path: 'data' },
    { name: 'Analytics', path: 'analytics' },
    { name: 'Settings', path: 'settings' },
]

export default function StaffApp() {
    return (
        <Layout title="Staff">
            {/* Tab Navigation - scrollable on mobile */}
            <div className="mb-4 md:mb-6 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto">
                <nav className="flex gap-1 bg-dark-800 rounded-xl p-1 w-max md:w-fit">
                    {tabs.map((tab) => (
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
                    <Route path="import" element={<ImportTab />} />
                    <Route path="data" element={<DataTableTab />} />
                    <Route path="analytics" element={<AnalyticsTab />} />
                    <Route path="settings" element={<SettingsTab />} />
                    <Route path="*" element={<Navigate to="import" replace />} />
                </Routes>
            </div>
        </Layout>
    )
}

