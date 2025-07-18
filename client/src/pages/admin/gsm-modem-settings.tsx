import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, Smartphone, Send, CheckCircle, AlertCircle, Wifi, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function GSMModemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // GSM Modem konfiguracija
  const [gsmConfig, setGsmConfig] = useState({
    port: "",
    baudRate: 9600,
    phoneNumber: "+38267028666",
    fallbackToTwilio: false,
    connectionType: 'usb' as 'usb' | 'wifi',
    wifiHost: '',
    wifiPort: 8080
  });
  
  const [testPhone, setTestPhone] = useState("");

  // Dohvati dostupne portove
  const { data: portData } = useQuery<{ ports: string[] }>({
    queryKey: ["/api/gsm-modem/ports"],
    retry: 1,
    retryDelay: 1000,
    staleTime: 60000, // Podaci su validni 1 minut
  });

  // Dohvati status GSM modema
  const { data: gsmStatus, refetch: refetchStatus } = useQuery<{ 
    configured: boolean; 
    provider: string; 
    phoneNumber: string; 
    connected: boolean; 
    availableProviders: string[];
    connectionTest: { gsm_modem: boolean; twilio: boolean };
  }>({
    queryKey: ["/api/gsm-modem/status"],
    refetchInterval: 10000, // Refetch svakih 10 sekundi
    retry: 1, // Pokušaj samo jednom u slučaju greške
    retryDelay: 1000, // Čekaj 1 sekund između pokušaja
  });

  // Konfiguracija GSM modema
  const configureMutation = useMutation({
    mutationFn: async (config: typeof gsmConfig) => {
      const res = await apiRequest("POST", "/api/gsm-modem/configure", config);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "GSM modem konfigurisan",
        description: "GSM modem je uspešno konfigurisan i spreman za korišćenje",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gsm-modem/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri konfiguraciji GSM modema",
        variant: "destructive",
      });
    },
  });

  // Test GSM modema
  const testMutation = useMutation({
    mutationFn: async (recipient: string) => {
      const res = await apiRequest("POST", "/api/gsm-modem/test", { recipient });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test uspešan",
        description: `GSM modem test SMS uspešno poslat na ${testPhone}`,
      });
      setTestPhone("");
    },
    onError: (error: any) => {
      toast({
        title: "Test neuspešan",
        description: error.message || "Greška pri testiranju GSM modema",
        variant: "destructive",
      });
    },
  });

  // Restartuj GSM modem
  const restartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/gsm-modem/restart", {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "GSM modem restartovan",
        description: "GSM modem je uspešno restartovan",
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri restartovanju GSM modema",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gsmConfig.port || !gsmConfig.phoneNumber) {
      toast({
        title: "Greška",
        description: "COM port i broj telefona su obavezni",
        variant: "destructive",
      });
      return;
    }
    
    configureMutation.mutate(gsmConfig);
  };

  const handleTestSms = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testPhone) {
      toast({
        title: "Greška",
        description: "Unesite broj telefona za test",
        variant: "destructive",
      });
      return;
    }

    testMutation.mutate(testPhone);
  };

  return (
    <div className="p-4 md:p-6 space-y-6"
         style={{ 
           width: '100%',
           maxWidth: '1200px',
           margin: '0 auto',
           paddingBottom: '2rem'
         }}>
      <div className="flex items-center space-x-2">
        <Smartphone className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">GSM Modem SMS</h1>
          <p className="text-gray-600">Konfiguracija GSM modema za slanje SMS poruka preko SIM kartice 067028666</p>
        </div>
      </div>

      {/* Status GSM modema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="h-5 w-5" />
            <span>Status GSM Modema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${gsmStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-medium">
                  {gsmStatus?.connected ? 'Povezan' : 'Nije povezan'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Konekcija sa GSM modemom</p>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span className="font-medium">{gsmStatus?.phoneNumber || 'Nije konfigurisan'}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">SIM kartica broj</p>
            </div>
          </div>
          
          {gsmStatus?.connected && (
            <div className="mt-4">
              <Button 
                onClick={() => restartMutation.mutate()} 
                disabled={restartMutation.isPending}
                variant="outline"
                size="sm"
              >
                {restartMutation.isPending ? "Restartovanje..." : "Restartuj konekciju"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Konfiguracija GSM modema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Konfiguracija GSM Modema</span>
            </CardTitle>
            <CardDescription>
              Konfiguriši GSM modem za slanje SMS poruka preko fizičke SIM kartice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tip konekcije */}
              <div>
                <Label htmlFor="connectionType">Tip konekcije</Label>
                <Select 
                  value={gsmConfig.connectionType} 
                  onValueChange={(value) => setGsmConfig(prev => ({ ...prev, connectionType: value as 'usb' | 'wifi' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberite tip konekcije" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usb">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="h-4 w-4" />
                        <span>USB kabl</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="wifi">
                      <div className="flex items-center space-x-2">
                        <Wifi className="h-4 w-4" />
                        <span>WiFi mreža</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 mt-1">
                  Odaberite kako se povezati sa GSM modemom
                </p>
              </div>

              {gsmConfig.connectionType === 'usb' && (
                <>
                  <div>
                    <Label htmlFor="gsmPort">COM Port</Label>
                <Select 
                  value={gsmConfig.port} 
                  onValueChange={(value) => setGsmConfig(prev => ({ ...prev, port: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberite COM port" />
                  </SelectTrigger>
                  <SelectContent>
                    {(portData?.ports || []).map(port => (
                      <SelectItem key={port} value={port}>{port}</SelectItem>
                    ))}
                    <SelectItem value="COM1">COM1</SelectItem>
                    <SelectItem value="COM2">COM2</SelectItem>
                    <SelectItem value="COM3">COM3</SelectItem>
                    <SelectItem value="COM4">COM4</SelectItem>
                    <SelectItem value="COM5">COM5</SelectItem>
                    <SelectItem value="COM6">COM6</SelectItem>
                    <SelectItem value="COM7">COM7</SelectItem>
                    <SelectItem value="COM8">COM8</SelectItem>
                  </SelectContent>
                </Select>
                    <p className="text-sm text-gray-600 mt-1">
                      Odaberite COM port na kojem je povezan GSM modem
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="gsmBaudRate">Baud Rate</Label>
                <Select 
                  value={gsmConfig.baudRate.toString()} 
                  onValueChange={(value) => setGsmConfig(prev => ({ ...prev, baudRate: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1200">1200</SelectItem>
                    <SelectItem value="2400">2400</SelectItem>
                    <SelectItem value="4800">4800</SelectItem>
                    <SelectItem value="9600">9600 (Preporučeno)</SelectItem>
                    <SelectItem value="19200">19200</SelectItem>
                    <SelectItem value="38400">38400</SelectItem>
                    <SelectItem value="57600">57600</SelectItem>
                    <SelectItem value="115200">115200</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </>
              )}

              {gsmConfig.connectionType === 'wifi' && (
                <>
                  <div>
                    <Label htmlFor="wifiHost">IP adresa GSM modema</Label>
                    <Input
                      id="wifiHost"
                      value={gsmConfig.wifiHost}
                      onChange={(e) => setGsmConfig(prev => ({ ...prev, wifiHost: e.target.value }))}
                      placeholder="192.168.1.100"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      IP adresa GSM modema u lokalnoj WiFi mreži
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="wifiPort">Port</Label>
                    <Input
                      id="wifiPort"
                      type="number"
                      value={gsmConfig.wifiPort}
                      onChange={(e) => setGsmConfig(prev => ({ ...prev, wifiPort: parseInt(e.target.value) || 8080 }))}
                      placeholder="8080"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      TCP/IP port za komunikaciju sa GSM modemom
                    </p>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="gsmPhoneNumber">Broj SIM kartice</Label>
                <Input
                  id="gsmPhoneNumber"
                  value={gsmConfig.phoneNumber}
                  onChange={(e) => setGsmConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+38267028666"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Broj SIM kartice u GSM modemu (067028666)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fallbackToTwilio"
                  checked={gsmConfig.fallbackToTwilio}
                  onCheckedChange={(checked) => setGsmConfig(prev => ({ ...prev, fallbackToTwilio: !!checked }))}
                />
                <Label htmlFor="fallbackToTwilio">Koristi Twilio kao rezervu</Label>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={configureMutation.isPending}
              >
                {configureMutation.isPending ? "Konfigurišem..." : "Konfiguriši GSM Modem"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test SMS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Test SMS</span>
            </CardTitle>
            <CardDescription>
              Pošaljite test SMS poruku da proverite da li GSM modem radi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTestSms} className="space-y-4">
              <div>
                <Label htmlFor="testPhone">Broj telefona za test</Label>
                <Input
                  id="testPhone"
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+38269123456"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={testMutation.isPending || !gsmStatus?.connected}
              >
                {testMutation.isPending ? "Šaljem test SMS..." : "Pošalji test SMS"}
              </Button>
            </form>
            
            {!gsmStatus?.connected && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  GSM modem nije povezan. Konfiguriši ga prvo.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instrukcije za korišćenje */}
      <Card>
        <CardHeader>
          <CardTitle>Instrukcije za korišćenje GSM modema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm">1. Priprema GSM modema</h4>
              <p className="text-sm text-gray-600">
                Ubacite SIM karticu (067028666) u GSM modem i povežite ga sa računarom preko USB kabla.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm">2. Konfiguracija</h4>
              <p className="text-sm text-gray-600">
                Odaberite COM port na kojem se nalazi GSM modem (obično COM3 ili COM4).
                Unesite broj SIM kartice i sačuvajte konfiguraciju.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm">3. Test</h4>
              <p className="text-sm text-gray-600">
                Pošaljite test SMS da proverite da li sve radi kako treba.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm">4. Automatsko slanje</h4>
              <p className="text-sm text-gray-600">
                Kada je GSM modem konfigurisan, sistem će automatski slati SMS poruke klijentima 
                o statusu servisa preko fizičke SIM kartice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}