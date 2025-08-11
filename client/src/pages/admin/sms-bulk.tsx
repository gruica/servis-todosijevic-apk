import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { MessageSquare, Send, Users, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BulkSMSResult {
  phone: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export default function BulkSMSPage() {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BulkSMSResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSendBulkSMS = async () => {
    if (!message.trim()) {
      toast({
        title: "Greška",
        description: "Unesite poruku za slanje",
        variant: "destructive"
      });
      return;
    }

    if (!phoneNumbers.trim()) {
      toast({
        title: "Greška", 
        description: "Unesite brojeve telefona",
        variant: "destructive"
      });
      return;
    }

    // Parse phone numbers - podržava zarez, nova linija ili space kao separator
    const phones = phoneNumbers
      .split(/[,\n\s]+/)
      .map(phone => phone.trim())
      .filter(phone => phone.length > 0);

    if (phones.length === 0) {
      toast({
        title: "Greška",
        description: "Nema validnih brojeva telefona",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setResults([]);
    setShowResults(false);

    try {
      const response = await apiRequest('/api/sms/bulk-send', 'POST', {
        type: 'custom',
        message: message.trim(),
        phoneNumbers: phones
      });

      if (response.success) {
        setResults(response.results);
        setShowResults(true);
        
        toast({
          title: "Bulk SMS završen",
          description: `Poslato ${response.summary.success}/${response.summary.total} SMS poruka`,
          variant: response.summary.failed > 0 ? "destructive" : "default"
        });
      } else {
        throw new Error(response.error || 'Nepoznata greška');
      }
    } catch (error) {
      // Error handled by toast notification
      toast({
        title: "Greška pri slanju",
        description: error instanceof Error ? error.message : "Nepoznata greška",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setShowResults(false);
  };

  const clearForm = () => {
    setMessage('');
    setPhoneNumbers('');
    clearResults();
  };

  const parsePhoneCount = () => {
    if (!phoneNumbers.trim()) return 0;
    return phoneNumbers
      .split(/[,\n\s]+/)
      .map(phone => phone.trim())
      .filter(phone => phone.length > 0).length;
  };

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.length - successCount;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Masovno slanje SMS</h1>
          <p className="text-muted-foreground">
            Pošaljite SMS poruku većem broju korisnika odjednom
          </p>
        </div>
        <MessageSquare className="h-8 w-8 text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Nova bulk SMS kampanja
          </CardTitle>
          <CardDescription>
            Unesite poruku i brojeve telefona za masovno slanje SMS poruka
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">SMS Poruka</Label>
            <Textarea
              id="message"
              placeholder="Unesite sadržaj SMS poruke..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={160}
              className="resize-none"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Maksimalno 160 karaktera</span>
              <span>{message.length}/160</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phones">Brojevi telefona</Label>
            <Textarea
              id="phones"
              placeholder="Unesite brojeve telefona odvojene zarezom, novim redom ili razmakom&#10;Primer:&#10;067123456&#10;068234567, 069345678&#10;064456789"
              value={phoneNumbers}
              onChange={(e) => setPhoneNumbers(e.target.value)}
              rows={6}
              className="resize-none font-mono text-sm"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Ukupno brojeva: {parsePhoneCount()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSendBulkSMS}
              disabled={isLoading || !message.trim() || parsePhoneCount() === 0}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isLoading ? 'Šaljem...' : 'Pošalji SMS'}
            </Button>
            <Button variant="outline" onClick={clearForm}>
              Obriši forme
            </Button>
          </div>
        </CardContent>
      </Card>

      {showResults && results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Rezultati slanja
                <Badge variant={failedCount > 0 ? "destructive" : "default"}>
                  {successCount}/{results.length}
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearResults}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Uspešno poslato: {successCount}, Neuspešno: {failedCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                      : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-mono text-sm">{result.phone}</span>
                  </div>
                  <div className="text-right">
                    {result.success ? (
                      <div className="text-sm text-green-700 dark:text-green-300">
                        {result.messageId && (
                          <span className="text-xs opacity-75">ID: {result.messageId.substring(0, 8)}...</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-red-700 dark:text-red-300">
                        {result.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}