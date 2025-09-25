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
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ipcService } from "@/services/ipcService";

interface Device {
  id: string;
  name: string;
  type: string;
  size: string;
  status: string;
  path: string;
  serial: string;
  mounted: boolean;
  encrypted: boolean;
  interface: string;
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
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to load devices:', error);
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
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to scan devices:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const startWipe = async () => {
    if (selectedDevices.length === 0) {
      alert('Please select at least one device to wipe');
      return;
    }

    try {
      await ipcService.startWipe(selectedDevices, {
        standard: 'NIST-SP-800-88',
        passes: 3,
        verify: true
      });
      
      setActiveSidebarItem("progress");
    } catch (error) {
      console.error('Failed to start wipe:', error);
      alert('Failed to start wipe operation');
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">WipeTrust</span>
          </div>

          <nav className="space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSidebarItem(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSidebarItem === item.id
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-50"
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
        <div className="absolute bottom-6 left-6 right-6 max-w-52">
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Need help?</h4>
            <p className="text-xs text-gray-600 mb-3">
              Read the secure erasure guide and best practices.
            </p>
            <Button size="sm" variant="outline" className="w-full h-8 text-xs">
              <HelpCircle className="w-3 h-3 mr-2" />
              Open Guide
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">WipeTrust</h1>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          {activeSidebarItem === "devices" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Detected Devices</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={scanDevices}
                  disabled={isScanning}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Scanning...' : 'Rescan'}
                </Button>
              </div>

              {devices.length === 0 ? (
                <div className="bg-white rounded-lg border p-8 text-center">
                  <HardDrive className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Devices Detected</h3>
                  <p className="text-gray-600 mb-4">
                    Connect storage devices and click rescan to detect them.
                  </p>
                  <Button onClick={scanDevices} disabled={isScanning}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                    Scan for Devices
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Select</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((device) => {
                        const DeviceIcon = getDeviceIcon(device.type);
                        return (
                          <TableRow key={device.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedDevices.includes(device.id)}
                                onChange={() => toggleDeviceSelection(device.id)}
                                disabled={device.mounted}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <DeviceIcon className="w-4 h-4 text-gray-500" />
                                <div>
                                  <span className="font-medium">{device.name}</span>
                                  <div className="text-xs text-gray-500">{device.path}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{device.type} ({device.interface})</TableCell>
                            <TableCell>{device.size}</TableCell>
                            <TableCell>{getStatusBadge(device.status)}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
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
                        <span className="text-sm text-gray-600">Current Device</span>
                        <span className="text-sm">{wipeProgress.currentDevice || 'None'}</span>
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
                      onClick={() => ipcService.stopWipe()}
                    >
                      Cancel Wipe
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
                        <Button variant="outline" size="sm" className="flex-1 text-xs">
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-xs">
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

          {(activeSidebarItem === "method" || activeSidebarItem === "preferences") && (
            <div className="bg-white rounded-lg border p-8 text-center">
              <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
              <p className="text-gray-600">
                This section will be implemented in the next iteration.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="border-t bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="w-4 h-4" />
              <span>Safety: This action permanently erases data. Ensure backups before proceeding.</span>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={startWipe}
              disabled={selectedDevices.length === 0 || wipeProgress?.isActive}
            >
              {wipeProgress?.isActive ? 'Wipe in Progress...' : 'Start Wipe'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
