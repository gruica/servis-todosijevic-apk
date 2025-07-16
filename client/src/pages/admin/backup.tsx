import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Download, 
  Upload, 
  Database, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Trash2,
  RefreshCw,
  HardDrive,
  Calendar
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface BackupFile {
  name: string;
  size: number;
  created: string;
  path: string;
  type: 'automatic' | 'manual';
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackup: string | null;
  automaticBackupsEnabled: boolean;
  diskUsage: number;
}

export default function AdminBackup() {
  const [isCreateBackupOpen, setIsCreateBackupOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [includeNotifications, setIncludeNotifications] = useState(true);
  const [backupNote, setBackupNote] = useState("");
  
  const { toast } = useToast();

  // Fetch backup statistics
  const { data: backupStats, isLoading: loadingStats } = useQuery<BackupStats>({
    queryKey: ["/api/admin/backup/stats"],
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch backup files
  const { data: backupFiles = [], isLoading: loadingFiles, refetch: refetchFiles } = useQuery<BackupFile[]>({
    queryKey: ["/api/admin/backup/files"],
    staleTime: 30 * 1000, // 30 seconds
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async (data: { includeNotifications: boolean; note?: string }) => {
      const response = await apiRequest("POST", "/api/admin/backup/create", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Backup kreiran",
        description: `Backup je uspešno kreiran: ${data.filename}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/files"] });
      setIsCreateBackupOpen(false);
      setBackupProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri kreiranju backup-a",
        description: error.message || "Dogodila se greška prilikom kreiranja backup-a.",
        variant: "destructive",
      });
      setBackupProgress(0);
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (data: { backupPath: string; skipNotifications?: boolean }) => {
      const response = await apiRequest("POST", "/api/admin/backup/restore", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Backup obnovljen",
        description: "Podaci su uspešno obnovljeni iz backup-a.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/stats"] });
      setIsRestoreOpen(false);
      setRestoreProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri obnavljanju backup-a",
        description: error.message || "Dogodila se greška prilikom obnavljanja backup-a.",
        variant: "destructive",
      });
      setRestoreProgress(0);
    },
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupPath: string) => {
      const response = await apiRequest("DELETE", `/api/admin/backup/delete`, { backupPath });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Backup obrisan",
        description: "Backup je uspešno obrisan.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/files"] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri brisanju backup-a",
        description: error.message || "Dogodila se greška prilikom brisanja backup-a.",
        variant: "destructive",
      });
    },
  });

  const handleCreateBackup = () => {
    setBackupProgress(10);
    createBackupMutation.mutate({
      includeNotifications,
      note: backupNote || undefined
    });
  };

  const handleRestoreBackup = () => {
    if (!selectedBackup) return;
    
    setRestoreProgress(10);
    restoreBackupMutation.mutate({
      backupPath: selectedBackup.path,
      skipNotifications: !includeNotifications
    });
  };

  const handleDeleteBackup = (backup: BackupFile) => {
    if (confirm(`Da li ste sigurni da želite da obrišete backup "${backup.name}"?`)) {
      deleteBackupMutation.mutate(backup.path);
    }
  };

  const formatFileSize = (bytes: number) => {
    const MB = bytes / (1024 * 1024);
    return `${MB.toFixed(2)} MB`;
  };

  const getBackupTypeColor = (type: 'automatic' | 'manual') => {
    return type === 'automatic' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  if (loadingStats || loadingFiles) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Učitavanje backup podataka...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Backup i Restore</h1>
            <p className="text-gray-600">Upravljanje backup-ovima baze podataka</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => refetchFiles()}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Osveži</span>
            </Button>
            <Button 
              onClick={() => setIsCreateBackupOpen(true)}
              className="flex items-center space-x-2"
            >
              <Database className="h-4 w-4" />
              <span>Kreiraj Backup</span>
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ukupno Backup-ova</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{backupStats?.totalBackups || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ukupna Veličina</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(backupStats?.totalSize || 0)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Poslednji Backup</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {backupStats?.lastBackup 
                  ? formatDate(backupStats.lastBackup).split(' ')[0]
                  : "Nema"}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automatski Backup</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {backupStats?.automaticBackupsEnabled ? "Uključen" : "Isključen"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Backup Files */}
        <Card>
          <CardHeader>
            <CardTitle>Backup Fajlovi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {backupFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nema dostupnih backup fajlova</p>
                </div>
              ) : (
                backupFiles.map((backup) => (
                  <div
                    key={backup.name}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <Database className="h-8 w-8 text-blue-500" />
                      <div>
                        <div className="font-medium">{backup.name}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(backup.created)} • {formatFileSize(backup.size)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getBackupTypeColor(backup.type)}>
                        {backup.type === 'automatic' ? 'Automatski' : 'Manuelni'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBackup(backup);
                          setIsRestoreOpen(true);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Obnovi
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBackup(backup)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Obriši
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Backup Dialog */}
        <Dialog open={isCreateBackupOpen} onOpenChange={setIsCreateBackupOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kreiraj Novi Backup</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeNotifications"
                  checked={includeNotifications}
                  onChange={(e) => setIncludeNotifications(e.target.checked)}
                />
                <Label htmlFor="includeNotifications">
                  Uključi notifikacije u backup
                </Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="backupNote">Napomena (opciono)</Label>
                <Input
                  id="backupNote"
                  placeholder="Dodaj napomenu o backup-u..."
                  value={backupNote}
                  onChange={(e) => setBackupNote(e.target.value)}
                />
              </div>

              {backupProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={backupProgress} />
                  <p className="text-sm text-gray-500">Kreiranje backup-a...</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateBackupOpen(false)}>
                Otkaži
              </Button>
              <Button 
                onClick={handleCreateBackup}
                disabled={createBackupMutation.isPending}
              >
                <Database className="h-4 w-4 mr-2" />
                Kreiraj Backup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Backup Dialog */}
        <Dialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Obnovi iz Backup-a</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  UPOZORENJE: Ova akcija će zameniti sve postojeće podatke u bazi sa podacima iz backup-a. 
                  Ova akcija se ne može poništiti.
                </AlertDescription>
              </Alert>

              {selectedBackup && (
                <div className="p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium">{selectedBackup.name}</h4>
                  <p className="text-sm text-gray-500">
                    Kreiran: {formatDate(selectedBackup.created)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Veličina: {formatFileSize(selectedBackup.size)}
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeNotificationsRestore"
                  checked={includeNotifications}
                  onChange={(e) => setIncludeNotifications(e.target.checked)}
                />
                <Label htmlFor="includeNotificationsRestore">
                  Obnovi notifikacije
                </Label>
              </div>

              {restoreProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={restoreProgress} />
                  <p className="text-sm text-gray-500">Obnavljanje backup-a...</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRestoreOpen(false)}>
                Otkaži
              </Button>
              <Button 
                onClick={handleRestoreBackup}
                disabled={restoreBackupMutation.isPending}
                variant="destructive"
              >
                <Upload className="h-4 w-4 mr-2" />
                Obnovi Backup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}