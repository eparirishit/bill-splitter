export type { ExtractReceiptDataOutput } from "@/ai/types";

// Service exports
export { ExpenseCalculationService } from "@/services/expense-calculations";
export { ExpensePayloadService } from "@/services/expense-payload";
export { ExpenseValidationService } from "@/services/expense-validation";
export { FileProcessingService } from "@/services/file-processing";
export { SplitwiseService } from "@/services/splitwise";

// Splitwise API types
export interface SplitwiseGroup {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  members: SplitwiseUser[];
  simplify_by_default: boolean;
  original_debts: any[];
  simplified_debts: any[];
  whiteboard: string | null;
  group_type: string;
  invite_link: string;
  group_reminders: boolean;
}

export interface SplitwiseUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  registration_status: string;
  picture: {
    medium: string;
    large: string;
  };
  _groupDetails?: {
    id: string;
    name: string;
  };
}

export interface SplitwiseFriend {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  registration_status: string;
  picture: {
    medium: string;
    large: string;
  };
  balance: Array<{
    currency_code: string;
    amount: string;
  }>;
}

export type SelectionType = 'group' | 'friends';

// Bill/Receipt Types
export interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
}

// Split Types
export interface ItemSplit {
  itemId: string;
  sharedBy: string[];
  splitType: 'equal' | 'custom';
  customAmounts?: Record<string, number>;
}

export interface FinalSplit {
  userId: string;
  amountOwed: number;
}

// Splitwise Expense Creation
export interface CreateExpenseUser {
  user_id: number;
  paid_share: string;
  owed_share: string;
}

export interface CreateExpense {
  cost: string;
  description: string;
  details?: string;
  currency_code?: string;
  category_id?: number;
  date?: string;
  group_id?: number; // Optional for friend expenses (0 or omitted)
  split_equally?: boolean;
  // Dynamic user fields - will be populated based on actual users
  [key: `users__${number}__user_id`]: number;
  [key: `users__${number}__paid_share`]: string;
  [key: `users__${number}__owed_share`]: string;
}

// Manual Expense Types
export interface ManualExpense {
  title: string;
  amount: number;
  date: string;
  splitType: 'equal' | 'custom';
  customAmounts?: Record<string, number>;
}

export interface ManualExpenseData {
  title: string;
  amount: number;
  date: string;
  groupId: string;
  members: SplitwiseUser[];
  splitType: 'equal' | 'custom';
  customAmounts?: Record<string, number>;
  notes?: string;
}

// ==========================================
// New Design Types (BillSplitter AI)
// ==========================================

export enum AppFlow {
  SCAN = 'SCAN',
  MANUAL = 'MANUAL',
  NONE = 'NONE'
}

export enum Step {
  AUTH = -1,
  FLOW_SELECTION = 0,
  UPLOAD = 1,
  GROUP_SELECTION = 2,
  ITEM_SPLITTING = 3,
  REVIEW = 4,
  SUCCESS = 5
}

// Re-using SplitwiseUser where possible, but mapping to this for UI
export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
}

export interface Group {
  id: string;
  name: string;
  members: User[];
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  splitType: 'equally' | 'custom' | 'quantity';
  splitMemberIds: string[];
  quantityAssignments?: Record<string, number>; // Maps userId to number of units
}

export interface BillData {
  id: string;
  storeName: string;
  date: string;
  items: BillItem[];
  tax: number;
  discount: number;
  otherCharges: number;
  total: number;
  currency: string;
  notes: string;
  payerId: string;
  groupId: string | null;
  selectedMemberIds: string[];
  source: AppFlow;
}

export interface ExtractedBill {
  storeName: string;
  date: string;
  items: { name: string; price: number; quantity?: number }[];
  tax: number;
  total: number;
}

