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
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Šema za validaciju test email-a
const testEmailSchema = z.object({
  recipient: z.string().email({ message: "Unesite validnu email adresu" })
});

type TestEmailValues = z.infer<typeof testEmailSchema>;

export default function EmailTestPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("test-email");

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

  // Mutacija za slanje test email-a
  const { mutate: sendTestEmail, isPending } = useMutation({
    mutationFn: async (data: TestEmailValues) => {
      const response = await apiRequest("POST", "/api/test-email", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Email poslat",
          description: "Test email je uspešno poslat na navedenu adresu.",
        });
        form.reset();
      } else {
        toast({
          title: "Greška pri slanju",
          description: data.error || "Došlo je do greške pri slanju test email-a.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Greška pri slanju",
        description: error instanceof Error 
          ? error.message 
          : "Došlo je do greške pri slanju test email-a.",
        variant: "destructive",
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
              <CardFooter className="flex flex-col items-start">
                <p className="text-sm text-muted-foreground">
                  Nakon slanja, proverite inbox (i spam folder) navedene email adrese 
                  da biste potvrdili da je email stigao.
                </p>
              </CardFooter>
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