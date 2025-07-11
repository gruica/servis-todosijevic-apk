import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User, Phone, Mail, MapPin, Plus } from "lucide-react";
import { Client } from "@shared/schema";

interface ClientSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientSelect: (client: Client) => void;
  onCreateNew?: () => void;
  title?: string;
}

export function ClientSearchDialog({ 
  open, 
  onOpenChange, 
  onClientSelect, 
  onCreateNew,
  title = "Pretraga klijenata"
}: ClientSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open,
  });

  useEffect(() => {
    if (!clients || !searchTerm) {
      setFilteredClients(clients || []);
      return;
    }

    const filtered = clients.filter(client => {
      const searchLower = searchTerm.toLowerCase();
      return (
        client.fullName.toLowerCase().includes(searchLower) ||
        client.phone.includes(searchTerm) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.city?.toLowerCase().includes(searchLower) ||
        client.address?.toLowerCase().includes(searchLower)
      );
    });

    setFilteredClients(filtered);
  }, [clients, searchTerm]);

  const handleClientSelect = (client: Client) => {
    onClientSelect(client);
    onOpenChange(false);
    setSearchTerm("");
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    }
    onOpenChange(false);
    setSearchTerm("");
  };

  const highlightMatch = (text: string, search: string) => {
    if (!search) return text;
    
    const regex = new RegExp(`(${search})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pretražite po imenu, telefonu, email-u ili gradu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {onCreateNew && (
            <Button
              onClick={handleCreateNew}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Kreiraj novog klijenta
            </Button>
          )}

          <ScrollArea className="flex-1 max-h-96">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? (
                  <div>
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nema rezultata za "{searchTerm}"</p>
                    <p className="text-sm mt-1">Pokušajte sa drugim pojmom pretrage</p>
                  </div>
                ) : (
                  <div>
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nema klijenata u sistemu</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredClients.map((client) => (
                  <Card 
                    key={client.id} 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleClientSelect(client)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm mb-1">
                            {highlightMatch(client.fullName, searchTerm)}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {highlightMatch(client.phone, searchTerm)}
                            </div>
                            {client.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {highlightMatch(client.email, searchTerm)}
                              </div>
                            )}
                            {client.city && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {highlightMatch(client.city, searchTerm)}
                              </div>
                            )}
                          </div>
                          {client.address && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {highlightMatch(client.address, searchTerm)}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          #{client.id}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {filteredClients.length > 0 && (
            <div className="text-xs text-muted-foreground text-center border-t pt-2">
              Pronađeno {filteredClients.length} klijent{filteredClients.length !== 1 ? 'a' : ''}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}