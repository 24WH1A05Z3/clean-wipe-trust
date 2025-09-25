const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class CertificateService {
  constructor() {
    this.certificatesDir = path.join(os.homedir(), 'WipeTrust', 'Certificates');
    this.ensureCertificatesDir();
  }

  async ensureCertificatesDir() {
    try {
      await fs.mkdir(this.certificatesDir, { recursive: true });
      console.log(`Certificates directory: ${this.certificatesDir}`);
    } catch (error) {
      console.error('Failed to create certificates directory:', error);
    }
  }

  async generateCertificate(wipeData) {
    const certificateId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const certificate = {
      id: certificateId,
      version: '1.0',
      standard: 'NIST SP 800-88 Rev.1',
      timestamp,
      device: {
        id: wipeData.deviceId,
        name: wipeData.deviceName || wipeData.deviceId,
        path: wipeData.devicePath,
        size: wipeData.deviceSize || 'Unknown',
        type: wipeData.deviceType || 'Unknown',
        serial: wipeData.deviceSerial || 'Unknown'
      },
      wipe: {
        method: wipeData.method || 'Multi-pass overwrite',
        passes: wipeData.passes || 3,
        standard: wipeData.standard || 'NIST-SP-800-88',
        startTime: wipeData.startTime,
        endTime: wipeData.endTime || timestamp,
        duration: wipeData.duration || 0,
        verificationHash: wipeData.hash
      },
      operator: {
        user: os.userInfo().username,
        hostname: os.hostname(),
        platform: os.platform(),
        nodeVersion: process.version
      },
      compliance: {
        nistCompliant: true,
        dodCompliant: (wipeData.passes || 3) >= 3,
        verificationMethod: 'Cryptographic hash verification',
        auditTrail: true
      }
    };

    // Generate digital signature
    certificate.signature = this.generateSignature(certificate);
    
    // Save certificate
    await this.saveCertificate(certificate);
    
    console.log(`Generated certificate ${certificateId} for device ${wipeData.deviceId}`);
    return certificate;
  }

  generateSignature(certificate) {
    // Create a deterministic string from certificate data
    const dataToSign = JSON.stringify({
      id: certificate.id,
      timestamp: certificate.timestamp,
      device: certificate.device,
      wipe: certificate.wipe,
      operator: certificate.operator
    }, null, 0); // No formatting for consistent hashing
    
    // Generate HMAC signature (in production, use proper PKI)
    const secret = 'wipetrust-signing-key-' + os.hostname(); // Include hostname for uniqueness
    const signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
    
    return {
      algorithm: 'HMAC-SHA256',
      value: signature,
      timestamp: new Date().toISOString(),
      keyId: crypto.createHash('md5').update(secret).digest('hex').substring(0, 8)
    };
  }

  async saveCertificate(certificate) {
    const filename = `wipe-certificate-${certificate.id}.json`;
    const filepath = path.join(this.certificatesDir, filename);
    
    try {
      await this.ensureCertificatesDir(); // Ensure directory exists
      await fs.writeFile(filepath, JSON.stringify(certificate, null, 2));
      console.log(`Certificate saved: ${filepath}`);
    } catch (error) {
      console.error('Failed to save certificate:', error);
      throw error;
    }
  }

  async getCertificates() {
    try {
      await this.ensureCertificatesDir(); // Ensure directory exists
      
      let files;
      try {
        files = await fs.readdir(this.certificatesDir);
      } catch (error) {
        console.log('Certificates directory not found or empty');
        return [];
      }
      
      const certificates = [];
      
      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('wipe-certificate-')) {
          try {
            const filepath = path.join(this.certificatesDir, file);
            const content = await fs.readFile(filepath, 'utf8');
            const certificate = JSON.parse(content);
            
            // Verify certificate integrity
            const verification = await this.verifyCertificate(certificate.id);
            certificate.verified = verification.valid;
            
            certificates.push(certificate);
          } catch (error) {
            console.error(`Failed to read certificate ${file}:`, error);
          }
        }
      }
      
      // Sort by timestamp, newest first
      const sorted = certificates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      console.log(`Loaded ${sorted.length} certificates`);
      return sorted;
    } catch (error) {
      console.error('Failed to get certificates:', error);
      return [];
    }
  }

  async verifyCertificate(certificateId) {
    try {
      const certificates = await this.getCertificates();
      const certificate = certificates.find(c => c.id === certificateId);
      
      if (!certificate) {
        return { valid: false, error: 'Certificate not found' };
      }
      
      // Verify signature
      const dataToSign = JSON.stringify({
        id: certificate.id,
        timestamp: certificate.timestamp,
        device: certificate.device,
        wipe: certificate.wipe,
        operator: certificate.operator
      }, null, 0);
      
      const secret = 'wipetrust-signing-key-' + os.hostname();
      const expectedSignature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
      
      const isValid = certificate.signature && certificate.signature.value === expectedSignature;
      
      return {
        valid: isValid,
        certificate,
        verificationTime: new Date().toISOString(),
        signatureMatch: isValid
      };
    } catch (error) {
      console.error('Certificate verification failed:', error);
      return { valid: false, error: error.message };
    }
  }

  async exportCertificatePDF(certificateId) {
    // TODO: Implement PDF generation using PDFKit
    // For now, return the JSON data
    const certificates = await this.getCertificates();
    const certificate = certificates.find(c => c.id === certificateId);
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }
    
    return {
      format: 'json',
      data: certificate,
      filename: `wipe-certificate-${certificateId}.json`
    };
  }

  async getStatistics() {
    const certificates = await this.getCertificates();
    
    return {
      totalCertificates: certificates.length,
      recentCertificates: certificates.filter(c => 
        new Date(c.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      ).length,
      deviceTypes: [...new Set(certificates.map(c => c.device.type))],
      standards: [...new Set(certificates.map(c => c.wipe.standard))],
      averageWipeTime: certificates.length > 0 
        ? certificates.reduce((sum, c) => sum + (c.wipe.duration || 0), 0) / certificates.length 
        : 0
    };
  }
}

module.exports = CertificateService;
