import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface EmailVerificationProps {
  email: string;
  onVerificationSuccess: () => void;
  onCancel: () => void;
}

export function EmailVerification({ email, onVerificationSuccess, onCancel }: EmailVerificationProps) {
  const [step, setStep] = useState<'send' | 'verify' | 'success'>('send');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSendCode = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiRequest('POST', '/api/email/send-verification', { email });
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Verifikacioni kod je poslat na vašu email adresu.');
        setStep('verify');
      } else {
        setError(result.message || 'Greška pri slanju verifikacijskog koda.');
      }
    } catch (err) {
      setError('Greška pri slanju verifikacijskog koda. Molimo pokušajte ponovo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError('Molimo unesite verifikacioni kod.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiRequest('POST', '/api/email/verify-code', { 
        email, 
        code: verificationCode.trim() 
      });
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Email je uspešno verifikovan!');
        setStep('success');
        setTimeout(() => {
          onVerificationSuccess();
        }, 1500);
      } else {
        setError(result.message || 'Neispravni verifikacioni kod.');
      }
    } catch (err) {
      setError('Greška pri verifikaciji koda. Molimo pokušajte ponovo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setVerificationCode('');
    setError(null);
    setSuccess(null);
    await handleSendCode();
  };

  if (step === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <CardTitle className="text-green-600">Email verifikovan!</CardTitle>
          <CardDescription>
            Vaš email je uspešno verifikovan. Sada možete nastaviti sa registracijom.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email verifikacija
        </CardTitle>
        <CardDescription>
          {step === 'send' 
            ? 'Pošaljite verifikacioni kod na vašu email adresu' 
            : 'Unesite verifikacioni kod koji ste primili u email-u'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Email adresa</Label>
          <Input 
            value={email} 
            disabled 
            className="bg-gray-50" 
          />
        </div>

        {step === 'send' && (
          <div className="space-y-4">
            <Button 
              onClick={handleSendCode} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Slanje koda...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Pošalji verifikacioni kod
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="w-full"
            >
              Odustani
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verifikacioni kod</Label>
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Unesite 6-cifreni kod"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
            
            <Button 
              onClick={handleVerifyCode} 
              disabled={isLoading || !verificationCode.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifikacija...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verifikuj kod
                </>
              )}
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleResendCode}
                disabled={isLoading}
                className="flex-1"
              >
                Pošalji ponovo
              </Button>
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="flex-1"
              >
                Odustani
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}