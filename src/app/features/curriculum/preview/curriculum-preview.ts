import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { CurriculumModule } from '../../../core/models/curriculum.model';
import { CurriculumModuleApiService } from '../../../core/services/curriculum-module-api.service';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { StatusChipCurriculumComponent } from '../../../shared/curriculum/status-chip-curriculum';

/**
 * Non-releasing student Learning Path preview (Slice 3 §7.2/Figure 4):
 * read-only, no mutation calls -- reuses the module list under a persistent
 * "you're previewing" banner. Still viewable under WRITE_FROZEN/FULL_OUTAGE
 * (reads only) so no ClassroomLiteBanner is shown here deliberately; a read
 * that fails still surfaces via curriculum-message like any other error.
 */
@Component({
  selector: 'app-curriculum-preview',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatCardModule, CurriculumMessageComponent, StatusChipCurriculumComponent],
  styles: [`
    button[mat-flat-button], button[mat-stroked-button], button[mat-button] { min-height: 44px; }
    .preview-banner {
      display: flex; align-items: center; gap: 8px;
      background: #eef2ff; color: #3730a3; border: 1px solid #c7d2fe;
      padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem; font-weight: 500;
    }
    .module-row { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid #f1f3f5; min-height: 44px; }
    .module-row:last-child { border-bottom: none; }
    .module-title { flex: 1; font-size: 0.9rem; font-weight: 500; color: #1a1f36; white-space: normal; }
  `],
  template: `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:6px">
        <button mat-icon-button (click)="close()" aria-label="Back to Curriculum Builder">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 style="margin:0">Curriculum Preview</h2>
      </div>
    </div>

    <div class="preview-banner" role="status">
      <mat-icon aria-hidden="true">visibility</mat-icon>
      <span>You're previewing the student Learning Path. Nothing here is released to students.</span>
    </div>

    @if (loading()) {
      <p style="color:#adb5bd;padding:32px 0">Loading…</p>
    } @else if (error()) {
      <app-curriculum-message [error]="error()" (retry)="load()" (reload)="load()" />
    } @else if (modules().length === 0) {
      <mat-card><mat-card-content style="padding:48px 24px;text-align:center;color:#6c757d">
        Add modules to preview the learning path.
      </mat-card-content></mat-card>
    } @else {
      <mat-card>
        <mat-card-content style="padding:8px 16px">
          @for (m of modules(); track m.id) {
            <div class="module-row">
              <span class="module-title">{{ m.title }}</span>
              <app-status-chip-curriculum [state]="m.contentStatus" />
            </div>
          }
        </mat-card-content>
      </mat-card>
    }
  `
})
export class CurriculumPreviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private moduleApi = inject(CurriculumModuleApiService);

  curriculumId = signal<number | null>(null);
  versionId = signal<number | null>(null);
  modules = signal<CurriculumModule[]>([]);
  loading = signal(true);
  error = signal<CurriculumUiError | null>(null);

  ngOnInit() {
    this.curriculumId.set(Number(this.route.snapshot.paramMap.get('curriculumId')));
    this.versionId.set(Number(this.route.snapshot.paramMap.get('versionId')));
    this.load();
  }

  load() {
    const vId = this.versionId();
    if (vId === null) return;
    this.loading.set(true);
    this.error.set(null);
    this.moduleApi.list(vId).subscribe({
      next: modules => { this.modules.set([...modules].sort((a, b) => a.moduleOrder - b.moduleOrder)); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(toCurriculumUiError(err)); this.loading.set(false); }
    });
  }

  close() {
    this.router.navigate(['/vidya-rasa/curricula', this.curriculumId(), 'versions', this.versionId()]);
  }
}
