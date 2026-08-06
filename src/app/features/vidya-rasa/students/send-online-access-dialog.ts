import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

export interface SendOnlineAccessGuardianOption {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  relationship: string;
}

export interface SendOnlineAccessDialogData {
  studentId: number;
  studentEmail: string | null;
  guardians: SendOnlineAccessGuardianOption[];
}

/** Discriminated recipient choice: 'SELF' or a specific guardian id — never a typed email. */
type Recipient = { kind: 'SELF' } | { kind: 'GUARDIAN'; guardianId: number; email: string; label: string };

interface InviteAccessResponse {
  invitationId: number;
  expiresAt: string;
  delivered: boolean;
}

@Component({
  selector: 'app-send-online-access-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
            MatRadioModule, MatCheckboxModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Send Online Access Invitation</h2>
    <mat-dialog-content style="min-width:420px;max-width:480px">

      @if (state() === 'sent') {
        <div style="text-align:center;padding:24px 0">
          <mat-icon style="font-size:44px;width:44px;height:44px;color:#16a34a">check_circle</mat-icon>
          <p style="margin:12px 0 0;color:#1a1f36;font-weight:600">Online access invitation sent.</p>
        </div>
      } @else {

        <p style="font-size:0.88rem;color:#4b5563;margin:0 0 16px">
          Send an invitation so this student or guardian can create a Lasyarasa login and view linked students.
        </p>

        @if (recipients().length === 0) {
          <p style="font-size:0.85rem;color:#b91c1c;margin:0">
            No usable student or guardian email is available.
          </p>
        } @else {
          <mat-radio-group [(ngModel)]="selectedIndex" style="display:flex;flex-direction:column;gap:8px">
            @for (r of recipients(); track $index) {
              <mat-radio-button [value]="$index">
                {{ r.kind === 'SELF' ? 'Student' : r.label }} — {{ r.kind === 'SELF' ? studentEmailValue() : r.email }}
              </mat-radio-button>
            }
          </mat-radio-group>

          <mat-checkbox [(ngModel)]="confirmed" style="display:block;margin-top:16px;font-size:0.85rem">
            I confirm this student or guardian requested online access.
          </mat-checkbox>
        }

        @if (errorMessage()) {
          <p style="font-size:0.85rem;color:#b91c1c;margin:12px 0 0">{{ errorMessage() }}</p>
        }
      }

    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:16px 24px">
      @if (state() === 'sent') {
        <button mat-flat-button color="primary" mat-dialog-close>Close</button>
      } @else {
        <button mat-button mat-dialog-close [disabled]="state() === 'sending'">Cancel</button>
        <button mat-flat-button color="primary" (click)="send()" [disabled]="!canSend()">
          @if (state() === 'sending') {
            <mat-spinner diameter="18" style="display:inline-block;vertical-align:middle;margin-right:6px"></mat-spinner>
          }
          Send
        </button>
      }
    </mat-dialog-actions>
  `
})
export class SendOnlineAccessDialog {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<SendOnlineAccessDialog>);
  data: SendOnlineAccessDialogData = inject(MAT_DIALOG_DATA);

  state = signal<'form' | 'sending' | 'sent'>('form');
  errorMessage = signal<string | null>(null);
  confirmed = false;
  selectedIndex: number | null = null;

  studentEmailValue = () => this.data.studentEmail;

  /**
   * Built once from stored data only — never re-derived from user input.
   * SELF is offered only when the student's own email is non-blank; SELF is
   * never resolved from a relationship=SELF guardian row. GUARDIAN options
   * exclude relationship=SELF rows and any guardian with a blank email.
   */
  recipients = computed<Recipient[]>(() => {
    const list: Recipient[] = [];
    const studentEmail = this.data.studentEmail;
    if (studentEmail && studentEmail.trim().length > 0) {
      list.push({ kind: 'SELF' });
    }
    for (const g of this.data.guardians) {
      if (g.relationship === 'SELF') continue;
      if (!g.email || g.email.trim().length === 0) continue;
      list.push({ kind: 'GUARDIAN', guardianId: g.id, email: g.email, label: `${g.firstName} ${g.lastName}` });
    }
    return list;
  });

  constructor() {
    // Auto-select only when there is exactly one eligible choice overall —
    // never merely "first in the list" when more than one is eligible.
    const list = this.recipients();
    if (list.length === 1) {
      this.selectedIndex = 0;
    }
  }

  canSend(): boolean {
    return this.state() !== 'sending'
        && this.selectedIndex !== null
        && this.recipients().length > 0
        && this.confirmed;
  }

  send() {
    if (!this.canSend()) return;
    const recipient = this.recipients()[this.selectedIndex!];
    const body = recipient.kind === 'SELF'
      ? { accessType: 'SELF', guardianId: null, confirmed: true }
      : { accessType: 'GUARDIAN', guardianId: recipient.guardianId, confirmed: true };

    this.state.set('sending');
    this.errorMessage.set(null);

    this.http.post<InviteAccessResponse>(
      `${environment.apiUrl}/school/v2/students/${this.data.studentId}/invite-access`, body
    ).subscribe({
      next: () => {
        this.state.set('sent');
      },
      error: (err: HttpErrorResponse) => {
        this.state.set('form');
        this.errorMessage.set(this.toSafeMessage(err));
      }
    });
  }

  private toSafeMessage(err: HttpErrorResponse): string {
    const backendMessage = typeof err.error?.error === 'string' ? err.error.error : null;
    if (err.status === 400 && backendMessage) {
      return backendMessage;
    }
    if (err.status === 403) {
      return 'You are not authorized to send this invitation.';
    }
    if (err.status === 409 && backendMessage) {
      return backendMessage;
    }
    return 'The invitation could not be sent. Please try again.';
  }
}
