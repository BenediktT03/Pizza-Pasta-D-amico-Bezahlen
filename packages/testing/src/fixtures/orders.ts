import { faker } from 'faker';
import type { 
  Order, 
  OrderStatus, 
  OrderType, 
  OrderItem, 
  PaymentMethod,
  DeliveryInfo,
  OrderTimeline 
} from '@eatech/types';
import { customerUser, staffUser } from './users';
import { margheritaPizza, rösti, mineralWater, coffee } from './products';

// Helper to generate order numbers
const generateOrderNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = faker.datatype.number({ min: 1000, max: 9999 });
  return `${year}${month}${day}-${random}`;
};

// Helper to generate timeline events
const generateTimeline = (status: OrderStatus, createdAt: Date): OrderTimeline[] => {
  const timeline: OrderTimeline[] = [
    {
      status: 'pending',
      timestamp: createdAt.toISOString(),
      message: 'Bestellung eingegangen',
      messageEn: 'Order received',
    },
  ];

  const statuses: OrderStatus[] = [
    'confirmed', 'preparing', 'ready', 'delivering', 'completed'
  ];

  const currentIndex = statuses.indexOf(status);
  let currentTime = new Date(createdAt);

  for (let i = 0; i <= currentIndex; i++) {
    currentTime = new Date(currentTime.getTime() + faker.datatype.number({ min: 5, max: 15 }) * 60000);
    
    const messages: Record<OrderStatus, { de: string; en: string }> = {
      confirmed: { de: 'Bestellung bestätigt', en: 'Order confirmed' },
      preparing: { de: 'Wird zubereitet', en: 'Being prepared' },
      ready: { de: 'Bereit zur Abholung/Lieferung', en: 'Ready for pickup/delivery' },
      delivering: { de: 'Wird geliefert', en: 'Out for delivery' },
      completed: { de: 'Bestellung abgeschlossen', en: 'Order completed' },
      cancelled: { de: 'Bestellung storniert', en: 'Order cancelled' },
      pending: { de: '', en: '' }, // Already added
      refunded: { de: 'Bestellung erstattet', en: 'Order refunded' },
    };

    if (messages[statuses[i]]) {
      timeline.push({
        status: statuses[i],
        timestamp: currentTime.toISOString(),
        message: messages[statuses[i]].de,
        messageEn: messages[statuses[i]].en,
        user: i === 0 ? 'System' : faker.random.arrayElement([undefined, staffUser.displayName]),
      });
    }
  }

  return timeline;
};

// Helper to calculate totals
const calculateTotals = (items: OrderItem[], deliveryFee = 0, tip = 0, discount = 0) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.077; // 7.7% Swiss VAT
  const total = subtotal + tax + deliveryFee + tip - discount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    deliveryFee,
    tip,
    discount,
    total: parseFloat(total.toFixed(2)),
  };
};

// Create an order item
export const createOrderItem = (overrides: Partial<OrderItem> = {}): OrderItem => {
  const product = faker.random.arrayElement([margheritaPizza, rösti, mineralWater, coffee]);
  const quantity = faker.datatype.number({ min: 1, max: 3 });
  
  return {
    id: faker.datatype.uuid(),
    productId: product.id,
    productName: product.name,
    productNameEn: product.nameEn,
    quantity,
    price: product.price,
    subtotal: product.price * quantity,
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    modifiers: [],
    variant: product.variants?.[0]?.id,
    ...overrides,
  };
};

// Create an order
export const createOrder = (overrides: Partial<Order> = {}): Order => {
  const orderType: OrderType = faker.random.arrayElement(['dine-in', 'pickup', 'delivery']);
  const status: OrderStatus = faker.random.arrayElement([
    'pending', 'confirmed', 'preparing', 'ready', 'delivering', 'completed'
  ]);
  const paymentMethod: PaymentMethod = faker.random.arrayElement([
    'card', 'cash', 'twint', 'postfinance'
  ]);

  const items = Array.from(
    { length: faker.datatype.number({ min: 1, max: 5 }) },
    () => createOrderItem()
  );

  const createdAt = faker.date.recent(30);
  const deliveryFee = orderType === 'delivery' ? 5 : 0;
  const tip = faker.datatype.boolean() ? faker.datatype.number({ min: 0, max: 10 }) : 0;
  const discount = faker.datatype.boolean() ? faker.datatype.number({ min: 0, max: 20 }) : 0;

  const totals = calculateTotals(items, deliveryFee, tip, discount);

  const order: Order = {
    id: faker.datatype.uuid(),
    orderNumber: generateOrderNumber(),
    tenantId: 'tenant-123',
    customerId: customerUser.id,
    customerName: customerUser.displayName,
    customerEmail: customerUser.email,
    customerPhone: customerUser.phoneNumber,
    type: orderType,
    status,
    items,
    ...totals,
    currency: 'CHF',
    paymentMethod,
    paymentStatus: status === 'completed' ? 'paid' : 'pending',
    paymentIntentId: paymentMethod === 'card' ? `pi_${faker.datatype.alphaNumeric(24)}` : undefined,
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    specialInstructions: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    estimatedReadyTime: new Date(createdAt.getTime() + 30 * 60000).toISOString(),
    actualReadyTime: ['ready', 'delivering', 'completed'].includes(status) 
      ? new Date(createdAt.getTime() + 25 * 60000).toISOString() 
      : undefined,
    timeline: generateTimeline(status, createdAt),
    metadata: {},
    createdAt: createdAt.toISOString(),
    updatedAt: faker.date.between(createdAt, new Date()).toISOString(),
    ...overrides,
  };

  // Add delivery info for delivery orders
  if (orderType === 'delivery') {
    order.deliveryInfo = {
      address: {
        street: 'Bahnhofstrasse',
        houseNumber: '10',
        city: 'Zürich',
        canton: 'ZH',
        zip: '8001',
        country: 'CH',
      },
      instructions: faker.datatype.boolean() ? 'Klingeln bei Müller' : undefined,
      estimatedDeliveryTime: new Date(createdAt.getTime() + 45 * 60000).toISOString(),
      actualDeliveryTime: status === 'completed' 
        ? new Date(createdAt.getTime() + 40 * 60000).toISOString() 
        : undefined,
      driverId: status === 'delivering' || status === 'completed' ? 'driver-123' : undefined,
      driverName: status === 'delivering' || status === 'completed' ? 'Hans Lieferant' : undefined,
      driverPhone: status === 'delivering' || status === 'completed' ? '+41 79 234 56 78' : undefined,
    };
  }

  // Add table number for dine-in orders
  if (orderType === 'dine-in') {
    order.tableNumber = faker.datatype.number({ min: 1, max: 20 }).toString();
  }

  return order;
};

// Predefined orders
export const pendingOrder: Order = createOrder({
  id: 'order-pending',
  orderNumber: '20240115-1001',
  status: 'pending',
  type: 'pickup',
  items: [
    createOrderItem({
      productId: margheritaPizza.id,
      productName: margheritaPizza.name,
      price: margheritaPizza.price,
      quantity: 2,
      subtotal: margheritaPizza.price * 2,
    }),
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const preparingOrder: Order = createOrder({
  id: 'order-preparing',
  orderNumber: '20240115-1002',
  status: 'preparing',
  type: 'dine-in',
  tableNumber: '12',
  items: [
    createOrderItem({
      productId: rösti.id,
      productName: rösti.name,
      price: rösti.price,
      quantity: 1,
      subtotal: rösti.price,
    }),
    createOrderItem({
      productId: mineralWater.id,
      productName: mineralWater.name,
      price: mineralWater.price,
      quantity: 2,
      subtotal: mineralWater.price * 2,
      variant: 'sparkling',
    }),
  ],
});

export const deliveringOrder: Order = createOrder({
  id: 'order-delivering',
  orderNumber: '20240115-1003',
  status: 'delivering',
  type: 'delivery',
  deliveryInfo: {
    address: {
      street: 'Technoparkstrasse',
      houseNumber: '1',
      city: 'Zürich',
      canton: 'ZH',
      zip: '8005',
      country: 'CH',
      additionalInfo: '3. Stock, EATECH GmbH',
    },
    instructions: 'Bitte anrufen bei Ankunft',
    estimatedDeliveryTime: new Date(Date.now() + 15 * 60000).toISOString(),
    driverId: 'driver-456',
    driverName: 'Marco Fahrer',
    driverPhone: '+41 79 345 67 89',
    trackingUrl: 'https://track.eatech.ch/order-delivering',
  },
});

export const completedOrder: Order = createOrder({
  id: 'order-completed',
  orderNumber: '20240115-0950',
  status: 'completed',
  type: 'pickup',
  paymentStatus: 'paid',
  paymentMethod: 'twint',
  rating: 5,
  feedback: 'Sehr lecker, gerne wieder!',
  items: [
    createOrderItem({
      productId: coffee.id,
      productName: coffee.name,
      price: coffee.price,
      quantity: 1,
      subtotal: coffee.price,
      variant: 'cappuccino',
      modifiers: [
        { id: 'milk', option: 'oat', name: 'Hafermilch', price: 0.5 },
      ],
    }),
  ],
  tip: 2,
  loyaltyPointsEarned: 15,
  loyaltyPointsUsed: 0,
});

export const cancelledOrder: Order = createOrder({
  id: 'order-cancelled',
  orderNumber: '20240115-0800',
  status: 'cancelled',
  type: 'delivery',
  paymentStatus: 'refunded',
  paymentMethod: 'card',
  cancellationReason: 'Kunde hat Bestellung storniert',
  cancellationReasonEn: 'Customer cancelled order',
  cancelledAt: faker.date.recent(1).toISOString(),
  cancelledBy: customerUser.id,
  refundAmount: 45.80,
  refundedAt: faker.date.recent(1).toISOString(),
});

// Large order (e.g., for a group)
export const largeOrder: Order = createOrder({
  id: 'order-large',
  orderNumber: '20240115-1100',
  status: 'preparing',
  type: 'dine-in',
  tableNumber: '20',
  items: Array.from({ length: 10 }, () => createOrderItem()),
  notes: 'Geburtstagsfeier - 10 Personen',
  specialInstructions: 'Bitte Desserts erst auf Nachfrage servieren',
  metadata: {
    groupSize: '10',
    occasion: 'birthday',
  },
});

// Scheduled order
export const scheduledOrder: Order = createOrder({
  id: 'order-scheduled',
  orderNumber: '20240115-1200',
  status: 'confirmed',
  type: 'pickup',
  scheduledFor: new Date(Date.now() + 2 * 60 * 60000).toISOString(), // 2 hours from now
  estimatedReadyTime: new Date(Date.now() + 2 * 60 * 60000).toISOString(),
  notes: 'Vorbestellung für 18:00 Uhr',
});

// Voice order
export const voiceOrder: Order = createOrder({
  id: 'order-voice',
  orderNumber: '20240115-1300',
  status: 'confirmed',
  type: 'pickup',
  metadata: {
    orderSource: 'voice',
    voiceLanguage: 'de-CH',
    voiceConfidence: '0.95',
  },
  notes: 'Bestellung über Sprachassistent',
});

// Create multiple orders
export const createOrders = (count: number, status?: OrderStatus): Order[] => {
  return Array.from({ length: count }, () => createOrder(status ? { status } : {}));
};

// Export all fixtures
export const orderFixtures = {
  pendingOrder,
  preparingOrder,
  deliveringOrder,
  completedOrder,
  cancelledOrder,
  largeOrder,
  scheduledOrder,
  voiceOrder,
  // Helpers
  createOrder,
  createOrders,
  createOrderItem,
  generateOrderNumber,
  generateTimeline,
  calculateTotals,
};

export default orderFixtures;
