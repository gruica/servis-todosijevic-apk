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
              <Input
                id="gatewayIP"
                value={config.gatewayIP}
                onChange={(e) => setConfig({ ...config, gatewayIP: e.target.value })}
                placeholder="192.168.1.100"
                disabled={!config.enabled}
              />
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
                      {gatewayStatus.error.includes('ECONNREFUSED') && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-yellow-800 font-medium">📱 SMSGateway aplikacija nije pokrenuta!</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Potrebno je da pokrenete SMSGateway aplikaciju na telefonu sa IP adresom {(currentConfig as any)?.gatewayIP}:{(currentConfig as any)?.gatewayPort}
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