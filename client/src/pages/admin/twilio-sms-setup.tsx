import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Shield, Phone, Settings, CheckCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function TwilioSMSSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState({
    accountSid: "",
    authToken: "", 
    phoneNumber: ""
  });
  
  const [testPhone, setTestPhone] = useState("");

  // Fetch current Twilio status
  const { data: twilioStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/twilio/status"],
    retry: 1
  });

  // Configure Twilio
  const configureTwilioMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/twilio/configure", data);
    },
    onSuccess: () => {
      toast({
        title: "✅ Twilio konfigurisan",
        description: "Twilio SMS servis je uspešno konfigurisan",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/twilio/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška konfiguracije", 
        description: error?.message || "Neuspešna konfiguracija Twilio SMS-a",
        variant: "destructive",
      });
    },
  });

  // Test Twilio SMS
  const testTwilioSMSMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      return apiRequest("POST", "/api/twilio/send-test", { phoneNumber });
    },
    onSuccess: () => {
      toast({
        title: "📱 SMS poslat",
        description: `Test SMS je uspešno poslat na ${testPhone}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ SMS greška",
        description: error?.message || "Neuspešno slanje test SMS-a",
        variant: "destructive",
      });
    },
  });

  const handleConfigure = () => {
    if (!config.accountSid || !config.authToken || !config.phoneNumber) {
      toast({
        title: "Nedostaju podaci",
        description: "Sva polja su obavezna",
        variant: "destructive",
      });
      return;
    }
    configureTwilioMutation.mutate(config);
  };

  const handleTestSMS = () => {
    if (!testPhone) {
      toast({
        title: "Nedostaje broj",
        description: "Broj telefona je obavezan",
        variant: "destructive",
      });
      return;
    }
    testTwilioSMSMutation.mutate(testPhone);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Twilio SMS Konfiguracija</h1>
        <p className="text-muted-foreground mt-2">
          Konfiguriši pouzdani Twilio SMS servis za slanje obaveštenja klijentima
        </p>
      </div>

      <div className="space-y-6">
        {/* Status kartica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Twilio SMS Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="text-sm text-muted-foreground">Učitavam status...</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Konfigurisan:</Label>
                  <div className="mt-1">
                    {twilioStatus?.configured ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Da
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Settings className="h-3 w-3 mr-1" />
                        Ne
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Provider:</Label>
                  <div className="mt-1 text-sm">Twilio SMS API</div>
                </div>
                {twilioStatus?.phoneNumber && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Twilio broj:</Label>
                    <div className="mt-1 text-sm font-mono bg-muted p-2 rounded">
                      {twilioStatus.phoneNumber}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Konfiguracija */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Twilio Podaci za Pristup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="accountSid">Account SID</Label>
              <Input
                id="accountSid"
                type="text"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={config.accountSid}
                onChange={(e) => setConfig({...config, accountSid: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="authToken">Auth Token</Label>
              <Input
                id="authToken"
                type="password"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={config.authToken}
                onChange={(e) => setConfig({...config, authToken: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="phoneNumber">Twilio Phone Number</Label>
              <Input
                id="phoneNumber"
                type="text"
                placeholder="+1234567890"
                value={config.phoneNumber}
                onChange={(e) => setConfig({...config, phoneNumber: e.target.value})}
              />
            </div>

            <Button 
              onClick={handleConfigure}
              disabled={configureTwilioMutation.isPending}
              className="w-full"
            >
              {configureTwilioMutation.isPending ? "Konfigurišem..." : "Sačuvaj Twilio konfiguraciju"}
            </Button>
          </CardContent>
        </Card>

        {/* Test SMS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Test SMS Slanja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="testPhone">Test broj telefona</Label>
              <Input
                id="testPhone"
                type="text"
                placeholder="+38269123456"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={handleTestSMS}
              disabled={testTwilioSMSMutation.isPending || !twilioStatus?.configured}
              variant="outline"
              className="w-full"
            >
              {testTwilioSMSMutation.isPending ? "Šaljem..." : "Pošalji test SMS"}
            </Button>
          </CardContent>
        </Card>

        {/* Instrukcije */}
        <Card className="bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">📋 Kako dobiti Twilio podatke</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-blue-800">
              <div><strong>1.</strong> Idite na <a href="https://www.twilio.com" target="_blank" className="underline">twilio.com</a></div>
              <div><strong>2.</strong> Registrujte se ili prijavite</div>
              <div><strong>3.</strong> U konzoli pronađite "Account SID" i "Auth Token"</div>
              <div><strong>4.</strong> Kupite Twilio telefon broj ili koristite besplatni trial broj</div>
              <div><strong>5.</strong> Unesite podatke gore i testirajte</div>
            </div>
            
            <div className="mt-4 p-3 bg-green-100 rounded">
              <p className="text-sm text-green-800 font-medium">💡 Prednosti Twilio SMS-a:</p>
              <ul className="text-xs text-green-700 mt-1 list-disc list-inside space-y-1">
                <li>100% pouzdanost - radi sa cloud servisima</li>
                <li>Brže isporuke SMS poruka</li>
                <li>Profesionalan sender broj</li>
                <li>Bez potrebe za port forwarding ili router konfiguraciju</li>
                <li>Jednostavna integracija u 5 minuta</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}