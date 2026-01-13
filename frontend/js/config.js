const CONFIG = {
    API_BASE_URL: '',
    AUTH_KEY: 'ds_authenticated',
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
    CHARTS: {
        COLORS: {
            primary: '#2563EB',   // blue-600
            success: '#10B981',   // green-500
            danger: '#EF4444',    // red-500
            warning: '#F59E0B',   // yellow-500
            info: '#3B82F6',      // blue-500
            bangkok: '#06B6D4',   // cyan-500
            panama: '#F97316',    // orange-500
            gray: {
                800: '#1F2937',
                900: '#111827'
            },
            chart: [
                '#2563EB', '#10B981', '#F59E0B', '#EF4444',
                '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
            ]
        }
    },
    DATE_FORMAT: 'yyyy-MM-dd',
    DISPLAY_DATE_FORMAT: 'MMM d, yyyy'
};

export default CONFIG;
