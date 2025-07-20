import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Smartphone, 
  Signal, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Router,
  Zap
} from 'lucide-react';

interface GSMModemConfig {
  portPath: string;
  baudRate: number;
  pin?: string;
  maxRetries: number;
  timeout: number;
}

interface GSMModemStatus {
  isConnected: boolean;
  isConfigured: boolean;
  signalStrength?: number;
  networkOperator?: string;
  simStatus?: string;
  lastError?: string;
  lastSentAt?: Date;
}

interface HybridSMSConfig {
  primaryProvider: 'gsm' | 'twilio';
  enableFallback: boolean;
  fallbackDelay: number;
  maxRetries: number;
}

interface HybridSMSStatus {
  primaryProvider: 'gsm' | 'twilio';
  gsmStatus: GSMModemStatus;
  twilioStatus: boolean;
  lastProvider?: 'gsm' | 'twilio';
  totalSent: number;
  successRate: number;
  lastError?: string;
}

export default function GSMConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [gsmConfig, setGsmConfig] = useState<GSMModemConfig>({
    portPath: '/dev/ttyUSB0',
    baudRate: 9600,
    pin: '',
    maxRetries: 3,
    timeout: 30000
  });

  const [hybridConfig, setHybridConfig] = useState<HybridSMSConfig>({
    primaryProvider: 'gsm',
    enableFallback: true,
    fallbackDelay: 5000,
    maxRetries: 2
  });

  // Fetch GSM status
  const { data: gsmStatus, refetch: refetchGSMStatus } = useQuery({
    queryKey: ['/api/admin/gsm/status'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Fetch hybrid SMS status
  const { data: hybridStatus, refetch: refetchHybridStatus } = useQuery({
    queryKey: ['/api/admin/sms/hybrid/status'],
    refetchInterval: 5000
  });

  // Test GSM connection mutation
  const testGSMMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/gsm/test', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ GSM Test Uspešan",
        description: "GSM modem je uspešno testiran"
      });
      refetchGSMStatus();
    },
    onError: (error: any) => {
      toast({
        title: "❌ GSM Test Neuspešan",
        description: error.message || "Greška pri testiranju GSM modema",
        variant: "destructive"
      });
    }
  });

  // Save GSM config mutation
  const saveGSMConfigMutation = useMutation({
    mutationFn: async (config: GSMModemConfig) => {
      return apiRequest('/api/admin/gsm/config', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Konfiguracija Sačuvana",
        description: "GSM modem konfiguracija je uspešno sačuvana"
      });
      refetchGSMStatus();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška",
        description: error.message || "Greška pri čuvanju konfiguracije",
        variant: "destructive"
      });
    }
  });

  // Save hybrid SMS config mutation
  const saveHybridConfigMutation = useMutation({
    mutationFn: async (config: HybridSMSConfig) => {
      return apiRequest('/api/admin/sms/hybrid/config', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Hibridna Konfiguracija Sačuvana",
        description: "SMS hibridni sistem je uspešno konfigurisan"
      });
      refetchHybridStatus();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška",
        description: error.message || "Greška pri čuvanju hibridne konfiguracije",
        variant: "destructive"
      });
    }
  });

  // Send test SMS mutation
  const testSMSMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; message: string }) => {
      return apiRequest('/api/admin/sms/test', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "✅ Test SMS Uspešan",
        description: `SMS poslat preko ${data.provider}`
      });
      refetchHybridStatus();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Test SMS Neuspešan",
        description: error.message || "Greška pri slanju test SMS-a",
        variant: "destructive"
      });
    }
  });

  const handleSaveGSMConfig = () => {
    saveGSMConfigMutation.mutate(gsmConfig);
  };

  const handleSaveHybridConfig = () => {
    saveHybridConfigMutation.mutate(hybridConfig);
  };

  const handleTestGSM = () => {
    testGSMMutation.mutate();
  };

  const handleTestSMS = () => {
    const phoneNumber = prompt('Unesite broj telefona za test:');
    if (phoneNumber) {
      testSMSMutation.mutate({
        phoneNumber,
        message: 'Test SMS sa fizičke SIM kartice - Montenegro servisi'
      });
    }
  };

  const getStatusColor = (isConnected: boolean) => {
    return isConnected ? 'text-green-600' : 'text-red-600';
  };

  const getSignalBars = (strength?: number) => {
    if (!strength) return 0;
    if (strength >= 20) return 4;
    if (strength >= 15) return 3;
    if (strength >= 10) return 2;
    if (strength >= 5) return 1;
    return 0;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GSM Modem Konfiguracija</h1>
          <p className="text-muted-foreground">
            Upravljanje fizičkom SIM karticom za slanje SMS poruka
          </p>
        </div>
        <Button onClick={handleTestSMS} disabled={testSMSMutation.isPending}>
          <Smartphone className="w-4 h-4 mr-2" />
          Test SMS
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GSM Modem Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Router className="w-5 h-5" />
              GSM Modem Status
            </CardTitle>
            <CardDescription>
              Trenutno stanje GSM modem konekcije
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Konekcija:</span>
              <Badge variant={gsmStatus?.isConnected ? "default" : "destructive"}>
                {gsmStatus?.isConnected ? (
                  <><CheckCircle className="w-3 h-3 mr-1" />Povezan</>
                ) : (
                  <><XCircle className="w-3 h-3 mr-1" />Odspojen</>
                )}
              </Badge>
            </div>

            {gsmStatus?.signalStrength && (
              <div className="flex justify-between items-center">
                <span>Signal:</span>
                <div className="flex items-center gap-2">
                  <Signal className="w-4 h-4" />
                  <span>{gsmStatus.signalStrength}/31</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-3 rounded-sm ${
                          i < getSignalBars(gsmStatus.signalStrength) 
                            ? 'bg-green-500' 
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {gsmStatus?.networkOperator && (
              <div className="flex justify-between items-center">
                <span>Operator:</span>
                <Badge variant="outline">{gsmStatus.networkOperator}</Badge>
              </div>
            )}

            {gsmStatus?.simStatus && (
              <div className="flex justify-between items-center">
                <span>SIM Status:</span>
                <Badge variant={gsmStatus.simStatus === 'READY' ? "default" : "secondary"}>
                  {gsmStatus.simStatus}
                </Badge>
              </div>
            )}

            {gsmStatus?.lastError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{gsmStatus.lastError}</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleTestGSM} 
              disabled={testGSMMutation.isPending}
              className="w-full"
            >
              {testGSMMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Test Konekciju
            </Button>
          </CardContent>
        </Card>

        {/* Hybrid SMS Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Hibridni SMS Status
            </CardTitle>
            <CardDescription>
              Kombinacija GSM modema i Twilio fallback sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Primarni provajder:</span>
              <Badge variant="default">
                {hybridStatus?.primaryProvider?.toUpperCase() || 'TWILIO'}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span>Ukupno poslato:</span>
              <span className="font-mono">{hybridStatus?.totalSent || 0}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Uspešnost:</span>
              <span className="font-mono">
                {hybridStatus?.successRate?.toFixed(1) || 0}%
              </span>
            </div>

            {hybridStatus?.lastProvider && (
              <div className="flex justify-between items-center">
                <span>Poslednji korišćen:</span>
                <Badge variant="outline">
                  {hybridStatus.lastProvider.toUpperCase()}
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>GSM:</span>
                <Badge variant={hybridStatus?.gsmStatus?.isConnected ? "default" : "secondary"}>
                  {hybridStatus?.gsmStatus?.isConnected ? 'Aktivno' : 'Neaktivno'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Twilio:</span>
                <Badge variant={hybridStatus?.twilioStatus ? "default" : "secondary"}>
                  {hybridStatus?.twilioStatus ? 'Aktivno' : 'Neaktivno'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GSM Modem Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>GSM Modem Konfiguracija</CardTitle>
          <CardDescription>
            Postavke za komunikaciju sa fizičkom SIM karticom
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="portPath">Port putanja</Label>
              <Input
                id="portPath"
                value={gsmConfig.portPath}
                onChange={(e) => setGsmConfig({...gsmConfig, portPath: e.target.value})}
                placeholder="/dev/ttyUSB0 ili COM3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baudRate">Baud Rate</Label>
              <Select
                value={gsmConfig.baudRate.toString()}
                onValueChange={(value) => setGsmConfig({...gsmConfig, baudRate: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9600">9600</SelectItem>
                  <SelectItem value="115200">115200</SelectItem>
                  <SelectItem value="57600">57600</SelectItem>
                  <SelectItem value="38400">38400</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">PIN kod SIM kartice</Label>
              <Input
                id="pin"
                type="password"
                value={gsmConfig.pin}
                onChange={(e) => setGsmConfig({...gsmConfig, pin: e.target.value})}
                placeholder="Opcionalno"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={gsmConfig.timeout}
                onChange={(e) => setGsmConfig({...gsmConfig, timeout: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <Button 
            onClick={handleSaveGSMConfig} 
            disabled={saveGSMConfigMutation.isPending}
          >
            {saveGSMConfigMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Settings className="w-4 h-4 mr-2" />
            )}
            Sačuvaj GSM Konfiguraciju
          </Button>
        </CardContent>
      </Card>

      {/* Hybrid SMS Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Hibridni SMS Sistem</CardTitle>
          <CardDescription>
            Kombinuje GSM modem sa Twilio fallback sistemom
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryProvider">Primarni provajder</Label>
              <Select
                value={hybridConfig.primaryProvider}
                onValueChange={(value: 'gsm' | 'twilio') => 
                  setHybridConfig({...hybridConfig, primaryProvider: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gsm">GSM Modem (Fizička SIM)</SelectItem>
                  <SelectItem value="twilio">Twilio API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fallbackDelay">Fallback kašnjenje (ms)</Label>
              <Input
                id="fallbackDelay"
                type="number"
                value={hybridConfig.fallbackDelay}
                onChange={(e) => setHybridConfig({
                  ...hybridConfig, 
                  fallbackDelay: parseInt(e.target.value)
                })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enableFallback"
                checked={hybridConfig.enableFallback}
                onCheckedChange={(checked) => 
                  setHybridConfig({...hybridConfig, enableFallback: checked})}
              />
              <Label htmlFor="enableFallback">Omogući fallback sistem</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRetries">Maksimalno pokušaja</Label>
              <Input
                id="maxRetries"
                type="number"
                value={hybridConfig.maxRetries}
                onChange={(e) => setHybridConfig({
                  ...hybridConfig, 
                  maxRetries: parseInt(e.target.value)
                })}
              />
            </div>
          </div>

          <Button 
            onClick={handleSaveHybridConfig} 
            disabled={saveHybridConfigMutation.isPending}
          >
            {saveHybridConfigMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Settings className="w-4 h-4 mr-2" />
            )}
            Sačuvaj Hibridnu Konfiguraciju
          </Button>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instrukcije za korišćenje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Linux:</strong> Koristite /dev/ttyUSB0, /dev/ttyUSB1, ili /dev/ttyACM0</p>
          <p><strong>Windows:</strong> Koristite COM3, COM4, ili drugi dostupan COM port</p>
          <p><strong>PIN kod:</strong> Unesite samo ako SIM kartica zahteva PIN</p>
          <p><strong>Hibridni sistem:</strong> Automatski prebacuje na fallback ako primarni ne radi</p>
          <p><strong>Fallback kašnjenje:</strong> Vreme čekanja pre prebacivanja na drugi provajder</p>
        </CardContent>
      </Card>
    </div>
  );
}