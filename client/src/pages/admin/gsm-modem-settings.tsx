import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Smartphone, 
  Settings, 
  Wifi, 
  WifiOff, 
  Signal, 
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Radio,
  Antenna
} from 'lucide-react';

interface GSMModemConfig {
  id: number;
  port: string;
  baudRate: number;
  enabled: boolean;
  pinCode?: string;
  networkOperator?: string;
  signalStrength: number;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastActivity?: string;
  imei?: string;
  simCardStatus: 'not_inserted' | 'ready' | 'pin_required' | 'puk_required' | 'error';
  balance?: number;
  smsCapability: boolean;
  voiceCapability: boolean;
  dataCapability: boolean;
  errorMessage?: string;
  autoReconnect: boolean;
  heartbeatInterval: number;
  maxRetries: number;
}

interface GSMCommand {
  command: string;
  description: string;
  expected_response?: string;
}

interface GSMStats {
  totalSMSSent: number;
  totalSMSReceived: number;
  failedSMS: number;
  uptime: number;
  lastRestart: string;
  signalHistory: Array<{
    timestamp: string;
    strength: number;
  }>;
}

export default function GSMModemSettingsPage() {
  const [config, setConfig] = useState<GSMModemConfig>({
    id: 0,
    port: '/dev/ttyUSB0',
    baudRate: 115200,
    enabled: false,
    pinCode: '',
    networkOperator: '',
    signalStrength: 0,
    connectionStatus: 'disconnected',
    imei: '',
    simCardStatus: 'not_inserted',
    balance: 0,
    smsCapability: true,
    voiceCapability: false,
    dataCapability: false,
    autoReconnect: true,
    heartbeatInterval: 30,
    maxRetries: 3
  });

  const [testCommand, setTestCommand] = useState('AT');
  const [commandResponse, setCommandResponse] = useState('');
  const [isTestingCommand, setIsTestingCommand] = useState(false);
  const [connectionProgress, setConnectionProgress] = useState(0);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Učitaj GSM modem konfiguraciju
  const { data: modemConfig, isLoading } = useQuery<GSMModemConfig>({
    queryKey: ['/api/admin/gsm-modem-config'],
    enabled: true,
    retry: 1
  });

  // Učitaj GSM statistike
  const { data: gsmStats } = useQuery<GSMStats>({
    queryKey: ['/api/admin/gsm-stats'],
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: config.enabled
  });

  // Update config when data is loaded
  useEffect(() => {
    if (modemConfig) {
      setConfig(modemConfig);
    }
  }, [modemConfig]);

  // Sačuvaj GSM konfiguraciju
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Partial<GSMModemConfig>) => {
      const response = await apiRequest('/api/admin/gsm-modem-config', {
        method: 'POST',
        body: JSON.stringify(configData)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Konfiguracija sačuvana",
        description: "GSM modem postavke su uspešno ažurirane.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/gsm-modem-config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri čuvanju",
        description: error.message || "Greška pri čuvanju GSM modem konfiguracije.",
        variant: "destructive",
      });
    }
  });

  // Test konekcije
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      setConnectionProgress(0);
      const response = await apiRequest('/api/admin/gsm-modem-test', {
        method: 'POST',
        body: JSON.stringify({ 
          port: config.port,
          baudRate: config.baudRate,
          pinCode: config.pinCode
        })
      });
      return response.json();
    },
    onSuccess: (result) => {
      setConnectionProgress(100);
      if (result.success) {
        setConfig(prev => ({ 
          ...prev, 
          connectionStatus: 'connected',
          signalStrength: result.signalStrength || 0,
          networkOperator: result.operator || '',
          imei: result.imei || '',
          simCardStatus: result.simStatus || 'ready'
        }));
        toast({
          title: "Konekcija uspešna",
          description: `GSM modem je uspešno povezan. Signal: ${result.signalStrength}%`,
        });
      } else {
        setConfig(prev => ({ ...prev, connectionStatus: 'error', errorMessage: result.error }));
        toast({
          title: "Konekcija neuspešna",
          description: result.error || "Greška pri povezivanju sa GSM modemom.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setConnectionProgress(0);
      setConfig(prev => ({ ...prev, connectionStatus: 'error' }));
      toast({
        title: "Greška konekcije",
        description: "Greška pri testiranju GSM modem konekcije.",
        variant: "destructive",
      });
    }
  });

  // Test AT komande
  const testCommandMutation = useMutation({
    mutationFn: async (command: string) => {
      setIsTestingCommand(true);
      const response = await apiRequest('/api/admin/gsm-at-command', {
        method: 'POST',
        body: JSON.stringify({ command })
      });
      return response.json();
    },
    onSuccess: (result) => {
      setCommandResponse(result.response || 'Nema odgovora');
      setIsTestingCommand(false);
      if (result.success) {
        toast({
          title: "AT komanda uspešna",
          description: `Komanda "${testCommand}" je uspešno izvršena.`,
        });
      } else {
        toast({
          title: "AT komanda neuspešna",
          description: result.error || "Greška pri izvršavanju AT komande.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      setIsTestingCommand(false);
      setCommandResponse('Greška pri izvršavanju komande');
      toast({
        title: "Greška",
        description: "Greška pri slanju AT komande.",
        variant: "destructive",
      });
    }
  });

  const handleSaveConfig = () => {
    if (!config.port) {
      toast({
        title: "Nedostaju podaci",
        description: "Port je obavezan.",
        variant: "destructive",
      });
      return;
    }

    saveConfigMutation.mutate(config);
  };

  const handleTestConnection = () => {
    setConnectionProgress(25);
    setTimeout(() => setConnectionProgress(50), 500);
    setTimeout(() => setConnectionProgress(75), 1000);
    testConnectionMutation.mutate();
  };

  const handleSendATCommand = () => {
    if (!testCommand.trim()) {
      toast({
        title: "Nedostaju podaci",
        description: "AT komanda je obavezna.",
        variant: "destructive",
      });
      return;
    }
    testCommandMutation.mutate(testCommand);
  };

  const getConnectionStatusBadge = () => {
    switch (config.connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800">Povezano</Badge>;
      case 'connecting':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Povezujem...</Badge>;
      case 'error':
        return <Badge variant="destructive">Greška</Badge>;
      default:
        return <Badge variant="secondary">Nije povezano</Badge>;
    }
  };

  const getSignalIcon = () => {
    const strength = config.signalStrength;
    if (strength >= 75) return <Signal className="h-4 w-4 text-green-500" />;
    if (strength >= 50) return <Signal className="h-4 w-4 text-yellow-500" />;
    if (strength >= 25) return <Signal className="h-4 w-4 text-orange-500" />;
    return <Signal className="h-4 w-4 text-red-500" />;
  };

  const getSIMStatusBadge = () => {
    switch (config.simCardStatus) {
      case 'ready':
        return <Badge variant="default" className="bg-green-100 text-green-800">Spremna</Badge>;
      case 'pin_required':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">PIN potreban</Badge>;
      case 'puk_required':
        return <Badge variant="destructive">PUK potreban</Badge>;
      case 'error':
        return <Badge variant="destructive">Greška</Badge>;
      default:
        return <Badge variant="secondary">Nije ubačena</Badge>;
    }
  };

  const commonATCommands: GSMCommand[] = [
    { command: 'AT', description: 'Test osnovne komunikacije', expected_response: 'OK' },
    { command: 'AT+CGSN', description: 'Dobij IMEI broj', expected_response: 'IMEI broj' },
    { command: 'AT+CSQ', description: 'Proveri jačinu signala', expected_response: '+CSQ: xx,xx' },
    { command: 'AT+COPS?', description: 'Trenutni mrežni operator', expected_response: '+COPS: ...' },
    { command: 'AT+CPIN?', description: 'Status SIM kartice', expected_response: '+CPIN: READY' },
    { command: 'AT+CREG?', description: 'Registracija na mrežu', expected_response: '+CREG: ...' },
    { command: 'AT+CMGF=1', description: 'Postavi SMS text mod', expected_response: 'OK' },
    { command: 'AT+CMGS="+381641234567"', description: 'Pošalji SMS (test broj)', expected_response: '>' }
  ];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                GSM Modem Postavke
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-3/4"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">GSM Modem Postavke</h1>
            <p className="text-gray-600 mt-2">
              Konfiguracija GSM modema za SMS komunikaciju
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getSignalIcon()}
            {getConnectionStatusBadge()}
          </div>
        </div>

        {/* Connection progress */}
        {connectionProgress > 0 && connectionProgress < 100 && (
          <Alert className="mb-6">
            <Antenna className="h-4 w-4 animate-pulse" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Povezujem sa GSM modemom...</span>
                  <span>{connectionProgress}%</span>
                </div>
                <Progress value={connectionProgress} className="h-2" />
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="config" className="w-full">
          <TabsList>
            <TabsTrigger value="config">Osnovne postavke</TabsTrigger>
            <TabsTrigger value="status">Status i monitoring</TabsTrigger>
            <TabsTrigger value="at-commands">AT komande</TabsTrigger>
            <TabsTrigger value="statistics">Statistike</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Konfiguracija konekcije
                </CardTitle>
                <CardDescription>
                  Osnovne postavke za komunikaciju sa GSM modemom.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="port">Serijski port</Label>
                    <Input
                      id="port"
                      value={config.port}
                      onChange={(e) => setConfig(prev => ({ ...prev, port: e.target.value }))}
                      placeholder="/dev/ttyUSB0 ili COM1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="baudRate">Baud rate</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="pinCode">PIN kod (opcionalno)</Label>
                    <Input
                      id="pinCode"
                      type="password"
                      value={config.pinCode || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, pinCode: e.target.value }))}
                      placeholder="1234"
                      maxLength={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="heartbeat">Heartbeat interval (sekunde)</Label>
                    <Input
                      id="heartbeat"
                      type="number"
                      value={config.heartbeatInterval}
                      onChange={(e) => setConfig(prev => ({ ...prev, heartbeatInterval: parseInt(e.target.value) || 30 }))}
                      min="10"
                      max="300"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enabled"
                      checked={config.enabled}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                    />
                    <Label htmlFor="enabled">Omogući GSM modem</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autoReconnect"
                      checked={config.autoReconnect}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoReconnect: checked }))}
                    />
                    <Label htmlFor="autoReconnect">Automatsko ponovno povezivanje</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="h-5 w-5" />
                    Status konekcije
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    {getConnectionStatusBadge()}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Jačina signala:</span>
                    <div className="flex items-center gap-2">
                      {getSignalIcon()}
                      <span>{config.signalStrength}%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Mrežni operator:</span>
                    <span>{config.networkOperator || 'Nepoznat'}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>IMEI:</span>
                    <span className="text-sm font-mono">{config.imei || 'N/A'}</span>
                  </div>

                  {config.lastActivity && (
                    <div className="flex justify-between items-center">
                      <span>Poslednja aktivnost:</span>
                      <span className="text-sm">{new Date(config.lastActivity).toLocaleString('sr-RS')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    SIM kartica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    {getSIMStatusBadge()}
                  </div>

                  {config.balance !== undefined && (
                    <div className="flex justify-between items-center">
                      <span>Stanje:</span>
                      <span>{config.balance} RSD</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="font-medium">Mogućnosti:</span>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        {config.smsCapability ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        SMS
                      </div>
                      <div className="flex items-center gap-2">
                        {config.voiceCapability ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        Pozivi
                      </div>
                      <div className="flex items-center gap-2">
                        {config.dataCapability ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        Podaci
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {config.errorMessage && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Greška:</strong> {config.errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending}
                variant="outline"
              >
                <Wifi className="h-4 w-4 mr-2" />
                {testConnectionMutation.isPending ? 'Testiram...' : 'Testiraj konekciju'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="at-commands" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  AT komande
                </CardTitle>
                <CardDescription>
                  Direktno komuniciraj sa GSM modemom pomoću AT komandi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testCommand">AT komanda</Label>
                  <div className="flex gap-2">
                    <Input
                      id="testCommand"
                      value={testCommand}
                      onChange={(e) => setTestCommand(e.target.value)}
                      placeholder="AT"
                      className="font-mono"
                    />
                    <Button
                      onClick={handleSendATCommand}
                      disabled={isTestingCommand}
                    >
                      {isTestingCommand ? 'Slanje...' : 'Pošalji'}
                    </Button>
                  </div>
                </div>

                {commandResponse && (
                  <div className="space-y-2">
                    <Label>Odgovor:</Label>
                    <Textarea
                      value={commandResponse}
                      readOnly
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Česte AT komande:</Label>
                  <div className="grid gap-2">
                    {commonATCommands.map((cmd, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <code className="text-sm font-mono">{cmd.command}</code>
                          <p className="text-xs text-gray-500">{cmd.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTestCommand(cmd.command)}
                        >
                          Koristi
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            {gsmStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Poslani SMS-ovi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{gsmStats.totalSMSSent}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Primljeni SMS-ovi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{gsmStats.totalSMSReceived}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Neuspešni SMS-ovi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{gsmStats.failedSMS}</div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Statistike nisu dostupne. Omogućite GSM modem da biste videli statistike.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 mt-6">
          <Button
            onClick={handleTestConnection}
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
      </div>
    </AdminLayout>
  );
}