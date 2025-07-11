import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Loader2, CheckCircle2 as CheckCircle, AlertCircle, Mail, Server as ServerIcon, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Šema za validaciju test email-a
const testEmailSchema = z.object({
  recipient: z.string().email({ message: "Unesite validnu email adresu" })
});

type TestEmailValues = z.infer<typeof testEmailSchema>;

// Definicija tipa za rezultat testa
interface TestResult {
  success: boolean;
  timestamp: string;
  message: string;
  recipient: string;
  details?: string;
  diagnosticInfo?: any;
}

export default function EmailTestPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("test-email");
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Preusmeravanje ako korisnik nije administrator
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
      toast({
        title: "Pristup odbijen",
        description: "Nemate dozvolu za pristup ovoj stranici",
        variant: "destructive",
      });
    }
  }, [user, navigate, toast]);

  // Dobavljanje informacija o trenutnim email postavkama
  const { data: emailSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/email-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/email-settings");
      return response.json();
    },
    enabled: !!user && user.role === "admin", // Samo za administratore
  });

  // Forma za slanje test email-a
  const form = useForm<TestEmailValues>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      recipient: "",
    },
  });

  // Mutacija za slanje test email-a - koristi se unapređeni endpoint sa detaljnijim izveštajem
  const { mutate: sendTestEmail, isPending } = useMutation({
    mutationFn: async (data: TestEmailValues) => {
      const response = await apiRequest("POST", "/api/send-test-email", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Podesi rezultat testa koji će biti prikazan u komponenti
      setTestResult({
        success: data.success,
        timestamp: new Date().toISOString(),
        message: data.success ? "Email uspešno poslat" : data.error || "Greška pri slanju email-a",
        recipient: data.recipient || form.getValues().recipient,
        details: data.details || '',
        diagnosticInfo: data.diagnosticInfo || null
      });

      if (data.success) {
        toast({
          title: "✅ Email uspešno poslat",
          description: `📧 Test email je uspešno poslat na adresu ${data.recipient || form.getValues().recipient}. 
            ${data.diagnosticInfo?.duration ? `(Vreme: ${data.diagnosticInfo.duration}ms)` : ''}`,
          duration: 6000, // Duže trajanje za bolju vidljivost
        });
        form.reset();
      } else {
        toast({
          title: "⚠️ Greška pri slanju email-a",
          description: data.error 
            ? `Nije moguće poslati email: ${data.error}. 
               ${data.diagnosticInfo?.connectionTest === false ? 'Nije uspelo povezivanje sa SMTP serverom.' : ''}
               ${data.diagnostics || ''}`
            : "Došlo je do greške pri slanju test email-a. Proverite server logove za više detalja.",
          variant: "destructive",
          duration: 8000, // Duže trajanje za greške
        });
      }
    },
    onError: (error) => {
      toast({
        title: "❌ Neuspešno slanje email-a",
        description: error instanceof Error 
          ? `Greška: ${error.message}. Proverite server logove za više detalja.` 
          : "Došlo je do neočekivane greške pri slanju test email-a.",
        variant: "destructive",
        duration: 8000, // Duže trajanje za greške
      });
    },
  });

  const onSubmit = (values: TestEmailValues) => {
    sendTestEmail(values);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="container px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Dijagnostika email sistema</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="test-email">Test slanja email-a</TabsTrigger>
            <TabsTrigger value="service-notifications">Obaveštenja servisa</TabsTrigger>
            <TabsTrigger value="settings-info">Informacije o postavkama</TabsTrigger>
          </TabsList>

          <TabsContent value="test-email">
            <Card>
              <CardHeader>
                <CardTitle>Test slanja email-a</CardTitle>
                <CardDescription>
                  Pošaljite test email da proverite da li je sistem pravilno konfigurisan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSettings ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !emailSettings?.configured ? (
                  <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 text-yellow-800">
                    <p className="font-medium">Email sistem nije konfigurisan</p>
                    <p className="text-sm mt-1">
                      Prije testiranja, potrebno je konfigurisati email postavke na stranici za podešavanje email-a.
                    </p>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="recipient"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email adresa primaoca</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="primer@domen.com"
                                {...field}
                                autoComplete="email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={isPending}>
                        {isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Slanje...
                          </>
                        ) : (
                          "Pošalji test email"
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start space-y-4 w-full">
                <p className="text-sm text-muted-foreground">
                  Nakon slanja, proverite inbox (i spam folder) navedene email adrese 
                  da biste potvrdili da je email stigao.
                </p>
                
                {testResult && (
                  <div className={`w-full mt-6 p-4 rounded-md border ${
                    testResult.success 
                      ? "bg-green-50 border-green-200 text-green-800" 
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}>
                    <h3 className="font-medium text-base mb-2 flex items-center">
                      {testResult.success 
                        ? <CheckCircle className="h-5 w-5 mr-2 text-green-600" /> 
                        : <AlertCircle className="h-5 w-5 mr-2 text-red-600" />}
                      {testResult.message}
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      <p><strong>Email primaoca:</strong> {testResult.recipient}</p>
                      <p><strong>Vreme testa:</strong> {new Date(testResult.timestamp).toLocaleString('sr-Latn-ME')}</p>
                      
                      {testResult.details && (
                        <p><strong>Detalji:</strong> {testResult.details}</p>
                      )}
                      
                      {testResult.diagnosticInfo && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="font-medium mb-1">Dijagnostičke informacije:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            {testResult.diagnosticInfo.connectionTest !== undefined && (
                              <li>SMTP konekcija: {testResult.diagnosticInfo.connectionTest ? "Uspešna" : "Neuspešna"}</li>
                            )}
                            {testResult.diagnosticInfo.duration !== undefined && (
                              <li>Vreme izvršavanja: {testResult.diagnosticInfo.duration}ms</li>
                            )}
                            {testResult.diagnosticInfo.smtpConfig && (
                              <li>SMTP server: {testResult.diagnosticInfo.smtpConfig.host}:{testResult.diagnosticInfo.smtpConfig.port}</li>
                            )}
                            {testResult.diagnosticInfo.errorInfo && (
                              <li className="text-red-600">Greška: {testResult.diagnosticInfo.errorInfo}</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="service-notifications">
            <Card>
              <CardHeader>
                <CardTitle>Test email obaveštenja servisa</CardTitle>
                <CardDescription>
                  Testirajte automatska email obaveštenja za operacije sa servisima
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-2">Aktivna email obaveštenja</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Kreiranje novog servisa - šalje se administratorima i klijentu</li>
                      <li>• Dodela tehničara - šalje se klijentu i tehničaru</li>
                      <li>• Promena statusa - šalje se klijentu</li>
                      <li>• Ažuriranje servisa - šalje se klijentu ako je status promenjen</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-md border border-green-200">
                    <h3 className="font-medium text-green-900 mb-2">✅ Implementirana obaveštenja</h3>
                    <div className="text-sm text-green-800 space-y-2">
                      <div>
                        <strong>Kreiranje servisa:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>- Admin ruta: Šalje administratorima + klijentu</li>
                          <li>- Klijent ruta: Šalje administratorima + klijentu potvrdu</li>
                          <li>- Poslovni partner ruta: Šalje administratorima + klijentu</li>
                        </ul>
                      </div>
                      <div>
                        <strong>Dodela tehničara:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>- Šalje klijentu obaveštenje o dodeli</li>
                          <li>- Šalje tehničaru obaveštenje o novom servisu</li>
                        </ul>
                      </div>
                      <div>
                        <strong>Promena statusa:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>- Šalje klijentu obaveštenje o promeni statusa</li>
                          <li>- Koristi se u PUT /api/services/:id i PUT /api/services/:id/update-status</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                    <h3 className="font-medium text-yellow-900 mb-2">📋 Kako testirati</h3>
                    <div className="text-sm text-yellow-800 space-y-1">
                      <p>1. Kreirajte novi servis preko bilo koje rute</p>
                      <p>2. Dodelite tehničara servisu</p>
                      <p>3. Promenite status servisa</p>
                      <p>4. Proverite email inboxe administratora, klijenta i tehničara</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings-info">
            <Card>
              <CardHeader>
                <CardTitle>Informacije o email postavkama</CardTitle>
                <CardDescription>
                  Trenutna konfiguracija email sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSettings ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !emailSettings?.configured ? (
                  <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 text-yellow-800">
                    <p className="font-medium">Email sistem nije konfigurisan</p>
                    <p className="text-sm mt-1">
                      Potrebno je konfigurisati email postavke na stranici za podešavanje email-a.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-2">SMTP Server</h3>
                        <p className="text-sm text-muted-foreground">{emailSettings.host}</p>
                      </div>
                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-2">Port</h3>
                        <p className="text-sm text-muted-foreground">{emailSettings.port}</p>
                      </div>
                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-2">Sigurna veza (SSL/TLS)</h3>
                        <p className="text-sm text-muted-foreground">
                          {emailSettings.secure ? "Da" : "Ne"}
                        </p>
                      </div>
                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-2">Korisničko ime</h3>
                        <p className="text-sm text-muted-foreground">{emailSettings.user}</p>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-blue-800 mt-4">
                      <p className="text-sm">
                        <strong>Napomena:</strong> Iz sigurnosnih razloga, lozinka nije prikazana.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => navigate("/email-settings")}>
                  Idi na podešavanje email-a
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}