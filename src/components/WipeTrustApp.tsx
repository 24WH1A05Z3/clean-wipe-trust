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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock data for demonstration
const mockDevices = [
  {
    id: 1,
    name: "Samsung SSD 970 EVO",
    type: "SSD",
    size: "1 TB",
    status: "idle",
    icon: HardDrive
  },
  {
    id: 2,
    name: "Seagate Barracuda",
    type: "HDD", 
    size: "2 TB",
    status: "warning",
    icon: HardDrive
  },
  {
    id: 3,
    name: "Kingston DataTraveler",
    type: "USB",
    size: "64 GB", 
    status: "ready",
    icon: Usb
  }
];

const sidebarItems = [
  { icon: HardDrive, label: "Devices", id: "devices", active: true },
  { icon: Activity, label: "Progress", id: "progress", active: false },
  { icon: Shield, label: "Certificates", id: "certificates", active: false },
  { icon: Monitor, label: "Erasure Method", id: "method", active: false },
  { icon: Settings, label: "Preferences", id: "preferences", active: false },
];

export default function WipeTrustApp() {
  const [activeTab, setActiveTab] = useState("device-list");
  const [wipeProgress, setWipeProgress] = useState(42);
  const [activeSidebarItem, setActiveSidebarItem] = useState("devices");

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
      <div className="w-64 bg-sidebar border-r border-sidebar-border animate-slide-in">
        <div className="p-6">
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

        {/* Help Section */}
        <div className="absolute bottom-6 left-6 right-6">
          <Card className="bg-sidebar-accent border-sidebar-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-sidebar-foreground">Need help?</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-sidebar-foreground/70 mb-3">
                Read the secure erasure guide and best practices.
              </p>
              <Button size="sm" variant="outline" className="w-full border-sidebar-border">
                <HelpCircle className="w-4 h-4 mr-2" />
                Open Guide
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-6 py-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold text-foreground">WipeTrust</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>No changes were made to your devices.</span>
                <Button variant="link" size="sm" className="h-auto p-0 text-primary">
                  Undo
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 animate-fade-in">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="device-list">Device List</TabsTrigger>
              <TabsTrigger value="wipe-progress">Wipe Progress</TabsTrigger>
              <TabsTrigger value="certificates">Certificates</TabsTrigger>
            </TabsList>

            <TabsContent value="device-list" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Detected Devices</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Search devices
                      </Button>
                      <Button variant="outline" size="sm">
                        Rescan
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockDevices.map((device) => (
                        <TableRow key={device.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <device.icon className="w-5 h-5 text-muted-foreground" />
                              <span className="font-medium">{device.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{device.type}</TableCell>
                          <TableCell>{device.size}</TableCell>
                          <TableCell>{getStatusBadge(device.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">Details</Button>
                              <Button variant="outline" size="sm">Verify</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      ⚙️ Select one or more devices to securely erase. Default method: NIST SP 800-88 Rev.1.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wipe-progress" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Wipe Progress</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Shows live status after you start
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Overall Progress</span>
                        <span>{wipeProgress}% • Pass 1/3 • Overwriting blocks...</span>
                      </div>
                      <Progress value={wipeProgress} className="h-3" />
                    </div>
                    
                    <div className="space-y-3 mt-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Status</span>
                        <Badge className="bg-success text-success-foreground">Completed</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Hash</span>
                        <span className="text-sm font-mono">0x82a...b2f6</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Signed by</span>
                        <span className="text-sm">WipeTrust CA</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Timestamp</span>
                        <span className="text-sm">2023-03-08 14:22 UTC</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Certificate Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 rounded-lg p-6 min-h-[200px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <FileCheck className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Wipe certificate preview will render here after completion.</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        JSON
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Certificates are tamper-evident and verifiable offline.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="certificates" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Certificate Management</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    View and manage digitally signed wipe certificates
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Certificates Yet</h3>
                    <p className="text-muted-foreground">
                      Complete a secure wipe to generate your first tamper-proof certificate.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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