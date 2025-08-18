import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, Smartphone, X, Check, Info } from 'lucide-react';
import { usePWA } from '@/lib/pwa-manager';
import { useToast } from '@/hooks/use-toast';

interface PWAInstallPromptProps {
  className?: string;
}

export function PWAInstallPrompt({ className = '' }: PWAInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const pwa = usePWA();
  const { toast } = useToast();

  useEffect(() => {
    // Prikaži prompt ako je aplikacija ready za instalaciju
    if (pwa.isInstallable && !pwa.isInstalled) {
      setShowPrompt(true);
    }

    // Listen za PWA events
    const handleInstallable = () => setShowPrompt(true);
    const handleInstalled = () => {
      setShowPrompt(false);
      toast({
        title: 'Aplikacija instalirana',
        description: 'Servis Todosijević je uspešno instaliran na vaš uređaj.',
      });
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, [pwa.isInstallable, pwa.isInstalled, toast]);

  const handleInstall = async () => {
    try {
      const success = await pwa.promptInstall();
      
      if (success) {
        setShowPrompt(false);
        toast({
          title: 'Instalacija pokrenuta',
          description: 'Aplikacija se instalira na vaš uređaj.',
        });
      } else {
        // Pokaži manual instrukcije
        setShowInstructions(true);
      }
    } catch (error) {
      console.error('Install error:', error);
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Sakrij na 1 sat
    setTimeout(() => {
      if (pwa.isInstallable && !pwa.isInstalled) {
        setShowPrompt(true);
      }
    }, 3600000); // 1 sat
  };

  // Ne prikaži ako je već instalirana ili nije installable
  if (pwa.isInstalled || !pwa.isInstallable) {
    return null;
  }

  return (
    <>
      {/* Install Prompt Banner */}
      {showPrompt && (
        <Card className={`${className} border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">
                    Instaliraj aplikaciju
                    <Badge variant="secondary" className="ml-2">Preporučeno</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Koristite Servis Todosijević kao native aplikaciju na vašem uređaju
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleInstall}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Instaliraj
              </Button>
              
              <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className="w-4 h-4 mr-1" />
                    Instrukcije
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5" />
                      Kako instalirati aplikaciju
                    </DialogTitle>
                    <DialogDescription>
                      Pratite instrukcije za vaš uređaj ({pwa.installInstructions.platform})
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-3">
                    {pwa.installInstructions.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full text-xs font-medium text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-center pt-4">
                    <Button onClick={() => setShowInstructions(false)}>
                      <Check className="w-4 h-4 mr-2" />
                      Razumem
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// Mini floating install button
export function PWAInstallButton() {
  const pwa = usePWA();
  const { toast } = useToast();

  if (pwa.isInstalled || !pwa.isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    try {
      const success = await pwa.promptInstall();
      
      if (!success) {
        toast({
          title: 'Manual instalacija',
          description: 'Koristite browser meni da instalirate aplikaciju.',
        });
      }
    } catch (error) {
      console.error('Install error:', error);
    }
  };

  return (
    <Button
      onClick={handleInstall}
      size="sm"
      className="fixed bottom-4 right-4 z-50 shadow-lg"
      title="Instaliraj aplikaciju"
    >
      <Download className="w-4 h-4 mr-2" />
      Instaliraj
    </Button>
  );
}