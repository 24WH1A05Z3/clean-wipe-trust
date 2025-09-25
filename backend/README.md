# WipeTrust Backend

Secure data erasure backend built with Electron and Node.js for the Smart India Hackathon.

## Features

- **Real Device Detection**: Automatically detects storage devices on Linux and Windows
- **Secure Erasure**: Implements NIST SP 800-88 compliant data wiping
- **Progress Tracking**: Real-time progress monitoring without fake data
- **Certificate Generation**: Creates tamper-proof wipe certificates
- **Cross-Platform**: Works on Linux and Windows

## Architecture

### Core Services

1. **DeviceService** (`src/modules/deviceService.js`)
   - Detects storage devices using `lsblk` (Linux) and WMI (Windows)
   - Real-time device monitoring
   - Device classification (HDD/SSD/USB/Android)

2. **WipeService** (`src/modules/wipeService.js`)
   - Secure data erasure using `shred` (Linux) and `cipher` (Windows)
   - Real progress tracking
   - NIST SP 800-88 compliance

3. **CertificateService** (`src/modules/certificateService.js`)
   - Generates digitally signed certificates
   - Tamper-proof verification
   - PDF and JSON export

### Device Detection

#### Linux
- Uses `lsblk -J` for device enumeration
- Monitors `/dev/` for device changes
- Detects device type via ROTA flag (0=SSD, 1=HDD)
- USB detection via `udevadm`

#### Windows
- Uses PowerShell WMI queries
- Detects device properties via Win32_DiskDrive
- Identifies USB and interface types

### Secure Erasure Methods

#### Linux
- **HDD**: Multi-pass overwrite using `shred`
- **SSD**: NVMe secure erase via `nvme-cli`
- **Encrypted**: Cryptographic key destruction

#### Windows
- **HDD**: Multi-pass overwrite using `cipher`
- **SSD**: Vendor-specific secure erase utilities
- **Encrypted**: BitLocker key deletion

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

The backend runs as an Electron main process and communicates with the frontend via IPC:

```javascript
// Get devices
const devices = await ipcRenderer.invoke('get-devices');

// Start wipe operation
await ipcRenderer.invoke('start-wipe', deviceIds, options);

// Monitor progress
ipcRenderer.on('wipe-progress', (event, progress) => {
  console.log('Progress:', progress);
});
```

## Security Features

- **No Mock Data**: All device detection and progress is real
- **Privilege Escalation**: Requests admin rights for device access
- **Verification**: Cryptographic hash verification of wipe operations
- **Audit Trail**: Comprehensive logging of all operations
- **Certificate Signing**: Digital signatures for tamper-proof certificates

## Compliance

- **NIST SP 800-88 Rev.1**: Media sanitization guidelines
- **DoD 5220.22-M**: Department of Defense standard
- **CESG CPA**: UK government security standard

## Development

### Adding New Erasure Methods

1. Extend `WipeService.wipeDevice()` method
2. Add platform-specific implementation
3. Update progress tracking
4. Add verification logic

### Adding New Device Types

1. Extend `DeviceService.detectDevices()` method
2. Add device classification logic
3. Update device status determination
4. Add appropriate erasure method

## Production Deployment

For production deployment:

1. Build the application: `npm run build`
2. Package with electron-builder: `npm run dist`
3. Install on target systems with admin privileges
4. Configure certificate signing keys
5. Set up audit log storage

## Limitations

- Requires administrator/root privileges
- SSD wear leveling may leave residual data
- Android devices need ADB debugging enabled
- Some vendor-specific tools are Windows-only

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure cross-platform compatibility
