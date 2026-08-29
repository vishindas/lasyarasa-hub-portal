// TEST/DEV-ONLY. See dev-fixtures/README.md. D3: exercises every fee status
// (PENDING/OVERDUE/PAID/PARTIAL/WAIVED/VOID), with and without class
// context, with and without a linked receipt, plus one student with zero
// fees for the empty state.

import { StudentFeeDTO } from '../core/models/student-fee.model';

export const FIXTURE_STUDENT_FEES: Record<number, StudentFeeDTO[]> = {
  // Arjun Rao (201): the full spread of states, across both of his classes
  // plus one fee with no class link at all.
  201: [
    { feeId: 5001, classId: 301, className: 'Saturday Beginners', amount: 2500, currency: 'INR', dueDate: '2026-09-01', status: 'PENDING', outstandingAmount: 2500, outstandingAmountUnknown: false },
    { feeId: 5002, classId: 302, className: 'Weekday Technique Intensive', amount: 3000, currency: 'INR', dueDate: '2026-08-01', status: 'OVERDUE', outstandingAmount: 3000, outstandingAmountUnknown: false },
    { feeId: 5003, classId: 301, className: 'Saturday Beginners', amount: 2500, currency: 'INR', dueDate: '2026-07-01', status: 'PAID', outstandingAmount: 0, outstandingAmountUnknown: false, paidAt: '2026-07-03', invoiceNumber: 'INV-2026-0031', invoiceIssueDate: '2026-07-03' },
    { feeId: 5004, amount: 1800, currency: 'INR', dueDate: '2026-06-01', status: 'PARTIAL', outstandingAmountUnknown: true },
  ],
  // Meera Rao (202): no fees on record -- exercises the empty state.
  202: [],
  // Zero Classes Student (203): a waived and a voided fee, neither tied to
  // any class and neither ever appearing in Payment History (no paidAt, no
  // invoice for either).
  203: [
    { feeId: 5005, amount: 500, currency: 'INR', dueDate: '2026-05-01', status: 'WAIVED', outstandingAmount: 0, outstandingAmountUnknown: false },
    { feeId: 5006, amount: 500, currency: 'INR', dueDate: '2026-04-01', status: 'VOID', outstandingAmount: 0, outstandingAmountUnknown: false },
  ],
};
