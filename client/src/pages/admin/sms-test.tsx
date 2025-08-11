import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageSquare, 
  Send, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock,
  History
} from "lucide-react";

interface SMSTestResult {
  id: string;
  phone: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  provider: string;
  timestamp: string;
  messageId?: string;
  cost?: number;
  error?: string;
}

export default function SMSTestPage() {
  const { toast } = useToast();
  const [phone, setPhone] = useState('+381');
  const [message, setMessage] = useState('Test poruka sa Frigo Sistem Todosijević aplikacije');
  const [provider, setProvider] = useState<'sms-mobile' | 'gsm-modem'>('sms-mobile');

  // Fetch SMS test history
  const { data: testHistory = [], isLoading } = useQuery<SMSTestResult[]>({
    queryKey: ['/api/admin/sms-test-history'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/sms-test-history', { method: 'GET' });
      return response.json();
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Send test SMS mutation
  const sendTestSMSMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/sms-test', {
        method: 'POST',
        body: JSON.stringify({
          phone: phone.trim(),
          message: message.trim(),
          provider
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send SMS');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "SMS poslat",
        description: `Test SMS je uspešno poslat na ${phone}. ID poruke: ${data.messageId || 'N/A'}`,
      });
      // Refresh history
      // Refresh test history
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri slanju SMS-a",
        description: error.message || "Test SMS nije mogao biti poslat.",
        variant: "destructive",
      });
    }
  });

  const handleSendSMS = () => {
    if (!phone.trim() || phone.length < 9) {
      toast({
        title: "Nevaljan broj telefona",
        description: "Unesite valjan broj telefona.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Prazna poruka",
        description: "Unesite tekst poruke.",
        variant: "destructive",
      });
      return;
    }

    if (message.length > 160) {
      toast({
        title: "Poruka predugačka",
        description: `Poruka ima ${message.length} karaktera. Preporučuje se maksimalno 160 karaktera za jedan SMS.`,
        variant: "destructive",
      });
      return;
    }

    sendTestSMSMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800"><Send className="h-3 w-3 mr-1" />Poslato</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Isporučeno</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Neuspešno</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Na čekanju</Badge>;
      default:
        return <Badge variant="outline">Nepoznato</Badge>;
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format Serbian phone numbers for better display
    if (phone.startsWith('+381')) {
      const number = phone.replace('+381', '0');
      return `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
    }
    return phone;
  };

  const predefinedMessages = [
    'Test poruka sa Frigo Sistem Todosijević aplikacije',
    'Vaš servis je u toku. Kontaktirajte nas za dodatne informacije.',
    'Rezervni deo je stigao. Možemo zakazati nastavak servisa.',
    'Servis je završen. Aparat je spreman za preuzimanje.'
  ];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            SMS Test
          </h1>
          <p className="text-muted-foreground mt-1">
            Testiranje SMS funkcionalnosti i praćenje istorije poruka
          </p>
        </div>

        <div className="grid gap-6">
          {/* Send Test SMS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Pošalji test SMS
              </CardTitle>
              <CardDescription>
                Testiranje SMS funkcionalnosti sa custom porukom
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Broj telefona *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+381691234567"
                  />
                  <p className="text-xs text-muted-foreground">
                    Unesite broj sa +381 prefiksom
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider">SMS provajder</Label>
                  <Select
                    value={provider}
                    onValueChange={(value: 'sms-mobile' | 'gsm-modem') => setProvider(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms-mobile">SMS Mobile API</SelectItem>
                      <SelectItem value="gsm-modem">GSM Modem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Poruka *</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Unesite test poruku"
                  rows={4}
                  maxLength={320}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {message.length <= 160 
                      ? `${message.length}/160 karaktera (1 SMS)` 
                      : `${message.length}/320 karaktera (${Math.ceil(message.length / 160)} SMS-a)`
                    }
                  </span>
                  {message.length > 160 && (
                    <span className="text-amber-600">
                      Poruka će biti poslata kao višestruki SMS
                    </span>
                  )}
                </div>
              </div>

              {/* Predefined Messages */}
              <div className="space-y-2">
                <Label>Gotove poruke</Label>
                <div className="flex flex-wrap gap-2">
                  {predefinedMessages.map((predefinedMessage, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setMessage(predefinedMessage)}
                      className="text-xs"
                    >
                      {predefinedMessage.length > 30 
                        ? `${predefinedMessage.substring(0, 30)}...` 
                        : predefinedMessage
                      }
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleSendSMS}
                disabled={sendTestSMSMutation.isPending || !phone.trim() || !message.trim()}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendTestSMSMutation.isPending ? "Šalje se..." : "Pošalji test SMS"}
              </Button>
            </CardContent>
          </Card>

          {/* Test History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Istorija testova ({testHistory.length})
              </CardTitle>
              <CardDescription>
                Poslednji poslati test SMS-ovi sa statusom isporuke
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nema test SMS-ova</p>
                  <p className="text-sm">Pošaljite prvi test SMS koristeći formu iznad</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testHistory.map((test) => (
                    <div key={test.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatPhoneNumber(test.phone)}</span>
                            {getStatusBadge(test.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(test.timestamp).toLocaleString('sr-RS')}
                          </p>
                        </div>
                        
                        <div className="text-right text-sm text-muted-foreground">
                          <div>Provajder: {test.provider}</div>
                          {test.cost && <div>Cena: {test.cost} din</div>}
                          {test.messageId && <div>ID: {test.messageId}</div>}
                        </div>
                      </div>

                      <div className="bg-muted/50 p-3 rounded text-sm">
                        <strong>Poruka:</strong> {test.message}
                      </div>

                      {test.error && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
                          <strong>Greška:</strong> {test.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}