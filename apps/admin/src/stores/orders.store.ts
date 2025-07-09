import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  getDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Order {
  id: string;
  orderNumber: string;
  tenantId: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  type: 'dine-in' | 'takeaway' | 'delivery';
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  serviceFee: number;
  deliveryFee?: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentIntentId?: string;
  notes?: string;
  specialInstructions?: string;
  tableNumber?: string;
  deliveryAddress?: DeliveryAddress;
  estimatedTime?: number; // in minutes
  preparationTime?: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  preparingAt?: Date;
  readyAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  servedBy?: string;
  preparedBy?: string;
  deliveredBy?: string;
  rating?: number;
  review?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'completed' 
  | 'cancelled' 
  | 'refunded';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  modifiers?: OrderModifier[];
  notes?: string;
  status?: 'pending' | 'preparing' | 'ready';
}

export interface OrderModifier {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  postalCode: string;
  canton: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  instructions?: string;
}

export interface OrderFilters {
  status?: OrderStatus[];
  type?: Order['type'][];
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  paymentStatus?: Order['paymentStatus'][];
}

export interface OrderStats {
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  completed: number;
  cancelled: number;
  todayTotal: number;
  todayRevenue: number;
}

interface OrdersStore {
  orders: Order[];
  selectedOrder: Order | null;
  filters: OrderFilters;
  stats: OrderStats;
  loading: boolean;
  error: string | null;
  realtimeUnsubscribe: Unsubscribe | null;

  // Actions
  loadOrders: (tenantId: string, filters?: OrderFilters) => Promise<void>;
  loadOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string) => Promise<void>;
  assignStaff: (orderId: string, staffId: string, role: 'servedBy' | 'preparedBy' | 'deliveredBy') => Promise<void>;
  updatePreparationTime: (orderId: string, minutes: number) => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
  refundOrder: (orderId: string, amount?: number) => Promise<void>;
  updateItemStatus: (orderId: string, itemId: string, status: OrderItem['status']) => Promise<void>;
  addOrderNote: (orderId: string, note: string) => Promise<void>;
  
  // Realtime
  subscribeToOrders: (tenantId: string) => void;
  unsubscribeFromOrders: () => void;
  
  // Filters
  setFilters: (filters: OrderFilters) => void;
  clearFilters: () => void;
  
  // Computed
  getFilteredOrders: () => Order[];
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getActiveOrders: () => Order[];
  getOrderStats: () => OrderStats;
}

export const useOrdersStore = create<OrdersStore>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        orders: [],
        selectedOrder: null,
        filters: {},
        stats: {
          pending: 0,
          confirmed: 0,
          preparing: 0,
          ready: 0,
          completed: 0,
          cancelled: 0,
          todayTotal: 0,
          todayRevenue: 0
        },
        loading: false,
        error: null,
        realtimeUnsubscribe: null,

        loadOrders: async (tenantId: string, filters?: OrderFilters) => {
          set({ loading: true, error: null });

          try {
            let constraints = [
              where('tenantId', '==', tenantId),
              orderBy('createdAt', 'desc'),
              limit(100)
            ];

            // Apply filters
            if (filters?.status && filters.status.length > 0) {
              constraints.push(where('status', 'in', filters.status));
            }

            if (filters?.type && filters.type.length > 0) {
              constraints.push(where('type', 'in', filters.type));
            }

            if (filters?.dateFrom) {
              constraints.push(where('createdAt', '>=', filters.dateFrom));
            }

            if (filters?.dateTo) {
              constraints.push(where('createdAt', '<=', filters.dateTo));
            }

            const ordersQuery = query(collection(db, 'orders'), ...constraints);
            const snapshot = await getDocs(ordersQuery);

            const orders = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                confirmedAt: data.confirmedAt?.toDate(),
                preparingAt: data.preparingAt?.toDate(),
                readyAt: data.readyAt?.toDate(),
                completedAt: data.completedAt?.toDate(),
                cancelledAt: data.cancelledAt?.toDate()
              } as Order;
            });

            set({ 
              orders, 
              loading: false,
              stats: get().calculateStats(orders)
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        loadOrder: async (orderId: string) => {
          set({ loading: true, error: null });

          try {
            const orderDoc = await getDoc(doc(db, 'orders', orderId));
            
            if (!orderDoc.exists()) {
              throw new Error('Order not found');
            }

            const data = orderDoc.data();
            const order: Order = {
              id: orderDoc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              confirmedAt: data.confirmedAt?.toDate(),
              preparingAt: data.preparingAt?.toDate(),
              readyAt: data.readyAt?.toDate(),
              completedAt: data.completedAt?.toDate(),
              cancelledAt: data.cancelledAt?.toDate()
            };

            set({ selectedOrder: order, loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        updateOrderStatus: async (orderId: string, status: OrderStatus, notes?: string) => {
          try {
            const updateData: any = {
              status,
              updatedAt: serverTimestamp()
            };

            // Add timestamp for status change
            switch (status) {
              case 'confirmed':
                updateData.confirmedAt = serverTimestamp();
                break;
              case 'preparing':
                updateData.preparingAt = serverTimestamp();
                break;
              case 'ready':
                updateData.readyAt = serverTimestamp();
                break;
              case 'completed':
                updateData.completedAt = serverTimestamp();
                break;
              case 'cancelled':
                updateData.cancelledAt = serverTimestamp();
                if (notes) updateData.cancelReason = notes;
                break;
            }

            await updateDoc(doc(db, 'orders', orderId), updateData);

            // Update local state
            set(state => ({
              orders: state.orders.map(order =>
                order.id === orderId
                  ? { ...order, status, ...updateData }
                  : order
              ),
              selectedOrder: state.selectedOrder?.id === orderId
                ? { ...state.selectedOrder, status, ...updateData }
                : state.selectedOrder
            }));

            // Log status change
            await addDoc(collection(db, 'order_logs'), {
              orderId,
              action: 'status_change',
              previousStatus: get().orders.find(o => o.id === orderId)?.status,
              newStatus: status,
              notes,
              timestamp: serverTimestamp()
            });
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          }
        },

        assignStaff: async (orderId: string, staffId: string, role: 'servedBy' | 'preparedBy' | 'deliveredBy') => {
          try {
            await updateDoc(doc(db, 'orders', orderId), {
              [role]: staffId,
              updatedAt: serverTimestamp()
            });

            // Update local state
            set(state => ({
              orders: state.orders.map(order =>
                order.id === orderId
                  ? { ...order, [role]: staffId }
                  : order
              ),
              selectedOrder: state.selectedOrder?.id === orderId
                ? { ...state.selectedOrder, [role]: staffId }
                : state.selectedOrder
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          }
        },

        updatePreparationTime: async (orderId: string, minutes: number) => {
          try {
            await updateDoc(doc(db, 'orders', orderId), {
              preparationTime: minutes,
              estimatedTime: minutes,
              updatedAt: serverTimestamp()
            });

            // Update local state
            set(state => ({
              orders: state.orders.map(order =>
                order.id === orderId
                  ? { ...order, preparationTime: minutes, estimatedTime: minutes }
                  : order
              ),
              selectedOrder: state.selectedOrder?.id === orderId
                ? { ...state.selectedOrder, preparationTime: minutes, estimatedTime: minutes }
                : state.selectedOrder
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          }
        },

        cancelOrder: async (orderId: string, reason: string) => {
          await get().updateOrderStatus(orderId, 'cancelled', reason);
        },

        refundOrder: async (orderId: string, amount?: number) => {
          try {
            const order = get().orders.find(o => o.id === orderId);
            if (!order) throw new Error('Order not found');

            const refundAmount = amount || order.total;

            await updateDoc(doc(db, 'orders', orderId), {
              status: 'refunded',
              paymentStatus: 'refunded',
              refundAmount,
              refundedAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            // Create refund record
            await addDoc(collection(db, 'refunds'), {
              orderId,
              amount: refundAmount,
              reason: 'Customer request',
              status: 'pending',
              createdAt: serverTimestamp()
            });

            // Update local state
            set(state => ({
              orders: state.orders.map(order =>
                order.id === orderId
                  ? { ...order, status: 'refunded', paymentStatus: 'refunded' }
                  : order
              )
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          }
        },

        updateItemStatus: async (orderId: string, itemId: string, status: OrderItem['status']) => {
          try {
            const order = get().orders.find(o => o.id === orderId);
            if (!order) throw new Error('Order not found');

            const updatedItems = order.items.map(item =>
              item.id === itemId ? { ...item, status } : item
            );

            await updateDoc(doc(db, 'orders', orderId), {
              items: updatedItems,
              updatedAt: serverTimestamp()
            });

            // Update local state
            set(state => ({
              orders: state.orders.map(o =>
                o.id === orderId
                  ? { ...o, items: updatedItems }
                  : o
              ),
              selectedOrder: state.selectedOrder?.id === orderId
                ? { ...state.selectedOrder, items: updatedItems }
                : state.selectedOrder
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          }
        },

        addOrderNote: async (orderId: string, note: string) => {
          try {
            // Add note to order
            const order = get().orders.find(o => o.id === orderId);
            if (!order) throw new Error('Order not found');

            const existingNotes = order.notes || '';
            const timestamp = new Date().toISOString();
            const newNotes = existingNotes 
              ? `${existingNotes}\n[${timestamp}] ${note}`
              : `[${timestamp}] ${note}`;

            await updateDoc(doc(db, 'orders', orderId), {
              notes: newNotes,
              updatedAt: serverTimestamp()
            });

            // Update local state
            set(state => ({
              orders: state.orders.map(o =>
                o.id === orderId
                  ? { ...o, notes: newNotes }
                  : o
              ),
              selectedOrder: state.selectedOrder?.id === orderId
                ? { ...state.selectedOrder, notes: newNotes }
                : state.selectedOrder
            }));
          } catch (error: any) {
            set({ error: error.message });
            throw error;
          }
        },

        subscribeToOrders: (tenantId: string) => {
          // Unsubscribe from previous subscription
          get().unsubscribeFromOrders();

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const ordersQuery = query(
            collection(db, 'orders'),
            where('tenantId', '==', tenantId),
            where('createdAt', '>=', today),
            orderBy('createdAt', 'desc')
          );

          const unsubscribe = onSnapshot(
            ordersQuery,
            (snapshot) => {
              const orders = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt?.toDate() || new Date(),
                  updatedAt: data.updatedAt?.toDate() || new Date(),
                  confirmedAt: data.confirmedAt?.toDate(),
                  preparingAt: data.preparingAt?.toDate(),
                  readyAt: data.readyAt?.toDate(),
                  completedAt: data.completedAt?.toDate(),
                  cancelledAt: data.cancelledAt?.toDate()
                } as Order;
              });

              set({ 
                orders,
                stats: get().calculateStats(orders)
              });

              // Check for new orders and notify
              snapshot.docChanges().forEach(change => {
                if (change.type === 'added' && change.doc.data().status === 'pending') {
                  // Trigger notification for new order
                  get().notifyNewOrder(change.doc.data() as Order);
                }
              });
            },
            (error) => {
              console.error('Realtime orders error:', error);
              set({ error: error.message });
            }
          );

          set({ realtimeUnsubscribe: unsubscribe });
        },

        unsubscribeFromOrders: () => {
          const { realtimeUnsubscribe } = get();
          if (realtimeUnsubscribe) {
            realtimeUnsubscribe();
            set({ realtimeUnsubscribe: null });
          }
        },

        setFilters: (filters: OrderFilters) => {
          set({ filters });
        },

        clearFilters: () => {
          set({ filters: {} });
        },

        getFilteredOrders: () => {
          const { orders, filters } = get();
          
          return orders.filter(order => {
            // Status filter
            if (filters.status && filters.status.length > 0) {
              if (!filters.status.includes(order.status)) return false;
            }

            // Type filter
            if (filters.type && filters.type.length > 0) {
              if (!filters.type.includes(order.type)) return false;
            }

            // Date filters
            if (filters.dateFrom && order.createdAt < filters.dateFrom) return false;
            if (filters.dateTo && order.createdAt > filters.dateTo) return false;

            // Search filter
            if (filters.searchTerm) {
              const search = filters.searchTerm.toLowerCase();
              const matchesOrderNumber = order.orderNumber.toLowerCase().includes(search);
              const matchesCustomerName = order.customerName.toLowerCase().includes(search);
              const matchesCustomerEmail = order.customerEmail?.toLowerCase().includes(search);
              const matchesCustomerPhone = order.customerPhone?.includes(search);
              
              if (!matchesOrderNumber && !matchesCustomerName && !matchesCustomerEmail && !matchesCustomerPhone) {
                return false;
              }
            }

            // Payment status filter
            if (filters.paymentStatus && filters.paymentStatus.length > 0) {
              if (!filters.paymentStatus.includes(order.paymentStatus)) return false;
            }

            return true;
          });
        },

        getOrdersByStatus: (status: OrderStatus) => {
          return get().orders.filter(order => order.status === status);
        },

        getActiveOrders: () => {
          const activeStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready'];
          return get().orders.filter(order => activeStatuses.includes(order.status));
        },

        getOrderStats: () => {
          return get().stats;
        },

        // Helper methods
        calculateStats: (orders: Order[]): OrderStats => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayOrders = orders.filter(order => order.createdAt >= today);

          return {
            pending: orders.filter(o => o.status === 'pending').length,
            confirmed: orders.filter(o => o.status === 'confirmed').length,
            preparing: orders.filter(o => o.status === 'preparing').length,
            ready: orders.filter(o => o.status === 'ready').length,
            completed: orders.filter(o => o.status === 'completed').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            todayTotal: todayOrders.length,
            todayRevenue: todayOrders
              .filter(o => o.paymentStatus === 'paid')
              .reduce((sum, o) => sum + o.total, 0)
          };
        },

        notifyNewOrder: (order: Order) => {
          // Play notification sound
          const audio = new Audio('/sounds/new-order.mp3');
          audio.play().catch(console.error);

          // Show browser notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Order!', {
              body: `Order #${order.orderNumber} from ${order.customerName}`,
              icon: '/icon-192x192.png',
              tag: order.id
            });
          }
        }
      })
    )
  )
);
