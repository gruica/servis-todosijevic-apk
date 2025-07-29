import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import BusinessLayout from "@/components/layout/business-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, AlertCircle, Clock, CheckCircle, Star, Plus, Search, Filter, RefreshCw, ArrowRight, Mail, Calendar, User, Building2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BusinessMessage {
  id: number;
  subject: string;
  content: string;
  messageType: string;
  messagePriority: string;
  messageStatus: string;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
  businessPartnerId: number;
  businessPartner: {
    fullName: string;
    companyName: string;
    email: string;
  };
  replies?: Array<{
    id: number;
    content: string;
    createdAt: string;
    adminId: number;
    admin: {
      fullName: string;
    };
  }>;
}

// Funkcije za prevod
function translateMessageType(type: string) {
  const typeMap: Record<string, string> = {
    inquiry: "Upit",
    complaint: "Žalba", 
    request: "Zahtev",
    feedback: "Povratne informacije"
  };
  return typeMap[type] || type;
}

function translatePriority(priority: string) {
  const priorityMap: Record<string, string> = {
    low: "Nizak",
    medium: "Srednji",
    high: "Visok", 
    urgent: "Hitno"
  };
  return priorityMap[priority] || priority;
}

function translateStatus(status: string) {
  const statusMap: Record<string, string> = {
    unread: "Nepročitano",
    read: "Pročitano",
    replied: "Odgovoreno",
    archived: "Arhivirano"
  };
  return statusMap[status] || status;
}

export default function BusinessMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<BusinessMessage | null>(null);
  const [messageFilter, setMessageFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state za novi message
  const [newMessage, setNewMessage] = useState({
    subject: "",
    content: "",
    messageType: "inquiry",
    messagePriority: "medium"
  });

  // Fetch messages
  const { data: messages = [], isLoading, refetch } = useQuery<BusinessMessage[]>({
    queryKey: ["/api/business/messages"],
    enabled: !!user?.id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: typeof newMessage) => {
      return apiRequest("/api/business/messages", {
        method: "POST",
        body: JSON.stringify(messageData)
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Uspešno", 
        description: "Poruka je uspešno poslana administratorima." 
      });
      setComposeDialogOpen(false);
      setNewMessage({
        subject: "",
        content: "",
        messageType: "inquiry", 
        messagePriority: "medium"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/business/messages"] });
    },
    onError: () => {
      toast({ 
        title: "Greška", 
        description: "Došlo je do greške pri slanju poruke.",
        variant: "destructive"
      });
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/business/messages/${messageId}/read`, {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/messages"] });
    }
  });

  // Filter messages
  const filteredMessages = messages.filter(message => {
    const matchesFilter = messageFilter === "all" || message.messageStatus === messageFilter;
    const matchesSearch = searchQuery === "" || 
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSendMessage = () => {
    if (!newMessage.subject.trim() || !newMessage.content.trim()) {
      toast({
        title: "Greška",
        description: "Naslov i sadržaj poruke su obavezni.",
        variant: "destructive"
      });
      return;
    }
    sendMessageMutation.mutate(newMessage);
  };

  const handleMessageClick = (message: BusinessMessage) => {
    setSelectedMessage(message);
    if (message.messageStatus === 'unread') {
      markAsReadMutation.mutate(message.id);
    }
  };

  return (
    <BusinessLayout>
      <div className="space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-teal-600/10" />
          
          <div className="relative px-6 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Komunikacija sa administraciją
                  </h1>
                  <p className="text-lg text-gray-600 mt-1">
                    Direktna komunikacija sa administrativnim timom
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Pošaljite pitanja, zahteve ili povratne informacije
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => refetch()}
                  className="bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200"
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Osveži
                </Button>
                <Dialog open={composeDialogOpen} onOpenChange={setComposeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 shadow-lg"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Nova poruka
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Pošaljite poruku administratorima
                      </DialogTitle>
                      <DialogDescription>
                        Direktno komunicirajte sa administrativnim timom o vašim pitanjima ili zahtevima.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="messageType">Tip poruke</Label>
                          <Select 
                            value={newMessage.messageType} 
                            onValueChange={(value) => setNewMessage(prev => ({...prev, messageType: value}))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inquiry">Upit</SelectItem>
                              <SelectItem value="complaint">Žalba</SelectItem>
                              <SelectItem value="request">Zahtev</SelectItem>
                              <SelectItem value="feedback">Povratne informacije</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="messagePriority">Prioritet</Label>
                          <Select 
                            value={newMessage.messagePriority} 
                            onValueChange={(value) => setNewMessage(prev => ({...prev, messagePriority: value}))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Nizak</SelectItem>
                              <SelectItem value="medium">Srednji</SelectItem>
                              <SelectItem value="high">Visok</SelectItem>
                              <SelectItem value="urgent">Hitno</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="subject">Naslov poruke</Label>
                        <Input
                          id="subject"
                          placeholder="Unesite naslov poruke..."
                          value={newMessage.subject}
                          onChange={(e) => setNewMessage(prev => ({...prev, subject: e.target.value}))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="content">Sadržaj poruke</Label>
                        <Textarea
                          id="content"
                          placeholder="Opišite detaljno vaš upit, zahtev ili problem..."
                          value={newMessage.content}
                          onChange={(e) => setNewMessage(prev => ({...prev, content: e.target.value}))}
                          rows={6}
                        />
                      </div>
                      
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setComposeDialogOpen(false)}
                        >
                          Otkaži
                        </Button>
                        <Button
                          onClick={handleSendMessage}
                          disabled={sendMessageMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {sendMessageMutation.isPending ? "Šalje se..." : "Pošalji poruku"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filteri i pretraga
                </CardTitle>
                <CardDescription>
                  Filtrirajte i pretražujte vaše poruke
                </CardDescription>
              </div>
              
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Pretražite poruke..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <Select value={messageFilter} onValueChange={setMessageFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Sve poruke</SelectItem>
                    <SelectItem value="unread">Nepročitano</SelectItem>
                    <SelectItem value="read">Pročitano</SelectItem>
                    <SelectItem value="replied">Odgovoreno</SelectItem>
                    <SelectItem value="archived">Arhivirano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Messages List */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Vaše poruke ({filteredMessages.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                      <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
                      <h3 className="font-semibold text-gray-900 mb-2">Nema poruka</h3>
                      <p className="text-sm text-gray-500">
                        {searchQuery || messageFilter !== "all" 
                          ? "Nema poruka koje odgovaraju vašim kriterijumima pretrage."
                          : "Kreirajte prvu poruku administratorima."
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                            selectedMessage?.id === message.id ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                          }`}
                          onClick={() => handleMessageClick(message)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className={`font-medium text-sm ${
                                message.messageStatus === 'unread' ? 'font-bold text-gray-900' : 'text-gray-700'
                              }`}>
                                {message.subject}
                              </h4>
                              {message.isStarred && (
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge 
                                variant="outline"
                                className={`text-xs ${
                                  message.messagePriority === 'urgent' ? 'border-red-200 text-red-700 bg-red-50' :
                                  message.messagePriority === 'high' ? 'border-orange-200 text-orange-700 bg-orange-50' :
                                  message.messagePriority === 'medium' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                  'border-gray-200 text-gray-700 bg-gray-50'
                                }`}
                              >
                                {translatePriority(message.messagePriority)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {translateMessageType(message.messageType)}
                            </Badge>
                            <Badge 
                              variant="outline"
                              className={`text-xs ${
                                message.messageStatus === 'replied' ? 'border-green-200 text-green-700 bg-green-50' :
                                message.messageStatus === 'unread' ? 'border-red-200 text-red-700 bg-red-50' :
                                'border-gray-200 text-gray-700 bg-gray-50'
                              }`}
                            >
                              {translateStatus(message.messageStatus)}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                            {message.content}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(message.createdAt).toLocaleDateString('sr-RS')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Message Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Detalji poruke
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedMessage ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-16 w-16 text-gray-300 mb-6" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Izaberite poruku
                    </h3>
                    <p className="text-gray-500 max-w-md">
                      Kliknite na poruku sa leve strane da vidite detalje i eventualne odgovore administratora.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Message Header */}
                    <div className="border-b border-gray-200 pb-6">
                      <div className="flex items-start justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {selectedMessage.subject}
                        </h2>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline"
                            className={`${
                              selectedMessage.messagePriority === 'urgent' ? 'border-red-200 text-red-700 bg-red-50' :
                              selectedMessage.messagePriority === 'high' ? 'border-orange-200 text-orange-700 bg-orange-50' :
                              selectedMessage.messagePriority === 'medium' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                              'border-gray-200 text-gray-700 bg-gray-50'
                            }`}
                          >
                            {translatePriority(selectedMessage.messagePriority)}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={`${
                              selectedMessage.messageStatus === 'replied' ? 'border-green-200 text-green-700 bg-green-50' :
                              selectedMessage.messageStatus === 'unread' ? 'border-red-200 text-red-700 bg-red-50' :
                              'border-gray-200 text-gray-700 bg-gray-50'
                            }`}
                          >
                            {translateStatus(selectedMessage.messageStatus)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Tip:</span>
                          <span className="font-medium">{translateMessageType(selectedMessage.messageType)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Poslano:</span>
                          <span className="font-medium">
                            {new Date(selectedMessage.createdAt).toLocaleString('sr-RS')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Vaša poruka</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {selectedMessage.content}
                        </p>
                      </div>
                    </div>

                    {/* Replies */}
                    {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <ArrowRight className="h-4 w-4" />
                          Odgovori administratora ({selectedMessage.replies.length})
                        </h3>
                        <div className="space-y-4">
                          {selectedMessage.replies.map((reply) => (
                            <div key={reply.id} className="bg-blue-50 rounded-lg p-4 border-l-4 border-l-blue-500">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-blue-900">
                                    {reply.admin.fullName}
                                  </span>
                                  <span className="text-sm text-blue-600">Administrator</span>
                                </div>
                                <span className="text-sm text-blue-600">
                                  {new Date(reply.createdAt).toLocaleString('sr-RS')}
                                </span>
                              </div>
                              <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">
                                {reply.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedMessage.messageStatus === 'read' && (!selectedMessage.replies || selectedMessage.replies.length === 0) && (
                      <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-l-yellow-500">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-yellow-600" />
                          <span className="font-medium text-yellow-800">Čeka se odgovor</span>
                        </div>
                        <p className="text-yellow-700 mt-1">
                          Vaša poruka je pročitana od strane administratora. Odgovor će stići uskoro.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}