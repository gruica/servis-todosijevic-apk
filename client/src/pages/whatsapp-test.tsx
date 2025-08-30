import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Image, Send, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface WhatsAppTestProps {}

export default function WhatsAppTest(): React.ReactElement {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !message) {
      toast({
        title: "Greška",
        description: "Broj telefona i poruka su obavezni",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const endpoint = imageUrl ? '/api/sms-mobile-api/whatsapp-with-image' : '/api/sms-mobile-api/send';
      const payload = {
        phoneNumber,
        message,
        ...(imageUrl && { imageUrl }),
        ...(serviceId && { serviceId }),
        whatsappOnly: true
      };

      console.log('📤 Šaljem WhatsApp poruku:', payload);
      
      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      toast({
        title: "Uspeh! ✅",
        description: `WhatsApp poruka je uspešno poslata${imageUrl ? ' sa slikom' : ''}`,
      });

      // Očisti formu
      setPhoneNumber('');
      setMessage('');
      setImageUrl('');
      setServiceId('');
      
    } catch (error: any) {
      console.error('❌ Greška pri slanju WhatsApp poruke:', error);
      toast({
        title: "Greška",
        description: error.message || "Greška pri slanju WhatsApp poruke",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Test Sistem
          </CardTitle>
          <CardDescription>
            Testiranje WhatsApp integracije sa SMS Mobile API
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSendWhatsApp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Broj Telefona *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="067123456 ili +381671234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
              <p className="text-sm text-gray-500">
                Unesite broj telefona (automatski će se formatirati)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Poruka *</Label>
              <Textarea
                id="message"
                placeholder="Unesite poruku za WhatsApp..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                URL Slike (opciono)
              </Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                Dodaj HTTPS URL do slike za slanje preko WhatsApp-a
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceId">ID Servisa (opciono)</Label>
              <Input
                id="serviceId"
                type="number"
                placeholder="123"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                Za povezivanje sa određenim servisom
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Šalje se...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {imageUrl ? 'Pošalji WhatsApp sa Slikom' : 'Pošalji WhatsApp Poruku'}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">🔧 Tehnička Objašnjenja</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div><strong>SMS Mobile API:</strong> smsmobileapi.com</div>
          <div><strong>WhatsApp Support:</strong> ✅ Punom podrškom</div>
          <div><strong>Media Upload:</strong> ✅ url_media parametar</div>
          <div><strong>Format broja:</strong> Automatski formatiranje za Srbiju (+382)</div>
          <div><strong>Only WhatsApp:</strong> ✅ waonly=yes parametar</div>
        </CardContent>
      </Card>
    </div>
  );
}