const { contextBridge, ipcRenderer } = require('electron');

console.log('NEW PRELOAD SCRIPT LOADED!');

// Expose the electronAPI that the frontend expects
contextBridge.exposeInMainWorld('electronAPI', {
  // Device operations
  getDevices: async () => {
    console.log('getDevices called from preload');
    return await ipcRenderer.invoke('get-devices');
  },

  startWipe: async (devices, options) => {
    console.log('startWipe called from preload with devices:', devices);
    return await ipcRenderer.invoke('start-wipe', devices, options);
  },

  getCertificates: async () => {
    return await ipcRenderer.invoke('get-certificates');
  },

  exportCertificate: async (certificateId, format) => {
    return await ipcRenderer.invoke('export-certificate', certificateId, format);
  },

  verifyCertificate: async (certificateId) => {
    return await ipcRenderer.invoke('verify-certificate', certificateId);
  },

  onWipeProgress: (callback) => {
    ipcRenderer.on('wipe-progress', (event, data) => callback(event, data));
  },

  removeWipeProgressListener: (callback) => {
    ipcRenderer.removeListener('wipe-progress', callback);
  },

  minimizeWindow: async () => {
    return await ipcRenderer.invoke('minimize-window');
  },

  maximizeWindow: async () => {
    return await ipcRenderer.invoke('maximize-window');
  },

  closeWindow: async () => {
    return await ipcRenderer.invoke('close-window');
  }
});
