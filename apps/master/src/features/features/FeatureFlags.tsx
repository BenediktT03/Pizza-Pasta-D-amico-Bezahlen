import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Flag,
  ToggleLeft,
  Users,
  Building,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Copy,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Percent,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  value: any;
  enabled: boolean;
  category: string;
  rollout: {
    type: 'all' | 'percentage' | 'tenant' | 'user';
    percentage?: number;
    tenants?: string[];
    users?: string[];
  };
  conditions?: FlagCondition[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  modifiedBy: string;
}

interface FlagCondition {
  id: string;
  type: 'tenant' | 'user' | 'date' | 'environment';
  operator: 'equals' | 'contains' | 'greater' | 'less';
  value: string;
}

interface FlagHistory {
  id: string;
  flagId: string;
  action: 'created' | 'updated' | 'deleted' | 'enabled' | 'disabled';
  changes: any;
  user: string;
  timestamp: Date;
}

export const FeatureFlags: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatureFlags();
  }, []);

  const fetchFeatureFlags = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      const mockFlags: FeatureFlag[] = [
        {
          id: '1',
          key: 'voice_ordering',
          name: 'Voice Ordering',
          description: 'Aktiviert Sprachbestellungen über die App',
          type: 'boolean',
          value: true,
          enabled: true,
          category: 'Features',
          rollout: {
            type: 'percentage',
            percentage: 75,
          },
          createdAt: new Date('2024-12-01'),
          updatedAt: new Date('2025-01-05'),
          createdBy: 'admin@eatech.ch',
          modifiedBy: 'admin@eatech.ch',
        },
        {
          id: '2',
          key: 'ai_recommendations',
          name: 'AI Empfehlungen',
          description: 'Personalisierte Produktempfehlungen basierend auf Bestellhistorie',
          type: 'boolean',
          value: true,
          enabled: true,
          category: 'AI',
          rollout: {
            type: 'tenant',
            tenants: ['rest-001', 'cafe-002', 'pizza-004'],
          },
          createdAt: new Date('2024-11-15'),
          updatedAt: new Date('2025-01-03'),
          createdBy: 'admin@eatech.ch',
          modifiedBy: 'product@eatech.ch',
        },
        {
          id: '3',
          key: 'table_reservations',
          name: 'Tischreservierungen',
          description: 'Ermöglicht Tischreservierungen über die App',
          type: 'boolean',
          value: false,
          enabled: false,
          category: 'Features',
          rollout: {
            type: 'all',
          },
          createdAt: new Date('2025-01-10'),
          updatedAt: new Date('2025-01-10'),
          createdBy: 'product@eatech.ch',
          modifiedBy: 'product@eatech.ch',
        },
        {
          id: '4',
          key: 'loyalty_program',
          name: 'Treueprogramm',
          description: 'Punkte sammeln und Belohnungen erhalten',
          type: 'boolean',
          value: true,
          enabled: true,
          category: 'Marketing',
          rollout: {
            type: 'percentage',
            percentage: 50,
          },
          createdAt: new Date('2024-10-20'),
          updatedAt: new Date('2024-12-28'),
          createdBy: 'marketing@eatech.ch',
          modifiedBy: 'admin@eatech.ch',
        },
        {
          id: '5',
          key: 'max_order_value',
          name: 'Maximaler Bestellwert',
          description: 'Obergrenze für einzelne Bestellungen',
          type: 'number',
          value: 500,
          enabled: true,
          category: 'Limits',
          rollout: {
            type: 'all',
          },
          createdAt: new Date('2024-09-01'),
          updatedAt: new Date('2024-09-01'),
          createdBy: 'admin@eatech.ch',
          modifiedBy: 'admin@eatech.ch',
        },
        {
          id: '6',
          key: 'payment_methods',
          name: 'Zahlungsmethoden',
          description: 'Verfügbare Zahlungsoptionen',
          type: 'json',
          value: {
            stripe: true,
            twint: true,
            postfinance: true,
            cash: false,
          },
          enabled: true,
          category: 'Payment',
          rollout: {
            type: 'all',
          },
          createdAt: new Date('2024-08-15'),
          updatedAt: new Date('2025-01-02'),
          createdBy: 'admin@eatech.ch',
          modifiedBy: 'finance@eatech.ch',
        },
      ];

      setFlags(mockFlags);
    } catch (error) {
      console.error('Error fetching feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFlag = async (flagId: string, enabled: boolean) => {
    // TODO: Update flag via API
    console.log('Toggling flag:', flagId, enabled);
    
    setFlags(prev => prev.map(flag => 
      flag.id === flagId ? { ...flag, enabled } : flag
    ));
  };

  const handleSaveFlag = async (flag: Partial<FeatureFlag>) => {
    // TODO: Save flag via API
    console.log('Saving flag:', flag);
    setShowCreateDialog(false);
    setEditingFlag(null);
  };

  const handleDeleteFlag = async (flagId: string) => {
    // TODO: Delete flag via API
    if (window.confirm('Möchten Sie dieses Feature Flag wirklich löschen?')) {
      console.log('Deleting flag:', flagId);
      setFlags(prev => prev.filter(flag => flag.id !== flagId));
    }
  };

  const handleDuplicateFlag = (flag: FeatureFlag) => {
    const newFlag = {
      ...flag,
      id: '',
      key: `${flag.key}_copy`,
      name: `${flag.name} (Kopie)`,
    };
    setEditingFlag(newFlag);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'boolean':
        return <ToggleLeft className="h-4 w-4" />;
      case 'number':
        return <Percent className="h-4 w-4" />;
      case 'string':
        return <Flag className="h-4 w-4" />;
      case 'json':
        return <Code className="h-4 w-4" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const getRolloutBadge = (rollout: FeatureFlag['rollout']) => {
    switch (rollout.type) {
      case 'all':
        return <Badge variant="success">100% Rollout</Badge>;
      case 'percentage':
        return <Badge variant="warning">{rollout.percentage}% Rollout</Badge>;
      case 'tenant':
        return <Badge variant="secondary">{rollout.tenants?.length} Tenants</Badge>;
      case 'user':
        return <Badge variant="secondary">{rollout.users?.length} Users</Badge>;
      default:
        return null;
    }
  };

  const categories = ['all', 'Features', 'AI', 'Marketing', 'Payment', 'Limits'];
  
  const filteredFlags = flags.filter(flag => {
    const matchesSearch = 
      flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || flag.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const enabledCount = flags.filter(f => f.enabled).length;
  const totalCount = flags.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lade Feature Flags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Features und deren schrittweise Einführung
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neues Feature Flag
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Feature Flags</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aktiv</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{enabledCount}</div>
            <p className="text-xs text-muted-foreground">Aktivierte Features</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inaktiv</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {totalCount - enabledCount}
            </div>
            <p className="text-xs text-muted-foreground">Deaktivierte Features</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rollout Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((enabledCount / totalCount) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Features aktiv</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Suche nach Key, Name oder Beschreibung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'Alle Kategorien' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags List */}
      <div className="space-y-4">
        {filteredFlags.map((flag) => (
          <Card key={flag.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(checked) => handleToggleFlag(flag.id, checked)}
                  />
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {flag.name}
                      <Badge variant="outline">{flag.type}</Badge>
                      {getRolloutBadge(flag.rollout)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {flag.key}
                      </code>
                      <span className="ml-2">{flag.description}</span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicateFlag(flag)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingFlag(flag)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFlag(flag.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="details" className="border-none">
                  <AccordionTrigger className="py-2">
                    Details anzeigen
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Wert</h4>
                        <div className="bg-muted p-3 rounded text-sm font-mono">
                          {typeof flag.value === 'object' 
                            ? JSON.stringify(flag.value, null, 2)
                            : String(flag.value)
                          }
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Metadaten</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Kategorie:</span>
                            <span>{flag.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Erstellt:</span>
                            <span>
                              {format(flag.createdAt, 'dd.MM.yyyy', { locale: de })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Erstellt von:</span>
                            <span>{flag.createdBy}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Aktualisiert:</span>
                            <span>
                              {format(flag.updatedAt, 'dd.MM.yyyy', { locale: de })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Geändert von:</span>
                            <span>{flag.modifiedBy}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={showCreateDialog || !!editingFlag} 
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingFlag(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFlag?.id ? 'Feature Flag bearbeiten' : 'Neues Feature Flag erstellen'}
            </DialogTitle>
            <DialogDescription>
              Konfigurieren Sie das Feature Flag und dessen Rollout-Strategie
            </DialogDescription>
          </DialogHeader>
          
          {/* Form would go here */}
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Feature Flag Formular würde hier eingefügt werden...
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingFlag(null);
            }}>
              Abbrechen
            </Button>
            <Button onClick={() => handleSaveFlag({})}>
              {editingFlag?.id ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Fix missing import
const Code = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export default FeatureFlags;
