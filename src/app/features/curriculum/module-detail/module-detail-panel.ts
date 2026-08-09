import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CurriculumModule, CurriculumVersion } from '../../../core/models/curriculum.model';
import { CurriculumApiService } from '../../../core/services/curriculum-api.service';
import { CurriculumModuleApiService } from '../../../core/services/curriculum-module-api.service';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { ClassroomLiteBannerComponent } from '../../../shared/curriculum/classroom-lite-banner';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { StatusChipCurriculumComponent } from '../../../shared/curriculum/status-chip-curriculum';

/**
 * Full-screen route on phone/tablet, side-panel styling at >=1024px --
 * same route and component either way (Slice 3 Figure 3: "same fields and
 * reserved entry points"), the CSS handles the two layouts.
 *
 * No single-module GET endpoint exists on CurriculumModuleController (only
 * list-by-version) -- this loads via the existing list endpoint and selects
 * the routed :moduleId from it, per the approved data-composition rule
 * (compose from existing endpoints, never invent a new one).
 */
@Component({
  selector: 'app-module-detail-panel',
  standalone: true,
  imports: [
    FormsModule, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSnackBarModule,
    ClassroomLiteBannerComponent, CurriculumMessageComponent, StatusChipCurriculumComponent
  ],
  styles: [`
    :host { display: block; }
    .panel { max-width: 640px; }
    .field-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .reserved-entry {
      border: 1px dashed #d1d5db; border-radius: 8px; padding: 14px; margin-top: 8px;
      color: #6c757d; font-size: 0.85rem;
    }
    @media (max-width: 1023px) {
      :host { position: fixed; inset: 0; background: #fff; z-index: 1000; overflow-y: auto; padding: 16px; }
    }
  `],
  template: `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:6px">
        <button mat-icon-button (click)="close()" aria-label="Back to Curriculum Builder">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 style="margin:0">Module Detail</h2>
      </div>
    </div>

    <app-classroom-lite-banner />

    @if (loading()) {
      <p style="color:#adb5bd;padding:32px 0">Loading…</p>
    } @else if (loadError()) {
      <app-curriculum-message [error]="loadError()" (retry)="load()" (reload)="load()" />
    } @else if (module(); as m) {
      <div class="panel">
        <app-curriculum-message [error]="actionError()" (reload)="load()" />

        <mat-card>
          <mat-card-content style="padding-top:16px">
            <app-status-chip-curriculum [state]="m.contentStatus" />

            <div class="field-row" style="margin-top:16px">
              <mat-form-field appearance="outline">
                <mat-label>Title</mat-label>
                <input matInput [(ngModel)]="form.title" [disabled]="!parentDraft()" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Objectives</mat-label>
                <textarea matInput rows="3" [(ngModel)]="form.objectives" [disabled]="!parentDraft()"></textarea>
              </mat-form-field>
            </div>

            @if (parentDraft()) {
              <button mat-stroked-button [disabled]="mode.mutationsDisabled() || saving()" (click)="save()">Save</button>
            } @else {
              <p style="color:#6c757d;font-size:0.82rem">The parent curriculum version is no longer DRAFT — structural edits require a new cloned draft.</p>
            }

            <div style="margin-top:16px;display:flex;gap:8px">
              @if (m.contentStatus === 'DRAFT') {
                <button mat-flat-button color="primary" [disabled]="mode.mutationsDisabled() || saving()" (click)="publish()">
                  <mat-icon>check_circle</mat-icon> Publish
                </button>
              }
              @if (m.contentStatus === 'PUBLISHED') {
                <button mat-stroked-button color="warn" [disabled]="mode.mutationsDisabled() || saving()" (click)="archive()">
                  <mat-icon>archive</mat-icon> Archive
                </button>
              }
            </div>

            <p class="section-label" style="margin-top:20px">Lessons</p>
            <div class="reserved-entry">
              <mat-icon aria-hidden="true" style="vertical-align:middle;font-size:18px;width:18px;height:18px">lock_clock</mat-icon>
              No lessons yet. Lesson authoring is reserved for a later design slice (Slice 7).
            </div>

            <p class="section-label" style="margin-top:20px">Linked assignment template</p>
            <div class="reserved-entry">
              <mat-icon aria-hidden="true" style="vertical-align:middle;font-size:18px;width:18px;height:18px">lock_clock</mat-icon>
              No linked template. Assignment template authoring is reserved for a later design slice (Slice 13).
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `
})
export class ModuleDetailPanelComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private curriculumApi = inject(CurriculumApiService);
  private moduleApi = inject(CurriculumModuleApiService);
  private snack = inject(MatSnackBar);
  mode = inject(ClassroomLiteModeService);

  curriculumId = signal<number | null>(null);
  versionId = signal<number | null>(null);
  moduleId = signal<number | null>(null);

  version = signal<CurriculumVersion | null>(null);
  module = signal<CurriculumModule | null>(null);
  loading = signal(true);
  saving = signal(false);
  loadError = signal<CurriculumUiError | null>(null);
  actionError = signal<CurriculumUiError | null>(null);

  // The backend's own DRAFT-only trigger is the real authority; this only gates the UI.
  parentDraft = computed(() => this.version()?.status === 'DRAFT');

  form = { title: '', objectives: '' };

  ngOnInit() {
    this.curriculumId.set(Number(this.route.snapshot.paramMap.get('curriculumId')));
    this.versionId.set(Number(this.route.snapshot.paramMap.get('versionId')));
    this.moduleId.set(Number(this.route.snapshot.paramMap.get('moduleId')));
    this.load();
  }

  load() {
    const cId = this.curriculumId(), vId = this.versionId(), mId = this.moduleId();
    if (cId === null || vId === null || mId === null) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);
    this.curriculumApi.getVersion(cId, vId).subscribe({
      next: v => this.version.set(v),
      error: (err: HttpErrorResponse) => this.loadError.set(toCurriculumUiError(err))
    });
    this.moduleApi.list(vId).subscribe({
      next: modules => {
        const found = modules.find(m => m.id === mId) ?? null;
        this.module.set(found);
        if (found) { this.form.title = found.title; this.form.objectives = found.objectives ?? ''; }
        else this.loadError.set({ kind: 'not-found', message: 'This module is unavailable.', resource: 'CurriculumModule' });
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => { this.loadError.set(toCurriculumUiError(err)); this.loading.set(false); }
    });
  }

  save() {
    const m = this.module();
    if (!m) return;
    this.saving.set(true);
    this.moduleApi.update(m.id, { title: this.form.title.trim(), objectives: this.form.objectives.trim() || null, expectedRowVersion: m.rowVersion }).subscribe({
      next: updated => { this.module.set(updated); this.saving.set(false); this.snack.open('Saved', 'OK', { duration: 2000 }); },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.actionError.set(toCurriculumUiError(err)); }
    });
  }

  publish() {
    const m = this.module();
    if (!m) return;
    this.saving.set(true);
    this.moduleApi.publish(m.id, { expectedRowVersion: m.rowVersion }).subscribe({
      next: updated => { this.module.set(updated); this.saving.set(false); this.snack.open('Published', 'OK', { duration: 2500 }); },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.actionError.set(toCurriculumUiError(err)); }
    });
  }

  archive() {
    const m = this.module();
    if (!m) return;
    this.saving.set(true);
    this.moduleApi.archive(m.id, { expectedRowVersion: m.rowVersion }).subscribe({
      next: updated => { this.module.set(updated); this.saving.set(false); this.snack.open('Archived', 'OK', { duration: 2500 }); },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.actionError.set(toCurriculumUiError(err)); }
    });
  }

  close() {
    const cId = this.curriculumId(), vId = this.versionId();
    this.router.navigate(['/vidya-rasa/curricula', cId, 'versions', vId]);
  }
}
