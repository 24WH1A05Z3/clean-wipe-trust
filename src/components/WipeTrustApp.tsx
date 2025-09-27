import { useState, useEffect } from "react";
import { 
  HardDrive, 
  Activity, 
  Shield, 
  Settings, 
  HelpCircle,
  Monitor,
  Usb,
  ChevronRight,
  Download,
  FileCheck,
  AlertCircle,
  Smartphone,
  RefreshCw,
  Minimize2,
  Maximize2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ipcService } from "@/services/ipcService";
import { toast } from "sonner";

interface Device {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  path: string;
  serial: string;
  mounted: boolean;
  model: string;
  filesystem: string;
}

interface WipeProgress {
  isActive: boolean;
  totalDevices: number;
  completedDevices: number;
  currentDevice: string | null;
  progress: number;
  phase: string;
  startTime: number | null;
  estimatedTimeRemaining: number | null;
}

const sidebarItems = [
  { icon: HardDrive, label: "Devices", id: "devices" },
  { icon: Activity, label: "Progress", id: "progress" },
  { icon: Shield, label: "Certificates", id: "certificates" },
  { icon: Monitor, label: "Erasure Method", id: "method" },
  { icon: Settings, label: "Preferences", id: "preferences" },
];

export default function WipeTrustApp() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [wipeProgress, setWipeProgress] = useState<WipeProgress | null>(null);
  const [activeSidebarItem, setActiveSidebarItem] = useState("devices");
  const [isScanning, setIsScanning] = useState(false);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    loadDevices();
    loadCertificates();

    ipcService.onDevicesUpdated((updatedDevices) => {
      setDevices(updatedDevices);
    });

    ipcService.onWipeProgress((progress) => {
      setWipeProgress(progress);
    });

    return () => {
      ipcService.removeAllListeners();
    };
  }, []);

  const loadDevices = async () => {
    try {
      const deviceList = await ipcService.getDevices();
      const processedDevices = deviceList.map(device => ({
        ...device,
        status: device.mounted ? 'warning' : 'ready'
      }));
      setDevices(processedDevices);
    } catch (error) {
      console.error('Failed to load devices:', error);
      toast.error('Failed to load devices');
    }
  };

  const loadCertificates = async () => {
    try {
      const certList = await ipcService.getCertificates();
      setCertificates(certList);
    } catch (error) {
      console.error('Failed to load certificates:', error);
    }
  };

  const scanDevices = async () => {
    setIsScanning(true);
    try {
      const deviceList = await ipcService.scanDevices();
      const processedDevices = deviceList.map(device => ({
        ...device,
        status: device.mounted ? 'warning' : 'ready'
      }));
      setDevices(processedDevices);
      toast.success(`Found ${deviceList.length} device(s)`);
    } catch (error) {
      console.error('Failed to scan devices:', error);
      toast.error('Failed to scan devices');
    } finally {
      setIsScanning(false);
    }
  };

  const startWipe = async () => {
    if (selectedDevices.length === 0) {
      toast.error('Please select at least one device to wipe');
      return;
    }

    // Get selected device details for safety checks
    const selectedDeviceDetails = devices.filter(d => selectedDevices.includes(d.id));
    
    // Safety check: mounted devices
    const mountedDevices = selectedDeviceDetails.filter(d => d.mounted);
    if (mountedDevices.length > 0) {
      toast.error('Cannot wipe mounted devices. Please unmount them first.');
      return;
    }

    // Safety confirmation with device names
    const deviceNames = selectedDeviceDetails.map(d => `${d.name} (${d.model})`).join('\n');
    const confirmed = confirm(
      `⚠️ CRITICAL WARNING ⚠️\n\n` +
      `This will PERMANENTLY ERASE all data on:\n\n${deviceNames}\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Are you absolutely sure you want to proceed?`
    );

    if (!confirmed) {
      return;
    }

    // Additional safety for system-looking devices
    const potentialSystemDevices = selectedDeviceDetails.filter(d => 
      d.name.startsWith('sda') || d.path.includes('/dev/sda') || d.size > 100000000000 // >100GB
    );

    if (potentialSystemDevices.length > 0) {
      const systemDeviceNames = potentialSystemDevices.map(d => d.name).join(', ');
      const doubleConfirm = confirm(
        `⚠️ EXTREME CAUTION ⚠️\n\n` +
        `Device(s) "${systemDeviceNames}" may be system drives!\n\n` +
        `Wiping system drives will destroy your operating system!\n\n` +
        `Are you ABSOLUTELY CERTAIN these are removable devices?`
      );

      if (!doubleConfirm) {
        return;
      }
    }

    try {
      toast.success('Starting secure wipe operation...');
      await ipcService.startWipe(selectedDevices, {
        standard: 'NIST-SP-800-88',
        passes: 3,
        verify: true
      });
      
      setActiveSidebarItem("progress");
    } catch (error) {
      console.error('Failed to start wipe:', error);
      toast.error('Failed to start wipe operation: ' + error.message);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'usb': return Usb;
      case 'android': return Smartphone;
      default: return HardDrive;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "idle":
        return <Badge variant="secondary">Idle</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500 text-white">Warning</Badge>;
      case "ready":
        return <Badge className="bg-green-500 text-white">Ready</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Sidebar */}
      <div className="w-72 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">WipeTrust</span>
          </div>

          <nav className="space-y-3">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSidebarItem(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-200 ${
                  activeSidebarItem === item.id
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {activeSidebarItem === item.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Help Section */}
        <div className="absolute bottom-8 left-8 right-8 max-w-56">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-600 shadow-lg">
            <h4 className="text-sm font-semibold text-white mb-2">Need help?</h4>
            <p className="text-xs text-slate-300 mb-4">
              Read the secure erasure guide and best practices.
            </p>
            <Button size="sm" variant="outline" className="w-full h-9 text-xs bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setShowHelp(true)}>
              <HelpCircle className="w-3 h-3 mr-2" />
              Open Guide
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-600 bg-slate-800 px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-300">System Ready • NIST Compliant</span>
            </div>
            
            {/* Window Controls */}
            <div className="flex items-center gap-1">
              <button 
                className="p-2.5 hover:bg-slate-600 rounded-lg transition-colors bg-slate-700 border border-slate-600"
                onClick={async () => {
                  try {
                    await window.electronAPI?.minimizeWindow?.();
                  } catch (error) {
                    console.error('Minimize failed:', error);
                  }
                }}
                title="Exit Fullscreen"
              >
                <Minimize2 className="w-4 h-4 text-white font-bold" />
              </button>
              <button 
                className="p-2.5 hover:bg-slate-600 rounded-lg transition-colors bg-slate-700 border border-slate-600"
                onClick={async () => {
                  try {
                    await window.electronAPI?.maximizeWindow?.();
                  } catch (error) {
                    console.error('Maximize failed:', error);
                  }
                }}
                title="Enter Fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-white font-bold" />
              </button>
              <button 
                className="p-2.5 hover:bg-red-500 rounded-lg transition-colors bg-red-600 border border-red-500"
                onClick={async () => {
                  try {
                    await window.electronAPI?.closeWindow?.();
                  } catch (error) {
                    console.error('Close failed:', error);
                  }
                }}
                title="Close"
              >
                <X className="w-4 h-4 text-white font-bold" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-auto">
          {activeSidebarItem === "devices" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Storage Devices</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={scanDevices}
                  disabled={isScanning}
                  className="bg-white shadow-md hover:shadow-lg transition-shadow"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Scanning...' : 'Rescan Devices'}
                </Button>
              </div>

              {devices.length === 0 ? (
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border border-blue-100 p-12 text-center shadow-lg">
                  <HardDrive className="w-16 h-16 mx-auto mb-6 text-blue-400" />
                  <h3 className="text-xl font-semibold mb-3 text-slate-800">No Storage Devices Detected</h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    Connect USB drives or external storage devices and click rescan to detect them.
                  </p>
                  <Button onClick={scanDevices} disabled={isScanning} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg">
                    <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                    {isScanning ? 'Scanning...' : 'Scan for Devices'}
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-slate-50 to-blue-50">
                      <TableRow>
                        <TableHead className="font-semibold">Select</TableHead>
                        <TableHead className="font-semibold">Device</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Size</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((device) => {
                        const DeviceIcon = getDeviceIcon(device.type);
                        return (
                          <TableRow key={device.id} className="hover:bg-blue-50 transition-colors">
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedDevices.includes(device.id)}
                                onChange={() => toggleDeviceSelection(device.id)}
                                disabled={device.mounted}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <DeviceIcon className="w-5 h-5 text-blue-600" />
                                <div>
                                  <span className="font-medium text-slate-800">{device.name}</span>
                                  <div className="text-xs text-slate-500">{device.path}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{device.type}</TableCell>
                            <TableCell className="font-medium">{ipcService.formatBytes(device.size)}</TableCell>
                            <TableCell>{getStatusBadge(device.status)}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {devices.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4 flex items-center gap-2 text-sm text-yellow-800 border border-yellow-200">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {selectedDevices.length > 0 
                      ? `${selectedDevices.length} device(s) selected for secure erasure.`
                      : 'Select one or more devices to securely erase. Default method: NIST SP 800-88 Rev.1.'
                    }
                  </span>
                </div>
              )}
            </div>
          )}

          {activeSidebarItem === "progress" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Wipe Progress</h2>
              
              {!wipeProgress?.isActive ? (
                <div className="bg-white rounded-lg border p-8 text-center">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Active Wipe Operation</h3>
                  <p className="text-gray-600">
                    Start a wipe operation from the Devices tab to see progress here.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Progress</span>
                    <span className="text-gray-600">
                      {Math.round(wipeProgress.progress)}% • {wipeProgress.phase}
                    </span>
                  </div>
                  <Progress value={wipeProgress.progress} className="h-2 mb-6" />
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">Status</span>
                        <Badge className="bg-blue-500 text-white text-xs">
                          {wipeProgress.phase}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">Devices</span>
                        <span className="text-sm">
                          {wipeProgress.completedDevices}/{wipeProgress.totalDevices}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">Estimated Time</span>
                        <span className="text-sm">
                          {wipeProgress.estimatedTimeRemaining 
                            ? `${Math.ceil(wipeProgress.estimatedTimeRemaining / 60000)} min`
                            : 'Calculating...'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                      <div className="text-center text-gray-500">
                        <FileCheck className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Certificate will be generated upon completion.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel the wipe operation?')) {
                          ipcService.stopWipe();
                          setWipeProgress(null);
                          toast.info('Wipe operation cancelled');
                        }
                      }}
                    >
                      Cancel Wipe
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(wipeProgress, null, 2));
                        toast.success('Progress data copied to clipboard');
                      }}
                    >
                      Copy Progress
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSidebarItem === "certificates" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Certificate Management</h2>
                <Button variant="outline" size="sm" onClick={loadCertificates}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {certificates.length === 0 ? (
                <div className="bg-white rounded-lg border p-8 text-center">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Certificates Found</h3>
                  <p className="text-gray-600">
                    Complete a wipe operation to generate certificates.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="bg-white rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <FileCheck className="w-5 h-5 text-green-500" />
                        <Badge className="bg-green-500 text-white text-xs">Verified</Badge>
                      </div>
                      <h3 className="font-medium mb-2">{cert.device.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Generated: {new Date(cert.timestamp).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => setSelectedCertificate(cert)}
                        >
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={async () => {
                            try {
                              const result = await ipcService.exportCertificate(cert.id, 'pdf');
                              if (result.success) {
                                toast.success(`Certificate exported to ${result.path}`);
                              }
                            } catch (error) {
                              toast.error('Failed to export certificate');
                            }
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(activeSidebarItem === "method") && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Erasure Method Configuration</h2>
              
              <div className="bg-white rounded-lg border p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Erasure Standard</label>
                    <select className="w-full p-2 border rounded-lg">
                      <option value="nist">NIST SP 800-88 Rev.1 (Recommended)</option>
                      <option value="dod">DoD 5220.22-M</option>
                      <option value="cesg">CESG CPA Higher Level</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Passes</label>
                    <select className="w-full p-2 border rounded-lg">
                      <option value="1">1 Pass (Fast)</option>
                      <option value="3" selected>3 Passes (Recommended)</option>
                      <option value="7">7 Passes (Maximum Security)</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="verify" defaultChecked />
                    <label htmlFor="verify" className="text-sm">Verify erasure completion</label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="certificate" defaultChecked />
                    <label htmlFor="certificate" className="text-sm">Generate completion certificate</label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeSidebarItem === "preferences") && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Application Preferences</h2>
              
              <div className="bg-white rounded-lg border p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">Security Settings</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="admin" defaultChecked />
                        <label htmlFor="admin" className="text-sm">Require administrator privileges</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="audit" defaultChecked />
                        <label htmlFor="audit" className="text-sm">Enable audit logging</label>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-3">Certificate Storage</h3>
                    <div className="space-y-2">
                      <label className="block text-sm">Storage Location</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg" 
                        defaultValue="~/.wipetrust/certificates"
                        readOnly
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-3">Interface</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="notifications" defaultChecked />
                        <label htmlFor="notifications" className="text-sm">Show completion notifications</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="sounds" />
                        <label htmlFor="sounds" className="text-sm">Enable sound alerts</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="border-t bg-gradient-to-r from-white to-slate-50 px-8 py-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span className="font-medium">Safety Notice: This action permanently erases data. Ensure backups before proceeding.</span>
            </div>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg px-8 py-3 text-lg font-semibold"
              onClick={startWipe}
              disabled={selectedDevices.length === 0 || wipeProgress?.isActive}
            >
              {wipeProgress?.isActive ? 'Wipe in Progress...' : 'Start Secure Wipe'}
            </Button>
          </div>
        </div>
      </div>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>WipeTrust User Guide</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Getting Started</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Connect storage devices you want to securely erase</li>
                <li>• Ensure devices are unmounted before wiping</li>
                <li>• Administrator privileges are required for device access</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Secure Erasure Process</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Uses NIST SP 800-88 Rev.1 standard by default</li>
                <li>• Multiple overwrite passes ensure data cannot be recovered</li>
                <li>• Progress is tracked in real-time</li>
                <li>• Certificates are generated automatically upon completion</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Safety Guidelines</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Data erasure is permanent and irreversible</li>
                <li>• Ensure you have backups of important data</li>
                <li>• Only wipe devices you own or have permission to erase</li>
                <li>• Keep certificates for audit and compliance purposes</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificate Viewer Dialog */}
      <Dialog open={!!selectedCertificate} onOpenChange={() => setSelectedCertificate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Certificate Details</DialogTitle>
          </DialogHeader>
          {selectedCertificate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Device Information</h4>
                  <p className="text-sm text-gray-600">Name: {selectedCertificate.device.name}</p>
                  <p className="text-sm text-gray-600">Path: {selectedCertificate.device.path}</p>
                  <p className="text-sm text-gray-600">Size: {ipcService.formatBytes(selectedCertificate.device.size)}</p>
                </div>
                <div>
                  <h4 className="font-medium">Wipe Details</h4>
                  <p className="text-sm text-gray-600">Method: {selectedCertificate.wipe.method}</p>
                  <p className="text-sm text-gray-600">Passes: {selectedCertificate.wipe.passes}</p>
                  <p className="text-sm text-gray-600">Duration: {Math.round(selectedCertificate.wipe.duration / 60000)} minutes</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium">Digital Signature</h4>
                <p className="text-xs text-gray-600 font-mono break-all">{selectedCertificate.signature.value}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={async () => {
                    try {
                      const result = await ipcService.verifyCertificate(selectedCertificate.id);
                      toast.success(result.valid ? 'Certificate is valid' : 'Certificate is invalid');
                    } catch (error) {
                      toast.error('Verification failed');
                    }
                  }}
                >
                  Verify Certificate
                </Button>
                <Button 
                  variant="outline"
                  onClick={async () => {
                    try {
                      const result = await ipcService.exportCertificate(selectedCertificate.id, 'pdf');
                      if (result.success) {
                        toast.success(`Certificate exported to ${result.path}`);
                      }
                    } catch (error) {
                      toast.error('Export failed');
                    }
                  }}
                >
                  Export PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
