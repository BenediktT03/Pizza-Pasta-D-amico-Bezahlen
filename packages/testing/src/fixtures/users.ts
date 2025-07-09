import { faker } from 'faker';
import type { User, UserRole, UserPreferences, Address } from '@eatech/types';

// Helper to generate Swiss phone numbers
const generateSwissPhoneNumber = (): string => {
  const prefixes = ['76', '77', '78', '79']; // Swiss mobile prefixes
  const prefix = faker.random.arrayElement(prefixes);
  const number = faker.datatype.number({ min: 1000000, max: 9999999 });
  return `+41 ${prefix} ${String(number).replace(/(\d{3})(\d{2})(\d{2})/, '$1 $2 $3')}`;
};

// Helper to generate Swiss addresses
const generateSwissAddress = (): Address => {
  const cities = [
    { name: 'Zürich', canton: 'ZH', zip: '8001' },
    { name: 'Genève', canton: 'GE', zip: '1201' },
    { name: 'Basel', canton: 'BS', zip: '4001' },
    { name: 'Bern', canton: 'BE', zip: '3001' },
    { name: 'Lausanne', canton: 'VD', zip: '1003' },
    { name: 'Winterthur', canton: 'ZH', zip: '8400' },
    { name: 'Luzern', canton: 'LU', zip: '6003' },
    { name: 'St. Gallen', canton: 'SG', zip: '9000' },
  ];

  const city = faker.random.arrayElement(cities);
  
  return {
    street: faker.address.streetName(),
    houseNumber: faker.datatype.number({ min: 1, max: 200 }).toString(),
    city: city.name,
    canton: city.canton,
    zip: city.zip,
    country: 'CH',
    additionalInfo: faker.datatype.boolean() ? faker.address.secondaryAddress() : undefined,
  };
};

// Base user preferences
const basePreferences: UserPreferences = {
  language: 'de',
  currency: 'CHF',
  notifications: {
    email: true,
    sms: true,
    push: true,
    orderUpdates: true,
    marketing: false,
    newsletter: false,
  },
  dietary: {
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    lactoseFree: false,
    halal: false,
    kosher: false,
    allergies: [],
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    screenReader: false,
    reducedMotion: false,
  },
};

// Create a user with specific role
export const createUser = (overrides: Partial<User> = {}): User => {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const email = faker.internet.email(firstName, lastName).toLowerCase();

  return {
    id: faker.datatype.uuid(),
    email,
    displayName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    role: 'customer' as UserRole,
    tenantId: 'tenant-123',
    phoneNumber: generateSwissPhoneNumber(),
    photoURL: faker.image.avatar(),
    emailVerified: true,
    phoneVerified: false,
    addresses: [generateSwissAddress()],
    defaultAddressId: undefined,
    preferences: { ...basePreferences },
    loyaltyPoints: faker.datatype.number({ min: 0, max: 1000 }),
    totalOrders: faker.datatype.number({ min: 0, max: 50 }),
    totalSpent: faker.datatype.number({ min: 0, max: 5000 }),
    lastOrderAt: faker.date.recent(30).toISOString(),
    tags: [],
    metadata: {},
    active: true,
    createdAt: faker.date.past(2).toISOString(),
    updatedAt: faker.date.recent(7).toISOString(),
    ...overrides,
  };
};

// Predefined user fixtures
export const customerUser: User = createUser({
  id: 'customer-123',
  email: 'customer@eatech.ch',
  displayName: 'Max Müller',
  firstName: 'Max',
  lastName: 'Müller',
  role: 'customer',
  loyaltyPoints: 250,
  totalOrders: 15,
  totalSpent: 875.50,
  addresses: [
    {
      street: 'Bahnhofstrasse',
      houseNumber: '10',
      city: 'Zürich',
      canton: 'ZH',
      zip: '8001',
      country: 'CH',
    },
  ],
  defaultAddressId: '0',
});

export const staffUser: User = createUser({
  id: 'staff-123',
  email: 'staff@eatech.ch',
  displayName: 'Anna Weber',
  firstName: 'Anna',
  lastName: 'Weber',
  role: 'staff',
  permissions: [
    'orders.view',
    'orders.update',
    'products.view',
    'customers.view',
  ],
  metadata: {
    employeeId: 'EMP-001',
    department: 'Service',
    hireDate: '2023-01-15',
  },
});

export const adminUser: User = createUser({
  id: 'admin-123',
  email: 'admin@eatech.ch',
  displayName: 'Thomas Schmidt',
  firstName: 'Thomas',
  lastName: 'Schmidt',
  role: 'admin',
  permissions: [
    'orders.*',
    'products.*',
    'customers.*',
    'staff.*',
    'settings.*',
    'reports.*',
  ],
  metadata: {
    employeeId: 'EMP-ADM-001',
    department: 'Management',
    hireDate: '2022-06-01',
  },
});

export const superAdminUser: User = createUser({
  id: 'super-admin-123',
  email: 'super@eatech.ch',
  displayName: 'EATECH Admin',
  firstName: 'EATECH',
  lastName: 'Admin',
  role: 'superadmin',
  tenantId: undefined, // Super admin has no tenant
  permissions: ['*'], // All permissions
});

// Create multiple users
export const createUsers = (count: number, role?: UserRole): User[] => {
  return Array.from({ length: count }, () => createUser({ role }));
};

// User with specific scenarios
export const newUser: User = createUser({
  emailVerified: false,
  phoneVerified: false,
  totalOrders: 0,
  totalSpent: 0,
  loyaltyPoints: 0,
  lastOrderAt: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const loyalCustomer: User = createUser({
  loyaltyPoints: 2500,
  totalOrders: 150,
  totalSpent: 12500.75,
  tags: ['vip', 'loyal', 'frequent'],
  preferences: {
    ...basePreferences,
    notifications: {
      ...basePreferences.notifications,
      marketing: true,
      newsletter: true,
    },
  },
});

export const veganCustomer: User = createUser({
  preferences: {
    ...basePreferences,
    dietary: {
      ...basePreferences.dietary,
      vegetarian: true,
      vegan: true,
      glutenFree: true,
    },
  },
  tags: ['vegan', 'health-conscious'],
});

export const businessCustomer: User = createUser({
  displayName: 'EATECH GmbH',
  firstName: 'EATECH',
  lastName: 'GmbH',
  metadata: {
    companyName: 'EATECH GmbH',
    vatNumber: 'CHE-123.456.789',
    businessType: 'Technology',
    billingEmail: 'billing@eatech.ch',
  },
  tags: ['business', 'b2b', 'corporate'],
  addresses: [
    {
      street: 'Technoparkstrasse',
      houseNumber: '1',
      city: 'Zürich',
      canton: 'ZH',
      zip: '8005',
      country: 'CH',
      additionalInfo: '3. Stock, EATECH GmbH',
    },
  ],
});

// User with accessibility needs
export const accessibilityUser: User = createUser({
  preferences: {
    ...basePreferences,
    accessibility: {
      highContrast: true,
      largeText: true,
      screenReader: true,
      reducedMotion: true,
    },
  },
  tags: ['accessibility'],
});

// Deleted/Inactive user
export const deletedUser: User = createUser({
  active: false,
  deletedAt: faker.date.recent(7).toISOString(),
  metadata: {
    deletionReason: 'User requested account deletion',
    deletedBy: 'user',
  },
});

// Export all fixtures
export const userFixtures = {
  customerUser,
  staffUser,
  adminUser,
  superAdminUser,
  newUser,
  loyalCustomer,
  veganCustomer,
  businessCustomer,
  accessibilityUser,
  deletedUser,
  // Helpers
  createUser,
  createUsers,
  generateSwissPhoneNumber,
  generateSwissAddress,
};

export default userFixtures;
