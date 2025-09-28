const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const DeviceService = require('../modules/DeviceService');
const WipeService = require('../modules/WipeService');
const CertificateService = require('../modules/CertificateService');

// Disable D-Bus to prevent connection errors in headless environments
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-dbus');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');

let mainWindow;
const deviceService = new DeviceService();
const wipeService = new WipeService();
const certificateService = new CertificateService();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../renderer/preload.js'),
      devTools: false  // Disable dev tools for clean UI
    },
    icon: path.join(__dirname, '../../../public/favicon.ico'),
    title: 'WipeTrust - Secure Data Erasure',
    frame: false,
    titleBarStyle: 'hidden',
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setFullScreen(true);
  });

  const isDev = process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Dev tools removed - only app window visible
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Handlers
ipcMain.handle('get-devices', async () => {
  try {
    return await deviceService.detectDevices();
  } catch (error) {
    throw new Error(`Device detection failed: ${error.message}`);
  }
});

ipcMain.handle('start-wipe', async (event, devices, options = {}) => {
  try {
    console.log('Starting wipe operation for devices:', devices.map(d => `${d.name} (${d.type})`));
    const results = [];
    let completedDevices = 0;
    
    for (const device of devices) {
      console.log(`Processing device: ${device.name} (${device.type})`);
      
      // Send initial progress
      mainWindow.webContents.send('wipe-progress', {
        isActive: true,
        totalDevices: devices.length,
        completedDevices,
        currentDevice: device.name,
        progress: 0,
        phase: 'Starting',
        startTime: Date.now(),
        estimatedTimeRemaining: null
      });
      
      try {
        const result = await wipeService.wipeDevice(device, options, (progress) => {
          mainWindow.webContents.send('wipe-progress', {
            isActive: true,
            totalDevices: devices.length,
            completedDevices,
            currentDevice: device.name,
            progress,
            phase: progress < 100 ? 'Overwriting' : 'Verifying',
            startTime: Date.now(),
            estimatedTimeRemaining: (100 - progress) * 1000
          });
        });
        
        console.log(`Wipe completed for ${device.name}:`, result);
        
        // Generate certificate after successful wipe
        try {
          console.log('Generating certificate...');
          const certificate = await certificateService.saveCertificate(result, device);
          console.log('Certificate generated:', certificate);
          result.certificateId = certificate.id;
        } catch (certError) {
          console.error('Certificate generation failed:', certError);
          // Continue without certificate
        }
        
        completedDevices++;
        results.push(result);
      } catch (deviceError) {
        console.error(`Wipe failed for device ${device.name}:`, deviceError.message);
        
        // Send error progress
        mainWindow.webContents.send('wipe-progress', {
          isActive: false,
          totalDevices: devices.length,
          completedDevices,
          currentDevice: device.name,
          progress: 0,
          phase: 'Error',
          error: deviceError.message,
          startTime: Date.now(),
          estimatedTimeRemaining: 0
        });
        
        throw deviceError; // Re-throw to be caught by outer try-catch
      }
      
      // Send completion progress (only if we have results)
      if (results.length > 0) {
        const lastResult = results[results.length - 1];
        mainWindow.webContents.send('wipe-progress', {
          isActive: completedDevices < devices.length,
          totalDevices: devices.length,
          completedDevices,
          currentDevice: completedDevices < devices.length ? devices[completedDevices].name : null,
          progress: 100,
          phase: completedDevices < devices.length ? 'Next Device' : 'Complete',
          startTime: Date.now(),
          estimatedTimeRemaining: 0,
          certificateGenerated: true,
          certificateId: lastResult.certificateId
        });
      }
    }
    
    return results;
  } catch (error) {
    throw new Error(`Wipe operation failed: ${error.message}`);
  }
});

ipcMain.handle('get-certificates', async () => {
  try {
    return await certificateService.getCertificates();
  } catch (error) {
    throw new Error(`Certificate retrieval failed: ${error.message}`);
  }
});

ipcMain.handle('export-certificate', async (event, certificateId, format) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `wipetrust-certificate-${certificateId}.${format}`,
      filters: [
        { name: format.toUpperCase(), extensions: [format] }
      ]
    });
    
    if (!result.canceled) {
      await certificateService.exportCertificate(certificateId, result.filePath, format);
      return { success: true, path: result.filePath };
    }
    return { success: false };
  } catch (error) {
    throw new Error(`Certificate export failed: ${error.message}`);
  }
});

ipcMain.handle('verify-certificate', async (event, certificateId) => {
  try {
    return await certificateService.verifyCertificate(certificateId);
  } catch (error) {
    throw new Error(`Certificate verification failed: ${error.message}`);
  }
});

// Window control handlers
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(false);
    mainWindow.setSize(1200, 800);
    mainWindow.center();
  }
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(true);
  }
});

ipcMain.handle('close-window', () => {
  app.quit();
});
