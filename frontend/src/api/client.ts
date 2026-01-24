/**
 * API client for backend communication.
 */

const API_BASE = '/api'

interface ApiError {
    detail: string
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T | null> {
    const url = `${API_BASE}${endpoint}`

    const config: RequestInit = {
        ...options,
        credentials: 'include', // Include cookies for JWT auth
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    }

    const response = await fetch(url, config)

    if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
            detail: 'An error occurred',
        }))
        throw new Error(error.detail)
    }

    // Handle empty responses
    const text = await response.text()
    return text ? JSON.parse(text) : null
}

export const api = {
    get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

    post: <T>(endpoint: string, data?: unknown) =>
        request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: <T>(endpoint: string, data?: unknown) =>
        request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    patch: <T>(endpoint: string, data?: unknown) =>
        request<T>(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
}

// Auth API
export const authApi = {
    login: (username: string, password: string) =>
        api.post<{ access_token: string }>('/auth/login', { username, password }),

    logout: () => api.post('/auth/logout'),

    register: (username: string, email: string, password: string) =>
        api.post('/auth/register', { username, email, password }),

    getMe: () => api.get<User>('/auth/me'),
}

// Rows API
export interface FactRow {
    id: number
    business_key: string
    source_year: number
    bar: string
    date: string
    agent_label: string | null
    staff_id: string
    position: string | null
    salary: number | null
    profit: number | null
    drinks: number | null
    off: number | null
    total: number | null
    agent_mismatch: boolean
}

export interface RowsKPI {
    total_rows: number
    total_profit: number
    total_drinks: number
    avg_profit: number
    unique_staff: number
}

const buildQuery = (params: Record<string, string | string[] | number | number[] | undefined | null>) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return
        if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)))
        } else {
            searchParams.append(key, String(value))
        }
    })
    return searchParams.toString()
}

export const rowsApi = {
    list: (params?: Record<string, string | string[] | number | number[] | undefined | null>) =>
        api.get<FactRow[]>(`/rows?${buildQuery(params || {})}`),

    getKpis: (params?: Record<string, string | string[] | number | number[] | undefined | null>) =>
        api.get<RowsKPI>(`/rows/kpis?${buildQuery(params || {})}`),
}

// Import API
export interface ImportRun {
    id: number
    started_at: string
    completed_at: string | null
    status: 'PENDING' | 'RUNNING' | 'STAGED' | 'COMPLETED' | 'FAILED'
    mode: 'FULL' | 'INCREMENTAL'
    source_year: number
    rows_fetched: number
    rows_inserted: number
    rows_updated: number
    rows_unchanged: number
    rows_errored: number
    checksum: string | null
    error_message: string | null
}

export interface ImportError {
    id: number
    sheet_row_number: number
    error_type: string
    error_message: string
    row_data: Record<string, unknown> | null
    created_at: string
}

export const importApi = {
    run: (sources: number[], mode: 'FULL' | 'INCREMENTAL' = 'FULL', dry_run: boolean = true) =>
        api.post<ImportRun[]>('/import/run', { sources, mode, dry_run }),

    commit: (runId: number) =>
        api.post<ImportRun>(`/import/runs/${runId}/commit`),

    delete: (runId: number) =>
        api.delete<void>(`/import/runs/${runId}`),

    listRuns: (limit = 50, offset = 0) =>
        api.get<ImportRun[]>(`/import/runs?limit=${limit}&offset=${offset}`),

    getRun: (id: number) => api.get<ImportRun>(`/import/runs/${id}`),

    getErrors: (runId: number, limit = 100, offset = 0) =>
        api.get<ImportError[]>(`/import/runs/${runId}/errors?limit=${limit}&offset=${offset}`),

    getMismatches: (runId: number, limit = 100, offset = 0) =>
        api.get<FactRow[]>(`/import/runs/${runId}/mismatches?limit=${limit}&offset=${offset}`),
}

// Settings API
export interface DataSource {
    id: number
    year: number
    sheet_id: string
    tab_name: string
    range_spec: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface DataSourceInput {
    year: number
    sheet_id: string
    tab_name: string
    range_spec: string
    is_active: boolean
}

export interface AgentRangeRule {
    id: number
    bar: string
    agent_id: number
    range_start: number
    range_end: number
    created_at: string
    updated_at: string
}

export const settingsApi = {
    // Sheet Discovery
    discoverSheets: () => api.get<{ id: string; name: string; tabs: string[] }[]>('/settings/sheets/discover'),

    // Data Sources
    listSources: () => api.get<DataSource[]>('/settings/sources'),

    getSource: (year: number) => api.get<DataSource>(`/settings/sources/${year}`),

    createSource: (data: DataSourceInput) =>
        api.post<DataSource>('/settings/sources', data),

    updateSource: (year: number, data: DataSourceInput) =>
        api.put<DataSource>(`/settings/sources/${year}`, data),

    deleteSource: (year: number) =>
        api.delete<{ status: string; year: number }>(`/settings/sources/${year}`),

    // Agent Range Rules
    listAgentRules: (bar?: string) =>
        api.get<AgentRangeRule[]>(`/settings/agent-rules${bar ? `?bar=${bar}` : ''}`),

    createAgentRule: (data: { bar: string; agent_id: number; range_start: number; range_end: number }) =>
        api.post<AgentRangeRule>('/settings/agent-rules', data),

    deleteAgentRule: (ruleId: number) =>
        api.delete<{ status: string; id: number }>(`/settings/agent-rules/${ruleId}`),
}

// Users API
export interface User {
    id: number
    username: string
    email: string
    role: 'admin' | 'viewer'
    is_active: boolean
    created_at: string
}

export interface UserCreateInput {
    email: string
    password: string
    role: 'admin' | 'viewer'
}

export interface UserUpdateInput {
    email?: string
    role?: 'admin' | 'viewer'
    is_active?: boolean
}

export const usersApi = {
    getAll: () => api.get<User[]>('/users'),

    create: (data: UserCreateInput) =>
        api.post<User>('/users', data),

    update: (userId: number, data: UserUpdateInput) =>
        api.patch<User>(`/users/${userId}`, data),

    resetPassword: (userId: number, password: string) =>
        api.put<User>(`/users/${userId}/password`, { password }),

    delete: (userId: number) =>
        api.delete<void>(`/users/${userId}`),
}

// Analytics API
export interface AgentPayroll {
    agent_id: string
    agent_name: string
    bar: string
    pool_active: number
    pool_total: number
    bonus_a_total: number
    bonus_b_total: number
    avg_daily_staff: number
    days_counted: number
    days_remaining: number
    current_tier: number
    next_tier_target: number | null
    bonus_c_amount: number
    total_estimate: number
}

export interface PayrollResponse {
    agents: AgentPayroll[]
    period_start: string
    period_end: string
}

export interface LeaderboardEntry {
    rank: number
    id: string
    name: string
    bar: string | null
    agent_id: number | null
    profit: number
    drinks: number
    days: number
    rentability: number
}

export interface LeaderboardResponse {
    entries: LeaderboardEntry[]
}

export const analyticsApi = {
    getPayroll: (startDate: string, endDate: string, bar?: string) =>
        api.get<PayrollResponse>(`/analytics/payroll?start_date=${startDate}&end_date=${endDate}${bar ? `&bar=${bar}` : ''}`),

    getLeaderboard: (
        type: 'STAFF' | 'AGENT',
        mode: 'ALL' | 'TOP10' | 'FLOP10',
        sortBy: 'PROFIT' | 'DRINKS' | 'DAYS',
        search?: string,
        bar?: string,
        year?: number,
        month?: number
    ) => {
        const params = new URLSearchParams()
        params.append('type', type)
        params.append('mode', mode)
        params.append('sort_by', sortBy)
        if (search) params.append('search', search)
        if (bar) params.append('bar', bar)
        if (year) params.append('year', String(year))
        if (month) params.append('month', String(month))
        return api.get<LeaderboardResponse>(`/analytics/leaderboard?${params.toString()}`)
    }
}
