import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
    children: ReactNode
    title?: string
}

export default function Layout({ children, title }: LayoutProps) {
    const location = useLocation()

    return (
        <div className="min-h-screen bg-dark-900 overflow-x-hidden">
            {/* Header */}
            <header className="bg-dark-800 border-b border-dark-700 px-4 py-3 md:px-6 md:py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0">
                        <Link to="/app" className="text-lg md:text-2xl font-bold text-white truncate">
                            Digital Shadow
                        </Link>
                        {title && (
                            <span className="hidden sm:inline text-dark-300 text-sm md:text-xl truncate">
                                / {title}
                            </span>
                        )}
                    </div>

                    <nav className="flex items-center gap-3 md:gap-6">
                        <Link
                            to="/app"
                            className={`text-xs md:text-sm font-medium transition-colors ${location.pathname === '/app'
                                ? 'text-primary-400'
                                : 'text-dark-400 hover:text-white'
                                }`}
                        >
                            Home
                        </Link>
                        <Link
                            to="/staff"
                            className={`text-xs md:text-sm font-medium transition-colors ${location.pathname.startsWith('/staff')
                                ? 'text-primary-400'
                                : 'text-dark-400 hover:text-white'
                                }`}
                        >
                            Staff
                        </Link>
                        <button
                            onClick={() => {
                                // TODO: Implement logout
                                window.location.href = '/login'
                            }}
                            className="text-xs md:text-sm font-medium text-dark-400 hover:text-white transition-colors"
                        >
                            Logout
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main content */}
            <main className="p-4 md:p-6 overflow-x-hidden">{children}</main>
        </div>
    )
}
