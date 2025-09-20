import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Settings, Info } from "lucide-react";

export default function GitHubManagementSimple() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Github className="h-8 w-8" />
          GitHub Integration Management
        </h1>
        <p className="text-gray-600 mt-2">
          Upravljanje GitHub funkcionalnostima i sinhronizacijom repozitorijuma
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Konekcija
            </CardTitle>
            <CardDescription>
              Status konekcije sa GitHub platformom
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">U razvoju</span>
                </div>
                <p className="text-yellow-700 text-sm">
                  GitHub integracija je trenutno u razvoju. Funkcionalnosti će biti dostupne uskoro.
                </p>
              </div>
              
              <Button disabled className="w-full">
                <Github className="h-4 w-4 mr-2" />
                Povezati GitHub nalog
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Automatski Backup
            </CardTitle>
            <CardDescription>
              Automatska sinhronizacija koda u repozitorijum
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-gray-700 text-sm mb-2">
                  Planirane funkcionalnosti:
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Automatski commit promena</li>
                  <li>• Sinhronizacija sa repozitorijumom</li>
                  <li>• Backup scheduling</li>
                  <li>• Version control</li>
                </ul>
              </div>
              
              <Button disabled className="w-full">
                Konfigurišite backup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}