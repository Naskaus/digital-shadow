import Auth from './auth.js';
import API from './api.js';
import Utils from './utils.js';

// Init security
Auth.checkAuth();

let selectedFile = null;
let previewData = null;

async function init() {
    setupEventListeners();
}

function setupEventListeners() {
    const fileInput = document.getElementById('file-input');
    const previewBtn = document.getElementById('preview-btn');
    const importBtn = document.getElementById('import-btn');

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            document.getElementById('filename').textContent = selectedFile.name;
            document.getElementById('file-info').classList.remove('hidden');
            previewBtn.disabled = false;
        }
    });

    previewBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        Utils.showSpinner();
        try {
            // In a real app, we'd send the file to a preview endpoint
            // Here we'll simulate the analysis
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('preview', 'true');

            const response = await API.importData(formData);
            previewData = response;

            renderPreview();
            goToStep(2);
        } catch (err) {
            console.error(err);
        } finally {
            Utils.hideSpinner();
        }
    });

    importBtn.addEventListener('click', () => {
        const replace = document.getElementById('replace-data').checked;
        if (replace) {
            document.getElementById('confirm-modal').classList.remove('hidden');
        } else {
            runImport();
        }
    });

    // Confirmation logic
    const confirmInput = document.getElementById('confirm-input');
    const finalBtn = document.getElementById('final-import-btn');

    confirmInput.addEventListener('input', (e) => {
        finalBtn.disabled = e.target.value !== 'CONFIRM DELETE';
    });

    document.getElementById('cancel-confirm').addEventListener('click', () => {
        document.getElementById('confirm-modal').classList.add('hidden');
        confirmInput.value = '';
        finalBtn.disabled = true;
    });

    document.getElementById('final-import-btn').addEventListener('click', () => {
        document.getElementById('confirm-modal').classList.add('hidden');
        runImport(true);
    });

    document.querySelectorAll('.prev-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const current = parseInt(document.querySelector('.step-marker[data-step] div.bg-primary').parentElement.dataset.step);
            goToStep(current - 1);
        });
    });
}

function goToStep(step) {
    document.querySelectorAll('section[id^="step-"]').forEach(s => s.classList.add('hidden'));
    document.getElementById(`step-${step}`).classList.remove('hidden');

    // Update markers
    document.querySelectorAll('.step-marker').forEach(marker => {
        const s = parseInt(marker.dataset.step);
        const circle = marker.querySelector('div');
        const label = marker.querySelector('span');

        if (s < step) {
            circle.className = 'w-10 h-10 rounded-full bg-green-500 flex items-center justify-center font-bold text-white border-4 border-gray-900';
            circle.innerHTML = '✓';
            label.className = 'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-green-500';
        } else if (s === step) {
            circle.className = 'w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white border-4 border-gray-900';
            circle.innerHTML = s;
            label.className = 'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-primary';
        } else {
            circle.className = 'w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-500 border-4 border-gray-900';
            circle.innerHTML = s;
            label.className = 'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase font-bold text-gray-500';
        }
    });
}

function renderPreview() {
    const stats = [
        { label: 'Total Rows', value: previewData.total_rows },
        { label: 'Date Range', value: `${previewData.start_date} to ${previewData.end_date}` },
        { label: 'Bars Detected', value: previewData.bars_count },
        { label: 'Warnings', value: previewData.warnings.length, color: 'text-yellow-500' }
    ];

    document.getElementById('validation-stats').innerHTML = stats.map(s => `
        <div class="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
            <div class="text-[10px] font-bold text-gray-500 uppercase">${s.label}</div>
            <div class="text-lg font-bold ${s.color || 'text-white'}">${s.value}</div>
        </div>
    `).join('');

    document.getElementById('validation-alerts').innerHTML = previewData.warnings.map(w => `
        <div class="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-xs font-medium">
            <span>⚠️</span> ${w}
        </div>
    `).join('');

    // Table Preview
    const headers = Object.keys(previewData.sample[0]);
    document.getElementById('preview-headers').innerHTML = headers.map(h => `<th class="px-3 py-2 border-r border-gray-800">${h}</th>`).join('');

    document.getElementById('preview-body').innerHTML = previewData.sample.map(row => `
        <tr>
            ${headers.map(h => `<td class="px-3 py-2 border-r border-gray-800 truncate max-w-[100px]">${row[h]}</td>`).join('')}
        </tr>
    `).join('');
}

async function runImport(replace = false) {
    goToStep(3);
    const progressRing = document.getElementById('progress-ring');
    const statusText = document.getElementById('import-status-text');

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('replace', replace.toString());
        formData.append('calc_totals', document.getElementById('calc-totals').checked.toString());

        // Simulate progress for UI effect
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            if (progress > 90) clearInterval(interval);
            progressRing.style.clipPath = `polygon(0 0, ${progress}% 0, ${progress}% 100%, 0 100%)`;
        }, 100);

        const response = await API.importData(formData);

        clearInterval(interval);
        progressRing.style.clipPath = `polygon(0 0, 100% 0, 100% 100%, 0 100%)`;

        setTimeout(() => {
            document.getElementById('import-loading').classList.add('hidden');
            document.getElementById('import-success').classList.remove('hidden');
            document.getElementById('import-summary').textContent = `Successfully imported ${response.imported_count} records across ${response.bars_count} bars.`;
        }, 500);

    } catch (err) {
        statusText.textContent = "Import Failed";
        statusText.classList.add('text-red-500');
        document.getElementById('import-detail-text').textContent = err.message;
    }
}

init();
