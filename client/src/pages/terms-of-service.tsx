import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeft, Shield, Users, Database } from 'lucide-react';

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Uslovi korišćenja</h1>
          <p className="text-gray-600">Poslednja izmena: {new Date().toLocaleDateString('sr-RS')}</p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Uvod
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <p>
                Dobrodošli u Frigo Sistem Todosijević aplikaciju. Ovaj dokument sadrži uslove korišćenja 
                naše WhatsApp Business API usluge i web aplikacije za upravljanje servisima bele tehnike.
              </p>
              <p>
                Korišćenjem naše aplikacije prihvatate ove uslove u potpunosti. Ako se ne slažete sa bilo kojim 
                delom ovih uslova, molimo vas da ne koristite naše usluge.
              </p>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Informacije o kompaniji
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Naziv:</strong> Frigo Sistem Todosijević</p>
                <p><strong>Adresa:</strong> Lastva grbaljska 85317 Kotor, Crna Gora</p>
                <p><strong>Telefon:</strong> +382 67 051 141</p>
                <p><strong>Email:</strong> info@frigosistemtodosijevic.me</p>
                <p><strong>Website:</strong> www.frigosistemtodosijevic.me</p>
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle>Usluge koje pružamo</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <ul>
                <li><strong>Servis bele tehnike:</strong> Popravka frižidera, zamrzivača, veš mašina, sudokupina</li>
                <li><strong>Servis klima uređaja:</strong> Instalacija, održavanje, popravka</li>
                <li><strong>WhatsApp komunikacija:</strong> Automatske poruke o statusu servisa</li>
                <li><strong>Online upravljanje:</strong> Web aplikacija za praćenje servisa</li>
                <li><strong>Rezervni delovi:</strong> Prodaja originalnih delova</li>
              </ul>
            </CardContent>
          </Card>

          {/* WhatsApp Communication */}
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp komunikacija</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <h4>Saglasnost za slanje poruka</h4>
              <p>
                Korišćenjem naših usluga dajete saglasnost da vam šaljemo WhatsApp poruke u vezi sa:
              </p>
              <ul>
                <li>Potvrdom zahteva za servis</li>
                <li>Zakazivanjem termina</li>
                <li>Obaveštenjima o statusu servisa</li>
                <li>Potrebom za rezervnim delovima</li>
                <li>Završetkom radova</li>
                <li>Fotografijama sa servisa</li>
              </ul>
              <h4>Odustajanje od poruka</h4>
              <p>
                Možete u bilo kom trenutku da se odjavite od primanja WhatsApp poruka slanjem poruke 
                "STOP" ili kontaktiranjem naše službe za korisnike.
              </p>
            </CardContent>
          </Card>

          {/* Data Protection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                Zaštita podataka
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <h4>Podaci koje čuvamo</h4>
              <ul>
                <li>Kontakt informacije (ime, telefon, email, adresa)</li>
                <li>Informacije o uređajima i servisima</li>
                <li>Istorija komunikacije</li>
                <li>Fotografije sa servisa (uz vašu saglasnost)</li>
              </ul>
              <h4>Sigurnost podataka</h4>
              <p>
                Vaši podaci su zaštićeni savremenim sigurnosnim merama uključujući šifrovanje i 
                ograničen pristup. Podaci se čuvaju samo koliko je potrebno za pružanje usluga.
              </p>
              <h4>Vaša prava</h4>
              <p>
                Imate pravo da zatražite pristup, ispravku ili brisanje svojih podataka. Za ovakve 
                zahteve kontaktirajte nas na info@frigosistemtodosijevic.me
              </p>
            </CardContent>
          </Card>

          {/* User Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle>Odgovornosti korisnika</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <p>Obavezujete se da:</p>
              <ul>
                <li>Pružite tačne i ažurne informacije</li>
                <li>Ne zloupotrebljavate naše usluge</li>
                <li>Poštujete našu imovinu i osoblje</li>
                <li>Plaćate usluge u dogovorenim rokovima</li>
                <li>Omogućite pristup uređaju u zakazano vreme</li>
              </ul>
            </CardContent>
          </Card>

          {/* Limitations */}
          <Card>
            <CardHeader>
              <CardTitle>Ograničenja odgovornosti</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <p>
                Naša odgovornost je ograničena na vrednost izvršenih usluga. Ne odgovaramo za:
              </p>
              <ul>
                <li>Indirektne štete</li>
                <li>Gubitak podataka ili dobit</li>
                <li>Kvarove uzrokovane nepravilnim korišćenjem</li>
                <li>Oštećenja nastala usled više sile</li>
              </ul>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Izmene uslova</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <p>
                Zadržavamo pravo da ažuriramo ove uslove. O važnim izmenama ćemo vas obavestiti 
                putem WhatsApp poruke ili email-a. Nastavak korišćenja usluga nakon izmena 
                predstavlja prihvatanje novih uslova.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Kontakt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Za pitanja o ovim uslovima ili našim uslugama kontaktirajte nas:
              </p>
              <div className="space-y-2">
                <p><strong>Telefon:</strong> +382 67 051 141</p>
                <p><strong>Email:</strong> info@frigosistemtodosijevic.me</p>
                <p><strong>WhatsApp:</strong> +382 67 051 141</p>
                <p><strong>Radno vreme:</strong> Ponedeljak - Petak: 08:00-17:00h, Subota: 08:00-14:00h</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 Frigo Sistem Todosijević. Sva prava zadržana.</p>
        </div>
      </div>
    </div>
  );
}