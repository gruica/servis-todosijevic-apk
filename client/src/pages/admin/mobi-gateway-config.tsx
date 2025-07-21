import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Smartphone, Wifi, Settings, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SMSStatus {
  primaryProvider: 'twilio' | 'mobi_gateway';
  fallbackProvider?: 'twilio' | 'mobi_gateway';
  twilioStatus: {
    isConfigured: boolean;
    provider: string;
    phoneNumber: string;
    lastError?: string;
  };
  mobiGatewayStatus?: {
    connected: boolean;
    phoneStatus?: any;
    error?: string;
  };
}

export default function MobiGatewayConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form stanja
  const [phoneIp, setPhoneIp] = useState('192.168.1.100');
  const [port, setPort] = useState('8080');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test SMS iz Mobi Gateway');
  const [selectedProvider, setSelectedProvider] = useState<'twilio' | 'mobi_gateway'>('twilio');

  // Status upiti
  const { data: smsStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<SMSStatus>({
    queryKey: ['/api/admin/sms/status'],
    refetchInterval: 10000, // Refresh svakih 10 sekundi
  });

  // Konfiguracija Mobi Gateway
  const configureMobiGateway = useMutation({
    mutationFn: async (config: { phoneIpAddress: string; port: string; username?: string; password?: string }) => {
      return apiRequest(`/api/admin/mobi-gateway/configure`, {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspešno",
        description: "Mobi Gateway je uspešno konfigurisan",
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri konfiguraciji Mobi Gateway",
        variant: "destructive",
      });
    }
  });

  // Postavljanje provider-a
  const setProvider = useMutation({
    mutationFn: async (data: { primaryProvider: string; fallbackProvider?: string }) => {
      return apiRequest(`/api/admin/sms/set-provider`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspešno",
        description: "SMS provider je uspešno postavljen",
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri postavljanju provider-a",
        variant: "destructive",
      });
    }
  });

  // Test konekcije
  const testConnection = useMutation({
    mutationFn: async (provider?: string) => {
      return apiRequest(`/api/admin/sms/test-connection`, {
        method: 'POST',
        body: JSON.stringify({ provider })
      });
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Uspešno",
          description: "Test konekcije je uspešan",
        });
      } else {
        toast({
          title: "Neuspešno",
          description: data.error || "Test konekcije nije uspešan",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri testiranju konekcije",
        variant: "destructive",
      });
    }
  });

  // Test SMS
  const sendTestSMS = useMutation({
    mutationFn: async (data: { phoneNumber: string; message: string; provider?: string }) => {
      return apiRequest(`/api/admin/sms-test`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Uspešno",
        description: "Test SMS je uspešno poslat",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri slanju test SMS-a",
        variant: "destructive",
      });
    }
  });

  const handleConfigureMobiGateway = () => {
    if (!phoneIp || !port) {
      toast({
        title: "Greška",
        description: "IP adresa i port su obavezni",
        variant: "destructive",
      });
      return;
    }

    configureMobiGateway.mutate({
      phoneIpAddress: phoneIp,
      port,
      username: username || undefined,
      password: password || undefined
    });
  };

  const handleSetProvider = () => {
    setProvider.mutate({
      primaryProvider: selectedProvider
    });
  };

  const handleTestConnection = (provider?: 'twilio' | 'mobi_gateway') => {
    testConnection.mutate(provider);
  };

  const handleSendTestSMS = (provider?: 'twilio' | 'mobi_gateway') => {
    if (!testPhone || !testMessage) {
      toast({
        title: "Greška",
        description: "Broj telefona i poruka su obavezni",
        variant: "destructive",
      });
      return;
    }

    sendTestSMS.mutate({
      phoneNumber: testPhone,
      message: testMessage,
      provider
    });
  };

  if (statusLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">SMS Gateway Konfiguracija</h1>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Učitavam status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Smartphone className="h-6 w-6" />
        <h1 className="text-2xl font-bold">SMS Gateway Konfiguracija</h1>
      </div>

      {/* Status pregled */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="h-5 w-5" />
            <span>Trenutni Status SMS Sistema</span>
          </CardTitle>
          <CardDescription>
            Pregled trenutnog stanja SMS provider-a i konekcija
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Twilio Status */}
            <div className="border rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Twilio SMS</h3>
                <Badge variant={smsStatus?.twilioStatus?.isConfigured ? "default" : "secondary"}>
                  {smsStatus?.twilioStatus?.isConfigured ? "Konfigurisan" : "Nije konfigurisan"}
                </Badge>
              </div>
              {smsStatus?.twilioStatus?.phoneNumber && (
                <p className="text-sm text-muted-foreground">
                  Broj: {smsStatus.twilioStatus.phoneNumber}
                </p>
              )}
              {smsStatus?.twilioStatus?.lastError && (
                <p className="text-sm text-red-600">
                  Greška: {smsStatus.twilioStatus.lastError}
                </p>
              )}
            </div>

            {/* Mobi Gateway Status */}
            <div className="border rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Mobi Gateway</h3>
                <Badge variant={smsStatus?.mobiGatewayStatus?.connected ? "default" : "secondary"}>
                  {smsStatus?.mobiGatewayStatus?.connected ? "Povezan" : "Nije povezan"}
                </Badge>
              </div>
              {smsStatus?.mobiGatewayStatus?.phoneStatus && (
                <p className="text-sm text-muted-foreground">
                  Status telefona: OK
                </p>
              )}
              {smsStatus?.mobiGatewayStatus?.error && (
                <p className="text-sm text-red-600">
                  Greška: {smsStatus.mobiGatewayStatus.error}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Trenutni provider:</span>
            <Badge variant="outline">
              {smsStatus?.primaryProvider === 'twilio' ? 'Twilio' : 'Mobi Gateway'}
            </Badge>
            {smsStatus?.fallbackProvider && (
              <>
                <span className="text-sm">→ Fallback:</span>
                <Badge variant="outline">
                  {smsStatus.fallbackProvider === 'twilio' ? 'Twilio' : 'Mobi Gateway'}
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mobi Gateway konfiguracija */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Mobi Gateway Konfiguracija</span>
          </CardTitle>
          <CardDescription>
            Konfiguriši komunikaciju sa telefonom preko IP adrese
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vaš telefon treba da ima Mobi Gateway aplikaciju pokrenuto i da bude na istoj mreži.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone-ip">IP Adresa Telefona *</Label>
              <Input
                id="phone-ip"
                value={phoneIp}
                onChange={(e) => setPhoneIp(e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <Label htmlFor="port">Port *</Label>
              <Input
                id="port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="8080"
              />
            </div>
            <div>
              <Label htmlFor="username">Korisničko ime (opciono)</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <Label htmlFor="password">Lozinka (opciono)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button 
            onClick={handleConfigureMobiGateway}
            disabled={configureMobiGateway.isPending}
            className="w-full"
          >
            {configureMobiGateway.isPending && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            Konfiguriši Mobi Gateway
          </Button>
        </CardContent>
      </Card>

      {/* Provider selekcija */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Provider Postavka</CardTitle>
          <CardDescription>
            Izaberi koji SMS servis da koristi aplikacija
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="provider-select">Osnovni SMS Provider</Label>
            <Select value={selectedProvider} onValueChange={(value: 'twilio' | 'mobi_gateway') => setSelectedProvider(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio (cloud servis)</SelectItem>
                <SelectItem value="mobi_gateway">Mobi Gateway (vaš telefon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleSetProvider}
            disabled={setProvider.isPending}
          >
            {setProvider.isPending && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            Postavi Provider
          </Button>
        </CardContent>
      </Card>

      {/* Test funkcionalnosti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>Test SMS Funkcionalnosti</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test konekcije */}
          <div>
            <h3 className="font-semibold mb-3">Test Konekcije</h3>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => handleTestConnection('twilio')}
                disabled={testConnection.isPending}
              >
                Test Twilio
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleTestConnection('mobi_gateway')}
                disabled={testConnection.isPending}
              >
                Test Mobi Gateway
              </Button>
              <Button 
                onClick={() => handleTestConnection()}
                disabled={testConnection.isPending}
              >
                Test Trenutni Provider
              </Button>
            </div>
          </div>

          <Separator />

          {/* Test SMS */}
          <div>
            <h3 className="font-semibold mb-3">Test SMS Slanje</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="test-phone">Broj telefona</Label>
                <Input
                  id="test-phone"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+38267123456"
                />
              </div>
              <div>
                <Label htmlFor="test-message">Poruka</Label>
                <Input
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Test poruka"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => handleSendTestSMS('twilio')}
                disabled={sendTestSMS.isPending}
              >
                Pošalji preko Twilio
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleSendTestSMS('mobi_gateway')}
                disabled={sendTestSMS.isPending}
              >
                Pošalji preko Mobi Gateway
              </Button>
              <Button 
                onClick={() => handleSendTestSMS()}
                disabled={sendTestSMS.isPending}
              >
                Pošalji preko Trenutnog Provider-a
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}