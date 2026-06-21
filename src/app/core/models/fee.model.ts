export type FeeStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface FeeTierItem {
  tierId: number;
  tierLabel: string;
  amount: number;
}

export interface Fee {
  id: number;
  studentId: number;
  studentName?: string;
  feeTierId?: number;
  feeTierLabel?: string;
  feeTiers?: FeeTierItem[];
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: FeeStatus;
  paidBy?: string;
  notes: string;
}
