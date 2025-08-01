import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Eye, Clock, CheckCircle, AlertTriangle, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface BusinessPartnerMessage {
  id: number;
  subject: string;
  content: string;
  messageType: 'inquiry' | 'complaint' | 'request' | 'update' | 'urgent';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'replied' | 'archived';
  createdAt: string;
  updatedAt: string;
  isStarred: boolean;
  senderName: string;
  senderEmail: string;
  senderCompany: string;
  senderPhone?: string;
  relatedServiceId?: number;
  relatedClientName?: string;
  adminResponse?: string;
  adminRespondedAt?: string;
  adminRespondedBy?: string;
}

export function ContactAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isComposing, setIsComposing] = useState(false);
  const [messageForm, setMessageForm] = useState({
    subject: "",
    content: "",
    messageType: "inquiry" as const,
    priority: "normal" as const,
    senderPhone: "",
    relatedServiceId: "",
    relatedClientName: ""
  });

  // Dobijanje poruka korisnika
  const { data: messages = [], isLoading } = useQuery<BusinessPartnerMessage[]>({
    queryKey: ['/api/business/messages'],
    enabled: !!user?.id,
  });

  // Slanje nove poruke
  const sendMessageMutation = useMutation({
    mutationFn: (data: typeof messageForm) => 
      apiRequest('/api/business/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: "Poruka poslata",
        description: "Vaša poruka je uspešno poslata admin-u. Odgovor ćete dobiti u najkraćem roku.",
      });
      setMessageForm({
        subject: "",
        content: "",
        messageType: "inquiry",
        priority: "normal",
        senderPhone: "",
        relatedServiceId: "",
        relatedClientName: ""
      });
      setIsComposing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/business/messages'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Greška pri slanju poruke",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageForm.subject.trim() || !messageForm.content.trim()) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: "Naslov i sadržaj poruke su obavezni",
      });
      return;
    }

    sendMessageMutation.mutate(messageForm);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'read': return <Eye className="h-4 w-4 text-green-500" />;
      case 'replied': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'archived': return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      'unread': 'Nepročitano',
      'read': 'Pročitano',
      'replied': 'Odgovoreno',
      'archived': 'Arhivirano'
    };
    return map[status] || status;
  };

  const translateMessageType = (type: string) => {
    const map: Record<string, string> = {
      'inquiry': 'Upit',
      'complaint': 'Žalba',
      'request': 'Zahtev',
      'update': 'Ažuriranje',
      'urgent': 'Hitno'
    };
    return map[type] || type;
  };

  const translatePriority = (priority: string) => {
    const map: Record<string, string> = {
      'low': 'Nizak',
      'normal': 'Normalan',
      'high': 'Visok',
      'urgent': 'Hitan'
    };
    return map[priority] || priority;
  };

  return (
    <div className="space-y-6">
      {/* Header sa dugmetom za novu poruku */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Komunikacija sa Admin-om</h2>
          <p className="text-gray-600">Kontaktirajte administratore za pomoć oko servisa</p>
        </div>
        <Button 
          onClick={() => setIsComposing(true)}
          className="flex items-center gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          Nova Poruka
        </Button>
      </div>

      {/* Form za novu poruku */}
      {isComposing && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Poruka za Admin</CardTitle>
            <CardDescription>Opišite vaš zahtev ili pitanje detaljno</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Naslov Poruke *</Label>
                  <Input
                    id="subject"
                    value={messageForm.subject}
                    onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                    placeholder="Kratak opis problema ili zahteva"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="messageType">Tip Poruke</Label>
                  <Select
                    value={messageForm.messageType}
                    onValueChange={(value: any) => setMessageForm({ ...messageForm, messageType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inquiry">Upit</SelectItem>
                      <SelectItem value="complaint">Žalba</SelectItem>
                      <SelectItem value="request">Zahtev</SelectItem>
                      <SelectItem value="update">Ažuriranje</SelectItem>
                      <SelectItem value="urgent">Hitno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Prioritet</Label>
                  <Select
                    value={messageForm.priority}
                    onValueChange={(value: any) => setMessageForm({ ...messageForm, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Nizak</SelectItem>
                      <SelectItem value="normal">Normalan</SelectItem>
                      <SelectItem value="high">Visok</SelectItem>
                      <SelectItem value="urgent">Hitan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="senderPhone">Telefon (opciono)</Label>
                  <Input
                    id="senderPhone"
                    value={messageForm.senderPhone}
                    onChange={(e) => setMessageForm({ ...messageForm, senderPhone: e.target.value })}
                    placeholder="Vaš broj telefona"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="content">Sadržaj Poruke *</Label>
                <Textarea
                  id="content"
                  value={messageForm.content}
                  onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                  placeholder="Detaljno opišite vaš problem, zahtev ili pitanje..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsComposing(false)}
                >
                  Otkaži
                </Button>
                <Button 
                  type="submit" 
                  disabled={sendMessageMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendMessageMutation.isPending ? "Slanje..." : "Pošalji Poruku"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista postojećih poruka */}
      <Card>
        <CardHeader>
          <CardTitle>Vaše Poruke</CardTitle>
          <CardDescription>
            Pregled svih poruka koje ste poslali admin-u
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Učitavanje poruka...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nema poslanih poruka</p>
              <p className="text-sm">Kliknite "Nova Poruka" da kontaktirate admin</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{message.subject}</h4>
                        {message.isStarred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {getStatusIcon(message.status)}
                        <span>{translateStatus(message.status)}</span>
                        <span>•</span>
                        <Badge variant="outline" className={getPriorityColor(message.priority)}>
                          {translatePriority(message.priority)}
                        </Badge>
                        <span>•</span>
                        <span>{translateMessageType(message.messageType)}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(message.createdAt).toLocaleDateString('sr-RS')}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{message.content}</p>
                  
                  {message.adminResponse && (
                    <div className="bg-blue-50 border-l-4 border-blue-200 p-3 mt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-900">Odgovor Admin-a</span>
                        <span className="text-xs text-gray-500">
                          {message.adminRespondedAt && new Date(message.adminRespondedAt).toLocaleDateString('sr-RS')}
                        </span>
                      </div>
                      <p className="text-gray-700">{message.adminResponse}</p>
                      {message.adminRespondedBy && (
                        <p className="text-xs text-gray-500 mt-1">
                          - {message.adminRespondedBy}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}