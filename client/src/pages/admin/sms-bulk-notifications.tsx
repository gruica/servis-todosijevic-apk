import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle, Send, Users, Phone, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Recipient {
  id: number;
  name: string;
  phone: string;
  role: string;
  selected: boolean;
}

interface SMSResult {
  phone: string;
  name: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

const SMS_TEMPLATES = {
  service_completed: "Poštovani/a {clientName}, servis za Vaš {deviceType} je uspešno završen. Uređaj je potpuno ispravan. Hvala na poverenju! - Frigo Sistem Todosijević",
  spare_part_ordered: "Poštovani/a {clientName}, rezervni deo za Vaš {deviceType} je naručen. Očekivani rok isporuke: {estimatedDate}. Obavestićemo Vas kada deo stigne. - Frigo Sistem",
  spare_part_arrived: "Poštovani/a {clientName}, rezervni deo za Vaš {deviceType} je stigao! Kontaktiraćemo Vas uskoro za zakazivanje termina nastavka servisa. - Frigo Sistem",
  appointment_reminder: "Podsetnik: Imate zakazan servis sutra za {deviceType}. Servis #: {serviceId}. Molimo budite dostupni na dogovorenom vremenu. - Frigo Sistem",
  maintenance_due: "Poštovani/a {clientName}, vreme je za redovan servis Vašeg {deviceType}. Kontaktirajte nas za zakazivanje termina. - Frigo Sistem Todosijević",
  business_partner_assigned: "Servis #{serviceId} za klijenta {clientName} ({deviceType}) je dodeljen tehniciaru {technicianName}. Status možete pratiti u admin panelu. - Frigo Sistem",
  custom: ""
};

export default function SMSBulkNotifications() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof SMS_TEMPLATES>('custom');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SMSResult[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadRecipients();
  }, []);

  useEffect(() => {
    if (selectedTemplate !== 'custom') {
      setMessage(SMS_TEMPLATES[selectedTemplate]);
    } else {
      setMessage('');
    }
  }, [selectedTemplate]);

  const loadRecipients = async () => {
    setLoading(true);
    try {
      // Učitaj sve korisnike sa telefonskim brojevima
      const response = await apiRequest('GET', '/api/admin/users');
      const users = await response.json();
      
      const recipientsList: Recipient[] = users
        .filter((user: any) => user.phone && user.phone.trim() !== '')
        .map((user: any) => ({
          id: user.id,
          name: user.fullName || user.username,
          phone: user.phone,
          role: user.role,
          selected: false
        }));

      setRecipients(recipientsList);
    } catch (error) {
      // Error handled by toast
      toast({
        title: "Greška",
        description: "Nije moguće učitati listu korisnika",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (id: number) => {
    setRecipients(prev => 
      prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r)
    );
  };

  const selectAllByRole = (role: string) => {
    setRecipients(prev =>
      prev.map(r => r.role === role ? { ...r, selected: true } : r)
    );
  };

  const deselectAll = () => {
    setRecipients(prev => prev.map(r => ({ ...r, selected: false })));
  };

  const sendBulkSMS = async () => {
    const selectedRecipients = recipients.filter(r => r.selected);
    
    if (selectedRecipients.length === 0) {
      toast({
        title: "Greška",
        description: "Molimo izaberite najmanje jednog primaoca",
        variant: "destructive"
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Greška", 
        description: "Molimo unesite poruku",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    setResults([]);

    try {
      const response = await apiRequest('/api/admin/sms-bulk', {
        method: 'POST',
        body: JSON.stringify({
          recipients: selectedRecipients.map(r => ({ phone: r.phone, name: r.name })),
          message: message.trim(),
          type: selectedTemplate
        })
      });

      const result = await response.json();
      setResults(result.results || []);
      
      const successCount = result.results?.filter((r: SMSResult) => r.success).length || 0;
      
      toast({
        title: "SMS poslat",
        description: `Uspešno poslato na ${successCount} od ${selectedRecipients.length} brojeva`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      // Resetuj selekciju nakon uspešnog slanja
      if (successCount > 0) {
        deselectAll();
        setMessage('');
        setSelectedTemplate('custom');
      }

    } catch (error) {
      // Error handled by toast notification
      toast({
        title: "Greška",
        description: "Došlo je do greške pri slanju SMS obaveštenja",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const selectedCount = recipients.filter(r => r.selected).length;
  const roleStats = recipients.reduce((acc, r) => {
    if (!acc[r.role]) acc[r.role] = { total: 0, selected: 0 };
    acc[r.role].total++;
    if (r.selected) acc[r.role].selected++;
    return acc;
  }, {} as Record<string, { total: number; selected: number }>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Masovno SMS obaveštavanje</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template i poruka */}
        <Card>
          <CardHeader>
            <CardTitle>Kreiranje poruke</CardTitle>
            <CardDescription>
              Izaberite template ili napišite prilagođenu poruku
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Template</label>
              <Select
                value={selectedTemplate}
                onValueChange={(value) => setSelectedTemplate(value as keyof typeof SMS_TEMPLATES)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service_completed">Servis završen</SelectItem>
                  <SelectItem value="spare_part_ordered">Rezervni deo naručen</SelectItem>
                  <SelectItem value="spare_part_arrived">Rezervni deo stigao</SelectItem>
                  <SelectItem value="appointment_reminder">Podsetnik za termin</SelectItem>
                  <SelectItem value="maintenance_due">Redovan servis</SelectItem>
                  <SelectItem value="business_partner_assigned">Poslovni partner - dodela</SelectItem>
                  <SelectItem value="custom">Prilagođena poruka</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Poruka ({message.length}/160 karaktera)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Unesite poruku..."
                rows={4}
                maxLength={160}
              />
              {message.length > 140 && (
                <p className="text-sm text-amber-600 mt-1">
                  Blizu ste limita od 160 karaktera
                </p>
              )}
            </div>

            {selectedTemplate !== 'custom' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Template sadrži placeholdere poput {'{clientName}'} koji će biti zamenjeni stvarnim podacima
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Selekcija primaoca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Primaoci ({selectedCount} izabrano)
            </CardTitle>
            <CardDescription>
              Izaberite korisnike kojima želite da pošaljete SMS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Statistike po ulogama */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(roleStats).map(([role, stats]) => (
                <div key={role} className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => selectAllByRole(role)}
                  >
                    {role}: {stats.selected}/{stats.total}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Brze akcije */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectAllByRole('customer')}
              >
                Svi klijenti
              </Button>
              <Button
                variant="outline" 
                size="sm"
                onClick={() => selectAllByRole('technician')}
              >
                Svi tehničari
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
              >
                Poništi sve
              </Button>
            </div>

            {/* Lista korisnika */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {loading ? (
                <p className="text-center text-muted-foreground">Učitavanje...</p>
              ) : recipients.length === 0 ? (
                <p className="text-center text-muted-foreground">Nema korisnika sa telefonskim brojevima</p>
              ) : (
                recipients.map((recipient) => (
                  <div key={recipient.id} className="flex items-center gap-2 p-2 rounded border">
                    <Checkbox
                      checked={recipient.selected}
                      onCheckedChange={() => toggleRecipient(recipient.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{recipient.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {recipient.phone}
                        <Badge variant="secondary" className="ml-2">
                          {recipient.role}
                        </Badge>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dugme za slanje */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Poslati SMS na {selectedCount} brojeva
              </p>
              <p className="text-xs text-muted-foreground">
                Procenjena cena: ~{(selectedCount * 0.05).toFixed(2)} EUR
              </p>
            </div>
            <Button
              onClick={sendBulkSMS}
              disabled={sending || selectedCount === 0 || !message.trim()}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Šalje se...' : 'Pošalji SMS'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rezultati slanja */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rezultati slanja</CardTitle>
            <CardDescription>
              Pregled statusa za svaki poslat SMS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded border">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{result.name}</p>
                    <p className="text-sm text-muted-foreground">{result.phone}</p>
                    {result.success && result.messageId && (
                      <p className="text-xs text-green-600">ID: {result.messageId}</p>
                    )}
                    {!result.success && result.error && (
                      <p className="text-xs text-red-600">{result.error}</p>
                    )}
                  </div>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Poslato" : "Greška"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}