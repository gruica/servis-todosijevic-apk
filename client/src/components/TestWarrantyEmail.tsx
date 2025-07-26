import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Mail } from 'lucide-react';

export function TestWarrantyEmail() {
  const [warrantyStatus, setWarrantyStatus] = useState<"u garanciji" | "van garancije">("u garanciji");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const sendTestEmail = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/test-warranty-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ warrantyStatus }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setResult({ success: true, message: data.message });
        toast({
          title: "Email poslat uspešno",
          description: `Test warranty email (${warrantyStatus === "u garanciji" ? "u garanciji" : "van garancije"}) poslat na gruica@frigosistemtodosijevic.com`,
        });
      } else {
        setResult({ success: false, message: data.error || "Neuspešno slanje emaila" });
        toast({
          title: "Greška pri slanju emaila",
          description: data.error || "Neuspešno slanje emaila",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = `Greška pri slanju test emaila: ${error.message}`;
      setResult({ success: false, message: errorMessage });
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Test Warranty Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Odaberite warranty status:</Label>
          <RadioGroup 
            value={warrantyStatus} 
            onValueChange={(value) => setWarrantyStatus(value as "u garanciji" | "van garancije")}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="u garanciji" id="u_garanciji" />
              <Label htmlFor="u_garanciji" className="text-sm">
                🛡️ U garanciji
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="van garancije" id="van_garancije" />
              <Label htmlFor="van_garancije" className="text-sm">
                💰 Van garancije
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button 
          onClick={sendTestEmail} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Šalje email..." : "Pošalji test email na gruica@frigosistemtodosijevic.com"}
        </Button>

        {result && (
          <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
            result.success 
              ? "bg-green-50 text-green-700 border border-green-200" 
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>{result.message}</span>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p><strong>Test email sadržaj:</strong></p>
          <p>• Servis #999</p>
          <p>• Status: Završen</p>
          <p>• Serviser: Gruica Todosijević</p>
          <p>• Warranty status: {warrantyStatus === "u garanciji" ? "U garanciji" : "Van garancije"}</p>
        </div>
      </CardContent>
    </Card>
  );
}