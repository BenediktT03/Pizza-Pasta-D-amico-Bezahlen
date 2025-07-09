import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { produce } from 'immer'

// Types
export interface CartItem {
  id: string
  productId: string
  name: string
  description?: string
  price: number
  quantity: number
  image?: string
  category: string
  modifiers?: CartModifier[]
  specialInstructions?: string
  tenantId: string
}

export interface CartModifier {
  id: string
  name: string
  price: number
  quantity: number
}

export interface CartTotals {
  subtotal: number
  tax: number
  delivery: number
  discount: number
  total: number
}

export interface CartState {
  // State
  items: CartItem[]
  totals: CartTotals
  deliveryType: 'pickup' | 'delivery'
  deliveryAddress?: string
  deliveryTime?: Date
  tableNumber?: string
  notes?: string
  promoCode?: string
  promoDiscount?: number

  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void
  updateQuantity: (itemId: string, quantity: number) => void
  removeItem: (itemId: string) => void
  updateModifiers: (itemId: string, modifiers: CartModifier[]) => void
  updateSpecialInstructions: (itemId: string, instructions: string) => void
  setDeliveryType: (type: 'pickup' | 'delivery') => void
  setDeliveryAddress: (address: string) => void
  setDeliveryTime: (time: Date) => void
  setTableNumber: (tableNumber: string) => void
  setNotes: (notes: string) => void
  applyPromoCode: (code: string) => Promise<boolean>
  clearCart: () => void
  calculateTotals: () => void

  // Computed
  itemCount: number
  isEmpty: boolean
}

// Swiss VAT rate
const VAT_RATE = 0.077 // 7.7%

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        items: [],
        totals: {
          subtotal: 0,
          tax: 0,
          delivery: 0,
          discount: 0,
          total: 0,
        },
        deliveryType: 'pickup',
        itemCount: 0,
        isEmpty: true,

        // Add item to cart
        addItem: (item) => {
          set(
            produce((state: CartState) => {
              // Check if item already exists
              const existingItemIndex = state.items.findIndex(
                (i) =>
                  i.productId === item.productId &&
                  JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers)
              )

              if (existingItemIndex !== -1) {
                // Update quantity if item exists
                state.items[existingItemIndex].quantity += item.quantity
              } else {
                // Add new item
                state.items.push({
                  ...item,
                  id: `${item.productId}-${Date.now()}`,
                })
              }
            })
          )
          get().calculateTotals()
        },

        // Update item quantity
        updateQuantity: (itemId, quantity) => {
          if (quantity <= 0) {
            get().removeItem(itemId)
            return
          }

          set(
            produce((state: CartState) => {
              const item = state.items.find((i) => i.id === itemId)
              if (item) {
                item.quantity = quantity
              }
            })
          )
          get().calculateTotals()
        },

        // Remove item from cart
        removeItem: (itemId) => {
          set(
            produce((state: CartState) => {
              state.items = state.items.filter((i) => i.id !== itemId)
            })
          )
          get().calculateTotals()
        },

        // Update item modifiers
        updateModifiers: (itemId, modifiers) => {
          set(
            produce((state: CartState) => {
              const item = state.items.find((i) => i.id === itemId)
              if (item) {
                item.modifiers = modifiers
              }
            })
          )
          get().calculateTotals()
        },

        // Update special instructions
        updateSpecialInstructions: (itemId, instructions) => {
          set(
            produce((state: CartState) => {
              const item = state.items.find((i) => i.id === itemId)
              if (item) {
                item.specialInstructions = instructions
              }
            })
          )
        },

        // Set delivery type
        setDeliveryType: (type) => {
          set({ deliveryType: type })
          get().calculateTotals()
        },

        // Set delivery address
        setDeliveryAddress: (address) => {
          set({ deliveryAddress: address })
        },

        // Set delivery time
        setDeliveryTime: (time) => {
          set({ deliveryTime: time })
        },

        // Set table number
        setTableNumber: (tableNumber) => {
          set({ tableNumber })
        },

        // Set notes
        setNotes: (notes) => {
          set({ notes })
        },

        // Apply promo code
        applyPromoCode: async (code) => {
          try {
            // TODO: Validate promo code with backend
            // const response = await api.post('/promo/validate', { code })
            
            // Mock implementation
            if (code === 'WELCOME10') {
              set({ promoCode: code, promoDiscount: 0.1 }) // 10% discount
              get().calculateTotals()
              return true
            }
            
            return false
          } catch (error) {
            console.error('Error applying promo code:', error)
            return false
          }
        },

        // Clear cart
        clearCart: () => {
          set({
            items: [],
            totals: {
              subtotal: 0,
              tax: 0,
              delivery: 0,
              discount: 0,
              total: 0,
            },
            deliveryType: 'pickup',
            deliveryAddress: undefined,
            deliveryTime: undefined,
            tableNumber: undefined,
            notes: undefined,
            promoCode: undefined,
            promoDiscount: undefined,
            itemCount: 0,
            isEmpty: true,
          })
        },

        // Calculate totals
        calculateTotals: () => {
          const state = get()
          
          // Calculate subtotal
          const subtotal = state.items.reduce((sum, item) => {
            const itemPrice = item.price * item.quantity
            const modifiersPrice = item.modifiers?.reduce(
              (modSum, mod) => modSum + mod.price * mod.quantity,
              0
            ) || 0
            return sum + itemPrice + modifiersPrice
          }, 0)

          // Calculate delivery fee
          const delivery = state.deliveryType === 'delivery' ? 5 : 0 // CHF 5 delivery fee

          // Calculate discount
          const discount = state.promoDiscount ? subtotal * state.promoDiscount : 0

          // Calculate tax (on subtotal - discount)
          const taxableAmount = subtotal - discount
          const tax = taxableAmount * VAT_RATE

          // Calculate total
          const total = taxableAmount + tax + delivery

          // Calculate item count
          const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0)

          set({
            totals: {
              subtotal,
              tax,
              delivery,
              discount,
              total,
            },
            itemCount,
            isEmpty: state.items.length === 0,
          })
        },
      }),
      {
        name: 'cart-storage',
        partialize: (state) => ({
          items: state.items,
          deliveryType: state.deliveryType,
          deliveryAddress: state.deliveryAddress,
          tableNumber: state.tableNumber,
          promoCode: state.promoCode,
          promoDiscount: state.promoDiscount,
        }),
      }
    ),
    {
      name: 'CartStore',
    }
  )
)

// Selectors
export const selectCartItems = (state: CartState) => state.items
export const selectCartTotals = (state: CartState) => state.totals
export const selectItemCount = (state: CartState) => state.itemCount
export const selectIsCartEmpty = (state: CartState) => state.isEmpty
export const selectDeliveryType = (state: CartState) => state.deliveryType

export default useCartStore
