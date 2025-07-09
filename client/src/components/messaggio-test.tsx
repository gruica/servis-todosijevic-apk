import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Phone, Euro } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface MessaggioTestProps {
  className?: string;
}

export function MessaggioTest({ className }: MessaggioTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const { toast } = useToast();

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const response = await apiRequest("GET", "/api/messaggio/test");
      const data = await response.json();
      
      setTestResult(data);
      
      if (data.success && data.connection) {
        toast({
          title: "Konekcija uspešna",
          description: "Messaggio servis je uspešno konfigurisan i radi.",
        });
      } else {
        toast({
          title: "Konekcija neuspešna",
          description: "Nema konekcije sa Messaggio servisom.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Greška pri testiranju Messaggio:", error);
      
      let errorMessage = "Neuspešno testiranje Messaggio servisa.";
      if (error.response?.status === 403) {
        errorMessage = "Nemate dozvolu - proverite API kredencijale.";
      } else if (error.response?.status === 401) {
        errorMessage = "Neautorizovan pristup - proverite API ključ.";
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
          <Phone className="h-5 w-5" />
          Messaggio SMS Test
        </CardTitle>
        <CardDescription>
          Testiraj konekciju sa Messaggio SMS servisom
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              <Phone className="mr-2 h-4 w-4" />
              Testiraj konekciju
            </>
          )}
        </Button>

        {testResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status konekcije:</span>
              {testResult.connection ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Uspešno
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  Neuspešno
                </Badge>
              )}
            </div>

            {testResult.balance && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Balans na nalogu:</span>
                  <div className="flex items-center gap-1">
                    <Euro className="w-4 h-4" />
                    <span className="font-mono">
                      {testResult.balance.balance?.toFixed(2)} {testResult.balance.currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {testResult.balance?.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  Greška pri dohvatanju balansa: {testResult.balance.error}
                </p>
              </div>
            )}

            {!testResult.connection && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Proverite da li su MESSAGGIO_API_KEY i MESSAGGIO_SENDER_ID ispravno konfigurisani u Replit Secrets.
                </p>
              </div>
            )}

            {testResult.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">
                  Greška: {testResult.error}
                </p>
                {testResult.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      Detaljnije informacije
                    </summary>
                    <pre className="mt-1 text-xs text-red-600 overflow-x-auto">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}