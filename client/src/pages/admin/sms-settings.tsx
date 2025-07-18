import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, Smartphone, Send, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SmsProvider {
  provider: string;
  description: string;
  price: string;
}

interface SmsSettings {
  configured: boolean;
  provider?: string;
  recommendations?: SmsProvider[];
}

export default function SmsSettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    provider: "",
    apiKey: "",
    authToken: "",
    senderId: "Frigo Sistem"
  });
  
  // GSM Modem specifični podaci
  const [gsmModemData, setGsmModemData] = useState({
    port: "",
    baudRate: 9600,
    phoneNumber: "+38267028666",
    fallbackToTwilio: true
  });
  const [testPhone, setTestPhone] = useState("");
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);

  // Dohvati trenutne postavke
  const { data: settings, isLoading } = useQuery<SmsSettings>({
    queryKey: ["/api/admin/sms-settings"],
  });

  // Dohvati dostupne portove za GSM modem
  const { data: portData } = useQuery<{ ports: string[] }>({
    queryKey: ["/api/gsm-modem/ports"],
    enabled: formData.provider === "gsm_modem",
  });

  // Dohvati status GSM modema
  const { data: gsmStatus } = useQuery<{ 
    configured: boolean; 
    provider: string; 
    phoneNumber: string; 
    connected: boolean; 
    availableProviders: string[];
    connectionTest: { gsm_modem: boolean; twilio: boolean };
  }>({
    queryKey: ["/api/gsm-modem/status"],
    enabled: formData.provider === "gsm_modem",
  });

  // Konfiguracija SMS-a
  const configureMutation = useMutation({
    mutationFn: async (config: typeof formData) => {
      const res = await apiRequest("POST", "/api/admin/sms-settings", config);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms-settings"] });
      toast({
        title: "SMS konfigurisan",
        description: data.message,
      });
      
      // Resetuj formu
      setFormData({
        provider: "",
        apiKey: "",
        authToken: "",
        senderId: "Frigo Sistem"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri konfiguraciji SMS-a",
        variant: "destructive",
      });
    },
  });

  // GSM Modem konfiguracija
  const gsmConfigureMutation = useMutation({
    mutationFn: async (config: typeof gsmModemData) => {
      const res = await apiRequest("POST", "/api/gsm-modem/configure", {
        provider: "gsm_modem",
        ...config
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gsm-modem/status"] });
      toast({
        title: "GSM modem konfigurisan",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri konfiguraciji GSM modema",
        variant: "destructive",
      });
    },
  });

  // Test SMS
  const testMutation = useMutation({
    mutationFn: async (recipient: string) => {
      const res = await apiRequest("POST", "/api/admin/test-sms", { recipient });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test SMS poslat",
        description: `SMS uspešno poslat preko ${data.provider} provajdera`,
      });
      setTestPhone("");
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri slanju test SMS-a",
        variant: "destructive",
      });
    },
  });

  // GSM Modem test
  const gsmTestMutation = useMutation({
    mutationFn: async (recipient: string) => {
      const res = await apiRequest("POST", "/api/gsm-modem/test", { recipient });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test uspešan",
        description: `GSM modem test SMS uspešno poslat (${data.provider})`,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.provider === "gsm_modem") {
      if (!gsmModemData.port || !gsmModemData.phoneNumber) {
        toast({
          title: "Greška",
          description: "Port i broj telefona su obavezni za GSM modem",
          variant: "destructive",
        });
        return;
      }
      gsmConfigureMutation.mutate(gsmModemData);
    } else {
      if (!formData.provider || !formData.apiKey) {
        toast({
          title: "Greška",
          description: "Provajder i API ključ su obavezni",
          variant: "destructive",
        });
        return;
      }
      configureMutation.mutate(formData);
    }
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

    // Testiranje na osnovu trenutnog provajdera
    if (formData.provider === "gsm_modem" || settings?.provider === "gsm_modem") {
      gsmTestMutation.mutate(testPhone);
    } else {
      testMutation.mutate(testPhone);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">SMS Notifikacije</h1>
          <p className="text-gray-600">Konfiguracija SMS provajdera za obaveštavanje klijenata</p>
        </div>
      </div>

      {/* Status konfiguracije */}
      {settings?.configured ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            SMS servis je konfigurisan sa provajderom: <strong>{settings.provider}</strong>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            SMS servis nije konfigurisan. Odaberite provajder ispod.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Konfiguracija */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Konfiguracija SMS provajdera</span>
            </CardTitle>
            <CardDescription>
              Konfiguriši SMS API za slanje obaveštenja klijentima
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="provider">SMS Provajder</Label>
                <Select 
                  value={formData.provider} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberite provajder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gsm_modem">GSM Modem (SIM kartica)</SelectItem>
                    <SelectItem value="messaggio">Messaggio (Najbolje za CG)</SelectItem>
                    <SelectItem value="plivo">Plivo (Multinacional)</SelectItem>
                    <SelectItem value="budgetsms">BudgetSMS (Najjeftiniji)</SelectItem>
                    <SelectItem value="viber">Viber Business (Hibrid)</SelectItem>
                    <SelectItem value="twilio">Twilio (Postojeći)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* GSM Modem konfiguracija */}
              {formData.provider === "gsm_modem" && (
                <>
                  <div>
                    <Label htmlFor="gsmPort">COM Port</Label>
                    <Select 
                      value={gsmModemData.port} 
                      onValueChange={(value) => setGsmModemData(prev => ({ ...prev, port: value }))}
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
                  </div>

                  <div>
                    <Label htmlFor="gsmBaudRate">Baud Rate</Label>
                    <Select 
                      value={gsmModemData.baudRate.toString()} 
                      onValueChange={(value) => setGsmModemData(prev => ({ ...prev, baudRate: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1200">1200</SelectItem>
                        <SelectItem value="2400">2400</SelectItem>
                        <SelectItem value="4800">4800</SelectItem>
                        <SelectItem value="9600">9600</SelectItem>
                        <SelectItem value="19200">19200</SelectItem>
                        <SelectItem value="38400">38400</SelectItem>
                        <SelectItem value="57600">57600</SelectItem>
                        <SelectItem value="115200">115200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="gsmPhoneNumber">Broj SIM kartice</Label>
                    <Input
                      id="gsmPhoneNumber"
                      value={gsmModemData.phoneNumber}
                      onChange={(e) => setGsmModemData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="+38267028666"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fallbackToTwilio"
                      checked={gsmModemData.fallbackToTwilio}
                      onCheckedChange={(checked) => setGsmModemData(prev => ({ ...prev, fallbackToTwilio: checked }))}
                    />
                    <Label htmlFor="fallbackToTwilio">Koristi Twilio kao rezervu</Label>
                  </div>

                  {gsmStatus && (
                    <div className="text-sm text-gray-600">
                      <div>Status: {gsmStatus.connected ? "Povezan" : "Nije povezan"}</div>
                      <div>Broj: {gsmStatus.phoneNumber}</div>
                    </div>
                  )}
                </>
              )}

              {/* Standardni provajderi */}
              {formData.provider !== "gsm_modem" && (
                <>
                  <div>
                    <Label htmlFor="apiKey">API Ključ</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Unesite API ključ"
                    />
                  </div>
                  <div>
                    <Label htmlFor="authToken">Auth Token (opciono)</Label>
                    <Input
                      id="authToken"
                      type="password"
                      value={formData.authToken}
                      onChange={(e) => setFormData(prev => ({ ...prev, authToken: e.target.value }))}
                      placeholder="Za provajdere koji zahtevaju"
                    />
                  </div>

                  <div>
                    <Label htmlFor="senderId">ID pošiljaoca</Label>
                    <Input
                      id="senderId"
                      value={formData.senderId}
                      onChange={(e) => setFormData(prev => ({ ...prev, senderId: e.target.value }))}
                      placeholder="Frigo Sistem"
                      maxLength={11}
                    />
                  </div>
                </>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={configureMutation.isPending || gsmConfigureMutation.isPending}
              >
                {configureMutation.isPending || gsmConfigureMutation.isPending ? "Konfigurišem..." : "Konfiguriši SMS"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test i preporuke */}
        <div className="space-y-6">
          {/* Test SMS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="h-5 w-5" />
                <span>Test SMS</span>
              </CardTitle>
              <CardDescription>
                Pošaljite test poruku da proverite konfiguraciju
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTestSms} className="space-y-4">
                <div>
                  <Label htmlFor="testPhone">Broj telefona</Label>
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
                  disabled={testMutation.isPending || gsmTestMutation.isPending || !settings?.configured}
                >
                  {testMutation.isPending || gsmTestMutation.isPending ? "Šaljem..." : "Pošalji test SMS"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preporuke provajdera */}
          {settings?.recommendations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-5 w-5" />
                  <span>Preporučeni provajderi</span>
                </CardTitle>
                <CardDescription>
                  SMS provajderi optimizovani za Crnu Goru
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {settings.recommendations.map((provider, index) => (
                    <div key={index} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium capitalize">{provider.provider}</h4>
                        <span className="text-sm text-green-600 font-medium">{provider.price}</span>
                      </div>
                      <p className="text-sm text-gray-600">{provider.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informacije o SMS notifikacijama */}
          <Card>
            <CardHeader>
              <CardTitle>Kada se šalju SMS-ovi?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-gray-600">
                <li>• Kada je servis dodeljen serviseru</li>
                <li>• Kada je zakazan termin</li>
                <li>• Kada je servis u toku</li>
                <li>• Kada je servis završen</li>
                <li>• Podsetnici za održavanje</li>
                <li>• Manualni SMS-ovi iz admin panela</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}