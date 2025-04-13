import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Phone, Info, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";

interface SMSConfigResponse {
  configured: boolean;
  phone: string | null;
  missingCredentials: {
    accountSid: boolean;
    authToken: boolean;
    phoneNumber: boolean;
  };
  invalidCredentials: {
    accountSid: boolean;
  };
}

interface Client {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
}

export default function SMSMessaging() {
  const { toast } = useToast();
  const [testRecipient, setTestRecipient] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [charactersLeft, setCharactersLeft] = useState(160);
  const [charsLeftBulk, setCharsLeftBulk] = useState(160);
  
  // Dohvati konfiguraciju SMS servisa - obavezno osvežiti svaki put
  const { data: smsConfig, isLoading: configLoading, refetch: refetchSmsConfig } = useQuery<SMSConfigResponse>({
    queryKey: ["/api/sms/config"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sms/config");
      console.log("SMS config response:", res.status);
      const data = await res.json();
      console.log("SMS config data:", data);
      return data;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 5000, // Osvežavanje svakih 5 sekundi
    retry: 3,
  });

  // Dohvati listu klijenata
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/clients");
      return await res.json();
    },
  });

  // Mutacija za slanje test poruke
  const testSendMutation = useMutation({
    mutationFn: async (data: { recipient: string; message: string }) => {
      const res = await apiRequest("POST", "/api/sms/test", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Greška pri slanju test SMS poruke");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Uspešno",
        description: "Test SMS poruka je uspešno poslata",
        variant: "default",
      });
      setTestMessage("");
      setTestRecipient("");
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutacija za slanje grupne poruke
  const bulkSendMutation = useMutation({
    mutationFn: async (data: { clientIds: number[]; message: string }) => {
      const res = await apiRequest("POST", "/api/sms/bulk", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Greška pri slanju grupne SMS poruke");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      const { results } = data;
      toast({
        title: "Slanje poruka završeno",
        description: `Uspešno: ${results.sent}, Neuspešno: ${results.failed} od ukupno ${results.total} poruka`,
        variant: results.failed > 0 ? "destructive" : "default",
      });
      setBulkMessage("");
      setSelectedClients([]);
      setSelectAll(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Prati broj preostalih karaktera za SMS poruke
  useEffect(() => {
    setCharactersLeft(160 - testMessage.length);
  }, [testMessage]);

  useEffect(() => {
    setCharsLeftBulk(160 - bulkMessage.length);
  }, [bulkMessage]);

  // Rukovanje selektovanjem/deselektovanjem svih klijenata
  useEffect(() => {
    if (clients) {
      if (selectAll) {
        // Selektuj samo klijente koji imaju telefonski broj
        setSelectedClients(clients.filter(client => client.phone).map(client => client.id));
      } else {
        setSelectedClients([]);
      }
    }
  }, [selectAll, clients]);

  // Rukovanje izborom pojedinačnih klijenata
  const toggleClient = (clientId: number) => {
    setSelectedClients(prev => {
      const isSelected = prev.includes(clientId);
      if (isSelected) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
  };

  // Funkcija za slanje test poruke
  const handleSendTest = () => {
    if (!testRecipient || !testMessage) {
      toast({
        title: "Greška",
        description: "Broj telefona i tekst poruke su obavezni",
        variant: "destructive",
      });
      return;
    }
    
    if (testMessage.length > 160) {
      toast({
        title: "Greška",
        description: "SMS poruka ne može biti duža od 160 karaktera",
        variant: "destructive",
      });
      return;
    }
    
    testSendMutation.mutate({
      recipient: testRecipient,
      message: testMessage
    });
  };
  
  // Funkcija za slanje grupne poruke
  const handleSendBulk = () => {
    if (selectedClients.length === 0) {
      toast({
        title: "Greška",
        description: "Morate izabrati bar jednog klijenta",
        variant: "destructive",
      });
      return;
    }
    
    if (!bulkMessage.trim()) {
      toast({
        title: "Greška",
        description: "Tekst poruke je obavezan",
        variant: "destructive",
      });
      return;
    }
    
    if (bulkMessage.length > 160) {
      toast({
        title: "Greška",
        description: "SMS poruka ne može biti duža od 160 karaktera",
        variant: "destructive",
      });
      return;
    }
    
    bulkSendMutation.mutate({
      clientIds: selectedClients,
      message: bulkMessage
    });
  };

  if (configLoading || clientsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">SMS Poruke</h1>

        {smsConfig && !smsConfig.configured && (
          <Alert variant="destructive" className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Upozorenje</AlertTitle>
            <AlertDescription>
              <p>SMS servis nije pravilno konfigurisan. Proverite sledeće kredencijale:</p>
              <ul className="list-disc pl-5 mt-2">
                {smsConfig.missingCredentials.accountSid && (
                  <li>Nedostaje Twilio Account SID</li>
                )}
                {smsConfig.missingCredentials.authToken && (
                  <li>Nedostaje Twilio Auth Token</li>
                )}
                {smsConfig.missingCredentials.phoneNumber && (
                  <li>Nedostaje Twilio broj telefona</li>
                )}
                {smsConfig.invalidCredentials.accountSid && (
                  <li>Account SID nije validan (mora početi sa "AC")</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {smsConfig && smsConfig.configured && (
          <Alert className="mb-6">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>SMS servis je aktivan</AlertTitle>
            <AlertDescription>
              SMS poruke se šalju sa broja: {smsConfig.phone}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Test SMS Card */}
          <Card>
            <CardHeader>
              <CardTitle>Test SMS</CardTitle>
              <CardDescription>
                Pošaljite pojedinačnu test SMS poruku
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-recipient">Broj telefona</Label>
                  <div className="flex">
                    <Input
                      id="test-recipient"
                      placeholder="+38269123456"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-message">Poruka</Label>
                  <Textarea
                    id="test-message"
                    placeholder="Tekst poruke"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    maxLength={160}
                  />
                  <p className={`text-xs ${charactersLeft < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    Preostalo karaktera: {charactersLeft}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSendTest}
                disabled={testSendMutation.isPending || !testRecipient || !testMessage || testMessage.length > 160}
                className="w-full"
              >
                {testSendMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Slanje...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Pošalji test
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* SMS Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status SMS servisa</CardTitle>
              <CardDescription>
                Pregled statusa i konfiguracije Twilio SMS servisa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant={smsConfig?.configured ? "default" : "destructive"}>
                    {smsConfig?.configured ? "Aktivan" : "Neaktivan"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Twilio broj:</span>
                  <span>{smsConfig?.phone || "Nije konfigurisan"}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-md text-sm">
                  <p className="text-xs text-gray-500 mb-2">Napomena:</p>
                  <p className="text-xs">
                    SMS poruke se naplaćuju po poruci. Standardna SMS poruka može sadržati do 160 karaktera.
                    Poruke se šalju putem Twilio servisa uz obavezan prefiks "Frigo Sistem Todosijević".
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/sms/config"] })}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Osveži status
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Bulk SMS */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Grupno slanje SMS poruka</CardTitle>
            <CardDescription>
              Pošaljite SMS poruku izabranim klijentima
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-message">Tekst poruke</Label>
                <Textarea
                  id="bulk-message"
                  placeholder="Tekst poruke koji će biti poslat svim izabranim klijentima"
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  maxLength={160}
                />
                <p className={`text-xs ${charsLeftBulk < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                  Preostalo karaktera: {charsLeftBulk}
                </p>
              </div>

              <div className="py-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Izaberite klijente</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectAll}
                      onCheckedChange={() => setSelectAll(!selectAll)}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Izaberi sve
                    </label>
                  </div>
                </div>

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>Ime klijenta</TableHead>
                        <TableHead>Broj telefona</TableHead>
                        <TableHead className="text-right">Izaberi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients && clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="text-center">{client.id}</TableCell>
                          <TableCell>{client.fullName}</TableCell>
                          <TableCell>
                            {client.phone ? (
                              client.phone
                            ) : (
                              <span className="text-red-500 text-xs">Nema broj</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Checkbox
                              checked={selectedClients.includes(client.id)}
                              onCheckedChange={() => toggleClient(client.id)}
                              disabled={!client.phone}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="w-full flex flex-col sm:flex-row justify-between gap-2">
              <p className="text-sm text-gray-500">
                Izabrano: {selectedClients.length} klijenata
              </p>
              <Button
                onClick={handleSendBulk}
                disabled={bulkSendMutation.isPending || selectedClients.length === 0 || !bulkMessage.trim() || bulkMessage.length > 160}
              >
                {bulkSendMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Slanje...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Pošalji svima ({selectedClients.length})
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  );
}