import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';
import { DanceStyle } from '../../../core/models/settings.model';

@Component({
  selector: 'app-dance-style-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Dance Style' : 'Add Dance Style' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Style Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Kuchipudi" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
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
export class DanceStyleDialog {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<DanceStyleDialog>);
  data: DanceStyle | null = inject(MAT_DIALOG_DATA);

  form = inject(FormBuilder).group({
    name: [this.data?.name ?? '', Validators.required],
    description: [this.data?.description ?? ''],
    sortOrder: [this.data?.sortOrder ?? 0],
    active: [this.data?.active ?? true]
  });

  save() {
    if (this.form.invalid) return;
    const body = this.form.value;
    const req = this.data
      ? this.http.put(`${environment.apiUrl}/school/settings/dance-styles/${this.data.id}`, body)
      : this.http.post(`${environment.apiUrl}/school/settings/dance-styles`, body);
    req.subscribe(() => this.ref.close(true));
  }
}
