
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  farmName: string;
  farmLocation: string;
  userType: 'farmer' | 'client';
  rating?: number;
  isPremium: boolean;
  profileImage?: string;
}

export interface Lot {
  id: string;
  name: string;
  birdType: 'broilers' | 'layers' | 'breeders';
  breed: string;
  quantity: number;
  initial_quantity?: number;
  age: number;
  entryDate: string;
  dateCreated: string;
  status: 'active' | 'completed' | 'sold' | 'archived';
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  feedConsumption: number;
  mortality: number;
  sickCount?: number;
  quarantinedCount?: number;
  poids_moyen?: number;
  averageWeight: number;
  sellingPrice: number;
  stage: 'starter' | 'grower' | 'finisher' | 'layer' | 'breeder';
  treatmentsDone: Treatment[];
  treatmentsPending: Treatment[];
  breedImage?: string;
  targetSaleDate?: string;
  targetWeight?: number;
  user_id?: string;
}

export interface Treatment {
  id: string;
  name: string;
  type: 'vaccination' | 'medication' | 'supplement';
  date: string;
  notes?: string;
  completed: boolean;
}

export interface HealthRecord {
  id: string;
  lotId: string;
  date: string;
  temperature: number;
  humidity: number;
  mortality: number;
  symptoms: string[];
  treatment: string;
  veterinarianNotes: string;
  dangerLevel: 'low' | 'medium' | 'high' | 'critical';
  quarantineCount?: number;
  sickCount?: number;
}

export interface SanitaryAction {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastCompleted?: string;
  next_due_date: string;
  completed: boolean;
  automatic: boolean;
}

export interface VaccinationSchedule {
  id: string;
  breed: string;
  vaccineName: string;
  ageInDays: number;
  description: string;
  mandatory: boolean;
}

export interface AIHealthAnalysis {
  id: string;
  lotId: string;
  date: string;
  images: string[];
  symptoms: string[];
  diagnosis: string;
  confidence: number;
  recommendedProducts: MarketplaceProduct[];
  treatmentPlan: string;
}

export interface FeedRecord {
  id: string;
  lotId: string;
  date: string;
  feedType: string;
  quantity: number;
  cost: number;
}

export interface FeedingSimulation {
  id: string;
  breed: string;
  stage: string;
  ageInDays: number;
  illustrationImage: string;
  recommendedRation: FeedRation;
  dailyConsumption: number;
}

export interface FeedRation {
  id: string;
  name: string;
  breed: string;
  stage: string;
  ingredients: RationIngredient[];
  nutritionalValue: NutritionalInfo;
}

export interface RationIngredient {
  name: string;
  percentage: number;
  quantity: number;
}

export interface NutritionalInfo {
  protein: number;
  energy: number;
  fiber: number;
  calcium: number;
  phosphorus: number;
}

export interface FinancialRecord {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  record_date: string; // Renommé pour correspondre à la DB
  description: string;
  lotId?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
  isRentable: boolean;
  monthlyBreakdown: MonthlyFinancial[];
}

export interface MonthlyFinancial {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  lotId?: string;
  category: 'feeding' | 'health' | 'cleaning' | 'maintenance' | 'other';
}

export interface StockItem {
  id: string;
  name: string;
  category: 'feed' | 'medicine' | 'equipment' | 'other';
  quantity: number;
  unit: string;
  minThreshold: number;
  cost: number;
  supplier: string;
  expiryDate?: string;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'feed' | 'medicine' | 'equipment' | 'birds' | 'other';
  seller: string;
  rating: number;
  image: string;
  inStock: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  date: string;
  read: boolean;
}
