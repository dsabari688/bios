"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose safe, minimal platform identifier without exposing raw Node APIs
electron_1.contextBridge.exposeInMainWorld("biosPlatform", {
    isElectron: true,
    platform: process.platform,
});
