const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    onJetsonData: (callback) => ipcRenderer.on("jetson-data", (_, data) => callback(data)),
    startScanning: () => ipcRenderer.invoke("start-scanning"),
});