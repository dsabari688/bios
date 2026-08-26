export interface CreateExpenseInput {
  amount: number;
  category: string;
  description?: string | null;
  transactionDate: string;
  paymentMethod?: string | null;
  isImpulsive?: boolean;
  explanation?: string | null;
}

export interface UpdateExpenseInput {
  amount?: number;
  category?: string;
  description?: string | null;
  transactionDate?: string;
  paymentMethod?: string | null;
  isImpulsive?: boolean;
  explanation?: string | null;
}
