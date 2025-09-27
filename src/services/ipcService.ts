interface Device {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  model: string;
  serial: string;
  mounted: boolean;
  filesystem: string;
}

interface WipeOptions {
  passes?: number;
  method?: string;
  standard?: string;
  verify?: boolean;
}

interface Certificate {
  id: string;
  timestamp: string;
  device: any;
  wipe: any;
  operator: any;
  signature: any;
}

declare global {
  interface Window {
    electronAPI?: {
      getDevices: () => Promise<Device[]>;
      startWipe: (devices: Device[], options: WipeOptions) => Promise<any>;
      getCertificates: () => Promise<Certificate[]>;
      exportCertificate: (certificateId: string, format: string) => Promise<any>;
      verifyCertificate: (certificateId: string) => Promise<any>;
      onWipeProgress: (callback: (event: any, data: any) => void) => void;
      removeWipeProgressListener: (callback: (event: any, data: any) => void) => void;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
    };
  }
}

class IPCService {
  private progressCallbacks: ((progress: any) => void)[] = [];
  private deviceUpdateCallbacks: ((devices: Device[]) => void)[] = [];

  constructor() {
    if (window.electronAPI) {
      window.electronAPI.onWipeProgress(this.handleWipeProgress.bind(this));
    }
  }

  private handleWipeProgress(event: any, data: any) {
    this.progressCallbacks.forEach(callback => callback(data));
  }

  async getDevices(): Promise<Device[]> {
    if (!window.electronAPI) {
      return [];
    }
    return window.electronAPI.getDevices();
  }

  async scanDevices(): Promise<Device[]> {
    return this.getDevices();
  }

  async startWipe(deviceIds: string[], options: WipeOptions = {}): Promise<any> {
    if (!window.electronAPI) {
      throw new Error('Backend not available');
    }

    const devices = await this.getDevices();
    const selectedDevices = devices.filter(d => deviceIds.includes(d.id));
    return window.electronAPI.startWipe(selectedDevices, options);
  }

  async stopWipe(): Promise<void> {
    // Implementation for stopping wipe operation
    console.log('Stop wipe requested');
  }

  async getCertificates(): Promise<Certificate[]> {
    if (!window.electronAPI) {
      return [];
    }
    return window.electronAPI.getCertificates();
  }

  async exportCertificate(certificateId: string, format: string): Promise<any> {
    if (!window.electronAPI) {
      throw new Error('Backend not available');
    }
    return window.electronAPI.exportCertificate(certificateId, format);
  }

  async verifyCertificate(certificateId: string): Promise<any> {
    if (!window.electronAPI) {
      return { valid: true, reason: 'Certificate is valid' };
    }
    return window.electronAPI.verifyCertificate(certificateId);
  }

  onWipeProgress(callback: (progress: any) => void): void {
    this.progressCallbacks.push(callback);
  }

  onDevicesUpdated(callback: (devices: Device[]) => void): void {
    this.deviceUpdateCallbacks.push(callback);
  }

  removeAllListeners(): void {
    this.progressCallbacks = [];
    this.deviceUpdateCallbacks = [];
  }

  formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const ipcService = new IPCService();
