import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';

interface WhatsAppMessengerProps {
  serviceId: number;
  clientPhone: string;
  clientName: string;
  readOnly?: boolean;
}

interface SendMessagePayload {
  phoneNumber: string;
  message: string;
  serviceId: number;
  sendWhatsApp: true;
  whatsappOnly: true;
}

// Predefinisane brze poruke template-ovi
const MESSAGE_TEMPLATES = {
  service_completed: 'Poštovani {clientName}, obaveštavamo vas da je servis završen i aparat je spreman za preuzimanje. Hvala vam! - Frigo Sistem Todosijević',
  parts_needed: 'Poštovani {clientName}, obaveštavamo vas da su potrebni rezervni delovi za servis. Kontaktiraće vas naš tehničar. Hvala! - Frigo Sistem Todosijević',
  scheduled_visit: 'Poštovani {clientName}, zakazana je poseta našeg tehničara. Kontaktiraće vas radi dogovora termina. Hvala! - Frigo Sistem Todosijević',
  quote_ready: 'Poštovani {clientName}, pripremili smo procenu troškova za servis. Molimo vas kontaktirajte nas. Hvala! - Frigo Sistem Todosijević',
  warranty_info: 'Poštovani {clientName}, obaveštavamo vas o statusu garancije za vaš aparat. Detalje možete dobiti pozivom. Hvala! - Frigo Sistem Todosijević'
};

const TEMPLATE_LABELS = {
  service_completed: '✅ Servis završen',
  parts_needed: '🔧 Potrebni delovi',
  scheduled_visit: '📅 Zakazana poseta',
  quote_ready: '💰 Procena spremna',
  warranty_info: 'ℹ️ Garancija info'
};

export function WhatsAppMessenger({ serviceId, clientPhone, clientName, readOnly = false }: WhatsAppMessengerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  // Mutation za slanje WhatsApp poruke
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: SendMessagePayload) => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token found');

      // Timeout handling sa AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sekundi timeout

      try {
        const response = await fetch('/api/sms-mobile-api/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Safe JSON parsing sa content-type proveri
          let errorMessage = 'Greška pri slanju WhatsApp poruke';
          const contentType = response.headers.get('content-type');
          
          if (contentType?.includes('application/json')) {
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch (parseError) {
              errorMessage = `Server greška: ${response.status} ${response.statusText}`;
            }
          } else {
            errorMessage = `Server greška: ${response.status} ${response.statusText}`;
          }
          
          throw new Error(errorMessage);
        }

        return response.json();
        
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Timeout - server ne odgovara nakon 30 sekundi');
        }
        
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "✅ WhatsApp poruka poslata",
        description: `Poruka je uspešno poslata klijentu ${clientName}`,
        variant: "default",
      });
      
      setMessage('');
      setSelectedTemplate('');
      
      // Invalidate conversation history da se osveži
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conversations/${serviceId}/history`] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška pri slanju",
        description: error.message || 'Neočekivana greška',
        variant: "destructive",
      });
    }
  });

  // Ukloni zemlje kod i formatuj broj
  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    
    // Ukloni +381 ili 381 prefiks
    if (cleaned.startsWith('381')) {
      cleaned = cleaned.substring(3);
    }
    
    // Dodaj 381 prefiks
    return '381' + cleaned;
  };

  // Zameni placeholder-e u template-u
  const replaceTemplatePlaceholders = (template: string): string => {
    return template.replace('{clientName}', clientName);
  };

  // Handle template selection
  const handleTemplateSelect = (templateKey: string) => {
    if (templateKey && MESSAGE_TEMPLATES[templateKey as keyof typeof MESSAGE_TEMPLATES]) {
      const templateText = MESSAGE_TEMPLATES[templateKey as keyof typeof MESSAGE_TEMPLATES];
      const processedText = replaceTemplatePlaceholders(templateText);
      setMessage(processedText);
      setSelectedTemplate(templateKey);
    } else {
      setSelectedTemplate('');
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "⚠️ Upozorenje",
        description: "Poruka ne može biti prazna",
        variant: "destructive",
      });
      return;
    }

    if (!clientPhone) {
      toast({
        title: "⚠️ Upozorenje", 
        description: "Broj telefona klijenta nije dostupan",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const payload: SendMessagePayload = {
        phoneNumber: formatPhoneNumber(clientPhone),
        message: message.trim(),
        serviceId,
        sendWhatsApp: true,
        whatsappOnly: true
      };

      await sendMessageMutation.mutateAsync(payload);
    } finally {
      setIsSending(false);
    }
  };

  if (readOnly) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp Komunikacija (Read-Only)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            WhatsApp poruke se mogu slati samo iz admin panela.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-green-600" />
          Pošalji WhatsApp poruku
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          Klijent: <span className="font-medium">{clientName}</span> • 
          Telefon: <span className="font-medium">{clientPhone}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Template Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Brze poruke</label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Izaberite predefinisanu poruku..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Message Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Poruka</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Unesite WhatsApp poruku..."
            className="min-h-[100px] resize-none"
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {message.length}/500 karaktera
          </div>
        </div>

        {/* Send Button */}
        <Button 
          onClick={handleSendMessage}
          disabled={isSending || !message.trim()}
          className="w-full"
          size="sm"
        >
          {isSending ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Šalje se...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Pošalji WhatsApp poruku
            </>
          )}
        </Button>

        {/* Info Badge */}
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="text-xs">
            <MessageSquare className="h-3 w-3 mr-1" />
            Automatski conversation tracking
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}