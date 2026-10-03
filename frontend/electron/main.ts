import { app, BrowserWindow } from "electron";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  function createWindow() {
    const iconPath = path.join(app.getAppPath(), "public/icons/icon-512.png");

    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      title: "BIOS",
      icon: iconPath,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      autoHideMenuBar: true,
      backgroundColor: "#020617",
      show: true,
    });

    const isDev = process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL;

    if (isDev) {
      const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:9000";
      mainWindow.loadURL(devUrl).catch((err) => {
        console.error("Failed to load dev URL:", devUrl, err);
      });
    } else {
      const indexPath = path.join(app.getAppPath(), "dist/index.html");
      mainWindow.loadFile(indexPath).catch((err) => {
        console.error("Failed to load index.html from:", indexPath, err);
        // Fallback relative to __dirname
        const fallbackPath = path.join(__dirname, "../../dist/index.html");
        mainWindow?.loadFile(fallbackPath).catch((fallbackErr) => {
          console.error("Failed fallback load:", fallbackErr);
        });
      });
    }

    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
      console.error("[electron] Failed to load:", errorCode, errorDescription);
    });

    mainWindow.once("ready-to-show", () => {
      mainWindow?.show();
      mainWindow?.focus();
    });

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  }

  app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

