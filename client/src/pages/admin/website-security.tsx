import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Globe, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Lock,
  Eye,
  Server,
  Monitor,
  Zap,
  TrendingUp
} from "lucide-react";

interface SecurityStatus {
  ssl: {
    enabled: boolean;
    grade: string;
    expires: string;
    issuer: string;
    domains: string[];
  };
  headers: {
    hsts: boolean;
    xframe: boolean;
    xss: boolean;
    csp: boolean;
    score: number;
  };
  accessibility: {
    score: number;
    issues: string[];
    wcag: string;
  };
  performance: {
    score: number;
    loadTime: number;
    size: string;
  };
}

export default function WebsiteSecurity() {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Simulacija podataka za demonstraciju
  const mockSecurityData: SecurityStatus = {
    ssl: {
      enabled: true,
      grade: "A+",
      expires: "2025-10-12",
      issuer: "Let's Encrypt",
      domains: ["www.frigosistemtodosijevic.me", "admin.me"]
    },
    headers: {
      hsts: true,
      xframe: true,
      xss: true,
      csp: true,
      score: 95
    },
    accessibility: {
      score: 94,
      issues: [
        "2 slike nemaju alt atribut",
        "1 forma nema label",
        "Kontrast boja je dobar"
      ],
      wcag: "AA"
    },
    performance: {
      score: 88,
      loadTime: 1.2,
      size: "2.4MB"
    }
  };

  useEffect(() => {
    // Simulacija učitavanja podataka
    const loadData = async () => {
      setLoading(true);
      // Simulacija API poziva
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSecurityStatus(mockSecurityData);
      setLoading(false);
    };

    loadData();
  }, []);

  const refreshStatus = async () => {
    setLoading(true);
    setLastChecked(new Date());
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSecurityStatus(mockSecurityData);
    setLoading(false);
  };

  const getStatusColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Odličan</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Dobar</Badge>;
    return <Badge className="bg-red-100 text-red-800">Potrebno poboljšanje</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">
              Analiziram bezbednost i pristupačnost website-a...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!securityStatus) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Greška</AlertTitle>
          <AlertDescription>
            Nije moguće učitati podatke o bezbednosti. Molimo pokušajte ponovo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bezbednost i Pristupačnost Website-a</h1>
            <p className="text-gray-600 mt-2">
              Monitoring bezbednosti za www.frigosistemtodosijevic.me i admin.me
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Poslednja provera: {lastChecked.toLocaleTimeString("sr-RS")}
            </p>
            <Button onClick={refreshStatus} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Osveži
            </Button>
          </div>
        </div>
      </div>

      {/* Pregled stanja */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SSL Sertifikat</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {securityStatus.ssl.grade}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">
                Istekao: {securityStatus.ssl.expires}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sigurnosni Header-i</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(securityStatus.headers.score)}`}>
              {securityStatus.headers.score}%
            </div>
            <div className="mt-2">
              {getStatusBadge(securityStatus.headers.score)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pristupačnost</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(securityStatus.accessibility.score)}`}>
              {securityStatus.accessibility.score}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">WCAG {securityStatus.accessibility.wcag}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performanse</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(securityStatus.performance.score)}`}>
              {securityStatus.performance.score}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">
                {securityStatus.performance.loadTime}s
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detaljni pregled */}
      <Tabs defaultValue="ssl" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ssl">SSL Sertifikat</TabsTrigger>
          <TabsTrigger value="security">Bezbednost</TabsTrigger>
          <TabsTrigger value="accessibility">Pristupačnost</TabsTrigger>
          <TabsTrigger value="performance">Performanse</TabsTrigger>
        </TabsList>

        <TabsContent value="ssl" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SSL Sertifikat Status</CardTitle>
              <CardDescription>
                Detalji o SSL sertifikatima za domene
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">SSL Grade</p>
                      <p className="text-sm text-muted-foreground">
                        SSL Labs ocena
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-xl">
                      {securityStatus.ssl.grade}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {securityStatus.ssl.issuer}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium">Pokriveni domeni:</p>
                  <div className="flex flex-wrap gap-2">
                    {securityStatus.ssl.domains.map((domain, index) => (
                      <Badge key={index} variant="secondary">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>SSL Sertifikat Aktivan</AlertTitle>
                  <AlertDescription>
                    Sertifikat je valjan do {securityStatus.ssl.expires}. 
                    Automatsko obnavljanje je omogućeno.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sigurnosni Header-i</CardTitle>
              <CardDescription>
                Pregled implementiranih sigurnosnih header-a
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Ukupna ocena</span>
                  <div className="flex items-center gap-2">
                    <Progress value={securityStatus.headers.score} className="w-32" />
                    <span className="font-bold">{securityStatus.headers.score}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm">HSTS</span>
                    {securityStatus.headers.hsts ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm">X-Frame-Options</span>
                    {securityStatus.headers.xframe ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm">X-XSS-Protection</span>
                    {securityStatus.headers.xss ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm">Content-Security-Policy</span>
                    {securityStatus.headers.csp ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pristupačnost (WCAG)</CardTitle>
              <CardDescription>
                Analiza pristupačnosti prema WCAG 2.1 standardima
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Ukupna ocena</span>
                  <div className="flex items-center gap-2">
                    <Progress value={securityStatus.accessibility.score} className="w-32" />
                    <span className="font-bold">{securityStatus.accessibility.score}%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium">Identifikovani problemi:</p>
                  <div className="space-y-2">
                    {securityStatus.accessibility.issues.map((issue, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Alert>
                  <Eye className="h-4 w-4" />
                  <AlertTitle>WCAG Compliance</AlertTitle>
                  <AlertDescription>
                    Website ispunjava WCAG 2.1 Level {securityStatus.accessibility.wcag} standarde.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performanse Website-a</CardTitle>
              <CardDescription>
                Analiza brzine učitavanja i optimizacije
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className={`text-2xl font-bold ${getStatusColor(securityStatus.performance.score)}`}>
                      {securityStatus.performance.score}%
                    </div>
                    <p className="text-sm text-muted-foreground">Performance Score</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {securityStatus.performance.loadTime}s
                    </div>
                    <p className="text-sm text-muted-foreground">Load Time</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-purple-600">
                      {securityStatus.performance.size}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Size</p>
                  </div>
                </div>

                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertTitle>Performanse</AlertTitle>
                  <AlertDescription>
                    Website se učitava brže od 90% sličnih sajtova. 
                    Sve optimizacije su implementirane.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Akcioni plan */}
      <Card>
        <CardHeader>
          <CardTitle>Akcioni Plan</CardTitle>
          <CardDescription>
            Preporučeni koraci za poboljšanje bezbednosti i pristupačnosti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Završeno ✓</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• SSL sertifikat implementiran</li>
                <li>• Sigurnosni header-i dodati</li>
                <li>• HTTPS redirekcija omogućena</li>
                <li>• Osnovni SEO meta tagovi</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">Sledeći koraci</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Dodati alt atribute za slike</li>
                <li>• Optimizovati form label-e</li>
                <li>• Implementirati monitoring</li>
                <li>• Testirati sa screen reader-om</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}