const { exec } = require('child_process');
const { promisify } = require('util');
const EventEmitter = require('events');
const os = require('os');

const execAsync = promisify(exec);

class DeviceService extends EventEmitter {
  constructor() {
    super();
    this.devices = [];
    this.isScanning = false;
    this.platform = os.platform();
    
    // Start monitoring for device changes
    this.startMonitoring();
  }

  async getDevices() {
    return await this.scanDevices();
  }

  async scanDevices() {
    if (this.isScanning) return this.devices;
    
    this.isScanning = true;
    try {
      const devices = await this.detectDevices();
      this.devices = devices;
      this.emit('device-change', this.devices);
      return this.devices;
    } finally {
      this.isScanning = false;
    }
  }

  async detectDevices() {
    if (this.platform === 'linux') {
      return await this.detectLinuxDevices();
    } else if (this.platform === 'win32') {
      return await this.detectWindowsDevices();
    }
    return [];
  }

  async detectLinuxDevices() {
    try {
      // Use lsblk to get block device information
      const { stdout } = await execAsync('lsblk -J -o NAME,SIZE,TYPE,MOUNTPOINT,ROTA,MODEL,SERIAL,FSTYPE 2>/dev/null');
      
      if (!stdout.trim()) {
        console.log('No lsblk output');
        return [];
      }

      const data = JSON.parse(stdout);
      const devices = [];
      
      for (const device of data.blockdevices || []) {
        // Only include physical drives (not partitions) and exclude loop devices
        if (device.type === 'disk' && !device.name.startsWith('loop')) {
          try {
            const deviceInfo = {
              id: device.name,
              name: device.model || device.name,
              path: `/dev/${device.name}`,
              size: device.size || 'Unknown',
              type: this.getDeviceType(device),
              serial: device.serial || 'Unknown',
              mounted: this.isMounted(device),
              encrypted: device.fstype === 'crypto_LUKS',
              status: this.getDeviceStatus(device),
              interface: await this.getInterface(device.name)
            };
            
            // Only add if we can get basic info
            if (deviceInfo.name && deviceInfo.path) {
              devices.push(deviceInfo);
            }
          } catch (error) {
            console.error(`Error processing device ${device.name}:`, error);
          }
        }
      }
      
      console.log(`Detected ${devices.length} real devices`);
      return devices;
    } catch (error) {
      console.error('Error detecting Linux devices:', error);
      return [];
    }
  }

  async detectWindowsDevices() {
    try {
      // Use PowerShell to get disk information
      const psScript = `
        Get-WmiObject -Class Win32_DiskDrive | Where-Object { $_.Size -gt 0 } | ForEach-Object {
          $disk = $_
          $partitions = Get-WmiObject -Query "ASSOCIATORS OF {Win32_DiskDrive.DeviceID='$($disk.DeviceID)'} WHERE AssocClass=Win32_DiskDriveToDiskPartition"
          $mounted = $false
          foreach ($partition in $partitions) {
            $logicalDisks = Get-WmiObject -Query "ASSOCIATORS OF {Win32_DiskPartition.DeviceID='$($partition.DeviceID)'} WHERE AssocClass=Win32_LogicalDiskToPartition"
            if ($logicalDisks) { $mounted = $true }
          }
          
          [PSCustomObject]@{
            DeviceID = $disk.DeviceID
            Model = $disk.Model
            Size = $disk.Size
            SerialNumber = $disk.SerialNumber
            InterfaceType = $disk.InterfaceType
            MediaType = $disk.MediaType
            Mounted = $mounted
          }
        } | ConvertTo-Json -Depth 3
      `;
      
      const { stdout } = await execAsync(`powershell -Command "${psScript}"`);
      
      if (!stdout.trim()) {
        console.log('No PowerShell output');
        return [];
      }

      const data = JSON.parse(stdout);
      const diskArray = Array.isArray(data) ? data : [data];
      
      const devices = diskArray.filter(disk => disk && disk.Size).map(disk => ({
        id: disk.DeviceID.replace(/\\/g, ''),
        name: disk.Model || 'Unknown Device',
        path: disk.DeviceID,
        size: this.formatSize(disk.Size),
        type: this.getWindowsDeviceType(disk),
        serial: disk.SerialNumber || 'Unknown',
        mounted: disk.Mounted,
        encrypted: false, // TODO: Detect BitLocker
        status: disk.Mounted ? 'warning' : 'ready',
        interface: disk.InterfaceType || 'Unknown'
      }));

      console.log(`Detected ${devices.length} real devices`);
      return devices;
    } catch (error) {
      console.error('Error detecting Windows devices:', error);
      return [];
    }
  }

  getDeviceType(device) {
    if (device.rota === '1') return 'HDD';
    if (device.rota === '0') return 'SSD';
    return 'Unknown';
  }

  getWindowsDeviceType(disk) {
    if (disk.MediaType && disk.MediaType.includes('SSD')) return 'SSD';
    if (disk.InterfaceType === 'USB') return 'USB';
    return 'HDD';
  }

  isMounted(device) {
    if (device.mountpoint) return true;
    if (device.children) {
      return device.children.some(child => child.mountpoint);
    }
    return false;
  }

  getDeviceStatus(device) {
    if (this.isMounted(device)) return 'warning';
    if (device.fstype) return 'ready';
    return 'idle';
  }

  async getInterface(deviceName) {
    try {
      // Check if it's a USB device
      const { stdout } = await execAsync(`udevadm info --name=/dev/${deviceName} --query=property 2>/dev/null | grep ID_BUS || echo ""`);
      if (stdout.includes('usb')) return 'USB';
      
      // Check for NVMe
      if (deviceName.startsWith('nvme')) return 'NVMe';
      
      // Check for SATA
      const sataCheck = await execAsync(`ls -la /sys/block/${deviceName} 2>/dev/null | grep ata || echo ""`).catch(() => ({ stdout: '' }));
      if (sataCheck.stdout) return 'SATA';
      
      return 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  formatSize(bytes) {
    if (!bytes || bytes === 0) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  startMonitoring() {
    // Poll for device changes every 10 seconds
    setInterval(async () => {
      if (!this.isScanning) {
        const currentDevices = await this.detectDevices();
        const currentIds = currentDevices.map(d => d.id).sort();
        const previousIds = this.devices.map(d => d.id).sort();
        
        if (JSON.stringify(currentIds) !== JSON.stringify(previousIds)) {
          this.devices = currentDevices;
          this.emit('device-change', this.devices);
          console.log(`Device change detected: ${currentDevices.length} devices`);
        }
      }
    }, 10000);
  }
}

module.exports = DeviceService;
