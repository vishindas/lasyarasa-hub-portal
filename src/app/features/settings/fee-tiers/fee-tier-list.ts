import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { FeeTier } from '../../../core/models/settings.model';
import { FeeTierDialog } from './fee-tier-dialog';

@Component({
  selector: 'app-fee-tier-list',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule, MatCardModule, MatSnackBarModule],
  templateUrl: './fee-tier-list.html'
})
export class FeeTierListComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  tiers = signal<FeeTier[]>([]);
  displayedColumns = ['label', 'amount', 'effectiveFrom', 'effectiveTo', 'active', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.http.get<FeeTier[]>(`${environment.apiUrl}/school/settings/fee-tiers`)
      .subscribe(data => this.tiers.set(data));
  }

  openForm(tier?: FeeTier) {
    this.dialog.open(FeeTierDialog, { width: '480px', data: tier ?? null })
      .afterClosed().subscribe(saved => {
        if (saved) { this.load(); this.snack.open('Fee tier saved', 'OK', { duration: 2500 }); }
      });
  }

  delete(id: number) {
    if (!confirm('Deactivate this fee tier?')) return;
    this.http.delete(`${environment.apiUrl}/school/settings/fee-tiers/${id}`)
      .subscribe(() => { this.load(); this.snack.open('Fee tier deactivated', 'OK', { duration: 2500 }); });
  }
}
