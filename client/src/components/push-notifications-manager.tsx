import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Smartphone, Zap } from 'lucide-react';
import { pushNotificationManager } from '@/lib/push-notifications';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationsManagerProps {
  className?: string;
}

export function PushNotificationsManager({ className = '' }: PushNotificationsManagerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationSupport();
  }, []);

  const checkNotificationSupport = async () => {
    setIsLoading(true);
    
    try {
      // Provjeri podršku za notifikacije
      const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);

      if (!supported) {
        setIsLoading(false);
        return;
      }

      // Inicijalizuj push notification manager
      const initialized = await pushNotificationManager.initialize();
      if (!initialized) {
        setIsSupported(false);
        setIsLoading(false);
        return;
      }

      // Provjeri trenutnu dozvolu
      setPermission(Notification.permission);

      // Provjeri da li je korisnik subscribed
      const subscribed = await pushNotificationManager.isSubscribed();
      setIsSubscribed(subscribed);

    } catch (error) {
      console.error('Greška pri provjeri podrške za notifikacije:', error);
      setIsSupported(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);

    try {
      const success = await pushNotificationManager.subscribe();
      
      if (success) {
        setIsSubscribed(true);
        setPermission('granted');
        toast({
          title: 'Push notifikacije omogućene',
          description: 'Sada ćete primati notifikacije čak i kada je aplikacija zatvorena.',
        });
      } else {
        toast({
          title: 'Greška',
          description: 'Nije moguće omogućiti push notifikacije. Molimo pokušajte ponovo.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Greška pri omogućavanju notifikacija:', error);
      toast({
        title: 'Greška',
        description: 'Došlo je do greške pri omogućavanju notifikacija.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);

    try {
      const success = await pushNotificationManager.unsubscribe();
      
      if (success) {
        setIsSubscribed(false);
        toast({
          title: 'Push notifikacije onemogućene',
          description: 'Neće te više primati push notifikacije.',
        });
      } else {
        toast({
          title: 'Greška',
          description: 'Nije moguće onemogućiti push notifikacije.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Greška pri onemogućavanju notifikacija:', error);
      toast({
        title: 'Greška',
        description: 'Došlo je do greške pri onemogućavanju notifikacija.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showTestNotification = async () => {
    try {
      await pushNotificationManager.showLocalNotification({
        title: 'Test notifikacija',
        body: 'Ovo je test notifikacija da provjerimo da sve funkcioniše.',
        data: {
          type: 'test',
          timestamp: Date.now()
        }
      });
      
      toast({
        title: 'Test notifikacija poslana',
        description: 'Lokalna test notifikacija je prikazana.',
      });
    } catch (error) {
      console.error('Greška pri test notifikaciji:', error);
      toast({
        title: 'Greška',
        description: 'Nije moguće prikazati test notifikaciju.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifikacije
          </CardTitle>
          <CardDescription>
            Provjeravam podršku za notifikacije...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5 text-gray-400" />
            Push Notifikacije
          </CardTitle>
          <CardDescription>
            Vaš browser ne podržava push notifikacije ili ova funkcionalnost nije dostupna.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Smartphone className="w-4 h-4" />
            Molimo koristite moderne browser poput Chrome, Firefox ili Safari
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Notifikacije
          <Badge variant={isSubscribed ? "default" : "secondary"}>
            {isSubscribed ? 'Omogućene' : 'Onemogućene'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Primajte notifikacije o novim servisima čak i kada je aplikacija zatvorena.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            permission === 'granted' ? 'bg-green-500' : 
            permission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          <span>
            Dozvola: {
              permission === 'granted' ? 'Dozvoljena' :
              permission === 'denied' ? 'Odbijena' : 'Čeka odgovor'
            }
          </span>
        </div>

        <div className="flex gap-2">
          {!isSubscribed ? (
            <Button 
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Omogući notifikacije
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={handleDisableNotifications}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <BellOff className="w-4 h-4" />
              Onemogući notifikacije
            </Button>
          )}

          {isSubscribed && (
            <Button 
              variant="outline"
              onClick={showTestNotification}
              className="flex items-center gap-2"
            >
              Test notifikacija
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
          💡 <strong>Napomena:</strong> Push notifikacije rade čak i kada je aplikacija zatvorena ili minimizovana. 
          Korisno je za tehničare koji trebaju da budu obavešteni o novim servisima u realnom vremenu.
        </div>
      </CardContent>
    </Card>
  );
}