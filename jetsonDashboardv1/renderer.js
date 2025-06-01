window.electronAPI.startScanning();

window.electronAPI.onJetsonData((data) => {
    document.getElementById("data-output").textContent = `time: ${data.epoch_time}`;
    document.getElementById("data-output2").textContent = `a: ${data.a}`;
    document.getElementById("data-output3").textContent = `curtime: ${data.curtime}`;
    document.getElementById("data-output4").textContent = `angle: ${data.angle}`;
    updateAngle(data.angle); 

    if (data.frame) {
        const base64Image = data.frame.split(",")[1];
        const imageElement = document.getElementById("image");
        imageElement.src = `data:image/jpeg;base64,${base64Image}`;
    }
});