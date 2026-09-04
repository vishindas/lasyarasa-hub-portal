import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentLearningApiService } from '../../../core/services/student-learning-api.service';
import { StudentLearningContextService } from '../../../core/services/student-learning-context.service';
import { ClassInfoDTO, LearningPathDTO } from '../../../core/models/student-learning.model';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../student-learning-recovery.util';
import { ModuleSummaryRowComponent } from '../learning-path/module-summary-row';

/**
 * D2: Class Details -- the full destination the original "light stub"
 * (Foundation §10.2) anticipated, replacing it in place at the same route
 * (classes/:classId/class-info) rather than adding a parallel screen.
 * Reuses exactly two already-deployed endpoints, no new backend:
 * classInfo() for the class-level facts (name, schedule, curriculum
 * title/level, school name) and learningPath() for the released-module
 * summary (reusing ModuleSummaryRowComponent unchanged -- same
 * chips/navigation/accessibility contract as the Learning Path screen).
 *
 * Dance style and age group (danceStyleName/ageGroupName) are the D2
 * backend companion's addition to classInfo() -- both are display-only
 * labels, absent (never rendered, matching the existing Curriculum-row
 * pattern) whenever the class has no such value set. No internal id
 * (danceStyleId/ageGroupId) is ever present on the DTO to begin with.
 *
 * The two API calls are independent, not forkJoin'd: a classInfo()
 * failure is the full-page error (the class's own name IS this page's
 * H1 -- without it there is nothing safe to show at all), while a
 * learningPath() failure degrades only the module-summary section,
 * matching Class Picker's established "one failure never blanks the
 * whole screen" precedent.
 *
 * D2 correction: the shell's class-context bar reads
 * StudentLearningContextService.selectedClassId(), which this screen
 * never used to touch -- so a direct URL (or a route the bar's own
 * switcher didn't drive) left the bar showing "Choose a class" even
 * though the H1 and route both name a specific one. Fixed the same way
 * Dashboard/Home already do it (student-dashboard-overview.ts,
 * student-learning-home.ts): sync context.selectClass() only inside
 * classInfo()'s SUCCESS handler, using the route's own classId. Success
 * here already proves authorization (getClassInfo() fails closed --
 * ClassContextUnavailableException/StudentContextUnavailableException
 * -- for any classId not genuinely one of this student's own active
 * classes), so this never exposes an unauthorized or invalid classId to
 * the shell; an error response leaves the context/bar untouched.
 */
@Component({
  selector: 'app-class-info',
  standalone: true,
  // UX-3 geometry correction: was `:host { max-width: 720px; margin: 0
  // auto; padding: 24px 20px 48px; }` -- same independently-centered
  // container class of bug UX-1 fixed on Dashboard and this slice just
  // fixed on Learning Path/Module Detail. `.sp-page` (styles-student.scss)
  // gives the same flush gutter, no local width cap.
  host: { class: 'sp-page' },
  imports: [MatProgressSpinnerModule, CurriculumMessageComponent, ModuleSummaryRowComponent],
  styles: [`
    /* UX-3: Fraunces retired (Deliverable 3), matching Provider's page-header
       h2 pattern; the gold uppercase eyebrow labels (dt/.section-title) move
       onto Provider's own .form-section-label gray-uppercase pattern
       (Deliverable 3, Learning Path/Class Details share this module). */
    h1 { font-size: 1.4rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 4px; }
    .subtitle { color: var(--sp-text-muted, #52596b); font-size: 0.85rem; margin: 0 0 20px; }
    /* UX-3 correction: the basic-information dt/dl list left a large
       unused horizontal area on desktop (a narrow left column of stacked
       label/value pairs, unrelated to the Released Modules width below).
       Replaced with a single full-width .sp-card (shared UX-1 card
       treatment) containing a responsive info-cell grid -- same safe-grid
       auto-fit/minmax pattern already used by Dashboard, tuned to a
       240px floor so it resolves to 4 cells across at desktop content
       widths (~1000px+), 2x2 at tablet/intermediate widths (~700-1000px),
       and a single column at mobile (~300-350px) -- verified at
       375/768/1024/1440px. With at most 4 possible cells (Dance
       Style/Age Group are conditional), auto-fit collapses any unused
       tracks so fewer-than-4 cells still fill the row evenly rather than
       leaving a stray narrow column. */
    .info-card { padding: 20px 24px; margin: 0 0 28px; }
    .info-grid { display: grid; gap: 16px 24px; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); }
    .info-label { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--sp-text-muted, #52596b); font-weight: 700; margin: 0 0 4px; }
    .info-value { margin: 0; color: var(--sp-text, #1a1f36); font-size: 0.95rem; font-weight: 500; }
    .section-title { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--sp-text-muted, #52596b); font-weight: 700; margin: 0 0 10px; }
    .modules { display: flex; flex-direction: column; gap: 10px; }
    .empty-note { color: var(--sp-text-muted, #52596b); font-size: 0.9rem; }
  `],
  template: `
    @if (loadError(); as e) {
      <h1 tabindex="-1">Class Details</h1>
      <app-curriculum-message [error]="e" [backLabel]="recoveryLabel(e.kind)" (back)="onBack(e.kind)" />
    } @else if (loading()) {
      <h1 tabindex="-1">Class Details</h1>
      <mat-spinner diameter="36" />
    } @else if (info(); as i) {
      <h1 tabindex="-1">{{ i.className }}</h1>
      @if (i.providerDisplayName) { <p class="subtitle">{{ i.providerDisplayName }}</p> }

      <div class="sp-card info-card">
        <div class="info-grid">
          @if (i.danceStyleName) {
            <div class="info-cell"><p class="info-label">Dance Style</p><p class="info-value">{{ i.danceStyleName }}</p></div>
          }
          @if (i.ageGroupName) {
            <div class="info-cell"><p class="info-label">Age Group</p><p class="info-value">{{ i.ageGroupName }}</p></div>
          }
          <div class="info-cell"><p class="info-label">Schedule</p><p class="info-value">{{ i.schedule || 'Not available' }}</p></div>
          @if (i.curriculumTitle) {
            <div class="info-cell"><p class="info-label">Curriculum</p><p class="info-value">{{ i.curriculumTitle }}@if (i.level) { &nbsp;·&nbsp;{{ i.level }} }</p></div>
          }
        </div>
      </div>

      <p class="section-title">Released modules</p>
      @if (modulesError()) {
        <p class="empty-note">Module details aren't available right now.</p>
      } @else if (modulesLoading()) {
        <mat-spinner diameter="28" />
      } @else if (modules().length === 0) {
        <p class="empty-note">No modules have been released yet.</p>
      } @else {
        <div class="modules">
          @for (m of modules(); track m.moduleId) {
            <app-module-summary-row [module]="m" [isCurrent]="false" [studentId]="studentId()" [classId]="classId()" />
          }
        </div>
      }
    }
  `
})
export class ClassInfoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentLearningApiService);
  private context = inject(StudentLearningContextService);
  private destroyRef = inject(DestroyRef);

  studentId = signal<number>(0);
  classId = signal<number>(0);
  info = signal<ClassInfoDTO | null>(null);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);

  modules = signal<LearningPathDTO['modules']>([]);
  modulesLoading = signal(true);
  modulesError = signal<CurriculumUiError | null>(null);

  ngOnInit() {
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    const classId = Number(this.route.snapshot.paramMap.get('classId'));
    this.studentId.set(studentId);
    this.classId.set(classId);

    this.api.classInfo(studentId, classId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: i => {
        this.loading.set(false);
        this.info.set(i);
        // Success proves classId is genuinely one of this student's own
        // active classes (see class-level doc comment) -- safe to sync.
        this.context.selectClass(classId);
      },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.loadError.set(toCurriculumUiError(err)); }
    });

    this.api.learningPath(studentId, classId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => { this.modulesLoading.set(false); this.modules.set(p.modules); },
      error: (err: HttpErrorResponse) => { this.modulesLoading.set(false); this.modulesError.set(toCurriculumUiError(err)); }
    });
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind, 'Dashboard');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId());
  }
}
