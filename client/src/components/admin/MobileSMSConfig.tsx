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
    baseUrl: "",
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
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">💡 Napomena:</p>
              <p className="text-sm text-blue-800">
                Telefon i server moraju biti na istoj WiFi mreži. SMS Mobile API aplikacija 
                koristi vaš telefon kao SMS gateway za slanje poruka klijentima.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}