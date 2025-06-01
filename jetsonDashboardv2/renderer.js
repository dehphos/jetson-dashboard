// Track connection state
let connectionState = 'scanning';
let lastUpdateTime = Date.now();
frameCount = 0;
let framesReceived = 0;
let connectionTimeout;

// Connection status management
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    statusElement.className = 'status-indicator ' + status;
    
    switch(status) {
        case 'scanning':
            statusElement.textContent = 'Scanning...';
            break;
        case 'connected':
            statusElement.textContent = 'Connected';
            break;
        case 'error':
            statusElement.textContent = 'Connection Lost';
            break;
    }
    
    connectionState = status;
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

// Initialize connection
window.electronAPI.startScanning();
updateConnectionStatus('scanning');
startConnectionMonitor();

// Handle data updates from Jetson
window.electronAPI.onJetsonData((data) => {
    // First data received - update status
    if (connectionState !== 'connected') {
        updateConnectionStatus('connected');
    }
    
    // Update timestamp for connection monitoring
    lastUpdateTime = Date.now();
    
    // Update telemetry data
    document.getElementById("data-output").textContent = data.epoch_time ? data.epoch_time: 'N/A';
    document.getElementById("data-output2").textContent = data.a ? `${data.a}`: 'N/A';
    document.getElementById("data-output3").textContent = data.curtime || 'N/A';
    
    // Update angle if available with proper formatting
    if (data.angle !== undefined) {
        const angleValue = parseFloat(data.angle);
        document.getElementById("data-output4").textContent = `${angleValue.toFixed(1)}°`;
        updateAngle(angleValue);
    } else {
        document.getElementById("data-output4").textContent = 'N/A';
    }
    
    // Additional data fields (placeholders for now)
    document.getElementById("data-cpu1").textContent = data.cpu1 || 'Not available';
    document.getElementById("data-cpu2").textContent = data.cpu2 || 'Not available';
    document.getElementById("data-cpu3").textContent = data.cpu3 || 'Not available';
    document.getElementById("data-cpu4").textContent = data.cpu4 || 'Not available';
    document.getElementById("data-gpu").textContent = data.gpu || '0';
    document.getElementById("data-temp").textContent = data.temp || 'Not available';
    document.getElementById("data-pow").textContent = `${data.pow/1000}W` || 'Not available';
    
    // Update image if available
    if (data.frame) {
        try {
            const imageElement = document.getElementById("image");
            imageElement.src = data.frame;
            framesReceived++;
        } catch (error) {
            console.error("Error updating image:", error);
        }
    }
});

// Function to calculate and display FPS
function calculateFPS() {
    setInterval(() => {
        const fps = framesReceived;
        document.getElementById("fps-counter").textContent = `${fps} FPS`;
        framesReceived = 0;
    }, 1000);
}

// Start FPS calculation
calculateFPS();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (connectionTimeout) {
        clearInterval(connectionTimeout);
    }
});