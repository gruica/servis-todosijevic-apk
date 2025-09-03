import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FrigidgeIcon, WasherIcon, AirConditionerIcon, StoveIcon } from "@/components/icons";
import { useLocation, Link } from "wouter";
import { CalendarIcon, SettingsIcon, UsersIcon, BuildingIcon } from "lucide-react";

export default function HomePage() {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Hero section */}
      <header className="w-full py-6 px-4 border-b border-blue-100 bg-white shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-blue-900">Frigo Sistem Todosijević</h1>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-10 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-blue-800">
                Servis bele tehnike
              </h2>
              <p className="text-xl text-blue-600 max-w-3xl mx-auto">
                Profesionalno održavanje i servis vaših kućnih aparata
              </p>
            </div>

            {/* Kartice za brzi pristup */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
              <ServiceCard 
                icon={<UsersIcon className="h-8 w-8 text-blue-500" />}
                title="Admin pristup" 
                description="Upravljanje servisima, klijentima i tehničarima" 
                onClick={() => navigate("/auth")}
                primaryColor="bg-blue-100 hover:bg-blue-200"
                textColor="text-blue-700"
                role="admin"
              />
              <ServiceCard 
                icon={<SettingsIcon className="h-8 w-8 text-green-500" />}
                title="Serviseri" 
                description="Pristup servisima i pregled dodeljenih zadataka" 
                onClick={() => navigate("/auth")}
                primaryColor="bg-green-100 hover:bg-green-200"
                textColor="text-green-700"
                role="serviser"
              />
              <ServiceCard 
                icon={<UsersIcon className="h-8 w-8 text-purple-500" />}
                title="Klijenti" 
                description="Prijava servisa i praćenje statusa" 
                onClick={() => navigate("/auth")}
                primaryColor="bg-purple-100 hover:bg-purple-200"
                textColor="text-purple-700"
                role="klijent"
              />
              <ServiceCard 
                icon={<BuildingIcon className="h-8 w-8 text-orange-500" />}
                title="Poslovni partneri" 
                description="Upravljanje servisima za poslovne korisnike" 
                onClick={() => navigate("/business-auth")}
                primaryColor="bg-orange-100 hover:bg-orange-200"
                textColor="text-orange-700"
                role="partner"
              />
              <ServiceCard 
                icon={<SettingsIcon className="h-8 w-8 text-indigo-500" />}
                title="Com Plus Panel" 
                description="Administrativni panel za Com Plus brendove" 
                onClick={() => navigate("/complus-auth")}
                primaryColor="bg-indigo-100 hover:bg-indigo-200"
                textColor="text-indigo-700"
                role="complus"
                isSpecial={true}
              />
            </div>

            {/* Tabs sa kategorijama uređaja */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-10">
              <h3 className="text-2xl font-bold text-blue-900 mb-4">Kategorije uređaja koje servisiramo</h3>
              <Tabs defaultValue="fridges" className="w-full">
                <TabsList className="grid grid-cols-4 mb-6">
                  <TabsTrigger value="fridges">Frižideri</TabsTrigger>
                  <TabsTrigger value="washers">Veš mašine</TabsTrigger>
                  <TabsTrigger value="aircond">Klima uređaji</TabsTrigger>
                  <TabsTrigger value="stoves">Šporeti</TabsTrigger>
                </TabsList>
                <TabsContent value="fridges" className="space-y-4">
                  <div className="flex flex-col md:flex-row items-center">
                    <FrigidgeIcon className="h-24 w-24 md:h-40 md:w-40 text-blue-500 mb-4 md:mb-0 md:mr-6" />
                    <div>
                      <h4 className="text-xl font-semibold text-blue-800 mb-2">Frižideri i zamrzivači</h4>
                      <p className="text-gray-700">
                        Profesionalno servisiranje frižidera i zamrzivača svih brendova. Naši stručnjaci su specijalizovani 
                        za popravku sistema hlađenja, zamenu kompresora, popravku elektronike i druge intervencije.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="washers" className="space-y-4">
                  <div className="flex flex-col md:flex-row items-center">
                    <WasherIcon className="h-24 w-24 md:h-40 md:w-40 text-blue-500 mb-4 md:mb-0 md:mr-6" />
                    <div>
                      <h4 className="text-xl font-semibold text-blue-800 mb-2">Veš mašine i mašine za sudove</h4>
                      <p className="text-gray-700">
                        Dijagnostika i popravka veš mašina i mašina za sudove. Naš tim rešava probleme sa curenjem vode, 
                        bukom, programima pranja, elektronikom, grejačima i pumpama.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="aircond" className="space-y-4">
                  <div className="flex flex-col md:flex-row items-center">
                    <AirConditionerIcon className="h-24 w-24 md:h-40 md:w-40 text-blue-500 mb-4 md:mb-0 md:mr-6" />
                    <div>
                      <h4 className="text-xl font-semibold text-blue-800 mb-2">Klima uređaji</h4>
                      <p className="text-gray-700">
                        Kompletne usluge održavanja i popravke klima uređaja - od čišćenja i dezinfekcije do dopune freona
                        i popravke kompleksnih kvarova na rashladnim sistemima i elektronici.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="stoves" className="space-y-4">
                  <div className="flex flex-col md:flex-row items-center">
                    <StoveIcon className="h-24 w-24 md:h-40 md:w-40 text-blue-500 mb-4 md:mb-0 md:mr-6" />
                    <div>
                      <h4 className="text-xl font-semibold text-blue-800 mb-2">Šporeti i mikrotalasne</h4>
                      <p className="text-gray-700">
                        Servis i popravka električnih i kombinovanih šporeta, rerni i mikrotalasnih pećnica. 
                        Popravljamo grejače, termostaste, programatore i elektroniku.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* O nama sekcija */}
            <div className="bg-blue-50 rounded-lg p-6 shadow-sm">
              <h3 className="text-2xl font-bold text-blue-900 mb-4">O nama</h3>
              <p className="text-gray-700 mb-4">
                Frigo Sistem Todosijević je porodična firma sa dugogodišnjim iskustvom u servisu i održavanju 
                bele tehnike. Naš tim čine visokokvalifikovani tehničari sa specijalizacijom za različite kategorije uređaja.
              </p>
              <p className="text-gray-700 mb-4">
                Naša misija je da pružimo brzu i pouzdanu uslugu koja produžava životni vek vaših kućnih aparata.
                Koristimo originalne rezervne delove i najmodernije alate za dijagnostiku i popravku.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 mt-6">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">Radnim danima: 8:00 - 16:00</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">Subota: 8:00 - 13:00</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 bg-blue-900 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold mb-2">Frigo Sistem Todosijević</h3>
              <p>Profesionalni servis bele tehnike</p>
            </div>
            <div className="flex flex-col text-center md:text-right">
              <p>Kontakt: 033 402 402</p>
              <p>Email: info@frigosistemtodosijevic.com</p>
              <p>Adresa: Lastva grbaljska bb 85317 Kotor, Crna Gora</p>
            </div>
          </div>
          <div className="mt-6 text-center text-blue-200">
            <p>&copy; {new Date().getFullYear()} Frigo Sistem Todosijević. Sva prava zadržana.</p>
            <div className="mt-2 space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/email-verification-demo")}
                className="text-blue-200 border-blue-200 hover:bg-blue-800"
              >
                Test Email Verifikacije
              </Button>
              <Link href="/privacy/policy">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-blue-200 border-blue-200 hover:bg-blue-800"
                >
                  Privacy Policy
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  primaryColor: string;
  textColor: string;
  role: string;
  isSpecial?: boolean;
}

function ServiceCard({ icon, title, description, onClick, primaryColor, textColor, role, isSpecial }: ServiceCardProps) {
  return (
    <Card className={`${primaryColor} border-none transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md ${isSpecial ? 'ring-2 ring-indigo-300' : ''}`} onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2 mb-2">
          {icon}
          <CardTitle className={`${textColor} text-xl`}>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-3">{description}</p>
        {isSpecial && (
          <div className="mb-3 text-xs text-indigo-600 font-medium">
            Electrolux • Elica • Candy • Hoover • Turbo Air
          </div>
        )}
        <Button 
          variant="outline" 
          className={`w-full text-white bg-blue-600 hover:bg-blue-700 border-blue-600`}
          onClick={onClick}
        >
          Prijavi se kao {role === 'complus' ? 'Com Plus Admin' : role}
        </Button>
      </CardContent>
    </Card>
  );
}