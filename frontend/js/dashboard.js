import Auth from './auth.js';
import API from './api.js';
import Utils from './utils.js';
import Charts from './charts.js';
import Filters from './filters.js';
import CONFIG from './config.js';

// Init security
Auth.checkAuth();

let dashboardData = null;
let cityChart = null;
let revenueChart = null;
let currentSort = { column: 'profit', direction: 'desc' };

async function init() {
    setupEventListeners();
    await loadInitialData();
    Filters.init(updateDashboard);
    Filters.setDefaults();

    // Initial load
    await updateDashboard(Filters.getValues());
}

async function loadInitialData() {
    try {
        const locations = await API.getLocations();
        renderBarSelector(locations);
    } catch (err) {
        console.error('Failed to load locations', err);
    }
}

function renderBarSelector(locations) {
    const selector = document.getElementById('dashboard-bar-selector');
    if (!selector) return;

    // Group bars by city
    const cityGroups = locations.reduce((acc, bar) => {
        if (!acc[bar.city]) acc[bar.city] = [];
        acc[bar.city].push(bar);
        return acc;
    }, {});

    selector.innerHTML = Object.entries(cityGroups).map(([city, bars]) => `
        <div class="city-group flex flex-col gap-2">
            <div class="flex items-center gap-2 border-b border-gray-800 pb-1 mb-1">
                <input type="checkbox" id="city-${city}" class="city-toggle accent-primary w-3 h-3 cursor-pointer" checked>
                <label for="city-${city}" class="text-[10px] font-black uppercase text-gray-400 tracking-widest cursor-pointer hover:text-white transition-colors">
                    ${city}
                </label>
            </div>
            <div class="flex flex-wrap gap-2">
                ${bars.map(bar => `
                    <label class="inline-flex items-center cursor-pointer group">
                        <input type="checkbox" name="bar-filter" value="${bar.slug}" data-city="${city}" class="sr-only peer bar-checkbox" checked>
                        <div class="px-3 py-1 bg-gray-800/40 rounded border border-gray-700 text-[10px] font-bold text-gray-500 uppercase tracking-widest peer-checked:bg-primary peer-checked:border-primary peer-checked:text-white peer-checked:glow-primary transition-all group-hover:border-gray-500">
                            ${bar.name}
                        </div>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');

    // City toggle logic
    document.querySelectorAll('.city-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const city = e.target.id.replace('city-', '');
            document.querySelectorAll(`.bar-checkbox[data-city="${city}"]`).forEach(cb => {
                cb.checked = e.target.checked;
            });
            // Trigger update manually because it's a structural change
            updateDashboard(Filters.getValues());
        });
    });

    // Bar sync logic
    document.querySelectorAll('.bar-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const city = e.target.dataset.city;
            const cityToggle = document.getElementById(`city-${city}`);
            const cityBars = document.querySelectorAll(`.bar-checkbox[data-city="${city}"]`);
            const allChecked = Array.from(cityBars).every(c => c.checked);
            cityToggle.checked = allChecked;
            cityToggle.indeterminate = !allChecked && Array.from(cityBars).some(c => c.checked);

            updateDashboard(Filters.getValues());
        });
    });
}

function setupEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

    // Table sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'desc';
            }
            renderTable();
        });
    });
}

async function updateDashboard(filters) {
    Utils.showSpinner();
    try {
        const [summary, locations] = await Promise.all([
            API.getSummary(filters),
            API.getLocations()
        ]);

        dashboardData = summary;
        // Merge locations metadata if needed
        dashboardData.locations = locations;

        renderStats();
        renderCharts();
        renderTable();

    } catch (error) {
        console.error('Failed to update dashboard:', error);
    } finally {
        Utils.hideSpinner();
    }
}

function renderStats() {
    const { totals, trends } = dashboardData;

    updateStat('stat-total-sales', 'trend-sales', totals.total_sales, trends.sales_growth);
    updateStat('stat-total-expenses', 'trend-expenses', totals.total_expenses, trends.expenses_growth);
    updateStat('stat-net-profit', 'trend-profit', totals.net_profit, trends.profit_growth);
}

function updateStat(id, trendId, value, growth) {
    const el = document.getElementById(id);
    const trendEl = document.getElementById(trendId);

    el.textContent = Utils.formatCurrency(value);

    const isPositive = growth >= 0;
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    const arrow = isPositive ? '↑' : '↓';

    trendEl.className = `text-sm font-semibold flex items-center gap-1 ${colorClass}`;
    trendEl.innerHTML = `${Math.abs(growth).toFixed(1)}% <span>${arrow}</span>`;
}

function renderCharts() {
    const { city_comparison, revenue_breakdown } = dashboardData;

    // City Comparison Chart
    const cityCtx = document.getElementById('city-comparison-chart').getContext('2d');
    if (cityChart) cityChart.destroy();

    cityChart = Charts.createBarChart(cityCtx,
        city_comparison.labels,
        city_comparison.datasets.map((ds, i) => ({
            ...ds,
            backgroundColor: i === 0 ? CONFIG.CHARTS.COLORS.primary : CONFIG.CHARTS.COLORS.success,
            borderRadius: 6
        }))
    );

    // Revenue Breakdown Donut
    const revCtx = document.getElementById('revenue-breakdown-chart').getContext('2d');
    if (revenueChart) revenueChart.destroy();

    revenueChart = Charts.createDonutChart(revCtx,
        revenue_breakdown.labels,
        revenue_breakdown.data
    );
}

function renderTable() {
    const tbody = document.getElementById('top-performers-body');
    let bars = [...dashboardData.bars];

    // Sorting logic
    bars.sort((a, b) => {
        let valA, valB;
        switch (currentSort.column) {
            case 'name': valA = a.name; valB = b.name; break;
            case 'city': valA = a.city; valB = b.city; break;
            case 'sales': valA = a.total_sales; valB = b.total_sales; break;
            case 'profit': valA = a.net_profit; valB = b.net_profit; break;
            case 'efficiency': valA = a.profit_per_dancer; valB = b.profit_per_dancer; break;
        }

        if (currentSort.direction === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });

    tbody.innerHTML = bars.map(bar => `
        <tr class="hover:bg-gray-800/40 transition-colors group">
            <td class="px-6 py-4">
                <div class="font-medium text-white">${bar.name}</div>
                <div class="text-xs text-gray-500">${bar.location || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 text-center text-sm">
                <span class="px-2 py-1 rounded bg-gray-700 text-gray-300 text-[10px] font-bold uppercase tracking-wider">${bar.city}</span>
            </td>
            <td class="px-6 py-4 text-right font-mono text-sm">${Utils.formatCurrency(bar.total_sales)}</td>
            <td class="px-6 py-4 text-right font-mono text-sm">
                <span class="${bar.net_profit >= 0 ? 'text-green-500' : 'text-red-500'} font-bold">
                    ${Utils.formatCurrency(bar.net_profit)}
                </span>
            </td>
            <td class="px-6 py-4 text-right font-mono text-sm text-gray-400">${Utils.formatCurrency(bar.profit_per_dancer)}</td>
            <td class="px-6 py-4 text-center">
                <a href="bar.html?slug=${bar.slug}" class="inline-flex items-center gap-1 bg-gray-700 hover:bg-primary text-white text-xs px-3 py-1.5 rounded-lg transition-all transform active:scale-95">
                    View <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </a>
            </td>
        </tr>
    `).join('');
}

// Start the page
init();
