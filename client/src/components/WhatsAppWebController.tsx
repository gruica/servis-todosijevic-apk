import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  QrCode, 
  Send, 
  MessageSquare, 
  Users, 
  RefreshCw,
  Power,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface WhatsAppWebStatus {
  isConnected: boolean;
  qrCode: string | null;
}

interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
  pushname: string;
  isMyContact: boolean;
  isWAContact: boolean;
}

interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  timestamp: number;
  unreadCount: number;
}

export function WhatsAppWebController() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [targetPhoneNumber, setTargetPhoneNumber] = useState('');
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);

  // Query za status WhatsApp Web konekcije
  const { data: status, refetch: refetchStatus } = useQuery<WhatsAppWebStatus>({
    queryKey: ['/api/whatsapp-web/status'],
    refetchInterval: 5000, // Refresh svake 5 sekundi
    retry: false
  });

  // Query za kontakte - samo ako je povezan
  const { data: contacts = [], refetch: refetchContacts } = useQuery<WhatsAppContact[]>({
    queryKey: ['/api/whatsapp-web/contacts'],
    enabled: status?.isConnected === true,
    retry: false
  });

  // Query za chat-ove - samo ako je povezan
  const { data: chats = [], refetch: refetchChats } = useQuery<WhatsAppChat[]>({
    queryKey: ['/api/whatsapp-web/chats'],
    enabled: status?.isConnected === true,
    retry: false
  });

  // Mutation za pokretanje WhatsApp Web klijenta
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token found');

      const response = await fetch('/api/whatsapp-web/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Greška pri pokretanju WhatsApp Web');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ WhatsApp Web pokrenut",
        description: "Skeniraj QR kod sa telefona da se povežeš",
      });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška",
        description: error.message || 'Greška pri pokretanju WhatsApp Web',
        variant: "destructive",
      });
    }
  });

  // Mutation za slanje poruke
  const sendMessageMutation = useMutation({
    mutationFn: async ({ phoneNumber, message }: { phoneNumber: string; message: string }) => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token found');

      const response = await fetch('/api/whatsapp-web/send-message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber, message })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Greška pri slanju poruke');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Poruka poslata",
        description: "WhatsApp poruka je uspešno poslata",
      });
      setMessageText('');
      refetchChats();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška pri slanju",
        description: error.message || 'Greška pri slanju WhatsApp poruke',
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    const phoneNumber = selectedContact?.number || targetPhoneNumber;
    
    if (!phoneNumber || !messageText.trim()) {
      toast({
        title: "⚠️ Upozorenje",
        description: "Broj telefona i poruka su obavezni",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({ phoneNumber, message: messageText.trim() });
  };

  const formatLastSeen = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('sr-RS');
  };

  const ConnectionStatusCard = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          WhatsApp Web Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Konekcija:</span>
          <Badge variant={status?.isConnected ? "default" : "secondary"} className="flex items-center gap-1">
            {status?.isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                Povezan
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Nije povezan
              </>
            )}
          </Badge>
        </div>

        {!status?.isConnected && (
          <div className="space-y-3">
            <Button 
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
              className="w-full"
            >
              {initializeMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Pokretanje...
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Pokreni WhatsApp Web
                </>
              )}
            </Button>

            {status?.qrCode && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <QrCode className="h-4 w-4" />
                  Skeniraj QR kod sa telefona
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <img 
                    src={status.qrCode} 
                    alt="WhatsApp QR Code" 
                    className="mx-auto w-48 h-48"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Otvori WhatsApp na telefonu → Linkovi uređaji → Skeniraj QR kod
                </p>
              </div>
            )}
          </div>
        )}

        {status?.isConnected && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              WhatsApp Web je uspešno povezan sa vašim telefonom
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {contacts.length} kontakata
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {chats.length} chat-ova
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const MessageSenderCard = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="h-5 w-5" />
          Pošalji WhatsApp poruku
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.isConnected ? (
          <div className="text-center text-muted-foreground py-4">
            <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>WhatsApp Web mora biti povezan da bi slao poruke</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Broj telefona:</label>
              <Input
                value={targetPhoneNumber}
                onChange={(e) => setTargetPhoneNumber(e.target.value)}
                placeholder="npr. 0691234567"
                disabled={!!selectedContact}
              />
              {selectedContact && (
                <div className="flex items-center justify-between bg-blue-50 p-2 rounded text-sm">
                  <span>{selectedContact.name || selectedContact.number}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedContact(null)}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Poruka:</label>
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Unesite poruku..."
                className="min-h-[100px]"
                maxLength={1000}
              />
              <div className="text-xs text-muted-foreground text-right">
                {messageText.length}/1000 karaktera
              </div>
            </div>

            <Button 
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending || !messageText.trim()}
              className="w-full"
            >
              {sendMessageMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Šalje se...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Pošalji poruku
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );

  const ContactsCard = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          WhatsApp kontakti ({contacts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!status?.isConnected ? (
          <div className="text-center text-muted-foreground py-4">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Kontakti se učitavaju nakon povezivanja</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <p>Nema dostupnih kontakata</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {contacts.slice(0, 50).map((contact) => (
              <div 
                key={contact.id}
                className={`p-2 rounded cursor-pointer border transition-colors ${
                  selectedContact?.id === contact.id 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50 border-transparent'
                }`}
                onClick={() => {
                  setSelectedContact(contact);
                  setTargetPhoneNumber(contact.number);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {contact.name || contact.pushname || contact.number}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {contact.number}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {contact.isMyContact && (
                      <Badge variant="outline" className="text-xs">Kontakt</Badge>
                    )}
                    {contact.isWAContact && (
                      <Badge variant="secondary" className="text-xs">WhatsApp</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Status konekcije */}
      <ConnectionStatusCard />

      {/* Slanje poruka */}
      <MessageSenderCard />

      {/* Lista kontakata */}
      <ContactsCard />
    </div>
  );
}