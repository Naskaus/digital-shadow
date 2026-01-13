import Auth from './auth.js';
import API from './api.js';
import Utils from './utils.js';
import Charts from './charts.js';
import Filters from './filters.js';
import CONFIG from './config.js';

// Init security
Auth.checkAuth();

const urlParams = new URLSearchParams(window.location.search);
const barSlug = urlParams.get('slug');

if (!barSlug) {
    window.location.href = 'dashboard.html';
}

let pageData = null;
let charts = {};

async function init() {
    setupEventListeners();
    initFilters();
    await fetchData();
}

function setupEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());
    document.getElementById('granularity').addEventListener('change', () => fetchData());

    document.getElementById('compare-btn').addEventListener('click', () => {
        window.location.href = `compare.html?bar=${barSlug}`;
    });

    document.getElementById('close-modal').addEventListener('click', closeModal);
}

function initFilters() {
    Filters.init(fetchData);
    Filters.setDefaults();
}

async function fetchData() {
    Utils.showSpinner();
    const filters = Filters.getValues();
    const granularity = document.getElementById('granularity').value;

    try {
        const data = await API.getBarData(barSlug, { ...filters, granularity });
        pageData = data;

        renderHeader();
        renderStats();
        renderCharts();
        renderHeatmap();
        renderTable();

    } catch (error) {
        console.error('Error fetching bar data:', error);
    } finally {
        Utils.hideSpinner();
    }
}

function renderHeader() {
    const { bar } = pageData;
    document.getElementById('header-bar-name').textContent = bar.name;
    document.getElementById('bar-title').textContent = bar.name;
    document.getElementById('bar-location').textContent = `${bar.city} - ${bar.location || 'N/A'}`;
}

function renderStats() {
    const { totals, trends } = pageData;

    updateStat('metric-sales', 'trend-sales', totals.total_sales, trends.sales_growth, true);
    updateStat('metric-profit', 'trend-profit', totals.net_profit, trends.profit_growth, true);
    updateStat('metric-eff', 'trend-eff', totals.profit_per_dancer, trends.efficiency_growth, true);

    const margin = totals.total_sales > 0 ? (totals.net_profit / totals.total_sales) * 100 : 0;
    const marginGrowth = trends.profit_growth - trends.sales_growth; // Rough approximation
    updateStat('metric-margin', 'trend-margin', margin, marginGrowth, false, '%');
}

function updateStat(id, trendId, value, growth, isCurrency, suffix = '') {
    const el = document.getElementById(id);
    const trendEl = document.getElementById(trendId);

    el.textContent = isCurrency ? Utils.formatCurrency(value) : `${value.toFixed(1)}${suffix}`;

    const isPositive = growth >= 0;
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    trendEl.className = `text-[10px] font-bold uppercase ${colorClass}`;
    trendEl.textContent = `${isPositive ? '+' : ''}${growth.toFixed(1)}% vs LY`;
}

function renderCharts() {
    const { trends, revenue_mix, correlation, expenses } = pageData;

    // Line Chart: Trends Over Time
    const trendCtx = document.getElementById('trends-chart').getContext('2d');
    if (charts.trend) charts.trend.destroy();
    charts.trend = Charts.createLineChart(trendCtx, trends.labels, trends.datasets);

    // Donut: Revenue Mix
    const revCtx = document.getElementById('rev-mix-chart').getContext('2d');
    if (charts.rev) charts.rev.destroy();
    charts.rev = Charts.createDonutChart(revCtx, revenue_mix.labels, revenue_mix.data, {
        plugins: { legend: { display: false } }
    });

    // Update legend
    const legendEl = document.getElementById('rev-mix-legend');
    legendEl.innerHTML = revenue_mix.labels.map((label, i) => `
        <div class="flex justify-between items-center text-xs">
            <span class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" style="background:${CONFIG.CHARTS.COLORS.chart[i]}"></span>
                <span class="text-gray-400">${label}</span>
            </span>
            <span class="font-bold">${revenue_mix.percentages[i]}%</span>
        </div>
    `).join('');

    // Scatter: Correlation
    const corrCtx = document.getElementById('correlation-chart').getContext('2d');
    if (charts.corr) charts.corr.destroy();
    charts.corr = Charts.createScatterChart(corrCtx, [{
        label: 'Dancers vs Profit',
        data: correlation.data,
        backgroundColor: CONFIG.CHARTS.COLORS.primary
    }], {
        scales: {
            x: { title: { display: true, text: 'Dancers Count', color: '#6B7280' } },
            y: { title: { display: true, text: 'Net Profit', color: '#6B7280' } }
        }
    });

    // Pie: Expenses
    const expCtx = document.getElementById('expense-breakdown-chart').getContext('2d');
    if (charts.exp) charts.exp.destroy();
    charts.exp = Charts.createDonutChart(expCtx, expenses.labels, expenses.data);
}

function renderHeatmap() {
    const { heatmap } = pageData;
    const tbody = document.getElementById('heatmap-body');

    tbody.innerHTML = heatmap.map(row => `
        <tr>
            <td class="p-2 border border-gray-800 bg-gray-800/20 text-[10px] font-bold text-gray-500 text-center">${row.week}</td>
            ${row.days.map(day => {
        let colorClass = 'bg-gray-900/40 text-gray-700';
        if (day.value > 0) {
            if (day.value < 10000) colorClass = 'bg-red-900/20 text-red-400 border border-red-900/50';
            else if (day.value < 20000) colorClass = 'bg-yellow-900/20 text-yellow-400 border border-yellow-900/50';
            else colorClass = 'bg-green-900/20 text-green-400 border border-green-900/50';
        }
        return `<td class="p-2 border border-gray-800 text-center text-xs font-mono font-bold ${colorClass}" title="${day.date}">
                    ${day.value > 0 ? (day.value / 1000).toFixed(1) + 'k' : '--'}
                </td>`;
    }).join('')}
            <td class="p-2 border border-gray-800 bg-blue-900/10 text-center text-xs font-mono font-bold text-blue-400">
                ${(row.total / 1000).toFixed(1)}k
            </td>
        </tr>
    `).join('');
}

function renderTable() {
    const tbody = document.getElementById('raw-data-body');
    const { reports } = pageData;

    tbody.innerHTML = reports.map(r => `
        <tr class="hover:bg-gray-800/50 transition-colors ${r.is_closed ? 'opacity-40' : ''}" onclick="showDailyDetail('${r.date}')">
            <td class="px-4 py-3 font-mono text-[11px]">${Utils.formatDate(r.date, 'yyyy-MM-dd')}</td>
            <td class="px-4 py-3 text-right font-mono">${Utils.formatCurrency(r.total_sales)}</td>
            <td class="px-4 py-3 text-right font-mono text-gray-500">${Utils.formatCurrency(r.total_expenses)}</td>
            <td class="px-4 py-3 text-right font-mono font-bold ${r.net_profit >= 0 ? 'text-green-500' : 'text-red-500'}">
                ${Utils.formatCurrency(r.net_profit)}
            </td>
            <td class="px-4 py-3 text-center font-mono">${r.dancers_count}</td>
            <td class="px-4 py-3 text-center text-[10px] font-bold uppercase">
                ${r.is_closed ? '<span class="text-red-500">Closed</span>' : '<span class="text-green-500">Open</span>'}
            </td>
        </tr>
    `).join('');
}

window.showDailyDetail = async (date) => {
    // Show modal with detail for that date
    const modal = document.getElementById('detail-modal');
    const container = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');

    modal.classList.remove('hidden');
    setTimeout(() => {
        container.classList.remove('scale-95', 'opacity-0');
    }, 10);

    const report = pageData.reports.find(r => r.date === date);
    document.getElementById('modal-title').textContent = `Details for ${Utils.formatDate(date)}`;

    content.innerHTML = `
        <div class="space-y-4">
            <h5 class="text-xs text-gray-500 font-bold uppercase tracking-widest">Revenue</h5>
            ${renderDetailRow('Lady Drinks', report.lady_drinks)}
            ${renderDetailRow('Barfines', report.barfines)}
            ${renderDetailRow('Client Sales', report.client_sales)}
            ${renderDetailRow('CC Fees', report.cc_fees)}
        </div>
        <div class="space-y-4">
            <h5 class="text-xs text-gray-500 font-bold uppercase tracking-widest">Expenses</h5>
            ${renderDetailRow('Salaries', report.salaries)}
            ${renderDetailRow('PR/Marketing', report.pr_marketing)}
            ${renderDetailRow('Miscellaneous', report.misc)}
        </div>
    `;
};

function renderDetailRow(label, value) {
    return `
        <div class="flex justify-between border-b border-gray-800 pb-2">
            <span class="text-sm text-gray-400">${label}</span>
            <span class="text-sm font-mono font-bold">${Utils.formatCurrency(value)}</span>
        </div>
    `;
}

function closeModal() {
    const modal = document.getElementById('detail-modal');
    const container = document.getElementById('modal-container');
    container.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

init();
