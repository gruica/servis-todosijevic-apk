import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Mail, 
  MessageSquare, 
  Settings, 
  Play, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Truck,
  Package,
  Users,
  Calendar
} from "lucide-react";

interface ServisKomercStats {
  totalCompletedServices: number;
  totalVisitedClients: number;
  totalPartsUsed: number;
  totalRevenue: string;
  reportDate: string;
}

export default function ServisKomerc() {
  const [testEmailAddress, setTestEmailAddress] = useState("servis.komerc@example.com");
  const [isTestingReport, setIsTestingReport] = useState(false);
  const [isTestingNotifications, setIsTestingNotifications] = useState(false);
  const { toast } = useToast();

  // Test dnevni izvještaj mutation
  const testDailyReportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/admin/servis-komerc/test-daily-report");
      return await res.json();
    },
    onSuccess: (data: { success: boolean; message: string; data: ServisKomercStats }) => {
      if (data.success) {
        toast({
          title: "✅ Test uspešan",
          description: data.message,
        });
      } else {
        throw new Error(data.message);
      }
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška",
        description: error.message || "Greška pri testiranju dnevnog izvještaja",
        variant: "destructive",
      });
    },
  });

  // Ručno pokretanje dnevnog izvještaja mutation
  const manualDailyReportMutation = useMutation({
    mutationFn: async ({ emailAddress }: { emailAddress: string }) => {
      const res = await apiRequest("/api/admin/servis-komerc/manual-daily-report", {
        method: "POST",
        body: JSON.stringify({ 
          date: new Date().toISOString(),
          emailAddress 
        }),
        headers: { "Content-Type": "application/json" }
      });
      return await res.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      if (data.success) {
        toast({
          title: "✅ Izvještaj poslat",
          description: data.message,
        });
      } else {
        throw new Error(data.message);
      }
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška",
        description: error.message || "Greška pri slanju izvještaja",
        variant: "destructive",
      });
    },
  });

  // Test notifikacije mutation
  const testNotificationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/admin/servis-komerc/test-notifications");
      return await res.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      if (data.success) {
        toast({
          title: "✅ Test notifikacija uspešan",
          description: data.message,
        });
      } else {
        throw new Error(data.message);
      }
    },
    onError: (error: any) => {
      toast({
        title: "❌ Greška",
        description: error.message || "Greška pri testiranju notifikacija",
        variant: "destructive",
      });
    },
  });

  const handleTestDailyReport = () => {
    setIsTestingReport(true);
    testDailyReportMutation.mutate();
    setTimeout(() => setIsTestingReport(false), 2000);
  };

  const handleManualDailyReport = () => {
    if (!testEmailAddress) {
      toast({
        title: "❌ Greška",
        description: "Molimo unesite email adresu",
        variant: "destructive",
      });
      return;
    }
    manualDailyReportMutation.mutate({ emailAddress: testEmailAddress });
  };

  const handleTestNotifications = () => {
    setIsTestingNotifications(true);
    testNotificationsMutation.mutate();
    setTimeout(() => setIsTestingNotifications(false), 2000);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header sekcija */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Truck className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Servis Komerc</h1>
                  <p className="text-gray-600">Upravljanje Beko servisnim sistemom</p>
                </div>
              </div>
              
              <Alert className="bg-blue-50 border-blue-200">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Status sistema</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Servis Komerc sistem je aktivan i automatski šalje dnevne izvještaje u 22:00 Belgrade vreme.
                  Sistem je fokusiran na Beko brendove i integrisana je email komunikacija.
                </AlertDescription>
              </Alert>
            </div>

            {/* Statistike */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-4">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sistem Status</p>
                      <p className="text-2xl font-bold text-green-600">Aktivan</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-4">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Dnevni izvještaj</p>
                      <p className="text-2xl font-bold text-blue-600">22:00</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg mr-4">
                      <Package className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Fokus</p>
                      <p className="text-2xl font-bold text-purple-600">Beko</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg mr-4">
                      <Mail className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Email adresa</p>
                      <p className="text-sm font-bold text-orange-600">servis.komerc@example.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Glavne funkcionalnosti */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Test dnevnog izvještaja */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Test dnevnog izvještaja
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Testirajte generisanje dnevnog izvještaja sa trenutnim podacima iz baze.
                  </p>
                  
                  <Button 
                    onClick={handleTestDailyReport}
                    disabled={isTestingReport || testDailyReportMutation.isPending}
                    className="w-full"
                  >
                    {(isTestingReport || testDailyReportMutation.isPending) ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Testiranje...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Pokreni test
                      </>
                    )}
                  </Button>
                  
                  {testDailyReportMutation.data?.success && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800 font-medium mb-2">Test rezultat:</p>
                      <div className="text-xs text-green-700 space-y-1">
                        <div>Završenih servisa: {testDailyReportMutation.data.data?.totalCompletedServices || 0}</div>
                        <div>Posećenih klijenata: {testDailyReportMutation.data.data?.totalVisitedClients || 0}</div>
                        <div>Korišćenih delova: {testDailyReportMutation.data.data?.totalPartsUsed || 0}</div>
                        <div>Ukupan prihod: {testDailyReportMutation.data.data?.totalRevenue || '0.00'}€</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ručno slanje izvještaja */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-orange-600" />
                    Ručno slanje izvještaja
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Pošaljite dnevni izvještaj manuelno na određenu email adresu.
                  </p>
                  
                  <div>
                    <Label htmlFor="testEmail">Email adresa</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="servis.komerc@example.com"
                      className="mt-1"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleManualDailyReport}
                    disabled={manualDailyReportMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    {manualDailyReportMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Slanje...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Pošalji izvještaj
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Test notifikacija */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  Test email i SMS notifikacija
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Testirajte sistem email i SMS notifikacija za završene Beko servise.
                </p>
                
                <Button 
                  onClick={handleTestNotifications}
                  disabled={isTestingNotifications || testNotificationsMutation.isPending}
                  variant="secondary"
                  className="w-full"
                >
                  {(isTestingNotifications || testNotificationsMutation.isPending) ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Testiranje notifikacija...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Test notifikacija
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Sistemske informacije */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  Sistemske informacije
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Automatski procesi</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">AKTIVNO</Badge>
                        <span>Dnevni email izvještaji (22:00)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">AKTIVNO</Badge>
                        <span>SMS notifikacije klijentima</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">AKTIVNO</Badge>
                        <span>Email notifikacije o završenim servisima</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Konfiguracija</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>Email server: mail.frigosistemtodosijevic.com</div>
                      <div>SMS API: SMS Mobile API</div>
                      <div>Fokus brendovi: Beko</div>
                      <div>Vreme zone: Europe/Belgrade</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}