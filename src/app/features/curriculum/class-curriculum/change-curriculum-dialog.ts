import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { A11yModule } from '@angular/cdk/a11y';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import {
  ClassCurriculumAssignment, CurriculumVersion, ChangeCurriculumPreviewResponse,
  ModuleMappingEntry, MigrationMappedState
} from '../../../core/models/curriculum.model';
import { ClassCurriculumApiService } from '../../../core/services/class-curriculum-api.service';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { CurriculumVersionSelectorComponent } from '../../../shared/curriculum/curriculum-version-selector';

export interface ChangeCurriculumDialogData {
  classId: number;
  currentAssignment: ClassCurriculumAssignment;
}

/**
 * Preview is advisory only (Slice 3 §7 guard table): confirm never trusts
 * it and stays disabled until a preview has been generated for the
 * *currently selected* target. Changing the target after a preview was
 * fetched invalidates it and requires re-preview -- mirrored client-side
 * here even though the backend also independently recomputes and never
 * trusts the client's mappings either.
 */
@Component({
  selector: 'app-change-curriculum-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatSelectModule, A11yModule, CurriculumMessageComponent, CurriculumVersionSelectorComponent],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    .diff-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 16px; }
    .diff-col h4 { margin: 0 0 8px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6c757d; }
    .diff-item { padding: 8px; border-radius: 6px; margin-bottom: 6px; font-size: 0.85rem; }
    .diff-item.removed  { background: #fee2e2; color: #991b1b; }
    .diff-item.matching { background: #f1f5f9; color: #334155; }
    .diff-item.added    { background: #d1fae5; color: #065f46; }
    .carry-over { margin-top: 4px; }
    .consequence { background: #fff8e1; color: #92400e; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; margin-top: 16px; font-size: 0.85rem; }
    @media (max-width: 767px) { .diff-grid { grid-template-columns: 1fr; } }
  `],
  template: `
    <h2 mat-dialog-title>Change Curriculum</h2>
    <mat-dialog-content>
      <app-curriculum-version-selector (versionSelected)="onTargetSelected($event)" />

      <app-curriculum-message [error]="error()" (retry)="runPreview()" (reload)="runPreview()" />

      @if (previewLoading()) {
        <p style="color:#adb5bd">Loading preview…</p>
      } @else if (preview(); as p) {
        @if (p.added.length === 0 && p.removed.length === 0 && p.matching.length === 0) {
          <p style="color:#adb5bd;margin-top:16px">No differences between these versions.</p>
        } @else {
          <div class="diff-grid">
            <div class="diff-col">
              <h4>Removed</h4>
              @for (m of p.removed; track m.oldModuleId) {
                <div class="diff-item removed">{{ m.oldTitle }}</div>
              }
            </div>
            <div class="diff-col">
              <h4>Matching</h4>
              @for (m of p.matching; track m.newModuleId) {
                <div class="diff-item matching">
                  {{ m.newTitle }}
                  <mat-select class="carry-over" [(ngModel)]="carryOver[m.newModuleId!]" placeholder="Locked (default)">
                    <mat-option [value]="null">Locked (default)</mat-option>
                    <mat-option value="RELEASED">Carry over as Released</mat-option>
                    <mat-option value="COMPLETED">Carry over as Completed</mat-option>
                  </mat-select>
                </div>
              }
            </div>
            <div class="diff-col">
              <h4>Added</h4>
              @for (m of p.added; track m.newModuleId) {
                <div class="diff-item added">{{ m.newTitle }}</div>
              }
            </div>
          </div>
        }
        <div class="consequence">
          Confirming creates a new historical record for this class. The current assignment is preserved in history but will no longer be active. New modules start Locked unless you choose to carry over a state above.
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" cdkFocusInitial (click)="ref.close(false)">Cancel</button>
      <button mat-flat-button color="primary" type="button"
              [disabled]="!preview() || mode.mutationsDisabled() || confirming()"
              (click)="confirm()">
        Confirm migration
      </button>
    </mat-dialog-actions>
  `
})
export class ChangeCurriculumDialog {
  ref = inject(MatDialogRef<ChangeCurriculumDialog, boolean>);
  data = inject<ChangeCurriculumDialogData>(MAT_DIALOG_DATA);
  private classApi = inject(ClassCurriculumApiService);
  mode = inject(ClassroomLiteModeService);

  targetVersion: CurriculumVersion | null = null;
  preview = signal<ChangeCurriculumPreviewResponse | null>(null);
  previewLoading = signal(false);
  confirming = signal(false);
  error = signal<CurriculumUiError | null>(null);

  /** newModuleId -> chosen MigrationMappedState (or null = leave Locked, no mapping entry sent). */
  carryOver: Record<number, MigrationMappedState | null> = {};

  onTargetSelected(version: CurriculumVersion | null) {
    this.targetVersion = version;
    this.preview.set(null); // invalidate any prior preview -- must re-run for the newly selected target
    this.carryOver = {};
    this.error.set(null);
    if (version) this.runPreview();
  }

  runPreview() {
    const v = this.targetVersion;
    if (!v) return;
    this.previewLoading.set(true);
    this.error.set(null);
    this.classApi.changePreview(this.data.classId, v.id).subscribe({
      next: p => { this.preview.set(p); this.previewLoading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(toCurriculumUiError(err)); this.previewLoading.set(false); }
    });
  }

  confirm() {
    const v = this.targetVersion, p = this.preview();
    if (!v || !p) return;
    const mappings: ModuleMappingEntry[] = p.matching
      .filter(m => this.carryOver[m.newModuleId!])
      .map(m => ({ oldModuleId: m.oldModuleId!, newModuleId: m.newModuleId!, mappedState: this.carryOver[m.newModuleId!]! }));

    this.confirming.set(true);
    this.classApi.changeConfirm(this.data.classId, {
      targetCurriculumVersionId: v.id,
      targetVersionExpectedRowVersion: v.rowVersion,
      currentAssignmentId: this.data.currentAssignment.id,
      currentAssignmentExpectedRowVersion: this.data.currentAssignment.rowVersion,
      mappings
    }).subscribe({
      next: () => { this.confirming.set(false); this.ref.close(true); },
      error: (err: HttpErrorResponse) => {
        this.confirming.set(false);
        const e = toCurriculumUiError(err);
        // A stale target (re-activated/changed elsewhere) invalidates the preview -- force re-preview per the guard table.
        if (e.kind === 'conflict') this.preview.set(null);
        this.error.set(e);
      }
    });
  }
}
