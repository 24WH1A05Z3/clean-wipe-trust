# WipeTrust - Secure Data Erasure Application

A secure, cross-platform data wiping application built for the Smart India Hackathon 2024. This MVP addresses India's e-waste crisis by providing a user-friendly, tamper-proof, and auditable data wiping solution.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- Administrator/root privileges (required for device access)
- Linux: `util-linux`, `nvme-cli` packages
- Windows: PowerShell execution policy enabled

### Installation & Setup

```bash
# Clone the repository
git clone <repository-url>
cd clean-wipe-trust

# Install all dependencies
npm install
cd backend && npm install && cd ..

# Start the complete application
npm start
```

This will:
1. Start the React frontend development server (port 5173)
2. Launch the Electron backend with IPC communication
3. Open the application window automatically

### Production Build

```bash
# Build for production
npm run build:all

# Start production version
node start-prod.js
```

## ✨ Features

### ✅ Real Device Detection
- **No Mock Data**: Actual device detection using system APIs
- **Cross-Platform**: Works on Linux and Windows
- **Device Classification**: Automatically identifies HDDs, SSDs, USB drives
- **Real-Time Monitoring**: Live device connection/disconnection events

### ✅ Secure Data Erasure
- **NIST SP 800-88 Compliance**: Industry-standard secure erasure
- **Multi-Pass Overwriting**: Configurable pass counts (1-7 passes)
- **Hardware Secure Erase**: NVMe and SSD firmware-level erasure
- **Progress Tracking**: Real-time progress without fake animations

### ✅ Certificate Generation
- **Digital Signatures**: Tamper-proof verification
- **Multiple Formats**: PDF and JSON export
- **Audit Trail**: Complete operation logging
- **Third-Party Verification**: Offline certificate validation

### ✅ User Interface
- **Professional Design**: Clean, modern interface
- **One-Click Operation**: Simple workflow for general users
- **Real-Time Updates**: Live device and progress updates
- **Accessibility**: WCAG 2.1 AA compliant

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Electron       │    │   Backend       │
│   (React/Vite)  │◄──►│   Main Process   │◄──►│   Services      │
│                 │    │   (IPC Bridge)   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                │
                                                ├── DeviceService
                                                ├── WipeService  
                                                └── CertificateService
```

## 📱 Usage

### 1. Device Detection
- Launch the application
- Devices are automatically detected on startup
- Click "Rescan" to refresh device list
- Only unmounted devices can be selected for wiping

### 2. Secure Wipe
- Select one or more devices from the list
- Click "Start Wipe" to begin erasure
- Monitor real-time progress in the Progress tab
- Operation uses NIST SP 800-88 standard by default

### 3. Certificate Management
- Certificates are automatically generated after successful wipes
- View certificates in the Certificates tab
- Export as PDF or JSON for verification
- Each certificate includes digital signature for tamper-proofing

## 🛠️ Development

### Development Commands

```bash
# Start development environment
npm start

# Build for production
npm run build:all

# Start production build
node start-prod.js

# Frontend only
npm run dev

# Backend only (after frontend is running)
npm run electron
```

## 🔒 Security & Compliance

### Standards Compliance
- **NIST SP 800-88 Rev.1**: Default erasure standard
- **DoD 5220.22-M**: Department of Defense standard
- **CESG CPA**: UK government security standard

### Security Features
- **Privilege Escalation**: Requests admin rights for device access
- **Cryptographic Verification**: SHA-256 hashes for operation verification
- **Digital Signatures**: HMAC-SHA256 for certificate integrity
- **Audit Logging**: Complete operation trail with timestamps

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and support:
- Create GitHub issues with system information
- Include log files from `~/.config/wipetrust/logs/`
- Provide steps to reproduce problems
