import Auth from './auth.js';
import API from './api.js';
import Utils from './utils.js';
import Charts from './charts.js';
import CONFIG from './config.js';

// Init security
Auth.checkAuth();

let bars = [];
let chart = null;
let currentMode = 'bar-vs-bar';

async function init() {
    setupEventListeners();
    await loadBars();

    // Check for pre-filled bar from URL
    const urlParams = new URLSearchParams(window.location.search);
    const preBar = urlParams.get('bar');
    if (preBar) {
        const checkbox = document.querySelector(`input[value="${preBar}"]`);
        if (checkbox) checkbox.checked = true;
    }

    // Set default dates
    const currentYear = new Date().getFullYear();
    document.getElementById('start-date').value = `${currentYear}-01-01`;
    document.getElementById('end-date').value = `${currentYear}-12-31`;
}

function setupEventListeners() {
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('bg-primary', 'text-white'));
            document.querySelectorAll('.mode-tab').forEach(t => t.classList.add('text-gray-400'));
            tab.classList.remove('text-gray-400');
            tab.classList.add('bg-primary', 'text-white');

            currentMode = tab.dataset.mode;
            document.getElementById('bar-vs-bar-inputs').classList.toggle('hidden', currentMode !== 'bar-vs-bar');
            document.getElementById('yoy-inputs').classList.toggle('hidden', currentMode !== 'yoy');

            document.getElementById('compare-results').classList.add('hidden');
            document.getElementById('empty-state').classList.remove('hidden');
        });
    });

    document.getElementById('compare-bar-btn').addEventListener('click', runBarComparison);
    document.getElementById('compare-yoy-btn').addEventListener('click', runYOYComparison);
}

async function loadBars() {
    try {
        bars = await API.getLocations();
        const selector = document.getElementById('bar-selector');
        const yoySelect = document.getElementById('yoy-bar-select');

        // Group bars by city
        const cityGroups = bars.reduce((acc, bar) => {
            if (!acc[bar.city]) acc[bar.city] = [];
            acc[bar.city].push(bar);
            return acc;
        }, {});

        selector.innerHTML = Object.entries(cityGroups).map(([city, cityBars]) => `
            <div class="city-group mb-4 w-full">
                <div class="flex items-center gap-2 mb-2 pb-1 border-b border-gray-800">
                    <input type="checkbox" id="city-${city}" class="city-toggle accent-primary w-4 h-4">
                    <label for="city-${city}" class="text-[10px] font-black uppercase text-gray-500 tracking-tighter cursor-pointer hover:text-primary transition-colors">
                        ${city} (Select All)
                    </label>
                </div>
                <div class="flex flex-wrap gap-2">
                    ${cityBars.map(bar => `
                        <label class="inline-flex items-center cursor-pointer group">
                            <input type="checkbox" name="bar-compare" value="${bar.slug}" data-city="${city}" class="sr-only peer bar-checkbox">
                            <div class="px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700 text-xs font-bold text-gray-500 uppercase peer-checked:bg-primary peer-checked:border-primary peer-checked:text-white peer-checked:glow-primary transition-all group-hover:border-gray-500">
                                ${bar.name}
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Handle city toggle logic
        document.querySelectorAll('.city-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const city = e.target.id.replace('city-', '');
                const checkboxes = document.querySelectorAll(`.bar-checkbox[data-city="${city}"]`);
                checkboxes.forEach(cb => cb.checked = e.target.checked);
            });
        });

        // Handle individual bar checkbox logic to sync city toggle
        document.querySelectorAll('.bar-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const city = e.target.dataset.city;
                const cityToggle = document.getElementById(`city-${city}`);
                const allCityCheckboxes = document.querySelectorAll(`.bar-checkbox[data-city="${city}"]`);
                const allChecked = Array.from(allCityCheckboxes).every(c => c.checked);
                cityToggle.checked = allChecked;
                cityToggle.indeterminate = !allChecked && Array.from(allCityCheckboxes).some(c => c.checked);
            });
        });

        yoySelect.innerHTML = bars.map(bar => `
            <option value="${bar.slug}">${bar.name}</option>
        `).join('');

    } catch (err) {
        console.error('Failed to load bars', err);
    }
}

async function runBarComparison() {
    const selectedBars = Array.from(document.querySelectorAll('input[name="bar-compare"]:checked')).map(cb => cb.value);
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;

    if (selectedBars.length === 0) return Utils.showToast('Select at least one bar', 'warning');
    if (selectedBars.length > 8) return Utils.showToast('Max 8 bars allowed', 'warning');

    Utils.showSpinner();
    try {
        const data = await API.compare({ bars: selectedBars.join(','), start_date: start, end_date: end });
        renderResults(data);
    } catch (err) {
        console.error(err);
    } finally {
        Utils.hideSpinner();
    }
}

async function runYOYComparison() {
    const bar = document.getElementById('yoy-bar-select').value;
    const year1 = document.getElementById('year1').value;
    const year2 = document.getElementById('year2').value;

    Utils.showSpinner();
    try {
        const data = await API.compareYoY({ bar, year1, year2 });
        renderResults(data);
    } catch (err) {
        console.error(err);
    } finally {
        Utils.hideSpinner();
    }
}

function renderResults(data) {
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('compare-results').classList.remove('hidden');

    renderSummary(data.summary);
    renderChart(data.chart);
    renderTable(data.table);
}

function renderSummary(summary) {
    const el = document.getElementById('compare-summary');
    el.innerHTML = summary.map(item => `
        <div class="glass p-5 rounded-2xl">
            <span class="text-[10px] font-bold text-gray-500 uppercase">${item.label}</span>
            <div class="flex items-baseline gap-2 mt-1">
                <h4 class="text-xl font-bold">${Utils.formatCurrency(item.value)}</h4>
                <span class="text-[10px] text-gray-500">${item.sub}</span>
            </div>
            <div class="mt-2 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                <div class="h-full bg-primary" style="width: ${item.percent}%"></div>
            </div>
        </div>
    `).join('');
}

function renderChart(chartData) {
    const ctx = document.getElementById('compare-chart').getContext('2d');
    if (chart) chart.destroy();

    chart = Charts.createLineChart(ctx, chartData.labels, chartData.datasets.map((ds, i) => ({
        ...ds,
        borderColor: CONFIG.CHARTS.COLORS.chart[i],
        backgroundColor: CONFIG.CHARTS.COLORS.chart[i] + '20',
        fill: true,
        tension: 0.4
    })));
}

function renderTable(tableData) {
    const head = document.getElementById('compare-table-head');
    const body = document.getElementById('compare-table-body');

    head.innerHTML = `
        <tr>
            <th class="px-6 py-4">Metric</th>
            ${tableData.headers.map(h => `<th class="px-6 py-4 text-right">${h}</th>`).join('')}
        </tr>
    `;

    body.innerHTML = tableData.rows.map(row => `
        <tr class="hover:bg-gray-800/40 transition-colors">
            <td class="px-6 py-4 font-bold text-gray-400">${row.label}</td>
            ${row.values.map(v => `<td class="px-6 py-4 text-right font-mono">${typeof v === 'number' ? Utils.formatCurrency(v) : v}</td>`).join('')}
        </tr>
    `).join('');
}

init();
