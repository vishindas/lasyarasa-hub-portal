import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentLearningApiService } from '../../../core/services/student-learning-api.service';
import { StudentLearningContextService } from '../../../core/services/student-learning-context.service';
import { LearningPathDTO } from '../../../core/models/student-learning.model';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../student-learning-recovery.util';
import { ModuleSummaryRowComponent } from './module-summary-row';

/**
 * Part II.2. Always scoped to one selected class (the Class Picker, when
 * needed, intercepts before this route ever renders -- see student-
 * learning.routes.ts's canActivate). No numeric progress bar -- static
 * curriculum header text plus per-module state chips only.
 */
@Component({
  selector: 'app-learning-path',
  standalone: true,
  imports: [MatProgressSpinnerModule, CurriculumMessageComponent, ModuleSummaryRowComponent],
  styles: [`
    /* UX-01 refinement: widened from 720px -- container only, the module
       list itself is unchanged ahead of its own future redesign slice. */
    :host { display: block; max-width: 1200px; margin: 0 auto; padding: 24px 20px 48px; }
    /* UX-3: Fraunces retired here (Deliverable 3 -- the serif wordmark is
       the only surviving exception, per UX-1), matching Provider's
       page-header h2 pattern (1.4rem/600 weight sans-serif). */
    h1 { font-size: 1.4rem; font-weight: 600; color: var(--sp-text, #1a1f36); margin: 0 0 4px; }
    .level { color: var(--sp-text-muted, #52596b); font-size: 0.85rem; margin: 0 0 20px; }
    .modules { display: flex; flex-direction: column; gap: 10px; }
    .empty-note { color: var(--sp-text-muted, #52596b); }
  `],
  template: `
    <h1 tabindex="-1">{{ path()?.curriculumTitle || 'Curriculum Overview' }}</h1>
    @if (path()?.level) { <p class="level">{{ path()!.level }}</p> }

    @if (loadError(); as e) {
      <app-curriculum-message [error]="e" [backLabel]="recoveryLabel(e.kind)" (back)="onBack(e.kind)" />
    } @else if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (path(); as p) {
      @if (p.modules.length === 0) {
        <p class="empty-note">No modules have been released yet.</p>
      } @else {
        <div class="modules">
          @for (m of p.modules; track m.moduleId; let isFirst = $first) {
            <app-module-summary-row [module]="m" [isCurrent]="isCurrentModule(m, isFirst)" [studentId]="studentId()" [classId]="classId()" />
          }
        </div>
      }
    }
  `
})
export class LearningPathComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentLearningApiService);
  private context = inject(StudentLearningContextService);
  private destroyRef = inject(DestroyRef);

  studentId = signal<number>(0);
  classId = signal<number>(0);
  path = signal<LearningPathDTO | null>(null);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);

  ngOnInit() {
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    const classId = Number(this.route.snapshot.paramMap.get('classId'));
    this.studentId.set(studentId);
    this.classId.set(classId);
    // UX-2: however this screen is reached (the class-context bar's
    // switcher, My Classes, Dashboard's Learning Path card, or a direct
    // deep link), arriving here establishes it as the active class context
    // -- keeps the persistent switcher accurate without requiring every
    // caller to remember to set it themselves.
    this.context.selectClass(classId);
    this.load(studentId, classId);
  }

  private load(studentId: number, classId: number) {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.learningPath(studentId, classId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => { this.loading.set(false); this.path.set(p); },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.loadError.set(toCurriculumUiError(err)); }
    });
  }

  /** "Current" (Part II.2, judgment call): the first RELEASED module that isn't COMPLETED -- a UI-only derived label, not a backend value. */
  isCurrentModule(m: { moduleId: number; status: string }, _isFirst: boolean): boolean {
    const modules = this.path()?.modules ?? [];
    const firstReleased = modules.find(x => x.status === 'RELEASED');
    return !!firstReleased && firstReleased.moduleId === m.moduleId;
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind, 'Dashboard');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId());
  }
}
