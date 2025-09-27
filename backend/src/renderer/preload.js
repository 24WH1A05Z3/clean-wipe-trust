const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDevices: () => ipcRenderer.invoke('get-devices'),
  startWipe: (devices, options) => ipcRenderer.invoke('start-wipe', devices, options),
  getCertificates: () => ipcRenderer.invoke('get-certificates'),
  exportCertificate: (certificateId, format) => ipcRenderer.invoke('export-certificate', certificateId, format),
  verifyCertificate: (certificateId) => ipcRenderer.invoke('verify-certificate', certificateId),
  onWipeProgress: (callback) => ipcRenderer.on('wipe-progress', callback),
  removeWipeProgressListener: (callback) => ipcRenderer.removeListener('wipe-progress', callback),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window')
});
