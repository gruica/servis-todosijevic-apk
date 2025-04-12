import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, CheckCircle2, Database, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SQLResult {
  success: boolean;
  rowCount?: number;
  rows?: any[];
  fields?: { name: string; dataTypeID: number }[];
  error?: string;
}

export default function SQLAdminPage() {
  const { user, isLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SQLResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("editor");

  // Primeri sigurnih upita za pomoć korisniku
  const queryExamples = [
    {
      title: "Pregled svih tabela",
      query: "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public';"
    },
    {
      title: "Struktura tabele korisnika",
      query: "SELECT column_name, data_type, character_maximum_length FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users';"
    },
    {
      title: "Pregled svih korisnika",
      query: "SELECT id, username, full_name, role FROM users;"
    },
    {
      title: "Pregled svih servisa",
      query: "SELECT id, description, status, created_at FROM services ORDER BY created_at DESC LIMIT 10;"
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Ukoliko korisnik nije prijavljen ili nije admin, redirektuj na login stranicu
  if (!user || user.role !== "admin") {
    return <Redirect to="/auth" />;
  }

  const executeQuery = async () => {
    if (!query.trim()) {
      setError("Unesite SQL upit");
      return;
    }

    setIsExecuting(true);
    setError(null);
    
    try {
      const response = await apiRequest("POST", "/api/admin/execute-sql", { query });
      const data = await response.json();
      
      setResult(data);
      
      // Dodaj u istoriju upita ako je uspešno
      if (data.success) {
        setHistory((prev) => [query, ...prev.slice(0, 9)]);
      }
    } catch (err) {
      setError("Greška pri izvršavanju upita: " + (err instanceof Error ? err.message : String(err)));
      setResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  const loadFromHistory = (historyQuery: string) => {
    setQuery(historyQuery);
    setActiveTab("editor");
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">SQL Upravljač Baze Podataka</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-6 w-6" />
            SQL Upravljač
          </CardTitle>
          <CardDescription>
            Izvršavanje SQL upita direktno na PostgreSQL bazi. Koristite pažljivo, promene su trajne.
          </CardDescription>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6">
            <TabsList className="mb-2">
              <TabsTrigger value="editor">SQL Editor</TabsTrigger>
              <TabsTrigger value="history">Istorija upita</TabsTrigger>
              <TabsTrigger value="examples">Primeri</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="editor">
            <CardContent>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Unesite SQL upit ovde..."
                className="font-mono h-40 mb-4"
              />
              
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Greška</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Napomena: Destruktivni upiti (DROP, TRUNCATE) su onemogućeni.
              </div>
              <Button 
                onClick={executeQuery} 
                disabled={isExecuting || !query.trim()}
                className="ml-2"
              >
                {isExecuting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Izvrši upit
              </Button>
            </CardFooter>
          </TabsContent>
          
          <TabsContent value="history">
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Nema istorije upita
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((historyQuery, index) => (
                    <div key={index} className="group p-3 rounded-md bg-secondary/50 hover:bg-secondary">
                      <pre className="text-xs overflow-x-auto">{historyQuery}</pre>
                      <div className="mt-2 text-right">
                        <Button variant="outline" size="sm" onClick={() => loadFromHistory(historyQuery)}>
                          Koristi
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </TabsContent>
          
          <TabsContent value="examples">
            <CardContent>
              <div className="space-y-4">
                {queryExamples.map((example, index) => (
                  <div key={index} className="group p-3 rounded-md bg-secondary/50 hover:bg-secondary">
                    <h3 className="text-sm font-medium mb-2">{example.title}</h3>
                    <pre className="text-xs overflow-x-auto mb-2">{example.query}</pre>
                    <div className="text-right">
                      <Button variant="outline" size="sm" onClick={() => {
                        setQuery(example.query);
                        setActiveTab("editor");
                      }}>
                        Koristi ovaj upit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
      
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {result.success ? (
                <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
              )}
              Rezultat upita
            </CardTitle>
            {result.success && result.rowCount !== undefined && (
              <CardDescription>Broj redova: {result.rowCount}</CardDescription>
            )}
          </CardHeader>
          
          <CardContent>
            {result.success ? (
              result.rows && result.rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {result.fields?.map((field) => (
                          <TableHead key={field.name}>{field.name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rows.map((row, i) => (
                        <TableRow key={i}>
                          {result.fields?.map((field) => (
                            <TableCell key={field.name}>
                              {row[field.name] === null
                                ? <span className="text-muted-foreground italic">NULL</span>
                                : typeof row[field.name] === 'object'
                                  ? JSON.stringify(row[field.name])
                                  : String(row[field.name])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                    {result.rowCount === 0 && (
                      <TableCaption>Nema podataka za prikaz</TableCaption>
                    )}
                  </Table>
                </div>
              ) : (
                <div className="bg-muted p-3 rounded text-center">
                  {result.rowCount === 0
                    ? "Upit je uspešno izvršen, ali nema podataka za prikaz."
                    : "Upit je uspešno izvršen."}
                </div>
              )
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Greška pri izvršavanju upita</AlertTitle>
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}