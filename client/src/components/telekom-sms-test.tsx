import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Phone, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TelekomSmsTestProps {
  className?: string;
}

export function TelekomSmsTest({ className }: TelekomSmsTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
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

            <div className="text-xs text-gray-500">
              <p>Metode slanja SMS-a (u redosledu):</p>
              <ul className="list-disc list-inside mt-1">
                <li>Telekom Crne Gore API</li>
                <li>GSM modem (ako je povezan)</li>
                <li>Fallback na Messaggio</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}