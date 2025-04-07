import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

const EmailSettingsPage = () => {
  const { toast } = useToast();
  const [testEmailSent, setTestEmailSent] = useState(false);

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

  // Mutation for saving email settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: EmailSettingsForm) => {
      const response = await apiRequest("POST", "/api/email-settings", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno sačuvano",
        description: "Email postavke su uspešno sačuvane",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: `Nije moguće sačuvati postavke: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation for sending test email
  const sendTestEmailMutation = useMutation({
    mutationFn: async (data: TestEmailForm) => {
      const response = await apiRequest("POST", "/api/send-test-email", data);
      return await response.json();
    },
    onSuccess: () => {
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* SMTP Postavke */}
        <Card>
          <CardHeader>
            <CardTitle>SMTP Postavke</CardTitle>
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
        </Card>
      </div>
    </div>
  );
};

export default EmailSettingsPage;