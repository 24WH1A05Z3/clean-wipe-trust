# WipeGuardian Suite

<div align="center">
  <img src="assets/images/logo.png" alt="WipeGuardian Logo" width="200">
  
  [![NIST Compliant](https://img.shields.io/badge/NIST%20SP%20800--88-Compliant-green.svg)](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-88r1.pdf)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)](https://github.com/wipeguardian/suite)
  [![Version](https://img.shields.io/badge/Version-1.0.0-orange.svg)](https://github.com/wipeguardian/suite/releases)
</div>

## 🛡️ Overview

WipeGuardian Suite is a secure, cross-platform data wiping application designed to address India's growing e-waste crisis. With over 1.75 million tonnes of e-waste generated annually, this tool provides a user-friendly, tamper-proof, and auditable solution for secure data sanitization, promoting safe disposal and reuse of electronic devices.

## 🌟 Key Features

### Core Functionality
- **Secure Data Erasure**: Multiple wiping methods compliant with NIST SP 800-88 Rev. 1
- **Cross-Platform Support**: Works on Windows, Linux, macOS, and Android devices
- **Device Detection**: Automatic detection of HDDs, SSDs, USB drives, and other storage media
- **Smart Wipe Selection**: Automatically selects optimal wiping method based on device type
- **Hidden Area Coverage**: Erases data from HPA/DCO and SSD hidden sectors

### Certification & Verification
- **Digital Certificates**: Generates tamper-proof PDF and JSON certificates
- **Digital Signatures**: Cryptographic signing of all certificates
- **QR Code Verification**: Easy third-party verification via QR codes
- **Audit Trail**: Complete logging of all wipe operations

### User Experience
- **One-Click Interface**: Simple, intuitive design for general public use
- **Real-Time Progress**: Live monitoring of wipe operations
- **Offline Capability**: Create bootable USB/ISO for offline usage
- **Multi-Language Support**: Accessible to diverse user base

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0
- Administrator/Root privileges for device operations

### Installation

```bash
# Clone the repository
git clone https://github.com/wipeguardian/suite.git
cd WipeGuardian-Suite

# Install dependencies
npm install

# Run the application
npm start
```

### Building for Production

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build-win    # Windows
npm run build-linux  # Linux
npm run build-mac    # macOS
```

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10/11, Ubuntu 18.04+, macOS 10.14+
- **RAM**: 4 GB
- **Storage**: 500 MB free space
- **Processor**: Dual-core 2.0 GHz

### Recommended Requirements
- **RAM**: 8 GB or more
- **Storage**: 2 GB free space
- **Processor**: Quad-core 2.5 GHz or better

## 🔧 Usage

### Basic Workflow

1. **Launch Application**: Start WipeGuardian Suite with administrator privileges
2. **Scan Devices**: Click "Scan Devices" to detect all connected storage
3. **Select Device**: Choose the device you want to wipe
4. **Choose Method**: Select wipe method (or use auto-recommended)
5. **Start Wipe**: Click "Start Wipe" and confirm the operation
6. **Generate Certificate**: After completion, generate and save the certificate

### Wipe Methods

| Method | Description | Passes | Use Case |
|--------|-------------|--------|----------|
| Clear | Single pass overwrite | 1 | Basic data removal |
| Purge HDD | DoD 5220.22-M | 3 | Standard HDD sanitization |
| Purge SSD | Secure Erase Command | 1 | SSD-optimized erasure |
| Enhanced Purge | DoD 5220.22-M ECE | 7 | Maximum security for HDDs |
| Crypto Erase | Key destruction | 1 | Encrypted volumes |

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Electron, React, Bootstrap
- **Backend**: Node.js, Express
- **Security**: crypto-js, node-forge
- **Database**: SQLite3
- **Certificate Generation**: PDFKit, QRCode

### Module Structure
```
src/
├── main/           # Electron main process
├── renderer/       # UI components and pages
├── modules/        # Core functionality modules
│   ├── wipeEngine.js
│   ├── certificateGenerator.js
│   └── deviceManager.js
├── services/       # API and backend services
└── utils/          # Utility functions
```

## 🔐 Security Features

- **NIST SP 800-88 Compliance**: Follows industry-standard guidelines
- **Cryptographic Verification**: SHA-256 hashing and RSA-2048 signatures
- **Secure Communication**: TLS encryption for all network operations
- **Access Control**: Administrator privileges required for sensitive operations
- **Audit Logging**: Comprehensive logging with tamper detection

## 📊 API Documentation

### Device Operations

```javascript
// Scan for devices
const devices = await deviceAPI.scanDevices();

// Start wipe operation
const wipeResult = await deviceAPI.startWipe(deviceId, {
  method: 'PURGE_HDD',
  verify: true
});

// Monitor progress
deviceAPI.onWipeProgress((progress) => {
  console.log(`Progress: ${progress.percentage}%`);
});
```

### Certificate Generation

```javascript
// Generate certificate
const certificate = await certificateAPI.generate(wipeData);

// Verify certificate
const verification = await certificateAPI.verify(certificateId);

// Export certificate
await certificateAPI.export(certificateId, 'pdf');
```

## 🌍 Environmental Impact

- **E-Waste Reduction**: Enables safe recycling of electronic devices
- **Data Security**: Prevents data breaches from discarded devices
- **Circular Economy**: Promotes reuse of IT assets
- **Carbon Footprint**: Reduces environmental impact of electronic waste

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Install development dependencies
npm install --dev

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## 📜 Compliance & Standards

- **NIST SP 800-88 Rev. 1**: Media Sanitization Guidelines
- **DoD 5220.22-M**: Department of Defense Standard
- **ISO/IEC 27040:2015**: Storage Security
- **GDPR Article 17**: Right to Erasure

## 🐛 Troubleshooting

### Common Issues

1. **Device Not Detected**
   - Ensure administrator/root privileges
   - Check device connections
   - Update device drivers

2. **Wipe Operation Fails**
   - Verify device is not in use
   - Check available disk space
   - Ensure device is not write-protected

3. **Certificate Generation Error**
   - Verify write permissions
   - Check available storage
   - Ensure cryptographic keys are initialized

## 📞 Support

- **Documentation**: [docs.wipeguardian.io](https://docs.wipeguardian.io)
- **Issues**: [GitHub Issues](https://github.com/wipeguardian/suite/issues)
- **Email**: support@wipeguardian.io
- **Community**: [Discord Server](https://discord.gg/wipeguardian)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- NIST for SP 800-88 guidelines
- Open source community for various libraries
- Beta testers and early adopters
- Environmental organizations promoting e-waste management

## 🚧 Roadmap

### Version 1.1 (Q2 2024)
- [ ] Cloud backup of certificates
- [ ] Mobile app for verification
- [ ] Network attached storage support
- [ ] Batch operations for multiple devices

### Version 1.2 (Q3 2024)
- [ ] AI-powered wipe recommendations
- [ ] Blockchain-based certificate storage
- [ ] Enterprise management console
- [ ] API for third-party integration

### Version 2.0 (Q4 2024)
- [ ] Hardware security module integration
- [ ] Quantum-resistant cryptography
- [ ] Advanced reporting dashboard
- [ ] Compliance automation tools

---

<div align="center">
  Made with ❤️ for a cleaner, safer digital world
  
  © 2024 WipeGuardian Team. All rights reserved.
</div>
