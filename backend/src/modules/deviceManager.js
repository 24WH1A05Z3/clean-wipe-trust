const { exec, spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');
const os = require('os');

/**
 * DeviceManager - Cross-platform device detection and management
 * Supports Windows, Linux, macOS, and Android
 */
class DeviceManager extends EventEmitter {
  constructor() {
    super();
    this.platform = process.platform;
    this.devices = new Map();
    this.monitoring = false;
    this.monitorInterval = null;
  }

  /**
   * Start device monitoring
   */
  startMonitoring(interval = 5000) {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.scanDevices(); // Initial scan
    
    this.monitorInterval = setInterval(() => {
      this.scanDevices();
    }, interval);
    
    this.emit('monitoring-started');
  }

  /**
   * Stop device monitoring
   */
  stopMonitoring() {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.emit('monitoring-stopped');
  }

  /**
   * Scan for storage devices
   */
  async scanDevices() {
    try {
      let devices;
      
      switch (this.platform) {
        case 'win32':
          devices = await this.scanWindowsDevices();
          break;
        case 'linux':
          devices = await this.scanLinuxDevices();
          break;
        case 'darwin':
          devices = await this.scanMacDevices();
          break;
        case 'android':
          devices = await this.scanAndroidDevices();
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
      
      // Check for new devices
      devices.forEach(device => {
        if (!this.devices.has(device.id)) {
          this.emit('device-connected', device);
        }
        this.devices.set(device.id, device);
      });
      
      // Check for removed devices
      this.devices.forEach((device, id) => {
        if (!devices.find(d => d.id === id)) {
          this.emit('device-disconnected', device);
          this.devices.delete(id);
        }
      });
      
      this.emit('scan-complete', Array.from(this.devices.values()));
      
    } catch (error) {
      this.emit('scan-error', error);
    }
  }

  /**
   * Scan Windows devices
   */
  async scanWindowsDevices() {
    return new Promise((resolve, reject) => {
      const psScript = `
        $disks = Get-PhysicalDisk | Select-Object DeviceId, FriendlyName, MediaType, Size, SerialNumber, HealthStatus, BusType, OperationalStatus
        $volumes = Get-Volume | Select-Object DriveLetter, FileSystemLabel, FileSystem, Size, SizeRemaining
        
        $result = @{
          Disks = $disks
          Volumes = $volumes
        }
        
        $result | ConvertTo-Json -Depth 3
      `;
      
      exec(`powershell -Command "${psScript}"`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        try {
          const data = JSON.parse(stdout);
          const devices = [];
          
          if (data.Disks) {
            const disks = Array.isArray(data.Disks) ? data.Disks : [data.Disks];
            
            disks.forEach(disk => {
              const device = {
                id: disk.DeviceId || `disk_${disk.SerialNumber}`,
                name: disk.FriendlyName,
                type: this.mapMediaType(disk.MediaType),
                size: disk.Size,
                serialNumber: disk.SerialNumber,
                health: disk.HealthStatus,
                busType: disk.BusType,
                status: disk.OperationalStatus,
                platform: 'windows',
                volumes: []
              };
              
              // Find associated volumes
              if (data.Volumes) {
                const volumes = Array.isArray(data.Volumes) ? data.Volumes : [data.Volumes];
                volumes.forEach(vol => {
                  if (vol.DriveLetter) {
                    device.volumes.push({
                      letter: vol.DriveLetter,
                      label: vol.FileSystemLabel,
                      fileSystem: vol.FileSystem,
                      size: vol.Size,
                      free: vol.SizeRemaining
                    });
                  }
                });
              }
              
              devices.push(device);
            });
          }
          
          resolve(devices);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  /**
   * Scan Linux devices
   */
  async scanLinuxDevices() {
    return new Promise((resolve, reject) => {
      exec('lsblk -J -o NAME,TYPE,SIZE,MODEL,SERIAL,ROTA,MOUNTPOINT,FSTYPE,UUID', (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        try {
          const data = JSON.parse(stdout);
          const devices = [];
          
          data.blockdevices.forEach(device => {
            if (device.type === 'disk') {
              const dev = {
                id: device.uuid || device.serial || device.name,
                name: device.model || device.name,
                path: `/dev/${device.name}`,
                type: device.rota === '0' ? 'ssd' : 'hdd',
                size: this.parseSize(device.size),
                serialNumber: device.serial,
                platform: 'linux',
                partitions: []
              };
              
              // Add partitions
              if (device.children) {
                device.children.forEach(child => {
                  if (child.type === 'part') {
                    dev.partitions.push({
                      name: child.name,
                      path: `/dev/${child.name}`,
                      mountPoint: child.mountpoint,
                      fileSystem: child.fstype,
                      size: this.parseSize(child.size),
                      uuid: child.uuid
                    });
                  }
                });
              }
              
              devices.push(dev);
            }
          });
          
          resolve(devices);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  /**
   * Scan Mac devices
   */
  async scanMacDevices() {
    return new Promise((resolve, reject) => {
      exec('diskutil list -plist', (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        // Parse plist output
        exec('plutil -convert json -o - -', { input: stdout }, (error2, jsonOutput) => {
          if (error2) {
            reject(error2);
            return;
          }
          
          try {
            const data = JSON.parse(jsonOutput);
            const devices = [];
            
            if (data.AllDisks) {
              data.AllDisks.forEach(diskId => {
                exec(`diskutil info -plist ${diskId}`, (error3, diskInfo) => {
                  if (!error3) {
                    exec('plutil -convert json -o - -', { input: diskInfo }, (error4, diskJson) => {
                      if (!error4) {
                        const disk = JSON.parse(diskJson);
                        devices.push({
                          id: disk.DeviceIdentifier,
                          name: disk.MediaName || disk.DeviceNode,
                          path: disk.DeviceNode,
                          type: disk.SolidState ? 'ssd' : 'hdd',
                          size: disk.TotalSize,
                          protocol: disk.DeviceProtocol,
                          removable: disk.Removable,
                          platform: 'darwin'
                        });
                      }
                    });
                  }
                });
              });
            }
            
            // Wait a bit for all disk info to be collected
            setTimeout(() => resolve(devices), 1000);
            
          } catch (parseError) {
            reject(parseError);
          }
        });
      });
    });
  }

  /**
   * Scan Android devices (when running on Android via Termux or similar)
   */
  async scanAndroidDevices() {
    return new Promise((resolve, reject) => {
      // Android storage detection requires root or special permissions
      exec('df -h', (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        const devices = [];
        const lines = stdout.split('\n');
        
        lines.forEach(line => {
          if (line.includes('/storage') || line.includes('/sdcard')) {
            const parts = line.split(/\s+/);
            if (parts.length >= 6) {
              devices.push({
                id: parts[0],
                name: parts[5],
                path: parts[5],
                type: 'flash',
                size: this.parseSize(parts[1]),
                used: this.parseSize(parts[2]),
                available: this.parseSize(parts[3]),
                platform: 'android'
              });
            }
          }
        });
        
        resolve(devices);
      });
    });
  }

  /**
   * Get device details
   */
  async getDeviceDetails(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    // Get additional details based on platform
    switch (this.platform) {
      case 'win32':
        return await this.getWindowsDeviceDetails(device);
      case 'linux':
        return await this.getLinuxDeviceDetails(device);
      case 'darwin':
        return await this.getMacDeviceDetails(device);
      default:
        return device;
    }
  }

  /**
   * Get Windows device details
   */
  async getWindowsDeviceDetails(device) {
    return new Promise((resolve, reject) => {
      const psScript = `
        Get-PhysicalDisk | Where-Object { $_.DeviceId -eq '${device.id}' } | 
        Select-Object * | ConvertTo-Json -Depth 2
      `;
      
      exec(`powershell -Command "${psScript}"`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        try {
          const details = JSON.parse(stdout);
          resolve({ ...device, details });
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  /**
   * Get Linux device details
   */
  async getLinuxDeviceDetails(device) {
    return new Promise((resolve, reject) => {
      exec(`smartctl -a ${device.path} --json`, (error, stdout, stderr) => {
        // smartctl might not be available or require sudo
        if (error && !stdout) {
          // Fallback to basic info
          exec(`hdparm -I ${device.path}`, (error2, stdout2) => {
            if (error2) {
              resolve(device);
            } else {
              resolve({ ...device, smartInfo: stdout2 });
            }
          });
        } else {
          try {
            const smartData = JSON.parse(stdout);
            resolve({ ...device, smartData });
          } catch (parseError) {
            resolve({ ...device, smartInfo: stdout });
          }
        }
      });
    });
  }

  /**
   * Get Mac device details
   */
  async getMacDeviceDetails(device) {
    return new Promise((resolve, reject) => {
      exec(`diskutil info ${device.id}`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        const details = {};
        const lines = stdout.split('\n');
        
        lines.forEach(line => {
          const colonIndex = line.indexOf(':');
          if (colonIndex > -1) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            details[key] = value;
          }
        });
        
        resolve({ ...device, details });
      });
    });
  }

  /**
   * Check if device is removable
   */
  async isRemovable(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    
    if (this.platform === 'win32') {
      return device.busType === 'USB' || device.busType === 'SD';
    } else if (this.platform === 'linux') {
      // Check if device is USB or removable
      return new Promise((resolve) => {
        exec(`cat /sys/block/${path.basename(device.path)}/removable`, (error, stdout) => {
          resolve(!error && stdout.trim() === '1');
        });
      });
    } else if (this.platform === 'darwin') {
      return device.removable === true;
    }
    
    return false;
  }

  /**
   * Map media type
   */
  mapMediaType(mediaType) {
    if (!mediaType) return 'unknown';
    
    const type = mediaType.toString().toLowerCase();
    if (type.includes('ssd') || type === '4') return 'ssd';
    if (type.includes('hdd') || type === '3') return 'hdd';
    if (type.includes('usb')) return 'usb';
    if (type.includes('sd')) return 'sd';
    
    return 'unknown';
  }

  /**
   * Parse size string to bytes
   */
  parseSize(sizeStr) {
    if (typeof sizeStr === 'number') return sizeStr;
    if (!sizeStr) return 0;
    
    const match = sizeStr.match(/^([\d.]+)([KMGT]?)B?$/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    const multipliers = {
      '': 1,
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024,
      'T': 1024 * 1024 * 1024 * 1024
    };
    
    return Math.floor(value * (multipliers[unit] || 1));
  }

  /**
   * Format size for display
   */
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Get all devices
   */
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId);
  }

  /**
   * Unmount device (platform-specific)
   */
  async unmountDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    switch (this.platform) {
      case 'win32':
        return await this.unmountWindowsDevice(device);
      case 'linux':
        return await this.unmountLinuxDevice(device);
      case 'darwin':
        return await this.unmountMacDevice(device);
      default:
        throw new Error(`Unmount not supported on ${this.platform}`);
    }
  }

  /**
   * Unmount Windows device
   */
  async unmountWindowsDevice(device) {
    return new Promise((resolve, reject) => {
      if (device.volumes && device.volumes.length > 0) {
        const volume = device.volumes[0];
        exec(`mountvol ${volume.letter}: /D`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Unmount Linux device
   */
  async unmountLinuxDevice(device) {
    return new Promise((resolve, reject) => {
      if (device.partitions && device.partitions.length > 0) {
        const promises = device.partitions
          .filter(p => p.mountPoint)
          .map(p => new Promise((res, rej) => {
            exec(`umount ${p.path}`, (error) => {
              if (error) rej(error);
              else res();
            });
          }));
        
        Promise.all(promises).then(resolve).catch(reject);
      } else {
        resolve();
      }
    });
  }

  /**
   * Unmount Mac device
   */
  async unmountMacDevice(device) {
    return new Promise((resolve, reject) => {
      exec(`diskutil unmountDisk ${device.id}`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

module.exports = DeviceManager;