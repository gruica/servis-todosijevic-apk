import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfobipSmsTest } from "@/components/infobip-sms-test";

export default function SmsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SMS Postavke</h1>
        <p className="text-gray-600">Upravljanje SMS notifikacijama</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Aplikacija koristi Infobip SMS platformu za slanje SMS poruka sa vašeg broja +38267051141.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Infobip SMS Test */}
        <InfobipSmsTest />

        {/* Informacije o SMS notifikacijama */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Kada se šalju SMS-ovi?
            </CardTitle>
            <CardDescription>
              Automatski SMS-ovi se šalju u sledećim situacijama:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-gray-600">
              <li>• Kada je servis dodeljen serviseru</li>
              <li>• Kada je zakazan termin</li>
              <li>• Kada je servis u toku</li>
              <li>• Kada je servis završen</li>
              <li>• Podsetnici za održavanje</li>
              <li>• Manualni SMS-ovi iz admin panela</li>
            </ul>
          </CardContent>
        </Card>

        {/* Konfiguracija */}
        <Card>
          <CardHeader>
            <CardTitle>Konfiguracija SMS platforme</CardTitle>
            <CardDescription>
              Infobip SMS platforma je konfigurisan preko environment varijabli
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Potrebne environment varijable:</p>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• <code>INFOBIP_API_KEY</code> - API ključ iz Infobip dashboard-a</li>
                <li>• <code>INFOBIP_BASE_URL</code> - https://api.infobip.com (opciono)</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                Sender ID je automatski podešen na +38267051141 (vaš Telekom broj)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}