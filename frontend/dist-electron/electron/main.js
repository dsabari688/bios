"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
let mainWindow = null;
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
    function createWindow() {
        mainWindow = new electron_1.BrowserWindow({
            width: 1280,
            height: 800,
            minWidth: 900,
            minHeight: 600,
            title: "BIOS",
            icon: node_path_1.default.join(__dirname, "../../public/favicon.svg"),
            webPreferences: {
                preload: node_path_1.default.join(__dirname, "preload.js"),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false,
            },
            autoHideMenuBar: true,
            backgroundColor: "#020617",
        });
        const isDev = process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL;
        if (isDev) {
            const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:9000";
            mainWindow.loadURL(devUrl).catch((err) => {
                console.error("Failed to load dev URL:", devUrl, err);
            });
        }
        else {
            const indexPath = node_path_1.default.join(__dirname, "../../dist/index.html");
            mainWindow.loadFile(indexPath).catch((err) => {
                console.error("Failed to load index.html from:", indexPath, err);
            });
        }
        mainWindow.on("closed", () => {
            mainWindow = null;
        });
    }
    electron_1.app.whenReady().then(() => {
        createWindow();
        electron_1.app.on("activate", () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });
    electron_1.app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            electron_1.app.quit();
        }
    });
}
