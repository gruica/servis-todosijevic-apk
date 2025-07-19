import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Database, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Table {
  name: string;
  displayName: string;
  description: string;
  recordCount: number;
}

export default function DataExportPage() {
  const [exportingTables, setExportingTables] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: tables, isLoading } = useQuery<Table[]>({
    queryKey: ["/api/export/tables"],
  });

  const handleExport = async (tableName: string, format: string = 'csv') => {
    setExportingTables(prev => new Set(prev).add(tableName));
    
    try {
      console.log(`Starting export for table: ${tableName}, format: ${format}`);
      
      const response = await fetch(`/api/export/data/${tableName}?format=${format}`, {
        method: 'GET',
        credentials: 'include',
      });

      console.log(`Response status: ${response.status}, ok: ${response.ok}`);
      console.log(`Response headers:`, response.headers);

      if (!response.ok) {
        // Try to get error message
        let errorMessage = 'Greška pri izvozu podataka';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Check if response is actually CSV
      const contentType = response.headers.get('content-type');
      console.log(`Content-Type: ${contentType}`);
      
      if (!contentType?.includes('text/csv')) {
        console.warn('Response is not CSV, checking if it\'s JSON error...');
        const text = await response.text();
        console.log('Response text:', text);
        
        try {
          const jsonError = JSON.parse(text);
          throw new Error(jsonError.error || 'Neočekivan format odgovora');
        } catch {
          // Not JSON, proceed with download
          console.log('Not JSON error, proceeding with download');
        }
      }

      // Create blob and download
      const blob = await response.blob();
      console.log(`Blob size: ${blob.size} bytes`);
      
      if (blob.size === 0) {
        throw new Error('Preuzeti fajl je prazan');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${tableName}.${format}`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      toast({
        title: "Izvoz uspešan",
        description: `Podaci iz tabele "${tableName}" su uspešno preuzeti (${blob.size} bytes).`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Greška pri izvozu",
        description: error instanceof Error ? error.message : "Neočekivana greška",
      });
    } finally {
      setExportingTables(prev => {
        const newSet = new Set(prev);
        newSet.delete(tableName);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Učitavanje tabela...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Izvoz podataka</h1>
        <p className="text-muted-foreground">
          Preuzmite podatke iz baze u CSV formatu za dalju analizu ili backup
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tables?.map((table) => (
          <Card key={table.name} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{table.displayName}</CardTitle>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {table.recordCount} zapisa
                </Badge>
              </div>
              <CardDescription>{table.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Tabela: <code className="bg-muted px-1 py-0.5 rounded">{table.name}</code>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleExport(table.name, 'csv')}
                    disabled={exportingTables.has(table.name) || table.recordCount === 0}
                    className="flex-1"
                    size="sm"
                  >
                    {exportingTables.has(table.name) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Izvozi...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        CSV
                      </>
                    )}
                  </Button>
                </div>
                
                {table.recordCount === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Nema podataka za izvoz
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Napomene o izvozu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>CSV fajlovi se mogu otvoriti u Excel-u, Google Sheets ili bilo kom tekst editoru</li>
              <li>Podaci se izvozе u UTF-8 enkodiranju sa podrškom za ćirilična slova</li>
              <li>Fajlovi se automatski preuzimaju u Downloads folder</li>
              <li>Izvoz je dostupan samo administratorima sistema</li>
              <li>Podaci se izvozе u trenutnom stanju baze podataka</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}