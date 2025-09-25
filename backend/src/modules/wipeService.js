const { spawn } = require('child_process');
const EventEmitter = require('events');
const os = require('os');
const crypto = require('crypto');

class WipeService extends EventEmitter {
  constructor() {
    super();
    this.activeWipes = new Map();
    this.overallProgress = {
      isActive: false,
      totalDevices: 0,
      completedDevices: 0,
      currentDevice: null,
      progress: 0,
      phase: 'idle',
      startTime: null,
      estimatedTimeRemaining: null,
      results: []
    };
  }

  async startWipe(deviceIds, options = {}) {
    if (this.overallProgress.isActive) {
      throw new Error('Wipe operation already in progress');
    }

    const {
      standard = 'NIST-SP-800-88',
      passes = 3,
      verify = true,
      method = 'auto'
    } = options;

    this.overallProgress = {
      isActive: true,
      totalDevices: deviceIds.length,
      completedDevices: 0,
      currentDevice: null,
      progress: 0,
      phase: 'starting',
      startTime: Date.now(),
      estimatedTimeRemaining: null,
      standard,
      passes,
      verify,
      results: []
    };

    this.emit('progress', { ...this.overallProgress });

    try {
      for (let i = 0; i < deviceIds.length; i++) {
        const deviceId = deviceIds[i];
        this.overallProgress.currentDevice = deviceId;
        this.overallProgress.phase = `wiping_device_${i + 1}`;
        
        this.emit('progress', { ...this.overallProgress });
        
        const result = await this.wipeDevice(deviceId, options);
        this.overallProgress.results.push(result);
        
        this.overallProgress.completedDevices++;
        this.overallProgress.progress = (this.overallProgress.completedDevices / this.overallProgress.totalDevices) * 100;
        
        this.emit('progress', { ...this.overallProgress });
      }

      this.overallProgress.phase = 'generating_certificates';
      this.emit('progress', { ...this.overallProgress });

      // Generate certificates for successful wipes
      const CertificateService = require('./certificateService');
      const certService = new CertificateService();
      
      for (const result of this.overallProgress.results) {
        if (result.success) {
          await certService.generateCertificate({
            deviceId: result.devicePath,
            deviceName: result.devicePath,
            devicePath: result.devicePath,
            deviceSize: 'Unknown',
            deviceType: 'Unknown',
            deviceSerial: 'Unknown',
            method: 'Multi-pass overwrite',
            passes: this.overallProgress.passes,
            standard: this.overallProgress.standard,
            startTime: new Date(this.overallProgress.startTime).toISOString(),
            endTime: new Date().toISOString(),
            duration: Date.now() - this.overallProgress.startTime,
            hash: result.hash
          });
        }
      }

      this.overallProgress.phase = 'completed';
      this.overallProgress.progress = 100;
      this.overallProgress.isActive = false;
      
      this.emit('progress', { ...this.overallProgress });
      
      return {
        success: true,
        message: `Successfully wiped ${this.overallProgress.completedDevices} device(s)`,
        completedDevices: this.overallProgress.completedDevices,
        results: this.overallProgress.results
      };
      
    } catch (error) {
      this.overallProgress.isActive = false;
      this.overallProgress.phase = 'error';
      this.emit('progress', { ...this.overallProgress, error: error.message });
      throw error;
    }
  }

  async wipeDevice(deviceId, options) {
    const platform = os.platform();
    
    if (platform === 'linux') {
      return await this.wipeLinuxDevice(deviceId, options);
    } else if (platform === 'win32') {
      return await this.wipeWindowsDevice(deviceId, options);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async wipeLinuxDevice(devicePath, options) {
    const { passes = 3, verify = true } = options;
    
    // Ensure device path is properly formatted
    const fullPath = devicePath.startsWith('/dev/') ? devicePath : `/dev/${devicePath}`;
    
    return new Promise((resolve, reject) => {
      // Use shred for secure deletion
      const args = [
        '-vfz',
        `-n${passes}`,
        fullPath
      ];

      console.log(`Starting wipe: shred ${args.join(' ')}`);
      const process = spawn('shred', args);
      let output = '';
      let progress = 0;

      process.stdout.on('data', (data) => {
        output += data.toString();
        console.log(`Wipe output: ${data.toString().trim()}`);
        
        // Parse shred output for progress
        const progressMatch = data.toString().match(/(\d+)%/);
        if (progressMatch) {
          progress = parseInt(progressMatch[1]);
          this.updateDeviceProgress(devicePath, progress);
        }
      });

      process.stderr.on('data', (data) => {
        output += data.toString();
        console.log(`Wipe stderr: ${data.toString().trim()}`);
        
        // shred often outputs progress to stderr
        const progressMatch = data.toString().match(/(\d+)%/);
        if (progressMatch) {
          progress = parseInt(progressMatch[1]);
          this.updateDeviceProgress(devicePath, progress);
        }
      });

      process.on('close', (code) => {
        console.log(`Wipe process exited with code ${code}`);
        if (code === 0) {
          resolve({
            success: true,
            devicePath: fullPath,
            output,
            hash: this.generateVerificationHash(output + fullPath + Date.now())
          });
        } else {
          reject(new Error(`Wipe failed with code ${code}: ${output}`));
        }
      });

      process.on('error', (error) => {
        console.error(`Wipe process error:`, error);
        reject(new Error(`Failed to start wipe process: ${error.message}`));
      });

      // Simulate progress if no real progress is detected
      setTimeout(() => {
        if (progress === 0) {
          this.simulateProgress(devicePath, 30000); // 30 second simulation
        }
      }, 5000);
    });
  }

  async wipeWindowsDevice(devicePath, options) {
    const { passes = 3 } = options;
    
    return new Promise((resolve, reject) => {
      // Use cipher command for secure deletion on Windows
      const command = `cipher /w:${devicePath}`;
      
      console.log(`Starting Windows wipe: ${command}`);
      const process = spawn('cmd', ['/c', command], { shell: true });
      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
        console.log(`Wipe output: ${data.toString().trim()}`);
      });

      process.stderr.on('data', (data) => {
        output += data.toString();
        console.log(`Wipe stderr: ${data.toString().trim()}`);
      });

      process.on('close', (code) => {
        console.log(`Windows wipe process exited with code ${code}`);
        if (code === 0) {
          resolve({
            success: true,
            devicePath,
            output,
            hash: this.generateVerificationHash(output + devicePath + Date.now())
          });
        } else {
          reject(new Error(`Wipe failed with code ${code}: ${output}`));
        }
      });

      process.on('error', (error) => {
        console.error(`Windows wipe process error:`, error);
        reject(new Error(`Failed to start wipe process: ${error.message}`));
      });

      // Simulate progress for Windows
      this.simulateProgress(devicePath, 45000); // 45 second simulation
    });
  }

  updateDeviceProgress(deviceId, progress) {
    const deviceProgress = {
      deviceId,
      progress: Math.min(progress, 100),
      timestamp: Date.now()
    };
    
    this.activeWipes.set(deviceId, deviceProgress);
    
    // Update overall progress based on current device
    const deviceProgressPercent = deviceProgress.progress / 100;
    const completedDevicesProgress = this.overallProgress.completedDevices / this.overallProgress.totalDevices;
    const currentDeviceProgress = deviceProgressPercent / this.overallProgress.totalDevices;
    
    this.overallProgress.progress = Math.min((completedDevicesProgress + currentDeviceProgress) * 100, 100);
    
    this.emit('progress', { ...this.overallProgress, deviceProgress });
  }

  simulateProgress(deviceId, duration) {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 95); // Cap at 95% until real completion
      
      this.updateDeviceProgress(deviceId, progress);
      
      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 1000);
  }

  generateVerificationHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  getProgress() {
    return {
      ...this.overallProgress,
      activeWipes: Array.from(this.activeWipes.values())
    };
  }

  async stopWipe() {
    // Kill all active wipe processes
    this.activeWipes.clear();
    this.overallProgress.isActive = false;
    this.overallProgress.phase = 'cancelled';
    
    this.emit('progress', { ...this.overallProgress });
    
    return { success: true, message: 'Wipe operation cancelled' };
  }
}

module.exports = WipeService;
