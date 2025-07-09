import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { collection, query, where, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore'
import { db, getTenantPath } from '@/config/firebase'
import { api } from '@/services/api'
import { useCartStore } from './cart.store'

// Types
export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  items: OrderItem[]
  totals: OrderTotals
  customer: CustomerInfo
  payment: PaymentInfo
  delivery: DeliveryInfo
  createdAt: Date
  updatedAt: Date
  estimatedTime?: Date
  completedAt?: Date
  notes?: string
  tenantId: string
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export interface OrderItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  modifiers?: OrderModifier[]
  specialInstructions?: string
}

export interface OrderModifier {
  id: string
  name: string
  price: number
  quantity: number
}

export interface OrderTotals {
  subtotal: number
  tax: number
  delivery: number
  discount: number
  total: number
}

export interface CustomerInfo {
  id?: string
  name: string
  email?: string
  phone?: string
}

export interface PaymentInfo {
  method: 'card' | 'twint' | 'postfinance' | 'cash'
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  transactionId?: string
  paidAt?: Date
}

export interface DeliveryInfo {
  type: 'pickup' | 'delivery'
  address?: string
  time?: Date
  tableNumber?: string
}

interface OrderState {
  // State
  currentOrder: Order | null
  orders: Order[]
  loading: boolean
  error: string | null
  realtimeSubscription: Unsubscribe | null

  // Actions
  createOrder: (paymentMethod: PaymentInfo['method']) => Promise<Order>
  loadOrder: (orderId: string) => Promise<void>
  loadOrders: () => Promise<void>
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
  cancelOrder: (orderId: string, reason?: string) => Promise<void>
  subscribeToOrder: (orderId: string) => void
  subscribeToUserOrders: (userId: string) => void
  unsubscribe: () => void
  clearCurrentOrder: () => void
  setError: (error: string | null) => void
}

export const useOrderStore = create<OrderState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentOrder: null,
      orders: [],
      loading: false,
      error: null,
      realtimeSubscription: null,

      // Create new order
      createOrder: async (paymentMethod) => {
        const cartStore = useCartStore.getState()
        
        if (cartStore.isEmpty) {
          throw new Error('Cart is empty')
        }

        set({ loading: true, error: null })

        try {
          const orderData = {
            items: cartStore.items.map(item => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              modifiers: item.modifiers,
              specialInstructions: item.specialInstructions,
            })),
            totals: cartStore.totals,
            delivery: {
              type: cartStore.deliveryType,
              address: cartStore.deliveryAddress,
              time: cartStore.deliveryTime,
              tableNumber: cartStore.tableNumber,
            },
            payment: {
              method: paymentMethod,
              status: 'pending' as const,
            },
            notes: cartStore.notes,
          }

          const response = await api.post<Order>('/orders', orderData)
          
          set({ 
            currentOrder: response,
            loading: false,
            error: null,
          })

          // Clear cart after successful order creation
          cartStore.clearCart()

          // Subscribe to order updates
          get().subscribeToOrder(response.id)

          return response
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create order'
          set({ 
            loading: false,
            error: errorMessage,
          })
          throw error
        }
      },

      // Load single order
      loadOrder: async (orderId) => {
        set({ loading: true, error: null })

        try {
          const response = await api.get<Order>(`/orders/${orderId}`)
          set({ 
            currentOrder: response,
            loading: false,
            error: null,
          })
        } catch (error) {
          set({ 
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load order',
          })
          throw error
        }
      },

      // Load user orders
      loadOrders: async () => {
        set({ loading: true, error: null })

        try {
          const response = await api.get<Order[]>('/orders')
          set({ 
            orders: response,
            loading: false,
            error: null,
          })
        } catch (error) {
          set({ 
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load orders',
          })
          throw error
        }
      },

      // Update order status
      updateOrderStatus: async (orderId, status) => {
        try {
          await api.patch(`/orders/${orderId}`, { status })
          
          // Update local state
          set(state => ({
            currentOrder: state.currentOrder?.id === orderId 
              ? { ...state.currentOrder, status, updatedAt: new Date() }
              : state.currentOrder,
            orders: state.orders.map(order => 
              order.id === orderId 
                ? { ...order, status, updatedAt: new Date() }
                : order
            ),
          }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update order'
          set({ error: errorMessage })
          throw error
        }
      },

      // Cancel order
      cancelOrder: async (orderId, reason) => {
        try {
          await api.post(`/orders/${orderId}/cancel`, { reason })
          
          // Update local state
          set(state => ({
            currentOrder: state.currentOrder?.id === orderId 
              ? { ...state.currentOrder, status: 'cancelled' as OrderStatus, updatedAt: new Date() }
              : state.currentOrder,
            orders: state.orders.map(order => 
              order.id === orderId 
                ? { ...order, status: 'cancelled' as OrderStatus, updatedAt: new Date() }
                : order
            ),
          }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to cancel order'
          set({ error: errorMessage })
          throw error
        }
      },

      // Subscribe to order updates
      subscribeToOrder: (orderId) => {
        // Unsubscribe from previous subscription
        get().unsubscribe()

        const orderRef = collection(db, getTenantPath('orders'))
        const q = query(orderRef, where('id', '==', orderId))

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const orderData = {
                id: snapshot.docs[0].id,
                ...snapshot.docs[0].data(),
              } as Order

              set({ currentOrder: orderData })
            }
          },
          (error) => {
            console.error('Error subscribing to order:', error)
            set({ error: 'Failed to subscribe to order updates' })
          }
        )

        set({ realtimeSubscription: unsubscribe })
      },

      // Subscribe to user orders
      subscribeToUserOrders: (userId) => {
        // Unsubscribe from previous subscription
        get().unsubscribe()

        const ordersRef = collection(db, getTenantPath('orders'))
        const q = query(
          ordersRef,
          where('customer.id', '==', userId),
          orderBy('createdAt', 'desc')
        )

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const orders = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as Order[]

            set({ orders })
          },
          (error) => {
            console.error('Error subscribing to user orders:', error)
            set({ error: 'Failed to subscribe to order updates' })
          }
        )

        set({ realtimeSubscription: unsubscribe })
      },

      // Unsubscribe from realtime updates
      unsubscribe: () => {
        const { realtimeSubscription } = get()
        if (realtimeSubscription) {
          realtimeSubscription()
          set({ realtimeSubscription: null })
        }
      },

      // Clear current order
      clearCurrentOrder: () => {
        set({ currentOrder: null })
      },

      // Set error
      setError: (error) => {
        set({ error })
      },
    }),
    {
      name: 'OrderStore',
    }
  )
)

// Selectors
export const selectCurrentOrder = (state: OrderState) => state.currentOrder
export const selectOrders = (state: OrderState) => state.orders
export const selectOrderLoading = (state: OrderState) => state.loading
export const selectOrderError = (state: OrderState) => state.error

// Helper functions
export const getOrderStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    pending: '#FFA500',
    confirmed: '#4169E1',
    preparing: '#FF6347',
    ready: '#32CD32',
    delivered: '#20B2AA',
    completed: '#228B22',
    cancelled: '#DC143C',
  }
  return colors[status] || '#808080'
}

export const getOrderStatusLabel = (status: OrderStatus): string => {
  const labels: Record<OrderStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready for Pickup',
    delivered: 'Out for Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

export default useOrderStore
