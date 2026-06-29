import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';
import { SchoolClass } from '../../../core/models/class.model';
import { DanceStyle, AgeGroup, FeeTier } from '../../../core/models/settings.model';

@Component({
  selector: 'app-class-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Class' : 'Add Class' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Dance Style</mat-label>
          <mat-select formControlName="danceStyleId">
            @for (s of styles; track s.id) {
              <mat-option [value]="s.id">{{ s.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Age Group</mat-label>
          <mat-select formControlName="ageGroupId">
            @for (a of ageGroups; track a.id) {
              <mat-option [value]="a.id">{{ a.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Fee Tier</mat-label>
          <mat-select formControlName="feeTierId">
            @for (f of feeTiers; track f.id) {
              <mat-option [value]="f.id">{{ f.label }} — {{ f.currency }} {{ f.amount }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Batch Name</mat-label>
          <input matInput formControlName="batchName" placeholder="e.g. Beginner Batch A" />
          <mat-hint>A short name to identify this batch</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Schedule</mat-label>
          <input matInput formControlName="schedule" placeholder="e.g. Mon, Wed — 5:00 PM" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  `
})
export class ClassFormDialog implements OnInit {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<ClassFormDialog>);
  data: SchoolClass | null = inject(MAT_DIALOG_DATA);

  styles: DanceStyle[] = [];
  ageGroups: AgeGroup[] = [];
  feeTiers: FeeTier[] = [];

  form = inject(FormBuilder).group({
    danceStyleId: [this.data?.danceStyleId ?? null, Validators.required],
    ageGroupId:   [this.data?.ageGroupId   ?? null, Validators.required],
    feeTierId:    [this.data?.feeTierId    ?? null, Validators.required],
    batchName:    [this.data?.batchName    ?? '', Validators.required],
    schedule:     [this.data?.schedule     ?? '', Validators.required],
    description:  [this.data?.description  ?? '']
  });

  ngOnInit() {
    this.http.get<DanceStyle[]>(`${environment.apiUrl}/school/settings/dance-styles`)
      .subscribe(d => this.styles = d);
    this.http.get<AgeGroup[]>(`${environment.apiUrl}/school/settings/age-groups`)
      .subscribe(d => this.ageGroups = d);
    this.http.get<FeeTier[]>(`${environment.apiUrl}/school/settings/fee-tiers`)
      .subscribe(d => this.feeTiers = d);
  }

  save() {
    if (this.form.invalid) return;
    const req = this.data
      ? this.http.put(`${environment.apiUrl}/school/classes/${this.data.id}`, this.form.value)
      : this.http.post(`${environment.apiUrl}/school/classes`, this.form.value);
    req.subscribe(() => this.ref.close(true));
  }
}
