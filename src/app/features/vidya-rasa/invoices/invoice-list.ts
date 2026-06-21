import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
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

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatCardModule, MatButtonModule, MatIconModule,
            MatTableModule, MatCheckboxModule, MatSnackBarModule, MatDialogModule,
            MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
            MatButtonToggleModule, MatProgressSpinnerModule],
  templateUrl: './invoice-list.html'
})
export class InvoiceListComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  previews = signal<InvoicePreview[]>([]);
  invoices = signal<Invoice[]>([]);
  tab = signal<'ready' | 'select' | 'history'>('ready');
  loading = signal(false);

  readyCount = computed(() => this.previews().length);
  invoiceable = computed(() => this.previews().filter(p => p.guardianId !== null));
  grandTotal = computed(() => this.invoiceable().reduce((sum, p) => sum + p.grandTotal, 0));
  studentCount = computed(() => this.invoiceable().reduce((sum, p) => sum + p.students.length, 0));

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
                    'totalAmount', 'amountPaid', 'status', 'issueDate'];
  selectColumns = ['select', 'payerName', 'payerEmail', 'students', 'grandTotal'];

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.selected.set(new Set());
    this.http.get<InvoicePreview[]>(`${environment.apiUrl}/school/invoices/preview`)
      .subscribe(d => { this.previews.set(d); this.loading.set(false); });
    this.http.get<Invoice[]>(`${environment.apiUrl}/school/invoices`)
      .subscribe(d => this.invoices.set(d));
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
      width: '480px',
      data: {
        previews: this.invoiceable(),
        grandTotal: this.grandTotal(),
        studentCount: this.studentCount()
      }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.loading.set(true);
      this.http.post<unknown[]>(`${environment.apiUrl}/school/invoices/generate-all`, {
        dueDate: confirmed.dueDate,
        guardianIds: null
      }).subscribe({
        next: (result) => {
          this.snack.open(`Generated ${result.length} invoice${result.length !== 1 ? 's' : ''}`, 'OK', { duration: 4000 });
          this.loadAll();
        },
        error: () => {
          this.loading.set(false);
          this.snack.open('Failed to generate invoices', 'OK', { duration: 3000 });
        }
      });
    });
  }

  generateSelected() {
    const sel = this.selectedPreviews();
    const total = this.selectedTotal();
    const students = sel.reduce((sum, p) => sum + p.students.length, 0);
    this.dialog.open(ConfirmAllDialog, {
      width: '480px',
      data: { previews: sel, grandTotal: total, studentCount: students }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.loading.set(true);
      this.http.post<unknown[]>(`${environment.apiUrl}/school/invoices/generate-all`, {
        dueDate: confirmed.dueDate,
        guardianIds: sel.map(p => p.guardianId)
      }).subscribe({
        next: (result) => {
          this.snack.open(`Generated ${result.length} invoice${result.length !== 1 ? 's' : ''}`, 'OK', { duration: 4000 });
          this.loadAll();
        },
        error: () => {
          this.loading.set(false);
          this.snack.open('Failed to generate invoices', 'OK', { duration: 3000 });
        }
      });
    });
  }

  studentNames(preview: InvoicePreview) {
    return preview.students.map(s => s.studentName).join(', ');
  }

  statusClass(status: string) {
    return 'status-' + status.toLowerCase();
  }
}
