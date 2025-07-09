/**
 * Location Model Types
 * Type definitions for location-related data structures
 */

import { z } from 'zod';
import { SwissCanton } from './tenant';

// Location type enum
export enum LocationType {
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  BAR = 'bar',
  FOOD_TRUCK = 'food_truck',
  KIOSK = 'kiosk',
  GHOST_KITCHEN = 'ghost_kitchen',
  CATERING = 'catering',
  POPUP = 'popup',
}

// Location status enum
export enum LocationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMING_SOON = 'coming_soon',
  TEMPORARILY_CLOSED = 'temporarily_closed',
  PERMANENTLY_CLOSED = 'permanently_closed',
}

// Base location interface
export interface Location {
  id: string;
  tenantId: string;
  name: string;
  displayName: Record<string, string>; // Multilingual
  type: LocationType;
  status: LocationStatus;
  address: LocationAddress;
  contact: LocationContact;
  coordinates: Coordinates;
  timezone: string;
  businessHours: BusinessHours;
  specialHours: SpecialHours[];
  holidays: Holiday[];
  features: LocationFeatures;
  capacity: LocationCapacity;
  areas: LocationArea[];
  services: LocationServices;
  images: LocationImage[];
  ratings: LocationRatings;
  metadata: LocationMetadata;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Location address interface
export interface LocationAddress {
  street: string;
  streetNumber: string;
  building?: string;
  floor?: string;
  apartment?: string;
  city: string;
  postalCode: string;
  canton: SwissCanton;
  country: 'CH';
  neighborhood?: string;
  landmark?: string;
  directions?: Record<string, string>; // Multilingual
}

// Location contact interface
export interface LocationContact {
  phone: string;
  alternatePhone?: string;
  email: string;
  website?: string;
  socialMedia?: SocialMediaLinks;
  contactPerson?: ContactPerson;
}

// Social media links interface
export interface SocialMediaLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  tripadvisor?: string;
  googleBusiness?: string;
}

// Contact person interface
export interface ContactPerson {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  availability?: string;
}

// Coordinates interface
export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
}

// Business hours interface
export interface BusinessHours {
  monday?: DayHours[];
  tuesday?: DayHours[];
  wednesday?: DayHours[];
  thursday?: DayHours[];
  friday?: DayHours[];
  saturday?: DayHours[];
  sunday?: DayHours[];
}

// Day hours interface
export interface DayHours {
  open: string; // HH:mm format
  close: string; // HH:mm format
  type?: 'regular' | 'breakfast' | 'lunch' | 'dinner' | 'late_night';
}

// Special hours interface
export interface SpecialHours {
  date: Date;
  hours: DayHours[];
  reason?: string;
  recurring?: boolean;
}

// Holiday interface
export interface Holiday {
  date: Date;
  name: string;
  isClosedAllDay: boolean;
  hours?: DayHours[];
  recurring?: boolean;
}

// Location features interface
export interface LocationFeatures {
  wifi: boolean;
  parking: boolean;
  parkingType?: ('street' | 'lot' | 'garage' | 'valet')[];
  accessibility: AccessibilityFeatures;
  payment: PaymentFeatures;
  ambiance: AmbianceFeatures;
  dining: DiningFeatures;
}

// Accessibility features interface
export interface AccessibilityFeatures {
  wheelchairAccessible: boolean;
  wheelchairAccessibleParking: boolean;
  wheelchairAccessibleRestroom: boolean;
  brailleMenu: boolean;
  audioMenu: boolean;
  serviceAnimalsAllowed: boolean;
}

// Payment features interface
export interface PaymentFeatures {
  cashAccepted: boolean;
  cardAccepted: boolean;
  cardTypes?: string[];
  contactlessAccepted: boolean;
  mobilePaymentAccepted: boolean;
  cryptocurrencyAccepted: boolean;
  tipsAccepted: boolean;
}

// Ambiance features interface
export interface AmbianceFeatures {
  familyFriendly: boolean;
  groupsAccepted: boolean;
  kidsMenu: boolean;
  smokingAllowed: boolean;
  outdoorSeating: boolean;
  liveMusic: boolean;
  tvAvailable: boolean;
  quietAtmosphere: boolean;
}

// Dining features interface
export interface DiningFeatures {
  dineIn: boolean;
  takeout: boolean;
  delivery: boolean;
  driveThru: boolean;
  curbsidePickup: boolean;
  reservations: boolean;
  onlineOrdering: boolean;
  cateringAvailable: boolean;
}

// Location capacity interface
export interface LocationCapacity {
  totalSeats?: number;
  indoorSeats?: number;
  outdoorSeats?: number;
  standingCapacity?: number;
  maxGroupSize?: number;
  privateRooms?: number;
  privateRoomCapacity?: Record<string, number>;
}

// Location area interface
export interface LocationArea {
  id: string;
  name: string;
  type: 'dining' | 'bar' | 'lounge' | 'patio' | 'private' | 'waiting';
  capacity: number;
  tables: Table[];
  features?: string[];
  images?: string[];
  isActive: boolean;
}

// Table interface
export interface Table {
  id: string;
  number: string;
  areaId: string;
  seats: number;
  shape?: 'round' | 'square' | 'rectangle' | 'oval';
  position?: {
    x: number;
    y: number;
  };
  status: TableStatus;
  features?: string[];
  qrCode?: string;
}

// Table status enum
export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance',
}

// Location services interface
export interface LocationServices {
  delivery: DeliveryService;
  catering: CateringService;
  events: EventService;
}

// Delivery service interface
export interface DeliveryService {
  enabled: boolean;
  radius: number; // in km
  zones: DeliveryZone[];
  minOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold?: number;
  estimatedTime: {
    min: number; // in minutes
    max: number;
  };
  providers?: DeliveryProvider[];
}

// Delivery zone interface
export interface DeliveryZone {
  id: string;
  name: string;
  polygon: Coordinates[]; // Geographic boundary
  postalCodes?: string[];
  fee: number;
  minOrderAmount: number;
  estimatedTime: number; // in minutes
  isActive: boolean;
}

// Delivery provider interface
export interface DeliveryProvider {
  name: string;
  type: 'internal' | 'third_party';
  commission?: number; // percentage
  integrationEnabled: boolean;
}

// Catering service interface
export interface CateringService {
  enabled: boolean;
  minOrderAmount: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  deliveryRadius?: number;
  setupService: boolean;
  staffService: boolean;
  equipmentProvided: string[];
}

// Event service interface
export interface EventService {
  enabled: boolean;
  types: EventType[];
  maxCapacity: number;
  minCapacity: number;
  packages: EventPackage[];
  amenities: string[];
}

// Event type interface
export interface EventType {
  id: string;
  name: string;
  description?: string;
  minGuests: number;
  maxGuests: number;
  pricePerPerson?: number;
}

// Event package interface
export interface EventPackage {
  id: string;
  name: string;
  description: string;
  pricePerPerson: number;
  minGuests: number;
  includes: string[];
  duration: number; // in hours
}

// Location image interface
export interface LocationImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'exterior' | 'interior' | 'food' | 'ambiance' | 'staff' | 'menu';
  caption?: Record<string, string>; // Multilingual
  isPrimary: boolean;
  displayOrder: number;
  photographer?: string;
}

// Location ratings interface
export interface LocationRatings {
  overall: number; // 1-5 scale
  food: number;
  service: number;
  ambiance: number;
  value: number;
  cleanliness: number;
  totalReviews: number;
  platforms: PlatformRating[];
}

// Platform rating interface
export interface PlatformRating {
  platform: 'google' | 'tripadvisor' | 'yelp' | 'facebook' | 'internal';
  rating: number;
  reviewCount: number;
  url?: string;
  lastUpdated: Date;
}

// Location metadata interface
export interface LocationMetadata {
  established?: Date;
  renovated?: Date;
  certifications?: Certification[];
  awards?: Award[];
  cuisineTypes?: string[];
  priceRange?: 1 | 2 | 3 | 4; // $ to $$$$
  dresscode?: string;
  specialties?: string[];
  chefName?: string;
  ownerName?: string;
  customFields?: Record<string, any>;
}

// Certification interface
export interface Certification {
  name: string;
  issuer: string;
  validUntil?: Date;
  certificateUrl?: string;
}

// Award interface
export interface Award {
  name: string;
  year: number;
  issuer: string;
  category?: string;
}

// Create location input
export interface CreateLocationInput {
  tenantId: string;
  name: string;
  displayName: Record<string, string>;
  type: LocationType;
  address: LocationAddress;
  contact: Omit<LocationContact, 'socialMedia'>;
  coordinates: Coordinates;
  timezone: string;
  businessHours: BusinessHours;
}

// Update location input
export interface UpdateLocationInput {
  displayName?: Record<string, string>;
  status?: LocationStatus;
  address?: Partial<LocationAddress>;
  contact?: Partial<LocationContact>;
  businessHours?: BusinessHours;
  features?: Partial<LocationFeatures>;
  capacity?: Partial<LocationCapacity>;
  services?: Partial<LocationServices>;
  metadata?: Partial<LocationMetadata>;
}

// Validation schemas
export const locationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  displayName: z.record(z.string()),
  type: z.nativeEnum(LocationType),
  status: z.nativeEnum(LocationStatus),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  timezone: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

// Helpers
export function isLocationOpen(location: Location, date: Date = new Date()): boolean {
  if (location.status !== LocationStatus.ACTIVE) return false;
  
  // Check if it's a holiday
  const isHoliday = location.holidays.some(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate.toDateString() === date.toDateString() && holiday.isClosedAllDay;
  });
  
  if (isHoliday) return false;
  
  // Check special hours
  const specialHours = location.specialHours.find(sh => {
    const shDate = new Date(sh.date);
    return shDate.toDateString() === date.toDateString();
  });
  
  if (specialHours) {
    return isTimeInHours(date, specialHours.hours);
  }
  
  // Check regular business hours
  const dayOfWeek = date.toLocaleLowerCase() as keyof BusinessHours;
  const dayHours = location.businessHours[dayOfWeek];
  
  if (!dayHours || dayHours.length === 0) return false;
  
  return isTimeInHours(date, dayHours);
}

function isTimeInHours(date: Date, hours: DayHours[]): boolean {
  const time = date.getHours() * 60 + date.getMinutes();
  
  return hours.some(hour => {
    const [openHour, openMinute] = hour.open.split(':').map(Number);
    const [closeHour, closeMinute] = hour.close.split(':').map(Number);
    
    const openTime = openHour * 60 + openMinute;
    let closeTime = closeHour * 60 + closeMinute;
    
    // Handle closing after midnight
    if (closeTime < openTime) {
      closeTime += 24 * 60;
    }
    
    return time >= openTime && time <= closeTime;
  });
}

export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function canDeliver(location: Location, address: Coordinates): boolean {
  if (!location.services.delivery.enabled) return false;
  
  const distance = calculateDistance(location.coordinates, address);
  
  if (distance > location.services.delivery.radius) return false;
  
  // Check if address is in any delivery zone
  const inZone = location.services.delivery.zones.some(zone => {
    if (!zone.isActive) return false;
    // This is a simplified check - in reality, you'd use a point-in-polygon algorithm
    return true;
  });
  
  return inZone;
}
