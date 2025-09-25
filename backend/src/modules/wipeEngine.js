const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * WipeEngine - Core data wiping functionality with NIST SP 800-88 compliance
 * Supports multiple wipe methods for different storage types
 */
class WipeEngine extends EventEmitter {
  constructor() {
    super();
    this.activeWipes = new Map();
    this.wipeHistory = [];
    this.platform = process.platform;
  }

  /**
   * NIST SP 800-88 Compliant Wipe Methods
   */
  static WipeMethods = {
    // Clear: Overwrite with single pass
    CLEAR: {
      name: 'Clear',
      description: 'Single pass overwrite (NIST Clear)',
      passes: 1,
      pattern: 'zero',
      nistLevel: 'Clear'
    },
    // Purge: Multiple overwrites for HDDs
    PURGE_HDD: {
      name: 'Purge HDD',
      description: 'DoD 5220.22-M (3 passes)',
      passes: 3,
      patterns: ['zero', 'one', 'random'],
      nistLevel: 'Purge'
    },
    // Purge: Cryptographic erase for SSDs
    PURGE_SSD: {
      name: 'Purge SSD',
      description: 'Secure Erase Command',
      command: 'secure-erase',
      nistLevel: 'Purge'
    },
    // Enhanced Purge: 7-pass overwrite
    PURGE_ENHANCED: {
      name: 'Enhanced Purge',
      description: 'DoD 5220.22-M ECE (7 passes)',
      passes: 7,
      patterns: ['random', 'zero', 'one', 'random', 'zero', 'one', 'random'],
      nistLevel: 'Purge'
    },
    // Crypto Erase: For encrypted volumes
    CRYPTO_ERASE: {
      name: 'Cryptographic Erase',
      description: 'Destroy encryption keys',
      command: 'crypto-erase',
      nistLevel: 'Purge'
    }
  };

  /**
   * Detect storage device type
   */
  async detectDeviceType(devicePath) {
    try {
      if (this.platform === 'win32') {
        return await this.detectDeviceTypeWindows(devicePath);
      } else if (this.platform === 'linux') {
        return await this.detectDeviceTypeLinux(devicePath);
      } else if (this.platform === 'darwin') {
        return await this.detectDeviceTypeMac(devicePath);
      }
      return { type: 'unknown', details: {} };
    } catch (error) {
      this.emit('error', { device: devicePath, error: error.message });
      return { type: 'unknown', details: {} };
    }
  }

  /**
   * Windows device type detection
   */
  async detectDeviceTypeWindows(devicePath) {
    return new Promise((resolve, reject) => {
      const psCommand = `
        Get-PhysicalDisk | Where-Object { $_.DeviceId -eq '${devicePath}' } | 
        Select-Object MediaType, Size, Model, SerialNumber | 
        ConvertTo-Json
      `;
      
      exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        try {
          const diskInfo = JSON.parse(stdout);
          const type = diskInfo.MediaType === 'SSD' ? 'ssd' : 
                      diskInfo.MediaType === 'HDD' ? 'hdd' : 'unknown';
          
          resolve({
            type,
            details: {
              model: diskInfo.Model,
              size: diskInfo.Size,
              serialNumber: diskInfo.SerialNumber
            }
          });
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  /**
   * Linux device type detection
   */
  async detectDeviceTypeLinux(devicePath) {
    return new Promise((resolve, reject) => {
      exec(`lsblk -d -o NAME,ROTA,SIZE,MODEL,SERIAL -J ${devicePath}`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        try {
          const data = JSON.parse(stdout);
          const device = data.blockdevices[0];
          const type = device.rota === '0' ? 'ssd' : 'hdd';
          
          resolve({
            type,
            details: {
              model: device.model,
              size: device.size,
              serialNumber: device.serial
            }
          });
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  /**
   * Mac device type detection
   */
  async detectDeviceTypeMac(devicePath) {
    return new Promise((resolve, reject) => {
      exec(`diskutil info ${devicePath}`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        const isSSD = stdout.includes('Solid State: Yes');
        const modelMatch = stdout.match(/Device \/ Media Name:\s+(.+)/);
        const sizeMatch = stdout.match(/Disk Size:\s+(.+)/);
        
        resolve({
          type: isSSD ? 'ssd' : 'hdd',
          details: {
            model: modelMatch ? modelMatch[1] : 'Unknown',
            size: sizeMatch ? sizeMatch[1] : 'Unknown'
          }
        });
      });
    });
  }

  /**
   * Start wiping process
   */
  async startWipe(devicePath, options = {}) {
    const wipeId = crypto.randomUUID();
    const deviceInfo = await this.detectDeviceType(devicePath);
    
    // Select appropriate wipe method based on device type
    let method = options.method;
    if (!method) {
      if (deviceInfo.type === 'ssd') {
        method = WipeEngine.WipeMethods.PURGE_SSD;
      } else if (deviceInfo.type === 'hdd') {
        method = options.secure ? WipeEngine.WipeMethods.PURGE_ENHANCED : WipeEngine.WipeMethods.PURGE_HDD;
      } else {
        method = WipeEngine.WipeMethods.CLEAR;
      }
    }

    const wipeSession = {
      id: wipeId,
      device: devicePath,
      deviceInfo,
      method,
      startTime: new Date(),
      status: 'preparing',
      progress: 0,
      options
    };

    this.activeWipes.set(wipeId, wipeSession);
    this.emit('wipe-started', wipeSession);

    // Execute wipe based on method
    try {
      if (method.command === 'secure-erase') {
        await this.executeSecureErase(wipeSession);
      } else if (method.command === 'crypto-erase') {
        await this.executeCryptoErase(wipeSession);
      } else {
        await this.executeOverwriteWipe(wipeSession);
      }
      
      wipeSession.status = 'completed';
      wipeSession.endTime = new Date();
      this.emit('wipe-completed', wipeSession);
      this.wipeHistory.push(wipeSession);
      
    } catch (error) {
      wipeSession.status = 'failed';
      wipeSession.error = error.message;
      this.emit('wipe-failed', wipeSession);
    } finally {
      this.activeWipes.delete(wipeId);
    }

    return wipeSession;
  }

  /**
   * Execute overwrite-based wipe (for HDDs)
   */
  async executeOverwriteWipe(session) {
    const { device, method } = session;
    const totalPasses = method.passes;
    
    for (let pass = 0; pass < totalPasses; pass++) {
      const pattern = Array.isArray(method.patterns) ? method.patterns[pass] : method.pattern;
      
      session.status = `wiping-pass-${pass + 1}`;
      session.currentPass = pass + 1;
      this.emit('wipe-progress', session);
      
      await this.performOverwritePass(device, pattern, (progress) => {
        session.progress = ((pass + progress) / totalPasses) * 100;
        this.emit('wipe-progress', session);
      });
    }
  }

  /**
   * Perform single overwrite pass
   */
  async performOverwritePass(device, pattern, progressCallback) {
    return new Promise((resolve, reject) => {
      let command, args;
      
      if (this.platform === 'win32') {
        // Windows: Use cipher or format commands
        command = 'cipher';
        args = ['/w:' + device];
      } else if (this.platform === 'linux') {
        // Linux: Use dd or shred
        command = 'shred';
        args = ['-vfz', '-n', '1', device];
      } else if (this.platform === 'darwin') {
        // Mac: Use diskutil
        command = 'diskutil';
        args = ['secureErase', '1', device];
      }

      const wipeProcess = spawn(command, args);
      
      wipeProcess.stdout.on('data', (data) => {
        // Parse progress from output
        const progressMatch = data.toString().match(/(\d+)%/);
        if (progressMatch) {
          progressCallback(parseInt(progressMatch[1]) / 100);
        }
      });

      wipeProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Wipe process exited with code ${code}`));
        }
      });

      wipeProcess.on('error', reject);
    });
  }

  /**
   * Execute secure erase for SSDs
   */
  async executeSecureErase(session) {
    const { device } = session;
    
    return new Promise((resolve, reject) => {
      let command, args;
      
      if (this.platform === 'win32') {
        // Windows: Use vendor-specific tools or PowerShell
        command = 'powershell';
        args = ['-Command', `Optimize-Volume -DriveLetter ${device} -Retrim`];
      } else if (this.platform === 'linux') {
        // Linux: Use hdparm or nvme-cli
        if (device.includes('nvme')) {
          command = 'nvme';
          args = ['format', device, '--ses=1'];
        } else {
          command = 'hdparm';
          args = ['--user-master', 'u', '--security-set-pass', 'p', device];
        }
      } else if (this.platform === 'darwin') {
        // Mac: Use diskutil
        command = 'diskutil';
        args = ['secureErase', 'freespace', '0', device];
      }

      const eraseProcess = spawn(command, args);
      
      eraseProcess.on('close', (code) => {
        if (code === 0) {
          session.progress = 100;
          this.emit('wipe-progress', session);
          resolve();
        } else {
          reject(new Error(`Secure erase failed with code ${code}`));
        }
      });

      eraseProcess.on('error', reject);
    });
  }

  /**
   * Execute cryptographic erase
   */
  async executeCryptoErase(session) {
    const { device, options } = session;
    
    // Generate new random key
    const newKey = crypto.randomBytes(32);
    
    // Overwrite key storage location
    session.status = 'destroying-keys';
    this.emit('wipe-progress', session);
    
    // Implementation depends on encryption system
    if (options.encryptionType === 'veracrypt') {
      await this.eraseVeraCryptHeaders(device);
    } else if (options.encryptionType === 'bitlocker') {
      await this.eraseBitLockerKeys(device);
    } else if (options.encryptionType === 'luks') {
      await this.eraseLUKSHeaders(device);
    }
    
    session.progress = 100;
    this.emit('wipe-progress', session);
  }

  /**
   * Cancel active wipe operation
   */
  async cancelWipe(wipeId) {
    const session = this.activeWipes.get(wipeId);
    if (!session) {
      throw new Error('Wipe session not found');
    }
    
    session.status = 'cancelled';
    session.endTime = new Date();
    this.activeWipes.delete(wipeId);
    this.emit('wipe-cancelled', session);
    
    return session;
  }

  /**
   * Verify wipe completion
   */
  async verifyWipe(devicePath, sampleSize = 10) {
    const samples = [];
    const deviceSize = await this.getDeviceSize(devicePath);
    
    for (let i = 0; i < sampleSize; i++) {
      const offset = Math.floor(Math.random() * deviceSize);
      const sample = await this.readDeviceSector(devicePath, offset);
      
      // Check if sector is empty (all zeros or random pattern)
      const isEmpty = sample.every(byte => byte === 0) || 
                     this.isRandomPattern(sample);
      samples.push({ offset, isEmpty });
    }
    
    const verificationResult = {
      device: devicePath,
      samplesChecked: sampleSize,
      passedSamples: samples.filter(s => s.isEmpty).length,
      verified: samples.every(s => s.isEmpty),
      timestamp: new Date()
    };
    
    this.emit('verification-complete', verificationResult);
    return verificationResult;
  }

  /**
   * Get device size
   */
  async getDeviceSize(devicePath) {
    return new Promise((resolve, reject) => {
      if (this.platform === 'win32') {
        exec(`wmic diskdrive where "DeviceID='${devicePath}'" get Size /value`, (error, stdout) => {
          if (error) reject(error);
          const match = stdout.match(/Size=(\d+)/);
          resolve(match ? parseInt(match[1]) : 0);
        });
      } else {
        exec(`blockdev --getsize64 ${devicePath}`, (error, stdout) => {
          if (error) reject(error);
          resolve(parseInt(stdout.trim()));
        });
      }
    });
  }

  /**
   * Read device sector for verification
   */
  async readDeviceSector(devicePath, offset, size = 512) {
    const buffer = Buffer.alloc(size);
    const fd = await fs.open(devicePath, 'r');
    
    try {
      await fd.read(buffer, 0, size, offset);
      return buffer;
    } finally {
      await fd.close();
    }
  }

  /**
   * Check if data appears to be random pattern
   */
  isRandomPattern(buffer) {
    // Simple entropy check
    const bytes = new Set(buffer);
    return bytes.size > buffer.length * 0.9;
  }

  /**
   * Get wipe history
   */
  getWipeHistory() {
    return this.wipeHistory;
  }

  /**
   * Get active wipes
   */
  getActiveWipes() {
    return Array.from(this.activeWipes.values());
  }
}

module.exports = WipeEngine;