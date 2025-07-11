import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Smartphone, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InfobipSmsTestProps {
  className?: string;
}

export function InfobipSmsTest({ className }: InfobipSmsTestProps) {
  const [testPhone, setTestPhone] = useState('+38267051141');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [statusResult, setStatusResult] = useState<any>(null);
  const { toast } = useToast();

  const testSms = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const response = await apiRequest("POST", "/api/infobip/test", {
        recipient: testPhone
      });
      const data = await response.json();
      
      setTestResult(data);
      
      if (data.success) {
        toast({
          title: "Test uspešan",
          description: `SMS uspešno poslat na ${testPhone}`,
        });
      } else {
        toast({
          title: "Test neuspešan",
          description: data.error || "Neuspešno slanje test SMS-a",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Greška pri testiranju SMS:", error);
      
      let errorMessage = "Neuspešno testiranje SMS-a.";
      if (error.response?.data?.error) {
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

  const checkStatus = async () => {
    try {
      const response = await apiRequest("GET", "/api/infobip/status");
      const data = await response.json();
      setStatusResult(data);
      
      if (data.success && data.connection) {
        toast({
          title: "Status proveren",
          description: "Infobip platforma je dostupna",
        });
      } else {
        toast({
          title: "Status upozorenje",
          description: "Infobip platforma nije dostupna",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Greška pri proveri statusa:", error);
      toast({
        title: "Greška",
        description: "Neuspešno proveri statusa",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Infobip SMS Test
        </CardTitle>
        <CardDescription>
          Testiraj slanje SMS-a preko Infobip platforme sa vašeg broja +38267051141
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Vaš broj:</strong> +382 67 051 141 (Telekom Crne Gore)
          </p>
          <p className="text-xs text-blue-600 mt-1">
            SMS poruke se šalju preko Infobip platforme sa vašeg broja
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="testPhone">Test SMS na broj:</Label>
            <Input
              id="testPhone"
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+38267051141"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testSms}
              disabled={isLoading || !testPhone}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Šalje...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Pošalji test SMS
                </>
              )}
            </Button>

            <Button 
              onClick={checkStatus}
              variant="outline"
            >
              Proveri status
            </Button>
          </div>
        </div>

        {testResult && (
          <div className="space-y-3">
            <Separator />
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  SMS uspešno poslat
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" />
                  SMS neuspešno poslat
                </Badge>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <div className="space-y-1">
                <p><strong>Platforma:</strong> Infobip SMS</p>
                <p><strong>Broj pošaljaoca:</strong> +38267051141</p>
                
                {testResult.messageId && (
                  <p><strong>Message ID:</strong> {testResult.messageId}</p>
                )}
                
                {testResult.cost && (
                  <p><strong>Cena:</strong> {testResult.cost} EUR</p>
                )}
                
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

        {statusResult && (
          <div className="space-y-3">
            <Separator />
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <div className="space-y-1">
                <p><strong>Status konekcije:</strong> {statusResult.connection ? 'Dostupna' : 'Nedostupna'}</p>
                <p><strong>Balans:</strong> {statusResult.balance || 0} EUR</p>
                <p><strong>Poruka:</strong> {statusResult.message}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}