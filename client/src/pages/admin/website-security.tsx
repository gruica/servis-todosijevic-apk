import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Lock, 
  Globe, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Server,
  Database,
  Eye,
  RefreshCw
} from "lucide-react";

// Bezbednosni status
interface SecurityStatus {
  ssl: boolean;
  https: boolean;
  hsts: boolean;
  csp: boolean;
  xss: boolean;
  csrf: boolean;
  rateLimit: boolean;
  lastCheck: string;
  score: number;
}

// SEO status
interface SEOStatus {
  metaTags: boolean;
  sitemap: boolean;
  robots: boolean;
  schema: boolean;
  performance: number;
  accessibility: number;
  seo: number;
  lastCheck: string;
}

// Monitoring podaci
interface MonitoringData {
  uptime: number;
  responseTime: number;
  errorRate: number;
  requestsPerMinute: number;
  securityEvents: number;
  lastIncident: string | null;
}

export default function WebsiteSecurity() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data - u stvarnoj aplikaciji bi ovo dolazilo iz API-ja
  const [securityStatus] = useState<SecurityStatus>({
    ssl: true,
    https: true,
    hsts: true,
    csp: true,
    xss: true,
    csrf: true,
    rateLimit: true,
    lastCheck: new Date().toISOString(),
    score: 95
  });

  const [seoStatus] = useState<SEOStatus>({
    metaTags: true,
    sitemap: true,
    robots: true,
    schema: true,
    performance: 92,
    accessibility: 88,
    seo: 94,
    lastCheck: new Date().toISOString()
  });

  const [monitoringData] = useState<MonitoringData>({
    uptime: 99.9,
    responseTime: 245,
    errorRate: 0.1,
    requestsPerMinute: 45,
    securityEvents: 2,
    lastIncident: null
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulacija API poziva
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        Aktivno
      </Badge>
    ) : (
      <Badge variant="destructive">
        Neaktivno
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-100";
    if (score >= 70) return "bg-yellow-100";
    return "bg-red-100";
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Nemate dozvolu za pristup ovoj stranici.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4">
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-medium text-gray-800">
                  Bezbednost veb sajta
                </h2>
                <p className="text-gray-600">
                  Praćenje bezbednosti, SEO optimizacije i performansi
                </p>
              </div>
              <Button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Osvežavanje...' : 'Osveži'}
              </Button>
            </div>

            <Tabs defaultValue="security" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="security">Bezbednost</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                <TabsTrigger value="certificates">Sertifikati</TabsTrigger>
              </TabsList>

              <TabsContent value="security" className="space-y-6">
                {/* Bezbednosni skor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Bezbednosni skor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className={`text-4xl font-bold ${getScoreColor(securityStatus.score)}`}>
                        {securityStatus.score}%
                      </div>
                      <div className="flex-1">
                        <Progress 
                          value={securityStatus.score} 
                          className="h-2"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Poslednja provera: {new Date(securityStatus.lastCheck).toLocaleString('sr-ME')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bezbednosne mere */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getStatusIcon(securityStatus.ssl)}
                        SSL/TLS
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {getStatusBadge(securityStatus.ssl)}
                        <p className="text-xs text-gray-500">
                          Enkriptovane konekcije
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getStatusIcon(securityStatus.https)}
                        HTTPS Redirekcija
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {getStatusBadge(securityStatus.https)}
                        <p className="text-xs text-gray-500">
                          Automatska HTTPS redirekcija
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getStatusIcon(securityStatus.hsts)}
                        HSTS
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {getStatusBadge(securityStatus.hsts)}
                        <p className="text-xs text-gray-500">
                          HTTP Strict Transport Security
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getStatusIcon(securityStatus.csp)}
                        CSP
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {getStatusBadge(securityStatus.csp)}
                        <p className="text-xs text-gray-500">
                          Content Security Policy
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getStatusIcon(securityStatus.xss)}
                        XSS zaštita
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {getStatusBadge(securityStatus.xss)}
                        <p className="text-xs text-gray-500">
                          Cross-Site Scripting zaštita
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getStatusIcon(securityStatus.rateLimit)}
                        Rate Limiting
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {getStatusBadge(securityStatus.rateLimit)}
                        <p className="text-xs text-gray-500">
                          Ograničavanje zahteva
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-6">
                {/* SEO skor */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getScoreColor(seoStatus.performance)}`}>
                        {seoStatus.performance}%
                      </div>
                      <Progress value={seoStatus.performance} className="h-1 mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Accessibility
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getScoreColor(seoStatus.accessibility)}`}>
                        {seoStatus.accessibility}%
                      </div>
                      <Progress value={seoStatus.accessibility} className="h-1 mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        SEO
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getScoreColor(seoStatus.seo)}`}>
                        {seoStatus.seo}%
                      </div>
                      <Progress value={seoStatus.seo} className="h-1 mt-2" />
                    </CardContent>
                  </Card>
                </div>

                {/* SEO elementi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getStatusIcon(seoStatus.metaTags)}
                        Meta tagovi
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {getStatusBadge(seoStatus.metaTags)}
                        <p className="text-xs text-gray-500">
                          Title, description, Open Graph
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getStatusIcon(seoStatus.sitemap)}
                        Sitemap.xml
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {getStatusBadge(seoStatus.sitemap)}
                        <p className="text-xs text-gray-500">
                          XML mapa sajta
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getStatusIcon(seoStatus.robots)}
                        Robots.txt
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {getStatusBadge(seoStatus.robots)}
                        <p className="text-xs text-gray-500">
                          Instrukcije za pretraživače
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getStatusIcon(seoStatus.schema)}
                        Schema markup
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {getStatusBadge(seoStatus.schema)}
                        <p className="text-xs text-gray-500">
                          Strukturirani podaci
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="monitoring" className="space-y-6">
                {/* Monitoring metrije */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Uptime
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {monitoringData.uptime}%
                      </div>
                      <p className="text-xs text-gray-500">
                        Poslednji 30 dana
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Vreme odgovora
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {monitoringData.responseTime}ms
                      </div>
                      <p className="text-xs text-gray-500">
                        Prosečno vreme
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Stopa grešaka
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {monitoringData.errorRate}%
                      </div>
                      <p className="text-xs text-gray-500">
                        Poslednji 24 sata
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Zahtevi/min
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {monitoringData.requestsPerMinute}
                      </div>
                      <p className="text-xs text-gray-500">
                        Trenutni promet
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Bezbednosni događaji */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Bezbednosni događaji
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {monitoringData.securityEvents === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                          <p>Nema bezbednosnih događaja</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <div>
                              <p className="font-medium">Rate limiting aktiviran</p>
                              <p className="text-sm text-gray-600">
                                {monitoringData.securityEvents} pokušaja blokiran
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-yellow-50">
                            Rešeno
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="certificates" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      SSL sertifikati
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">www.frigosistemtodosijevic.me</p>
                            <p className="text-sm text-gray-600">
                              Važi do: 13. jul 2026.
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Važeći
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">admin.frigosistemtodosijevic.me</p>
                            <p className="text-sm text-gray-600">
                              Važi do: 13. jul 2026.
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Važeći
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}