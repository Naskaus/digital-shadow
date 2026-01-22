export default function AnalyticsTab() {
    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Analytics</h2>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Agent Leaderboard */}
                <div className="bg-dark-900/50 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-white mb-4">
                        Agent Leaderboard
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                            <span className="text-dark-500">No data available</span>
                        </div>
                    </div>
                </div>

                {/* Girls Leaderboard */}
                <div className="bg-dark-900/50 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-white mb-4">
                        Girls Leaderboard
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                            <span className="text-dark-500">No data available</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Metrics */}
            <div className="mt-6">
                <h3 className="text-lg font-medium text-white mb-4">KPI Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Staff Days', value: '0' },
                        { label: 'Profit Sum', value: '฿0' },
                        { label: 'Profit/Day', value: '฿0' },
                        { label: 'Days Active', value: '0' },
                    ].map((metric) => (
                        <div key={metric.label} className="bg-dark-900/50 rounded-xl p-4">
                            <div className="text-dark-500 text-sm mb-1">{metric.label}</div>
                            <div className="text-white text-2xl font-bold">{metric.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
