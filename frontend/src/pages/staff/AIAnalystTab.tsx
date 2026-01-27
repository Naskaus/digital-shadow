import { useState, useRef, useEffect } from 'react'
import { aiAnalystApi, ChatMessage } from '../../api/client'
import { Loader2, Send, MessageSquare, Filter, TrendingUp, AlertCircle, Sparkles } from 'lucide-react'

// Constants
const BARS = ['MANDARIN', 'SHARK', 'RED DRAGON']
const YEARS = [2025, 2026]
const MONTHS = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
]

// Interfaces for Insights
interface InsightMetrics {
    total_staff: number | string
    underperformers_count: number | string
    trend_7d?: string
}

interface AgentBonusStatus {
    agent: string
    bonus_tier: string
    bar: string
    avg_staff: number | string
}

interface AnalystInsights {
    key_metrics?: InsightMetrics
    agents_bonus_status?: AgentBonusStatus[]
    type?: string
    filters_applied?: Record<string, unknown>
    suggestions?: string[]
    [key: string]: unknown
}

export default function AIAnalystTab() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [insights, setInsights] = useState<AnalystInsights | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Context filters
    const now = new Date()
    const [selectedBar, setSelectedBar] = useState<string>('')
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
    const [showFilters, setShowFilters] = useState(false)

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Load chat history from localStorage on mount
    useEffect(() => {
        const savedMessages = localStorage.getItem('ai-analyst-chat-history')
        if (savedMessages) {
            try {
                setMessages(JSON.parse(savedMessages))
            } catch (err) {
                console.error('Failed to load chat history', err)
            }
        }
    }, [])

    // Save chat history to localStorage
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('ai-analyst-chat-history', JSON.stringify(messages))
        }
    }, [messages])

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return

        const userMessage: ChatMessage = {
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date().toISOString(),
        }

        setMessages(prev => [...prev, userMessage])
        setInputValue('')
        setIsLoading(true)
        setError(null)

        try {
            const response = await aiAnalystApi.query({
                message: userMessage.content,
                context_filters: {
                    bar: selectedBar || undefined,
                    year: selectedYear,
                    month: selectedMonth,
                },
                conversation_history: messages,
            })

            if (!response) {
                throw new Error('No response received from AI Analyst service')
            }

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response.message,
                timestamp: response.timestamp,
            }

            setMessages(prev => [...prev, assistantMessage])
            // Cast the loose Record<string, unknown> to our specific interface
            if (response.insights) {
                setInsights(response.insights as unknown as AnalystInsights)
            } else {
                setInsights(null)
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get response'
            setError(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const clearChat = () => {
        setMessages([])
        setInsights(null)
        localStorage.removeItem('ai-analyst-chat-history')
    }

    return (
        <div className="flex flex-col h-full bg-dark-900 text-white min-h-[calc(100vh-140px)]">
            {/* Header */}
            <div className="p-4 border-b border-dark-700 bg-dark-800 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">AI Analyst</h2>
                        <p className="text-xs text-dark-400">Ask questions about staff & agent performance</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${showFilters
                                ? 'bg-primary-600 text-white'
                                : 'bg-dark-900 border border-dark-600 text-dark-400 hover:text-white'
                            }`}
                    >
                        <Filter size={16} />
                        Filters
                    </button>

                    {/* Clear Chat */}
                    <button
                        onClick={clearChat}
                        disabled={messages.length === 0}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-dark-900 border border-dark-600 text-dark-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Clear Chat
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="p-4 border-b border-dark-700 bg-dark-850">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm text-dark-400">Context:</span>

                        {/* Bar Selector */}
                        <select
                            value={selectedBar}
                            onChange={(e) => setSelectedBar(e.target.value)}
                            className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
                        >
                            <option value="">All Bars</option>
                            {BARS.map(bar => <option key={bar} value={bar}>{bar}</option>)}
                        </select>

                        {/* Year Selector */}
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
                        >
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>

                        {/* Month Selector */}
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
                        >
                            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>

                        <span className="text-xs text-dark-500 ml-auto">
                            These filters apply to your AI queries
                        </span>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-dark-400">
                                <MessageSquare size={48} className="mb-4 opacity-50" />
                                <p className="text-center">
                                    Ask me anything about staff performance,<br />
                                    agent comparisons, or trends in the data.
                                </p>
                                <div className="mt-6 space-y-2 text-sm">
                                    <p className="text-dark-500">Try asking:</p>
                                    <ul className="space-y-1 text-left">
                                        <li>• "Who are the top 5 performers this month?"</li>
                                        <li>• "Compare profit trends between bars"</li>
                                        <li>• "Show me agent performance breakdown"</li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === 'user'
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-dark-700 text-dark-100'
                                            }`}
                                    >
                                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                                        {msg.timestamp && (
                                            <div className="text-xs opacity-60 mt-1">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-dark-700 rounded-lg px-4 py-3 flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-sm text-dark-300">Analyzing...</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex justify-center">
                                <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 flex items-center gap-2 text-red-400">
                                    <AlertCircle size={16} />
                                    <span className="text-sm">{error}</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-dark-700">
                        <div className="flex gap-2">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask a question about performance data..."
                                disabled={isLoading}
                                className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                rows={2}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className="px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-dark-500 mt-2">
                            Press Enter to send, Shift+Enter for new line
                        </p>
                    </div>
                </div>

                {/* Insights Panel */}
                {insights && (
                    <div className="w-80 hidden lg:block">
                        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 h-full overflow-y-auto">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={18} className="text-primary-500" />
                                <h3 className="font-semibold">Insights</h3>
                            </div>

                            <div className="space-y-4 text-sm">
                                {/* Key Metrics */}
                                {insights.key_metrics && (
                                    <div>
                                        <h4 className="text-dark-400 text-xs uppercase mb-2">Key Metrics</h4>
                                        <div className="space-y-2">
                                            <div className="bg-dark-900 rounded-lg p-3">
                                                <div className="text-dark-400 text-xs mb-1">Total Staff</div>
                                                <div className="text-lg font-semibold">{insights.key_metrics.total_staff}</div>
                                            </div>
                                            <div className="bg-dark-900 rounded-lg p-3">
                                                <div className="text-dark-400 text-xs mb-1">Underperformers</div>
                                                <div className="text-lg font-semibold text-red-400">
                                                    {insights.key_metrics.underperformers_count}
                                                </div>
                                            </div>
                                            <div className="bg-dark-900 rounded-lg p-3">
                                                <div className="text-dark-400 text-xs mb-1">7-Day Trend</div>
                                                <div className={`text-lg font-semibold ${insights.key_metrics.trend_7d?.startsWith('+')
                                                        ? 'text-green-400'
                                                        : 'text-red-400'
                                                    }`}>
                                                    {insights.key_metrics.trend_7d}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Agents Bonus Tracking */}
                                {insights.agents_bonus_status && Array.isArray(insights.agents_bonus_status) &&
                                    insights.agents_bonus_status.length > 0 && (
                                        <div>
                                            <h4 className="text-dark-400 text-xs uppercase mb-2">Agent Bonus Status</h4>
                                            <div className="space-y-2">
                                                {insights.agents_bonus_status.map((agent: AgentBonusStatus, idx: number) => (
                                                    <div key={idx} className="bg-dark-900 rounded-lg p-3">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-medium text-white">{agent.agent}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded ${agent.bonus_tier === '40K'
                                                                    ? 'bg-purple-900/50 text-purple-300'
                                                                    : agent.bonus_tier === '30K'
                                                                        ? 'bg-blue-900/50 text-blue-300'
                                                                        : agent.bonus_tier === '20K'
                                                                            ? 'bg-green-900/50 text-green-300'
                                                                            : 'bg-dark-700 text-dark-400'
                                                                }`}>
                                                                {agent.bonus_tier}
                                                            </span>
                                                        </div>
                                                        <div className="text-dark-400 text-xs">
                                                            {agent.bar} • {agent.avg_staff} staff/day avg
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                {/* Summary Stats for Stub Mode */}
                                {insights.type === 'stub' && (
                                    <>
                                        {/* Filters Applied */}
                                        {insights.filters_applied && (
                                            <div>
                                                <h4 className="text-dark-400 text-xs uppercase mb-2">Filters Applied</h4>
                                                <div className="bg-dark-900 rounded-lg p-3 space-y-1">
                                                    {Object.entries(insights.filters_applied).map(([key, value]) => (
                                                        <div key={key} className="flex justify-between">
                                                            <span className="text-dark-400 capitalize">{key}:</span>
                                                            <span className="text-white">{String(value) || 'All'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Suggestions */}
                                        {insights.suggestions && Array.isArray(insights.suggestions) && (
                                            <div>
                                                <h4 className="text-dark-400 text-xs uppercase mb-2">Suggestions</h4>
                                                <ul className="space-y-2">
                                                    {insights.suggestions.map((suggestion, idx) => (
                                                        <li key={idx} className="text-dark-300 text-xs">
                                                            • {suggestion}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
