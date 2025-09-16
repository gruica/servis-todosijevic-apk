import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Tablet, 
  QrCode, 
  Copy, 
  Mail, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  ExternalLink
} from "lucide-react";

interface DownloadStats {
  total: number;
  byDevice: {
    android: number;
    ios: number;
    desktop: number;
    unknown: number;
  };
  lastUpdated: string;
  recentDownloads: Array<{
    timestamp: string;
    device: string;
    hasUserAgent: boolean;
  }>;
}

type DeviceType = 'android' | 'ios' | 'desktop' | 'unknown';

export default function DownloadAppPage() {
  const [device, setDevice] = useState<DeviceType>('unknown');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const { toast } = useToast();

  // Fetch download statistics
  const { data: stats, refetch: refetchStats } = useQuery<DownloadStats>({
    queryKey: ['/api/downloads/stats'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Device detection
  useEffect(() => {
    const detectDevice = (): DeviceType => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('android')) return 'android';
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
      if (userAgent.includes('windows') || userAgent.includes('macintosh') || userAgent.includes('linux')) {
        return 'desktop';
      }
      return 'unknown';
    };

    setDevice(detectDevice());
    
    // Add meta tags for SEO
    document.title = 'Preuzmite FrigoSistem aplikaciju - Profesionalni servis bele tehnike';
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'Preuzmite FrigoSistem mobilnu aplikaciju za Android uređaje. Profesionalni servis bele tehnike u Crnoj Gori sa preko 15 godina iskustva.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Preuzmite FrigoSistem mobilnu aplikaciju za Android uređaje. Profesionalni servis bele tehnike u Crnoj Gori sa preko 15 godina iskustva.';
      document.head.appendChild(meta);
    }

    // Open Graph tags
    const addMetaTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    addMetaTag('og:title', 'FrigoSistem - Mobilna aplikacija');
    addMetaTag('og:description', 'Preuzmite našu mobilnu aplikaciju za lakši pristup servisima bele tehnike');
    addMetaTag('og:type', 'website');
    addMetaTag('og:url', window.location.href);
    
  }, []);

  // Generate QR codes
  useEffect(() => {
    const generateQRCodes = async () => {
      if (device === 'desktop' || device === 'unknown') {
        setIsGeneratingQR(true);
        try {
          const landingUrl = `${window.location.origin}/download-app`;
          const downloadUrl = `${window.location.origin}/api/downloads/apk`;
          
          // Generate QR for direct download
          const response = await fetch(`/api/downloads/qr?url=${encodeURIComponent(downloadUrl)}&size=250`);
          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setQrCodeUrl(url);
          }
        } catch (error) {
          console.error('Failed to generate QR code:', error);
        } finally {
          setIsGeneratingQR(false);
        }
      }
    };

    generateQRCodes();

    // Cleanup
    return () => {
      if (qrCodeUrl) {
        URL.revokeObjectURL(qrCodeUrl);
      }
    };
  }, [device]);

  // Handle download
  const handleDownload = async () => {
    setDownloadStarted(true);
    
    try {
      // Track download attempt
      const downloadUrl = '/api/downloads/apk';
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'FrigoSistem-v1.0.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      toast({
        title: "Preuzimanje započeto",
        description: "APK fajl se preuzima. Omogućite instalaciju iz nepoznatih izvora u postavkama.",
      });

      // Refresh stats after a short delay
      setTimeout(() => {
        refetchStats();
      }, 2000);

    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Greška",
        description: "Preuzimanje nije uspešno. Molimo pokušajte ponovo.",
        variant: "destructive",
      });
    } finally {
      setDownloadStarted(false);
    }
  };

  // Copy link to clipboard
  const copyLink = async (url: string, type: 'landing' | 'direct') => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link kopiran",
        description: `${type === 'landing' ? 'Landing' : 'Download'} link je kopiran u clipboard.`,
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Greška",
        description: "Nije moguće kopirati link. Molimo pokušajte ponovo.",
        variant: "destructive",
      });
    }
  };

  // Share via email
  const shareViaEmail = () => {
    const subject = encodeURIComponent('FrigoSistem - Mobilna aplikacija');
    const body = encodeURIComponent(`Preuzmite FrigoSistem mobilnu aplikaciju:\n\n${window.location.origin}/download-app\n\nIli direktno preuzmite APK:\n${window.location.origin}/api/downloads/apk`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Get device icon
  const getDeviceIcon = (deviceType: DeviceType) => {
    switch (deviceType) {
      case 'android': return <Smartphone className="h-5 w-5" />;
      case 'ios': return <Tablet className="h-5 w-5" />;
      case 'desktop': return <Monitor className="h-5 w-5" />;
      default: return <Smartphone className="h-5 w-5" />;
    }
  };

  // Get device label
  const getDeviceLabel = (deviceType: DeviceType) => {
    switch (deviceType) {
      case 'android': return 'Android';
      case 'ios': return 'iOS';
      case 'desktop': return 'Desktop';
      default: return 'Nepoznat uređaj';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            FrigoSistem
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Profesionalna mobilna aplikacija
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Servis bele tehnike u Crnoj Gori
          </p>
        </div>

        {/* Device Detection Badge */}
        <div className="flex justify-center mb-8">
          <Badge variant="outline" className="px-4 py-2 text-sm">
            {getDeviceIcon(device)}
            <span className="ml-2" data-testid="detected-device">
              Detektovan uređaj: {getDeviceLabel(device)}
            </span>
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          {/* Main Download Section */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl mb-2">
                  Preuzmite aplikaciju
                </CardTitle>
                <CardDescription className="text-base">
                  Instalirajte FrigoSistem aplikaciju na svoj uređaj
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Android Download */}
                {device === 'android' && (
                  <div className="space-y-4" data-testid="android-download-section">
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        Vaš Android uređaj podržava APK instalaciju
                      </AlertDescription>
                    </Alert>
                    
                    <Button
                      onClick={handleDownload}
                      disabled={downloadStarted}
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg"
                      data-testid="button-download-android"
                    >
                      {downloadStarted ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Preuzimanje...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Download className="h-5 w-5 mr-2" />
                          Preuzmi APK (Android)
                        </div>
                      )}
                    </Button>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">
                        Instrukcije za instalaciju:
                      </h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                        <li>Preuzmite APK fajl</li>
                        <li>Otvorite Postavke → Sigurnost</li>
                        <li>Omogućite "Nepoznati izvori" ili "Instaliraj iz nepoznatih izvora"</li>
                        <li>Otvorite preuzeti APK fajl</li>
                        <li>Sledite instrukcije za instalaciju</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* iOS Message */}
                {device === 'ios' && (
                  <div className="space-y-4" data-testid="ios-message-section">
                    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 dark:text-orange-200">
                        iOS uređaji ne podržavaju direktnu APK instalaciju
                      </AlertDescription>
                    </Alert>

                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center">
                      <Tablet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="font-semibold mb-2">iOS aplikacija</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Za iOS uređaje, aplikacija će biti dostupna preko App Store-a.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Kontaktirajte nas za više informacija o iOS verziji.
                      </p>
                    </div>
                  </div>
                )}

                {/* Desktop/Unknown - Show QR Code */}
                {(device === 'desktop' || device === 'unknown') && (
                  <div className="space-y-6" data-testid="desktop-download-section">
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                      <Monitor className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 dark:text-blue-200">
                        Skenirajte QR kod vašim mobilnim uređajem
                      </AlertDescription>
                    </Alert>

                    <div className="text-center">
                      {isGeneratingQR ? (
                        <div className="space-y-4">
                          <Skeleton className="h-64 w-64 mx-auto rounded-lg" />
                          <p className="text-sm text-gray-500">Generiše se QR kod...</p>
                        </div>
                      ) : qrCodeUrl ? (
                        <div className="space-y-4">
                          <div className="inline-block p-4 bg-white rounded-lg shadow-lg">
                            <img 
                              src={qrCodeUrl} 
                              alt="QR Code za preuzimanje APK-a" 
                              className="h-64 w-64"
                              data-testid="qr-code-image"
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Skenirajte za direktno preuzimanje</p>
                            <p className="text-xs text-gray-500">
                              Otvorite kameru na vašem telefonu i skenirajte QR kod
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="h-64 w-64 mx-auto bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <QrCode className="h-16 w-16 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500">QR kod nije dostupan</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fallback Options */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Dodatne opcije:
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      onClick={() => copyLink(`${window.location.origin}/download-app`, 'landing')}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      data-testid="button-copy-landing"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Kopiraj stranicu
                    </Button>
                    
                    <Button
                      onClick={() => copyLink(`${window.location.origin}/api/downloads/apk`, 'direct')}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      data-testid="button-copy-direct"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Kopiraj APK link
                    </Button>
                    
                    <Button
                      onClick={shareViaEmail}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      data-testid="button-share-email"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Pošaljite email
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Statistike preuzimanja
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats ? (
                  <>
                    {/* Total Downloads */}
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-total-downloads">
                        {stats.total}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Ukupno preuzimanja
                      </div>
                    </div>

                    {/* Device Breakdown */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Po uređajima:
                      </h4>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-sm">
                            <Smartphone className="h-4 w-4 mr-2 text-green-600" />
                            Android
                          </div>
                          <Badge variant="secondary" data-testid="stat-android">
                            {stats.byDevice.android}
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-sm">
                            <Tablet className="h-4 w-4 mr-2 text-blue-600" />
                            iOS
                          </div>
                          <Badge variant="secondary" data-testid="stat-ios">
                            {stats.byDevice.ios}
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-sm">
                            <Monitor className="h-4 w-4 mr-2 text-purple-600" />
                            Desktop
                          </div>
                          <Badge variant="secondary" data-testid="stat-desktop">
                            {stats.byDevice.desktop}
                          </Badge>
                        </div>

                        {stats.byDevice.unknown > 0 && (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center text-sm">
                              <Users className="h-4 w-4 mr-2 text-gray-600" />
                              Ostalo
                            </div>
                            <Badge variant="secondary" data-testid="stat-unknown">
                              {stats.byDevice.unknown}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Last Updated */}
                    <div className="pt-3 border-t text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Ažurirano: {new Date(stats.lastUpdated).toLocaleString('sr-RS')}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* App Info Card */}
            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur mt-6">
              <CardHeader>
                <CardTitle className="text-lg">O aplikaciji</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Verzija:</span>
                  <span className="font-medium">v1.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Platforma:</span>
                  <span className="font-medium">Android</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Veličina:</span>
                  <span className="font-medium">~12 MB</span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Profesionalni servis bele tehnike sa preko 15 godina iskustva u Crnoj Gori.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}