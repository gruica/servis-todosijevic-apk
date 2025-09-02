import React from 'react';
import { AdminLayout } from "@/components/layout/admin-layout";
import { WhatsAppWebController } from "@/components/WhatsAppWebController";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone } from "lucide-react";

export default function AdminWhatsAppWebPage() {
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Smartphone className="h-7 w-7 text-green-600" />
              WhatsApp Web Integracija
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-muted-foreground">
              <p>
                Povežite vašu WhatsApp Web sesiju sa aplikacijom za direktnu komunikaciju sa klijentima.
              </p>
              <p className="text-sm">
                ⚠️ <strong>Napomena:</strong> Funkcionalnost dostupna samo administratorima. 
                Poruke se automatski čuvaju u conversation sistem.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Web Controller */}
        <WhatsAppWebController />

        {/* Informacije o funkcionalnosti */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kako koristiti WhatsApp Web</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">🔗 Povezivanje:</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Kliknite "Pokreni WhatsApp Web"</li>
                  <li>2. Skenirajte QR kod sa telefona</li>
                  <li>3. Čekajte potvrdu konekcije</li>
                </ol>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">💬 Slanje poruka:</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Unesite broj telefona ili odaberite kontakt</li>
                  <li>2. Napišite poruku</li>
                  <li>3. Kliknite "Pošalji poruku"</li>
                </ol>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📌 Integrisane funkcionalnosti:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Automatsko čuvanje svih poruka u conversation sistem</li>
                <li>• Dohvatanje i prikaz svih WhatsApp kontakata</li>
                <li>• Pregled aktivnih chat-ova</li>
                <li>• Podrška za SMS Mobile API paralelno sa WhatsApp Web</li>
                <li>• Real-time status praćenje konekcije</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-amber-50 rounded-lg">
              <h4 className="font-semibold text-amber-800 mb-2">⚠️ Važne napomene:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Telefon mora biti povezan na internet za rad WhatsApp Web</li>
                <li>• QR kod ima ograničeno vreme važenja (obično 20 sekundi)</li>
                <li>• Samo jedan WhatsApp Web može biti aktivan po nalogu</li>
                <li>• Postojeći SMS Mobile API ostaje potpuno funkcionalan</li>
                <li>• Session se čuva lokalno - reconnect automatski pri restartu</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}