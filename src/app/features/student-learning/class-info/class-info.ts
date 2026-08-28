import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentLearningApiService } from '../../../core/services/student-learning-api.service';
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
 */
@Component({
  selector: 'app-class-info',
  standalone: true,
  imports: [MatProgressSpinnerModule, CurriculumMessageComponent, ModuleSummaryRowComponent],
  styles: [`
    :host { display: block; max-width: 720px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.5rem; color: #1C1A16; margin: 0 0 4px; }
    .subtitle { color: #6B6255; font-size: 0.9rem; margin: 0 0 20px; }
    dl { margin: 0 0 28px; }
    dt { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #A3762C; font-weight: 700; margin-top: 14px; }
    dd { margin: 2px 0 0; color: #1C1A16; }
    .section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #A3762C; font-weight: 700; margin: 0 0 10px; }
    .modules { display: flex; flex-direction: column; gap: 10px; }
    .empty-note { color: #6B6255; font-size: 0.9rem; }
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

      <dl>
        @if (i.danceStyleName) {
          <dt>Dance Style</dt><dd>{{ i.danceStyleName }}</dd>
        }
        @if (i.ageGroupName) {
          <dt>Age Group</dt><dd>{{ i.ageGroupName }}</dd>
        }
        <dt>Schedule</dt><dd>{{ i.schedule || 'Not available' }}</dd>
        @if (i.curriculumTitle) {
          <dt>Curriculum</dt><dd>{{ i.curriculumTitle }}@if (i.level) { &nbsp;·&nbsp;{{ i.level }} }</dd>
        }
      </dl>

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
      next: i => { this.loading.set(false); this.info.set(i); },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.loadError.set(toCurriculumUiError(err)); }
    });

    this.api.learningPath(studentId, classId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => { this.modulesLoading.set(false); this.modules.set(p.modules); },
      error: (err: HttpErrorResponse) => { this.modulesLoading.set(false); this.modulesError.set(toCurriculumUiError(err)); }
    });
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind, 'Home');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId());
  }
}
