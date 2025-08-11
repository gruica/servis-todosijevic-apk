import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  MessageSquare, 
  Settings, 
  Phone, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Wifi,
  WifiOff,
  Signal
} from 'lucide-react';

interface SMSConfig {
  id: number;
  provider: 'sms-mobile' | 'twilio' | 'nexmo';
  apiKey: string;
  apiSecret?: string;
  senderId: string;
  isEnabled: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  testMode: boolean;
  webhookUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SMSTestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
  timestamp: string;
}

export function MobileSMSConfig() {
  const [config, setConfig] = useState<SMSConfig>({
    id: 0,
    provider: 'sms-mobile',
    apiKey: '',
    apiSecret: '',
    senderId: 'FrigoServis',
    isEnabled: true,
    dailyLimit: 100,
    monthlyLimit: 2000,
    testMode: false,
    webhookUrl: ''
  } as SMSConfig);

  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test poruka sa Frigo Sistem Todosijević aplikacije');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Učitaj SMS konfiguraciju
  const { data: smsConfig, isLoading } = useQuery<SMSConfig>({
    queryKey: ['/api/admin/sms-config'],
    enabled: true,
    retry: 1
  });

  // Update config when data is loaded
  useEffect(() => {
    if (smsConfig) {
      setConfig(smsConfig);
    }
  }, [smsConfig]);

  // Sačuvaj SMS konfiguraciju
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Partial<SMSConfig>) => {
      const response = await apiRequest('/api/admin/sms-config', {
        method: 'POST',
        body: JSON.stringify(configData)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Konfiguracija sačuvana",
        description: "SMS postavke su uspešno ažurirane.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sms-config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri čuvanju",
        description: error.message || "Greška pri čuvanju SMS konfiguracije.",
        variant: "destructive",
      });
    }
  });

  // Test SMS slanje
  const testSMSMutation = useMutation({
    mutationFn: async (testData: { phone: string; message: string }) => {
      const response = await apiRequest('/api/admin/sms-test', {
        method: 'POST',
        body: JSON.stringify(testData)
      });
      return response.json();
    },
    onSuccess: (result: SMSTestResult) => {
      if (result.success) {
        toast({
          title: "SMS uspešno poslat",
          description: `Test SMS je poslat na broj ${testPhone}. ID poruke: ${result.messageId}`,
        });
      } else {
        toast({
          title: "SMS slanje neuspešno",
          description: result.error || "Greška pri slanju test SMS-a",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri testiranju",
        description: error.message || "Greška pri slanju test SMS-a.",
        variant: "destructive",
      });
    }
  });

  // Test konekcije
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      setConnectionStatus('connecting');
      const response = await apiRequest('/api/admin/sms-connection-test', {
        method: 'POST',
        body: JSON.stringify({ 
          provider: config.provider,
          apiKey: config.apiKey,
          apiSecret: config.apiSecret 
        })
      });
      return response.json();
    },
    onSuccess: (result) => {
      setConnectionStatus(result.success ? 'connected' : 'disconnected');
      toast({
        title: result.success ? "Konekcija uspešna" : "Konekcija neuspešna",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: () => {
      setConnectionStatus('disconnected');
      toast({
        title: "Greška konekcije",
        description: "Greška pri testiranju konekcije sa SMS provajderom.",
        variant: "destructive",
      });
    }
  });

  const handleSaveConfig = () => {
    if (!config.apiKey) {
      toast({
        title: "Nedostaju podaci",
        description: "API ključ je obavezan.",
        variant: "destructive",
      });
      return;
    }

    saveConfigMutation.mutate(config);
  };

  const handleTestSMS = () => {
    if (!testPhone || !testMessage) {
      toast({
        title: "Nedostaju podaci",
        description: "Broj telefona i poruka su obavezni za test.",
        variant: "destructive",
      });
      return;
    }

    testSMSMutation.mutate({
      phone: testPhone,
      message: testMessage
    });
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Signal className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800">Povezano</Badge>;
      case 'connecting':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Povezujem...</Badge>;
      default:
        return <Badge variant="destructive">Nije povezano</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Konfiguracija
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Konfiguracija
            </div>
            <div className="flex items-center gap-2">
              {getConnectionIcon()}
              {getConnectionBadge()}
            </div>
          </CardTitle>
          <CardDescription>
            Konfiguracija SMS servisa za automatske notifikacije klijentima i serviserima.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="config" className="w-full">
            <TabsList>
              <TabsTrigger value="config">Osnovne postavke</TabsTrigger>
              <TabsTrigger value="limits">Limiti i sigurnost</TabsTrigger>
              <TabsTrigger value="test">Testiranje</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">SMS Provajder</Label>
                  <Select 
                    value={config.provider} 
                    onValueChange={(value: 'sms-mobile' | 'twilio' | 'nexmo') => 
                      setConfig(prev => ({ ...prev, provider: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms-mobile">SMS Mobile (Preporučeno)</SelectItem>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="nexmo">Nexmo/Vonage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderId">Sender ID</Label>
                  <Input
                    id="senderId"
                    value={config.senderId}
                    onChange={(e) => setConfig(prev => ({ ...prev, senderId: e.target.value }))}
                    placeholder="FrigoServis"
                    maxLength={11}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Ključ</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Unesite API ključ"
                  />
                </div>

                {config.provider !== 'sms-mobile' && (
                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">API Secret</Label>
                    <Input
                      id="apiSecret"
                      type="password"
                      value={config.apiSecret || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, apiSecret: e.target.value }))}
                      placeholder="Unesite API secret"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isEnabled"
                  checked={config.isEnabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, isEnabled: checked }))}
                />
                <Label htmlFor="isEnabled">Omogući SMS notifikacije</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="testMode"
                  checked={config.testMode}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, testMode: checked }))}
                />
                <Label htmlFor="testMode">Test mod (SMS se neće stvarno slati)</Label>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyLimit">Dnevni limit SMS-ova</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    value={config.dailyLimit}
                    onChange={(e) => setConfig(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) || 0 }))}
                    min="1"
                    max="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyLimit">Mesečni limit SMS-ova</Label>
                  <Input
                    id="monthlyLimit"
                    type="number"
                    value={config.monthlyLimit}
                    onChange={(e) => setConfig(prev => ({ ...prev, monthlyLimit: parseInt(e.target.value) || 0 }))}
                    min="1"
                    max="10000"
                  />
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Limiti služe za kontrolu troškova SMS slanja. Kada se dostigne limit, automatsko slanje se zaustavlja.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="test" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="testPhone">Test broj telefona</Label>
                  <Input
                    id="testPhone"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+381641234567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="connectionTest">Test konekcije</Label>
                  <Button
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={testConnectionMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    {testConnectionMutation.isPending ? 'Testiram...' : 'Testiraj konekciju'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testMessage">Test poruka</Label>
                <Textarea
                  id="testMessage"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Unesite test poruku..."
                  rows={3}
                  maxLength={160}
                />
                <div className="text-sm text-gray-500">
                  {testMessage.length}/160 karaktera
                </div>
              </div>

              <Button
                onClick={handleTestSMS}
                disabled={testSMSMutation.isPending || !testPhone || !testMessage}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {testSMSMutation.isPending ? 'Šalje se...' : 'Pošalji test SMS'}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
            <Button
              onClick={() => testConnectionMutation.mutate()}
              variant="outline"
              disabled={testConnectionMutation.isPending}
            >
              Testiraj konekciju
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={saveConfigMutation.isPending}
            >
              <Settings className="h-4 w-4 mr-2" />
              {saveConfigMutation.isPending ? 'Čuva se...' : 'Sačuvaj postavke'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MobileSMSConfig;