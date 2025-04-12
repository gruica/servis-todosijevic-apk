import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Strana za otklanjanje grešaka u servisi stranici
 */
export default function ServicesDebug() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [servicesData, setServicesData] = useState<null | string>(null);
  const [clientsData, setClientsData] = useState<null | string>(null);
  const [appliancesData, setAppliancesData] = useState<null | string>(null);
  const [categoriesData, setCategoriesData] = useState<null | string>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [results, setResults] = useState<string[]>([]);

  // Funkcija za dohvatanje svih potrebnih podataka
  const fetchData = async () => {
    setIsLoading(true);
    setResults([]);
    setError(null);
    
    try {
      // Dohvati servise
      const servicesRes = await fetch('/api/services');
      const services = await servicesRes.json();
      setServicesData(JSON.stringify(services, null, 2));
      addResult(`Dobijeno ${services.length} servisa`);
      
      // Dohvati klijente
      const clientsRes = await fetch('/api/clients');
      const clients = await clientsRes.json();
      setClientsData(JSON.stringify(clients, null, 2));
      addResult(`Dobijeno ${clients.length} klijenata`);
      
      // Dohvati uređaje
      const appliancesRes = await fetch('/api/appliances');
      const appliances = await appliancesRes.json();
      setAppliancesData(JSON.stringify(appliances, null, 2));
      addResult(`Dobijeno ${appliances.length} uređaja`);
      
      // Dohvati kategorije
      const categoriesRes = await fetch('/api/appliance-categories');
      const categories = await categoriesRes.json();
      setCategoriesData(JSON.stringify(categories, null, 2));
      addResult(`Dobijeno ${categories.length} kategorija`);
      
      // Analiziraj podatke i traži probleme
      analyzeData(services, clients, appliances, categories);
      
    } catch (err) {
      console.error("Greška pri dohvatanju podataka:", err);
      setError(err instanceof Error ? err.message : "Nepoznata greška");
      addResult(`GREŠKA: ${err instanceof Error ? err.message : "Nepoznata greška"}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funkcija za analizu podataka i identifikaciju problema
  const analyzeData = (services: any[], clients: any[], appliances: any[], categories: any[]) => {
    addResult("Početak analize podataka...");
    
    // Provjeri da li su svi potrebni podaci dostupni
    if (!services || !clients || !appliances || !categories) {
      addResult("GREŠKA: Nedostaju podaci za analizu");
      return;
    }
    
    // 1. Proveri servise koji nemaju odgovarajućeg klijenta
    const servicesWithoutClient = services.filter(service => 
      !clients.some(client => client.id === service.clientId)
    );
    
    if (servicesWithoutClient.length > 0) {
      addResult(`PROBLEM: ${servicesWithoutClient.length} servisa nema odgovarajućeg klijenta`);
      servicesWithoutClient.forEach(service => {
        addResult(`  - Servis #${service.id}: clientId=${service.clientId} (nepostojeći)`);
      });
    } else {
      addResult("✅ Svi servisi imaju validne klijente");
    }
    
    // 2. Proveri servise koji nemaju odgovarajući uređaj
    const servicesWithoutAppliance = services.filter(service => 
      !appliances.some(appliance => appliance.id === service.applianceId)
    );
    
    if (servicesWithoutAppliance.length > 0) {
      addResult(`PROBLEM: ${servicesWithoutAppliance.length} servisa nema odgovarajući uređaj`);
      servicesWithoutAppliance.forEach(service => {
        addResult(`  - Servis #${service.id}: applianceId=${service.applianceId} (nepostojeći)`);
      });
    } else {
      addResult("✅ Svi servisi imaju validne uređaje");
    }
    
    // 3. Proveri uređaje koji nemaju odgovarajuću kategoriju
    const appliancesWithoutCategory = appliances.filter(appliance => 
      !categories.some(category => category.id === appliance.categoryId)
    );
    
    if (appliancesWithoutCategory.length > 0) {
      addResult(`PROBLEM: ${appliancesWithoutCategory.length} uređaja nema odgovarajuću kategoriju`);
      appliancesWithoutCategory.forEach(appliance => {
        addResult(`  - Uređaj #${appliance.id}: categoryId=${appliance.categoryId} (nepostojeći)`);
      });
    } else {
      addResult("✅ Svi uređaji imaju validne kategorije");
    }
    
    // Dodatna analiza - Proveri da li svi servisi imaju osnovne potrebne podatke
    const servicesWithMissingData = services.filter(service => 
      !service.id || !service.status || !service.description || !service.createdAt
    );
    
    if (servicesWithMissingData.length > 0) {
      addResult(`PROBLEM: ${servicesWithMissingData.length} servisa nedostaju osnovni podaci`);
      servicesWithMissingData.forEach(service => {
        addResult(`  - Servis #${service.id}: nedostaju podaci: ${
          !service.id ? "id, " : ""
        }${!service.status ? "status, " : ""
        }${!service.description ? "opis, " : ""
        }${!service.createdAt ? "datum, " : ""}`);
      });
    } else {
      addResult("✅ Svi servisi imaju osnovne potrebne podatke");
    }
    
    addResult("Analiza podataka završena.");
  };
  
  // Pomoćna funkcija za dodavanje rezultata analize
  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
    console.log(message);
  };

  // UI
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={sidebarOpen} 
        closeMobileMenu={() => setSidebarOpen(false)} 
      />
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="container mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-medium text-gray-800">Dijagnostika servisa</h1>
              <p className="text-gray-600 mt-1">
                Detaljna analiza podataka o servisima i pronalaženje potencijalnih problema
              </p>
            </div>
            
            {/* Kontrolna tabla */}
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Kontrolna tabla</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Button 
                  onClick={fetchData} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Analiza u toku..." : "Započni dijagnostiku"}
                </Button>
                
                <div className="text-sm text-gray-600 mt-2">
                  Ova dijagnostika će analizirati servise, klijente, uređaje i kategorije kako bi pronašla potencijalne probleme.
                </div>
              </CardContent>
            </Card>
            
            {/* Rezultati analize */}
            {results.length > 0 && (
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Rezultati analize</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="bg-gray-100 p-4 rounded-md font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {results.map((result, index) => (
                      <div 
                        key={index} 
                        className={`py-1 ${
                          result.includes("PROBLEM") || result.includes("GREŠKA") 
                            ? "text-red-600 font-medium" 
                            : result.includes("✅") 
                              ? "text-green-600" 
                              : ""
                        }`}
                      >
                        {result}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Error display */}
            {error && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-red-700">Greška</CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-red-700">
                  {error}
                </CardContent>
              </Card>
            )}
            
            {/* Sirovi podaci */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Services data */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Podaci o servisima</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="bg-gray-100 p-2 rounded-md font-mono text-xs overflow-x-auto whitespace-pre max-h-60 overflow-y-auto">
                    {servicesData || "Podaci nisu dostupni"}
                  </div>
                </CardContent>
              </Card>
              
              {/* Clients data */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Podaci o klijentima</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="bg-gray-100 p-2 rounded-md font-mono text-xs overflow-x-auto whitespace-pre max-h-60 overflow-y-auto">
                    {clientsData || "Podaci nisu dostupni"}
                  </div>
                </CardContent>
              </Card>
              
              {/* Appliances data */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Podaci o uređajima</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="bg-gray-100 p-2 rounded-md font-mono text-xs overflow-x-auto whitespace-pre max-h-60 overflow-y-auto">
                    {appliancesData || "Podaci nisu dostupni"}
                  </div>
                </CardContent>
              </Card>
              
              {/* Categories data */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Podaci o kategorijama</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="bg-gray-100 p-2 rounded-md font-mono text-xs overflow-x-auto whitespace-pre max-h-60 overflow-y-auto">
                    {categoriesData || "Podaci nisu dostupni"}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Navigation links */}
            <div className="mt-6 text-center">
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="outline" onClick={() => window.location.href = "/"}>
                  Početna stranica
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/services"}>
                  Osnovna stranica servisa
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/services-safe"}>
                  Sigurna stranica servisa
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}