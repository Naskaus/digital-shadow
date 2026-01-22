import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

interface AppCard {
    title: string
    description: string
    href: string
    icon: string
    available: boolean
}

const apps: AppCard[] = [
    {
        title: 'Staff Performance',
        description: 'Import data, view analytics, and manage staff records',
        href: '/staff',
        icon: '👥',
        available: true,
    },
    {
        title: 'Accounting',
        description: 'Financial reports and accounting management',
        href: '/accounting',
        icon: '💰',
        available: false,
    },
]

export default function Landing() {
    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome to Digital Shadow
                    </h1>
                    <p className="text-dark-400">
                        Select an application to get started
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {apps.map((app) => (
                        <div
                            key={app.title}
                            className={`relative bg-dark-800 rounded-2xl p-6 border transition-all ${app.available
                                    ? 'border-dark-700 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10 cursor-pointer'
                                    : 'border-dark-800 opacity-50'
                                }`}
                        >
                            {app.available ? (
                                <Link to={app.href} className="absolute inset-0" />
                            ) : (
                                <div className="absolute top-4 right-4 bg-dark-700 text-dark-400 text-xs px-2 py-1 rounded-full">
                                    Coming Soon
                                </div>
                            )}

                            <div className="text-4xl mb-4">{app.icon}</div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {app.title}
                            </h2>
                            <p className="text-dark-400 text-sm">{app.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    )
}
