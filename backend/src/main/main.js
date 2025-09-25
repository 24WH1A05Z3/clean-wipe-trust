const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const DeviceService = require('../modules/deviceService');
const WipeService = require('../modules/wipeService');
const CertificateService = require('../modules/certificateService');

// Disable security warnings for development
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let mainWindow;
let deviceService;
let wipeService;
let certificateService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      sandbox: false,
      webSecurity: false
    },
    show: false,
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../../../public/favicon.ico')
  });

  // Initialize services first
  deviceService = new DeviceService();
  wipeService = new WipeService();
  certificateService = new CertificateService();
  
  setupIpcHandlers();

  // Load the frontend - wait for it to be ready
  const loadFrontend = () => {
    mainWindow.loadURL('http://localhost:8080').then(() => {
      console.log('✅ Frontend loaded successfully');
      mainWindow.show();
      
      if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
      }
    }).catch((error) => {
      console.error('❌ Failed to load frontend, retrying...', error.message);
      setTimeout(loadFrontend, 2000);
    });
  };

  // Wait a bit for frontend server to start
  setTimeout(loadFrontend, 3000);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpcHandlers() {
  // Device detection
  ipcMain.handle('get-devices', async () => {
    try {
      console.log('🔍 Getting devices...');
      const devices = await deviceService.getDevices();
      console.log(`📱 Found ${devices.length} real devices`);
      return devices;
    } catch (error) {
      console.error('❌ Error getting devices:', error.message);
      return [];
    }
  });

  ipcMain.handle('scan-devices', async () => {
    try {
      console.log('🔄 Scanning devices...');
      const devices = await deviceService.scanDevices();
      console.log(`📱 Scanned ${devices.length} real devices`);
      return devices;
    } catch (error) {
      console.error('❌ Error scanning devices:', error.message);
      return [];
    }
  });

  // Wipe operations
  ipcMain.handle('start-wipe', async (event, deviceIds, options) => {
    try {
      console.log('🚀 Starting wipe for devices:', deviceIds);
      const result = await wipeService.startWipe(deviceIds, options);
      console.log('✅ Wipe completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Error starting wipe:', error.message);
      throw error;
    }
  });

  ipcMain.handle('get-wipe-progress', async () => {
    try {
      return wipeService.getProgress();
    } catch (error) {
      console.error('❌ Error getting progress:', error.message);
      return null;
    }
  });

  ipcMain.handle('stop-wipe', async () => {
    try {
      console.log('⏹️ Stopping wipe operation');
      return wipeService.stopWipe();
    } catch (error) {
      console.error('❌ Error stopping wipe:', error.message);
      throw error;
    }
  });

  // Certificates
  ipcMain.handle('get-certificates', async () => {
    try {
      console.log('📜 Getting certificates...');
      const certificates = await certificateService.getCertificates();
      console.log(`📜 Found ${certificates.length} certificates`);
      return certificates;
    } catch (error) {
      console.error('❌ Error getting certificates:', error.message);
      return [];
    }
  });

  ipcMain.handle('generate-certificate', async (event, wipeData) => {
    try {
      console.log('📜 Generating certificate...');
      return await certificateService.generateCertificate(wipeData);
    } catch (error) {
      console.error('❌ Error generating certificate:', error.message);
      throw error;
    }
  });

  ipcMain.handle('verify-certificate', async (event, certificateId) => {
    try {
      console.log('🔐 Verifying certificate:', certificateId);
      return await certificateService.verifyCertificate(certificateId);
    } catch (error) {
      console.error('❌ Error verifying certificate:', error.message);
      throw error;
    }
  });

  ipcMain.handle('get-certificate-stats', async () => {
    try {
      return await certificateService.getStatistics();
    } catch (error) {
      console.error('❌ Error getting certificate stats:', error.message);
      return {};
    }
  });

  // Real-time updates
  wipeService.on('progress', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('wipe-progress', data);
    }
  });

  deviceService.on('device-change', (devices) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log(`📱 Device change: ${devices.length} devices`);
      mainWindow.webContents.send('devices-updated', devices);
    }
  });
}

// App event handlers
app.whenReady().then(() => {
  console.log('🚀 WipeTrust Backend Starting...');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('👋 Shutting down WipeTrust Backend');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
