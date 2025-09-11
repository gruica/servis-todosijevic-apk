import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Settings, 
  Send, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Phone, 
  Image, 
  FileText,
  Users,
  AlertTriangle,
  Info
} from 'lucide-react';

interface WhatsAppConfig {
  phoneNumberId: string;
  apiVersion: string;
  baseUrl: string;
  hasAccessToken: boolean;
  isConfigured: boolean;
}

interface ConfigStatus {
  isConfigured: boolean;
  missingFields: string[];
}

export default function WhatsAppBusinessAPI() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  
  // Konfiguracija form polja
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [apiVersion, setApiVersion] = useState('v23.0');
  const [baseUrl, setBaseUrl] = useState('https://graph.facebook.com');
  
  // Test poruke form polja
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState(false);
  
  // Template poruke form polja
  const [templatePhone, setTemplatePhone] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [languageCode, setLanguageCode] = useState('en_US');
  
  // Slika poruke form polja
  const [imagePhone, setImagePhone] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  
  // Bulk poruke form polja
  const [bulkPhones, setBulkPhones] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  
  // Webhook konfiguracija - NOVO DODATO
  const [webhookConfig, setWebhookConfig] = useState<any>(null);
  const [webhookTesting, setWebhookTesting] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/whatsapp-business/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setStatus(data.status);
        
        // Popuni form polja sa postojećim vrednostima
        if (data.config) {
          setPhoneNumberId(data.config.phoneNumberId || '');
          setApiVersion(data.config.apiVersion || 'v23.0');
          setBaseUrl(data.config.baseUrl || 'https://graph.facebook.com');
        }
      }
    } catch (error: any) {
      console.error('Greška pri učitavanju konfiguracije:', error);
      toast({
        title: 'Greška',
        description: 'Nije moguće učitati konfiguraciju',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!accessToken || !phoneNumberId) {
      toast({
        title: 'Greška',
        description: 'Access Token i Phone Number ID su obavezni',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/whatsapp-business/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accessToken,
          phoneNumberId,
          apiVersion,
          baseUrl
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setAccessToken(''); // Očisti access token iz forme iz bezbednosnih razloga
        toast({
          title: 'Uspeh',
          description: 'Konfiguracija je uspešno sačuvana'
        });
        await loadConfiguration(); // Ponovo učitaj konfiguraciju
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Greška pri čuvanju konfiguracije');
      }
    } catch (error: any) {
      console.error('Greška pri čuvanju konfiguracije:', error);
      toast({
        title: 'Greška',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/whatsapp-business/test-connection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Uspeh',
          description: data.message
        });
      } else {
        toast({
          title: 'Greška',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Greška pri testiranju konekcije:', error);
      toast({
        title: 'Greška',
        description: 'Greška pri testiranju konekcije',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) {
      toast({
        title: 'Greška',
        description: 'Broj telefona i poruka su obavezni',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/whatsapp-business/send-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: testPhone,
          message: testMessage,
          previewUrl
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Uspeh',
          description: `Poruka uspešno poslata! Message ID: ${data.messageId}`
        });
        setTestMessage('');
      } else {
        toast({
          title: 'Greška',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Greška pri slanju poruke:', error);
      toast({
        title: 'Greška',
        description: 'Greška pri slanju poruke',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTemplateMessage = async () => {
    if (!templatePhone || !templateName) {
      toast({
        title: 'Greška',
        description: 'Broj telefona i naziv template-a su obavezni',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/whatsapp-business/send-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: templatePhone,
          templateName,
          languageCode
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Uspeh',
          description: `Template poruka uspešno poslata! Message ID: ${data.messageId}`
        });
        setTemplateName('');
      } else {
        toast({
          title: 'Greška',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Greška pri slanju template poruke:', error);
      toast({
        title: 'Greška',
        description: 'Greška pri slanju template poruke',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendImageMessage = async () => {
    if (!imagePhone || !imageUrl) {
      toast({
        title: 'Greška',
        description: 'Broj telefona i URL slike su obavezni',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/whatsapp-business/send-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: imagePhone,
          imageUrl,
          caption: imageCaption
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Uspeh',
          description: `Slika uspešno poslata! Message ID: ${data.messageId}`
        });
        setImageUrl('');
        setImageCaption('');
      } else {
        toast({
          title: 'Greška',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Greška pri slanju slike:', error);
      toast({
        title: 'Greška',
        description: 'Greška pri slanju slike',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendBulkMessages = async () => {
    if (!bulkPhones || !bulkMessage) {
      toast({
        title: 'Greška',
        description: 'Brojevi telefona i poruka su obavezni',
        variant: 'destructive'
      });
      return;
    }

    const phoneList = bulkPhones.split('\n').map(p => p.trim()).filter(p => p);
    if (phoneList.length === 0) {
      toast({
        title: 'Greška',
        description: 'Unesite najmanje jedan broj telefona',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/whatsapp-business/send-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumbers: phoneList,
          message: bulkMessage
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Uspeh',
          description: `Bulk slanje završeno: ${data.summary.successful} uspešnih, ${data.summary.failed} neuspešnih`
        });
        setBulkMessage('');
      } else {
        toast({
          title: 'Greška',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Greška pri bulk slanju:', error);
      toast({
        title: 'Greška',
        description: 'Greška pri bulk slanju poruka',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // WEBHOOK FUNKCIJE - NOVO DODATO
  const loadWebhookConfig = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/whatsapp-webhook/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWebhookConfig(data.config);
      } else {
        toast({
          title: 'Greška',
          description: 'Nije moguće učitati webhook konfiguraciju',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Greška pri učitavanju webhook konfiguracije:', error);
      toast({
        title: 'Greška',
        description: 'Greška pri učitavanju webhook konfiguracije',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testWebhookConfig = async () => {
    try {
      setWebhookTesting(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/whatsapp-webhook/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Uspeh',
          description: data.message
        });
      } else {
        toast({
          title: 'Greška',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Greška pri testiranju webhook konfiguracije:', error);
      toast({
        title: 'Greška',
        description: 'Greška pri testiranju webhook konfiguracije',
        variant: 'destructive'
      });
    } finally {
      setWebhookTesting(false);
    }
  };

  // Učitaj webhook config kada se komponenta mount-uje
  useEffect(() => {
    loadWebhookConfig();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Business API</h1>
          <p className="text-muted-foreground">
            Upravljanje Facebook WhatsApp Business API integracijom
          </p>
        </div>
        
        {config && (
          <Badge variant={status?.isConfigured ? 'default' : 'destructive'}>
            {status?.isConfigured ? 'Konfigurisan' : 'Nije konfigurisan'}
          </Badge>
        )}
      </div>

      {/* Status pregled */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Status konfiguracije
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {config.phoneNumberId || 'Nije postavljeno'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>API Version</Label>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {config.apiVersion}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Access Token</Label>
                <div className="flex items-center gap-2">
                  {config.hasAccessToken ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">
                    {config.hasAccessToken ? 'Postavljen' : 'Nije postavljen'}
                  </span>
                </div>
              </div>
            </div>

            {!status?.isConfigured && status?.missingFields && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Nedostaju polja: {status.missingFields.join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Konfiguracija
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Tekst
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Template
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Slika
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bulk
          </TabsTrigger>
          <TabsTrigger value="webhook" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Test
          </TabsTrigger>
        </TabsList>

        {/* Konfiguracija tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>API Konfiguracija</CardTitle>
              <CardDescription>
                Konfigurišite WhatsApp Business API pristupne podatke
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token *</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="Unesite Facebook Access Token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Access Token iz Facebook Developer Console
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                <Input
                  id="phoneNumberId"
                  placeholder="Unesite Phone Number ID"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  ID vašeg WhatsApp Business telefona
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiVersion">API Version</Label>
                  <Input
                    id="apiVersion"
                    placeholder="v23.0"
                    value={apiVersion}
                    onChange={(e) => setApiVersion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseUrl">Base URL</Label>
                  <Input
                    id="baseUrl"
                    placeholder="https://graph.facebook.com"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button 
                  onClick={saveConfiguration} 
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  Sačuvaj konfiguraciju
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tekstualne poruke tab */}
        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Pošalji tekstualnu poruku</CardTitle>
              <CardDescription>
                Pošaljite običnu tekstualnu poruku
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testPhone">Broj telefona</Label>
                <Input
                  id="testPhone"
                  placeholder="38167123456"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testMessage">Poruka</Label>
                <Textarea
                  id="testMessage"
                  placeholder="Unesite vašu poruku..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="previewUrl"
                  checked={previewUrl}
                  onCheckedChange={setPreviewUrl}
                />
                <Label htmlFor="previewUrl">Prikaži URL preview</Label>
              </div>

              <Button 
                onClick={sendTestMessage} 
                disabled={loading || !status?.isConfigured}
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Pošalji poruku
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template poruke tab */}
        <TabsContent value="template">
          <Card>
            <CardHeader>
              <CardTitle>Pošalji template poruku</CardTitle>
              <CardDescription>
                Pošaljite predefinisanu template poruku
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="templatePhone">Broj telefona</Label>
                <Input
                  id="templatePhone"
                  placeholder="38167123456"
                  value={templatePhone}
                  onChange={(e) => setTemplatePhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Naziv template-a</Label>
                  <Input
                    id="templateName"
                    placeholder="hello_world"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="languageCode">Jezik</Label>
                  <Input
                    id="languageCode"
                    placeholder="en_US"
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={sendTemplateMessage} 
                disabled={loading || !status?.isConfigured}
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Pošalji template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slika poruke tab */}
        <TabsContent value="image">
          <Card>
            <CardHeader>
              <CardTitle>Pošalji sliku</CardTitle>
              <CardDescription>
                Pošaljite sliku sa opcionalnim opisom
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imagePhone">Broj telefona</Label>
                <Input
                  id="imagePhone"
                  placeholder="38167123456"
                  value={imagePhone}
                  onChange={(e) => setImagePhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL slike</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageCaption">Opis slike (opciono)</Label>
                <Textarea
                  id="imageCaption"
                  placeholder="Opis slike..."
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                onClick={sendImageMessage} 
                disabled={loading || !status?.isConfigured}
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                Pošalji sliku
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk poruke tab */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk slanje poruka</CardTitle>
              <CardDescription>
                Pošaljite istu poruku više primalaca odjednom
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkPhones">Brojevi telefona (jedan po liniji)</Label>
                <Textarea
                  id="bulkPhones"
                  placeholder={`38167123456\n38169876543\n38165555555`}
                  value={bulkPhones}
                  onChange={(e) => setBulkPhones(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulkMessage">Poruka</Label>
                <Textarea
                  id="bulkMessage"
                  placeholder="Unesite poruku za sve primaoce..."
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Pažnja: Bulk slanje će poslati istu poruku svim unetim brojevima. 
                  Proverite brojeve pre slanja.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={sendBulkMessages} 
                disabled={loading || !status?.isConfigured}
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Pošalji bulk poruke
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook tab - NOVO DODATO */}
        <TabsContent value="webhook">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Webhook Konfiguracija</CardTitle>
              <CardDescription>
                Konfiguriši Facebook webhook za primanje poruka i status ažuriranja
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {webhookConfig && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Webhook Status</Label>
                    <div className="flex items-center gap-2">
                      {webhookConfig.isConfigured ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">
                        {webhookConfig.isConfigured ? 'Konfigurisan' : 'Nije konfigurisan'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Verify Token</Label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">
                      {webhookConfig.verifyToken}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Webhook URL-ovi za Facebook Developer Console:</strong><br/>
                    <code className="bg-muted px-1 py-0.5 rounded text-sm">
                      https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/webhook/whatsapp
                    </code>
                  </AlertDescription>
                </Alert>

                {webhookConfig?.webhookUrl && (
                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-2">
                      <Label>Verify Endpoint (GET)</Label>
                      <p className="text-sm font-mono bg-muted p-2 rounded">
                        {webhookConfig.webhookUrl.verify}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Receive Endpoint (POST)</Label>
                      <p className="text-sm font-mono bg-muted p-2 rounded">
                        {webhookConfig.webhookUrl.receive}
                      </p>
                    </div>
                  </div>
                )}

                <div className="border rounded-lg p-4 bg-muted/20">
                  <h4 className="font-semibold mb-2">🔧 Koraci za setup webhook-a:</h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    <li>Idite na Facebook Developer Console</li>
                    <li>Otvorite WhatsApp {">"} Configuration</li>
                    <li>Unesite Webhook URL: <code className="bg-muted px-1 rounded">https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/webhook/whatsapp</code></li>
                    <li>Unesite Verify Token: <code className="bg-muted px-1 rounded">frigo_sistem_todosijevic_webhook_2024</code></li>
                    <li>Označite "messages" field</li>
                    <li>Kliknite "Verify and Save"</li>
                  </ol>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button 
                    onClick={testWebhookConfig} 
                    disabled={webhookTesting}
                    className="flex items-center gap-2"
                  >
                    {webhookTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                    Testiraj Webhook
                  </Button>
                  
                  <Button 
                    onClick={loadWebhookConfig} 
                    disabled={loading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                    Refresh Config
                  </Button>
                </div>

                {!webhookConfig?.isConfigured && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Webhook nije konfigurisan. Environment varijabla WHATSAPP_WEBHOOK_VERIFY_TOKEN nije postavljena.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test konekcije tab */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test konekcije</CardTitle>
              <CardDescription>
                Testiraj konekciju sa WhatsApp Business API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Kliknite dugme ispod da testirate da li je API pravilno konfigurisan i dostupan.
              </p>

              <Button 
                onClick={testConnection} 
                disabled={testing || !status?.isConfigured}
                className="flex items-center gap-2"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                Testiraj konekciju
              </Button>

              {!status?.isConfigured && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    API nije konfigurisan. Molimo konfigurisite ga u "Konfiguracija" tab-u.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}