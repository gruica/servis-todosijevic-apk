import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Smartphone, CheckCircle, XCircle, AlertCircle, Send, Settings, Shield, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SMSMobileAPIConfig {
  baseUrl: string;
  timeout: number;
  enabled: boolean;
  hasApiKey: boolean;
  sendsms: string;
  sendwa: string;
  recipients: string;
  message: string;
}

interface SMSMobileAPIStatus {
  enabled: boolean;
  configured: boolean;
  baseUrl: string;
  timeout: number;
  apiStatus: {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  };
}

export default function SMSMobileAPIConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState<SMSMobileAPIConfig>({
    baseUrl: 'https://api.smsmobileapi.com',
    timeout: 30000,
    enabled: false,
    hasApiKey: false,
    sendsms: '1',
    sendwa: '0',
    recipients: '+382',
    message: ''
  });
  
  const [apiKey, setApiKey] = useState('');
  const [testPhoneNumber, setTestPhoneNumber] = useState('+38267051141');
  const [testMessage, setTestMessage] = useState('Test SMS poruka sa SMS Mobile API sistema - Frigo Sistem Todosijević');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);

  // Query za dobijanje trenutne konfiguracije
  const { data: currentConfig, isLoading: configLoading } = useQuery({
    queryKey: ['/api/sms-mobile-api/config'],
    enabled: true
  });

  // Query za dobijanje statusa servisa
  const { data: serviceStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/sms-mobile-api/status'],
    enabled: true,
    refetchInterval: 10000 // Refetch svakih 10 sekundi
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig as SMSMobileAPIConfig);
    }
  }, [currentConfig]);

  // Mutation za ažuriranje konfiguracije
  const updateConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      return apiRequest('/api/sms-mobile-api/config', 'PUT', configData);
    },
    onSuccess: () => {
      toast({
        title: "Uspešno ažurirano",
        description: "SMS Mobile API konfiguracija je uspešno ažurirana",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sms-mobile-api/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sms-mobile-api/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri ažuriranju konfiguracije",
        variant: "destructive",
      });
    }
  });

  // Mutation za testiranje konekcije
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/sms-mobile-api/test', 'POST');
    },
    onSuccess: (data: any) => {
      toast({
        title: "Test uspešan",
        description: data?.message || "Konekcija sa SMS Mobile API je uspešna",
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Test neuspešan",
        description: error.message || "Greška pri testiranju konekcije",
        variant: "destructive",
      });
    }
  });

  // Mutation za slanje test SMS-a
  const sendTestSMSMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/sms-mobile-api/send', 'POST', {
        phoneNumber: testPhoneNumber,
        message: testMessage,
        sendWhatsApp: sendWhatsApp
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "SMS poslana",
        description: data?.message || "Test SMS poruka je uspešno poslana",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri slanju",
        description: error.message || "Greška pri slanju test SMS poruke",
        variant: "destructive",
      });
    }
  });

  const handleSaveConfig = () => {
    const configData = {
      apiKey: apiKey || undefined,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      enabled: config.enabled,
      sendsms: config.sendsms,
      sendwa: config.sendwa,
      recipients: config.recipients,
      message: config.message
    };
    
    updateConfigMutation.mutate(configData);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const handleSendTestSMS = () => {
    if (!testPhoneNumber || !testMessage) {
      toast({
        title: "Greška",
        description: "Unesite broj telefona i poruku za test",
        variant: "destructive",
      });
      return;
    }
    sendTestSMSMutation.mutate();
  };

  const getStatusColor = (status: any) => {
    if (!status) return 'gray';
    if (status.enabled && status.configured && status.apiStatus?.success) return 'green';
    if (status.enabled && status.configured) return 'yellow';
    return 'red';
  };

  const getStatusText = (status: any) => {
    if (!status) return 'Učitava...';
    if (!status.enabled) return 'Onemogućen';
    if (!status.configured) return 'Nije konfigurisan';
    if (status.apiStatus?.success) return 'Aktivan';
    return 'Greška';
  };

  if (configLoading || statusLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Smartphone className="h-6 w-6" />
          <h1 className="text-2xl font-bold">SMS Mobile API Konfiguracija</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Smartphone className="h-6 w-6" />
        <h1 className="text-2xl font-bold">SMS Mobile API Konfiguracija</h1>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Status SMS Mobile API Servisa
          </CardTitle>
          <CardDescription>
            Trenutno stanje SMS Mobile API servisa i konekcije
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status servisa:</span>
            <Badge 
              variant={getStatusColor(serviceStatus) === 'green' ? 'default' : 
                     getStatusColor(serviceStatus) === 'yellow' ? 'secondary' : 'destructive'}
              className="flex items-center gap-1"
            >
              {getStatusColor(serviceStatus) === 'green' && <CheckCircle className="h-3 w-3" />}
              {getStatusColor(serviceStatus) === 'yellow' && <AlertCircle className="h-3 w-3" />}
              {getStatusColor(serviceStatus) === 'red' && <XCircle className="h-3 w-3" />}
              {getStatusText(serviceStatus)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Omogućen:</span>
              <span className="ml-2">{(serviceStatus as any)?.enabled ? 'Da' : 'Ne'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Konfigurisan:</span>
              <span className="ml-2">{(serviceStatus as any)?.configured ? 'Da' : 'Ne'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Base URL:</span>
              <span className="ml-2 font-mono text-xs">{(serviceStatus as any)?.baseUrl}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Timeout:</span>
              <span className="ml-2">{(serviceStatus as any)?.timeout}ms</span>
            </div>
          </div>

          {(serviceStatus as any)?.apiStatus && (
            <Alert className={(serviceStatus as any).apiStatus.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription>
                <strong>API Status:</strong> {(serviceStatus as any).apiStatus.message}
                {(serviceStatus as any).apiStatus.error && (
                  <div className="mt-1 text-sm text-red-600">
                    Greška: {(serviceStatus as any).apiStatus.error}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Osnovne postavke
          </CardTitle>
          <CardDescription>
            Konfigurišite SMS Mobile API postavke
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="sms-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
            />
            <Label htmlFor="sms-enabled">Omogući SMS Mobile API servis</Label>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label htmlFor="api-key" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                API Ključ
              </Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Unesite vaš SMS Mobile API ključ"
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Dobijte API ključ iz SMS Mobile API aplikacije na vašem telefonu
              </p>
            </div>

            <div>
              <Label htmlFor="base-url" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Base URL
              </Label>
              <Input
                id="base-url"
                value={config.baseUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://api.smsmobileapi.com"
                className="font-mono"
              />
            </div>

            <div>
              <Label htmlFor="timeout">Timeout (milisekunde)</Label>
              <Input
                id="timeout"
                type="number"
                value={config.timeout}
                onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                placeholder="30000"
              />
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button 
              onClick={handleSaveConfig}
              disabled={updateConfigMutation.isPending}
              className="flex-1"
            >
              {updateConfigMutation.isPending ? 'Čuva...' : 'Sačuvaj konfiguraciju'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending || !config.enabled}
            >
              {testConnectionMutation.isPending ? 'Testira...' : 'Test konekciju'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test SMS Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test SMS poruka
          </CardTitle>
          <CardDescription>
            Pošaljite test SMS poruku da proverite funkcionalnost
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-phone">Broj telefona</Label>
            <Input
              id="test-phone"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
              placeholder="+38269123456"
            />
          </div>

          <div>
            <Label htmlFor="test-message">Test poruka</Label>
            <Input
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Test poruka sa SMS Mobile API"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="send-whatsapp"
              checked={sendWhatsApp}
              onCheckedChange={setSendWhatsApp}
            />
            <Label htmlFor="send-whatsapp">Pošalji i preko WhatsApp-a</Label>
          </div>

          <Button 
            onClick={handleSendTestSMS}
            disabled={sendTestSMSMutation.isPending || !(serviceStatus as any)?.enabled || !(serviceStatus as any)?.configured}
            className="w-full"
          >
            {sendTestSMSMutation.isPending ? 'Šalje...' : 'Pošalji test SMS'}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Instrukcije za instalaciju</CardTitle>
          <CardDescription>
            Kako da instalirate i konfigurišete SMS Mobile API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <p className="font-medium">Preuzmite SMS Mobile API aplikaciju</p>
                <p className="text-sm text-muted-foreground">Idite na <a href="https://smsmobileapi.com/download" target="_blank" className="text-blue-600 underline">smsmobileapi.com/download</a> i preuzmite aplikaciju za svoj telefon</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <p className="font-medium">Registrujte se i dobijte API ključ</p>
                <p className="text-sm text-muted-foreground">Instalirajte aplikaciju, registrujte se i dobijte vaš jedinstveni API ključ</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <p className="font-medium">Unesite API ključ ovde</p>
                <p className="text-sm text-muted-foreground">Kopirajte API ključ iz aplikacije i unesite ga u polje iznad</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">4</div>
              <div>
                <p className="font-medium">Testirajte funkcionalnost</p>
                <p className="text-sm text-muted-foreground">Omogućite servis i pošaljite test SMS da proverite da li sve radi</p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Napomena:</strong> SMS Mobile API koristi vaš mobilni telefon za slanje poruka. 
              Aplikacija mora biti pokrenuta na telefonu i telefon mora biti povezan na internet.
              Poruke se šalju iz vašeg broja telefona koristeći vaš mobilni plan.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}