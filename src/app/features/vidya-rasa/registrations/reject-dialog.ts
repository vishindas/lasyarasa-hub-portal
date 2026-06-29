import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reject-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule,
            MatFormFieldModule, MatInputModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>Reject Registration</h2>
    <mat-dialog-content style="min-width:420px;padding-top:8px">
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Reason for rejection (optional)</mat-label>
        <textarea matInput rows="3" [(ngModel)]="reason"
                  placeholder="e.g. Class is full, age requirements not met…"></textarea>
      </mat-form-field>
      @if (data.email) {
        <mat-checkbox [(ngModel)]="sendEmail" style="margin-top:4px">
          Send email notification to <strong>{{ data.email }}</strong>
        </mat-checkbox>
      } @else {
        <p style="font-size:0.85rem;color:#9ca3af;margin:4px 0 0">
          No email address on file — notification cannot be sent.
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:16px 24px">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="warn" (click)="confirm()">Reject</button>
    </mat-dialog-actions>
  `
})
export class RejectDialog {
  private ref = inject(MatDialogRef<RejectDialog>);
  data: { email: string | null } = inject(MAT_DIALOG_DATA);

  reason = '';
  sendEmail = !!this.data.email;

  confirm() {
    this.ref.close({ reason: this.reason, sendEmail: this.sendEmail && !!this.data.email });
  }
}
