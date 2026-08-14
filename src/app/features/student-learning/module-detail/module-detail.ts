import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { StudentLearningApiService } from '../../../core/services/student-learning-api.service';
import { ModuleDetailDTO } from '../../../core/models/student-learning.model';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../student-learning-recovery.util';
import { LessonSummaryRowComponent } from './lesson-summary-row';

/**
 * Part II.3. A LOCKED or WITHDRAWN module never reaches this screen at all
 * -- the backend rejects a direct/forced request the same generic,
 * non-leaking way either way (Part VII.2/correction 6), which the shared
 * error state below renders identically to any other LEARNING_CONTENT_NOT_FOUND.
 * This component therefore has no "locked"/"withdrawn" rendering of its
 * own -- only the shared rejection state.
 */
@Component({
  selector: 'app-module-detail',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule, MatIconModule, CurriculumMessageComponent, LessonSummaryRowComponent],
  styles: [`
    :host { display: block; max-width: 720px; margin: 0 auto; padding: 24px 20px 48px; }
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 0.85rem; color: #6B6255; margin-bottom: 8px; }
    /* 44px touch-target floor -- same fix as lesson-detail.ts's identical breadcrumb pattern. */
    .breadcrumb a { display: inline-flex; align-items: center; min-height: 44px; color: #6B6255; text-decoration: none; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.4rem; color: #1C1A16; margin: 0 0 10px; }
    .objective { color: #1C1A16; margin: 0 0 20px; line-height: 1.5; }
    .lessons { display: flex; flex-direction: column; gap: 8px; }
    .empty-note { color: #6B6255; }
  `],
  template: `
    <div class="breadcrumb">
      <a [routerLink]="['/my-students', studentId(), 'classes', classId(), 'path']">
        <mat-icon aria-hidden="true" style="font-size:16px;width:16px;height:16px;vertical-align:middle">chevron_left</mat-icon>
        Curriculum Overview
      </a>
    </div>

    @if (loadError(); as e) {
      <h1 tabindex="-1">Module</h1>
      <app-curriculum-message [error]="e" [backLabel]="recoveryLabel(e.kind)" (back)="onBack(e.kind)" />
    } @else if (loading()) {
      <h1 tabindex="-1">Module</h1>
      <mat-spinner diameter="36" />
    } @else if (module(); as m) {
      <h1 tabindex="-1">{{ m.title }}</h1>
      @if (m.objectives) { <p class="objective">{{ m.objectives }}</p> }

      @if (!m.lessons || m.lessons.length === 0) {
        <p class="empty-note">No lessons have been published for this module yet.</p>
      } @else {
        <div class="lessons">
          @for (l of m.lessons; track l.lessonId) {
            <app-lesson-summary-row [lesson]="l" />
          }
        </div>
      }
    }
  `
})
export class ModuleDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentLearningApiService);
  private destroyRef = inject(DestroyRef);

  studentId = signal<number>(0);
  classId = signal<number>(0);
  moduleId = signal<number>(0);
  module = signal<ModuleDetailDTO | null>(null);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);

  ngOnInit() {
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    const classId = Number(this.route.snapshot.paramMap.get('classId'));
    const moduleId = Number(this.route.snapshot.paramMap.get('moduleId'));
    this.studentId.set(studentId);
    this.classId.set(classId);
    this.moduleId.set(moduleId);
    this.load(studentId, classId, moduleId);
  }

  private load(studentId: number, classId: number, moduleId: number) {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.moduleDetail(studentId, classId, moduleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: m => { this.loading.set(false); this.module.set(m); },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.loadError.set(toCurriculumUiError(err)); }
    });
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind, 'Curriculum Overview');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId(), ['/my-students', this.studentId(), 'classes', this.classId(), 'path']);
  }
}
