const { spawn } = require('child_process');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class WipeService {
  async wipeDevice(device, options = {}, progressCallback) {
    const { passes = 3, method = 'nist' } = options;
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const platform = process.platform;
      let command, args;
      
      if (platform === 'linux') {
        command = 'shred';
        args = ['-vfz', `-n${passes}`, device.path];
      } else if (platform === 'win32') {
        command = 'cipher';
        args = ['/w:C:\\'];
      } else {
        reject(new Error('Unsupported platform'));
        return;
      }

      const process = spawn(command, args);
      let output = '';
      let progress = 0;

      process.stdout.on('data', (data) => {
        output += data.toString();
        progress = this.parseProgress(data.toString(), passes);
        if (progressCallback) {
          progressCallback(progress);
        }
      });

      process.stderr.on('data', (data) => {
        output += data.toString();
        progress = this.parseProgress(data.toString(), passes);
        if (progressCallback) {
          progressCallback(progress);
        }
      });

      process.on('close', (code) => {
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
            output: output.slice(-1000) // Keep last 1000 chars
          });
        } else {
          reject(new Error(`Wipe failed with code ${code}: ${output}`));
        }
      });

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
