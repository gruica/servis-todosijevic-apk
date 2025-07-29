import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Filter, 
  Plus, 
  Reply, 
  Archive, 
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  Building2,
  Eye,
  MoreVertical,
  Star,
  PaperclipIcon,
  Trash2
} from 'lucide-react';

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
  // Sender info
  senderName: string;
  senderEmail: string;
  senderCompany: string;
  senderPhone?: string;
  // Related data
  relatedServiceId?: number;
  relatedClientName?: string;
  attachments?: string[];
  // Admin response info
  adminResponse?: string;
  adminRespondedAt?: string;
  adminRespondedBy?: string;
}

interface MessageStats {
  totalMessages: number;
  unreadMessages: number;
  repliedMessages: number;
  archivedMessages: number;
  urgentMessages: number;
  averageResponseTime: number; // in hours
}

export default function BusinessPartnerMessages() {
  const [selectedTab, setSelectedTab] = useState("inbox");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<BusinessPartnerMessage | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto-refresh for real-time messages (every 5 seconds)
  useEffect(() => {
    if (!isRealTimeEnabled) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-messages/stats"] });
    }, 5000);

    return () => clearInterval(interval);
  }, [isRealTimeEnabled, queryClient]);

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<BusinessPartnerMessage[]>({
    queryKey: ["/api/admin/business-partner-messages"],
  });

  // Fetch message statistics
  const { data: stats } = useQuery<MessageStats>({
    queryKey: ["/api/admin/business-partner-messages/stats"],
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/admin/business-partner-messages/${messageId}/read`, {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-messages/stats"] });
    }
  });

  // Reply to message mutation
  const replyMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) => {
      return apiRequest(`/api/admin/business-partner-messages/${messageId}/reply`, {
        method: "POST",
        body: JSON.stringify({ content })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-messages"] });
      setReplyContent("");
      toast({ title: "Uspešno", description: "Odgovor je poslat poslovnom partneru." });
    }
  });

  // Star/unstar message mutation
  const starMutation = useMutation({
    mutationFn: async ({ messageId, isStarred }: { messageId: number; isStarred: boolean }) => {
      return apiRequest(`/api/admin/business-partner-messages/${messageId}/star`, {
        method: "PATCH",
        body: JSON.stringify({ isStarred: !isStarred })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-messages"] });
    }
  });

  // Archive message mutation
  const archiveMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/admin/business-partner-messages/${messageId}/archive`, {
        method: "PATCH"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-messages"] });
      toast({ title: "Uspešno", description: "Poruka je arhivirana." });
    }
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/admin/business-partner-messages/${messageId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/business-partner-messages"] });
      toast({ title: "Uspešno", description: "Poruka je obrisana." });
    }
  });

  // Filter messages based on selected filters
  const filteredMessages = messages.filter(message => {
    const matchesSearch = searchQuery === "" || 
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.senderCompany.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || message.messageType === filterType;
    const matchesPriority = filterPriority === "all" || message.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || message.status === filterStatus;
    
    const matchesTab = selectedTab === "inbox" ? message.status !== "archived" :
                      selectedTab === "starred" ? message.isStarred :
                      selectedTab === "archived" ? message.status === "archived" :
                      true;

    return matchesSearch && matchesType && matchesPriority && matchesStatus && matchesTab;
  });

  const handleMessageClick = (message: BusinessPartnerMessage) => {
    setSelectedMessage(message);
    if (message.status === 'unread') {
      markAsReadMutation.mutate(message.id);
    }
  };

  const handleReply = () => {
    if (!selectedMessage || !replyContent.trim()) return;
    replyMutation.mutate({ messageId: selectedMessage.id, content: replyContent });
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'complaint': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'request': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inquiry': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'update': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'read': return <Eye className="h-4 w-4 text-blue-500" />;
      case 'replied': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'archived': return <Archive className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Business Partner Messages</h2>
              <p className="text-purple-100">Interni messaging sistem - Phase 3</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant={isRealTimeEnabled ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 border-white/30"
            >
              {isRealTimeEnabled ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />
                  Live
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Manual
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <div className="text-sm font-medium text-gray-600">Ukupno</div>
              </div>
              <div className="text-2xl font-bold text-blue-700">{stats.totalMessages}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <div className="text-sm font-medium text-gray-600">Nepročitane</div>
              </div>
              <div className="text-2xl font-bold text-red-700">{stats.unreadMessages}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div className="text-sm font-medium text-gray-600">Odgovoreno</div>
              </div>
              <div className="text-2xl font-bold text-green-700">{stats.repliedMessages}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-purple-600" />
                <div className="text-sm font-medium text-gray-600">Arhivirane</div>
              </div>
              <div className="text-2xl font-bold text-purple-700">{stats.archivedMessages}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-orange-600" />
                <div className="text-sm font-medium text-gray-600">Hitne</div>
              </div>
              <div className="text-2xl font-bold text-orange-700">{stats.urgentMessages}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />
                <div className="text-sm font-medium text-gray-600">Avg odgovor</div>
              </div>
              <div className="text-2xl font-bold text-teal-700">{stats.averageResponseTime}h</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Pretraži poruke..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi tipovi</SelectItem>
                <SelectItem value="inquiry">Upit</SelectItem>
                <SelectItem value="complaint">Žalba</SelectItem>
                <SelectItem value="request">Zahtev</SelectItem>
                <SelectItem value="update">Ažuriranje</SelectItem>
                <SelectItem value="urgent">Hitno</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Prioritet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi prioriteti</SelectItem>
                <SelectItem value="low">Nizak</SelectItem>
                <SelectItem value="normal">Normalan</SelectItem>
                <SelectItem value="high">Visok</SelectItem>
                <SelectItem value="urgent">Hitan</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi statusi</SelectItem>
                <SelectItem value="unread">Nepročitane</SelectItem>
                <SelectItem value="read">Pročitane</SelectItem>
                <SelectItem value="replied">Odgovoreno</SelectItem>
                <SelectItem value="archived">Arhivirane</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="inbox">
                    Inbox ({filteredMessages.filter(m => m.status !== 'archived').length})
                  </TabsTrigger>
                  <TabsTrigger value="starred">
                    Označene ({filteredMessages.filter(m => m.isStarred).length})
                  </TabsTrigger>
                  <TabsTrigger value="archived">
                    Arhiva ({filteredMessages.filter(m => m.status === 'archived').length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {messagesLoading ? (
                  <div className="p-6 text-center text-gray-500">
                    Učitavanje poruka...
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Nema poruka za prikaz</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        onClick={() => handleMessageClick(message)}
                        className={`p-4 cursor-pointer border-l-4 hover:bg-gray-50 transition-colors ${
                          message.status === 'unread' 
                            ? 'bg-blue-50 border-l-blue-500 font-medium' 
                            : 'border-l-gray-200'
                        } ${selectedMessage?.id === message.id ? 'bg-blue-100' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(message.status)}
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(message.priority)}`} />
                            {message.isStarred && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${getMessageTypeColor(message.messageType)}`}>
                              {message.messageType}
                            </Badge>
                          </div>
                          
                          <h4 className="font-medium text-sm truncate">{message.subject}</h4>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{message.senderCompany}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <User className="h-3 w-3" />
                            <span className="truncate">{message.senderName}</span>
                          </div>
                          
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Message Detail View */}
        <div className="lg:col-span-2">
          <Card>
            {selectedMessage ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getMessageTypeColor(selectedMessage.messageType)}`}>
                          {selectedMessage.messageType}
                        </Badge>
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(selectedMessage.priority)}`} />
                        {selectedMessage.isStarred && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                        {getStatusIcon(selectedMessage.status)}
                      </div>
                      <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {selectedMessage.senderCompany}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {selectedMessage.senderName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => starMutation.mutate({ 
                          messageId: selectedMessage.id, 
                          isStarred: selectedMessage.isStarred 
                        })}
                      >
                        <Star className={`h-4 w-4 ${selectedMessage.isStarred ? 'fill-current text-yellow-500' : ''}`} />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => archiveMutation.mutate(selectedMessage.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(selectedMessage.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Message Content */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="whitespace-pre-wrap text-gray-800">
                        {selectedMessage.content}
                      </div>
                    </div>
                    
                    {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <PaperclipIcon className="h-4 w-4" />
                          Prilozi
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedMessage.attachments.map((attachment, index) => (
                            <Badge key={index} variant="outline" className="cursor-pointer hover:bg-blue-50">
                              {attachment}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedMessage.relatedServiceId && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <h4 className="font-medium text-blue-900 mb-1">Povezani servis</h4>
                        <div className="text-sm text-blue-700">
                          Servis #{selectedMessage.relatedServiceId}
                          {selectedMessage.relatedClientName && ` - ${selectedMessage.relatedClientName}`}
                        </div>
                      </div>
                    )}
                    
                    {selectedMessage.adminResponse && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-green-700 mb-2">Admin odgovor</h4>
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="whitespace-pre-wrap text-green-800">
                            {selectedMessage.adminResponse}
                          </div>
                          {selectedMessage.adminRespondedAt && (
                            <div className="text-xs text-green-600 mt-2">
                              Odgovoreno: {new Date(selectedMessage.adminRespondedAt).toLocaleString()}
                              {selectedMessage.adminRespondedBy && ` od strane ${selectedMessage.adminRespondedBy}`}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Reply Section */}
                  {selectedMessage.status !== 'archived' && (
                    <div className="border-t mt-6 pt-6">
                      <h4 className="font-medium mb-3">Odgovori partneru</h4>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Upišite vaš odgovor..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={4}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={handleReply}
                            disabled={!replyContent.trim() || replyMutation.isPending}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {replyMutation.isPending ? "Šalje se..." : "Pošalji odgovor"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Izaberite poruku za pregled
                </h3>
                <p className="text-gray-500">
                  Kliknite na poruku sa leve strane da vidite detalje i odgovorite
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}