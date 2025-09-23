import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  Settings,
  BarChart3,
  Clock,
  Wrench,
  Target,
  Brain,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search
} from 'lucide-react';
import { AppIcons } from '@/lib/app-icons';
import { useToast } from '@/hooks/use-toast';

// Tipovi za AI prediktivno održavanje
interface PredictiveInsight {
  id: number;
  applianceId: number;
  clientId: number;
  applianceName?: string;
  clientName?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  predictedMaintenanceDate: string;
  predictedFailures: string[];
  recommendedActions: string[];
  estimatedCost: number;
  confidenceLevel: number;
  createdAt: string;
  isActive: boolean;
}

interface MaintenancePattern {
  id: number;
  applianceCategoryId: number;
  manufacturerId?: number;
  categoryName?: string;
  manufacturerName?: string;
  averageServiceInterval: number;
  commonFailurePoints: string[];
  confidenceScore: string;
  lastAnalysis: string;
}

interface AiAnalysisResult {
  id: number;
  analysisType: string;
  applianceId: number;
  clientId: number;
  insights: string[];
  recommendations: string[];
  accuracy: string;
  processingTime: number;
  isSuccessful: boolean;
  createdAt: string;
}

// Komponenta za statistike
function StatsCards({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Kritični rizici</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{data?.criticalRisks || 0}</div>
          <p className="text-xs text-muted-foreground">
            Uređaji sa visokim rizikom kvara
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aktivni uvidi</CardTitle>
          <Brain className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.activeInsights || 0}</div>
          <p className="text-xs text-muted-foreground">
            Trenutno aktivnih prediktivnih uvida
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prosečna preciznost</CardTitle>
          <Target className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{data?.averageAccuracy || 0}%</div>
          <p className="text-xs text-muted-foreground">
            AI predviđanja u poslednja 3 meseca
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Potencijalna ušteda</CardTitle>
          <TrendingUp className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{data?.potentialSavings || 0} RSD</div>
          <p className="text-xs text-muted-foreground">
            Kroz preventivno održavanje
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Komponenta za risk badge
function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const variants = {
    low: { variant: 'secondary' as const, color: 'text-green-600', label: 'Nizak' },
    medium: { variant: 'outline' as const, color: 'text-yellow-600', label: 'Umeren' },
    high: { variant: 'destructive' as const, color: 'text-orange-600', label: 'Visok' },
    critical: { variant: 'destructive' as const, color: 'text-red-600', label: 'Kritičan' }
  };

  const config = variants[riskLevel as keyof typeof variants] || variants.medium;
  
  return (
    <Badge variant={config.variant} className={config.color}>
      {config.label}
    </Badge>
  );
}

// Glavna komponenta
export default function AIPredictiveMaintenancePage() {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query za dobijanje prediktivnih uvida
  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/admin/ai-predictive/insights'],
    queryFn: async () => {
      const response = await fetch('/api/admin/ai-predictive/insights');
      if (!response.ok) throw new Error('Failed to fetch insights');
      return response.json();
    }
  });

  // Query za maintenance patterns
  const { data: patterns = [], isLoading: patternsLoading } = useQuery({
    queryKey: ['/api/admin/ai-predictive/patterns'],
    queryFn: async () => {
      const response = await fetch('/api/admin/ai-predictive/patterns');
      if (!response.ok) throw new Error('Failed to fetch patterns');
      return response.json();
    }
  });

  // Query za AI analysis results
  const { data: analysisResults = [], isLoading: analysisLoading } = useQuery({
    queryKey: ['/api/admin/ai-predictive/analysis-results'],
    queryFn: async () => {
      const response = await fetch('/api/admin/ai-predictive/analysis-results');
      if (!response.ok) throw new Error('Failed to fetch analysis results');
      return response.json();
    }
  });

  // Query za dashboard statistike
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/ai-predictive/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/ai-predictive/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Mutation za pokretanje AI analize
  const runAnalysisMutation = useMutation({
    mutationFn: async (data: { type: string; applianceId?: number }) => {
      const response = await fetch('/api/admin/ai-predictive/run-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to run analysis');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "AI analiza pokrenuta",
        description: "Analiza je uspešno pokrenuta i rezultati će biti uskoro dostupni."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-predictive'] });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri pokretanju AI analize.",
        variant: "destructive"
      });
    }
  });

  // Filtriranje insights
  const filteredInsights = insights.filter((insight: PredictiveInsight) => {
    const matchesSearch = !searchQuery || 
      insight.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insight.applianceName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRisk = selectedRiskLevel === 'all' || insight.riskLevel === selectedRiskLevel;
    
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src={AppIcons.system.aiPredictive} alt="AI" className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-bold">AI Prediktivno održavanje</h1>
            <p className="text-muted-foreground">
              Inteligentno predviđanje potreba za održavanjem uređaja
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => runAnalysisMutation.mutate({ type: 'maintenance_analysis' })}
            disabled={runAnalysisMutation.isPending}
          >
            <Brain className="w-4 h-4 mr-2" />
            Pokreni AI analizu
          </Button>
        </div>
      </div>

      {/* Statistike */}
      <StatsCards data={stats} />

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="insights">Prediktivni uvidi</TabsTrigger>
          <TabsTrigger value="patterns">Obrasci održavanja</TabsTrigger>
          <TabsTrigger value="analysis">AI analiza</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kritični rizici */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-destructive" />
                  Kritični rizici
                </CardTitle>
                <CardDescription>
                  Uređaji koji zahtevaju hitnu pažnju
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInsights
                      .filter((insight: PredictiveInsight) => insight.riskLevel === 'critical' || insight.riskLevel === 'high')
                      .slice(0, 5)
                      .map((insight: PredictiveInsight) => (
                        <Alert key={insight.id} className="border-destructive/50">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle className="text-sm">
                            {insight.clientName} - {insight.applianceName}
                          </AlertTitle>
                          <AlertDescription className="text-xs">
                            Rizik: {insight.riskScore}% | Preporučen datum: {insight.predictedMaintenanceDate}
                          </AlertDescription>
                        </Alert>
                      ))
                    }
                    {filteredInsights.filter((insight: PredictiveInsight) => insight.riskLevel === 'critical' || insight.riskLevel === 'high').length === 0 && (
                      <p className="text-sm text-muted-foreground">Nema kritičnih rizika u ovom momentu.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Najnoviji uvidi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-primary" />
                  Najnoviji uvidi
                </CardTitle>
                <CardDescription>
                  Poslednji generisani prediktivni uvidi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {insights.slice(0, 5).map((insight: PredictiveInsight) => (
                      <div key={insight.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="text-sm font-medium">{insight.clientName}</p>
                          <p className="text-xs text-muted-foreground">{insight.applianceName}</p>
                        </div>
                        <div className="text-right">
                          <RiskBadge riskLevel={insight.riskLevel} />
                          <p className="text-xs text-muted-foreground mt-1">
                            {insight.confidenceLevel}% pouzdanost
                          </p>
                        </div>
                      </div>
                    ))}
                    {insights.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nema dostupnih uvida.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Prediktivni uvidi Tab */}
        <TabsContent value="insights" className="space-y-4">
          {/* Filteri */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search">Pretraži</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Pretraži po klijentu ili uređaju..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Nivo rizika</Label>
                  <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Svi nivoi</SelectItem>
                      <SelectItem value="critical">Kritičan</SelectItem>
                      <SelectItem value="high">Visok</SelectItem>
                      <SelectItem value="medium">Umeren</SelectItem>
                      <SelectItem value="low">Nizak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela uvida */}
          <Card>
            <CardContent>
              {insightsLoading ? (
                <div className="space-y-2 p-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Klijent</TableHead>
                      <TableHead>Uređaj</TableHead>
                      <TableHead>Nivo rizika</TableHead>
                      <TableHead>Rizik (%)</TableHead>
                      <TableHead>Preporučen datum</TableHead>
                      <TableHead>Procenjeni trošak</TableHead>
                      <TableHead>Pouzdanost</TableHead>
                      <TableHead>Akcije</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInsights.map((insight: PredictiveInsight) => (
                      <TableRow key={insight.id}>
                        <TableCell className="font-medium">{insight.clientName}</TableCell>
                        <TableCell>{insight.applianceName}</TableCell>
                        <TableCell>
                          <RiskBadge riskLevel={insight.riskLevel} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={insight.riskScore} className="w-12" />
                            <span className="text-sm">{insight.riskScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{insight.predictedMaintenanceDate}</TableCell>
                        <TableCell>{insight.estimatedCost.toLocaleString()} EUR</TableCell>
                        <TableCell>{insight.confidenceLevel}%</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Detalji
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalji prediktivnog uvida</DialogTitle>
                                <DialogDescription>
                                  {insight.clientName} - {insight.applianceName}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Predviđeni kvarovi:</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {insight.predictedFailures.map((failure, idx) => (
                                      <li key={idx} className="text-sm">{failure}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">Preporučene akcije:</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {insight.recommendedActions.map((action, idx) => (
                                      <li key={idx} className="text-sm">{action}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Obrasci održavanja Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Obrasci održavanja po kategorijama</CardTitle>
              <CardDescription>
                AI analizom identifikovani obrasci održavanja za različite tipove uređaja
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patternsLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategorija</TableHead>
                      <TableHead>Proizvođač</TableHead>
                      <TableHead>Prosečan interval</TableHead>
                      <TableHead>Česti kvarovi</TableHead>
                      <TableHead>Pouzdanost</TableHead>
                      <TableHead>Poslednja analiza</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patterns.map((pattern: MaintenancePattern) => (
                      <TableRow key={pattern.id}>
                        <TableCell className="font-medium">{pattern.categoryName}</TableCell>
                        <TableCell>{pattern.manufacturerName || 'Svi'}</TableCell>
                        <TableCell>{pattern.averageServiceInterval} dana</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {pattern.commonFailurePoints.slice(0, 3).map((point, idx) => (
                              <Badge key={idx} variant="outline" className="mr-1 mb-1">
                                {point}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{pattern.confidenceScore}%</TableCell>
                        <TableCell>{new Date(pattern.lastAnalysis).toLocaleDateString('sr-RS')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Analiza Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rezultati AI analize</CardTitle>
              <CardDescription>
                Istorija i rezultati AI algoritama za prediktivno održavanje
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tip analize</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Preciznost</TableHead>
                      <TableHead>Vreme procesiranja</TableHead>
                      <TableHead>Broj uvida</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Akcije</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisResults.map((result: AiAnalysisResult) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">
                          {result.analysisType === 'predictive_maintenance' && 'Prediktivno održavanje'}
                          {result.analysisType === 'failure_analysis' && 'Analiza kvarova'}
                          {result.analysisType === 'cost_optimization' && 'Optimizacija troškova'}
                        </TableCell>
                        <TableCell>
                          {result.isSuccessful ? (
                            <Badge variant="secondary" className="text-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Uspešno
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              Neuspešno
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{result.accuracy}%</TableCell>
                        <TableCell>{result.processingTime}ms</TableCell>
                        <TableCell>{result.insights.length}</TableCell>
                        <TableCell>{new Date(result.createdAt).toLocaleDateString('sr-RS')}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Uvidi
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>AI analiza uvidi</DialogTitle>
                                <DialogDescription>
                                  Rezultati analize od {new Date(result.createdAt).toLocaleDateString('sr-RS')}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Uvidi:</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {result.insights.map((insight, idx) => (
                                      <li key={idx} className="text-sm">{insight}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">Preporuke:</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    {result.recommendations.map((rec, idx) => (
                                      <li key={idx} className="text-sm">{rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}