import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Settings,
  Palette,
  Globe,
  Bell,
  Shield,
  Moon,
  Sun,
  Smartphone
} from "lucide-react";
import { Link } from "wouter";

interface UserSettings {
  theme: "light" | "dark" | "system";
  language: "sr" | "en";
  notifications_enabled: boolean;
  push_notifications: boolean;
  auto_logout_minutes: number;
  sound_notifications: boolean;
}

export default function TechnicianSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>({
    theme: "system",
    language: "sr",
    notifications_enabled: true,
    push_notifications: true,
    auto_logout_minutes: 60,
    sound_notifications: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Učitaj postavke iz localStorage ili API-ja
    const savedSettings = localStorage.getItem('technician_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Sačuvaj u localStorage (ili pošalji na API)
      localStorage.setItem('technician_settings', JSON.stringify(settings));
      
      // Primeni tema odmah
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      }

      toast({
        title: "Postavke sačuvane",
        description: "Vaše postavke su uspešno sačuvane"
      });
    } catch (error) {
      toast({
        title: "Greška",
        description: "Greška pri čuvanju postavki",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    const defaultSettings: UserSettings = {
      theme: "system",
      language: "sr",
      notifications_enabled: true,
      push_notifications: true,
      auto_logout_minutes: 60,
      sound_notifications: false
    };
    setSettings(defaultSettings);
    toast({
      title: "Postavke resetovane",
      description: "Vraćene su default postavke"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/tech">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-6 w-6 text-gray-600" />
              Postavke
            </h1>
            <p className="text-gray-600">Konfiguracija aplikacije i preferences</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Tema i izgled */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-600" />
                Tema i izgled
              </CardTitle>
              <CardDescription>
                Personalizujte izgled aplikacije
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Tema aplikacije</Label>
                  <p className="text-sm text-gray-500">Izaberite svetlu, tamnu ili sistem temu</p>
                </div>
                <Select
                  value={settings.theme}
                  onValueChange={(value: "light" | "dark" | "system") => 
                    setSettings(prev => ({ ...prev, theme: value }))
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Svetla
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Tamna
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Sistem
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Jezik */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Jezik i lokalizacija
              </CardTitle>
              <CardDescription>
                Postavke jezika aplikacije
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Jezik aplikacije</Label>
                  <p className="text-sm text-gray-500">Trenutno podržani: srpski, engleski</p>
                </div>
                <Select
                  value={settings.language}
                  onValueChange={(value: "sr" | "en") => 
                    setSettings(prev => ({ ...prev, language: value }))
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sr">🇷🇸 Srpski</SelectItem>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Obaveštenja */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-yellow-600" />
                Obaveštenja
              </CardTitle>
              <CardDescription>
                Kontrolišite kako primate obaveštenja
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Omogući obaveštenja</Label>
                  <p className="text-sm text-gray-500">Primaj obaveštenja o novim servisima</p>
                </div>
                <Switch
                  checked={settings.notifications_enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, notifications_enabled: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Push notifikacije</Label>
                  <p className="text-sm text-gray-500">Instant poruke na mobilnom uređaju</p>
                </div>
                <Switch
                  checked={settings.push_notifications}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, push_notifications: checked }))
                  }
                  disabled={!settings.notifications_enabled}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Zvučna obaveštenja</Label>
                  <p className="text-sm text-gray-500">Reprodukuj zvuk za važne poruke</p>
                </div>
                <Switch
                  checked={settings.sound_notifications}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, sound_notifications: checked }))
                  }
                  disabled={!settings.notifications_enabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bezbednost */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                Bezbednost i sesija
              </CardTitle>
              <CardDescription>
                Postavke vezane za bezbednost pristupa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Automatska odjava</Label>
                  <p className="text-sm text-gray-500">Odjavi se nakon neaktivnosti</p>
                </div>
                <Select
                  value={settings.auto_logout_minutes.toString()}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, auto_logout_minutes: parseInt(value) }))
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minuta</SelectItem>
                    <SelectItem value="30">30 minuta</SelectItem>
                    <SelectItem value="60">1 sat</SelectItem>
                    <SelectItem value="120">2 sata</SelectItem>
                    <SelectItem value="0">Nikad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={saveSettings} 
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? "Čuvam..." : "Sačuvaj postavke"}
            </Button>
            <Button 
              variant="outline" 
              onClick={resetSettings}
              className="flex-1"
            >
              Resetuj na default
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}