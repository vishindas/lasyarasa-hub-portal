import { Component, computed, inject, input, OnChanges, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PortalAccessApiService } from '../../../core/services/portal-access-api.service';
import { PortalAccessGuardianStatus, PortalAccessStatusResponse } from '../../../core/models/portal-access.model';
import { EnablePortalAccessDialog, EnablePortalAccessDialogData, EnablePortalAccessTarget } from './enable-portal-access-dialog';
import { deriveDisplayRow, PortalAccessDisplayRow } from './portal-access-display';

export interface PortalAccessGuardianOption {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  relationship: string;
}

type DisplayRow = PortalAccessDisplayRow;

@Component({
  selector: 'app-portal-access-card',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatDialogModule],
  styles: [`
    .row {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding: 10px 12px; background: #f8f9fb; border-radius: 8px; margin-bottom: 6px;
    }
    .row-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .row-label { font-weight: 600; font-size: 0.88rem; color: #1a1f36; }
    .row-copy { font-size: 0.8rem; color: #6c757d; }
    .row-cta { flex-shrink: 0; }
    @media (max-width: 768px) {
      .row { flex-direction: column; align-items: stretch; }
      .row-cta button { width: 100%; min-height: 44px; }
    }
  `],
  template: `
    <mat-card>
      <mat-card-content style="padding-top:16px">
        <p class="section-label">Portal Access</p>

        @if (loading()) {
          <p class="empty-hint">Loading…</p>
        } @else if (loadFailed()) {
          <p class="empty-hint" style="color:#b91c1c">Could not load portal access status.</p>
        } @else {

          <div class="row">
            <div class="row-main">
              <span class="row-label">Self Access</span>
              <span class="status-chip status-{{ selfRow().chipClass }}">{{ selfRow().chipLabel }}</span>
              <span class="row-copy">{{ selfRow().copy }}</span>
            </div>
            @if (selfRow().cta) {
              <div class="row-cta">
                <button mat-stroked-button [attr.aria-label]="selfRow().ctaAriaLabel" (click)="openDialog(selfRow())">
                  {{ selfRow().cta === 'resend' ? 'Resend Invitation' : 'Enable Access' }}
                </button>
              </div>
            }
          </div>

          @if (guardianRows().length) {
            <p class="section-label" style="margin-top:16px">Guardian Access</p>
            @for (row of guardianRows(); track row.target.kind === 'GUARDIAN' ? row.target.guardianId : 0) {
              <div class="row">
                <div class="row-main">
                  <span class="row-label">{{ row.label }}</span>
                  <span class="status-chip status-{{ row.chipClass }}">{{ row.chipLabel }}</span>
                  @if (row.copy) { <span class="row-copy">{{ row.copy }}</span> }
                </div>
                @if (row.cta) {
                  <div class="row-cta">
                    <button mat-stroked-button [attr.aria-label]="row.ctaAriaLabel" (click)="openDialog(row)">
                      {{ row.cta === 'resend' ? 'Resend Invitation' : 'Enable Access' }}
                    </button>
                  </div>
                }
              </div>
            }
          }
        }
      </mat-card-content>
    </mat-card>
  `
})
export class PortalAccessCard implements OnChanges {
  private api = inject(PortalAccessApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  studentId = input.required<number>();
  studentEmail = input<string | null>(null);
  guardians = input<PortalAccessGuardianOption[]>([]);

  status = signal<PortalAccessStatusResponse | null>(null);
  loading = signal(true);
  loadFailed = signal(false);

  selfRow = computed<DisplayRow>(() => {
    const s = this.status();
    const target: EnablePortalAccessTarget = { kind: 'SELF' };
    if (!s) return this.emptyRow('Self Access', target);
    return deriveDisplayRow('Self Access', s.self, target, this.usableStoredEmail(this.studentEmail()));
  });

  guardianRows = computed<DisplayRow[]>(() => {
    const s = this.status();
    if (!s) return [];
    return s.guardians.map((g: PortalAccessGuardianStatus) => {
      const label = `${g.firstName} ${g.lastName} (${this.titleCase(g.relationship)})`;
      const target: EnablePortalAccessTarget = { kind: 'GUARDIAN', guardianId: g.guardianId, label: `${g.firstName} ${g.lastName}` };
      const storedGuardian = this.guardians().find(gu => gu.id === g.guardianId);
      return deriveDisplayRow(label, g.status, target, this.usableStoredEmail(storedGuardian?.email ?? null));
    });
  });

  ngOnChanges(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.api.getStatus(this.studentId()).subscribe({
      next: (result) => { this.status.set(result); this.loading.set(false); },
      error: () => { this.loadFailed.set(true); this.loading.set(false); }
    });
  }

  private usableStoredEmail(email: string | null | undefined): string | null {
    return email && email.trim().length > 0 ? email : null;
  }

  private titleCase(value: string): string {
    return value.length ? value[0] + value.slice(1).toLowerCase() : value;
  }

  private emptyRow(label: string, target: EnablePortalAccessTarget): DisplayRow {
    return { label, chipClass: 'inactive', chipLabel: 'Needs Setup', copy: '', cta: null, ctaAriaLabel: '', target, storedEmail: null };
  }

  openDialog(row: DisplayRow): void {
    const data: EnablePortalAccessDialogData = { studentId: this.studentId(), target: row.target, storedEmail: row.storedEmail };
    this.dialog.open(EnablePortalAccessDialog, { width: '480px', data })
      .afterClosed().subscribe(result => {
        if (!result || result.kind === 'cancelled') return;
        this.load();
        if (result.kind === 'success') {
          this.snack.open('Portal access updated.', 'OK', { duration: 2500 });
        } else if (result.kind === 'partial-failure') {
          this.snack.open(
            result.code === 'ACCESS_GRANTED_INVITATION_FAILED'
              ? 'Access was granted, but the invitation failed to send.'
              : 'The invitation could not be sent.',
            'OK', { duration: 3500 });
        }
      });
  }
}
