/**
 * EATECH - Event Type Definitions
 * Version: 1.0.0
 * Description: Complete type definitions for event management and catering
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/types/event.types.ts
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum EventStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  IN_PREPARATION = 'in_preparation',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed'
}

export enum EventType {
  CORPORATE = 'corporate',
  WEDDING = 'wedding',
  BIRTHDAY = 'birthday',
  FESTIVAL = 'festival',
  PRIVATE_PARTY = 'private_party',
  SPORTS_EVENT = 'sports_event',
  CONCERT = 'concert',
  EXHIBITION = 'exhibition',
  CONFERENCE = 'conference',
  CHARITY = 'charity',
  STREET_FOOD = 'street_food',
  POPUP = 'popup',
  CATERING = 'catering'
}

export enum EventServiceType {
  FULL_SERVICE = 'full_service',
  SELF_SERVICE = 'self_service',
  BUFFET = 'buffet',
  FOOD_TRUCK = 'food_truck',
  DELIVERY_ONLY = 'delivery_only',
  PICKUP_ONLY = 'pickup_only',
  MIXED = 'mixed'
}

export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  VIP = 'vip'
}

export enum StaffRole {
  CHEF = 'chef',
  COOK = 'cook',
  SERVER = 'server',
  BARTENDER = 'bartender',
  CASHIER = 'cashier',
  MANAGER = 'manager',
  DRIVER = 'driver',
  HELPER = 'helper',
  COORDINATOR = 'coordinator'
}

export enum EquipmentType {
  COOKING = 'cooking',
  SERVING = 'serving',
  COOLING = 'cooling',
  HEATING = 'heating',
  TRANSPORT = 'transport',
  FURNITURE = 'furniture',
  TENT = 'tent',
  DECORATION = 'decoration',
  AUDIO_VISUAL = 'audio_visual',
  SAFETY = 'safety'
}

// ============================================================================
// EVENT INTERFACES
// ============================================================================

export interface Event {
  id: string;
  tenantId: string;
  status: EventStatus;
  type: EventType;
  priority: EventPriority;
  info: EventInfo;
  client: EventClient;
  venue: EventVenue;
  schedule: EventSchedule;
  catering: EventCatering;
  staffing: EventStaffing;
  equipment: EventEquipment[];
  logistics: EventLogistics;
  budget: EventBudget;
  documents: EventDocument[];
  tasks: EventTask[];
  notes: EventNote[];
  analytics?: EventAnalytics;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
}

export interface EventInfo {
  name: string;
  description: string;
  theme?: string;
  dresscode?: string;
  expectedGuests: number;
  actualGuests?: number;
  minGuests?: number;
  maxGuests?: number;
  tags: string[];
  specialRequirements?: string[];
  publicEvent: boolean;
  featured: boolean;
  recurring?: RecurringConfig;
}

export interface RecurringConfig {
  enabled: boolean;
  pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[]; // 0-6
  dayOfMonth?: number;
  endDate?: Date;
  occurrences?: number;
  exceptions?: Date[];
}

export interface EventClient {
  id: string;
  type: 'individual' | 'company' | 'organization';
  name: string;
  company?: string;
  contactPerson: ContactPerson;
  billingAddress: Address;
  alternativeContacts?: ContactPerson[];
  vip: boolean;
  notes?: string;
  previousEvents?: string[];
  preferredPaymentMethod?: string;
}

export interface ContactPerson {
  name: string;
  role?: string;
  email: string;
  phone: string;
  alternativePhone?: string;
  preferredContactMethod?: 'email' | 'phone' | 'whatsapp';
  availability?: string;
}

export interface Address {
  street: string;
  streetNumber: string;
  additionalLine?: string;
  postalCode: string;
  city: string;
  state?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface EventVenue {
  type: 'indoor' | 'outdoor' | 'mixed';
  name: string;
  address: Address;
  contactPerson?: ContactPerson;
  capacity: number;
  facilities: VenueFacility[];
  restrictions?: string[];
  parkingInfo?: ParkingInfo;
  accessInfo?: AccessInfo;
  layoutPlan?: string; // URL to floor plan
  photos?: string[];
  setupInstructions?: string;
  emergencyInfo?: EmergencyInfo;
}

export interface VenueFacility {
  type: 'kitchen' | 'storage' | 'restroom' | 'electricity' | 'water' | 'gas' | 'wifi' | 'parking';
  available: boolean;
  details?: string;
  capacity?: string;
  cost?: number;
}

export interface ParkingInfo {
  available: boolean;
  type: 'free' | 'paid' | 'valet';
  capacity: number;
  distance?: number; // in meters
  instructions?: string;
  cost?: number;
}

export interface AccessInfo {
  wheelchairAccessible: boolean;
  publicTransport?: string[];
  loadingDock: boolean;
  serviceElevator: boolean;
  restrictions?: string[];
}

export interface EmergencyInfo {
  contactPerson: ContactPerson;
  nearestHospital?: {
    name: string;
    distance: number;
    phone: string;
  };
  fireExtinguisher: boolean;
  firstAidKit: boolean;
  emergencyExits: number;
  assemblyPoint?: string;
}

export interface EventSchedule {
  date: Date;
  setupStart: Date;
  setupEnd: Date;
  eventStart: Date;
  eventEnd: Date;
  serviceStart: Date;
  serviceEnd: Date;
  breakdownStart: Date;
  breakdownEnd: Date;
  timeline: TimelineItem[];
  timezone: string;
  weatherForecast?: WeatherInfo;
}

export interface TimelineItem {
  time: Date;
  duration: number; // in minutes
  title: string;
  description?: string;
  responsible?: string;
  type: 'setup' | 'service' | 'program' | 'breakdown' | 'milestone';
  completed?: boolean;
  notes?: string;
}

export interface WeatherInfo {
  date: Date;
  temperature: {
    min: number;
    max: number;
    unit: 'celsius' | 'fahrenheit';
  };
  condition: string;
  precipitation: number; // percentage
  windSpeed: number;
  humidity: number;
  sunrise?: string;
  sunset?: string;
}

// ============================================================================
// CATERING & MENU
// ============================================================================

export interface EventCatering {
  serviceType: EventServiceType;
  menu: EventMenu;
  beverages: BeveragePackage;
  dietaryRequirements: DietaryRequirement[];
  servingStyle: ServingStyle;
  courses: Course[];
  tastingSession?: TastingSession;
  specialRequests?: string[];
}

export interface EventMenu {
  id: string;
  name: string;
  type: 'preset' | 'custom' | 'buffet' | 'cocktail' | 'mixed';
  pricePerPerson: number;
  minimumOrder?: number;
  items: MenuItem[];
  alternatives?: MenuItem[];
  kidsMenu?: MenuItem[];
  seasonalAvailability?: {
    startMonth: number;
    endMonth: number;
  };
}

export interface MenuItem {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  servingSize?: string;
  preparationNotes?: string;
  presentation?: string;
  allergens?: string[];
  customizations?: Record<string, any>;
}

export interface BeveragePackage {
  type: 'basic' | 'standard' | 'premium' | 'custom';
  includesAlcohol: boolean;
  items: BeverageItem[];
  serviceStyle: 'self_service' | 'table_service' | 'bar_service' | 'mixed';
  duration?: number; // hours
  pricePerPerson?: number;
}

export interface BeverageItem {
  productId: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  temperature?: 'chilled' | 'room' | 'hot';
  garnish?: string[];
}

export interface DietaryRequirement {
  type: string;
  count: number;
  severity: 'preference' | 'intolerance' | 'allergy' | 'medical';
  notes?: string;
  alternativeMenu?: MenuItem[];
}

export interface ServingStyle {
  type: 'plated' | 'family_style' | 'buffet' | 'stations' | 'passed' | 'mixed';
  serviceWare: 'disposable' | 'china' | 'mixed' | 'client_provided';
  tableService: boolean;
  details?: string;
}

export interface Course {
  id: string;
  name: string;
  order: number;
  items: MenuItem[];
  serviceTime?: Date;
  duration?: number; // minutes
  servingInstructions?: string;
}

export interface TastingSession {
  scheduled: boolean;
  date?: Date;
  location?: string;
  attendees?: number;
  menuItems?: string[];
  notes?: string;
  completed?: boolean;
  feedback?: string;
}

// ============================================================================
// STAFFING
// ============================================================================

export interface EventStaffing {
  required: StaffRequirement[];
  assigned: StaffAssignment[];
  schedule: StaffSchedule[];
  uniforms?: UniformRequirement;
  briefing?: StaffBriefing;
  transportation?: TransportationArrangement;
}

export interface StaffRequirement {
  role: StaffRole;
  count: number;
  skills?: string[];
  languages?: string[];
  experience?: string;
  certifications?: string[];
}

export interface StaffAssignment {
  staffId: string;
  staffName: string;
  role: StaffRole;
  isLead: boolean;
  startTime: Date;
  endTime: Date;
  breakDuration?: number; // minutes
  wage?: {
    type: 'hourly' | 'fixed' | 'event';
    amount: number;
    overtime?: number;
  };
  tasks: string[];
  contactInfo: {
    phone: string;
    email?: string;
  };
  status: 'confirmed' | 'pending' | 'declined';
  notes?: string;
}

export interface StaffSchedule {
  staffId: string;
  checkIn?: Date;
  checkOut?: Date;
  breaks: Break[];
  tasks: ScheduledTask[];
  location?: string;
}

export interface Break {
  start: Date;
  end: Date;
  type: 'meal' | 'rest';
  paid: boolean;
}

export interface ScheduledTask {
  time: Date;
  duration: number;
  task: string;
  location?: string;
  priority: 'low' | 'normal' | 'high';
  completed?: boolean;
}

export interface UniformRequirement {
  description: string;
  provider: 'company' | 'staff' | 'rental';
  items: UniformItem[];
  cleaningInstructions?: string;
  returnRequired?: boolean;
}

export interface UniformItem {
  type: string;
  color?: string;
  size?: string;
  quantity: number;
  notes?: string;
}

export interface StaffBriefing {
  scheduled: boolean;
  date?: Date;
  duration?: number;
  location?: string;
  topics: string[];
  documents?: string[];
  attendance?: StaffAttendance[];
}

export interface StaffAttendance {
  staffId: string;
  attended: boolean;
  arrivalTime?: Date;
  signature?: string;
}

export interface TransportationArrangement {
  required: boolean;
  type: 'company_vehicle' | 'rental' | 'personal' | 'public';
  pickupLocation?: string;
  pickupTime?: Date;
  returnTime?: Date;
  driver?: string;
  vehicle?: VehicleInfo;
  mileageReimbursement?: number;
}

export interface VehicleInfo {
  type: string;
  make?: string;
  model?: string;
  licensePlate?: string;
  capacity: number;
  insuranceInfo?: string;
}

// ============================================================================
// EQUIPMENT & LOGISTICS
// ============================================================================

export interface EventEquipment {
  id: string;
  type: EquipmentType;
  name: string;
  quantity: number;
  source: 'owned' | 'rented' | 'client_provided';
  supplier?: EquipmentSupplier;
  condition: 'new' | 'good' | 'fair' | 'needs_repair';
  setupRequired: boolean;
  operator?: string;
  deliveryInfo?: DeliveryInfo;
  returnInfo?: ReturnInfo;
  cost?: number;
  notes?: string;
}

export interface EquipmentSupplier {
  id: string;
  name: string;
  contactPerson: ContactPerson;
  contractNumber?: string;
  deliveryTerms?: string;
}

export interface DeliveryInfo {
  date: Date;
  time: string;
  address?: Address;
  contactPerson?: ContactPerson;
  instructions?: string;
  confirmed: boolean;
  trackingNumber?: string;
}

export interface ReturnInfo {
  date: Date;
  time: string;
  address?: Address;
  contactPerson?: ContactPerson;
  instructions?: string;
  condition?: string;
  damages?: string[];
  confirmed: boolean;
}

export interface EventLogistics {
  transportation: Transportation[];
  loading: LoadingPlan;
  route: Route;
  permits: Permit[];
  insurance: Insurance[];
  contingencyPlan?: ContingencyPlan;
}

export interface Transportation {
  vehicleId: string;
  type: string;
  capacity: string;
  driver: string;
  departureTime: Date;
  arrivalTime: Date;
  returnTime?: Date;
  cargo: CargoItem[];
  fuelCost?: number;
  mileage?: number;
}

export interface CargoItem {
  category: string;
  description: string;
  quantity: number;
  weight?: number;
  specialHandling?: string;
  loaded: boolean;
}

export interface LoadingPlan {
  sequence: LoadingSequence[];
  totalWeight?: number;
  totalVolume?: number;
  specialInstructions?: string[];
  checklist: ChecklistItem[];
}

export interface LoadingSequence {
  order: number;
  items: string[];
  location: 'truck' | 'trailer' | 'van';
  secured: boolean;
  notes?: string;
}

export interface ChecklistItem {
  item: string;
  quantity: number;
  checked: boolean;
  checkedBy?: string;
  checkedAt?: Date;
  notes?: string;
}

export interface Route {
  origin: Address;
  destination: Address;
  stops?: RouteStop[];
  distance: number;
  estimatedDuration: number;
  trafficConditions?: string;
  alternativeRoutes?: AlternativeRoute[];
  restrictions?: string[];
}

export interface RouteStop {
  address: Address;
  purpose: string;
  duration: number;
  contactPerson?: ContactPerson;
  completed?: boolean;
}

export interface AlternativeRoute {
  name: string;
  distance: number;
  duration: number;
  notes?: string;
}

export interface Permit {
  type: string;
  number: string;
  issuingAuthority: string;
  validFrom: Date;
  validTo: Date;
  cost: number;
  documents?: string[];
  restrictions?: string[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface Insurance {
  type: 'liability' | 'equipment' | 'vehicle' | 'event_cancellation';
  provider: string;
  policyNumber: string;
  coverage: number;
  deductible?: number;
  validFrom: Date;
  validTo: Date;
  documents?: string[];
  claims?: InsuranceClaim[];
}

export interface InsuranceClaim {
  claimNumber: string;
  date: Date;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  documents?: string[];
}

export interface ContingencyPlan {
  weatherBackup?: {
    condition: string;
    plan: string;
    additionalCost?: number;
  };
  staffBackup?: {
    backupStaff: StaffAssignment[];
    contactList: ContactPerson[];
  };
  equipmentBackup?: {
    alternativeSuppliers: EquipmentSupplier[];
    emergencyEquipment: EventEquipment[];
  };
  venueBackup?: {
    alternativeVenue?: EventVenue;
    indoorOption?: string;
  };
}

// ============================================================================
// BUDGET & FINANCIALS
// ============================================================================

export interface EventBudget {
  currency: string;
  estimated: BudgetBreakdown;
  actual?: BudgetBreakdown;
  revenue: RevenueItem[];
  profitMargin?: number;
  paymentTerms: PaymentTerms;
  invoices: Invoice[];
  payments: Payment[];
  adjustments?: BudgetAdjustment[];
}

export interface BudgetBreakdown {
  food: number;
  beverage: number;
  staff: number;
  equipment: number;
  transportation: number;
  venue: number;
  permits: number;
  insurance: number;
  marketing?: number;
  contingency: number;
  other?: BudgetItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface BudgetItem {
  category: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  notes?: string;
}

export interface RevenueItem {
  type: 'ticket_sales' | 'catering_fee' | 'service_charge' | 'sponsorship' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  receivedAmount?: number;
  dueDate?: Date;
}

export interface PaymentTerms {
  depositPercent: number;
  depositDueDate: Date;
  finalPaymentDueDate: Date;
  cancellationPolicy: string;
  refundPolicy: string;
  lateFeePercent?: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paidAmount?: number;
  paidDate?: Date;
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
}

export interface Payment {
  id: string;
  invoiceId?: string;
  amount: number;
  method: 'cash' | 'check' | 'card' | 'transfer' | 'other';
  reference?: string;
  date: Date;
  processedBy: string;
  notes?: string;
}

export interface BudgetAdjustment {
  id: string;
  date: Date;
  category: string;
  reason: string;
  originalAmount: number;
  newAmount: number;
  approvedBy: string;
  notes?: string;
}

// ============================================================================
// DOCUMENTS & COMMUNICATION
// ============================================================================

export interface EventDocument {
  id: string;
  type: DocumentType;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  version?: number;
  tags?: string[];
  permissions?: DocumentPermission[];
}

export enum DocumentType {
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  PERMIT = 'permit',
  INSURANCE = 'insurance',
  MENU = 'menu',
  FLOOR_PLAN = 'floor_plan',
  CHECKLIST = 'checklist',
  PHOTO = 'photo',
  REPORT = 'report',
  OTHER = 'other'
}

export interface DocumentPermission {
  role: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
}

export interface EventTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  assignedTo?: string;
  dueDate: Date;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies?: string[];
  subtasks?: EventTask[];
  attachments?: string[];
  comments?: TaskComment[];
  completedAt?: Date;
  completedBy?: string;
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface TaskComment {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
  editedAt?: Date;
  attachments?: string[];
}

export interface EventNote {
  id: string;
  author: string;
  category: string;
  content: string;
  important: boolean;
  visibility: 'private' | 'team' | 'client';
  createdAt: Date;
  updatedAt?: Date;
  attachments?: string[];
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

export interface EventAnalytics {
  revenue: {
    projected: number;
    actual: number;
    perGuest: number;
    perStaffHour: number;
  };
  costs: {
    projected: number;
    actual: number;
    breakdown: Record<string, number>;
  };
  profitability: {
    amount: number;
    margin: number;
    roi: number;
  };
  performance: {
    guestSatisfaction?: number;
    staffEfficiency?: number;
    timelineAdherence?: number;
    qualityScore?: number;
  };
  comparisons?: {
    similarEvents: EventComparison[];
    budgetVariance: number;
    guestCountVariance: number;
  };
}

export interface EventComparison {
  eventId: string;
  eventName: string;
  similarity: number; // 0-100
  metrics: {
    revenue: number;
    costs: number;
    guests: number;
    satisfaction?: number;
  };
}

// ============================================================================
// NOTIFICATIONS & REMINDERS
// ============================================================================

export interface EventNotification {
  id: string;
  eventId: string;
  type: NotificationType;
  recipient: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  subject: string;
  message: string;
  scheduledFor: Date;
  sentAt?: Date;
  readAt?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  error?: string;
}

export enum NotificationType {
  REMINDER = 'reminder',
  UPDATE = 'update',
  ALERT = 'alert',
  CONFIRMATION = 'confirmation',
  TASK_DUE = 'task_due',
  PAYMENT_DUE = 'payment_due',
  WEATHER_ALERT = 'weather_alert'
}

// ============================================================================
// FEEDBACK & EVALUATION
// ============================================================================

export interface EventFeedback {
  id: string;
  eventId: string;
  respondent: {
    type: 'client' | 'guest' | 'staff' | 'vendor';
    name: string;
    email?: string;
  };
  ratings: {
    overall: number;
    food?: number;
    service?: number;
    venue?: number;
    organization?: number;
    valueForMoney?: number;
  };
  feedback: {
    highlights?: string[];
    improvements?: string[];
    comments?: string;
    wouldRecommend?: boolean;
    wouldRebook?: boolean;
  };
  submittedAt: Date;
}

// ============================================================================
// EXPORT/IMPORT INTERFACES
// ============================================================================

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  type: EventType;
  category?: string;
  settings: Partial<Event>;
  items: {
    menu?: EventMenu;
    equipment?: EventEquipment[];
    staffRequirements?: StaffRequirement[];
    timeline?: TimelineItem[];
    documents?: string[];
  };
  tags?: string[];
  popularity?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventExportData {
  event: Event;
  relatedData: {
    products?: any[];
    customers?: any[];
    invoices?: Invoice[];
    feedback?: EventFeedback[];
  };
  exportedBy: string;
  exportedAt: Date;
  version: string;
}