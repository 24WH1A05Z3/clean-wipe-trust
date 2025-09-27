const { exec } = require('child_process');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

const execAsync = promisify(exec);

class DeviceService {
  async detectDevices() {
    const platform = process.platform;
    
    if (platform === 'linux') {
      return this.detectLinuxDevices();
    } else if (platform === 'win32') {
      return this.detectWindowsDevices();
    } else {
      throw new Error('Unsupported platform');
    }
  }

  async detectLinuxDevices() {
    try {
      const devices = [];
      
      // Get block devices with safety checks
      const { stdout: lsblkOutput } = await execAsync('lsblk -J -o NAME,SIZE,TYPE,MOUNTPOINT,ROTA,MODEL,SERIAL,FSTYPE');
      const data = JSON.parse(lsblkOutput);
      
      const blockDevices = data.blockdevices
        .filter(device => {
          // Safety: Only allow disk type devices with valid names and sizes
          return device.type === 'disk' && 
                 device.name && 
                 device.size && 
                 device.name.match(/^[a-zA-Z0-9]+$/) && // Prevent path injection
                 !device.name.startsWith('loop') && // Exclude loop devices
                 !device.name.startsWith('ram'); // Exclude RAM disks
        })
        .map(device => ({
          id: uuidv4(),
          name: device.name,
          path: `/dev/${device.name}`,
          size: this.parseSize(device.size),
          type: device.rota === '1' ? 'HDD' : 'SSD',
          model: device.model || 'Unknown',
          serial: device.serial || 'Unknown',
          mounted: !!device.mountpoint,
          filesystem: device.fstype || 'Unknown'
        }));

      // Check for removable devices with additional safety
      for (const device of blockDevices) {
        try {
          // Safety: Validate device name before using in command
          if (!device.name.match(/^[a-zA-Z0-9]+$/)) continue;
          
          const { stdout: removableCheck } = await execAsync(`cat /sys/block/${device.name}/removable 2>/dev/null || echo "0"`);
          const { stdout: rotCheck } = await execAsync(`cat /sys/block/${device.name}/queue/rotational 2>/dev/null || echo "1"`);
          
          // Only include truly removable devices
          if (removableCheck.trim() === '1') {
            // Additional safety: Check if it's a system critical device
            const { stdout: holders } = await execAsync(`ls /sys/block/${device.name}/holders/ 2>/dev/null | wc -l`);
            if (parseInt(holders.trim()) === 0) { // No holders = safer to wipe
              devices.push({
                ...device,
                removable: true,
                systemCritical: false
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      // Check for removable USB devices only
      try {
        const { stdout: blockDevices } = await execAsync('ls /sys/block/ 2>/dev/null || echo ""');
        const blocks = blockDevices.split('\n').filter(line => line.trim());
        
        for (const block of blocks) {
          if (block.startsWith('sd')) {
            try {
              // Check if it's removable
              const { stdout: removable } = await execAsync(`cat /sys/block/${block}/removable 2>/dev/null || echo "0"`);
              // Check if it's USB
              const { stdout: uevent } = await execAsync(`cat /sys/block/${block}/uevent 2>/dev/null || echo ""`);
              
              if (removable.trim() === '1' && uevent.includes('usb')) {
                const { stdout: size } = await execAsync(`cat /sys/block/${block}/size 2>/dev/null || echo "0"`);
                const sizeBytes = parseInt(size.trim()) * 512; // Convert sectors to bytes
                
                if (sizeBytes > 0) {
                  devices.push({
                    id: uuidv4(),
                    name: block,
                    path: `/dev/${block}`,
                    size: sizeBytes,
                    type: 'USB Device',
                    model: 'USB Storage Device',
                    serial: 'Unknown',
                    mounted: false,
                    filesystem: 'Unknown'
                  });
                }
              }
            } catch (error) {
              continue;
            }
          }
        }
      } catch (error) {
        console.log('USB storage detection failed:', error.message);
      }

      // Check for mounted Android devices
      try {
        const { stdout: mountOutput } = await execAsync('mount | grep -i "android\\|mtp" || echo ""');
        if (mountOutput.trim()) {
          const lines = mountOutput.split('\n').filter(line => line.trim());
          for (const line of lines) {
            devices.push({
              id: uuidv4(),
              name: 'Android Device (Mounted)',
              path: '/dev/android',
              size: 0,
              type: 'Android',
              model: 'Android Device',
              serial: 'MOUNTED',
              mounted: true,
              filesystem: 'MTP'
            });
          }
        }
      } catch (error) {
        console.log('Android mount detection failed:', error.message);
      }

      // Check for MTP devices (Android phones)
      try {
        const { stdout: mtpOutput } = await execAsync('mtp-detect 2>/dev/null || echo ""');
        if (mtpOutput.includes('Device')) {
          const lines = mtpOutput.split('\n');
          for (const line of lines) {
            if (line.includes('Friendly name:')) {
              const name = line.split('Friendly name:')[1].trim();
              devices.push({
                id: uuidv4(),
                name: name || 'Android Device',
                path: '/dev/mtp',
                size: 0,
                type: 'Android',
                model: name || 'Android Device',
                serial: 'MTP',
                mounted: false,
                filesystem: 'MTP'
              });
            }
          }
        }
      } catch (error) {
        console.log('MTP detection failed:', error.message);
      }
      
      return devices;
    } catch (error) {
      console.error('Linux device detection error:', error);
      return [];
    }
  }

  async detectWindowsDevices() {
    try {
      const { stdout } = await execAsync('wmic diskdrive get Model,Size,SerialNumber,InterfaceType /format:csv');
      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
      
      const devices = [];
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 4 && parts[1] && parts[2]) {
          // Only include USB and removable devices
          const interfaceType = parts[1].toLowerCase();
          if (interfaceType.includes('usb') || interfaceType.includes('1394')) {
            devices.push({
              id: uuidv4(),
              name: parts[2] || 'Unknown Device',
              path: `\\\\.\\PhysicalDrive${i}`,
              size: parseInt(parts[3]) || 0,
              type: interfaceType.includes('usb') ? 'USB' : 'External',
              model: parts[2] || 'Unknown',
              serial: parts[4] || 'Unknown',
              mounted: false,
              filesystem: 'NTFS'
            });
          }
        }
      }
      
      return devices;
    } catch (error) {
      console.error('Windows device detection error:', error);
      return [];
    }
  }

  parseSize(sizeStr) {
    if (!sizeStr) return 0;
    const units = { 'K': 1024, 'M': 1024**2, 'G': 1024**3, 'T': 1024**4 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?)$/);
    if (!match) return 0;
    const [, num, unit] = match;
    return Math.floor(parseFloat(num) * (units[unit] || 1));
  }
}

module.exports = DeviceService;
