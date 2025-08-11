import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, MessageSquare, Bell, Smartphone } from "lucide-react";

interface SMSSettings {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  senderId?: string;
  defaultMessage: string;
  notificationEnabled: boolean;
}

export default function SMSSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SMSSettings>({
    enabled: true,
    apiKey: '',
    baseUrl: 'https://api.smsmobileapi.com',
    senderId: '',
    defaultMessage: 'Frigo Sistem Todosijević - Vaš servis je ažuriran.',
    notificationEnabled: true
  });

  // Fetch current SMS settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['/api/admin/sms-settings'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/sms-settings', { method: 'GET' });
      return response.json();
    },
    onSuccess: (data) => {
      if (data) {
        setSettings(prev => ({ ...prev, ...data }));
      }
    }
  });

  // Update SMS settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: SMSSettings) => {
      const response = await apiRequest('/api/admin/sms-settings', {
        method: 'PUT',
        body: JSON.stringify(newSettings)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno sačuvano",
        description: "SMS podešavanja su uspešno ažurirana.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sms-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Greška pri čuvanju",
        description: error.message || "Došlo je do greške pri čuvanju podešavanja.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleTestSMS = async () => {
    try {
      const response = await apiRequest('/api/admin/sms-test', {
        method: 'POST',
        body: JSON.stringify({ 
          phone: '+38169123456', // Test phone number
          message: 'Test poruka iz admin panela - Frigo Sistem'
        })
      });
      
      if (response.ok) {
        toast({
          title: "Test SMS poslat",
          description: "Test SMS poruka je uspešno poslata.",
        });
      } else {
        throw new Error('SMS test failed');
      }
    } catch (error: any) {
      toast({
        title: "Greška pri testiranju",
        description: "Test SMS poruka nije mogla biti poslata.",
        variant: "destructive",
      });
    }
  };

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
            <Settings className="h-8 w-8" />
            SMS Podešavanja
          </h1>
          <p className="text-muted-foreground mt-1">
            Konfigurišite SMS notifikacije i poruke za klijente
          </p>
        </div>

        <div className="grid gap-6">
          {/* Main SMS Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Osnovna SMS konfiguracija
              </CardTitle>
              <CardDescription>
                Podešavanja za SMS Mobile API servis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="sms-enabled">SMS servis omogućen</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Ključ *</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Unesite SMS Mobile API ključ"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base-url">Base URL</Label>
                  <Input
                    id="base-url"
                    value={settings.baseUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder="https://api.smsmobileapi.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender-id">Sender ID (opcionalno)</Label>
                <Input
                  id="sender-id"
                  value={settings.senderId || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, senderId: e.target.value }))}
                  placeholder="FRIGO SYS"
                  maxLength={11}
                />
                <p className="text-sm text-muted-foreground">
                  Maksimalno 11 karaktera. Ostaviti prazno za automatski broj.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Message Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Templati poruka
              </CardTitle>
              <CardDescription>
                Standardne poruke za različite tipove notifikacija
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-message">Standardna poruka</Label>
                <Textarea
                  id="default-message"
                  value={settings.defaultMessage}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultMessage: e.target.value }))}
                  placeholder="Unesite standardnu SMS poruku"
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Ova poruka će biti korišćena kao osnova za SMS notifikacije.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.notificationEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notificationEnabled: checked }))}
                />
                <Label>Automatske notifikacije omogućene</Label>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Akcije
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button 
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? "Čuvanje..." : "Sačuvaj podešavanja"}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleTestSMS}
                disabled={!settings.enabled || !settings.apiKey}
              >
                Pošalji test SMS
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}