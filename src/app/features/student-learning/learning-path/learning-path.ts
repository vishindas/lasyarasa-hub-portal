import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentLearningApiService } from '../../../core/services/student-learning-api.service';
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
    :host { display: block; max-width: 720px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.5rem; color: #1C1A16; margin: 0 0 4px; }
    .level { color: #6B6255; font-size: 0.9rem; margin: 0 0 20px; }
    .modules { display: flex; flex-direction: column; gap: 10px; }
    .empty-note { color: #6B6255; }
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
    return backLabelFor(kind, 'Home');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId());
  }
}
