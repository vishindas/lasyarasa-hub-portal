import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';
import { AgeGroup } from '../../../core/models/settings.model';

@Component({
  selector: 'app-age-group-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Age Group' : 'Add Age Group' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Label</mat-label>
          <input matInput formControlName="label" placeholder="e.g. Young Kids (5–8)" />
        </mat-form-field>
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Min Age</mat-label>
            <input matInput type="number" formControlName="minAge" min="0" placeholder="Optional" />
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Max Age</mat-label>
            <input matInput type="number" formControlName="maxAge" min="0" placeholder="Optional" />
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" style="width:120px">
          <mat-label>Sort Order</mat-label>
          <input matInput type="number" formControlName="sortOrder" />
        </mat-form-field>
        @if (data) {
          <div style="margin-top:8px">
            <mat-slide-toggle formControlName="active">Active</mat-slide-toggle>
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  `
})
export class AgeGroupDialog {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<AgeGroupDialog>);
  data: AgeGroup | null = inject(MAT_DIALOG_DATA);

  form = inject(FormBuilder).group({
    label: [this.data?.label ?? '', Validators.required],
    minAge: [this.data?.minAge ?? null],
    maxAge: [this.data?.maxAge ?? null],
    sortOrder: [this.data?.sortOrder ?? 0],
    active: [this.data?.active ?? true]
  });

  save() {
    if (this.form.invalid) return;
    const req = this.data
      ? this.http.put(`${environment.apiUrl}/school/settings/age-groups/${this.data.id}`, this.form.value)
      : this.http.post(`${environment.apiUrl}/school/settings/age-groups`, this.form.value);
    req.subscribe(() => this.ref.close(true));
  }
}
