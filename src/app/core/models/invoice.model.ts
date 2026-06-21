export interface InvoicePreview {
  payerEmail: string | null;
  payerName: string;
  guardianId: number | null;
  students: StudentFeeGroup[];
  grandTotal: number;
}

export interface StudentFeeGroup {
  studentId: number;
  studentName: string;
  fees: FeePreviewItem[];
  subtotal: number;
}

export interface FeePreviewItem {
  feeId: number;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  period: string;
  guardianId: number;
  payerName: string;
  sentTo: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'VOID';
  sentAt?: string;
  lineItems: InvoiceLineItem[];
  createdAt: string;
}

export interface InvoiceLineItem {
  id: number;
  feeRecordId: number;
  description: string;
  amount: number;
}
