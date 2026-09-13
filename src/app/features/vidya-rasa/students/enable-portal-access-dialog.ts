import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { PortalAccessApiService } from '../../../core/services/portal-access-api.service';
import {
  AccessType, ApiErrorBody, EnablePortalAccessErrorCode, EnablePortalAccessOutcome
} from '../../../core/models/portal-access.model';

export type EnablePortalAccessTarget =
  | { kind: 'SELF' }
  | { kind: 'GUARDIAN'; guardianId: number; label: string };

export interface EnablePortalAccessDialogData {
  studentId: number;
  target: EnablePortalAccessTarget;
  /**
   * A usable (non-blank) stored email for this exact target, or null.
   * This is the entire endpoint-selection decision tree: present -> the
   * existing /invite-access pipeline (stored-email cohort, unchanged);
   * absent -> /enable-portal-access (Slice 2, admin-typed email). Resend
   * re-evaluates this fresh each time it is opened, never assuming which
   * endpoint an earlier attempt used.
   */
  storedEmail: string | null;
}

export type EnablePortalAccessDialogResult =
  | { kind: 'success'; via: 'invite' }
  | { kind: 'success'; via: 'enable'; outcome: EnablePortalAccessOutcome }
  | { kind: 'partial-failure'; code: EnablePortalAccessErrorCode }
  | { kind: 'cancelled' };

@Component({
  selector: 'app-enable-portal-access-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatCheckboxModule,
            MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Enable Portal Access</h2>
    <mat-dialog-content style="min-width:420px;max-width:480px">

      @if (state() === 'done') {
        <div style="text-align:center;padding:24px 0">
          <mat-icon style="font-size:44px;width:44px;height:44px;color:#16a34a">check_circle</mat-icon>
          <p style="margin:12px 0 0;color:#1a1f36;font-weight:600">{{ successMessage() }}</p>
        </div>
      } @else {

        <p style="font-size:0.88rem;color:#4b5563;margin:0 0 16px">
          {{ targetLabel() }}
        </p>

        @if (data.storedEmail) {
          <p style="font-size:0.85rem;color:#1a1f36;margin:0 0 8px">
            Send to <strong>{{ data.storedEmail }}</strong>
          </p>
          <mat-checkbox [(ngModel)]="confirmed" style="display:block;font-size:0.85rem">
            I confirm this student or guardian requested online access.
          </mat-checkbox>
        } @else {
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Login email</mat-label>
            <input matInput [(ngModel)]="typedEmail" type="email" placeholder="name@example.com">
          </mat-form-field>
        }

        @if (errorMessage()) {
          <p style="font-size:0.85rem;color:#b91c1c;margin:12px 0 0">{{ errorMessage() }}</p>
        }
      }

    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:16px 24px">
      @if (state() === 'done') {
        <button mat-flat-button color="primary" (click)="close()">Close</button>
      } @else {
        <button mat-button (click)="cancel()" [disabled]="state() === 'sending'">Cancel</button>
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
export class EnablePortalAccessDialog {
  private api = inject(PortalAccessApiService);
  private ref = inject(MatDialogRef<EnablePortalAccessDialog, EnablePortalAccessDialogResult>);
  data: EnablePortalAccessDialogData = inject(MAT_DIALOG_DATA);

  state = signal<'form' | 'sending' | 'done'>('form');
  errorMessage = signal<string | null>(null);
  successMessage = signal<string>('');
  confirmed = false;
  typedEmail = '';
  private attempted = false;

  targetLabel = computed(() =>
    this.data.target.kind === 'SELF'
      ? 'Send an invitation so this student can create a Lasyarasa login.'
      : `Send an invitation so ${this.data.target.label} can create a Lasyarasa login.`);

  canSend(): boolean {
    if (this.state() === 'sending') return false;
    if (this.data.storedEmail) return this.confirmed;
    return this.typedEmail.trim().length > 0;
  }

  send() {
    if (!this.canSend()) return;
    this.state.set('sending');
    this.errorMessage.set(null);
    this.attempted = true;

    if (this.data.storedEmail) {
      this.sendViaInvite();
    } else {
      this.sendViaEnable();
    }
  }

  private sendViaInvite() {
    const body = this.data.target.kind === 'SELF'
      ? { accessType: 'SELF' as AccessType, guardianId: null, confirmed: true }
      : { accessType: 'GUARDIAN' as AccessType, guardianId: this.data.target.guardianId, confirmed: true };

    this.api.invite(this.data.studentId, body).subscribe({
      next: () => {
        this.successMessage.set('Online access invitation sent.');
        this.state.set('done');
        this.closeResult = { kind: 'success', via: 'invite' };
      },
      error: (err: HttpErrorResponse) => {
        this.state.set('form');
        this.errorMessage.set(this.toSafeMessage(err));
      }
    });
  }

  private sendViaEnable() {
    const body = {
      loginEmail: this.typedEmail.trim(),
      accessType: (this.data.target.kind === 'SELF' ? 'SELF' : 'GUARDIAN') as AccessType,
      guardianId: this.data.target.kind === 'GUARDIAN' ? this.data.target.guardianId : null
    };

    this.api.enableAccess(this.data.studentId, body).subscribe({
      next: (result) => {
        this.successMessage.set(this.outcomeMessage(result.outcome));
        this.state.set('done');
        this.closeResult = { kind: 'success', via: 'enable', outcome: result.outcome };
      },
      error: (err: HttpErrorResponse) => {
        this.state.set('form');
        const code = this.extractCode(err);
        if (code) {
          this.errorMessage.set(this.codeMessage(code));
          this.closeResult = { kind: 'partial-failure', code };
        } else {
          this.errorMessage.set(this.toSafeMessage(err));
        }
      }
    });
  }

  private outcomeMessage(outcome: EnablePortalAccessOutcome): string {
    switch (outcome) {
      case 'GRANTED_AND_INVITED':
        return 'Access granted and invitation sent.';
      case 'ALREADY_ACTIVE':
        return 'Portal access is already active.';
      case 'INVITATION_SENT_TO_EXISTING_OWNER':
        return 'Invitation sent — access will be created once the existing account confirms.';
    }
  }

  private codeMessage(code: EnablePortalAccessErrorCode): string {
    return code === 'ACCESS_GRANTED_INVITATION_FAILED'
      ? 'Access was granted, but the invitation could not be delivered. You can resend from this screen.'
      : 'The invitation could not be sent. Please try again.';
  }

  private extractCode(err: HttpErrorResponse): EnablePortalAccessErrorCode | null {
    const body = err.error as ApiErrorBody | undefined;
    return body?.code ?? null;
  }

  private toSafeMessage(err: HttpErrorResponse): string {
    const body = err.error as ApiErrorBody | undefined;
    const backendMessage = typeof body?.error === 'string' ? body.error : null;
    if (err.status === 400 && backendMessage) return backendMessage;
    if (err.status === 403) return 'You are not authorized to send this invitation.';
    if (err.status === 409 && backendMessage) return backendMessage;
    return 'The invitation could not be sent. Please try again.';
  }

  private closeResult: EnablePortalAccessDialogResult | null = null;

  close() {
    this.ref.close(this.closeResult ?? { kind: 'cancelled' });
  }

  cancel() {
    this.ref.close(this.attempted && this.closeResult ? this.closeResult : { kind: 'cancelled' });
  }
}
