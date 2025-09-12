import { useState } from "react";
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
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Mock data for demonstration
const mockDevices = [
  {
    id: 1,
    name: "Samsung SSD 970 EVO",
    type: "SSD",
    size: "1 TB",
    status: "ready",
    icon: HardDrive,
    encrypted: true,
    mountPoint: "/dev/nvme0n1"
  }
];

const mockFiles = [
  { name: 'Documents', type: 'folder', size: '2.3 GB', items: 156 },
  { name: 'Pictures', type: 'folder', size: '8.7 GB', items: 2043 },
  { name: 'Videos', type: 'folder', size: '45.2 GB', items: 89 },
  { name: 'Downloads', type: 'folder', size: '1.8 GB', items: 234 },
  { name: 'System Files', type: 'folder', size: '12.1 GB', items: 5672 },
  { name: 'AppData', type: 'folder', size: '3.4 GB', items: 1200 },
];

const erasureMethods = [
  { name: 'NIST SP 800-88 Rev.1', description: 'Single pass zero overwrite (Recommended for SSDs)', recommended: true },
  { name: 'DoD 5220.22-M', description: '3-pass overwrite with random data (HDDs)', recommended: false },
  { name: 'Gutmann Method', description: '35-pass overwrite (Legacy HDDs)', recommended: false },
  { name: 'Cryptographic Erasure', description: 'Destroy encryption keys (Encrypted devices)', recommended: true }
];

const auditLogs = [
  { time: '14:23:45', action: 'Device detection started', status: 'Success' },
  { time: '14:23:46', action: 'Samsung SSD 970 EVO detected', status: 'Success' },
  { time: '14:23:47', action: 'Encryption status: ENCRYPTED', status: 'Info' },
  { time: '14:23:48', action: 'Ready for cryptographic erasure', status: 'Standby' }
];

const sidebarItems = [
  { icon: HardDrive, label: "Devices", id: "devices", active: true },
  { icon: Activity, label: "Progress", id: "progress", active: false },
  { icon: Shield, label: "Certificates", id: "certificates", active: false },
  { icon: Monitor, label: "Erasure Method", id: "method", active: false },
  { icon: Settings, label: "Preferences", id: "preferences", active: false },
];

export default function WipeTrustApp() {
  const [wipeProgress, setWipeProgress] = useState(42);
  const [activeSidebarItem, setActiveSidebarItem] = useState("devices");
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "idle":
        return <Badge variant="secondary" className="text-muted-foreground">Idle</Badge>;
      case "warning":
        return <Badge className="bg-warning text-warning-foreground">Warning</Badge>;
      case "ready":
        return <Badge className="bg-success text-success-foreground">Ready</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border animate-slide-in relative">
        <div className="p-6 pb-32">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-sidebar-foreground">WipeTrust</span>
          </div>

          <nav className="space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSidebarItem(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSidebarItem === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
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

        {/* Help Section - Fixed positioning */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-sidebar-accent/50 rounded-lg p-4 border border-sidebar-border/30">
            <h4 className="text-sm font-medium text-sidebar-foreground mb-3">Erasure Methods</h4>
            <div className="space-y-2 mb-4">
              {erasureMethods.slice(0, 2).map((method, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className={`w-1 h-1 rounded-full mt-2 ${method.recommended ? 'bg-green-400' : 'bg-gray-400'}`} />
                  <div>
                    <div className="text-xs font-medium text-sidebar-foreground">{method.name}</div>
                    <div className="text-xs text-sidebar-foreground/60">{method.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <h4 className="text-sm font-medium text-sidebar-foreground mb-2">Audit Logs</h4>
            <div className="space-y-1 mb-3">
              {auditLogs.slice(-2).map((log, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <span className="text-sidebar-foreground/40">{log.time}</span>
                  <span className="text-sidebar-foreground/60">{log.action}</span>
                </div>
              ))}
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full h-8 text-xs border-sidebar-border/30 bg-transparent text-sidebar-foreground hover:bg-sidebar-border/20"
            >
              <HelpCircle className="w-3 h-3 mr-2" />
              View All Logs
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-6 py-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold text-foreground">WipeTrust</h1>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 animate-fade-in overflow-auto">
          {activeSidebarItem === "devices" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Detected Devices</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    🔍 Search devices
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    Rescan
                  </Button>
                </div>
              </div>

              <div className="bg-card rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="font-medium">Device</TableHead>
                      <TableHead className="font-medium">Type</TableHead>
                      <TableHead className="font-medium">Size</TableHead>
                      <TableHead className="font-medium">Encryption</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockDevices.map((device) => (
                      <TableRow key={device.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <device.icon className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{device.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{device.type}</TableCell>
                        <TableCell className="text-muted-foreground">{device.size}</TableCell>
                        <TableCell>
                          <Badge className={device.encrypted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                            {device.encrypted ? "Encrypted" : "Not Encrypted"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(device.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                setShowDetails(true);
                                setSelectedDevice(device);
                              }}
                            >
                              Details
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="h-7 px-2 text-xs"
                            >
                              {device.encrypted ? "Crypto Erase" : "Format"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Encryption Detection Info */}
              <div className="bg-muted/30 rounded-lg p-4 flex items-start gap-3 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-foreground mb-1">Device Encryption Status</div>
                  <div className="text-muted-foreground">
                    {mockDevices[0]?.encrypted ? (
                      <span>🔒 This device is <strong>encrypted</strong>. Cryptographic erasure will permanently destroy encryption keys, making all data irrecoverable.</span>
                    ) : (
                      <span>🔓 This device is <strong>not encrypted</strong>. Standard formatting will be performed with secure overwrite patterns.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* File Details Modal */}
              {showDetails && selectedDevice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-card rounded-lg border p-6 w-full max-w-4xl m-4 max-h-[80vh] overflow-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Device Details - {selectedDevice.name}</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowDetails(false)}
                        className="text-xs"
                      >
                        Close
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <h4 className="font-medium mb-3">Files and Folders</h4>
                        <div className="bg-muted/20 rounded-lg p-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Items</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mockFiles.map((file, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{file.name}</TableCell>
                                  <TableCell className="text-muted-foreground">{file.type}</TableCell>
                                  <TableCell className="text-muted-foreground">{file.size}</TableCell>
                                  <TableCell className="text-muted-foreground">{file.items}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-3">Device Information</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Mount Point:</span>
                            <span className="font-mono">{selectedDevice.mountPoint}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span>{selectedDevice.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Size:</span>
                            <span>{selectedDevice.size}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Encrypted:</span>
                            <span>{selectedDevice.encrypted ? "Yes" : "No"}</span>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <Button 
                            className="w-full" 
                            size="sm"
                          >
                            {selectedDevice.encrypted ? "Start Crypto Erase" : "Start Format"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSidebarItem === "progress" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Wipe Progress</h2>
              <div className="text-sm text-muted-foreground mb-4">
                Shows live status after you start
              </div>

              <div className="bg-card rounded-lg border p-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span className="text-muted-foreground">{wipeProgress}% • Pass 1/3 • Overwriting blocks...</span>
                </div>
                <Progress value={wipeProgress} className="h-2 mb-6" />
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge className="bg-success text-success-foreground text-xs">Completed</Badge>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Hash</span>
                      <span className="text-sm font-mono">0x82a...b2f6</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Signed by</span>
                      <span className="text-sm">WipeTrust CA</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Timestamp</span>
                      <span className="text-sm">2023-03-08 14:22 UTC</span>
                    </div>
                  </div>

                  <div className="bg-muted/20 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                    <div className="text-center text-muted-foreground">
                      <FileCheck className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Wipe certificate preview will render here after completion.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" size="sm" className="text-xs">
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Download className="w-4 h-4 mr-1" />
                    JSON
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Certificates are tamper-evident and verifiable offline.
                </p>
              </div>
            </div>
          )}

          {activeSidebarItem === "certificates" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Certificate Management</h2>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                View and manage digitally signed wipe certificates
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Example certificates */}
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <FileCheck className="w-5 h-5 text-success" />
                    <Badge className="bg-success text-success-foreground text-xs">Verified</Badge>
                  </div>
                  <h3 className="font-medium mb-2">Samsung SSD Certificate</h3>
                  <p className="text-sm text-muted-foreground mb-3">Generated: 2024-01-15</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs">View</Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs">Download</Button>
                  </div>
                </div>

                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <FileCheck className="w-5 h-5 text-success" />
                    <Badge className="bg-success text-success-foreground text-xs">Verified</Badge>
                  </div>
                  <h3 className="font-medium mb-2">USB Drive Certificate</h3>
                  <p className="text-sm text-muted-foreground mb-3">Generated: 2024-01-12</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs">View</Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs">Download</Button>
                  </div>
                </div>

                <div className="bg-card rounded-lg border-2 border-dashed border-muted p-4 flex items-center justify-center min-h-[140px]">
                  <div className="text-center text-muted-foreground">
                    <Shield className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Complete a wipe to generate certificates</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSidebarItem === "method" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Erasure Method</h2>
              <div className="text-sm text-muted-foreground">
                Configure secure data wiping standards and methods
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Security Standards</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">NIST SP 800-88 Rev.1</div>
                        <div className="text-sm text-muted-foreground">Recommended for most devices</div>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" name="standard" defaultChecked className="mr-2" />
                        <Badge className="bg-success text-success-foreground">Active</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">DoD 5220.22-M</div>
                        <div className="text-sm text-muted-foreground">Department of Defense standard</div>
                      </div>
                      <input type="radio" name="standard" className="mr-2" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">CESG CPA - Higher Level</div>
                        <div className="text-sm text-muted-foreground">UK government standard</div>
                      </div>
                      <input type="radio" name="standard" className="mr-2" />
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Method Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Number of Passes</label>
                      <select className="w-full mt-1 p-2 border rounded-md bg-background">
                        <option>3 passes (Recommended)</option>
                        <option>1 pass (Quick)</option>
                        <option>7 passes (Thorough)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Verification</label>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="mr-2" />
                          <span className="text-sm">Verify each pass</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="mr-2" />
                          <span className="text-sm">Generate hash verification</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Higher security standards require more time to complete. 
                    SSDs use built-in secure erase commands when available for optimal performance.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSidebarItem === "preferences" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Preferences</h2>
              <div className="text-sm text-muted-foreground">
                Configure application settings and behavior
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Auto-scan on startup</div>
                        <div className="text-sm text-muted-foreground">Automatically detect devices when app starts</div>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">  
                      <div>
                        <div className="font-medium">Confirm before wipe</div>
                        <div className="text-sm text-muted-foreground">Show confirmation dialog before starting</div>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Play sound on completion</div>
                        <div className="text-sm text-muted-foreground">Audio notification when wipe completes</div>
                      </div>
                      <input type="checkbox" />
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Certificate Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Default export format</label>
                      <select className="w-full mt-1 p-2 border rounded-md bg-background">
                        <option>PDF</option>
                        <option>JSON</option>
                        <option>Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Certificate storage location</label>
                      <div className="flex mt-1">
                        <input type="text" value="~/Documents/WipeTrust/Certificates" className="flex-1 p-2 border rounded-l-md bg-background" readOnly />
                        <Button variant="outline" size="sm" className="rounded-l-none">Browse</Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Auto-backup certificates</div>
                        <div className="text-sm text-muted-foreground">Automatically backup to cloud storage</div>
                      </div>
                      <input type="checkbox" />
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Security</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Signing certificate</label>
                      <div className="flex mt-1">
                        <input type="text" value="WipeTrust Default CA" className="flex-1 p-2 border rounded-l-md bg-background" readOnly />
                        <Button variant="outline" size="sm" className="rounded-l-none">Change</Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Require admin privileges</div>
                        <div className="text-sm text-muted-foreground">Request admin access for device operations</div>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Advanced</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Log level</label>
                      <select className="w-full mt-1 p-2 border rounded-md bg-background">
                        <option>Info</option>
                        <option>Debug</option>
                        <option>Error only</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">Export Logs</Button>
                      <Button variant="outline" size="sm" className="flex-1">Reset Settings</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="border-t bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>Safety: This action permanently erases data. Ensure backups before proceeding.</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Advanced</Button>
              <Button className="bg-primary hover:bg-primary/90">
                Start Wipe
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}