// D3: CLIENT-safe fee model. Deliberately independent of fee.model.ts (the
// staff-facing Fee shape, which carries notes/paidBy/guardianNames/internal
// tier ids) -- matches the backend's own separate StudentFeeDTO, never
// reusing SchoolFeeDTO.

export type StudentFeeStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'WAIVED' | 'VOID' | 'OVERDUE';

export interface StudentFeeDTO {
  feeId: number;
  /** Present only when this fee is tied to one of the student's own classes. */
  classId?: number;
  className?: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  status: StudentFeeStatus;
  /**
   * Absent whenever `outstandingAmountUnknown` is true (status PARTIAL) --
   * the system cannot determine a partial fee's remaining balance from the
   * current data model. Never treat a missing value here as zero.
   */
  outstandingAmount?: number;
  outstandingAmountUnknown: boolean;
  /** Present only once a payment has actually been recorded against this fee. */
  paidAt?: string;
  /** Receipt identifier, present only when this fee is genuinely linked to an invoice. */
  invoiceNumber?: string;
  invoiceIssueDate?: string;
}
