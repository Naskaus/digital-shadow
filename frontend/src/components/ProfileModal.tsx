import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { profilesApi, authApi } from '../api/client'
import { X, Upload, Trash2, Phone, MessageCircle, Instagram, Facebook, Music, User, Calendar, Ruler, Weight, FileDown } from 'lucide-react'

interface ProfileModalProps {
    staffId: string
    onClose: () => void
    rank?: number
    context?: string
}

export default function ProfileModal({ staffId, onClose, rank, context }: ProfileModalProps) {
    const queryClient = useQueryClient()
    const [photoError, setPhotoError] = useState<string | null>(null)
    const [uploadSuccess, setUploadSuccess] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Job History Filters
    const [historyBar, setHistoryBar] = useState<string[]>([])
    const [historyYear, setHistoryYear] = useState<number | undefined>()
    const [historyMonth, setHistoryMonth] = useState<number | undefined>()
    const [historyPage, setHistoryPage] = useState(1)

    // Fetch current user to check admin role
    const { data: currentUser } = useQuery({
        queryKey: ['current_user'],
        queryFn: () => authApi.getMe(),
    })

    const isAdmin = currentUser?.role === 'admin'

    // Fetch profile data
    const { data: profile, isLoading, error } = useQuery({
        queryKey: ['profile', staffId],
        queryFn: () => profilesApi.getByStaffId(staffId),
        retry: 1,
    })

    // Fetch job history
    const { data: history, isLoading: historyLoading } = useQuery({
        queryKey: ['staff_history', staffId, historyBar, historyYear, historyMonth, historyPage],
        queryFn: () => profilesApi.getStaffHistory(staffId, {
            bar: historyBar.length > 0 ? historyBar : undefined,
            year: historyYear,
            month: historyMonth,
            page: historyPage,
            page_size: 20,
        }),
        enabled: !!profile,
    })

    // Close modal on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [onClose])

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setPhotoError('File size must be less than 5MB')
            return
        }

        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setPhotoError('Only JPEG, PNG, and WEBP images are allowed')
            return
        }

        try {
            setPhotoError(null)
            await profilesApi.uploadPhoto(profile!.id, file)
            setUploadSuccess(true)
            setTimeout(() => setUploadSuccess(false), 3000)
            // Invalidate profile query to refetch with updated photo
            queryClient.invalidateQueries({ queryKey: ['profile', staffId] })
        } catch (err) {
            setPhotoError(err instanceof Error ? err.message : 'Upload failed')
        }
    }

    const handlePhotoDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this photo?')) return

        try {
            setPhotoError(null)
            await profilesApi.deletePhoto(profile!.id)
            queryClient.invalidateQueries({ queryKey: ['profile', staffId] })
        } catch (err) {
            setPhotoError(err instanceof Error ? err.message : 'Delete failed')
        }
    }

    const formatMoney = (val?: number | null) =>
        val ? `฿${val.toLocaleString()}` : '-'

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    const exportProfileToPDF = async () => {
        if (!profile || !history) return
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

        doc.setFontSize(18)
        doc.text(`Profile: ${profile.name}`, 14, 20)

        doc.setFontSize(10)
        doc.text(`Staff ID: ${staffId}`, 14, 28)
        doc.text(`Position: ${profile.position || 'N/A'} | Bars: ${profile.bars.map(b => b.bar).join(', ')}`, 14, 34)

        if (history.stats) {
            doc.setFontSize(12)
            doc.text('Performance Summary', 14, 44)
            doc.setFontSize(10)
            doc.text(`Days Worked: ${history.stats.days_worked}`, 14, 50)
            doc.text(`Total Profit: THB ${history.stats.total_profit.toLocaleString()}`, 14, 56)
            doc.text(`Total Drinks: ${history.stats.total_drinks}`, 14, 62)
            doc.text(`Total Bonus: THB ${history.stats.total_bonus.toLocaleString()}`, 14, 68)
            doc.text(`Avg Bonus: THB ${history.stats.avg_bonus.toLocaleString()}`, 14, 74)
        }

        const tableData = history.items.map(row => [
            formatDate(row.date),
            row.bar,
            row.agent_label || '-',
            row.drinks || 0,
            `THB ${(row.off || 0).toLocaleString()}`,
            `THB ${(row.profit || 0).toLocaleString()}`,
            row.contract || '-'
        ])

        autoTable(doc, {
            head: [['Date', 'Bar', 'Agent', 'Drinks', 'Bonus', 'Profit', 'Contract']],
            body: tableData,
            startY: 80,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [241, 245, 249] }
        })

        doc.save(`profile-${staffId.replace(/\s/g, '_')}.pdf`)
    }

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-dark-800 rounded-2xl p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                    <p className="text-dark-400 mt-4">Loading profile...</p>
                </div>
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-dark-800 rounded-2xl p-8 max-w-md w-full">
                    <h3 className="text-xl font-bold text-white mb-4">Profile Not Found</h3>
                    <p className="text-dark-400 mb-6">
                        No profile found for staff ID: <span className="text-primary-300 font-mono">{staffId}</span>
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-dark-800 w-full md:w-[800px] md:max-w-[90vw] md:rounded-2xl shadow-2xl md:my-8 min-h-screen md:min-h-0"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-dark-800 border-b border-dark-700 px-4 md:px-6 py-4 md:rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">{profile.name}</h2>
                        <p className="text-sm text-dark-400 font-mono mt-1">{profile.staff_id}</p>
                        {rank != null && rank <= 3 && (
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xl md:text-2xl">
                                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                                </span>
                                <span className="text-sm text-slate-400">
                                    #{rank} {context || 'Overall'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportProfileToPDF}
                            disabled={!profile || !history}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm flex items-center gap-2 transition-colors"
                        >
                            <FileDown size={14} />
                            <span className="hidden md:inline">Export PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                            title="Close"
                        >
                            <X className="w-6 h-6 text-dark-400" />
                        </button>
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="p-4 md:p-6 space-y-6 max-h-[calc(100vh-80px)] md:max-h-[70vh] overflow-y-auto">
                    {/* SECTION A - Profile Info */}
                    <div className="grid md:grid-cols-[200px_1fr] gap-6">
                        {/* Photo Section */}
                        <div className="flex flex-col items-center">
                            <div className="w-[200px] h-[200px] bg-dark-900 rounded-xl overflow-hidden border-2 border-dark-700 flex items-center justify-center">
                                {profile.has_picture ? (
                                    <img
                                        src={profilesApi.getPhoto(profile.id)}
                                        alt={profile.name}
                                        className="w-full h-full object-cover"
                                        onError={() => setPhotoError('Failed to load photo')}
                                    />
                                ) : (
                                    <User className="w-20 h-20 text-dark-600" />
                                )}
                            </div>

                            {/* Admin-only photo controls */}
                            {isAdmin && (
                                <div className="mt-3 flex gap-2 w-full">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Upload
                                    </button>
                                    {profile.has_picture && (
                                        <button
                                            onClick={handlePhotoDelete}
                                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                                            title="Delete Photo"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handlePhotoUpload}
                            />

                            {/* Upload feedback */}
                            {photoError && (
                                <p className="mt-2 text-xs text-red-400 text-center">{photoError}</p>
                            )}
                            {uploadSuccess && (
                                <p className="mt-2 text-xs text-green-400 text-center">Photo uploaded!</p>
                            )}
                        </div>

                        {/* Contact Info Section */}
                        <div className="space-y-4">
                            {/* Position Badge */}
                            {profile.position && (
                                <div className="flex gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        profile.position === 'DANCER'
                                            ? 'bg-pink-600/20 text-pink-300 border border-pink-500/30'
                                            : 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                                    }`}>
                                        {profile.position}
                                    </span>
                                </div>
                            )}

                            {/* Bars */}
                            {profile.bars.length > 0 && (
                                <div>
                                    <label className="text-xs text-dark-400 uppercase font-medium">Bars</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {profile.bars.map((pb, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-dark-700 text-white text-xs rounded-md border border-dark-600"
                                            >
                                                {pb.bar}
                                                {pb.agent_key && (
                                                    <span className="ml-1 text-dark-400">({pb.agent_key.split('|')[1]})</span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Contact Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {profile.phone && (
                                    <InfoField icon={<Phone className="w-4 h-4" />} label="Phone" value={profile.phone} />
                                )}
                                {profile.line_id && (
                                    <InfoField icon={<MessageCircle className="w-4 h-4" />} label="LINE" value={profile.line_id} />
                                )}
                                {profile.instagram && (
                                    <InfoField
                                        icon={<Instagram className="w-4 h-4" />}
                                        label="Instagram"
                                        value={profile.instagram}
                                        link={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                                    />
                                )}
                                {profile.facebook && (
                                    <InfoField
                                        icon={<Facebook className="w-4 h-4" />}
                                        label="Facebook"
                                        value={profile.facebook}
                                        link={profile.facebook.startsWith('http') ? profile.facebook : `https://facebook.com/${profile.facebook}`}
                                    />
                                )}
                                {profile.tiktok && (
                                    <InfoField
                                        icon={<Music className="w-4 h-4" />}
                                        label="TikTok"
                                        value={profile.tiktok}
                                        link={`https://tiktok.com/@${profile.tiktok.replace('@', '')}`}
                                    />
                                )}
                                {profile.date_of_birth && (
                                    <InfoField
                                        icon={<Calendar className="w-4 h-4" />}
                                        label="Date of Birth"
                                        value={formatDate(profile.date_of_birth)}
                                    />
                                )}
                                {profile.size && (
                                    <InfoField icon={<Ruler className="w-4 h-4" />} label="Size" value={profile.size} />
                                )}
                                {profile.weight && (
                                    <InfoField icon={<Weight className="w-4 h-4" />} label="Weight" value={`${profile.weight} kg`} />
                                )}
                            </div>

                            {/* Notes */}
                            {profile.notes && (
                                <div>
                                    <label className="text-xs text-dark-400 uppercase font-medium">Notes</label>
                                    <p className="mt-1 text-sm text-dark-300 bg-dark-900 p-3 rounded-lg border border-dark-700">
                                        {profile.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECTION B - Job History */}
                    <div className="border-t border-dark-700 pt-6">
                        <h3 className="text-lg font-bold text-white mb-4">Job History</h3>

                        {/* KPI Statistics */}
                        {history?.stats && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
                                    <div className="text-xs text-dark-400 uppercase font-medium">Worked Days</div>
                                    <div className="text-2xl font-bold text-white mt-1">{history.stats.days_worked}</div>
                                </div>
                                <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
                                    <div className="text-xs text-dark-400 uppercase font-medium">Total Profit</div>
                                    <div className={`text-2xl font-bold mt-1 ${history.stats.total_profit >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                        ฿{history.stats.total_profit.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                                    </div>
                                    <div className="text-xs text-dark-500 mt-1">
                                        Avg: ฿{history.stats.avg_profit.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                                    </div>
                                </div>
                                <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
                                    <div className="text-xs text-dark-400 uppercase font-medium">Total Drinks</div>
                                    <div className="text-2xl font-bold text-blue-400 mt-1">{history.stats.total_drinks}</div>
                                    <div className="text-xs text-dark-500 mt-1">
                                        Avg: {history.stats.avg_drinks.toFixed(1)}
                                    </div>
                                </div>
                                <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
                                    <div className="text-xs text-dark-400 uppercase font-medium">Total Bonus</div>
                                    <div className="text-2xl font-bold text-purple-400 mt-1">
                                        ฿{history.stats.total_bonus.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                                    </div>
                                    <div className="text-xs text-dark-500 mt-1">
                                        Avg: ฿{history.stats.avg_bonus.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* History Filters */}
                        <div className="flex flex-wrap gap-3 mb-4">
                            {/* Bar Filter */}
                            <div className="flex gap-2">
                                {['MANDARIN', 'SHARK', 'RED DRAGON'].map(b => (
                                    <button
                                        key={b}
                                        onClick={() => setHistoryBar(prev =>
                                            prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
                                        )}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                            historyBar.includes(b)
                                                ? 'bg-primary-600/50 text-white border-primary-500'
                                                : 'bg-dark-700 text-dark-300 border-dark-600 hover:bg-dark-600'
                                        }`}
                                    >
                                        {b}
                                    </button>
                                ))}
                            </div>

                            {/* Year Filter */}
                            <select
                                value={historyYear || ''}
                                onChange={(e) => setHistoryYear(e.target.value ? Number(e.target.value) : undefined)}
                                className="px-3 py-1.5 bg-dark-700 text-white text-xs rounded-lg border border-dark-600"
                            >
                                <option value="">All Years</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                            </select>

                            {/* Month Filter */}
                            <select
                                value={historyMonth || ''}
                                onChange={(e) => setHistoryMonth(e.target.value ? Number(e.target.value) : undefined)}
                                className="px-3 py-1.5 bg-dark-700 text-white text-xs rounded-lg border border-dark-600"
                            >
                                <option value="">All Months</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>
                                        {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* History Table */}
                        {historyLoading ? (
                            <div className="text-center py-8 text-dark-400">Loading history...</div>
                        ) : !history || history.items.length === 0 ? (
                            <div className="text-center py-8 text-dark-400">
                                No job history found
                            </div>
                        ) : (
                            <>
                                <div className="bg-dark-900 rounded-xl overflow-hidden border border-dark-700">
                                    {/* Desktop Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-dark-800 text-dark-400 text-xs uppercase">
                                                <tr>
                                                    <th className="px-4 py-3 text-left">Date</th>
                                                    <th className="px-4 py-3 text-left">Bar</th>
                                                    <th className="px-4 py-3 text-left">Agent</th>
                                                    <th className="px-4 py-3 text-right">Drinks</th>
                                                    <th className="px-4 py-3 text-right">Salary</th>
                                                    <th className="px-4 py-3 text-right">Profit</th>
                                                    <th className="px-4 py-3 text-left">Contract</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-dark-800">
                                                {history.items.map((row) => (
                                                    <tr key={row.id} className="hover:bg-dark-800/50 transition-colors">
                                                        <td className="px-4 py-3 text-dark-300">{formatDate(row.date)}</td>
                                                        <td className="px-4 py-3 text-white font-medium">{row.bar}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                row.agent_mismatch
                                                                    ? 'bg-red-900/50 text-red-300'
                                                                    : 'bg-dark-700 text-dark-300'
                                                            }`}>
                                                                {row.agent_label || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-dark-300">{row.drinks || '-'}</td>
                                                        <td className="px-4 py-3 text-right text-dark-300">{formatMoney(row.salary)}</td>
                                                        <td className={`px-4 py-3 text-right font-bold ${
                                                            (row.profit || 0) > 0 ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                            {formatMoney(row.profit)}
                                                        </td>
                                                        <td className="px-4 py-3 text-dark-300 text-xs">{row.contract || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="md:hidden divide-y divide-dark-800">
                                        {history.items.map((row) => (
                                            <div key={row.id} className="p-4 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-white font-medium text-sm">{row.bar}</div>
                                                        <div className="text-dark-400 text-xs">{formatDate(row.date)}</div>
                                                    </div>
                                                    <div className={`text-lg font-bold ${
                                                        (row.profit || 0) > 0 ? 'text-green-400' : 'text-red-400'
                                                    }`}>
                                                        {formatMoney(row.profit)}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className={`px-2 py-0.5 rounded-full ${
                                                        row.agent_mismatch ? 'bg-red-900/50 text-red-300' : 'bg-dark-700 text-dark-300'
                                                    }`}>
                                                        {row.agent_label || '-'}
                                                    </span>
                                                    <div className="text-dark-300">
                                                        <span>🍹 {row.drinks || '-'}</span>
                                                        {row.salary && (
                                                            <span className="ml-2">Salary: {formatMoney(row.salary)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Pagination */}
                                <div className="flex justify-between items-center mt-4 text-sm">
                                    <div className="text-dark-400">
                                        Showing {(historyPage - 1) * 20 + 1} - {Math.min(historyPage * 20, history.total)} of {history.total}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                            disabled={historyPage === 1}
                                            className="px-3 py-1 bg-dark-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-600 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setHistoryPage(p => p + 1)}
                                            disabled={historyPage * 20 >= history.total}
                                            className="px-3 py-1 bg-dark-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-600 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Helper component for contact info fields
function InfoField({ icon, label, value, link }: { icon: React.ReactNode; label: string; value: string; link?: string }) {
    const content = (
        <div className="flex items-center gap-2 p-2 bg-dark-900 rounded-lg border border-dark-700">
            <div className="text-primary-400">{icon}</div>
            <div className="min-w-0">
                <div className="text-[10px] text-dark-500 uppercase">{label}</div>
                <div className="text-sm text-white truncate">{value}</div>
            </div>
        </div>
    )

    if (link) {
        return (
            <a href={link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                {content}
            </a>
        )
    }

    return content
}
