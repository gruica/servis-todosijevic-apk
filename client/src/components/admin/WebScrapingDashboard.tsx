import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Download, Globe, Play, RotateCcw, Database } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScrapingSource {
  id: number;
  name: string;
  baseUrl: string;
  isActive: boolean;
  lastScrapeDate: string | null;
  totalPartsScraped: number;
  successfulScrapes: number;
  failedScrapes: number;
}

interface ScrapingLog {
  id: number;
  sourceId: number;
  status: string;
  startTime: string;
  endTime: string | null;
  newParts: number;
  updatedParts: number;
  duration: number;
  errors: string | null;
}

export function WebScrapingDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeScrapingId, setActiveScrapingId] = useState<number | null>(null);

  // Fetch scraping sources
  const { data: sources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ['/api/admin/web-scraping/sources'],
    enabled: true
  });

  // Fetch scraping logs
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['/api/admin/web-scraping/logs'],
    enabled: true
  });

  // Fetch current spare parts stats
  const { data: catalogStats } = useQuery({
    queryKey: ['/api/admin/spare-parts-catalog/stats'],
    enabled: true
  });

  // Start Quinnspares scraping mutation
  const startQuinnspareMutation = useMutation({
    mutationFn: async ({ maxPages, targetManufacturers }: { maxPages: number; targetManufacturers: string[] }) => {
      return apiRequest('/api/admin/web-scraping/start-quinnspares', {
        method: 'POST',
        body: JSON.stringify({ maxPages, targetManufacturers })
      });
    },
    onSuccess: (data) => {
      setActiveScrapingId(data.logId);
      toast({
        title: '🚀 Quinnspares Scraping Pokrenuta',
        description: `Web scraping je pokrenuta u pozadini. Praćenje: Log ID ${data.logId}`,
      });
      // Refresh logs every 5 seconds during active scraping
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/web-scraping/logs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/spare-parts-catalog/stats'] });
      }, 5000);
      
      // Stop refreshing after 10 minutes
      setTimeout(() => clearInterval(interval), 600000);
    },
    onError: (error) => {
      toast({
        title: '❌ Greška pri pokretanju',
        description: 'Quinnspares scraping nije mogao da se pokrene.',
        variant: 'destructive'
      });
    }
  });

  // Start full scraping mutation
  const startFullScrapingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/web-scraping/start-full', {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      setActiveScrapingId(data.logId);
      toast({
        title: '🚀 Potpun Web Scraping Pokrenuta',
        description: `Kompletan scraping svih izvora je pokrenuta. Praćenje: Log ID ${data.logId}`,
      });
    },
    onError: () => {
      toast({
        title: '❌ Greška pri pokretanju',
        description: 'Potpun web scraping nije mogao da se pokrene.',
        variant: 'destructive'
      });
    }
  });

  const handleStartQuinnspares = () => {
    startQuinnspareMutation.mutate({
      maxPages: 50,
      targetManufacturers: ['Candy', 'Beko', 'Electrolux', 'Hoover']
    });
  };

  const handleStartFullScraping = () => {
    startFullScrapingMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Završeno</Badge>;
      case 'started':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">U toku</Badge>;
      case 'failed':
        return <Badge variant="destructive">Neuspešno</Badge>;
      case 'partial':
        return <Badge variant="secondary">Delimično</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (sourcesLoading || logsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <RotateCcw className="h-4 w-4 animate-spin" />
          <span>Učitavanje web scraping dashboard-a...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Globe className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Web Scraping Dashboard</h1>
          <p className="text-gray-600">Automatska ekspanzija kataloga rezervnih delova</p>
        </div>
      </div>

      {/* Current Catalog Stats */}
      {catalogStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Trenutno Stanje Kataloga</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{catalogStats.totalParts}</div>
                <div className="text-sm text-gray-600">Ukupno delova</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{catalogStats.availableParts}</div>
                <div className="text-sm text-gray-600">Dostupno</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{catalogStats.categoriesCount}</div>
                <div className="text-sm text-gray-600">Kategorije</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{catalogStats.manufacturersCount}</div>
                <div className="text-sm text-gray-600">Proizvođači</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Brzo Pokretanje Scraping-a</CardTitle>
          <CardDescription>
            Pokretanje automatskog scraping-a za proširenje kataloga rezervnih delova
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={handleStartQuinnspares}
              disabled={startQuinnspareMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>
                {startQuinnspareMutation.isPending ? 'Pokretanje...' : 'Pokreni Quinnspares'}
              </span>
            </Button>
            
            <Button 
              onClick={handleStartFullScraping}
              disabled={startFullScrapingMutation.isPending}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>
                {startFullScrapingMutation.isPending ? 'Pokretanje...' : 'Potpun Scraping'}
              </span>
            </Button>
          </div>
          
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Quinnspares:</strong> Scraping će prikupiti oko 200-500 novih Candy, Beko, Electrolux i Hoover delova u roku od 5-15 minuta.
              <br />
              <strong>Potpun Scraping:</strong> Kombinuje sve izvore za maksimalnu ekspanziju kataloga (može potrajati 30+ minuta).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Scraping Logovi</TabsTrigger>
          <TabsTrigger value="sources">Konfigurisani Izvori</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Poslednji Scraping Logovi</CardTitle>
              <CardDescription>Pregled svih pokretanih scraping operacija</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Još nema scraping logova. Pokrenite prvi scraping above.
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.slice(0, 10).map((log: ScrapingLog) => (
                    <div 
                      key={log.id} 
                      className={`border rounded-lg p-4 ${log.id === activeScrapingId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(log.status)}
                          <div>
                            <div className="font-medium">Scraping Log #{log.id}</div>
                            <div className="text-sm text-gray-600">
                              Pokrenuto: {new Date(log.startTime).toLocaleString('sr-RS')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            +{log.newParts} novih delova
                          </div>
                          <div className="text-sm text-gray-600">
                            {log.updatedParts} ažuriranih • {formatDuration(log.duration)}
                          </div>
                        </div>
                      </div>
                      
                      {log.status === 'started' && log.id === activeScrapingId && (
                        <div className="mt-3">
                          <div className="flex items-center space-x-2 text-sm text-blue-600">
                            <RotateCcw className="h-3 w-3 animate-spin" />
                            <span>Scraping u toku...</span>
                          </div>
                          <Progress value={33} className="mt-2" />
                        </div>
                      )}
                      
                      {log.errors && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <strong>Greške:</strong> {JSON.parse(log.errors).slice(0, 3).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurisani Scraping Izvori</CardTitle>
              <CardDescription>Izvori podataka za automatsko proširenje kataloga</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sources.map((source: ScrapingSource) => (
                  <div key={source.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center space-x-2">
                          <span>{source.name}</span>
                          {source.isActive ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">Aktivan</Badge>
                          ) : (
                            <Badge variant="secondary">Neaktivan</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">{source.baseUrl}</div>
                        {source.lastScrapeDate && (
                          <div className="text-xs text-gray-500">
                            Poslednji scraping: {new Date(source.lastScrapeDate).toLocaleString('sr-RS')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{source.totalPartsScraped} delova</div>
                        <div className="text-sm text-gray-600">
                          {source.successfulScrapes} uspešnih • {source.failedScrapes} neuspešnih
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {sources.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <div>Scraping izvori će biti automatski konfigurisani</div>
                    <div className="text-sm">Quinnspares, eSpares, 4Candy će biti dostupni</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}