import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle, XCircle, Phone, Smartphone, Router, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TelekomSmsTestProps {
  className?: string;
}

export function TelekomSmsTest({ className }: TelekomSmsTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [gsmTestPhone, setGsmTestPhone] = useState('+38267051141');
  const [isGsmTesting, setIsGsmTesting] = useState(false);
  const [gsmTestResult, setGsmTestResult] = useState<any>(null);
  const [infobipTestPhone, setInfobipTestPhone] = useState('+38267051141');
  const [isInfobipTesting, setIsInfobipTesting] = useState(false);
  const [infobipTestResult, setInfobipTestResult] = useState<any>(null);
  const { toast } = useToast();

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const response = await apiRequest("GET", "/api/telekom/test");
      const data = await response.json();
      
      setTestResult(data);
      
      if (data.success && data.connection) {
        toast({
          title: "Konekcija uspešna",
          description: "Telekom SMS servis je uspešno konfigurisan i radi sa vašim brojem 067051141.",
        });
      } else {
        toast({
          title: "Konekcija neuspešna",
          description: "Nema konekcije sa Telekom SMS servisom.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Greška pri testiranju Telekom SMS:", error);
      
      let errorMessage = "Neuspešno testiranje Telekom SMS servisa.";
      if (error.response?.status === 403) {
        errorMessage = "Nemate dozvolu - proverite GSM modem ili API kredencijale.";
      } else if (error.response?.status === 401) {
        errorMessage = "Neautorizovan pristup - proverite Telekom API ključ.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setTestResult({
        success: false,
        error: errorMessage,
        details: error.response?.data
      });
      
      toast({
        title: "Greška",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testGsmModem = async () => {
    setIsGsmTesting(true);
    setGsmTestResult(null);
    
    try {
      const response = await apiRequest("POST", "/api/gsm/test", {
        recipient: gsmTestPhone
      });
      const data = await response.json();
      
      setGsmTestResult(data);
      
      if (data.success) {
        toast({
          title: "GSM test uspešan",
          description: `SMS uspešno poslat preko ${data.method} na ${gsmTestPhone}`,
        });
      } else {
        toast({
          title: "GSM test neuspešan",
          description: data.error || "Neuspešno slanje test SMS-a",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Greška pri testiranju GSM modem:", error);
      
      let errorMessage = "Neuspešno testiranje GSM modem-a.";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setGsmTestResult({
        success: false,
        error: errorMessage,
        details: error.response?.data
      });
      
      toast({
        title: "Greška",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGsmTesting(false);
    }
  };

  const testInfobipSms = async () => {
    setIsInfobipTesting(true);
    setInfobipTestResult(null);
    
    try {
      const response = await apiRequest("POST", "/api/new-sms/test", {
        recipient: infobipTestPhone
      });
      const data = await response.json();
      
      setInfobipTestResult(data);
      
      if (data.success) {
        toast({
          title: "Infobip test uspešan",
          description: `SMS uspešno poslat preko Infobip-a na ${infobipTestPhone}`,
        });
      } else {
        toast({
          title: "Infobip test neuspešan",
          description: data.error || "Neuspešno slanje test SMS-a preko Infobip-a",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Greška pri testiranju Infobip:", error);
      
      let errorMessage = "Neuspešno testiranje Infobip SMS-a.";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setInfobipTestResult({
        success: false,
        error: errorMessage,
        details: error.response?.data
      });
      
      toast({
        title: "Greška",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsInfobipTesting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Telekom SMS Test
        </CardTitle>
        <CardDescription>
          Testiraj direktno slanje SMS-a sa vašeg broja 067051141
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Vaš broj:</strong> +382 67 051 141 (Telekom Crne Gore)
          </p>
          <p className="text-xs text-blue-600 mt-1">
            SMS poruke će biti poslane direktno sa vašeg broja
          </p>
        </div>

        <Button 
          onClick={testConnection} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testiranje...
            </>
          ) : (
            <>
              <Smartphone className="mr-2 h-4 w-4" />
              Testiraj Telekom SMS
            </>
          )}
        </Button>

        {testResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {testResult.success && testResult.connection ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Konekcija uspešna
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" />
                  Konekcija neuspešna
                </Badge>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <div className="space-y-1">
                <p><strong>Servis:</strong> {testResult.service || 'Telekom SMS'}</p>
                <p><strong>Broj pošaljaoca:</strong> {testResult.senderNumber || '+38267051141'}</p>
                <p><strong>Status:</strong> {testResult.message || 'Nepoznat'}</p>
                
                {testResult.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 font-medium">Greška:</p>
                    <p className="text-red-700 text-xs">{testResult.error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* GSM Modem Test */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Router className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">GSM Modem Test</span>
          </div>
          
          <div>
            <Label htmlFor="gsmTestPhone">Test SMS na broj:</Label>
            <Input
              id="gsmTestPhone"
              type="tel"
              value={gsmTestPhone}
              onChange={(e) => setGsmTestPhone(e.target.value)}
              placeholder="+38267051141"
              className="mt-1"
            />
          </div>

          <Button 
            onClick={testGsmModem}
            disabled={isGsmTesting || !gsmTestPhone}
            variant="outline"
            className="w-full"
          >
            {isGsmTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Šalje test SMS...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Pošalji test SMS
              </>
            )}
          </Button>

          {gsmTestResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {gsmTestResult.success ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    SMS poslat
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    SMS neuspešan
                  </Badge>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="space-y-1">
                  <p><strong>Metoda:</strong> {gsmTestResult.method || 'Nepoznato'}</p>
                  {gsmTestResult.messageId && (
                    <p><strong>ID poruke:</strong> {gsmTestResult.messageId}</p>
                  )}
                  
                  {gsmTestResult.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-800 font-medium">Greška:</p>
                      <p className="text-red-700 text-xs">{gsmTestResult.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Infobip SMS Test */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-sm">Infobip SMS Test</span>
          </div>
          
          <div>
            <Label htmlFor="infobipTestPhone">Test SMS na broj:</Label>
            <Input
              id="infobipTestPhone"
              type="tel"
              value={infobipTestPhone}
              onChange={(e) => setInfobipTestPhone(e.target.value)}
              placeholder="+38267051141"
              className="mt-1"
            />
          </div>

          <Button 
            onClick={testInfobipSms}
            disabled={isInfobipTesting || !infobipTestPhone}
            variant="outline"
            className="w-full"
          >
            {isInfobipTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Šalje preko Infobip-a...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Pošalji preko Infobip-a
              </>
            )}
          </Button>

          {infobipTestResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {infobipTestResult.success ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Infobip SMS poslat
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    Infobip SMS neuspešan
                  </Badge>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="space-y-1">
                  <p><strong>Platforma:</strong> {infobipTestResult.method || 'Infobip'}</p>
                  {infobipTestResult.messageId && (
                    <p><strong>Message ID:</strong> {infobipTestResult.messageId}</p>
                  )}
                  {infobipTestResult.cost && (
                    <p><strong>Cena:</strong> {infobipTestResult.cost}</p>
                  )}
                  
                  {infobipTestResult.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-800 font-medium">Greška:</p>
                      <p className="text-red-700 text-xs">{infobipTestResult.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 mt-4">
          <p>Metode slanja SMS-a (u redosledu):</p>
          <ul className="list-disc list-inside mt-1">
            <li>Telekom Crne Gore API</li>
            <li>GSM modem (ako je povezan)</li>
            <li><strong>Infobip SMS platforma</strong></li>
            <li>Fallback na Messaggio</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}