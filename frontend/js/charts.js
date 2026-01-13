import CONFIG from './config.js';

const Charts = {
    defaults: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#9CA3AF',
                    font: { family: 'Inter' }
                }
            },
            tooltip: {
                backgroundColor: '#1F2937',
                titleColor: '#F3F4F6',
                bodyColor: '#D1D5DB',
                borderColor: '#374151',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8
            }
        },
        scales: {
            x: {
                grid: { color: '#374151', drawBorder: false },
                ticks: { color: '#9CA3AF' }
            },
            y: {
                grid: { color: '#374151', drawBorder: false },
                ticks: { color: '#9CA3AF' }
            }
        }
    },

    createBarChart(ctx, labels, datasets, options = {}) {
        return new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                ...this.defaults,
                ...options,
                plugins: {
                    ...this.defaults.plugins,
                    ...options.plugins
                }
            }
        });
    },

    createLineChart(ctx, labels, datasets, options = {}) {
        return new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                ...this.defaults,
                ...options,
                plugins: {
                    ...this.defaults.plugins,
                    ...(options.plugins || {}),
                    zoom: {
                        pan: { enabled: true, mode: 'x' },
                        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                    }
                }
            }
        });
    },

    createDonutChart(ctx, labels, data, options = {}) {
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: CONFIG.CHARTS.COLORS.chart,
                    borderColor: '#111827',
                    borderWidth: 2
                }]
            },
            options: {
                ...this.defaults,
                cutout: '70%',
                scales: {}, // Remove scales for donut
                ...options
            }
        });
    },

    createScatterChart(ctx, datasets, options = {}) {
        return new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                ...this.defaults,
                ...options
            }
        });
    }
};

export default Charts;
