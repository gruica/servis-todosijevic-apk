import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, Smartphone, Send, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessaggioTest } from "@/components/messaggio-test";

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
  const [testPhone, setTestPhone] = useState("");

  // Dohvati trenutne postavke
  const { data: settings, isLoading } = useQuery<SmsSettings>({
    queryKey: ["/api/admin/sms-settings"],
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.provider || !formData.apiKey) {
      toast({
        title: "Greška",
        description: "Provajder i API ključ su obavezni",
        variant: "destructive",
      });
      return;
    }

    configureMutation.mutate(formData);
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

      {/* Messaggio Test */}
      <MessaggioTest />

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
                    <SelectItem value="messaggio">Messaggio (Najbolje za CG)</SelectItem>
                    <SelectItem value="plivo">Plivo (Multinacional)</SelectItem>
                    <SelectItem value="budgetsms">BudgetSMS (Najjeftiniji)</SelectItem>
                    <SelectItem value="viber">Viber Business (Hibrid)</SelectItem>
                    <SelectItem value="twilio">Twilio (Postojeći)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              <Button 
                type="submit" 
                className="w-full"
                disabled={configureMutation.isPending}
              >
                {configureMutation.isPending ? "Konfigurišem..." : "Konfiguriši SMS"}
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
                  disabled={testMutation.isPending || !settings?.configured}
                >
                  {testMutation.isPending ? "Šaljem..." : "Pošalji test SMS"}
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