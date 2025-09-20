import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Github,
  GitBranch,
  Clock,
  Star,
  GitFork,
  Download,
  Upload,
  Settings,
  CheckCircle,
  XCircle,
  Info,
  ExternalLink
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GitHubUser {
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
  privateRepos: number;
}

interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  updatedAt: string;
  createdAt: string;
  size: number;
  language: string;
  stargazersCount: number;
  forksCount: number;
}

interface BackupResult {
  file: string;
  success: boolean;
  url?: string;
  error?: string;
}

interface BackupResponse {
  repository: string;
  backupResults: BackupResult[];
  totalFiles: number;
  successfulFiles: number;
  completedAt: string;
}

export default function GitHubManagement() {
  const { toast } = useToast();
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Fetch GitHub user info
  const { data: userInfo, isLoading: isLoadingUser, error: userError } = useQuery<GitHubUser>({
    queryKey: ['/api/github/user'],
    retry: 2,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch repositories
  const { data: repositoriesData, isLoading: isLoadingRepos, error: reposError, refetch: refetchRepos } = useQuery<{repositories: GitHubRepository[], total: number}>({
    queryKey: ['/api/github/repositories'],
    retry: 2,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async (repoName: string) => {
      setIsBackingUp(true);
      setBackupProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setBackupProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      try {
        const result = await apiRequest('/api/github/backup', {
          method: 'POST',
          body: JSON.stringify({ repoName })
        }) as BackupResponse;
        
        clearInterval(progressInterval);
        setBackupProgress(100);
        
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setBackupProgress(0);
        throw error;
      } finally {
        setTimeout(() => {
          setIsBackingUp(false);
          setBackupProgress(0);
        }, 2000);
      }
    },
    onSuccess: (data: BackupResponse) => {
      toast({
        title: "✅ Backup uspešan!",
        description: `Kreirano je ${data.successfulFiles}/${data.totalFiles} fajlova u GitHub repozitorij.`,
        duration: 5000
      });
      refetchRepos();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška pri backup-u",
        description: error.message || "Dogodila se greška pri kreiranju backup-a.",
        variant: "destructive",
        duration: 8000
      });
    }
  });

  // Create repository mutation
  const createRepoMutation = useMutation({
    mutationFn: async (repoData: { name: string, description: string, isPrivate: boolean }) => {
      return apiRequest('/api/github/repository', {
        method: 'POST',
        body: JSON.stringify(repoData)
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Repozitorij kreiran!",
        description: "Novi GitHub repozitorij je uspešno kreiran.",
        duration: 5000
      });
      refetchRepos();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška pri kreiranju",
        description: error.message || "Dogodila se greška pri kreiranju repozitorija.",
        variant: "destructive",
        duration: 8000
      });
    }
  });

  const handleQuickBackup = () => {
    const repoName = `frigosistem-backup-${new Date().toISOString().slice(0, 10)}`;
    createBackupMutation.mutate(repoName);
  };

  if (userError || reposError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Greška pri povezivanju sa GitHub-om. Molimo proverite konekciju.
            {userError && ` Korisnik: ${(userError as any).message}`}
            {reposError && ` Repozitoriji: ${(reposError as any).message}`}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Github className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">GitHub Integration</h1>
          <p className="text-gray-600">Upravljanje kodnim repozitorijima i automatski backup</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Pregled</TabsTrigger>
          <TabsTrigger value="repositories">Repozitoriji</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="settings">Podešavanja</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {isLoadingUser ? (
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ) : userInfo ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <img 
                    src={userInfo.avatarUrl} 
                    alt="GitHub Avatar" 
                    className="w-10 h-10 rounded-full"
                  />
                  {userInfo.name || userInfo.login}
                  <Badge variant="outline">Povezan</Badge>
                </CardTitle>
                <CardDescription>
                  GitHub korisnik: @{userInfo.login}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{userInfo.publicRepos}</div>
                    <div className="text-sm text-gray-600">Javni repozitoriji</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{userInfo.privateRepos || 0}</div>
                    <div className="text-sm text-gray-600">Privatni repozitoriji</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{repositoriesData?.total || 0}</div>
                    <div className="text-sm text-gray-600">Ukupno repozitorija</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Status: Aktivno</div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <Button onClick={handleQuickBackup} disabled={isBackingUp} className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {isBackingUp ? 'Kreiranje backup-a...' : 'Brzi Backup'}
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={userInfo.htmlUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Otvori GitHub
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isBackingUp && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Kreiranje backup-a...</span>
                  </div>
                  <Progress value={backupProgress} className="w-full" />
                  <p className="text-sm text-gray-600">
                    Molimo sačekajte dok se fajlovi postavljaju na GitHub repozitorij.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Repositories Tab */}
        <TabsContent value="repositories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Vaši GitHub repozitoriji</h3>
            <Button onClick={() => refetchRepos()} variant="outline" size="sm">
              Osveži listu
            </Button>
          </div>

          {isLoadingRepos ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : repositoriesData?.repositories && repositoriesData.repositories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repositoriesData.repositories.map((repo) => (
                <Card key={repo.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-blue-600 hover:underline">
                            <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer">
                              {repo.name}
                            </a>
                          </h4>
                          <p className="text-sm text-gray-500">{repo.fullName}</p>
                        </div>
                        <Badge variant={repo.private ? "secondary" : "outline"}>
                          {repo.private ? "Privatni" : "Javni"}
                        </Badge>
                      </div>
                      
                      {repo.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{repo.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {repo.stargazersCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="h-3 w-3" />
                          {repo.forksCount}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Ažurirano: {new Date(repo.updatedAt).toLocaleDateString('sr-RS')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Github className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Nema repozitorija</h3>
                <p className="text-gray-600 mb-4">Još nema pronađenih GitHub repozitorija.</p>
                <Button onClick={() => refetchRepos()} variant="outline">
                  Osveži listu
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Automatski Backup
              </CardTitle>
              <CardDescription>
                Kreirajte backup vaše aplikacije na GitHub repozitorij
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Automatski backup će kreirati novi GitHub repozitorij sa ključnim fajlovima vaše aplikacije:
                  package.json, schema.ts, routes.ts, App.tsx i ostali važni fajlovi.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Button 
                  onClick={handleQuickBackup} 
                  disabled={isBackingUp || createBackupMutation.isPending}
                  className="w-full flex items-center gap-2"
                  size="lg"
                >
                  <Upload className="h-4 w-4" />
                  {isBackingUp ? 'Kreiranje backup-a...' : 'Kreiraj Brzi Backup'}
                </Button>

                <CustomBackupDialog onBackup={createBackupMutation.mutate} disabled={isBackingUp} />
              </div>

              {createBackupMutation.data && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Backup završen uspešno!</span>
                    </div>
                    <div className="space-y-2 text-sm text-green-700">
                      <p><strong>Repozitorij:</strong> <a href={createBackupMutation.data.repository} target="_blank" rel="noopener noreferrer" className="underline">{createBackupMutation.data.repository}</a></p>
                      <p><strong>Fajlovi:</strong> {createBackupMutation.data.successfulFiles}/{createBackupMutation.data.totalFiles}</p>
                      <p><strong>Završeno:</strong> {new Date(createBackupMutation.data.completedAt).toLocaleString('sr-RS')}</p>
                    </div>
                    <div className="mt-3 space-y-1">
                      {createBackupMutation.data.backupResults.map((result, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          {result.success ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                          <span className={result.success ? 'text-green-700' : 'text-red-700'}>
                            {result.file}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                GitHub Podešavanja
              </CardTitle>
              <CardDescription>
                Konfigurišite GitHub integraciju i backup opcije
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {userInfo && (
                <div className="space-y-4">
                  <h4 className="font-medium">Informacije o korisniku</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-gray-600">Korisničko ime</Label>
                      <div className="font-medium">@{userInfo.login}</div>
                    </div>
                    <div>
                      <Label className="text-gray-600">Ime</Label>
                      <div className="font-medium">{userInfo.name || 'Nije postavljeno'}</div>
                    </div>
                    <div>
                      <Label className="text-gray-600">Email</Label>
                      <div className="font-medium">{userInfo.email || 'Nije postavljeno'}</div>
                    </div>
                    <div>
                      <Label className="text-gray-600">GitHub profil</Label>
                      <div>
                        <a href={userInfo.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          Otvori profil
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    GitHub integracija je aktivna i funkcionalna. Možete kreirati backup-ove i upravljati repozitorijima.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Custom Backup Dialog Component
function CustomBackupDialog({ onBackup, disabled }: { onBackup: (repoName: string) => void, disabled: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [repoName, setRepoName] = useState(`frigosistem-backup-${new Date().toISOString().slice(0, 10)}`);

  const handleBackup = () => {
    if (repoName.trim()) {
      onBackup(repoName.trim());
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} className="w-full">
          Prilagodi Backup
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kreiraj Prilagođeni Backup</DialogTitle>
          <DialogDescription>
            Unesite ime repozitorija za novi backup
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="repoName">Ime repozitorija</Label>
            <Input
              id="repoName"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="npr. frigosistem-backup-2025"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Otkaži
            </Button>
            <Button onClick={handleBackup} disabled={!repoName.trim()}>
              Kreiraj Backup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}