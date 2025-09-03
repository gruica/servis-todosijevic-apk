import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, ShieldCheck, Trash2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

const dataDeletionRequestSchema = z.object({
  email: z.string().email("Unesite validnu email adresu").min(1, "Email adresa je obavezna"),
  fullName: z.string().min(2, "Ime i prezime mora imati najmanje 2 karaktera").max(100, "Ime i prezime je predugačko"),
  phone: z.string().min(6, "Broj telefona mora imati najmanje 6 brojeva")
    .regex(/^[+]?[\d\s()-]{6,20}$/, "Broj telefona mora sadržati samo brojeve, razmake i znakove +()-")
    .or(z.literal("")).optional(),
  reason: z.string().max(500, "Razlog je predugačak").optional(),
});

type FormData = z.infer<typeof dataDeletionRequestSchema>;

export default function DataDeletionRequestPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(dataDeletionRequestSchema),
    defaultValues: {
      email: '',
      fullName: '',
      phone: '',
      reason: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/data-deletion-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast({
          title: "Zahtev uspešno poslat",
          description: "Vaš zahtev za brisanje podataka je primljen. Kontaktiraćemo vas u najkraćem roku.",
        });
        form.reset();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Greška pri slanju zahteva');
      }
    } catch (error) {
      console.error('Greška pri slanju zahteva:', error);
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Došlo je do greške pri slanju zahteva. Molimo pokušajte ponovo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">Zahtev uspešno poslat</CardTitle>
            </CardHeader>
            
            <CardContent className="text-center space-y-4">
              <p className="text-gray-700">
                Vaš zahtev za brisanje podataka je uspešno primljen. Naš tim će pregledati zahtev i kontaktirati vas putem email-a u roku od 30 dana.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Šta se dešava dalje:</h3>
                <ul className="text-sm text-blue-700 space-y-1 text-left">
                  <li>• Proveravamo vašu identifikaciju</li>
                  <li>• Lociramo sve vaše podatke u našem sistemu</li>
                  <li>• Kontaktiramo vas putem email-a za potvrdu</li>
                  <li>• Brišemo sve vaše podatke nakon potvrde</li>
                </ul>
              </div>
              
              <div className="pt-4">
                <Link href="/">
                  <Button variant="outline" className="mr-3">
                    Nazad na glavnu stranicu
                  </Button>
                </Link>
                <Link href="/privacy/policy">
                  <Button variant="ghost">
                    Pogledaj Privacy Policy
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-2xl text-red-800">Zahtev za brisanje podataka</CardTitle>
                <p className="text-gray-600">U skladu sa GDPR propisima</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Ovaj zahtev će pokrenuti proces brisanja svih vaših ličnih podataka iz naše baze podataka. 
                Ova akcija je **nepovratna** i može uticati na buduće usluge koje vam pružamo.
              </AlertDescription>
            </Alert>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Važne informacije:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Proceso brisanja može potrajati do 30 dana</li>
                <li>• Neki podaci se mogu zadržati iz zakonskih razloga</li>
                <li>• Neće biti moguće vratiti obrisane podatke</li>
                <li>• Možda ćemo trebati dodatne informacije za verifikaciju</li>
              </ul>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email adresa *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="vas.email@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ime i prezime *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Marko Marković" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broj telefona (opcionalno)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+381 61 123 4567" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razlog za brisanje (opcionalno)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Molimo navedite razlog za brisanje vaših podataka..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 flex space-x-3">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Pošalji zahtev za brisanje
                  </Button>
                  
                  <Link href="/">
                    <Button variant="outline" type="button">
                      Otkaži
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                Imate pitanja? Kontaktirajte nas na{' '}
                <a href="mailto:info@frigosistemtodosijevic.me" className="text-blue-600 hover:underline">
                  info@frigosistemtodosijevic.me
                </a>
                {' '}ili pogledajte našu{' '}
                <Link href="/privacy/policy">
                  <span className="text-blue-600 hover:underline cursor-pointer">Privacy Policy</span>
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}