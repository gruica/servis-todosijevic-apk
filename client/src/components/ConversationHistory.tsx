import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Phone, Clock, CheckCircle2, Send, MessageSquare, AlertCircle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface ConversationMessage {
  id: number;
  serviceId: number;
  messageType: 'outgoing' | 'incoming' | 'system';
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  timestamp: string;
  phoneNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationData {
  serviceId: number;
  totalMessages: number;
  lastActivity: string;
  messages: ConversationMessage[];
}

interface ConversationHistoryProps {
  serviceId: number;
  readOnly?: boolean;
}

/**
 * ConversationHistory component - prikaz WhatsApp conversation tracking-a za servis
 * 
 * Prikazuje:
 * - Timeline svih WhatsApp poruka vezanih za servis
 * - Message status (sent/delivered/read) sa vizuelnim indikatorima
 * - Incoming i outgoing poruke sa jasnim razlikovanjem
 * - System poruke za automatske notifikacije
 * - Real-time status update funkcionalnost
 */
export function ConversationHistory({ serviceId, readOnly = false }: ConversationHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dohvati conversation podatke za određeni servis
  const { data: conversation, isLoading, error, refetch } = useQuery<ConversationData>({
    queryKey: [`/api/conversations/${serviceId}/history`],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/conversations/${serviceId}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }
      
      return response.json();
    },
    refetchInterval: 30000, // Refresh svakih 30 sekundi za real-time updates
  });

  // Update message status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ messageId, status }: { messageId: number; status: string }) => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/conversations/${messageId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update message status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Refresh conversation data
      refetch();
      toast({
        title: "Status ažuriran",
        description: "Status poruke je uspešno ažuriran",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri ažuriranju statusa poruke",
        variant: "destructive",
      });
    },
  });

  // Format timestamp za prikaz
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString('sr-RS', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffHours < 24 * 7) {
      return date.toLocaleDateString('sr-RS', { 
        weekday: 'short',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('sr-RS', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Get status icon
  const getStatusIcon = (status: string, messageType: string) => {
    if (messageType !== 'outgoing') return null;
    
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'sent':
        return <Send className="h-3 w-3 text-blue-500" />;
      case 'delivered':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'read':
        return <CheckCircle2 className="h-3 w-3 text-green-600 fill-current" />;
      default:
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Na čekanju", variant: "secondary" as const },
      sent: { label: "Poslato", variant: "default" as const },
      delivered: { label: "Dostavljeno", variant: "default" as const },
      read: { label: "Pročitano", variant: "default" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  // Get message type styles
  const getMessageStyles = (messageType: string) => {
    switch (messageType) {
      case 'outgoing':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'incoming':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'system':
        return 'bg-gray-50 border-gray-200 text-gray-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  // Get message type icon
  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'outgoing':
        return <Send className="h-4 w-4 text-blue-600" />;
      case 'incoming':
        return <Phone className="h-4 w-4 text-green-600" />;
      case 'system':
        return <FileText className="h-4 w-4 text-gray-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Učitavanje razgovora...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <p className="text-sm font-medium text-destructive">Greška pri učitavanju razgovora</p>
              <p className="text-xs text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Nepoznata greška'}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
            >
              Pokušaj ponovo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!conversation || conversation.totalMessages === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nema WhatsApp poruka</p>
              <p className="text-xs text-muted-foreground mt-1">
                WhatsApp komunikacija za ovaj servis još nije započeta
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Conversation Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span>WhatsApp Razgovori</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {conversation.totalMessages} poruka
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetch()}
                className="h-6 px-2"
              >
                Osveži
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground">
            Poslednja aktivnost: {formatTimestamp(conversation.lastActivity)}
          </div>
        </CardContent>
      </Card>

      {/* Messages Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Timeline poruka</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {conversation.messages.map((message, index) => (
                <div key={message.id} className="space-y-2">
                  <div className={`p-3 rounded-lg border ${getMessageStyles(message.messageType)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getMessageTypeIcon(message.messageType)}
                          <span className="text-xs font-medium">
                            {message.messageType === 'outgoing' && 'Poslato klijentu'}
                            {message.messageType === 'incoming' && 'Primljeno od klijenta'}
                            {message.messageType === 'system' && 'Sistemska poruka'}
                          </span>
                          {message.phoneNumber && (
                            <span className="text-xs text-muted-foreground">
                              ({message.phoneNumber})
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        
                        {message.notes && (
                          <div className="text-xs text-muted-foreground bg-white/50 p-2 rounded border">
                            <strong>Napomena:</strong> {message.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(message.timestamp)}
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(message.status, message.messageType)}
                          {!readOnly && message.messageType === 'outgoing' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-xs"
                              onClick={() => updateStatusMutation.mutate({
                                messageId: message.id,
                                status: message.status === 'sent' ? 'delivered' : 'read'
                              })}
                              disabled={updateStatusMutation.isPending || message.status === 'read'}
                            >
                              {getStatusBadge(message.status)}
                            </Button>
                          )}
                          {readOnly && (
                            <div>{getStatusBadge(message.status)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {index < conversation.messages.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}