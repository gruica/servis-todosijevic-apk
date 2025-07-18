import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, Send, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SMSTest() {
  const { toast } = useToast();
  const [testPhone, setTestPhone] = useState("+382");
  const [testResult, setTestResult] = useState<any>(null);

  // Test SMS mutation
  const testSMSMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest(`/api/sms/send-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      console.log("SMS test rezultat:", data);
      setTestResult(data);
      toast({
        title: "SMS test uspešan",
        description: `Test SMS je uspešno poslat na ${testPhone}`,
      });
    },
    onError: (error: any) => {
      console.error("SMS test greška:", error);
      setTestResult({ 
        success: false, 
        error: error.message || "Neuspešno slanje test SMS-a" 
      });
      toast({
        title: "SMS test neuspešan",
        description: error.message || "Neuspešno slanje test SMS-a",
        variant: "destructive",
      });
    },
  });

  const handleTestSMS = () => {
    if (!testPhone.trim()) {
      toast({
        title: "Neispravan broj",
        description: "Molimo unesite broj telefona",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Slanje test SMS-a na:", testPhone);
    testSMSMutation.mutate(testPhone);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS Test - Twilio</h1>
          <p className="text-gray-600">Testiranje SMS funkcionalnosti preko Twilio servisa</p>
        </div>

        {/* SMS Test Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Test SMS Poruke
            </CardTitle>
            <CardDescription>
              Testirajte slanje SMS poruke preko Twilio servisa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testPhone">Broj telefona za test</Label>
              <div className="flex gap-2">
                <Input
                  id="testPhone"
                  placeholder="+38267028666"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleTestSMS}
                  disabled={testSMSMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {testSMSMutation.isPending ? "Šalje..." : "Pošalji test SMS"}
                </Button>
              </div>
            </div>

            {/* Test Results */}
            {testResult && (
              <Alert className={testResult.success ? "border-green-500" : "border-red-500"}>
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      {testResult.success ? (
                        <div>
                          <strong>✅ SMS uspešno poslat!</strong>
                          <br />
                          <strong>Broj:</strong> {testResult.phoneNumber}
                          <br />
                          <strong>Provajder:</strong> {testResult.provider}
                        </div>
                      ) : (
                        <div>
                          <strong>❌ SMS neuspešan!</strong>
                          <br />
                          <strong>Greška:</strong> {testResult.error}
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* SMS Service Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Status SMS Servisa
            </CardTitle>
            <CardDescription>
              Informacije o trenutnom SMS servisu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Provajder:</span>
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  Twilio
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <span className="text-green-600 font-medium">
                  Aktivan
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Test poruka:</span>
                <span className="text-sm text-gray-600">
                  "Test SMS iz Frigo Sistema - Ignoriši ovu poruku"
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}