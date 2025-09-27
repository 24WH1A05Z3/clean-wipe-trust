const { spawn } = require('child_process');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class WipeService {
  async wipeDevice(device, options = {}, progressCallback) {
    const { passes = 3, method = 'nist' } = options;
    const startTime = Date.now();
    
    // Critical safety checks before wiping
    if (!device || !device.path) {
      throw new Error('Invalid device provided');
    }
    
    // Validate device path to prevent injection attacks
    if (!device.path.match(/^\/dev\/[a-zA-Z0-9]+$/)) {
      throw new Error('Invalid device path format');
    }
    
    // Check if device is mounted - NEVER wipe mounted devices
    if (device.mounted) {
      throw new Error('Cannot wipe mounted device - unmount first');
    }
    
    // Additional safety: Check if device still exists and is removable
    try {
      const deviceName = device.path.replace('/dev/', '');
      const { stdout: removableCheck } = await require('util').promisify(require('child_process').exec)(`cat /sys/block/${deviceName}/removable 2>/dev/null || echo "0"`);
      if (removableCheck.trim() !== '1') {
        throw new Error('Device is not removable - operation cancelled for safety');
      }
    } catch (error) {
      throw new Error('Safety check failed: ' + error.message);
    }
    
    return new Promise((resolve, reject) => {
      const platform = process.platform;
      let command, args;
      
      if (platform === 'linux') {
        // Use shred with safe parameters
        command = 'shred';
        args = ['-vfz', `-n${Math.min(passes, 7)}`, device.path]; // Limit passes to 7 max
      } else if (platform === 'win32') {
        // Windows cipher command - safer approach
        command = 'cipher';
        args = ['/w:C:\\temp']; // Use temp directory instead of root
      } else {
        reject(new Error('Unsupported platform'));
        return;
      }

      // Additional validation before spawning process
      if (!command || !Array.isArray(args)) {
        reject(new Error('Invalid wipe command configuration'));
        return;
      }

      const process = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'], // Secure stdio configuration
        env: {}, // Clean environment
        cwd: '/tmp' // Safe working directory
      });
      
      let output = '';
      let progress = 0;

      process.stdout.on('data', (data) => {
        output += data.toString();
        progress = this.parseProgress(data.toString(), passes);
        if (progressCallback && typeof progressCallback === 'function') {
          progressCallback(Math.min(progress, 100)); // Cap at 100%
        }
      });

      process.stderr.on('data', (data) => {
        output += data.toString();
        progress = this.parseProgress(data.toString(), passes);
        if (progressCallback && typeof progressCallback === 'function') {
          progressCallback(Math.min(progress, 100)); // Cap at 100%
        }
      });

      // Timeout protection - don't let wipe run forever
      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error('Wipe operation timed out'));
      }, 3600000); // 1 hour timeout

      process.on('close', (code) => {
        clearTimeout(timeout);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (code === 0) {
          const hash = crypto.createHash('sha256').update(output).digest('hex');
          
          // Send completion progress
          if (progressCallback) {
            progressCallback(100);
          }
          
          resolve({
            id: uuidv4(),
            deviceId: device.id,
            success: true,
            method,
            passes,
            duration,
            hash,
            timestamp: new Date().toISOString(),
            output: output.slice(-1000), // Keep last 1000 chars
            safetyChecksCompleted: true
          });
        } else {
          reject(new Error(`Wipe failed with code ${code}: ${output.slice(-500)}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Process error: ${error.message}`));
      });
    });
  }

      process.on('error', (error) => {
        reject(new Error(`Process error: ${error.message}`));
      });
    });
  }

  parseProgress(output, totalPasses) {
    // Parse shred output for progress
    const passMatch = output.match(/pass (\d+)\/(\d+)/i);
    if (passMatch) {
      const currentPass = parseInt(passMatch[1]);
      const totalPassesFound = parseInt(passMatch[2]);
      return Math.floor((currentPass / totalPassesFound) * 100);
    }
    
    // Parse percentage if available
    const percentMatch = output.match(/(\d+)%/);
    if (percentMatch) {
      return parseInt(percentMatch[1]);
    }
    
    return 0;
  }
}

module.exports = WipeService;
