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
import { RelatedAssignmentRowComponent } from './related-assignment-row';
import { StudentAssignmentApiService } from '../../student-assignments/data-access/student-assignment-api.service';
import { StudentAssignmentSummaryDTO } from '../../student-assignments/data-access/student-assignment.model';
import { StudentAssignmentUiError, toStudentAssignmentUiError } from '../../student-assignments/data-access/student-assignment-ui-error.util';

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
  // UX-3 geometry correction: was `:host { max-width: 720px; margin: 0
  // auto; padding: 24px 20px 48px; }` -- same independently-centered
  // container class of bug UX-1 fixed on Dashboard and this slice just
  // fixed on Learning Path. `.sp-page` (styles-student.scss) gives the
  // same flush gutter, no local width cap.
  host: { class: 'sp-page' },
  imports: [RouterLink, MatProgressSpinnerModule, MatIconModule, CurriculumMessageComponent, LessonSummaryRowComponent, RelatedAssignmentRowComponent],
  styles: [`
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 0.85rem; color: var(--sp-text-muted, #52596b); margin-bottom: 8px; }
    /* 44px touch-target floor -- same fix as lesson-detail.ts's identical breadcrumb pattern. */
    .breadcrumb a { display: inline-flex; align-items: center; min-height: 44px; color: var(--sp-text-muted, #52596b); text-decoration: none; }
    .breadcrumb a:hover, .breadcrumb a:focus-visible { color: var(--sp-primary, #3d4ed8); outline: 2px solid var(--sp-primary, #3d4ed8); outline-offset: -2px; }
    /* UX-3: Fraunces retired (Deliverable 3), matching Provider's page-header h2 pattern. */
    h1 { font-size: 1.4rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 10px; }
    .objective { color: var(--sp-text, #1a1f36); margin: 0 0 20px; line-height: 1.5; }
    .lessons { display: flex; flex-direction: column; gap: 8px; }
    .empty-note { color: var(--sp-text-muted, #52596b); }
    /* UX-7C: Lessons and Related Assignments are two independent peer
       sections -- each renders its own loading/error/empty state, so a
       failure fetching one never touches the other (spec's explicit
       "assignment failure must not block lesson content" requirement). */
    .section-heading { font-size: 1.05rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 28px 0 10px; }
    .assignments { display: flex; flex-direction: column; gap: 8px; }
    .assignments-error { color: var(--sp-tone-negative-text, #991b1b); }
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

      <h2 class="section-heading">Lessons</h2>
      @if (!m.lessons || m.lessons.length === 0) {
        <p class="empty-note">No lessons have been published for this module yet.</p>
      } @else {
        <div class="lessons">
          @for (l of m.lessons; track l.lessonId) {
            <app-lesson-summary-row [lesson]="l" />
          }
        </div>
      }

      <h2 class="section-heading">Related Assignments</h2>
      @if (relatedAssignmentsLoading()) {
        <mat-spinner diameter="24" />
      } @else if (relatedAssignmentsError(); as ae) {
        <p class="assignments-error">{{ ae.message }}</p>
      } @else if (relatedAssignments().length === 0) {
        <p class="empty-note">No assignments for this module yet.</p>
      } @else {
        <div class="assignments">
          @for (a of relatedAssignments(); track a.id) {
            <app-related-assignment-row [assignment]="a" [studentId]="studentId()" />
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
  private assignmentApi = inject(StudentAssignmentApiService);
  private destroyRef = inject(DestroyRef);

  studentId = signal<number>(0);
  classId = signal<number>(0);
  moduleId = signal<number>(0);
  module = signal<ModuleDetailDTO | null>(null);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);

  relatedAssignments = signal<StudentAssignmentSummaryDTO[]>([]);
  relatedAssignmentsLoading = signal(true);
  relatedAssignmentsError = signal<StudentAssignmentUiError | null>(null);

  ngOnInit() {
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    const classId = Number(this.route.snapshot.paramMap.get('classId'));
    const moduleId = Number(this.route.snapshot.paramMap.get('moduleId'));
    this.studentId.set(studentId);
    this.classId.set(classId);
    this.moduleId.set(moduleId);
    this.load(studentId, classId, moduleId);
    this.loadRelatedAssignments(studentId, moduleId);
  }

  private load(studentId: number, classId: number, moduleId: number) {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.moduleDetail(studentId, classId, moduleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: m => { this.loading.set(false); this.module.set(m); },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.loadError.set(toCurriculumUiError(err)); }
    });
  }

  /**
   * UX-7C: deliberately a separate HTTP call/subscribe from load() above --
   * the assignments subsystem can be gated off independently of student
   * learning (a different feature flag entirely), and a failure here must
   * only ever affect this section's own state, never loading()/loadError()
   * (the module/lessons read this screen's primary content depends on).
   */
  private loadRelatedAssignments(studentId: number, moduleId: number) {
    this.relatedAssignmentsLoading.set(true);
    this.relatedAssignmentsError.set(null);
    this.assignmentApi.listByModule(studentId, moduleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => { this.relatedAssignmentsLoading.set(false); this.relatedAssignments.set(rows); },
      error: (err: HttpErrorResponse) => { this.relatedAssignmentsLoading.set(false); this.relatedAssignmentsError.set(toStudentAssignmentUiError(err)); }
    });
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind, 'Curriculum Overview');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId(), ['/my-students', this.studentId(), 'classes', this.classId(), 'path']);
  }
}
