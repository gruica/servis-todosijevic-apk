import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Smartphone, Wifi, Settings, TestTube, CheckCircle, AlertCircle } from "lucide-react";

interface MobileSMSConfig {
  gatewayIP: string;
  gatewayPort: number;
  apiKey: string;
  timeout: number;
  enabled: boolean;
}

interface GatewayStatus {
  enabled: boolean;
  connected: boolean;
  error?: string;
  gatewayInfo?: any;
}

export default function MobileSMSConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");

  const [config, setConfig] = useState<MobileSMSConfig>({
    gatewayIP: "",
    gatewayPort: 8080,
    apiKey: "",
    timeout: 10000,
    enabled: false
  });

  // Dohvatanje trenutne konfiguracije
  const { data: currentConfig, isLoading: configLoading } = useQuery({
    queryKey: ["/api/mobile-sms/config"],
    refetchInterval: 30000 // Refresh svakih 30 sekundi
  });

  // Dohvatanje statusa gateway-a
  const { data: gatewayStatus, isLoading: statusLoading } = useQuery<GatewayStatus>({
    queryKey: ["/api/mobile-sms/status"],
    refetchInterval: 10000 // Refresh svakih 10 sekundi
  });

  // Mutation za ažuriranje konfiguracije
  const updateConfigMutation = useMutation({
    mutationFn: (newConfig: MobileSMSConfig) =>
      apiRequest("/api/mobile-sms/config", "POST", newConfig),
    onSuccess: () => {
      toast({
        title: "✅ Konfiguracija ažurirana",
        description: "Mobile SMS gateway konfiguracija je uspešno ažurirana.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-sms/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-sms/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška pri ažuriranju",
        description: error.message || "Došlo je do greške pri ažuriranju konfiguracije.",
        variant: "destructive",
      });
    },
  });

  // Mutation za test SMS
  const testSMSMutation = useMutation({
    mutationFn: ({ phoneNumber, message }: { phoneNumber: string; message: string }) =>
      apiRequest("/api/mobile-sms/test", "POST", { phoneNumber, message }),
    onSuccess: (data: any) => {
      toast({
        title: data.success ? "✅ Test SMS poslat" : "❌ Neuspešno slanje",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška pri test SMS",
        description: error.message || "Došlo je do greške pri slanju test SMS-a.",
        variant: "destructive",
      });
    },
  });

  // Mutation za skeniranje mreže
  const scanNetworkMutation = useMutation({
    mutationFn: () => apiRequest("/api/mobile-sms/scan-network", "GET"),
    onSuccess: (data: any) => {
      if (data.success && data.activeServices && data.activeServices.length > 0) {
        const firstService = data.activeServices[0];
        setConfig(prev => ({ ...prev, gatewayIP: firstService.ip }));
        toast({
          title: "🔍 Skeniranje mreže",
          description: `Pronađen SMS Gateway na ${firstService.ip}:${firstService.port}`,
        });
      } else {
        toast({
          title: "🔍 Skeniranje mreže",
          description: data.message || "Nije pronađen SMS Gateway servis",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška skeniranja",
        description: error.message || "Neuspešno skeniranje mreže",
        variant: "destructive",
      });
    },
  });

  // Učitavanje konfiguracije
  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig as MobileSMSConfig);
    }
  }, [currentConfig]);

  const handleConfigUpdate = () => {
    updateConfigMutation.mutate(config);
  };

  const handleTestSMS = () => {
    if (!testPhone.trim()) {
      toast({
        title: "⚠️ Broj telefona obavezan",
        description: "Unesite broj telefona za test SMS.",
        variant: "destructive",
      });
      return;
    }

    const message = testMessage.trim() || `Test poruka sa Mobile SMS Gateway-a. Vreme: ${new Date().toLocaleString('sr-RS')}`;
    testSMSMutation.mutate({ phoneNumber: testPhone, message });
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Učitavanje konfiguracije...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mobile SMS Gateway</h1>
          <p className="text-gray-600 mt-2">Konfiguracija i upravljanje SMS gateway-om preko vašeg telefona</p>
        </div>
        <Badge variant={gatewayStatus?.connected ? "default" : "destructive"} className="text-sm">
          <Wifi className="w-4 h-4 mr-1" />
          {gatewayStatus?.connected ? "Povezan" : "Nepovezan"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Konfiguracija */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Gateway konfiguracija
            </CardTitle>
            <CardDescription>
              Postavke za povezivanje sa mobile SMS gateway aplikacijom na vašem telefonu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enabled}
                onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
              />
              <Label>Omogući Mobile SMS Gateway</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gatewayIP">IP Adresa telefona</Label>
              <div className="flex space-x-2">
                <Input
                  id="gatewayIP"
                  value={config.gatewayIP}
                  onChange={(e) => setConfig({ ...config, gatewayIP: e.target.value })}
                  placeholder="192.168.1.100"
                  disabled={!config.enabled}
                  className="flex-1"
                />
                <Button
                  onClick={() => scanNetworkMutation.mutate()}
                  disabled={!config.enabled || scanNetworkMutation.isPending}
                  variant="outline"
                  size="sm"
                >
                  {scanNetworkMutation.isPending ? "Skenira..." : "🔍 Skeniraj"}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                IP adresa vašeg telefona u lokalnoj mreži
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gatewayPort">Port</Label>
              <Input
                id="gatewayPort"
                type="number"
                value={config.gatewayPort}
                onChange={(e) => setConfig({ ...config, gatewayPort: parseInt(e.target.value) || 8080 })}
                placeholder="8080"
                disabled={!config.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Ključ (opciono)</Label>
              <Input
                id="apiKey"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="Unesite API ključ ako je potreban"
                disabled={!config.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={config.timeout}
                onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) || 10000 })}
                placeholder="10000"
                disabled={!config.enabled}
              />
            </div>

            <Button 
              onClick={handleConfigUpdate} 
              disabled={updateConfigMutation.isPending}
              className="w-full"
            >
              {updateConfigMutation.isPending ? "Ažuriranje..." : "Sačuvaj konfiguraciju"}
            </Button>

            {/* Instrukcije za iPhone konfiguraciju */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
              <h4 className="font-medium text-blue-900 mb-2">📱 iPhone SMS Gateway - Postupak konfiguracije</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p><strong>1. Instalacija aplikacije:</strong></p>
                <p>• Preuzmite "SMS Gateway for iPhone" aplikaciju iz App Store</p>
                
                <p className="pt-2"><strong>2. Konfiguracija u aplikaciji:</strong></p>
                <p>• Username: <span className="font-mono bg-blue-100 px-1 rounded">gruica</span></p>
                <p>• Password: <span className="font-mono bg-blue-100 px-1 rounded">AdamEva230723@</span></p>
                <p>• Port: <span className="font-mono bg-blue-100 px-1 rounded">8080</span></p>
                <p>• HTTP method: <span className="font-mono bg-blue-100 px-1 rounded">POST</span></p>
                <p>• Content-Type: <span className="font-mono bg-blue-100 px-1 rounded">application/x-www-form-urlencoded</span></p>
                
                <p className="pt-2"><strong>3. Pokretanje:</strong></p>
                <p>• Kliknite "Start Server" u aplikaciji</p>
                <p>• Zapišite IP adresu koja se prikaže i unesite je gore</p>
                
                <div className="p-2 bg-green-100 border border-green-300 rounded mt-2">
                  <p className="font-medium text-green-800">📶 TRENUTNO STANJE:</p>
                  <p className="text-green-700">• Server IP: <span className="font-mono">192.168.10.104</span></p>
                  <p className="text-green-700">• iPhone SMS Gateway aplikacija je POKRENUTA ✅</p>
                  <p className="text-green-700">• WiFi mreža: Frigo Sistem Todosijevic</p>
                  <p className="text-green-700">• Status: Čeka ispravku IP adrese</p>
                </div>
                
                <div className="p-2 bg-blue-100 border border-blue-300 rounded mt-2">
                  <p className="font-medium text-blue-800">🎯 ANALIZA MREŽE:</p>
                  <p className="text-blue-700">• Router WiFi: 192.168.10.104 ✅</p>
                  <p className="text-blue-700">• Server: 192.168.10.104 ✅</p>
                  <p className="text-blue-700">• iPhone: verovatno 192.168.10.100, 192.168.10.101, ili slično</p>
                  <p className="text-blue-700"><strong>Potrebno je naći IP adresu iPhone-a u opsegu 192.168.10.x</strong></p>
                </div>
                
                <div className="p-2 bg-green-100 border border-green-300 rounded mt-2">
                  <p className="font-medium text-green-800">🎯 FINALNI PROBLEM PRONAĐEN!</p>
                  <p className="text-green-700">iPhone aplikacija koristi <strong>standardne parameter keys</strong>:</p>
                  <p className="text-green-700">• Phonenumber, message, User, Password</p>
                  <p className="text-green-700">Ažurirao sam kod da koristi ispravne parameter keys!</p>
                </div>
                
                <div className="p-2 bg-blue-100 border border-blue-300 rounded mt-2">
                  <p className="font-medium text-blue-800">📱 ANALIZA MREŽE:</p>
                  <p className="text-blue-700">• MacBook IP: <strong>172.20.10.2</strong> ✅</p>
                  <p className="text-blue-700">• iPhone Router: <strong>172.20.10.1</strong> (hotspot)</p>
                  <p className="text-blue-700">• MacBook Proxy: <strong>192.168.10.104:8080</strong> (gruica)</p>
                  <p className="text-blue-700">• Naša aplikacija: <strong>172.20.10.2:8080</strong> (ažurirano)</p>
                </div>
                
                <div className="p-2 bg-green-100 border border-green-300 rounded mt-2">
                  <p className="font-medium text-green-800">🎯 PRONAĐENO REŠENJE!</p>
                  <p className="text-green-700">• <strong>iPhone javna IP</strong>: 77.222.25.100:8080</p>
                  <p className="text-green-700">• <strong>SMS aplikacija radi na iPhone-u</strong>, ne na MacBook-u!</p>
                  <p className="text-green-700">• <strong>Parameter keys</strong>: Phonenumber, message, User, Password ✅</p>
                  <p className="text-green-700">• <strong>Konfiguracija ažurirana</strong> sa iPhone IP adresom</p>
                </div>
                
                <div className="p-2 bg-yellow-100 border border-yellow-300 rounded mt-2">
                  <p className="font-medium text-yellow-800">⚠️ VAŽNO:</p>
                  <p className="text-yellow-700">• Aplikacija mora biti ENABLED (zeleni prekidač uključen)</p>
                  <p className="text-yellow-700">• Aplikacija mora biti aktivna u prvom planu</p>
                  <p className="text-yellow-700">• iPhone mora biti na "Frigo Sistem Todosijevic" WiFi mreži</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status i test */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smartphone className="w-5 h-5 mr-2" />
                Status Gateway-a
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Status servisa:</span>
                    <Badge variant={gatewayStatus?.enabled ? "default" : "secondary"}>
                      {gatewayStatus?.enabled ? "Omogućen" : "Onemogućen"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Konekcija:</span>
                    <div className="flex items-center">
                      {gatewayStatus?.connected ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={gatewayStatus?.connected ? "text-green-600" : "text-red-600"}>
                        {gatewayStatus?.connected ? "Povezano" : "Nedostupno"}
                      </span>
                    </div>
                  </div>

                  {gatewayStatus?.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800 font-medium">Greška konekcije:</p>
                      <p className="text-sm text-red-800">{gatewayStatus.error}</p>
                      
                      {(gatewayStatus.error.includes('ECONNREFUSED') || gatewayStatus.error.includes('ETIMEDOUT') || gatewayStatus.error.includes('Connection timed out')) && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-yellow-800 font-bold">📱 iPhone SMS Gateway aplikacija nije dostupna!</p>
                          <div className="mt-2 space-y-1 text-xs text-yellow-700">
                            <p><strong>Koraci za rešavanje problema:</strong></p>
                            <p>1. Proverite da li je iPhone povezan na WiFi mrežu</p>
                            <p>2. Otvorite SMS Gateway aplikaciju na iPhone-u</p>
                            <p>3. Proverite da li aplikacija prikazuje IP: {(currentConfig as any)?.gatewayIP}:{(currentConfig as any)?.gatewayPort}</p>
                            <p>4. Ako se IP razlikuje, ažurirajte konfiguraciju</p>
                            <p>5. Aplikacija mora biti aktivna u prvom planu (foreground)</p>
                            <p>6. Proverite da li je omogućeno slanje HTTP zahteva</p>
                          </div>
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                            <p className="text-xs text-orange-800 font-medium">⚠️ VAŽNO: iPhone aplikacija mora biti pokrenuta i vidljiva na ekranu!</p>
                          </div>
                        </div>
                      )}

                      {gatewayStatus.error.includes('fetch failed') && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800 font-medium">🌐 Mrežni problem</p>
                          <p className="text-xs text-blue-700 mt-1">
                            Server ne može da pristupi IP adresi {(currentConfig as any)?.gatewayIP}. 
                            Proverite mrežne postavke i firewall.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {gatewayStatus?.gatewayInfo && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800 font-medium">Gateway Info:</p>
                      <pre className="text-xs text-blue-700 mt-1">
                        {JSON.stringify(gatewayStatus.gatewayInfo, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test SMS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TestTube className="w-5 h-5 mr-2" />
                Test SMS
              </CardTitle>
              <CardDescription>
                Pošaljite test SMS poruku da proverite funkcionalnost
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testPhone">Broj telefona</Label>
                <Input
                  id="testPhone"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+38267123456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testMessage">Poruka (opciono)</Label>
                <Textarea
                  id="testMessage"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Unesite test poruku ili ostavite prazno za automatsku poruku"
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleTestSMS} 
                disabled={testSMSMutation.isPending || !gatewayStatus?.enabled}
                className="w-full"
              >
                {testSMSMutation.isPending ? "Slanje..." : "Pošalji test SMS"}
              </Button>
            </CardContent>
          </Card>

          {/* Dodano uputstvo za korisnike */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Uputstvo za pokretanje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900 mb-2">📱 Korak po korak:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                    <li>Instalirajte 'SMS Gateway' iPhone aplikaciju</li>
                    <li>Pokrenite SMS Gateway aplikaciju</li>
                    <li>HTTP method: <strong>POST</strong> (ne GET)</li>
                    <li>Port: <strong>8080</strong></li>
                    <li>User: <strong>gruica</strong></li>
                    <li>Password: <strong>AdamEva230723@</strong></li>
                    <li>Allowed IP addresses: <strong>35.193.249.200</strong> i <strong>192.168.10.117</strong></li>
                    <li><strong>OMOGUĆITE aplikaciju (Disabled → Enabled)</strong></li>
                    <li><strong>APLIKACIJA MORA BITI AKTIVNO POKRENUTA</strong></li>
                  </ol>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900 mb-2">📡 WiFi IP ADRESA OBJAŠNJENJE:</p>
                  <p className="text-sm text-blue-800">Javna IP (104.28.60.115) ≠ Lokalna WiFi IP (192.168.10.117)</p>
                  <p className="text-sm text-blue-700 mt-1">Za SMS Gateway koristimo lokalnu WiFi IP: 192.168.10.117 ✅</p>
                  <p className="text-xs text-blue-600 mt-2">Problem: SMS Gateway aplikacija ne odgovara na portu 8080</p>
                </div>
                
                {gatewayStatus?.connected ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm font-medium text-green-900">✅ SMS Gateway je aktivan i spreman za rad!</p>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-medium text-red-900">❌ SMS Gateway nije dostupan</p>
                    <p className="text-xs text-red-700 mt-1">Proverite da li je SMSGateway aplikacija pokrenuta na telefonu</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}