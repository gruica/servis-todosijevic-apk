import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Wifi, Phone, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface MobileSMSStatus {
  configured: boolean;
  provider: string;
  baseUrl?: string;
  hasApiKey: boolean;
}

interface MobileSMSConfig {
  baseUrl: string;
  apiKey?: string;
}

export function MobileSMSConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<MobileSMSConfig>({
    baseUrl: "http://77.222.37.69:8080",
    apiKey: ""
  });
  const [testPhone, setTestPhone] = useState("");

  // Fetch SMS status
  const { data: smsStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/sms/status"],
    retry: 1
  });

  // Configure SMS
  const configureMutation = useMutation({
    mutationFn: async (data: MobileSMSConfig) => {
      return apiRequest("POST", "/api/sms/configure", data);
    },
    onSuccess: () => {
      toast({
        title: "✅ Uspešno konfigurisan",
        description: "Mobile SMS API je uspešno konfigurisan",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/status"] });
    },
    onError: (error: any) => {
      console.error("SMS config error:", error);
      toast({
        title: "❌ Greška konfiguracije",
        description: error?.message || "Neuspešna konfiguracija Mobile SMS API-ja",
        variant: "destructive",
      });
    },
  });

  // Test connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/sms/test-connection");
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Konekcija uspešna",
        description: "Mobile SMS API je dostupan i funkcionalan",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Konekcija neuspešna",
        description: error?.message || "Mobile SMS API nije dostupan",
        variant: "destructive",
      });
    },
  });

  // Test SMS
  const testSMSMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      return apiRequest("POST", "/api/sms/send-test", { phoneNumber });
    },
    onSuccess: (data) => {
      toast({
        title: "📱 SMS poslat",
        description: `Test SMS je uspešno poslat na ${testPhone}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ SMS greška",
        description: error?.message || "Neuspešno slanje test SMS-a",
        variant: "destructive",
      });
    },
  });

  const handleConfigure = () => {
    if (!config.baseUrl) {
      toast({
        title: "Nedostaje URL",
        description: "Base URL je obavezan",
        variant: "destructive",
      });
      return;
    }
    configureMutation.mutate(config);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const handleTestSMS = () => {
    if (!testPhone) {
      toast({
        title: "Nedostaje broj",
        description: "Broj telefona je obavezan",
        variant: "destructive",
      });
      return;
    }
    testSMSMutation.mutate(testPhone);
  };

  const status = smsStatus as MobileSMSStatus | undefined;

  return (
    <div className="space-y-6">
      {/* Status kartica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Status Mobile SMS API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="text-sm text-muted-foreground">Učitavam status...</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Konfigurisan:</Label>
                <div className="mt-1">
                  {status?.configured ? (
                    <Badge variant="default" className="bg-green-500">
                      <Wifi className="h-3 w-3 mr-1" />
                      Da
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Settings className="h-3 w-3 mr-1" />
                      Ne
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Provider:</Label>
                <div className="mt-1 text-sm">
                  {status?.provider || "mobile-sms"}
                </div>
              </div>
              {status?.baseUrl && (
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Base URL:</Label>
                  <div className="mt-1 text-sm font-mono bg-muted p-2 rounded">
                    {status.baseUrl}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Konfiguracija */}
      <Card>
        <CardHeader>
          <CardTitle>Konfiguracija Mobile SMS API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="baseUrl">Base URL (obavezno)</Label>
            <Input
              id="baseUrl"
              type="url"
              placeholder="http://192.168.10.118:8080/api/v1"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground mt-1">
              IP adresa i port vašeg telefona sa SMS Mobile API aplikacijom
            </p>
          </div>

          <div>
            <Label htmlFor="apiKey">API Key (opcionalno)</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Ostavite prazno ako nije konfigurisan"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            />
            <p className="text-sm text-muted-foreground mt-1">
              API ključ ako je konfigurisan u SMS Mobile API aplikaciji
            </p>
          </div>

          <Button
            onClick={handleConfigure}
            disabled={configureMutation.isPending}
            className="w-full"
          >
            {configureMutation.isPending ? "Konfigurišem..." : "Sačuvaj konfiguraciju"}
          </Button>
        </CardContent>
      </Card>

      {/* Testiranje */}
      <Card>
        <CardHeader>
          <CardTitle>Testiranje SMS funkcionalnosti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending}
              className="flex-1"
            >
              <Wifi className="h-4 w-4 mr-2" />
              {testConnectionMutation.isPending ? "Testiram..." : "Test konekcije"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testPhone">Test broj telefona</Label>
            <Input
              id="testPhone"
              type="tel"
              placeholder="069123456"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>

          <Button
            onClick={handleTestSMS}
            disabled={testSMSMutation.isPending || !testPhone}
            className="w-full"
          >
            <Phone className="h-4 w-4 mr-2" />
            {testSMSMutation.isPending ? "Šalje se..." : "Pošalji test SMS"}
          </Button>
        </CardContent>
      </Card>

      {/* Instrukcije */}
      <Card>
        <CardHeader>
          <CardTitle>Uputstvo za korišćenje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Instalirajte "SMS Mobile API" aplikaciju na vaš telefon</li>
              <li>Otvorite aplikaciju i pokrenite SMS Gateway servis</li>
              <li>Vaša IP adresa je: <code className="bg-gray-100 px-1 rounded">192.168.10.118</code></li>
              <li>Unesite Base URL: <code className="bg-gray-100 px-1 rounded">http://192.168.10.118:8080/api/v1</code></li>
              <li>Ako SMS Mobile API aplikacija traži port, uobičajeno je 8080 ili 8000</li>
              <li>Sačuvajte konfiguraciju i testirajte konekciju</li>
              <li>Pošaljite test SMS da proverite funkcionalnost</li>
            </ol>
            
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ Problem sa konekcijom:</p>
              <p className="text-sm text-yellow-700 mb-2">
                Replit server (cloud) ne može pristupiti vašoj lokalnoj IP adresi (192.168.10.118).
              </p>
              <p className="text-sm font-weight-bold text-yellow-800 mb-1">Rešenja:</p>
              <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                <li><strong>ngrok tunnel (preporučeno):</strong> Instalirajte ngrok na telefon ili računar</li>
                <li><strong>Port forwarding:</strong> Konfigurirajte router za prosleđivanje porta 8080</li>
                <li><strong>Javna IP:</strong> Koristite javnu IP adresu umesto lokalne (192.168.x.x)</li>
                <li><strong>VPN/Hamachi:</strong> Uspostavite VPN konekciju između servera i telefona</li>
              </ol>
              
              <div className="mt-3 p-2 bg-white rounded border-l-4 border-green-500">
                <p className="text-sm font-medium text-green-800 mb-1">📱 Preporučeno rešenje - ngrok tunnel:</p>
                <ol className="text-xs text-green-700 list-decimal list-inside space-y-1">
                  <li>Instalirajte ngrok na telefon ili računar</li>
                  <li>Pokrenite: <code className="bg-gray-100 px-1">ngrok http --host-header=localhost 8080</code></li>
                  <li>Kopirajte HTTPS URL (npr. https://abc123.ngrok.io)</li>
                  <li>Unesite u Base URL: <code className="bg-gray-100 px-1">https://abc123.ngrok.io/api/v1</code></li>
                </ol>
                <p className="text-xs text-green-600 mt-2">💡 Ngrok pravi siguran tunel preko interneta - najbolja opcija!</p>
              </div>

              <div className="mt-3 p-2 bg-yellow-50 rounded border-l-4 border-yellow-500">
                <p className="text-sm font-medium text-yellow-800 mb-1">🔄 Alternativa - Lokalni IP:</p>
                <ol className="text-xs text-yellow-700 list-decimal list-inside space-y-1">
                  <li>Možete probati lokalni IP direktno: <code className="bg-gray-100 px-1">http://192.168.10.118:8080/api/v1</code></li>
                  <li>Ili pokušajte sa drugim portom ako 8080 ne radi</li>
                </ol>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">💡 Alternativa - Twilio SMS:</p>
              <p className="text-sm text-blue-800 mb-3">
                Možemo se vratiti na pouzdani Twilio SMS servis koji garantovano funkcioniše
                sa cloud server-ima. Treba vam samo Twilio Account SID i Auth Token.
              </p>
              <div className="mt-3 p-2 bg-orange-50 rounded border-l-4 border-orange-500">
                <p className="text-sm font-medium text-orange-800 mb-1">🛠️ Port Forwarding Setup:</p>
                <div className="text-xs text-orange-700 space-y-1">
                  <div><strong>1.</strong> U router admin panelu idite na "Port Forwards" (već otvoreno)</div>
                  <div><strong>2.</strong> Promenite External Port sa 9080 na <code className="bg-white px-1">8080</code></div>
                  <div><strong>3.</strong> Promenite Internal Port na <code className="bg-white px-1">8080</code></div>
                  <div><strong>4.</strong> Internal IP ostavite <code className="bg-white px-1">192.168.10.118</code></div>
                  <div><strong>5.</strong> Kliknite "Save & Apply"</div>
                  <div><strong>6.</strong> Pronađite javnu IP u "Internet" sekciji ili kliknite dugme ispod</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch('https://api.ipify.org?format=json');
                      const data = await response.json();
                      const publicIP = data.ip;
                      const newUrl = `http://${publicIP}:8080/api/v1`;
                      setConfig({...config, baseUrl: newUrl});
                      navigator.clipboard.writeText(newUrl);
                      toast({
                        title: "IP adresa dohvaćena",
                        description: `Base URL postavljen na: ${newUrl}`,
                      });
                    } catch (error) {
                      window.open('https://www.whatismyipaddress.com/', '_blank');
                    }
                  }}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  Javni IP URL
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const localUrl = `http://192.168.10.118:8080/api/v1`;
                    setConfig({...config, baseUrl: localUrl});
                    toast({
                      title: "Lokalni IP postavljen",
                      description: `Base URL: ${localUrl}`,
                    });
                  }}
                  className="bg-yellow-600 text-white hover:bg-yellow-700"
                >
                  Lokalni IP URL
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const customUrl = prompt("Unesite custom URL (npr. https://abc123.ngrok.io/api/v1):");
                    if (customUrl) {
                      setConfig({...config, baseUrl: customUrl});
                      toast({
                        title: "Custom URL postavljen",
                        description: `Base URL: ${customUrl}`,
                      });
                    }
                  }}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  Custom URL
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}