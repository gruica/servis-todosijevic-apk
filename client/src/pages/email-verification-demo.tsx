import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailVerification } from "@/components/ui/email-verification";
import { Mail, ArrowLeft } from "lucide-react";

export default function EmailVerificationDemo() {
  const [email, setEmail] = useState("");
  const [showVerification, setShowVerification] = useState(false);

  const handleStartVerification = () => {
    if (email && email.includes('@')) {
      setShowVerification(true);
    }
  };

  const handleVerificationSuccess = () => {
    alert("Email verifikacija je uspešno završena!");
    setShowVerification(false);
    setEmail("");
  };

  const handleCancel = () => {
    setShowVerification(false);
  };

  if (showVerification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Nazad
          </Button>
          
          <EmailVerification
            email={email}
            onVerificationSuccess={handleVerificationSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Verifikacija Demo
          </CardTitle>
          <CardDescription>
            Testiranje email verifikacije sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email adresa</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="unesite@email.com"
            />
          </div>
          
          <Button
            onClick={handleStartVerification}
            disabled={!email || !email.includes('@')}
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            Pokreni verifikaciju
          </Button>
          
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Kako funkcioniše:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Unesite validnu email adresu</li>
              <li>Kliknite "Pokreni verifikaciju"</li>
              <li>Sistem će poslati 6-cifreni kod</li>
              <li>Unesite kod za verifikaciju</li>
            </ul>
          </div>
          
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
            <p><strong>Napomena:</strong> Email slanje zavisi od SMTP konfiguracije. API pozivi funkcionišu potpuno.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}