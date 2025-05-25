// Re-export AI flow types
export type { ExtractReceiptDataOutput } from "@/ai/extract-receipt-data";

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

export interface ExtractReceiptDataOutput {
  storeName: string;
  date: string;
  items: ReceiptItem[];
  taxes?: number;
  otherCharges?: number;
  discount?: number;
  totalCost: number;
  discrepancyFlag?: boolean;
  discrepancyMessage?: string;
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
  paid_share: number;
  owed_share: number;
}

export interface CreateExpense {
  cost: number;
  description: string;
  details?: string;
  payment: boolean;
  category_id?: number;
  date: string;
  group_id: number;
  users: CreateExpenseUser[];
  split_equally: boolean;
}

// Legacy type alias for backward compatibility
export type CreateExpenseProxyPayload = CreateExpense;
