let connectionState = 'scanning';
let lastUpdateTime = Date.now();
let connectionTimeout;
let imageStreamed = false;

let dataCache = {
    cpu1: 0, cpu2: 0, cpu3: 0, cpu4: 0, cpu5: 0, cpu6: 0, gpu: 0, temp: 0, pow: 0
};

const MAX_TEMP = 100;
const MAX_POWER = 15000;

const graphsConfig = {
    'cpu-graph': { label: 'CPU Usage', color: '#3498db', data: Array(60).fill(0) },
    'gpu-graph': { label: 'GPU Usage', color: '#9b59b6', data: Array(60).fill(0) },
    'temp-graph': { label: 'Temperature', color: '#e74c3c', data: Array(60).fill(0) },
    'power-graph': { label: 'Power', color: '#2ecc71', data: Array(60).fill(0) }
};

const charts = {};

function updateConnectionStatus(status, ip) {
    const statusElement = document.getElementById('connection-status');
    if(!statusElement) return;
    
    statusElement.className = 'status-indicator ' + status;
    
    switch(status) {
        case 'scanning':
            statusElement.textContent = 'Taranıyor...';
            break;
        case 'connected':
            statusElement.textContent = `Bağlanan IP: ${ip}`;
            break;
        case 'error':
            statusElement.textContent = 'Bağlantı kaybedildi';
            break;
    }
    
    connectionState = status;
}

function initializeCharts() {
    for (const [id, config] of Object.entries(graphsConfig)) {
        const canvas = document.getElementById(id);
        if(!canvas) continue;
        const ctx = canvas.getContext('2d');
        
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

function updateLineGraph(id, value) {
    if (!charts[id]) return;
    
    graphsConfig[id].data.push(value);
    graphsConfig[id].data.shift();
    
    charts[id].data.datasets[0].data = graphsConfig[id].data;
    charts[id].update();
}

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

function startConnectionMonitor() {
    connectionTimeout = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastUpdateTime;
        if (timeSinceLastUpdate > 3000 && connectionState === 'connected') {
            updateConnectionStatus('error');
        }
    }, 3000);
}

function updateAngle(angle) {
    const rect = document.getElementById("rect");
    const angleText = document.getElementById("angle-value");
    if(rect && angleText) {
        rect.style.transform = `rotate(${angle + 90}deg)`;
        angleText.textContent = `${angle.toFixed(1)}°`;
    }
}

function initResizer(resizerId, prevPanelId, nextPanelId, direction) {
    const resizer = document.getElementById(resizerId);
    const prevPanel = document.getElementById(prevPanelId);
    const nextPanel = document.getElementById(nextPanelId);

    if(!resizer || !prevPanel || !nextPanel) return;

    let startPos = 0, startPrevFlex = 0, startNextFlex = 0;

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startPos = direction === 'horizontal' ? e.clientX : e.clientY;
        
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

            if (newPrevFlex > 5 && newNextFlex > 5) {
                prevPanel.style.flex = `${newPrevFlex} 1 0%`;
                nextPanel.style.flex = `${newNextFlex} 1 0%`;
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

function startFPSMonitor(imgId, fpsDisplayId) {
    const img = document.getElementById(imgId);
    const fpsDisplay = document.getElementById(fpsDisplayId);
    if(!img || !fpsDisplay) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    let lastPixelSum = 0;
    let localFrames = 0;

    setInterval(() => {
        fpsDisplay.textContent = `${localFrames} FPS`;
        localFrames = 0;
    }, 1000);

    function checkFrameUpdate() {
        if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, 0, 0, 16, 16);
            const imgData = ctx.getImageData(0, 0, 16, 16).data;
            
            let currentPixelSum = 0;
            for (let i = 0; i < imgData.length; i += 4) {
                currentPixelSum += imgData[i] + imgData[i+1] + imgData[i+2];
            }

            if (currentPixelSum !== lastPixelSum) {
                localFrames++;
                lastPixelSum = currentPixelSum;
            }
        }
        requestAnimationFrame(checkFrameUpdate);
    }
    
    checkFrameUpdate();
}

window.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    window.electronAPI.startScanning();
    updateConnectionStatus('scanning');
    startConnectionMonitor();
    
    initResizer('resizer-main', 'left-panel', 'right-panel', 'horizontal');
    initResizer('resizer-tl-cam', 'panel-telemetry', 'panel-camera', 'vertical');
    initResizer('resizer-cam-angle', 'panel-camera', 'panel-angle', 'vertical');
    initResizer('resizer-stat-graph', 'panel-status', 'panel-graph', 'vertical');
    initResizer('resizer-control', 'control-camera-area', 'control-joystick-area', 'vertical');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const sharedCameraContainer = document.getElementById('shared-camera-container');
    const dashboardCamArea = document.getElementById('panel-camera');
    const controlCamArea = document.getElementById('control-camera-area');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'tab-dashboard' && dashboardCamArea && sharedCameraContainer) {
                dashboardCamArea.appendChild(sharedCameraContainer);
            } else if (targetId === 'tab-control' && controlCamArea && sharedCameraContainer) {
                controlCamArea.appendChild(sharedCameraContainer);
            }
            
            window.dispatchEvent(new Event('resize'));
        });
    });
});

window.electronAPI.onJetsonData((data) => {
    if (connectionState !== 'connected') {
        updateConnectionStatus('connected', data.ip);
    }

    lastUpdateTime = Date.now();

    const el = (id) => document.getElementById(id);
    
    if(el("data-output")) el("data-output").textContent = data.epoch_time ? data.epoch_time : 'N/A';
    if(el("data-output2")) el("data-output2").textContent = data.a ? `${data.a}` : 'N/A';
    if(el("data-output3")) el("data-output3").textContent = data.curtime || 'N/A';
    if(el("data-output5")) el("data-output5").textContent = data.command || 'N/A';
    if(el("data-output6")) el("data-output6").textContent = data.sekil || 'N/A';

    if (data.angle !== undefined) {
        const angleValue = parseFloat(data.angle);
        if(el("data-output4")) el("data-output4").textContent = `${angleValue.toFixed(1)}°`;
        updateAngle(angleValue);
    } else {
        if(el("data-output4")) el("data-output4").textContent = 'N/A';
    }

    if (data.cpu1) dataCache.cpu1 = 0.7 * dataCache.cpu1 + 0.3 * parseFloat(data.cpu1);
    if (data.cpu2) dataCache.cpu2 = 0.7 * dataCache.cpu2 + 0.3 * parseFloat(data.cpu2);
    if (data.cpu3) dataCache.cpu3 = 0.7 * dataCache.cpu3 + 0.3 * parseFloat(data.cpu3);
    if (data.cpu4) dataCache.cpu4 = 0.7 * dataCache.cpu4 + 0.3 * parseFloat(data.cpu4);
    if (data.cpu5) dataCache.cpu5 = 0.7 * dataCache.cpu5 + 0.3 * parseFloat(data.cpu5);
    if (data.cpu6) dataCache.cpu6 = 0.7 * dataCache.cpu6 + 0.3 * parseFloat(data.cpu6);
    if (data.gpu) dataCache.gpu = 0.7 * dataCache.gpu + 0.3 * parseFloat(data.gpu);
    if (data.temp) dataCache.temp = 0.7 * dataCache.temp + 0.3 * parseFloat(data.temp);
    if (data.pow) dataCache.pow = 0.7 * dataCache.pow + 0.3 * parseFloat(data.pow);

    if(el("data-cpu1")) el("data-cpu1").textContent = dataCache.cpu1.toFixed(1) + '%';
    if(el("data-cpu2")) el("data-cpu2").textContent = dataCache.cpu2.toFixed(1) + '%';
    if(el("data-cpu3")) el("data-cpu3").textContent = dataCache.cpu3.toFixed(1) + '%';
    if(el("data-cpu4")) el("data-cpu4").textContent = dataCache.cpu4.toFixed(1) + '%';
    if(el("data-cpu5")) el("data-cpu5").textContent = dataCache.cpu5.toFixed(1) + '%';
    if(el("data-cpu6")) el("data-cpu6").textContent = dataCache.cpu6.toFixed(1) + '%';
    if(el("data-gpu")) el("data-gpu").textContent = dataCache.gpu.toFixed(1) + '%';
    if(el("data-temp")) el("data-temp").textContent = dataCache.temp.toFixed(1) + '°C';
    if(el("data-pow")) el("data-pow").textContent = (dataCache.pow / 1000).toFixed(2) + 'W';

    if (!imageStreamed) {
        const img1 = el("image1");
        const img2 = el("image2");
        if(img1 && img2) {
            img1.src = `http://${data.ip}:3169/stream`;
            img2.src = `http://${data.ip}:3169/stream1`;
            console.log(`Image sources set to stream and stream1`);
            
            imageStreamed = true;

            startFPSMonitor("image1", "fps-cam1");
            startFPSMonitor("image2", "fps-cam2");
        }
    }
});

setInterval(() => {
    const avgCpu = calculateAverageCpu(dataCache);
    updateLineGraph('cpu-graph', avgCpu);
    updateLineGraph('gpu-graph', dataCache.gpu);
    updateLineGraph('temp-graph', dataCache.temp);
    
    const powerPercentage = (dataCache.pow / MAX_POWER) * 100;
    updateLineGraph('power-graph', powerPercentage);
}, 1000);

window.addEventListener('beforeunload', () => {
    if (connectionTimeout) {
        clearInterval(connectionTimeout);
    }
});

const rovState = { surge: 0, sway: 0, heave: 0, roll: 0, yaw: 0 };

window.updateControl = function(axis, value) {
    rovState[axis] = value;
    console.log(`[ROV KONTROL] -> Eksen: ${axis.toUpperCase()} | Deger: ${value} | Vektor:`, JSON.stringify(rovState));
    if (window.electronAPI && window.electronAPI.sendControl) {
        window.electronAPI.sendControl(rovState);
    }
};