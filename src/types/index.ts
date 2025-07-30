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
  group_id?: number;
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
