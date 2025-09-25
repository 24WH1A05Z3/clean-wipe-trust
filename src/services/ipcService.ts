// IPC Service for communicating with Electron backend
declare global {
  interface Window {
    electronAPI: any;
  }
}

class IPCService {
  private ipcRenderer: any;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        this.ipcRenderer = ipcRenderer;
      } catch (error) {
        console.warn('Electron IPC not available, running in browser mode');
      }
    }
  }

  // Device operations
  async getDevices() {
    if (!this.ipcRenderer) return [];
    return await this.ipcRenderer.invoke('get-devices');
  }

  async scanDevices() {
    if (!this.ipcRenderer) return [];
    return await this.ipcRenderer.invoke('scan-devices');
  }

  // Wipe operations
  async startWipe(deviceIds: string[], options: any) {
    if (!this.ipcRenderer) throw new Error('IPC not available');
    return await this.ipcRenderer.invoke('start-wipe', deviceIds, options);
  }

  async getWipeProgress() {
    if (!this.ipcRenderer) return null;
    return await this.ipcRenderer.invoke('get-wipe-progress');
  }

  async stopWipe() {
    if (!this.ipcRenderer) throw new Error('IPC not available');
    return await this.ipcRenderer.invoke('stop-wipe');
  }

  // Certificate operations
  async getCertificates() {
    if (!this.ipcRenderer) return [];
    return await this.ipcRenderer.invoke('get-certificates');
  }

  async generateCertificate(wipeData: any) {
    if (!this.ipcRenderer) throw new Error('IPC not available');
    return await this.ipcRenderer.invoke('generate-certificate', wipeData);
  }

  // Event listeners
  onDevicesUpdated(callback: (devices: any[]) => void) {
    if (!this.ipcRenderer) return;
    this.ipcRenderer.on('devices-updated', (event: any, devices: any[]) => {
      callback(devices);
    });
  }

  onWipeProgress(callback: (progress: any) => void) {
    if (!this.ipcRenderer) return;
    this.ipcRenderer.on('wipe-progress', (event: any, progress: any) => {
      callback(progress);
    });
  }

  // Remove listeners
  removeAllListeners() {
    if (!this.ipcRenderer) return;
    this.ipcRenderer.removeAllListeners('devices-updated');
    this.ipcRenderer.removeAllListeners('wipe-progress');
  }
}

export const ipcService = new IPCService();
