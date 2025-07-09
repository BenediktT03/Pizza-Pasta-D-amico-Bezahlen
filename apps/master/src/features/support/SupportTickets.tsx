import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Send,
  User,
  Calendar,
  Tag,
  ChevronRight,
  MessageCircle,
  Paperclip,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: string;
  content: string;
  sender: {
    name: string;
    role: 'customer' | 'support' | 'system';
    avatar?: string;
  };
  timestamp: Date;
  attachments?: string[];
}

interface TicketStats {
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  avgResponseTime: string;
  avgResolutionTime: string;
}

export const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      const mockTickets: SupportTicket[] = [
        {
          id: '1',
          ticketNumber: 'TKT-2025-001',
          tenantId: 'rest-001',
          tenantName: 'Restaurant Alpenhof',
          subject: 'Zahlungsproblem mit TWINT',
          description: 'TWINT-Zahlungen werden nicht korrekt verarbeitet.',
          status: 'open',
          priority: 'high',
          category: 'Payment',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 30 * 60 * 1000),
          messages: [
            {
              id: '1',
              content: 'Seit heute Morgen können unsere Kunden nicht mehr mit TWINT bezahlen. Die App zeigt eine Fehlermeldung.',
              sender: { name: 'Max Müller', role: 'customer' },
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            },
            {
              id: '2',
              content: 'Vielen Dank für Ihre Meldung. Wir untersuchen das Problem mit höchster Priorität.',
              sender: { name: 'Support Team', role: 'support' },
              timestamp: new Date(Date.now() - 90 * 60 * 1000),
            },
          ],
        },
        {
          id: '2',
          ticketNumber: 'TKT-2025-002',
          tenantId: 'cafe-002',
          tenantName: 'Café Zentral',
          subject: 'Neue Mitarbeiter können sich nicht anmelden',
          description: 'Probleme beim Erstellen neuer Benutzerkonten.',
          status: 'in_progress',
          priority: 'medium',
          category: 'Account',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          assignedTo: 'Sarah Weber',
          messages: [
            {
              id: '1',
              content: 'Wir haben zwei neue Mitarbeiter, aber können keine Konten für sie erstellen.',
              sender: { name: 'Anna Schmidt', role: 'customer' },
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          ],
        },
        {
          id: '3',
          ticketNumber: 'TKT-2025-003',
          tenantId: 'bar-003',
          tenantName: 'Sports Bar Arena',
          subject: 'Feature Request: Tischreservierungen',
          description: 'Möchten Tischreservierungen über die App anbieten.',
          status: 'waiting',
          priority: 'low',
          category: 'Feature Request',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          assignedTo: 'Thomas Meier',
          messages: [
            {
              id: '1',
              content: 'Wir würden gerne Tischreservierungen über die App ermöglichen. Ist das möglich?',
              sender: { name: 'Peter Wagner', role: 'customer' },
              timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            },
          ],
        },
        {
          id: '4',
          ticketNumber: 'TKT-2025-004',
          tenantId: 'pizza-004',
          tenantName: 'Pizza Express',
          subject: 'Drucker funktioniert nicht',
          description: 'Bestellungen werden nicht auf dem Küchendrucker ausgegeben.',
          status: 'resolved',
          priority: 'critical',
          category: 'Technical',
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 60 * 60 * 1000),
          assignedTo: 'Michael Braun',
          messages: [
            {
              id: '1',
              content: 'DRINGEND! Keine Bestellungen kommen in der Küche an!',
              sender: { name: 'Luigi Rossi', role: 'customer' },
              timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
            },
            {
              id: '2',
              content: 'Problem wurde behoben. Der Drucker war offline. Bitte prüfen Sie die Verbindung.',
              sender: { name: 'Michael Braun', role: 'support' },
              timestamp: new Date(Date.now() - 60 * 60 * 1000),
            },
          ],
        },
      ];

      setTickets(mockTickets);

      setStats({
        open: mockTickets.filter(t => t.status === 'open').length,
        inProgress: mockTickets.filter(t => t.status === 'in_progress').length,
        waiting: mockTickets.filter(t => t.status === 'waiting').length,
        resolved: mockTickets.filter(t => t.status === 'resolved').length,
        avgResponseTime: '15 Min',
        avgResolutionTime: '2.5 Std',
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'waiting':
        return <MessageCircle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'in_progress':
        return 'warning';
      case 'waiting':
        return 'secondary';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'warning';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleSendReply = () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    // TODO: Send reply via API
    console.log('Sending reply:', replyMessage);
    setReplyMessage('');
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.tenantName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lade Support-Tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Kundenanfragen und Support-Tickets
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Offen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.open}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Bearbeitung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Wartend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.waiting}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Gelöst</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.resolved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ø Antwortzeit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ø Lösungszeit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResolutionTime}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Suche nach Ticket-Nr., Betreff oder Tenant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="waiting">Wartend</SelectItem>
                <SelectItem value="resolved">Gelöst</SelectItem>
                <SelectItem value="closed">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Priorität" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Prioritäten</SelectItem>
                <SelectItem value="critical">Kritisch</SelectItem>
                <SelectItem value="high">Hoch</SelectItem>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="low">Niedrig</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Betreff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priorität</TableHead>
                <TableHead>Zugewiesen</TableHead>
                <TableHead>Aktualisiert</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div className="font-medium">{ticket.ticketNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {ticket.category}
                    </div>
                  </TableCell>
                  <TableCell>{ticket.tenantName}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="truncate">{ticket.subject}</div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStatusBadgeVariant(ticket.status)}
                      className="flex items-center gap-1 w-fit"
                    >
                      {getStatusIcon(ticket.status)}
                      {ticket.status === 'open' ? 'Offen' :
                       ticket.status === 'in_progress' ? 'In Bearbeitung' :
                       ticket.status === 'waiting' ? 'Wartend' :
                       ticket.status === 'resolved' ? 'Gelöst' : 'Geschlossen'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                      {ticket.priority === 'critical' ? 'Kritisch' :
                       ticket.priority === 'high' ? 'Hoch' :
                       ticket.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                    </Badge>
                  </TableCell>
                  <TableCell>{ticket.assignedTo || '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(ticket.updatedAt, { 
                        addSuffix: true,
                        locale: de 
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      Details
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ticket Details Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedTicket.ticketNumber} - {selectedTicket.subject}</span>
                  <div className="flex gap-2">
                    <Badge variant={getStatusBadgeVariant(selectedTicket.status)}>
                      {selectedTicket.status}
                    </Badge>
                    <Badge variant={getPriorityBadgeVariant(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </Badge>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  {selectedTicket.tenantName} • {selectedTicket.category} • 
                  Erstellt {format(selectedTicket.createdAt, 'dd.MM.yyyy HH:mm', { locale: de })}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {selectedTicket.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.sender.role === 'support' ? 'justify-end' : ''
                        }`}
                      >
                        {message.sender.role !== 'support' && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender.avatar} />
                            <AvatarFallback>
                              {message.sender.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender.role === 'support'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="font-medium text-sm mb-1">
                            {message.sender.name}
                          </div>
                          <div className="text-sm">{message.content}</div>
                          <div className="text-xs mt-1 opacity-70">
                            {format(message.timestamp, 'HH:mm', { locale: de })}
                          </div>
                        </div>
                        {message.sender.role === 'support' && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender.avatar} />
                            <AvatarFallback>
                              {message.sender.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <DialogFooter>
                <div className="flex w-full gap-2">
                  <Textarea
                    placeholder="Antwort eingeben..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button onClick={handleSendReply}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportTickets;
