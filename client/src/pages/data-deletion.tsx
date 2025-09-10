import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'wouter';
import { ArrowLeft, Shield, Trash2, Clock, Mail, Phone, FileText, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function DataDeletion() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [specificData, setSpecificData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      toast({
        title: "Greška",
        description: "Molimo unesite email ili telefon za identifikaciju.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call - in real implementation, this would call your backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Zahtev poslat",
        description: "Vaš zahtev za brisanje podataka je uspešno poslat. Odgovoriće vam u roku od 72 sata.",
      });
      
      // Reset form
      setEmail('');
      setPhone('');
      setReason('');
      setSpecificData('');
      
    } catch (error) {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri slanju zahteva. Molimo pokušajte ponovo.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nazad na početnu
            </Link>
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Brisanje podataka</h1>
          <p className="text-gray-600">Prava korisnika na brisanje ličnih podataka (GDPR)</p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Vaša prava na brisanje podataka
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <p>
                U skladu sa GDPR regulativom i našom politikom privatnosti, imate pravo da zatražite 
                brisanje svojih ličnih podataka iz naših sistema. Ova stranica objašnjava proces 
                brisanja podataka i omogućava vam da podnesete zahtev.
              </p>
            </CardContent>
          </Card>

          {/* Data Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Koji podaci se mogu obrisati
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Kontakt informacije:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Ime i prezime</li>
                    <li>• Broj telefona</li>
                    <li>• Email adresa</li>
                    <li>• Adresa stanovanja</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Servisni podaci:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Istorija servisa</li>
                    <li>• Fotografije uređaja</li>
                    <li>• WhatsApp komunikacija</li>
                    <li>• Podaci o uređajima</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deletion Process */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Proces brisanja podataka
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                  <div>
                    <h4 className="font-semibold">Podnošenje zahteva</h4>
                    <p className="text-sm text-gray-600">Popunite formular ispod ili nas kontaktirajte direktno</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                  <div>
                    <h4 className="font-semibold">Verifikacija identiteta</h4>
                    <p className="text-sm text-gray-600">Potvrđujemo vašu identitet radi bezbednosti</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                  <div>
                    <h4 className="font-semibold">Brisanje podataka</h4>
                    <p className="text-sm text-gray-600">Brišemo vaše podatke iz svih naših sistema</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">4</div>
                  <div>
                    <h4 className="font-semibold">Potvrda brisanja</h4>
                    <p className="text-sm text-gray-600">Šaljemo vam potvrdu da su podaci obrisani</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Vreme izvršavanja:</strong> Zahtevi se obrađuju u roku od 30 dana prema GDPR propisima.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Važne napomene
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-1">Podaci koji se zadržavaju</h4>
                  <p className="text-sm text-yellow-700">
                    Neki podaci mogu biti zadržani zbog pravnih obaveza (npr. podaci za GBP/APR) 
                    ili potreba za reševanje sporova.
                  </p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-1">Aktivni servisi</h4>
                  <p className="text-sm text-blue-700">
                    Ako imate aktivne servise, podaci neće biti obrisani dok se servisi ne završe.
                  </p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-1">Backup podaci</h4>
                  <p className="text-sm text-purple-700">
                    Podaci u backup sistemima se brišu tokom redovnih ciklusa brisanja (do 90 dana).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deletion Request Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Zahtev za brisanje podataka
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email adresa</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vasa@email.com"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Broj telefona</label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+382 67 XXX XXX"
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Razlog za brisanje (opcionalno)</label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Molimo navedite razlog za brisanje podataka..."
                    rows={3}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Specifični podaci za brisanje (opcionalno)</label>
                  <Textarea
                    value={specificData}
                    onChange={(e) => setSpecificData(e.target.value)}
                    placeholder="Ako želite da se obrišu samo određeni podaci, molimo navedite koje..."
                    rows={3}
                    className="w-full"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Šalje se...' : 'Pošalji zahtev za brisanje'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Alternative Contact Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                Alternativni načini kontakta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Možete takođe da nas kontaktirate direktno za zahtev za brisanje podataka:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-sm text-gray-600">privacy@frigosistemtodosijevic.me</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold">Telefon</p>
                    <p className="text-sm text-gray-600">+382 67 051 141</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 Frigo Sistem Todosijević. Poslednja izmena: {new Date().toLocaleDateString('sr-RS')}</p>
        </div>
      </div>
    </div>
  );
}