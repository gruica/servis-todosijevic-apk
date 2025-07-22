// SMS Mobile API Configuration Page - Admin interface za konfigurisanje SmsMobile servisa
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Key, 
  Globe, 
  Clock, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Send, 
  CreditCard,
  Smartphone,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

interface SMSMobileConfig {
  apiKey: string;
  baseURL: string;
  gatewayName: string;
  timeout: string;
}

interface APIStatus {
  connected: boolean;
  error?: string;
  apiInfo?: {
    status: string;
    version: string;
    credits: number;
    gateways: any[];
  };
}

export default function SMSMobileConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState<SMSMobileConfig>({
    apiKey: '',
    baseURL: 'https://api.smsmobile.rs/api/v1',
    gatewayName: 'default',
    timeout: '10000'
  });
  
  const [testPhone, setTestPhone] = useState('067028666');
  const [isTestSending, setIsTestSending] = useState(false);

  // Dohvatanje trenutne konfiguracije
  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/admin/system-settings'],
    select: (data: any[]) => {
      const smsSettings = data.filter(setting => setting.category === 'sms');
      return {
        apiKey: smsSettings.find(s => s.key === 'sms_mobile_api_key')?.value || '',
        baseURL: smsSettings.find(s => s.key === 'sms_mobile_base_url')?.value || 'https://api.smsmobile.rs/api/v1',
        gatewayName: smsSettings.find(s => s.key === 'sms_mobile_gateway_name')?.value || 'default',
        timeout: smsSettings.find(s => s.key === 'sms_mobile_timeout')?.value || '10000'
      };
    }
  });

  // Provera status API-ja
  const { data: apiStatus, refetch: refetchStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['/api/sms/mobile/status'],
    enabled: !!systemSettings?.apiKey,
    refetchInterval: 30000 // Osvežava svakih 30 sekundi
  });

  // Dohvatanje kredita
  const { data: creditsData, refetch: refetchCredits } = useQuery({
    queryKey: ['/api/sms/mobile/credits'],
    enabled: !!systemSettings?.apiKey && apiStatus?.connected,
    refetchInterval: 60000 // Osvežava svaki minut
  });

  // Dohvatanje gateway-a
  const { data: gatewaysData, refetch: refetchGateways } = useQuery({
    queryKey: ['/api/sms/mobile/gateways'],
    enabled: !!systemSettings?.apiKey && apiStatus?.connected
  });

  // Mutation za čuvanje konfiguracije
  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: SMSMobileConfig) => {
      const updates = [
        { key: 'sms_mobile_api_key', value: newConfig.apiKey },
        { key: 'sms_mobile_base_url', value: newConfig.baseURL },
        { key: 'sms_mobile_gateway_name', value: newConfig.gatewayName },
        { key: 'sms_mobile_timeout', value: newConfig.timeout }
      ];

      for (const update of updates) {
        await apiRequest(`/api/admin/system-settings/${update.key}`, {
          method: 'PUT',
          body: JSON.stringify({ value: update.value })
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Konfiguracija sačuvana",
        description: "SMS Mobile API konfiguracija je uspešno ažurirana."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sms/mobile/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: `Nije moguće sačuvati konfiguraciju: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Test slanje SMS-a
  const sendTestSMS = async () => {
    if (!testPhone.trim()) {
      toast({
        title: "Greška",
        description: "Unesite broj telefona za test",
        variant: "destructive"
      });
      return;
    }

    setIsTestSending(true);
    
    try {
      const response = await apiRequest('/api/sms/mobile/test', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: testPhone })
      });

      if (response.success) {
        toast({
          title: "Test SMS poslat",
          description: `SMS je uspešno poslat na ${testPhone}`,
        });
        
        // Osveži kredite nakon slanja
        refetchCredits();
      } else {
        throw new Error(response.error || 'Nepoznata greška');
      }
    } catch (error: any) {
      toast({
        title: "Test neuspešan",
        description: `Greška pri slanju test SMS-a: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsTestSending(false);
    }
  };

  // Sinhroni lokalni config sa sistemskim settings
  useEffect(() => {
    if (systemSettings) {
      setConfig(systemSettings);
    }
  }, [systemSettings]);

  const handleSaveConfig = () => {
    if (!config.apiKey.trim()) {
      toast({
        title: "Greška",
        description: "API ključ je obavezan",
        variant: "destructive"
      });
      return;
    }
    
    saveConfigMutation.mutate(config);
  };

  const getStatusColor = (connected: boolean) => {
    return connected ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (connected: boolean) => {
    return connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />;
  };

  if (isLoadingSettings) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Učitavanje konfiguracije...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Smartphone className="h-6 w-6" />
        <h1 className="text-2xl font-bold">SMS Mobile API Konfiguracija</h1>
      </div>

      {/* Status pregled */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Status servisa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Konekcija status */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              {isLoadingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <div className={getStatusColor(apiStatus?.connected || false)}>
                  {getStatusIcon(apiStatus?.connected || false)}
                </div>
              )}
              <div>
                <p className="font-medium">Konekcija</p>
                <p className="text-sm text-muted-foreground">
                  {apiStatus?.connected ? 'Povezano' : 'Nije povezano'}
                </p>
              </div>
            </div>

            {/* Krediti */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <div>
                <p className="font-medium">Krediti</p>
                <p className="text-sm text-muted-foreground">
                  {creditsData?.success ? creditsData.credits : 'N/A'}
                </p>
              </div>
            </div>

            {/* Gateway-jevi */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Smartphone className="h-4 w-4 text-purple-600" />
              <div>
                <p className="font-medium">Gateway-jevi</p>
                <p className="text-sm text-muted-foreground">
                  {gatewaysData?.success ? `${gatewaysData.gateways?.length || 0} dostupno` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {apiStatus?.error && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {apiStatus.error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Konfiguracija */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            API konfiguracija
          </CardTitle>
          <CardDescription>
            Konfigurisanje SmsMobile API servisa za slanje SMS poruka
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API ključ
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Unesite SMS Mobile API ključ"
            />
            <p className="text-sm text-muted-foreground">
              API ključ možete pronaći u SmsMobile aplikaciji pod "My API Key"
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseURL" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Base URL
            </Label>
            <Input
              id="baseURL"
              value={config.baseURL}
              onChange={(e) => setConfig(prev => ({ ...prev, baseURL: e.target.value }))}
              placeholder="https://api.smsmobile.rs/api/v1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gatewayName">Naziv gateway-a</Label>
              <Input
                id="gatewayName"
                value={config.gatewayName}
                onChange={(e) => setConfig(prev => ({ ...prev, gatewayName: e.target.value }))}
                placeholder="default"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeout (ms)
              </Label>
              <Input
                id="timeout"
                type="number"
                value={config.timeout}
                onChange={(e) => setConfig(prev => ({ ...prev, timeout: e.target.value }))}
                placeholder="10000"
              />
            </div>
          </div>

          <Button 
            onClick={handleSaveConfig}
            disabled={saveConfigMutation.isPending}
            className="w-full"
          >
            {saveConfigMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Sačuvaj konfiguraciju
          </Button>
        </CardContent>
      </Card>

      {/* Test sekcija */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test SMS slanja
          </CardTitle>
          <CardDescription>
            Pošaljite test SMS poruku da proverite da li konfiguracija radi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testPhone">Broj telefona za test</Label>
            <Input
              id="testPhone"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="067028666"
            />
          </div>

          <Button 
            onClick={sendTestSMS}
            disabled={isTestSending || !config.apiKey || !apiStatus?.connected}
            className="w-full"
          >
            {isTestSending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Pošalji test SMS
          </Button>

          {!config.apiKey && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Prvo konfigurisite API ključ da biste mogli testirati slanje SMS-a
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Gateway informacije */}
      {gatewaysData?.success && gatewaysData.gateways && (
        <Card>
          <CardHeader>
            <CardTitle>Dostupni gateway-jevi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gatewaysData.gateways.map((gateway: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{gateway.name}</p>
                    <p className="text-sm text-muted-foreground">{gateway.description}</p>
                  </div>
                  <Badge variant={gateway.status === 'active' ? 'default' : 'secondary'}>
                    {gateway.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}