import type { ExtractReceiptDataOutput } from "@/ai/flows/extract-receipt-data";
// import type { SplitwiseGroup, SplitwiseUser, CreateExpense } from "@/services/splitwise";
export type { ExtractReceiptDataOutput }
// export type { ExtractReceiptDataOutput, SplitwiseGroup, SplitwiseUser, CreateExpense };

// From AI Flow
// Removed ExtractedItem interface - this structure is part of ExtractReceiptDataOutput.items
// export interface ExtractedItem {
//   name: string;
//   price: number;
// }

// Removed ExtractReceiptDataOutput interface - it's imported and re-exported above
// export interface ExtractReceiptDataOutput {
//   storeName: string;
//   date: string;
//   items: ExtractedItem[];
//   totalCost: number;
//   taxes?: number;
//   otherCharges?: number;
//   discount?: number;
//   discrepancyFlag: boolean;
//   discrepancyMessage?: string;
// }

export interface SplitwiseGroup {
  id: string;
  name: string;
  // Add other relevant group properties if needed
}

export interface SplitwiseUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
  picture?: {
    small: string;
    medium: string;
    large: string;
  };
   _groupDetails?: { id: string; name: string };
}

export interface ItemSplit {
  itemId: string;
  sharedBy: string[];
}

export interface FinalSplit {
  userId: string;
  amountOwed: number;
}

export interface CreateExpenseProxyPayload {
  cost: number;
  description: string;
  group_id: number;
  date?: string;
  details?: string;
  payment?: boolean;
  category_id?: number;
  users: Array<{
    user_id: number;
    paid_share: number;
    owed_share: number;
  }>;
  split_equally?: boolean;
}
