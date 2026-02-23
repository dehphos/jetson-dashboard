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

// Update dual images if available
    if (!imageStreamed) {
        const img1 = document.getElementById("image1");
        const img2 = document.getElementById("image2");
        
        img1.src = `http://${data.ip}:3169/stream`;
        img2.src = `http://${data.ip}:3169/stream1`;
        console.log(`Image sources set to stream and stream1`);
        
        imageStreamed = true;

        startFPSMonitor("image1", "fps-cam1");
        startFPSMonitor("image2", "fps-cam2");
    }
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
// --- YENİ EKLENEN RESIZE (SÜRÜKLE BIRAK BOYUTLANDIRMA) MANTIĞI ---

function initResizer(resizerId, prevPanelId, nextPanelId, direction) {
    const resizer = document.getElementById(resizerId);
    const prevPanel = document.getElementById(prevPanelId);
    const nextPanel = document.getElementById(nextPanelId);
    let startPos = 0, startPrevFlex = 0, startNextFlex = 0;

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startPos = direction === 'horizontal' ? e.clientX : e.clientY;
        
        // Mevcut yüzdelik flex değerlerini hesapla
        const parentSize = direction === 'horizontal' 
            ? resizer.parentElement.getBoundingClientRect().width 
            : resizer.parentElement.getBoundingClientRect().height;
            
        startPrevFlex = (prevPanel.getBoundingClientRect()[direction === 'horizontal' ? 'width' : 'height'] / parentSize) * 100;
        startNextFlex = (nextPanel.getBoundingClientRect()[direction === 'horizontal' ? 'width' : 'height'] / parentSize) * 100;

        resizer.classList.add('dragging');
        document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';

        const mouseMoveHandler = (e) => {
            const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
            const diff = currentPos - startPos;
            const diffPercentage = (diff / parentSize) * 100;

            let newPrevFlex = startPrevFlex + diffPercentage;
            let newNextFlex = startNextFlex - diffPercentage;

            // Panellerin tamamen kapanmasını engellemek için minimum %5 sınır
            if (newPrevFlex > 5 && newNextFlex > 5) {
                prevPanel.style.flex = `${newPrevFlex} 1 0%`;
                nextPanel.style.flex = `${newNextFlex} 1 0%`;
                
                // Chart.js grafiklerinin boyut değişimine anında tepki vermesini sağla
                // window.dispatchEvent(new Event('resize'));
            }
        };

        const mouseUpHandler = () => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            resizer.classList.remove('dragging');
            document.body.style.cursor = 'default';
            window.dispatchEvent(new Event('resize'));
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    });
}

// DOM yüklendikten sonra Resizer'ları etkinleştiriyoruz
window.addEventListener('DOMContentLoaded', () => {
    // Mevcut kodunuz buradaydı (initializeCharts vs.)
    
    // Ana dikey ayırıcı (Sol / Sağ)
    initResizer('resizer-main', 'left-panel', 'right-panel', 'horizontal');
    
    // Sol panel içi yatay ayırıcılar
    initResizer('resizer-tl-cam', 'panel-telemetry', 'panel-camera', 'vertical');
    initResizer('resizer-cam-angle', 'panel-camera', 'panel-angle', 'vertical');
    
    // Sağ panel içi yatay ayırıcı
    initResizer('resizer-stat-graph', 'panel-status', 'panel-graph', 'vertical');
});

// --- YENİ: İstemci Tarafı (Frontend) FPS Sayacı ---
function startFPSMonitor(imgId, fpsDisplayId) {
    const img = document.getElementById(imgId);
    const fpsDisplay = document.getElementById(fpsDisplayId);
    
    // İşlemciyi yormamak için 16x16 piksellik minicik görünmez bir tuval (canvas) oluşturuyoruz
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    let lastPixelSum = 0;
    let framesReceived = 0;

    // Her saniye ekrandaki yazıyı güncelle ve sayacı sıfırla
    setInterval(() => {
        fpsDisplay.textContent = `${framesReceived} FPS`;
        framesReceived = 0;
    }, 1000);

    // Ekranın kendi yenilenme hızında (yaklaşık saniyede 60 kez) çalışacak kontrol döngüsü
    function checkFrameUpdate() {
        if (img.complete && img.naturalWidth > 0) {
            // Görüntüyü o minicik alana çizdirip piksel renk verilerini çekiyoruz
            ctx.drawImage(img, 0, 0, 16, 16);
            const imgData = ctx.getImageData(0, 0, 16, 16).data;
            
            let currentPixelSum = 0;
            // Piksellerin renk değerlerini toplayarak o kareye ait eşsiz bir "renk imzası" oluşturuyoruz
            for (let i = 0; i < imgData.length; i += 4) {
                currentPixelSum += imgData[i] + imgData[i+1] + imgData[i+2];
            }

            // Eğer kameranın yeni imzesi, bir önceki imzeyle aynı değilse yeni bir kare gelmiştir!
            if (currentPixelSum !== lastPixelSum) {
                framesReceived++;
                lastPixelSum = currentPixelSum;
            }
        }
        // Döngüyü tekrar çağır
        requestAnimationFrame(checkFrameUpdate);
    }
    
    // Sistemi başlat
    checkFrameUpdate();
}