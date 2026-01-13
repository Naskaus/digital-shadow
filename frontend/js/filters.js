import Utils from './utils.js';

const Filters = {
    init(callback) {
        this.callback = callback;
        this.setupEventListeners();
    },

    setupEventListeners() {
        const triggers = ['input[name="year"]', '#start-date', '#end-date'];

        // Listen for changes on main filters
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="year"], #start-date, #end-date, input[name="bar-filter"], .city-toggle')) {
                Utils.debounce(() => this.callback(this.getValues()), 300)();
            }
        });
    },

    getValues() {
        // Multi-year selector
        const yearCheckboxes = document.querySelectorAll('input[name="year"]:checked');
        const years = Array.from(yearCheckboxes).map(cb => cb.value);

        // Multi-bar selector
        const barCheckboxes = document.querySelectorAll('input[name="bar-filter"]:checked');
        const bars = Array.from(barCheckboxes).map(cb => cb.value);

        return {
            years: years.join(','),
            bars: bars.join(','),
            start_date: document.getElementById('start-date')?.value,
            end_date: document.getElementById('end-date')?.value,
        };
    },

    setDefaults() {
        const currentYear = new Date().getFullYear();
        const start = `${currentYear}-01-01`;
        const end = `${currentYear}-12-31`;

        if (document.getElementById('start-date')) document.getElementById('start-date').value = start;
        if (document.getElementById('end-date')) document.getElementById('end-date').value = end;

        // Check current year by default
        const cb = document.querySelector(`input[name="year"][value="${currentYear}"]`);
        if (cb) cb.checked = true;
    }
};

export default Filters;
