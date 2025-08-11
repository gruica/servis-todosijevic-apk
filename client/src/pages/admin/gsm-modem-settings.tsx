import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Smartphone, 
  Settings, 
  Wifi, 
  WifiOff, 
  Signal, 
  MessageSquare,
  Phone,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";

interface GSMModemConfig {
  id?: number;
  portPath: string;
  baudRate: number;
  enabled: boolean;
  pin?: string;
  networkOperator?: string;
  signalStrength?: number;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastConnected?: string;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  errorCount: number;
  autoReconnect: boolean;
  maxRetries: number;
  keepAliveInterval: number;
}

interface ModemStatus {
  isConnected: boolean;
  signalStrength: number;
  networkOperator: string;
  batteryLevel?: number;
  lastActivity: string;
  pendingMessages: number;
}

export default function GSMModemSettingsPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<GSMModemConfig>({
    portPath: '/dev/ttyUSB0',
    baudRate: 9600,
    enabled: false,
    pin: '',
    networkOperator: '',
    signalStrength: 0,
    connectionStatus: 'disconnected',
    totalMessagesSent: 0,
    totalMessagesReceived: 0,
    errorCount: 0,
    autoReconnect: true,
    maxRetries: 3,
    keepAliveInterval: 30000
  });

  // Fetch current GSM modem configuration
  const { data: currentConfig, isLoading } = useQuery<GSMModemConfig>({
    queryKey: ['/api/admin/gsm-modem-config'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/gsm-modem-config', { method: 'GET' });
      return response.json();
    },
    refetchInterval: 10000 // Refresh every 10 seconds for real-time status
  });

  // Update local config when data changes
  useEffect(() => {
    if (currentConfig) {
      setConfig(prev => ({ ...prev, ...currentConfig }));
    }
  }, [currentConfig]);

  // Fetch modem status
  const { data: modemStatus } = useQuery<ModemStatus>({
    queryKey: ['/api/admin/gsm-modem-status'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/gsm-modem-status', { method: 'GET' });
      return response.json();
    },
    enabled: config.enabled,
    refetchInterval: 5000 // Refresh every 5 seconds when enabled
  });

  // Update GSM modem configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: GSMModemConfig) => {
      const response = await apiRequest('/api/admin/gsm-modem-config', {
        method: 'PUT',
        body: JSON.stringify(newConfig)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Konfiguracija sačuvana",
        description: "GSM modem konfiguracija je uspešno ažurirana.",
      });
      // Refresh configuration after update
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri čuvanju",
        description: error.message || "Došlo je do greške pri čuvanju konfiguracije.",
        variant: "destructive",
      });
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/gsm-modem-test', {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Konekcija uspešna",
          description: `Modem je povezan. Operator: ${data.operator}, Signal: ${data.signalStrength}%`,
        });
      } else {
        throw new Error(data.error || 'Test connection failed');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Greška konekcije",
        description: error.message || "Nije moguće povezati se sa modem-om.",
        variant: "destructive",
      });
    }
  });

  // Send test SMS mutation
  const sendTestSMSMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/gsm-modem-test-sms', {
        method: 'POST',
        body: JSON.stringify({
          phone: '+38169123456', // Test number
          message: 'Test SMS preko GSM modem-a - Frigo Sistem'
        })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test SMS poslat",
        description: "Test SMS poruka je uspešno poslata preko GSM modem-a.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri slanju SMS-a",
        description: error.message || "Test SMS nije mogao biti poslat.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    updateConfigMutation.mutate(config);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const handleTestSMS = () => {
    sendTestSMSMutation.mutate();
  };

  const getConnectionStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Povezan</Badge>;
      case 'connecting':
        return <Badge variant="secondary"><Signal className="h-3 w-3 mr-1" />Povezivanje...</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Greška</Badge>;
      default:
        return <Badge variant="outline"><WifiOff className="h-3 w-3 mr-1" />Odspojen</Badge>;
    }
  };

  const getSignalStrengthColor = (strength: number) => {
    if (strength >= 75) return 'text-green-600';
    if (strength >= 50) return 'text-yellow-600';
    if (strength >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Smartphone className="h-8 w-8" />
            GSM Modem podešavanja
          </h1>
          <p className="text-muted-foreground mt-1">
            Konfiguracija GSM modem-a za slanje SMS poruka
          </p>
        </div>

        <div className="grid gap-6">
          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Signal className="h-5 w-5" />
                Status modem-a
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getConnectionStatusBadge(config.connectionStatus)}
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Jačina signala</p>
                  <div className="flex items-center gap-1">
                    <Signal className={`h-4 w-4 ${getSignalStrengthColor(config.signalStrength || 0)}`} />
                    <span className={`font-medium ${getSignalStrengthColor(config.signalStrength || 0)}`}>
                      {config.signalStrength || 0}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Operator</p>
                  <p className="font-medium">{config.networkOperator || 'N/A'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Poslednja aktivnost</p>
                  <p className="font-medium text-sm">
                    {config.lastConnected 
                      ? new Date(config.lastConnected).toLocaleString('sr-RS') 
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{config.totalMessagesSent}</p>
                  <p className="text-sm text-muted-foreground">Poslato SMS</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{config.totalMessagesReceived}</p>
                  <p className="text-sm text-muted-foreground">Primljeno SMS</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{config.errorCount}</p>
                  <p className="text-sm text-muted-foreground">Greške</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Konfiguracija
              </CardTitle>
              <CardDescription>
                Osnovne postavke za GSM modem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                />
                <Label>GSM modem omogućen</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="port-path">Port putanja *</Label>
                  <Input
                    id="port-path"
                    value={config.portPath}
                    onChange={(e) => setConfig(prev => ({ ...prev, portPath: e.target.value }))}
                    placeholder="/dev/ttyUSB0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Uobičajeno /dev/ttyUSB0 ili /dev/ttyACM0 na Linux sistemima
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baud-rate">Baud rate</Label>
                  <Select
                    value={config.baudRate.toString()}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, baudRate: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9600">9600</SelectItem>
                      <SelectItem value="19200">19200</SelectItem>
                      <SelectItem value="38400">38400</SelectItem>
                      <SelectItem value="57600">57600</SelectItem>
                      <SelectItem value="115200">115200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">SIM PIN (opcionalno)</Label>
                <Input
                  id="pin"
                  type="password"
                  value={config.pin || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, pin: e.target.value }))}
                  placeholder="Unesite PIN za SIM karticu"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.autoReconnect}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoReconnect: checked }))}
                  />
                  <Label>Automatsko povezivanje</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-retries">Maksimalno pokušaja</Label>
                  <Input
                    id="max-retries"
                    type="number"
                    min="1"
                    max="10"
                    value={config.maxRetries}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keepalive">Keep-alive (ms)</Label>
                  <Input
                    id="keepalive"
                    type="number"
                    min="10000"
                    max="60000"
                    value={config.keepAliveInterval}
                    onChange={(e) => setConfig(prev => ({ ...prev, keepAliveInterval: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Testiranje i akcije
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={handleSave}
                  disabled={updateConfigMutation.isPending}
                >
                  {updateConfigMutation.isPending ? "Čuvanje..." : "Sačuvaj konfiguraciju"}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={!config.enabled || testConnectionMutation.isPending}
                >
                  <Wifi className="h-4 w-4 mr-2" />
                  Testiraj konekciju
                </Button>

                <Button 
                  variant="outline"
                  onClick={handleTestSMS}
                  disabled={!config.enabled || config.connectionStatus !== 'connected' || sendTestSMSMutation.isPending}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Pošalji test SMS
                </Button>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Napomene o GSM modem-u:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Potreban je GSM modem povezan na USB port</li>
                      <li>SIM kartica mora biti aktivna i imati kredit</li>
                      <li>Linux sistemi možda zahtevaju dodatne permisije za pristup serijski portovima</li>
                      <li>Test SMS će biti poslat na test broj +38169123456</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}