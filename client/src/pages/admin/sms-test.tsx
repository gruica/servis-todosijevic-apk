import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Phone,
  User,
  Zap,
  History,
  Settings
} from 'lucide-react';

interface SMSTestResult {
  id: number;
  success: boolean;
  messageId?: string;
  recipient: string;
  message: string;
  provider: string;
  cost?: number;
  deliveryStatus?: 'pending' | 'delivered' | 'failed' | 'expired';
  errorMessage?: string;
  timestamp: string;
  processingTime: number;
}

interface SMSTemplate {
  id: number;
  name: string;
  message: string;
  category: 'test' | 'service' | 'client' | 'technician';
}

interface BulkSMSRequest {
  recipients: string[];
  message: string;
  scheduleAt?: string;
  priority: 'low' | 'medium' | 'high';
}

export default function SMSTestPage() {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('Test SMS poruka sa Frigo Sistem Todosijević aplikacije');
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplate | null>(null);
  const [bulkRecipients, setBulkRecipients] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [includeDeliveryReport, setIncludeDeliveryReport] = useState(true);

  const { toast } = useToast();

  // Učitaj poslednje SMS testove
  const { data: testHistory = [], isLoading: historyLoading, refetch } = useQuery<SMSTestResult[]>({
    queryKey: ['/api/admin/sms-test-history'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Učitaj SMS template-e
  const { data: templates = [] } = useQuery<SMSTemplate[]>({
    queryKey: ['/api/admin/sms-templates']
  });

  // Pošalji pojedinačni test SMS
  const sendSMSMutation = useMutation({
    mutationFn: async (data: { recipient: string; message: string; includeDeliveryReport: boolean }) => {
      const response = await apiRequest('/api/admin/sms-test/send', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: (result: SMSTestResult) => {
      if (result.success) {
        toast({
          title: "SMS uspešno poslat",
          description: `Test SMS je poslat na ${recipient}. ${result.messageId ? `ID: ${result.messageId}` : ''}`,
        });
      } else {
        toast({
          title: "SMS slanje neuspešno",
          description: result.errorMessage || "Greška pri slanju test SMS-a",
          variant: "destructive",
        });
      }
      refetch(); // Refresh history
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri slanju",
        description: error.message || "Greška pri slanju SMS-a.",
        variant: "destructive",
      });
    }
  });

  // Pošalji bulk SMS
  const sendBulkSMSMutation = useMutation({
    mutationFn: async (data: BulkSMSRequest) => {
      const response = await apiRequest('/api/admin/sms-test/bulk', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Bulk SMS poslat",
        description: `SMS je uspešno poslat na ${result.successCount} od ${result.totalCount} brojeva.`,
      });
      refetch(); // Refresh history
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri bulk slanju",
        description: error.message || "Greška pri slanju bulk SMS-a.",
        variant: "destructive",
      });
    }
  });

  const handleSendSMS = () => {
    if (!recipient.trim() || !message.trim()) {
      toast({
        title: "Nedostaju podaci",
        description: "Broj telefona i poruka su obavezni.",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(\+381|0)[0-9]{8,9}$/;
    if (!phoneRegex.test(recipient.replace(/\s/g, ''))) {
      toast({
        title: "Neispravan broj",
        description: "Molimo unesite ispravan srpski broj telefona.",
        variant: "destructive",
      });
      return;
    }

    sendSMSMutation.mutate({
      recipient: recipient.replace(/\s/g, ''),
      message,
      includeDeliveryReport
    });
  };

  const handleSendBulkSMS = () => {
    if (!bulkRecipients.trim() || !bulkMessage.trim()) {
      toast({
        title: "Nedostaju podaci",
        description: "Lista brojeva i poruka su obavezni za bulk SMS.",
        variant: "destructive",
      });
      return;
    }

    const recipients = bulkRecipients
      .split('\n')
      .map(num => num.trim())
      .filter(num => num.length > 0);

    if (recipients.length === 0) {
      toast({
        title: "Nema brojeva",
        description: "Molimo unesite najmanje jedan broj telefona.",
        variant: "destructive",
      });
      return;
    }

    const bulkRequest: BulkSMSRequest = {
      recipients,
      message: bulkMessage,
      priority,
      scheduleAt: scheduleDateTime || undefined
    };

    sendBulkSMSMutation.mutate(bulkRequest);
  };

  const handleUseTemplate = (template: SMSTemplate) => {
    setMessage(template.message);
    setSelectedTemplate(template);
  };

  const getStatusBadge = (result: SMSTestResult) => {
    if (result.success) {
      switch (result.deliveryStatus) {
        case 'delivered':
          return <Badge variant="default" className="bg-green-100 text-green-800">Dostavljeno</Badge>;
        case 'pending':
          return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Na čekanju</Badge>;
        case 'failed':
          return <Badge variant="destructive">Neuspešno</Badge>;
        case 'expired':
          return <Badge variant="destructive">Isteklo</Badge>;
        default:
          return <Badge variant="default" className="bg-blue-100 text-blue-800">Poslato</Badge>;
      }
    } else {
      return <Badge variant="destructive">Greška</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('sr-RS');
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('+381')) {
      return phone.replace('+381', '0');
    }
    return phone;
  };

  return (
    <AdminLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">SMS Test</h1>
            <p className="text-gray-600 mt-2">
              Testiranje SMS funkcionalnosti i slanje probnih poruka
            </p>
          </div>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList>
            <TabsTrigger value="single">Pojedinačni SMS</TabsTrigger>
            <TabsTrigger value="bulk">Bulk SMS</TabsTrigger>
            <TabsTrigger value="templates">Template-i</TabsTrigger>
            <TabsTrigger value="history">Istorija</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Pošalji test SMS
                </CardTitle>
                <CardDescription>
                  Pošaljite test SMS poruku na jedan broj telefona.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipient">Broj telefona</Label>
                    <Input
                      id="recipient"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="+381641234567 ili 0641234567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioritet</Label>
                    <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Nizak</SelectItem>
                        <SelectItem value="medium">Srednji</SelectItem>
                        <SelectItem value="high">Visok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Poruka</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Unesite SMS poruku..."
                    rows={4}
                    maxLength={160}
                  />
                  <div className="text-sm text-gray-500">
                    {message.length}/160 karaktera {message.length > 160 && '(poruka će biti podeljena)'}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="deliveryReport"
                    checked={includeDeliveryReport}
                    onCheckedChange={setIncludeDeliveryReport}
                  />
                  <Label htmlFor="deliveryReport">Zahtevaj izveštaj o dostavi</Label>
                </div>

                <Button
                  onClick={handleSendSMS}
                  disabled={sendSMSMutation.isPending}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendSMSMutation.isPending ? 'Šalje se...' : 'Pošalji test SMS'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Bulk SMS slanje
                </CardTitle>
                <CardDescription>
                  Pošaljite SMS poruku na više brojeva odjednom.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkRecipients">Lista brojeva (jedan po redu)</Label>
                  <Textarea
                    id="bulkRecipients"
                    value={bulkRecipients}
                    onChange={(e) => setBulkRecipients(e.target.value)}
                    placeholder="0641234567&#10;+381651234567&#10;0621234567"
                    rows={6}
                  />
                  <div className="text-sm text-gray-500">
                    {bulkRecipients.split('\n').filter(n => n.trim()).length} brojeva
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkMessage">Poruka</Label>
                  <Textarea
                    id="bulkMessage"
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Bulk SMS poruka..."
                    rows={4}
                    maxLength={160}
                  />
                  <div className="text-sm text-gray-500">
                    {bulkMessage.length}/160 karaktera
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduleDateTime">Zakaži slanje (opcionalno)</Label>
                    <Input
                      id="scheduleDateTime"
                      type="datetime-local"
                      value={scheduleDateTime}
                      onChange={(e) => setScheduleDateTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulkPriority">Prioritet</Label>
                    <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Nizak</SelectItem>
                        <SelectItem value="medium">Srednji</SelectItem>
                        <SelectItem value="high">Visok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Bulk SMS slanje može biti skupo. Proverite cene i limite pre slanja većeg broja poruka.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleSendBulkSMS}
                  disabled={sendBulkSMSMutation.isPending}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendBulkSMSMutation.isPending ? 'Šalje se...' : 'Pošalji bulk SMS'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  SMS Template-i
                </CardTitle>
                <CardDescription>
                  Koristite unapred pripremljene poruke za brže testiranje.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nema dostupnih template-a.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{template.message}</p>
                          <Badge variant="outline" className="mt-2">
                            {template.category}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUseTemplate(template)}
                        >
                          Koristi
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Istorija SMS testova
                </CardTitle>
                <CardDescription>
                  Pregled poslednjih test SMS poruka sa statusom dostave.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : testHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nema istorije SMS testova.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {testHistory.map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          {result.success ? (
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          ) : (
                            <XCircle className="h-8 w-8 text-red-500" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{formatPhoneNumber(result.recipient)}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>{formatDate(result.timestamp)}</span>
                              <span>Provider: {result.provider}</span>
                              <span>{result.processingTime}ms</span>
                              {result.cost && <span>Cena: {result.cost} RSD</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {getStatusBadge(result)}
                          {result.messageId && (
                            <p className="text-xs text-gray-500 mt-1">ID: {result.messageId}</p>
                          )}
                          {result.errorMessage && (
                            <p className="text-xs text-red-500 mt-1">{result.errorMessage}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}