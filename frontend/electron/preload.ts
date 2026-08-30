import { contextBridge } from "electron";

// Expose safe, minimal platform identifier without exposing raw Node APIs
contextBridge.exposeInMainWorld("biosPlatform", {
  isElectron: true,
  platform: process.platform,
});
