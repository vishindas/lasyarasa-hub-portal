import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';
import { ApproveDialog } from './approve-dialog';
import { RejectDialog } from './reject-dialog';

@Component({
  selector: 'app-registration-list',
  standalone: true,
  imports: [DatePipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
            MatButtonToggleModule, MatSnackBarModule, MatDialogModule, MatTooltipModule],
  template: `
    <div class="page-header">
      <div>
        <h2>Registrations</h2>
        <p class="page-subtitle">{{ pendingCount() }} pending · {{ allRegistrations().length }} total</p>
      </div>
      <div style="display:flex;gap:8px">
        <button mat-stroked-button routerLink="form-builder">
          <mat-icon>tune</mat-icon> Configure Form
        </button>
        <button mat-stroked-button (click)="copyLink()">
          <mat-icon>link</mat-icon> Copy Registration Link
        </button>
      </div>
    </div>

    <mat-button-toggle-group [value]="filter()" (change)="filter.set($event.value)"
                             style="margin-bottom:20px">
      <mat-button-toggle value="ALL">All</mat-button-toggle>
      <mat-button-toggle value="PENDING">
        Pending
        @if (pendingCount() > 0) {
          <span class="tab-badge">{{ pendingCount() }}</span>
        }
      </mat-button-toggle>
    </mat-button-toggle-group>

    @if (filtered().length === 0) {
      <mat-card style="text-align:center;padding:48px;color:#adb5bd">
        <mat-icon style="font-size:40px;width:40px;height:40px">how_to_reg</mat-icon>
        <p>{{ filter() === 'PENDING' ? 'No pending registrations.' : 'No registrations yet.' }}</p>
      </mat-card>
    } @else {
      <mat-card>
        <table mat-table [dataSource]="filtered()" class="full-width">

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Student</th>
            <td mat-cell *matCellDef="let r">
              <strong>{{ r.firstName }} {{ r.lastName }}</strong>
              <span style="display:block;font-size:0.75rem;color:#9ca3af">
                {{ r.registrantType === 'SELF' ? 'Self' : 'Child' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="contact">
            <th mat-header-cell *matHeaderCellDef>Contact</th>
            <td mat-cell *matCellDef="let r">
              @if (r.registrantType === 'SELF') {
                <span>{{ r.phone || r.email || '—' }}</span>
              } @else {
                <span>{{ r.guardianFirstName }} {{ r.guardianLastName }}</span>
                <span style="display:block;font-size:0.75rem;color:#9ca3af">{{ r.guardianPhone || r.guardianEmail || '' }}</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="styleInterest">
            <th mat-header-cell *matHeaderCellDef>Style Interest</th>
            <td mat-cell *matCellDef="let r">{{ r.styleInterest || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="age">
            <th mat-header-cell *matHeaderCellDef>Age</th>
            <td mat-cell *matCellDef="let r">{{ age(r.dateOfBirth) }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let r">
              <span class="status-chip" [class]="statusClass(r.status)">{{ r.status }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Submitted</th>
            <td mat-cell *matCellDef="let r">{{ r.createdAt | date:'mediumDate' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r">
              @if (r.status === 'PENDING') {
                <button mat-icon-button color="primary" (click)="$event.stopPropagation(); openApprove(r)" matTooltip="Approve">
                  <mat-icon>check_circle</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="$event.stopPropagation(); reject(r)" matTooltip="Reject">
                  <mat-icon>cancel</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"
              style="cursor:pointer"
              (click)="openDetail(row)"></tr>
        </table>
      </mat-card>
    }
  `
})
export class RegistrationListComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  allRegistrations = signal<any[]>([]);
  filter = signal<'PENDING' | 'ALL'>('ALL');
  registrationToken = signal('');

  pendingCount = computed(() => this.allRegistrations().filter(r => r.status === 'PENDING').length);
  filtered = computed(() =>
    this.filter() === 'PENDING'
      ? this.allRegistrations().filter(r => r.status === 'PENDING')
      : this.allRegistrations()
  );

  columns = ['name', 'contact', 'styleInterest', 'age', 'status', 'date', 'actions'];

  ngOnInit() {
    this.load();
    this.http.get<{ token: string }>(`${environment.apiUrl}/school/registrations/token`)
      .subscribe({
        next: r => this.registrationToken.set(r.token),
        error: e => this.snack.open('Could not load registration token: ' + (e.error?.message || e.status), 'OK', { duration: 5000 })
      });
  }

  load() {
    this.http.get<any[]>(`${environment.apiUrl}/school/registrations`)
      .subscribe(d => this.allRegistrations.set(d));
  }

  openDetail(r: any) {
    this.router.navigate(['/vidya-rasa/registrations', r.id]);
  }

  copyLink() {
    const url = `${window.location.origin}/register/${this.registrationToken()}`;
    navigator.clipboard.writeText(url).then(() =>
      this.snack.open('Registration link copied!', 'OK', { duration: 3000 })
    );
  }

  openApprove(r: any) {
    this.dialog.open(ApproveDialog, { width: '480px', data: { registration: r } })
      .afterClosed().subscribe(result => {
        if (!result?.confirmed) return;
        this.http.post(`${environment.apiUrl}/school/registrations/${r.id}/approve`,
                       { classId: result.classId })
          .subscribe({
            next: () => {
              this.snack.open('Registration approved — student created', 'OK', { duration: 3000 });
              this.load();
            },
            error: (e) => this.snack.open(e.error?.message || 'Failed to approve', 'OK', { duration: 3000 })
          });
      });
  }

  reject(r: any) {
    const email = r.registrantType === 'SELF' ? r.email : r.guardianEmail;
    this.dialog.open(RejectDialog, { data: { email } })
      .afterClosed().subscribe(result => {
        if (result === undefined) return;
        this.http.post(`${environment.apiUrl}/school/registrations/${r.id}/reject`, result)
          .subscribe({
            next: () => {
              this.snack.open('Registration rejected', 'OK', { duration: 3000 });
              this.load();
            },
            error: () => this.snack.open('Failed to reject', 'OK', { duration: 3000 })
          });
      });
  }

  age(dob: string): string {
    if (!dob) return '—';
    const today = new Date();
    const birth = new Date(dob);
    let years = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
    return years >= 0 ? `${years} yrs` : '—';
  }

  statusClass(status: string) {
    return 'status-' + status.toLowerCase();
  }
}
