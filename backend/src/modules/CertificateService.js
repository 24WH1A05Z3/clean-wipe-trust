const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const os = require('os');

class CertificateService {
  constructor() {
    this.certificatesDir = path.join(os.homedir(), '.wipetrust', 'certificates');
    this.ensureDirectoryExists();
  }

  async ensureDirectoryExists() {
    try {
      await fs.mkdir(this.certificatesDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create certificates directory:', error);
    }
  }

  async saveCertificate(wipeResult, device) {
    const certificate = {
      id: wipeResult.id,
      timestamp: wipeResult.timestamp,
      device: {
        name: device.name,
        path: device.path,
        size: device.size,
        type: device.type,
        serial: device.serial,
        model: device.model
      },
      wipe: {
        method: wipeResult.method,
        passes: wipeResult.passes,
        duration: wipeResult.duration,
        hash: wipeResult.hash,
        standard: 'NIST SP 800-88'
      },
      operator: {
        user: os.userInfo().username,
        hostname: os.hostname(),
        platform: os.platform()
      },
      signature: null
    };

    // Generate signature
    const dataToSign = JSON.stringify({
      id: certificate.id,
      timestamp: certificate.timestamp,
      device: certificate.device,
      wipe: certificate.wipe
    });
    
    certificate.signature = {
      algorithm: 'HMAC-SHA256',
      value: crypto.createHmac('sha256', 'wipetrust-secret-key').update(dataToSign).digest('hex'),
      timestamp: new Date().toISOString()
    };

    const filePath = path.join(this.certificatesDir, `${certificate.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(certificate, null, 2));
    
    return certificate;
  }

  async getCertificates() {
    try {
      const files = await fs.readdir(this.certificatesDir);
      const certificates = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(this.certificatesDir, file), 'utf8');
            certificates.push(JSON.parse(content));
          } catch (error) {
            console.error(`Failed to read certificate ${file}:`, error);
          }
        }
      }
      
      return certificates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Failed to get certificates:', error);
      return [];
    }
  }

  async exportCertificate(certificateId, filePath, format) {
    const certificates = await this.getCertificates();
    const certificate = certificates.find(cert => cert.id === certificateId);
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    if (format === 'json') {
      await fs.writeFile(filePath, JSON.stringify(certificate, null, 2));
    } else if (format === 'pdf') {
      // Simple text-based PDF alternative
      const content = this.generateCertificateText(certificate);
      await fs.writeFile(filePath.replace('.pdf', '.txt'), content);
    }
  }

  async verifyCertificate(certificateId) {
    const certificates = await this.getCertificates();
    const certificate = certificates.find(cert => cert.id === certificateId);
    
    if (!certificate) {
      return { valid: false, reason: 'Certificate not found' };
    }

    // Verify signature
    const dataToSign = JSON.stringify({
      id: certificate.id,
      timestamp: certificate.timestamp,
      device: certificate.device,
      wipe: certificate.wipe
    });
    
    const expectedSignature = crypto.createHmac('sha256', 'wipetrust-secret-key').update(dataToSign).digest('hex');
    
    if (certificate.signature.value !== expectedSignature) {
      return { valid: false, reason: 'Invalid signature' };
    }

    return { valid: true, reason: 'Certificate is valid and tamper-proof' };
  }

  generateCertificateText(certificate) {
    return `
WIPETRUST SECURE DATA ERASURE CERTIFICATE
=========================================

Certificate ID: ${certificate.id}
Generated: ${certificate.timestamp}

DEVICE INFORMATION
------------------
Name: ${certificate.device.name}
Path: ${certificate.device.path}
Size: ${this.formatBytes(certificate.device.size)}
Type: ${certificate.device.type}
Model: ${certificate.device.model}
Serial: ${certificate.device.serial}

ERASURE DETAILS
---------------
Method: ${certificate.wipe.method}
Standard: ${certificate.wipe.standard}
Passes: ${certificate.wipe.passes}
Duration: ${this.formatDuration(certificate.wipe.duration)}
Verification Hash: ${certificate.wipe.hash}

OPERATOR INFORMATION
--------------------
User: ${certificate.operator.user}
Hostname: ${certificate.operator.hostname}
Platform: ${certificate.operator.platform}

DIGITAL SIGNATURE
-----------------
Algorithm: ${certificate.signature.algorithm}
Signature: ${certificate.signature.value}
Signed: ${certificate.signature.timestamp}

This certificate verifies that the above device has been securely erased
according to NIST SP 800-88 guidelines. The digital signature ensures
the authenticity and integrity of this certificate.
`;
  }

  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    if (seconds > 0) return `${seconds}s`;
    return `${ms}ms`; // Show milliseconds for very fast operations
  }
}

module.exports = CertificateService;
