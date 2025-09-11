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
          <div className="bg-sidebar-accent/50 rounded-lg p-4 border border-sidebar-border/30">
            <h4 className="text-sm font-medium text-sidebar-foreground mb-2">Need help?</h4>
            <p className="text-xs text-sidebar-foreground/60 mb-3">
              Read the secure erasure guide and best practices.
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full h-8 text-xs border-sidebar-border/30 bg-transparent text-sidebar-foreground hover:bg-sidebar-border/20"
            >
              <HelpCircle className="w-3 h-3 mr-2" />
              Open Guide
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
        <div className="flex-1 p-6 animate-fade-in">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 bg-muted/30">
              <TabsTrigger value="device-list" className="data-[state=active]:bg-card">Device List</TabsTrigger>
              <TabsTrigger value="wipe-progress" className="data-[state=active]:bg-card">Wipe Progress</TabsTrigger>
              <TabsTrigger value="certificates" className="data-[state=active]:bg-card">Certificates</TabsTrigger>
            </TabsList>

            <TabsContent value="device-list" className="mt-0">
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
                          <TableCell>{getStatusBadge(device.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Details</Button>
                              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Verify</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span>Select one or more devices to securely erase. Default method: NIST SP 800-88 Rev.1.</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="wipe-progress" className="mt-0">
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
            </TabsContent>

            <TabsContent value="certificates" className="mt-0">
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Certificate Management</h2>
                <div className="text-sm text-muted-foreground">
                  View and manage digitally signed wipe certificates
                </div>

                <div className="bg-card rounded-lg border p-12 text-center">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Certificates Yet</h3>
                  <p className="text-muted-foreground">
                    Complete a secure wipe to generate your first tamper-proof certificate.
                  </p>
                </div>
              </div>
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