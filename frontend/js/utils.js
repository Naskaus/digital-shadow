import CONFIG from './config.js';

const Utils = {
    formatCurrency: (value) => {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: value >= 1000 ? 0 : 2,
            maximumFractionDigits: value >= 1000 ? 0 : 2
        });
        return formatter.format(value).replace('THB', 'THB ');
    },

    formatDate: (date, formatStr = CONFIG.DISPLAY_DATE_FORMAT) => {
        if (!date) return 'N/A';
        const d = typeof date === 'string' ? new Date(date) : date;
        // Using date-fns if loaded, otherwise fallback
        if (window.dateFns) {
            return window.dateFns.format(d, formatStr);
        }
        return d.toLocaleDateString();
    },

    formatPercent: (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(value / 100);
    },

    calculateGrowth: (current, previous) => {
        if (!previous || previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    },

    showToast: (message, type = 'info') => {
        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-600'
        };

        toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300 flex items-center gap-3`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="ml-auto hover:text-gray-200" onclick="this.parentElement.remove()">✕</button>
        `;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    showSpinner: () => {
        let spinner = document.getElementById('global-spinner');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'global-spinner';
            spinner.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]';
            spinner.innerHTML = `
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
            `;
            document.body.appendChild(spinner);
        }
        spinner.classList.remove('hidden');
    },

    hideSpinner: () => {
        const spinner = document.getElementById('global-spinner');
        if (spinner) spinner.classList.add('hidden');
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

export default Utils;
