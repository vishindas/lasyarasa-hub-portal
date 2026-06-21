import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { Fee } from '../../../core/models/fee.model';
import { FeeTier } from '../../../core/models/settings.model';
import { FeeFormDialog, FeeDialogData } from './fee-form-dialog';
import { GenerateFeesDialog } from './generate-fees-dialog';

interface MonthGroup {
  _type: 'monthHeader';
  key: string;
  label: string;
  count: number;
  total: number;
  paid: number;
  overdue: number;
}

@Component({
  selector: 'app-fee-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TitleCasePipe, MatTableModule, MatButtonModule, MatIconModule,
            MatDialogModule, MatMenuModule, MatFormFieldModule, MatInputModule,
            MatButtonToggleModule, MatCardModule, MatSnackBarModule, DragDropModule],
  templateUrl: './fee-list.html'
})
export class FeeListComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  fees = signal<Fee[]>([]);
  feeTiers = signal<FeeTier[]>([]);

  filterText = signal('');
  statusFilter = signal('');
  sortCol = signal<string | null>(null);
  sortDir = signal<'asc' | 'desc'>('asc');
  viewMode = signal<'flat' | 'monthly'>('flat');

  private readonly thisMonthKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  expandedMonths = signal<Set<string>>(new Set([this.thisMonthKey]));

  readonly statusOptions = ['PENDING', 'PAID', 'OVERDUE', 'COMPLETED'];

  // Monthly grouping only active when no filters are applied
  isMonthlyActive = computed(() =>
    this.viewMode() === 'monthly' && !this.filterText() && !this.statusFilter()
  );

  filtersActive = computed(() => !!this.filterText() || !!this.statusFilter());

  private colDef: Record<string, { label: string; width: string }> = {
    student: { label: 'Student',  width: '14%' },
    feeTier: { label: 'Fee Tier', width: '19%' },
    amount:  { label: 'Amount',   width: '9%'  },
    dueDate: { label: 'Due Date', width: '12%' },
    paidAt:  { label: 'Paid On',  width: '12%' },
    status:  { label: 'Status',   width: '11%' },
    paidBy:  { label: 'Paid By',  width: '10%' },
  };

  displayedColumns = signal(['student', 'feeTier', 'amount', 'dueDate', 'paidAt', 'status', 'paidBy', 'actions']);

  draggableColumns = computed(() =>
    this.displayedColumns()
      .filter(c => c !== 'actions')
      .map(c => ({
        key: c,
        label: this.colDef[c]?.label ?? c,
        width: this.colDef[c]?.width ?? 'auto',
        sorted: this.sortCol() === c ? this.sortDir() : null
      }))
  );

  viewFees = computed(() => {
    const q = this.filterText().toLowerCase().trim();
    const st = this.statusFilter();
    const col = this.sortCol();
    const dir = this.sortDir();

    let rows = this.fees();

    if (q) {
      rows = rows.filter(f =>
        (f.studentName ?? '').toLowerCase().includes(q) ||
        (f.feeTierLabel ?? '').toLowerCase().includes(q) ||
        (f.status ?? '').toLowerCase().includes(q) ||
        (f.paidBy ?? '').toLowerCase().includes(q)
      );
    }

    if (st) {
      rows = rows.filter(f => f.status === st);
    }

    if (col) {
      rows = [...rows].sort((a, b) => {
        let va: any, vb: any;
        switch (col) {
          case 'student':  va = a.studentName ?? '';   vb = b.studentName ?? '';   break;
          case 'feeTier':  va = a.feeTierLabel ?? '';  vb = b.feeTierLabel ?? '';  break;
          case 'amount':   va = a.amount ?? 0;          vb = b.amount ?? 0;          break;
          case 'dueDate':  va = a.dueDate ?? '';        vb = b.dueDate ?? '';        break;
          case 'paidAt':   va = a.paidAt ?? '';         vb = b.paidAt ?? '';         break;
          case 'status':   va = a.status ?? '';         vb = b.status ?? '';         break;
          case 'paidBy':   va = a.paidBy ?? '';         vb = b.paidBy ?? '';         break;
          default:         va = '';                      vb = '';
        }
        const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return dir === 'asc' ? cmp : -cmp;
      });
    }

    return rows;
  });

  // Interleaves month-header sentinel objects with fee rows for the monthly table view
  monthlyTableRows = computed((): Array<Fee | MonthGroup> => {
    const expanded = this.expandedMonths();
    const groups = new Map<string, Fee[]>();

    for (const fee of this.viewFees()) {
      const key = (fee.dueDate ?? '').slice(0, 7) || 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(fee);
    }

    const sorted = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    const rows: Array<Fee | MonthGroup> = [];

    for (const [key, fees] of sorted) {
      const [y, m] = key.split('-').map(Number);
      const label = isNaN(m)
        ? key
        : new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const total = fees.reduce((s, f) => s + (f.amount ?? 0), 0);
      const paid  = fees.filter(f => f.status === 'PAID').reduce((s, f) => s + (f.amount ?? 0), 0);
      const overdue = fees.filter(f => f.status === 'OVERDUE').length;

      rows.push({ _type: 'monthHeader', key, label, count: fees.length, total, paid, overdue });
      if (expanded.has(key)) rows.push(...fees);
    }

    return rows;
  });

  tableRows = computed((): any[] =>
    this.isMonthlyActive() ? this.monthlyTableRows() : this.viewFees()
  );

  // Row-type predicates for mat-table multi-template rows
  isMonthHeader = (_i: number, row: any) => row?._type === 'monthHeader';
  isFeeRow      = (_i: number, row: any) => row?._type !== 'monthHeader';

  toggleMonth(key: string) {
    this.expandedMonths.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  toggleSort(col: string) {
    if (this.sortCol() === col) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    }
  }

  clearFilters() {
    this.filterText.set('');
    this.statusFilter.set('');
  }

  ngOnInit() {
    this.load();
    this.http.get<FeeTier[]>(`${environment.apiUrl}/school/settings/fee-tiers`)
      .subscribe(d => this.feeTiers.set(d));
  }

  dropColumn(event: CdkDragDrop<string[]>) {
    this.displayedColumns.update(cols => {
      const draggable = cols.filter(c => c !== 'actions');
      moveItemInArray(draggable, event.previousIndex, event.currentIndex);
      return [...draggable, 'actions'];
    });
  }

  load() {
    this.http.get<Fee[]>(`${environment.apiUrl}/school/fees`)
      .subscribe(data => this.fees.set(data));
  }

  openForm(fee?: Fee) {
    const data: FeeDialogData = { fee, feeTiers: this.feeTiers() };
    this.dialog.open(FeeFormDialog, { width: '480px', data })
      .afterClosed().subscribe(saved => {
        if (saved) { this.load(); this.snack.open('Fee saved', 'OK', { duration: 2500 }); }
      });
  }

  openGenerate() {
    this.dialog.open(GenerateFeesDialog, { width: '420px' })
      .afterClosed().subscribe(generated => {
        if (generated) { this.load(); this.snack.open('Fees generated', 'OK', { duration: 2500 }); }
      });
  }

  markPaid(fee: Fee) {
    const data: FeeDialogData = {
      fee: { ...fee, status: 'PAID', paidAt: new Date().toISOString().slice(0, 10) },
      feeTiers: this.feeTiers()
    };
    this.dialog.open(FeeFormDialog, { width: '480px', data })
      .afterClosed().subscribe(saved => {
        if (saved) { this.load(); this.snack.open('Marked as paid', 'OK', { duration: 2500 }); }
      });
  }

  delete(id: number) {
    if (!confirm('Remove this fee record?')) return;
    this.http.delete(`${environment.apiUrl}/school/fees/${id}`)
      .subscribe(() => { this.load(); this.snack.open('Fee removed', 'OK', { duration: 2500 }); });
  }
}
