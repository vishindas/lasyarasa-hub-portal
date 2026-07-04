import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { CurrencyService } from '../../../core/services/currency.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';
import { InvoicePreview, Invoice } from '../../../core/models/invoice.model';
import { ConfirmInvoiceDialog } from './confirm-invoice-dialog';
import { ConfirmAllDialog } from './confirm-all-dialog';
import { EditInvoiceDialog } from './edit-invoice-dialog';
import { VoidInvoiceDialog } from './void-invoice-dialog';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, MatCardModule, MatButtonModule, MatIconModule,
            MatTableModule, MatCheckboxModule, MatSnackBarModule, MatDialogModule,
            MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
            MatButtonToggleModule, MatProgressSpinnerModule],
  templateUrl: './invoice-list.html'
})
export class InvoiceListComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  cs = inject(CurrencyService);

  previews = signal<InvoicePreview[]>([]);
  private allInvoices = signal<Invoice[]>([]);
  invoiceSearch = signal('');
  invoices = computed(() => {
    const q = this.invoiceSearch().toLowerCase().trim();
    if (!q) return this.allInvoices();
    return this.allInvoices().filter(i =>
      i.invoiceNumber?.toLowerCase().includes(q) ||
      i.payerName?.toLowerCase().includes(q) ||
      i.sentTo?.toLowerCase().includes(q) ||
      i.period?.toLowerCase().includes(q) ||
      i.status?.toLowerCase().includes(q)
    );
  });
  tab = signal<'ready' | 'select' | 'history'>('ready');
  loading = signal(false);

  readyCount = computed(() => this.previews().length);
  invoiceable = computed(() => this.previews().filter(p => p.guardianId !== null));
  grandTotal = computed(() => this.invoiceable().reduce((sum, p) => sum + p.grandTotal, 0));
  studentCount = computed(() => this.invoiceable().reduce((sum, p) => sum + p.students.length, 0));
  draftCount = computed(() => this.invoices().filter(i => i.status === 'DRAFT' && !!i.sentTo).length);

  // Selection state — keyed by guardianId
  selected = signal<Set<number>>(new Set());
  selectedPreviews = computed(() =>
    this.invoiceable().filter(p => this.selected().has(p.guardianId!))
  );
  selectedTotal = computed(() =>
    this.selectedPreviews().reduce((sum, p) => sum + p.grandTotal, 0)
  );
  allSelected = computed(() =>
    this.invoiceable().length > 0 && this.selected().size === this.invoiceable().length
  );
  someSelected = computed(() =>
    this.selected().size > 0 && !this.allSelected()
  );

  invoiceColumns = ['invoiceNumber', 'payerName', 'sentTo', 'period',
                    'totalAmount', 'amountPaid', 'status', 'issueDate', 'actions'];
  selectColumns = ['select', 'payerName', 'payerEmail', 'students', 'grandTotal'];

  sendingIds = signal<Set<number>>(new Set());

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.selected.set(new Set());
    this.http.get<InvoicePreview[]>(`${environment.apiUrl}/school/invoices/preview`)
      .subscribe(d => { this.previews.set(d); this.loading.set(false); });
    this.http.get<Invoice[]>(`${environment.apiUrl}/school/invoices`)
      .subscribe(d => this.allInvoices.set(d));
  }

  toggleRow(preview: InvoicePreview) {
    this.selected.update(s => {
      const next = new Set(s);
      if (next.has(preview.guardianId!)) next.delete(preview.guardianId!);
      else next.add(preview.guardianId!);
      return next;
    });
  }

  toggleAll() {
    if (this.allSelected()) {
      this.selected.set(new Set());
    } else {
      this.selected.set(new Set(this.invoiceable().map(p => p.guardianId!)));
    }
  }

  isSelected(preview: InvoicePreview) {
    return this.selected().has(preview.guardianId!);
  }

  generate(preview: InvoicePreview) {
    const allFeeIds = preview.students.flatMap(s => s.fees.map(f => f.feeId));
    this.dialog.open(ConfirmInvoiceDialog, {
      width: '520px',
      data: { preview, feeIds: allFeeIds }
    }).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.http.post<Invoice>(`${environment.apiUrl}/school/invoices/generate`, {
          guardianId: preview.guardianId,
          feeIds: allFeeIds,
          dueDate: confirmed.dueDate
        }).subscribe({
          next: () => {
            this.snack.open(`Invoice generated for ${preview.payerName}`, 'OK', { duration: 3000 });
            this.loadAll();
          },
          error: () => this.snack.open('Failed to generate invoice', 'OK', { duration: 3000 })
        });
      }
    });
  }

  generateAll() {
    this.dialog.open(ConfirmAllDialog, {
      width: '500px',
      data: { previews: this.invoiceable(), grandTotal: this.grandTotal(), studentCount: this.studentCount() }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.loading.set(true);
      this.http.post<Invoice[]>(`${environment.apiUrl}/school/invoices/generate-all`, {
        dueDate: confirmed.dueDate, guardianIds: null
      }).subscribe({
        next: (result) => {
          if (confirmed.sendImmediately && result.length > 0) {
            const ids = result.map(i => i.id);
            this.http.post<Invoice[]>(`${environment.apiUrl}/school/invoices/send-all`, { invoiceIds: ids })
              .subscribe({
                next: (sent) => {
                  this.snack.open(`Generated ${result.length} · Sent ${sent.length} invoice${sent.length !== 1 ? 's' : ''}`, 'OK', { duration: 4000 });
                  this.loadAll();
                },
                error: () => { this.snack.open(`Generated ${result.length} but email sending failed`, 'OK', { duration: 4000 }); this.loadAll(); }
              });
          } else {
            this.snack.open(`Generated ${result.length} invoice${result.length !== 1 ? 's' : ''}`, 'OK', { duration: 4000 });
            this.loadAll();
          }
        },
        error: () => { this.loading.set(false); this.snack.open('Failed to generate invoices', 'OK', { duration: 3000 }); }
      });
    });
  }

  generateSelected() {
    const sel = this.selectedPreviews();
    const total = this.selectedTotal();
    const students = sel.reduce((sum, p) => sum + p.students.length, 0);
    this.dialog.open(ConfirmAllDialog, {
      width: '500px',
      data: { previews: sel, grandTotal: total, studentCount: students }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.loading.set(true);
      this.http.post<Invoice[]>(`${environment.apiUrl}/school/invoices/generate-all`, {
        dueDate: confirmed.dueDate, guardianIds: sel.map(p => p.guardianId)
      }).subscribe({
        next: (result) => {
          if (confirmed.sendImmediately && result.length > 0) {
            const ids = result.map(i => i.id);
            this.http.post<Invoice[]>(`${environment.apiUrl}/school/invoices/send-all`, { invoiceIds: ids })
              .subscribe({
                next: (sent) => {
                  this.snack.open(`Generated ${result.length} · Sent ${sent.length} invoice${sent.length !== 1 ? 's' : ''}`, 'OK', { duration: 4000 });
                  this.loadAll();
                },
                error: () => { this.snack.open(`Generated ${result.length} but email sending failed`, 'OK', { duration: 4000 }); this.loadAll(); }
              });
          } else {
            this.snack.open(`Generated ${result.length} invoice${result.length !== 1 ? 's' : ''}`, 'OK', { duration: 4000 });
            this.loadAll();
          }
        },
        error: () => { this.loading.set(false); this.snack.open('Failed to generate invoices', 'OK', { duration: 3000 }); }
      });
    });
  }

  sendAllDrafts() {
    const count = this.draftCount();
    if (!confirm(`Send all ${count} draft invoice${count !== 1 ? 's' : ''} now?`)) return;
    this.http.post<Invoice[]>(`${environment.apiUrl}/school/invoices/send-all`, { invoiceIds: null })
      .subscribe({
        next: (sent) => {
          this.snack.open(`Sent ${sent.length} invoice${sent.length !== 1 ? 's' : ''}`, 'OK', { duration: 4000 });
          this.loadAll();
        },
        error: () => this.snack.open('Failed to send invoices', 'OK', { duration: 3000 })
      });
  }

  studentNames(preview: InvoicePreview) {
    return preview.students.map(s => s.studentName).join(', ');
  }

  canDelete(inv: Invoice)  { return inv.status === 'DRAFT'; }
  canVoid(inv: Invoice)    { return ['SENT', 'OVERDUE', 'PAID', 'PARTIAL'].includes(inv.status); }
  canSend(inv: Invoice)    { return inv.status === 'DRAFT' && !!inv.sentTo; }
  canRemind(inv: Invoice)  { return ['SENT', 'OVERDUE', 'PARTIAL'].includes(inv.status) && !!inv.sentTo; }

  sendInvoice(inv: Invoice) {
    if (this.sendingIds().has(inv.id)) return;
    this.sendingIds.update(s => new Set(s).add(inv.id));
    this.http.post<Invoice>(`${environment.apiUrl}/school/invoices/${inv.id}/send`, {})
      .subscribe({
        next: () => {
          this.sendingIds.update(s => { const n = new Set(s); n.delete(inv.id); return n; });
          this.snack.open(`Invoice sent to ${inv.sentTo}`, 'OK', { duration: 3000 });
          this.loadAll();
        },
        error: () => {
          this.sendingIds.update(s => { const n = new Set(s); n.delete(inv.id); return n; });
          this.snack.open('Failed to send invoice', 'OK', { duration: 3000 });
        }
      });
  }

  sendReminder(inv: Invoice) {
    this.http.post<Invoice>(`${environment.apiUrl}/school/invoices/${inv.id}/remind`, {})
      .subscribe({
        next: () => {
          this.snack.open(`Reminder sent to ${inv.sentTo}`, 'OK', { duration: 3000 });
        },
        error: () => this.snack.open('Failed to send reminder', 'OK', { duration: 3000 })
      });
  }

  viewInvoice(inv: Invoice) {
    this.router.navigate(['/vidya-rasa/invoices', inv.id]);
  }

  voidInvoice(inv: Invoice) {
    this.dialog.open(VoidInvoiceDialog, { width: '520px', data: inv })
      .afterClosed().subscribe(result => {
        if (!result) return;
        this.http.post(`${environment.apiUrl}/school/invoices/${inv.id}/void`, { reason: result.reason })
          .subscribe({
            next: () => {
              this.snack.open('Invoice voided', 'OK', { duration: 3000 });
              this.loadAll();
            },
            error: () => this.snack.open('Failed to void invoice', 'OK', { duration: 3000 })
          });
      });
  }

  deleteInvoice(inv: Invoice) {
    if (!confirm(`Delete invoice ${inv.invoiceNumber}? This cannot be undone.`)) return;
    this.http.delete(`${environment.apiUrl}/school/invoices/${inv.id}`)
      .subscribe({
        next: () => {
          this.snack.open('Invoice deleted', 'OK', { duration: 3000 });
          this.loadAll();
        },
        error: () => this.snack.open('Failed to delete invoice', 'OK', { duration: 3000 })
      });
  }

  editInvoice(inv: Invoice) {
    this.dialog.open(EditInvoiceDialog, {
      width: '520px',
      data: inv
    }).afterClosed().subscribe(changes => {
      if (!changes) return;
      this.http.put<Invoice>(`${environment.apiUrl}/school/invoices/${inv.id}`, changes)
        .subscribe({
          next: () => {
            this.snack.open('Invoice updated', 'OK', { duration: 3000 });
            this.loadAll();
          },
          error: () => this.snack.open('Failed to update invoice', 'OK', { duration: 3000 })
        });
    });
  }

  statusClass(status: string) {
    return 'status-' + status.toLowerCase();
  }
}
