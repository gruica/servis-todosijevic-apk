import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Smartphone, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SMSMobileAPIStatus {
  enabled: boolean;
  configured: boolean;
  connected?: boolean;
  message: string;
  baseUrl?: string;
}

export default function SMSMobileAPIConfig() {
  const [status, setStatus] = useState<SMSMobileAPIStatus | null>(null);
  const [config, setConfig] = useState({
    apiKey: '',
    baseUrl: 'https://api.smsmobileapi.com',
    timeout: 10000,
    enabled: false
  });
  const [testData, setTestData] = useState({
    recipients: '38267051141',
    message: 'Test SMS iz Frigo Sistem aplikacije'
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Load initial status
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await apiRequest('/api/sms-mobile-api/status');
      setStatus(response);
      
      if (response.configured) {
        setConfig(prev => ({
          ...prev,
          baseUrl: response.baseUrl || 'https://api.smsmobileapi.com',
          enabled: response.enabled
        }));
      }
    } catch (error) {
      console.error('Error loading SMS Mobile API status:', error);
      toast({
        title: "Greška",
        description: "Nije moguće učitati status SMS Mobile API",
        variant: "destructive"
      });
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      await apiRequest('/api/sms-mobile-api/config', {
        method: 'POST',
        body: JSON.stringify(config)
      });

      toast({
        title: "Uspešno",
        description: "SMS Mobile API konfiguracija je sačuvana",
        variant: "default"
      });

      // Reload status
      await loadStatus();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Greška",
        description: "Greška pri čuvanju konfiguracije",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await apiRequest('/api/sms-mobile-api/test', {
        method: 'POST'
      });

      if (response.success) {
        toast({
          title: "Uspešno",
          description: "Konekcija sa SMS Mobile API je uspešna",
          variant: "default"
        });
      } else {
        toast({
          title: "Greška",
          description: response.message || "Test konekcije nije uspešan",
          variant: "destructive"
        });
      }

      await loadStatus();
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Greška",
        description: "Greška pri testiranju konekcije",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const sendTestSMS = async () => {
    setSending(true);
    try {
      const response = await apiRequest('/api/sms-mobile-api/send', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      if (response.error === 0) {
        toast({
          title: "Uspešno",
          description: `Test SMS je poslat! Message ID: ${response.message_id}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Greška",
          description: response.details || "Greška pri slanju SMS-a",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast({
        title: "Greška",
        description: "Greška pri slanju test SMS-a",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Smartphone className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">SMS Mobile API</h1>
          <p className="text-muted-foreground">Konfiguracija SMS Mobile API servisa</p>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status
            {status?.connected ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Povezano
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Nije povezano
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Konfigurisan:</span>
              <Badge variant={status?.configured ? "default" : "secondary"}>
                {status?.configured ? "Da" : "Ne"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Omogućen:</span>
              <Badge variant={status?.enabled ? "default" : "secondary"}>
                {status?.enabled ? "Da" : "Ne"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Poruka:</span>
              <span className="text-sm text-muted-foreground">{status?.message}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Konfiguracija</CardTitle>
          <CardDescription>
            Unesite podatke za SMS Mobile API servis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="apiKey">API Ključ</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Unesite SMS Mobile API ključ"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                placeholder="https://api.smsmobileapi.com"
                value={config.baseUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="timeout">Timeout (milisekunde)</Label>
              <Input
                id="timeout"
                type="number"
                placeholder="10000"
                value={config.timeout}
                onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 10000 }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
              />
              <Label htmlFor="enabled">Omogući SMS Mobile API</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={saveConfig}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Čuva..." : "Sačuvaj konfiguraciju"}
            </Button>
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing || !config.apiKey}
            >
              {testing ? "Testira..." : "Test konekcije"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test SMS Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test SMS
          </CardTitle>
          <CardDescription>
            Pošaljite test SMS poruku da proverite funkcionisanje
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="recipients">Broj telefona</Label>
            <Input
              id="recipients"
              placeholder="38267051141"
              value={testData.recipients}
              onChange={(e) => setTestData(prev => ({ ...prev, recipients: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="message">Poruka</Label>
            <Textarea
              id="message"
              placeholder="Test SMS iz Frigo Sistem aplikacije"
              value={testData.message}
              onChange={(e) => setTestData(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
            />
          </div>

          <Button
            onClick={sendTestSMS}
            disabled={sending || !status?.enabled || !testData.recipients || !testData.message}
            className="w-full"
          >
            {sending ? "Šalje..." : "Pošalji test SMS"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}