# WipeTrust - Secure Data Erasure Application

A secure, cross-platform data wiping application built for the Smart India Hackathon 2024. This MVP addresses India's e-waste crisis by providing a user-friendly, tamper-proof, and auditable data wiping solution.

## Problem Statement

India generates over 1.75 million tonnes of e-waste annually. Millions of old laptops and smartphones remain unused due to data breach fears. This application provides:

- Secure erasure of all user data including hidden storage areas
- Digitally signed, tamper-proof wipe certificates
- Intuitive one-click interface for general public use
- Offline usability and third-party verification
- NIST SP 800-88 compliance for trust and transparency

## Features

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

## Architecture

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

### Backend Services

1. **DeviceService**: Real device detection using `lsblk` (Linux) and WMI (Windows)
2. **WipeService**: Secure erasure using `shred` (Linux) and `cipher` (Windows)  
3. **CertificateService**: Digital certificate generation and verification

## Quick Start

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

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Start the complete application
npm start
```

This will:
1. Start the React frontend development server (port 5173)
2. Launch the Electron backend with IPC communication
3. Open the application window automatically

### Manual Setup (Alternative)

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start backend (after frontend is running)
npm run electron
```

## Usage

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

## Technical Implementation

### Device Detection (No Mock Data)

**Linux:**
```bash
# Real device enumeration
lsblk -J -o NAME,SIZE,TYPE,MOUNTPOINT,ROTA,MODEL,SERIAL,FSTYPE

# USB detection
udevadm info --name=/dev/sda --query=property | grep ID_BUS
```

**Windows:**
```powershell
# WMI device queries
Get-WmiObject -Class Win32_DiskDrive | Select-Object Model,Size,SerialNumber,InterfaceType
```

### Secure Erasure (Real Implementation)

**Linux:**
```bash
# Multi-pass overwrite
shred -vfz -n3 /dev/sda

# NVMe secure erase
nvme format /dev/nvme0n1 --ses=1
```

**Windows:**
```cmd
# Secure deletion
cipher /w:C:\
```

### Progress Tracking (Real-Time)

- Parses actual command output for progress percentages
- No simulated or fake progress bars
- Real-time IPC communication between frontend and backend
- Accurate time estimation based on device size and speed

## Security & Compliance

### Standards Compliance
- **NIST SP 800-88 Rev.1**: Default erasure standard
- **DoD 5220.22-M**: Department of Defense standard
- **CESG CPA**: UK government security standard

### Security Features
- **Privilege Escalation**: Requests admin rights for device access
- **Cryptographic Verification**: SHA-256 hashes for operation verification
- **Digital Signatures**: HMAC-SHA256 for certificate integrity
- **Audit Logging**: Complete operation trail with timestamps

### Certificate Structure
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "device": { "name", "path", "size", "type", "serial" },
  "wipe": { "method", "passes", "standard", "duration", "hash" },
  "operator": { "user", "hostname", "platform" },
  "signature": { "algorithm", "value", "timestamp" }
}
```

## Development

### Project Structure
```
clean-wipe-trust/
├── src/                    # Frontend React application
│   ├── components/         # UI components
│   ├── services/          # IPC communication
│   └── pages/             # Application pages
├── backend/               # Electron backend
│   └── src/
│       ├── main/          # Main Electron process
│       └── modules/       # Core services
├── docs/                  # Specifications
└── start.js              # Application launcher
```

### Adding New Features

1. **Device Types**: Extend `DeviceService.detectDevices()`
2. **Erasure Methods**: Add to `WipeService.wipeDevice()`
3. **Certificate Formats**: Extend `CertificateService.exportCertificate()`

### Testing

```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# Integration tests (requires test devices)
npm run test:integration
```

## Production Deployment

### Building for Distribution

```bash
# Build frontend
npm run build

# Build Electron app
cd backend
npm run build

# Create installers
npm run dist
```

### System Requirements

**Minimum:**
- RAM: 4GB
- Storage: 1GB free space
- OS: Windows 10/Linux Ubuntu 18.04+

**Recommended:**
- RAM: 8GB
- Storage: 2GB free space
- SSD for better performance

## Limitations & Future Enhancements

### Current Limitations
- Requires administrator privileges
- SSD wear leveling may leave residual data in hidden areas
- Android support requires ADB debugging
- Some vendor tools are platform-specific

### Planned Enhancements
- Android device support via ADB
- Hardware secure erase for more SSD models
- Cloud certificate backup
- Batch processing for multiple devices
- Custom erasure patterns

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and support:
- Create GitHub issues with system information
- Include log files from `~/.config/wipetrust/logs/`
- Provide steps to reproduce problems

## Acknowledgments

- Smart India Hackathon 2024
- NIST for SP 800-88 guidelines
- Open source community for tools and libraries
