import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';
import { SchoolClass } from '../../../core/models/class.model';

@Component({
  selector: 'app-class-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Class' : 'Add Class' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Batch Name</mat-label>
          <input matInput formControlName="batchName" placeholder="e.g. Beginner Batch A" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Schedule</mat-label>
          <input matInput formControlName="schedule" placeholder="e.g. Mon, Wed, Fri — 5:00 PM" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  `
})
export class ClassFormDialog {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<ClassFormDialog>);
  data: SchoolClass | null = inject(MAT_DIALOG_DATA);

  form = inject(FormBuilder).group({
    batchName: [this.data?.batchName ?? '', Validators.required],
    schedule: [this.data?.schedule ?? '', Validators.required],
    description: [this.data?.description ?? '']
  });

  save() {
    if (this.form.invalid) return;
    const req = this.data
      ? this.http.put(`${environment.apiUrl}/school/classes/${this.data.id}`, this.form.value)
      : this.http.post(`${environment.apiUrl}/school/classes`, this.form.value);
    req.subscribe(() => this.ref.close(true));
  }
}
