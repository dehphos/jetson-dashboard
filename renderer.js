// Track connection state
let connectionState = 'scanning';
let lastUpdateTime = Date.now();
let framesReceived = 0;
let connectionTimeout;
imageStreamed = false;

// Data storage for reducing flickering
let dataCache = {
    cpu1: 0,
    cpu2: 0,
    cpu3: 0,
    cpu4: 0,
    cpu5: 0,
    cpu6: 0,
    gpu: 0,
    temp: 0,
    pow: 0
};

// Constants for graph normalization
const MAX_TEMP = 100; // Maximum temperature in Celsius
const MAX_POWER = 15000; // Maximum power in mW (15W)

// Setup for line graphs
const graphsConfig = {
    'cpu-graph': {
        label: 'CPU Usage',
        color: '#3498db',
        data: Array(60).fill(0),
    },
    'gpu-graph': {
        label: 'GPU Usage',
        color: '#9b59b6',
        data: Array(60).fill(0),
    },
    'temp-graph': {
        label: 'Temperature',
        color: '#e74c3c',
        data: Array(60).fill(0),
    },
    'power-graph': {
        label: 'Power',
        color: '#2ecc71',
        data: Array(60).fill(0),
    }
};

// Chart instances
const charts = {};

// Connection status management
function updateConnectionStatus(status, ip) {
    const statusElement = document.getElementById('connection-status');
    statusElement.className = 'status-indicator ' + status;

    switch(status) {
        case 'scanning':
            statusElement.textContent = 'Taranıyor...';
            break;
        case 'connected':
            statusElement.textContent = `Bağlanan IP: ${ip}`;
            // statusElement.textContent = `Connected`;
            break;
        case 'error':
            statusElement.textContent = 'Bağlantı kaybedildi';
            break;
    }

    connectionState = status;
}

// Initialize charts
function initializeCharts() {
    for (const [id, config] of Object.entries(graphsConfig)) {
        const ctx = document.getElementById(id).getContext('2d');
        
        charts[id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(60).fill(''),
                datasets: [{
                    label: config.label,
                    data: config.data,
                    borderColor: config.color,
                    backgroundColor: `${config.color}20`,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0
                },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 10
                            }
                        }
                    },
                    x: {
                        display: false
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });
    }
}

// Update line graph function
function updateLineGraph(id, value) {
    if (!charts[id]) return;
    
    // Update the data array
    graphsConfig[id].data.push(value);
    graphsConfig[id].data.shift();
    
    // Update the chart
    charts[id].data.datasets[0].data = graphsConfig[id].data;
    charts[id].update();
}

// Calculate average CPU usage
function calculateAverageCpu(data) {
    const values = [
        parseFloat(data.cpu1) || 0,
        parseFloat(data.cpu2) || 0,
        parseFloat(data.cpu3) || 0,
        parseFloat(data.cpu4) || 0,
        parseFloat(data.cpu5) || 0,
        parseFloat(data.cpu6) || 0
    ];

    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

// Start connection monitoring
function startConnectionMonitor() {
    // Check if we're still receiving data every 3 seconds
    connectionTimeout = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastUpdateTime;
        if (timeSinceLastUpdate > 3000 && connectionState === 'connected') {
            updateConnectionStatus('error');
        }
    }, 3000);
}

// Update angle function
function updateAngle(angle) {
    const rect = document.getElementById("rect");
    rect.style.transform = `rotate(${angle + 90}deg)`;
    document.getElementById("angle-value").textContent = `${angle.toFixed(1)}°`;
}

// Initialize connection and charts
window.addEventListener('DOMContentLoaded', () => {
    // Initialize charts after DOM is fully loaded
    initializeCharts();
    
    // Start connection and monitoring
    window.electronAPI.startScanning();
    updateConnectionStatus('scanning');
    startConnectionMonitor();
});

// Handle data updates from Jetson
window.electronAPI.onJetsonData((data) => {
    // First data received - update status
    if (connectionState !== 'connected') {
        updateConnectionStatus('connected', data.ip);
    }

    // Update timestamp for connection monitoring
    lastUpdateTime = Date.now();

    // Update telemetry data
    document.getElementById("data-output").textContent = data.epoch_time ? data.epoch_time : 'N/A';
    document.getElementById("data-output2").textContent = data.a ? `${data.a}` : 'N/A';
    document.getElementById("data-output3").textContent = data.curtime || 'N/A';
    document.getElementById("data-output5").textContent = data.command || 'N/A';
    document.getElementById("data-output6").textContent = data.sekil || 'N/A';

    // Update angle if available with proper formatting
    if (data.angle !== undefined) {
        const angleValue = parseFloat(data.angle);
        document.getElementById("data-output4").textContent = `${angleValue.toFixed(1)}°`;
        updateAngle(angleValue);
    } else {
        document.getElementById("data-output4").textContent = 'N/A';
    }

    // Process and smooth CPU data
    if (data.cpu1) dataCache.cpu1 = 0.7 * dataCache.cpu1 + 0.3 * parseFloat(data.cpu1);
    if (data.cpu2) dataCache.cpu2 = 0.7 * dataCache.cpu2 + 0.3 * parseFloat(data.cpu2);
    if (data.cpu3) dataCache.cpu3 = 0.7 * dataCache.cpu3 + 0.3 * parseFloat(data.cpu3);
    if (data.cpu4) dataCache.cpu4 = 0.7 * dataCache.cpu4 + 0.3 * parseFloat(data.cpu4);
    if (data.cpu5) dataCache.cpu5 = 0.7 * dataCache.cpu5 + 0.3 * parseFloat(data.cpu5);
    if (data.cpu6) dataCache.cpu6 = 0.7 * dataCache.cpu6 + 0.3 * parseFloat(data.cpu6);

    // Process and smooth GPU data
    if (data.gpu) dataCache.gpu = 0.7 * dataCache.gpu + 0.3 * parseFloat(data.gpu);

    // Process and smooth temperature data
    if (data.temp) dataCache.temp = 0.7 * dataCache.temp + 0.3 * parseFloat(data.temp);

    // Process and smooth power data
    if (data.pow) dataCache.pow = 0.7 * dataCache.pow + 0.3 * parseFloat(data.pow);

    // Update status panel text
    document.getElementById("data-cpu1").textContent = dataCache.cpu1.toFixed(1) + '%';
    document.getElementById("data-cpu2").textContent = dataCache.cpu2.toFixed(1) + '%';
    document.getElementById("data-cpu3").textContent = dataCache.cpu3.toFixed(1) + '%';
    document.getElementById("data-cpu4").textContent = dataCache.cpu4.toFixed(1) + '%';
    document.getElementById("data-cpu5").textContent = dataCache.cpu5.toFixed(1) + '%';
    document.getElementById("data-cpu6").textContent = dataCache.cpu6.toFixed(1) + '%';
    document.getElementById("data-gpu").textContent = dataCache.gpu.toFixed(1) + '%';
    document.getElementById("data-temp").textContent = dataCache.temp.toFixed(1) + '°C';
    document.getElementById("data-pow").textContent = (dataCache.pow / 1000).toFixed(2) + 'W';

    // Update image if available
    if (!imageStreamed) {
        const img = document.getElementById("image");
        img.src = `http://${data.ip}:3169/stream`;
        console.log(`Image source set to: http://${data.ip}:3169/stream`);
        imageStreamed = true;
    }
    const img = document.getElementById("image");
    img.addEventListener("load", () => {
    
    framesReceived++;
console.log(`Image loaded, frames received: ${framesReceived}`);    
});     
});
// Function to calculate and display FPS
function calculateFPS() {
  setInterval(() => {
    document.getElementById("fps-counter").textContent = `${framesReceived} FPS`;
    framesReceived = 0;  // sayacı sıfırla
  }, 1000);
}

// Update graphs every second
setInterval(() => {
    // Calculate average CPU and update graphs
    const avgCpu = calculateAverageCpu(dataCache);
    updateLineGraph('cpu-graph', avgCpu);
    updateLineGraph('gpu-graph', dataCache.gpu);

    // For temperature, keep scale 0-100
    updateLineGraph('temp-graph', dataCache.temp);

    // Normalize power to 0-100 range
    const powerPercentage = (dataCache.pow / MAX_POWER) * 100;
    updateLineGraph('power-graph', powerPercentage);
}, 1000);

// Start FPS calculation
calculateFPS();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (connectionTimeout) {
        clearInterval(connectionTimeout);
    }
});