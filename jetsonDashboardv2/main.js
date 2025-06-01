import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import "./jetson_ipsi_bulma.js"; // Ensure the scanner is imported

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win;

app.whenReady().then(() => {
    win = new BrowserWindow({
        width: 1500,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true
        }
    });

    win.loadFile("index.html");

    // Start scanning when the window is ready
    win.webContents.once("did-finish-load", () => {
        win.webContents.send("start-scanning");
    });
});




