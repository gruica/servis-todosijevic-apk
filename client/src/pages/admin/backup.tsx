import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Database, 
  Download, 
  Upload, 
  FileText, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  HardDrive
} from "lucide-react";

interface BackupInfo {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  tables: number;
  records: number;
  status: 'success' | 'error' | 'in_progress';
}

export default function BackupPage() {
  const { toast } = useToast();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  // Fetch backup history
  const { data: backups = [], isLoading } = useQuery<BackupInfo[]>({
    queryKey: ['/api/admin/backups'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/backups', { method: 'GET' });
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      setIsCreatingBackup(true);
      setBackupProgress(0);
      
      const response = await apiRequest('/api/admin/backups/create', {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsCreatingBackup(false);
      setBackupProgress(100);
      toast({
        title: "Backup kreiran",
        description: `Backup ${data.name} je uspešno kreiran.`,
      });
      // Refresh backup list
      // Refresh backup list after creation
    },
    onError: (error: any) => {
      setIsCreatingBackup(false);
      setBackupProgress(0);
      toast({
        title: "Greška pri kreiranju backup-a",
        description: error.message || "Došlo je do greške pri kreiranju backup-a.",
        variant: "destructive",
      });
    }
  });

  // Download backup mutation
  const downloadBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await apiRequest(`/api/admin/backups/${backupId}/download`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download backup');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${backupId}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Download započet",
        description: "Backup fajl će biti preuzet momentalno.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri download-u",
        description: error.message || "Nije moguće preuzeti backup fajl.",
        variant: "destructive",
      });
    }
  });

  const handleCreateBackup = () => {
    createBackupMutation.mutate();
  };

  const handleDownload = (backupId: string) => {
    downloadBackupMutation.mutate(backupId);
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Uspešno</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Greška</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><HardDrive className="h-3 w-3 mr-1" />U toku</Badge>;
      default:
        return <Badge variant="outline">Nepoznato</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Backup i Restore
          </h1>
          <p className="text-muted-foreground mt-1">
            Kreiranje i upravljanje backup-ovima baze podataka
          </p>
        </div>

        <div className="grid gap-6">
          {/* Create Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Kreiraj novi backup
              </CardTitle>
              <CardDescription>
                Kreiranje kompletnog backup-a svih tabela u bazi podataka
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCreatingBackup && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Kreiranje backup-a...</span>
                    <span>{backupProgress}%</span>
                  </div>
                  <Progress value={backupProgress} className="w-full" />
                </div>
              )}
              
              <Button 
                onClick={handleCreateBackup}
                disabled={createBackupMutation.isPending || isCreatingBackup}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                {isCreatingBackup ? "Kreiranje backup-a..." : "Kreiraj backup"}
              </Button>
            </CardContent>
          </Card>

          {/* Backup History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Istorija backup-ova
              </CardTitle>
              <CardDescription>
                Lista svih kreiranih backup-ova sa mogućnošću download-a
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nema kreiranih backup-ova</p>
                  <p className="text-sm">Kreirajte prvi backup koristeći dugme iznad</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {backups.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{backup.name}</h3>
                          {getStatusBadge(backup.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(backup.createdAt).toLocaleString('sr-RS')}
                          </div>
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {formatFileSize(backup.size)}
                          </div>
                          <span>{backup.tables} tabela</span>
                          <span>{backup.records.toLocaleString()} zapisa</span>
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(backup.id)}
                        disabled={backup.status !== 'success' || downloadBackupMutation.isPending}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Preuzmi
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Restore Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Restore informacije
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                  Restore funkcionalnost je dostupna samo kroz direktan pristup bazi podataka
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  Backup fajlovi su u SQL formatu i mogu se importovati kroz psql alat
                </p>
                <p className="ml-6">
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    psql -h hostname -U username -d database_name &lt; backup.sql
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}