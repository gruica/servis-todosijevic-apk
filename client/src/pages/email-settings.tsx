import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequestWithAuth } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const emailSettingsSchema = z.object({
  host: z.string().min(1, { message: "Host je obavezan" }),
  port: z.coerce.number().int().positive({ message: "Port mora biti pozitivan broj" }),
  secure: z.boolean().default(true),
  user: z.string().min(1, { message: "Korisničko ime je obavezno" }),
  password: z.string().min(1, { message: "Lozinka je obavezna" }),
});

type EmailSettingsForm = z.infer<typeof emailSettingsSchema>;

const testEmailSchema = z.object({
  recipient: z.string().email({ message: "Unesite ispravnu email adresu" }),
});

type TestEmailForm = z.infer<typeof testEmailSchema>;

// Definišemo interfejs za dijagnostičke informacije
interface DiagnosticInfo {
  connectionTest: boolean;
  emailSent: boolean;
  timestamp: number;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
      user: string;
    }
  };
  errorInfo?: string;
  // Opciono dodatna polja za detaljne informacije
  logs?: string[];
  attempts?: number;
  responseCode?: number;
}

const EmailSettingsPage = () => {
  const { toast } = useToast();
  const [testEmailSent, setTestEmailSent] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [_, navigate] = useLocation();

  // Email settings form
  const form = useForm<EmailSettingsForm>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      host: "",
      port: 465,
      secure: true,
      user: "",
      password: "",
    },
  });

  // Test email form
  const testEmailForm = useForm<TestEmailForm>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      recipient: "",
    },
  });
  
  // Učitaj trenutne postavke email-a
  const emailSettingsQuery = useQuery({
    queryKey: ['/api/email-settings'],
    queryFn: async () => {
      try {
        const response = await apiRequestWithAuth('GET', '/api/email-settings');
        const data = await response.json();
        
        if (data.configured) {
          // Postavi vrednosti forme ako su email postavke već konfigurisane
          form.setValue('host', data.host);
          form.setValue('port', data.port);
          form.setValue('secure', data.secure);
          form.setValue('user', data.user);
          // Password nije uključen u odgovoru zbog sigurnosti
          // Korisnik mora ponovo uneti lozinku
          setIsConfigured(true);
        }
        
        return data;
      } catch (error) {
        toast({
          title: "Greška",
          description: `Nije moguće učitati email postavke: ${error instanceof Error ? error.message : 'Nepoznata greška'}`,
          variant: "destructive",
        });
        throw error;
      }
    }
  });

  // Mutation for saving email settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: EmailSettingsForm) => {
      const response = await apiRequestWithAuth("POST", "/api/email-settings", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno sačuvano",
        description: "Email postavke su uspešno sačuvane",
      });
      // Osvežavanje podataka i oznaka da je konfigurisano
      setIsConfigured(true);
      // Poništavamo keš za query - sledeći put će se učitati nove vrednosti
      emailSettingsQuery.refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: `Nije moguće sačuvati postavke: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // State za detalje dijagnostike 
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Helper za proveru statusa upita
  const isLoadingSettings = emailSettingsQuery.isLoading;
  const isErrorSettings = emailSettingsQuery.isError;

  // Mutation for sending test email
  const sendTestEmailMutation = useMutation({
    mutationFn: async (data: TestEmailForm) => {
      const response = await apiRequestWithAuth("POST", "/api/send-test-email", data);
      const result = await response.json();
      
      // Čuvamo dijagnostičke podatke za prikaz
      if (result.diagnosticInfo) {
        setDiagnosticInfo(result.diagnosticInfo);
        setShowDiagnostics(true);
      }
      
      if (!result.success) {
        throw new Error(result.error || "Greška pri slanju email-a");
      }
      
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Email poslat",
        description: "Test email je uspešno poslat",
      });
      setTestEmailSent(true);
      setTimeout(() => setTestEmailSent(false), 5000);
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: `Nije moguće poslati test email: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle email settings form submission
  const onSettingsSubmit = (values: EmailSettingsForm) => {
    saveSettingsMutation.mutate(values);
  };

  // Handle test email form submission
  const onTestEmailSubmit = (values: TestEmailForm) => {
    sendTestEmailMutation.mutate(values);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Email Postavke</h1>
      
      {isLoadingSettings && (
        <div className="flex items-center justify-center p-6 border rounded-lg bg-background mb-6">
          <Loader2 className="h-8 w-8 animate-spin mr-3 text-primary" />
          <p>Učitavanje email konfiguracije...</p>
        </div>
      )}
      
      {isErrorSettings && (
        <div className="flex items-center border-l-4 border-red-600 bg-red-50 p-4 mb-6 text-red-800">
          <AlertCircle className="h-6 w-6 mr-3" />
          <div>
            <h3 className="font-medium">Greška pri učitavanju postavki</h3>
            <p className="text-sm">Molimo pokušajte da osvežite stranicu ili kontaktirajte administratora.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* SMTP Postavke */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>SMTP Postavke</span>
              {isConfigured && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" /> Konfigurisano
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Podesite SMTP postavke za slanje email obaveštenja
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSettingsSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Server</FormLabel>
                      <FormControl>
                        <Input placeholder="mail.frigosistemtodosijevic.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unesite adresu SMTP servera
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input placeholder="465" {...field} />
                      </FormControl>
                      <FormDescription>
                        Uobičajeno: 465 (SSL) ili 587 (TLS)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Koristi SSL</FormLabel>
                        <FormDescription>
                          Uključite za port 465, isključite za port 587
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="user"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email korisnika</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="info@frigosistemtodosijevic.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Email adresa koja će se koristiti za slanje
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lozinka</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Lozinka za email nalog
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="w-full"
                >
                  {saveSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sačuvavanje...
                    </>
                  ) : (
                    "Sačuvaj postavke"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Test Email */}
        <Card>
          <CardHeader>
            <CardTitle>Test Email</CardTitle>
            <CardDescription>
              Pošaljite test email da proverite postavke
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...testEmailForm}>
              <form
                onSubmit={testEmailForm.handleSubmit(onTestEmailSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={testEmailForm.control}
                  name="recipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email primaoca</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="primer@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Email adresa na koju će biti poslat test
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="secondary"
                  disabled={
                    sendTestEmailMutation.isPending ||
                    saveSettingsMutation.isPending
                  }
                  className="w-full"
                >
                  {sendTestEmailMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Slanje...
                    </>
                  ) : testEmailSent ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Email poslat!
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Pošalji test email
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Dijagnostičke informacije */}
            {showDiagnostics && diagnosticInfo && (
              <div className="mt-6 border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-medium flex justify-between items-center">
                  <span>Dijagnostičke informacije</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowDiagnostics(false)}
                    className="h-7 w-7 p-0"
                  >
                    ✕
                  </Button>
                </div>
                <div className="p-4 text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <span className="font-medium">SMTP Status:</span>
                    <span>
                      {diagnosticInfo.connectionTest ? (
                        <span className="text-green-600 font-medium">✓ Uspešna konekcija</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ Neuspešna konekcija</span>
                      )}
                    </span>
                    
                    <span className="font-medium">Email status:</span>
                    <span>
                      {diagnosticInfo.emailSent ? (
                        <span className="text-green-600 font-medium">✓ Uspešno poslat</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ Neuspešno slanje</span>
                      )}
                    </span>
                    
                    {diagnosticInfo.smtpConfig && (
                      <>
                        <span className="font-medium">Host:</span>
                        <span>{diagnosticInfo.smtpConfig.host}</span>
                        
                        <span className="font-medium">Port:</span>
                        <span>{diagnosticInfo.smtpConfig.port}</span>
                        
                        <span className="font-medium">SSL/TLS:</span>
                        <span>{diagnosticInfo.smtpConfig.secure ? 'Da' : 'Ne'}</span>
                        
                        <span className="font-medium">Korisnik:</span>
                        <span>{diagnosticInfo.smtpConfig.auth?.user || 'Nije postavljen'}</span>
                      </>
                    )}
                    
                    <span className="font-medium">Vreme:</span>
                    <span>{new Date(diagnosticInfo.timestamp).toLocaleString()}</span>
                  </div>
                  
                  {diagnosticInfo.errorInfo && (
                    <div className="mt-3 bg-red-50 border border-red-200 p-3 rounded text-red-800">
                      <p className="font-medium">Greška:</p>
                      <p>{diagnosticInfo.errorInfo}</p>
                    </div>
                  )}
                  
                  {/* Ako imamo logove, prikažemo ih */}
                  {diagnosticInfo.logs && diagnosticInfo.logs.length > 0 && (
                    <div className="mt-3 border border-border rounded overflow-hidden">
                      <div className="bg-muted px-3 py-1 text-xs font-medium">Istorija slanja</div>
                      <div className="p-2 text-xs font-mono bg-muted/30 max-h-32 overflow-y-auto">
                        {diagnosticInfo.logs.map((log, index) => (
                          <div key={index} className="py-0.5 border-b border-border/30 last:border-0">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        // Pripremi dijagnostičke podatke za preuzimanje kao JSON datoteku
                        const dataStr = JSON.stringify(diagnosticInfo, null, 2);
                        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
                        
                        const downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href", dataUri);
                        downloadAnchorNode.setAttribute("download", `email-diagnostika-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`);
                        document.body.appendChild(downloadAnchorNode);
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                      }}
                      className="text-xs"
                    >
                      Preuzmi detaljnu dijagnostiku
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">Saveti za podešavanje</h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Za Gmail koristite: smtp.gmail.com, port 587, bez SSL</li>
                <li>Za Outlook koristite: smtp.office365.com, port 587, bez SSL</li>
                <li>Za cPanel email koristite postavke dobijene od provajdera</li>
                <li>
                  Obratite pažnju da neki provajderi zahtevaju posebnu "app lozinku"
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setShowDiagnostics(!showDiagnostics)}
            >
              {showDiagnostics ? "Sakrij dijagnostiku" : "Prikaži dijagnostiku"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/email-test")}
              type="button"
            >
              <Mail className="mr-2 h-4 w-4" />
              Testiranje email sistema
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default EmailSettingsPage;