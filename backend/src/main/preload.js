const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const path = require('path');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  arch: process.arch,
  version: process.versions,
  
  // System info
  getSystemInfo: () => ({
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpus: os.cpus(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    hostname: os.hostname(),
    homedir: os.homedir(),
    tmpdir: os.tmpdir()
  }),

  // IPC Communication
  invoke: (channel, ...args) => {
    const validChannels = [
      'get-platform',
      'get-app-version',
      'show-save-dialog',
      'show-open-dialog',
      'show-message-box',
      'verify-certificate',
      'scan-devices',
      'wipe-device',
      'get-wipe-status',
      'cancel-wipe',
      'generate-certificate',
      'get-wipe-history',
      'save-settings',
      'load-settings',
      'create-bootable-media',
      'verify-wipe-completion'
    ];
    
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    
    throw new Error(`Invalid channel: ${channel}`);
  },

  // Send messages
  send: (channel, ...args) => {
    const validChannels = [
      'log-message',
      'update-progress',
      'request-device-scan',
      'open-external-link'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  // Receive messages
  on: (channel, callback) => {
    const validChannels = [
      'new-session',
      'export-certificate',
      'open-scanner',
      'open-history',
      'open-settings',
      'device-connected',
      'device-disconnected',
      'wipe-progress',
      'wipe-complete',
      'wipe-error',
      'update-available',
      'update-downloaded'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // File operations
  path: {
    join: (...args) => path.join(...args),
    dirname: (p) => path.dirname(p),
    basename: (p) => path.basename(p),
    extname: (p) => path.extname(p),
    resolve: (...args) => path.resolve(...args)
  }
});

// Device operations API
contextBridge.exposeInMainWorld('deviceAPI', {
  // Scan for devices
  scanDevices: async () => {
    return await ipcRenderer.invoke('scan-devices');
  },

  // Get device details
  getDeviceInfo: async (deviceId) => {
    return await ipcRenderer.invoke('get-device-info', deviceId);
  },

  // Start wiping process
  startWipe: async (deviceId, options) => {
    return await ipcRenderer.invoke('start-wipe', deviceId, options);
  },

  // Monitor wipe progress
  onWipeProgress: (callback) => {
    ipcRenderer.on('wipe-progress', (event, progress) => callback(progress));
  },

  // Cancel wipe operation
  cancelWipe: async (deviceId) => {
    return await ipcRenderer.invoke('cancel-wipe', deviceId);
  },

  // Verify wipe completion
  verifyWipe: async (deviceId) => {
    return await ipcRenderer.invoke('verify-wipe', deviceId);
  }
});

// Certificate operations API
contextBridge.exposeInMainWorld('certificateAPI', {
  // Generate certificate
  generate: async (wipeData) => {
    return await ipcRenderer.invoke('generate-certificate', wipeData);
  },

  // Verify certificate
  verify: async (certificatePath) => {
    return await ipcRenderer.invoke('verify-certificate', certificatePath);
  },

  // Export certificate
  export: async (certificateData, format) => {
    return await ipcRenderer.invoke('export-certificate', certificateData, format);
  },

  // Sign certificate digitally
  sign: async (certificateData, privateKey) => {
    return await ipcRenderer.invoke('sign-certificate', certificateData, privateKey);
  }
});

// Storage API for settings and history
contextBridge.exposeInMainWorld('storageAPI', {
  // Get data
  get: async (key) => {
    return await ipcRenderer.invoke('storage-get', key);
  },

  // Set data
  set: async (key, value) => {
    return await ipcRenderer.invoke('storage-set', key, value);
  },

  // Delete data
  delete: async (key) => {
    return await ipcRenderer.invoke('storage-delete', key);
  },

  // Clear all data
  clear: async () => {
    return await ipcRenderer.invoke('storage-clear');
  },

  // Get all keys
  keys: async () => {
    return await ipcRenderer.invoke('storage-keys');
  }
});

// Logger API
contextBridge.exposeInMainWorld('loggerAPI', {
  info: (message, meta) => {
    ipcRenderer.send('log', 'info', message, meta);
  },
  
  warn: (message, meta) => {
    ipcRenderer.send('log', 'warn', message, meta);
  },
  
  error: (message, meta) => {
    ipcRenderer.send('log', 'error', message, meta);
  },
  
  debug: (message, meta) => {
    ipcRenderer.send('log', 'debug', message, meta);
  }
});

// Security API
contextBridge.exposeInMainWorld('securityAPI', {
  // Generate encryption keys
  generateKeys: async () => {
    return await ipcRenderer.invoke('generate-keys');
  },

  // Encrypt data
  encrypt: async (data, publicKey) => {
    return await ipcRenderer.invoke('encrypt-data', data, publicKey);
  },

  // Decrypt data
  decrypt: async (encryptedData, privateKey) => {
    return await ipcRenderer.invoke('decrypt-data', encryptedData, privateKey);
  },

  // Hash data
  hash: async (data, algorithm = 'sha256') => {
    return await ipcRenderer.invoke('hash-data', data, algorithm);
  },

  // Verify hash
  verifyHash: async (data, hash, algorithm = 'sha256') => {
    return await ipcRenderer.invoke('verify-hash', data, hash, algorithm);
  }
});