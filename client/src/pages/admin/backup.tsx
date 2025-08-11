import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Database, 
  Download, 
  Upload, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Settings,
  Calendar,
  HardDrive,
  Archive,
  RefreshCw
} from 'lucide-react';

interface BackupConfig {
  id: number;
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  retentionDays: number;
  includeUploads: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  storageLocation: 'local' | 'cloud';
  maxBackupSize: number;
  lastBackup?: string;
  nextScheduledBackup?: string;
}

interface BackupHistory {
  id: number;
  fileName: string;
  size: number;
  createdAt: string;
  type: 'manual' | 'automatic';
  status: 'completed' | 'failed' | 'in_progress';
  downloadUrl?: string;
  errorMessage?: string;
}

interface BackupProgress {
  stage: string;
  progress: number;
  totalSteps: number;
  currentStep: number;
  message: string;
}

export default function BackupPage() {
  const [config, setConfig] = useState<BackupConfig>({
    id: 0,
    autoBackupEnabled: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    retentionDays: 30,
    includeUploads: false,
    compressionEnabled: true,
    encryptionEnabled: false,
    storageLocation: 'local',
    maxBackupSize: 500,
    lastBackup: undefined,
    nextScheduledBackup: undefined
  });

  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const { toast } = useToast();

  // Učitaj backup konfiguraciju
  const { data: backupConfig, isLoading: configLoading } = useQuery<BackupConfig>({
    queryKey: ['/api/admin/backup-config'],
    enabled: true,
    retry: 1
  });

  // Update config when data is loaded
  useEffect(() => {
    if (backupConfig) {
      setConfig(backupConfig);
    }
  }, [backupConfig]);

  // Učitaj istoriju backup-a
  const { data: backupHistory = [], isLoading: historyLoading } = useQuery<BackupHistory[]>({
    queryKey: ['/api/admin/backup-history'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Sačuvaj konfiguraciju
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Partial<BackupConfig>) => {
      const response = await apiRequest('/api/admin/backup-config', {
        method: 'POST',
        body: JSON.stringify(configData)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Konfiguracija sačuvana",
        description: "Backup postavke su uspešno ažurirane.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri čuvanju",
        description: error.message || "Greška pri čuvanju backup konfiguracije.",
        variant: "destructive",
      });
    }
  });

  // Kreiranje backup-a
  const createBackupMutation = useMutation({
    mutationFn: async (options: { includeUploads: boolean; compress: boolean }) => {
      const response = await apiRequest('/api/admin/backup/create', {
        method: 'POST',
        body: JSON.stringify(options)
      });
      
      if (!response.ok) {
        throw new Error('Greška pri kreiranju backup-a');
      }
      
      // Ako je odgovor stream, pratiti progress
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Parsiranje progress podataka
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const progressData = JSON.parse(line.slice(6)) as BackupProgress;
                setBackupProgress(progressData);
              } catch (e) {
                // Ignoriši parsing greške
              }
            }
          }
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Backup kreiran",
        description: "Baza podataka je uspešno sačuvana.",
      });
      setBackupProgress(null);
      // Refresh backup history
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri backup-u",
        description: error.message || "Greška pri kreiranju backup-a baze.",
        variant: "destructive",
      });
      setBackupProgress(null);
    }
  });

  // Restauracija backup-a
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: number) => {
      const response = await apiRequest(`/api/admin/backup/restore/${backupId}`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Baza restaurirana",
        description: "Baza podataka je uspešno restaurirana iz backup-a.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri restauraciji",
        description: error.message || "Greška pri restauraciji baze iz backup-a.",
        variant: "destructive",
      });
    }
  });

  // Brisanje backup-a
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: number) => {
      const response = await apiRequest(`/api/admin/backup/${backupId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Backup obrisan",
        description: "Backup fajl je uspešno obrisan.",
      });
      // Refresh backup history
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri brisanju",
        description: error.message || "Greška pri brisanju backup fajla.",
        variant: "destructive",
      });
    }
  });

  const handleSaveConfig = () => {
    saveConfigMutation.mutate(config);
  };

  const handleCreateBackup = () => {
    setBackupProgress({
      stage: 'initializing',
      progress: 0,
      totalSteps: 5,
      currentStep: 1,
      message: 'Inicijalizujem backup proces...'
    });

    createBackupMutation.mutate({
      includeUploads: config.includeUploads,
      compress: config.compressionEnabled
    });
  };

  const handleRestoreBackup = (backupId: number) => {
    if (window.confirm('Da li ste sigurni da želite da restaurirate bazu iz ovog backup-a? Trenutni podaci će biti zamenjeni.')) {
      restoreBackupMutation.mutate(backupId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('sr-RS');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Završeno</Badge>;
      case 'failed':
        return <Badge variant="destructive">Neuspešno</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">U toku</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Backup i restauracija</h1>
            <p className="text-gray-600 mt-2">
              Upravljanje backup-om baze podataka i sistemskih fajlova
            </p>
          </div>
          <Button 
            onClick={handleCreateBackup}
            disabled={createBackupMutation.isPending}
            size="lg"
          >
            <Database className="h-5 w-5 mr-2" />
            {createBackupMutation.isPending ? 'Kreiram backup...' : 'Kreiraj backup'}
          </Button>
        </div>

        {/* Progress bar za backup */}
        {backupProgress && (
          <Alert className="mb-6">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{backupProgress.message}</span>
                  <span>Korak {backupProgress.currentStep} od {backupProgress.totalSteps}</span>
                </div>
                <Progress value={backupProgress.progress} className="h-2" />
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="history" className="w-full">
          <TabsList>
            <TabsTrigger value="history">Istorija backup-a</TabsTrigger>
            <TabsTrigger value="config">Postavke</TabsTrigger>
            <TabsTrigger value="restore">Restauracija</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Poslednji backup-ovi
                </CardTitle>
                <CardDescription>
                  Lista svih kreiranih backup fajlova sa opcijama za download i brisanje.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : backupHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nema kreiranih backup-ova.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {backupHistory.map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Database className="h-8 w-8 text-blue-500" />
                          <div>
                            <h4 className="font-medium">{backup.fileName}</h4>
                            <p className="text-sm text-gray-500">
                              {formatDate(backup.createdAt)} • {formatFileSize(backup.size)} • {backup.type === 'manual' ? 'Ručno' : 'Automatski'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(backup.status)}
                          
                          {backup.status === 'completed' && (
                            <>
                              {backup.downloadUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(backup.downloadUrl)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreBackup(backup.id)}
                                disabled={restoreBackupMutation.isPending}
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteBackupMutation.mutate(backup.id)}
                                disabled={deleteBackupMutation.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Automatski backup
                </CardTitle>
                <CardDescription>
                  Konfiguracija automatskog kreiranja backup-a po rasporedu.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoBackup"
                    checked={config.autoBackupEnabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoBackupEnabled: checked }))}
                  />
                  <Label htmlFor="autoBackup">Omogući automatski backup</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Učestalost</Label>
                    <Select 
                      value={config.backupFrequency} 
                      onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                        setConfig(prev => ({ ...prev, backupFrequency: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Dnevno</SelectItem>
                        <SelectItem value="weekly">Nedeljno</SelectItem>
                        <SelectItem value="monthly">Mesečno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backupTime">Vreme backup-a</Label>
                    <Input
                      id="backupTime"
                      type="time"
                      value={config.backupTime}
                      onChange={(e) => setConfig(prev => ({ ...prev, backupTime: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retention">Čuvaj backup-ove (dani)</Label>
                    <Input
                      id="retention"
                      type="number"
                      value={config.retentionDays}
                      onChange={(e) => setConfig(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 30 }))}
                      min="1"
                      max="365"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includeUploads"
                      checked={config.includeUploads}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeUploads: checked }))}
                    />
                    <Label htmlFor="includeUploads">Uključi uploaded fajlove</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="compression"
                      checked={config.compressionEnabled}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, compressionEnabled: checked }))}
                    />
                    <Label htmlFor="compression">Kompresuj backup fajlove</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="encryption"
                      checked={config.encryptionEnabled}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, encryptionEnabled: checked }))}
                    />
                    <Label htmlFor="encryption">Enkriptuj backup fajlove</Label>
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    {config.lastBackup 
                      ? `Poslednji backup: ${formatDate(config.lastBackup)}`
                      : 'Još uvek nema kreiranih backup-ova'
                    }
                    {config.nextScheduledBackup && (
                      <span className="block">Sledeći automatski backup: {formatDate(config.nextScheduledBackup)}</span>
                    )}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restore" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Restauracija iz backup-a
                </CardTitle>
                <CardDescription>
                  Restauriranje baze podataka iz postojećeg backup fajla.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Pažnja:</strong> Restauracija će zameniti trenutne podatke u bazi. 
                    Preporučujemo kreiranje backup-a pre restauracije.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Dostupni backup-ovi za restauraciju:</h4>
                    {backupHistory.filter(b => b.status === 'completed').length === 0 ? (
                      <p className="text-gray-500">Nema dostupnih backup-ova za restauraciju.</p>
                    ) : (
                      <div className="space-y-2">
                        {backupHistory
                          .filter(b => b.status === 'completed')
                          .slice(0, 5)
                          .map((backup) => (
                            <div key={backup.id} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <span className="font-medium">{backup.fileName}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  {formatDate(backup.createdAt)} ({formatFileSize(backup.size)})
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreBackup(backup.id)}
                                disabled={restoreBackupMutation.isPending}
                              >
                                Restauriraj
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSaveConfig}
            disabled={saveConfigMutation.isPending}
          >
            <Settings className="h-4 w-4 mr-2" />
            {saveConfigMutation.isPending ? 'Čuva se...' : 'Sačuvaj postavke'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}