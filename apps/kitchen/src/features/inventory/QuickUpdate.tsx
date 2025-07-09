import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Minus,
  Plus,
  Search,
  Filter,
  Save,
  X,
  TrendingDown,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Progress } from '@/components/ui/progress';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  lastUpdated: Date;
  supplier?: string;
  expiryDate?: Date;
}

interface StockUpdate {
  itemId: string;
  newStock: number;
  reason: string;
}

export const QuickUpdate: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [updateReason, setUpdateReason] = useState('');
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  // Fetch inventory items
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['kitchen-inventory'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      const mockInventory: InventoryItem[] = [
        {
          id: '1',
          name: 'Rinderhackfleisch',
          category: 'Fleisch',
          currentStock: 5.5,
          minStock: 10,
          maxStock: 50,
          unit: 'kg',
          status: 'low-stock',
          lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
          supplier: 'Metzgerei Müller',
        },
        {
          id: '2',
          name: 'Tomaten',
          category: 'Gemüse',
          currentStock: 12,
          minStock: 20,
          maxStock: 100,
          unit: 'kg',
          status: 'low-stock',
          lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        {
          id: '3',
          name: 'Mozzarella',
          category: 'Milchprodukte',
          currentStock: 8,
          minStock: 5,
          maxStock: 30,
          unit: 'kg',
          status: 'in-stock',
          lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000),
        },
        {
          id: '4',
          name: 'Olivenöl',
          category: 'Öle & Gewürze',
          currentStock: 15,
          minStock: 10,
          maxStock: 40,
          unit: 'L',
          status: 'in-stock',
          lastUpdated: new Date(Date.now() - 5 * 60 * 60 * 1000),
        },
        {
          id: '5',
          name: 'Mehl',
          category: 'Grundzutaten',
          currentStock: 0,
          minStock: 20,
          maxStock: 100,
          unit: 'kg',
          status: 'out-of-stock',
          lastUpdated: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          id: '6',
          name: 'Champignons',
          category: 'Gemüse',
          currentStock: 3,
          minStock: 5,
          maxStock: 20,
          unit: 'kg',
          status: 'low-stock',
          lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
      ];

      return mockInventory;
    },
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: async (update: StockUpdate) => {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return update;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-inventory'] });
      toast.success('Bestand aktualisiert');
      setShowUpdateDialog(false);
      setSelectedItem(null);
      setUpdateReason('');
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren des Bestands');
    },
  });

  // Quick stock adjustment
  const handleQuickAdjust = (item: InventoryItem, adjustment: number) => {
    const newStock = Math.max(0, item.currentStock + adjustment);
    updateStockMutation.mutate({
      itemId: item.id,
      newStock,
      reason: adjustment > 0 ? 'Schnelle Erhöhung' : 'Schnelle Reduzierung',
    });
  };

  // Filter inventory
  const filteredInventory = inventory?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by status
  const outOfStock = filteredInventory?.filter(i => i.status === 'out-of-stock') || [];
  const lowStock = filteredInventory?.filter(i => i.status === 'low-stock') || [];
  const inStock = filteredInventory?.filter(i => i.status === 'in-stock') || [];

  const categories = ['all', 'Fleisch', 'Gemüse', 'Milchprodukte', 'Öle & Gewürze', 'Grundzutaten'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out-of-stock':
        return 'text-red-500';
      case 'low-stock':
        return 'text-yellow-500';
      case 'in-stock':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'out-of-stock':
        return 'destructive';
      case 'low-stock':
        return 'warning';
      case 'in-stock':
        return 'success';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lade Lagerbestand...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Schnelle Bestandsaktualisierung
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Zutat suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-[300px]"
              />
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
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-3 gap-4 p-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Nicht vorrätig
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{outOfStock.length}</div>
            <p className="text-xs text-muted-foreground">Artikel müssen bestellt werden</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-yellow-500" />
              Niedriger Bestand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{lowStock.length}</div>
            <p className="text-xs text-muted-foreground">Bald nachbestellen</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Vorrätig
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{inStock.length}</div>
            <p className="text-xs text-muted-foreground">Ausreichend vorhanden</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Tabs */}
      <div className="flex-1 px-6 pb-6">
        <Tabs defaultValue="critical" className="h-full">
          <TabsList>
            <TabsTrigger value="critical">
              Kritisch ({outOfStock.length + lowStock.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              Alle Artikel ({filteredInventory?.length || 0})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="critical" className="h-[calc(100%-40px)]">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...outOfStock, ...lowStock].map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {item.status === 'out-of-stock' ? 'Leer' : 
                         item.status === 'low-stock' ? 'Niedrig' : 'Vorrätig'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Bestand</span>
                          <span className="text-sm font-medium">
                            {item.currentStock} / {item.maxStock} {item.unit}
                          </span>
                        </div>
                        <Progress 
                          value={(item.currentStock / item.maxStock) * 100} 
                          className={`h-2 ${
                            item.status === 'out-of-stock' ? 'bg-red-100' :
                            item.status === 'low-stock' ? 'bg-yellow-100' : 'bg-green-100'
                          }`}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Min: {item.minStock} {item.unit}
                        </p>
                      </div>
                      
                      {item.expiryDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Info className="h-3 w-3" />
                          Ablauf: {new Date(item.expiryDate).toLocaleDateString('de-CH')}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleQuickAdjust(item, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowUpdateDialog(true);
                          }}
                        >
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleQuickAdjust(item, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="all" className="h-[calc(100%-40px)]">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredInventory?.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <div className={getStatusColor(item.status)}>
                        {item.status === 'out-of-stock' && <X className="h-5 w-5" />}
                        {item.status === 'low-stock' && <AlertTriangle className="h-5 w-5" />}
                        {item.status === 'in-stock' && <CheckCircle className="h-5 w-5" />}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-center py-2">
                        <p className="text-2xl font-bold">
                          {item.currentStock} {item.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          von {item.maxStock} {item.unit}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuickAdjust(item, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowUpdateDialog(true);
                          }}
                        >
                          Update
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuickAdjust(item, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bestand aktualisieren</DialogTitle>
            <DialogDescription>
              {selectedItem?.name} - Aktueller Bestand: {selectedItem?.currentStock} {selectedItem?.unit}
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Neuer Bestand</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const input = document.getElementById('stock-input') as HTMLInputElement;
                      if (input) input.value = String(Math.max(0, Number(input.value) - 1));
                    }}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="stock-input"
                    type="number"
                    defaultValue={selectedItem.currentStock}
                    min={0}
                    max={selectedItem.maxStock}
                    className="text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const input = document.getElementById('stock-input') as HTMLInputElement;
                      if (input) input.value = String(Math.min(selectedItem.maxStock, Number(input.value) + 1));
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">{selectedItem.unit}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Grund für Änderung</label>
                <Select value={updateReason} onValueChange={setUpdateReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Grund auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="used">Verbraucht</SelectItem>
                    <SelectItem value="delivered">Lieferung erhalten</SelectItem>
                    <SelectItem value="expired">Abgelaufen</SelectItem>
                    <SelectItem value="damaged">Beschädigt</SelectItem>
                    <SelectItem value="correction">Korrektur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => {
                if (selectedItem) {
                  const input = document.getElementById('stock-input') as HTMLInputElement;
                  updateStockMutation.mutate({
                    itemId: selectedItem.id,
                    newStock: Number(input.value),
                    reason: updateReason || 'Manuelle Aktualisierung',
                  });
                }
              }}
              disabled={!updateReason}
            >
              <Save className="mr-2 h-4 w-4" />
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuickUpdate;
