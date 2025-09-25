const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const crypto = require('crypto');
const forge = require('node-forge');
const QRCode = require('qrcode');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * CertificateGenerator - Generates tamper-proof wipe certificates
 * Supports PDF and JSON formats with digital signatures
 */
class CertificateGenerator {
  constructor() {
    this.certificateStore = new Map();
    this.privateKey = null;
    this.publicKey = null;
    this.certificate = null;
    this.initializeKeys();
  }

  /**
   * Initialize cryptographic keys for signing
   */
  async initializeKeys() {
    try {
      // Try to load existing keys
      const keyPath = path.join(process.env.APPDATA || process.env.HOME, '.wipeguardian', 'keys');
      const privateKeyPath = path.join(keyPath, 'private.pem');
      const publicKeyPath = path.join(keyPath, 'public.pem');
      const certPath = path.join(keyPath, 'cert.pem');

      try {
        this.privateKey = await fs.readFile(privateKeyPath, 'utf8');
        this.publicKey = await fs.readFile(publicKeyPath, 'utf8');
        this.certificate = await fs.readFile(certPath, 'utf8');
      } catch (error) {
        // Generate new keys if not found
        await this.generateNewKeys();
        await this.saveKeys(keyPath);
      }
    } catch (error) {
      console.error('Failed to initialize keys:', error);
      await this.generateNewKeys();
    }
  }

  /**
   * Generate new RSA key pair and self-signed certificate
   */
  async generateNewKeys() {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

    const attrs = [{
      name: 'commonName',
      value: 'WipeGuardian Suite'
    }, {
      name: 'countryName',
      value: 'IN'
    }, {
      shortName: 'ST',
      value: 'Maharashtra'
    }, {
      name: 'localityName',
      value: 'Mumbai'
    }, {
      name: 'organizationName',
      value: 'WipeGuardian'
    }, {
      shortName: 'OU',
      value: 'Certificate Authority'
    }];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([{
      name: 'basicConstraints',
      cA: true
    }, {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }, {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true
    }, {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true
    }, {
      name: 'subjectAltName',
      altNames: [{
        type: 2, // DNS
        value: 'wipeguardian.local'
      }]
    }]);

    // Self-sign certificate
    cert.sign(keys.privateKey, forge.md.sha256.create());

    // Convert to PEM format
    this.privateKey = forge.pki.privateKeyToPem(keys.privateKey);
    this.publicKey = forge.pki.publicKeyToPem(keys.publicKey);
    this.certificate = forge.pki.certificateToPem(cert);
  }

  /**
   * Save keys to file system
   */
  async saveKeys(keyPath) {
    await fs.mkdir(keyPath, { recursive: true });
    await fs.writeFile(path.join(keyPath, 'private.pem'), this.privateKey);
    await fs.writeFile(path.join(keyPath, 'public.pem'), this.publicKey);
    await fs.writeFile(path.join(keyPath, 'cert.pem'), this.certificate);
  }

  /**
   * Generate wipe certificate
   */
  async generateCertificate(wipeData, format = 'pdf') {
    const certificateId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Prepare certificate data
    const certificateData = {
      id: certificateId,
      version: '1.0',
      timestamp,
      wipeDetails: {
        deviceId: wipeData.device,
        deviceType: wipeData.deviceInfo.type,
        deviceModel: wipeData.deviceInfo.details.model,
        deviceSize: wipeData.deviceInfo.details.size,
        serialNumber: wipeData.deviceInfo.details.serialNumber,
        wipeMethod: wipeData.method.name,
        nistCompliance: wipeData.method.nistLevel,
        startTime: wipeData.startTime,
        endTime: wipeData.endTime,
        duration: this.calculateDuration(wipeData.startTime, wipeData.endTime),
        passes: wipeData.method.passes || 1,
        status: wipeData.status
      },
      verification: {
        method: 'Random Sampling',
        samplesChecked: wipeData.verificationResult?.samplesChecked || 0,
        passedSamples: wipeData.verificationResult?.passedSamples || 0,
        verified: wipeData.verificationResult?.verified || false
      },
      operator: {
        name: wipeData.operator || 'System Administrator',
        organization: wipeData.organization || 'WipeGuardian Suite User'
      },
      compliance: {
        standard: 'NIST SP 800-88 Rev. 1',
        level: wipeData.method.nistLevel,
        certification: 'This certificate confirms that the data sanitization process has been completed in accordance with NIST SP 800-88 guidelines.'
      }
    };

    // Generate digital signature
    const signature = await this.signData(certificateData);
    certificateData.signature = signature;

    // Generate verification QR code
    const verificationUrl = `https://verify.wipeguardian.io/certificate/${certificateId}`;
    const qrCode = await QRCode.toDataURL(verificationUrl);
    certificateData.qrCode = qrCode;

    // Store certificate
    this.certificateStore.set(certificateId, certificateData);

    // Generate output based on format
    let output;
    if (format === 'pdf') {
      output = await this.generatePDFCertificate(certificateData);
    } else if (format === 'json') {
      output = await this.generateJSONCertificate(certificateData);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    return {
      id: certificateId,
      data: certificateData,
      output,
      format
    };
  }

  /**
   * Generate PDF certificate
   */
  async generatePDFCertificate(certificateData) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Data Wipe Certificate',
        Author: 'WipeGuardian Suite',
        Subject: 'NIST SP 800-88 Compliant Data Sanitization Certificate',
        Keywords: 'data wipe, certificate, NIST, compliance'
      }
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    // Header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('DATA SANITIZATION CERTIFICATE', { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(12)
       .font('Helvetica')
       .text('NIST SP 800-88 Compliant', { align: 'center' });
    
    doc.moveDown(2);

    // Certificate ID and QR Code
    doc.fontSize(10)
       .text(`Certificate ID: ${certificateData.id}`, 50, doc.y);
    
    if (certificateData.qrCode) {
      const qrImage = Buffer.from(certificateData.qrCode.split(',')[1], 'base64');
      doc.image(qrImage, 450, doc.y - 30, { width: 100 });
    }

    doc.moveDown(2);

    // Device Information Section
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('DEVICE INFORMATION', { underline: true });
    
    doc.fontSize(11)
       .font('Helvetica')
       .moveDown(0.5);

    const deviceInfo = certificateData.wipeDetails;
    doc.text(`Device Type: ${deviceInfo.deviceType.toUpperCase()}`)
       .text(`Model: ${deviceInfo.deviceModel}`)
       .text(`Serial Number: ${deviceInfo.serialNumber}`)
       .text(`Capacity: ${deviceInfo.deviceSize}`);

    doc.moveDown();

    // Sanitization Details Section
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('SANITIZATION DETAILS', { underline: true });
    
    doc.fontSize(11)
       .font('Helvetica')
       .moveDown(0.5);

    doc.text(`Method: ${deviceInfo.wipeMethod}`)
       .text(`NIST Compliance Level: ${deviceInfo.nistCompliance}`)
       .text(`Number of Passes: ${deviceInfo.passes}`)
       .text(`Start Time: ${new Date(deviceInfo.startTime).toLocaleString()}`)
       .text(`End Time: ${new Date(deviceInfo.endTime).toLocaleString()}`)
       .text(`Duration: ${deviceInfo.duration}`)
       .text(`Status: ${deviceInfo.status.toUpperCase()}`);

    doc.moveDown();

    // Verification Section
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('VERIFICATION', { underline: true });
    
    doc.fontSize(11)
       .font('Helvetica')
       .moveDown(0.5);

    const verification = certificateData.verification;
    doc.text(`Verification Method: ${verification.method}`)
       .text(`Samples Checked: ${verification.samplesChecked}`)
       .text(`Samples Passed: ${verification.passedSamples}`)
       .text(`Verification Status: ${verification.verified ? 'VERIFIED' : 'NOT VERIFIED'}`);

    doc.moveDown();

    // Compliance Statement
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('COMPLIANCE STATEMENT', { underline: true });
    
    doc.fontSize(11)
       .font('Helvetica')
       .moveDown(0.5)
       .text(certificateData.compliance.certification, {
         align: 'justify'
       });

    doc.moveDown();

    // Operator Information
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('CERTIFIED BY', { underline: true });
    
    doc.fontSize(11)
       .font('Helvetica')
       .moveDown(0.5);

    doc.text(`Operator: ${certificateData.operator.name}`)
       .text(`Organization: ${certificateData.operator.organization}`)
       .text(`Date: ${new Date(certificateData.timestamp).toLocaleDateString()}`)
       .text(`Time: ${new Date(certificateData.timestamp).toLocaleTimeString()}`);

    doc.moveDown(2);

    // Digital Signature
    doc.fontSize(10)
       .font('Helvetica')
       .text('Digital Signature:', { continued: true })
       .fontSize(8)
       .text(` ${certificateData.signature.substring(0, 64)}...`);

    // Footer
    doc.fontSize(8)
       .text('This is a digitally signed certificate. Verify authenticity at verify.wipeguardian.io', 
             50, doc.page.height - 50, { align: 'center' });

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
    });
  }

  /**
   * Generate JSON certificate
   */
  async generateJSONCertificate(certificateData) {
    const jsonCertificate = {
      ...certificateData,
      metadata: {
        format: 'JSON',
        version: '1.0',
        schema: 'https://wipeguardian.io/schemas/certificate/v1.json'
      }
    };

    return Buffer.from(JSON.stringify(jsonCertificate, null, 2));
  }

  /**
   * Sign data with private key
   */
  async signData(data) {
    const dataString = JSON.stringify(data);
    const sign = crypto.createSign('SHA256');
    sign.update(dataString);
    sign.end();
    return sign.sign(this.privateKey, 'hex');
  }

  /**
   * Verify signature
   */
  async verifySignature(data, signature) {
    const dataString = JSON.stringify(data);
    const verify = crypto.createVerify('SHA256');
    verify.update(dataString);
    verify.end();
    return verify.verify(this.publicKey, signature, 'hex');
  }

  /**
   * Calculate duration between two dates
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = end - start;
    
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Verify certificate authenticity
   */
  async verifyCertificate(certificateId) {
    const certificate = this.certificateStore.get(certificateId);
    if (!certificate) {
      return { valid: false, error: 'Certificate not found' };
    }

    const { signature, ...dataWithoutSignature } = certificate;
    const isValid = await this.verifySignature(dataWithoutSignature, signature);

    return {
      valid: isValid,
      certificate: isValid ? certificate : null,
      verifiedAt: new Date().toISOString()
    };
  }

  /**
   * Export certificate to file
   */
  async exportCertificate(certificateId, outputPath, format = 'pdf') {
    const certificate = this.certificateStore.get(certificateId);
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    let output;
    if (format === 'pdf') {
      output = await this.generatePDFCertificate(certificate);
    } else if (format === 'json') {
      output = await this.generateJSONCertificate(certificate);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    const fileName = `certificate_${certificateId}.${format}`;
    const filePath = path.join(outputPath, fileName);
    await fs.writeFile(filePath, output);

    return filePath;
  }

  /**
   * Get all certificates
   */
  getAllCertificates() {
    return Array.from(this.certificateStore.values());
  }

  /**
   * Get certificate by ID
   */
  getCertificate(certificateId) {
    return this.certificateStore.get(certificateId);
  }
}

module.exports = CertificateGenerator;