import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentLearningApiService } from '../../../core/services/student-learning-api.service';
import { StudentLearningContextService } from '../../../core/services/student-learning-context.service';
import { StudentLearningHomeDTO } from '../../../core/models/student-learning.model';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../student-learning-recovery.util';

/**
 * Part II.1. Priorities 1 (assignment) and 4 (class schedule) evaluate
 * across every active class; priorities 2-3 (continue learning, learning
 * path summary) are scoped to one class and show the "choose a class"
 * prompt when the class is ambiguous (correction 1) -- Home itself is
 * deliberately NOT one of the routes the Class Picker intercepts (Part
 * II.1a's trigger condition explicitly lists only Learning Path/Module
 * Detail/Lesson Viewer).
 *
 * Priority 4 is architect-decision 2, corrected from the design's
 * "Next class" concept: no next-occurrence date/time is computed (the
 * data model has no structured recurrence to compute one from -- flagged
 * as gap #2 in the approved plan). This renders the raw StudentClassDTO
 * .schedule string as-is, labeled "Class schedule", one line per active
 * class; a null/blank schedule shows neutral unavailable copy, never an
 * invented date.
 *
 * Priority 1 (current assignment) is Slice 14's data (correction 3) -- no
 * Slice 11 endpoint exists for it. Rendered as its reserved, honestly-empty
 * placeholder position, exactly as Part VII.3 requires ("Home must degrade
 * honestly -- no fake/sample assignment data").
 */
@Component({
  selector: 'app-student-learning-home',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, CurriculumMessageComponent],
  styles: [`
    :host { display: block; max-width: 720px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.5rem; color: #1C1A16; margin: 0 0 20px; }
    .priority-card { margin-bottom: 14px; border-radius: 0 !important; border: 1px solid #E3DCC8 !important; }
    .priority-card a, .priority-card button { min-height: 44px; }
    .priority-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #A3762C; font-weight: 700; margin: 0 0 6px; }
    .schedule-line { margin: 2px 0; font-size: 0.9rem; color: #1C1A16; }
    .schedule-unavailable { color: #6B6255; font-style: italic; }
    .empty-note { color: #6B6255; font-size: 0.85rem; }
  `],
  template: `
    <h1 tabindex="-1">Home</h1>

    @if (loadError(); as e) {
      <app-curriculum-message [error]="e" [backLabel]="recoveryLabel(e.kind)" (back)="onBack(e.kind)" />
    } @else if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (home(); as h) {
      <!-- Priority 1: current assignment -- reserved placeholder only (Slice 14, correction 3). -->
      <mat-card class="priority-card">
        <mat-card-content>
          <p class="priority-title">Current assignment</p>
          <p class="empty-note">No open assignments right now.</p>
        </mat-card-content>
      </mat-card>

      @if (h.classSelectionRequired) {
        <mat-card class="priority-card">
          <mat-card-content>
            <p class="priority-title">Continue learning · Learning path</p>
            <p class="empty-note">This student has more than one active class.</p>
            <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'classes']">Choose a class</a>
          </mat-card-content>
        </mat-card>
      } @else if (h.selectedClassId != null) {
        @if (h.currentModule) {
          <mat-card class="priority-card">
            <mat-card-content>
              <p class="priority-title">Continue learning</p>
              <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'classes', h.selectedClassId, 'modules', h.currentModule.moduleId]">{{ h.currentModule.title }}</a>
            </mat-card-content>
          </mat-card>
        }
        @if (h.learningPath) {
          <mat-card class="priority-card">
            <mat-card-content>
              <p class="priority-title">Learning path</p>
              <a mat-stroked-button [routerLink]="['/my-students', studentId(), 'classes', h.selectedClassId, 'path']">{{ h.learningPath.curriculumTitle }}@if (h.learningPath.level) { &nbsp;·&nbsp;{{ h.learningPath.level }} }</a>
            </mat-card-content>
          </mat-card>
        }
        @if (!h.currentModule && !h.learningPath) {
          <mat-card class="priority-card">
            <mat-card-content>
              <p class="priority-title">Learning path</p>
              <p class="empty-note">No curriculum assigned yet for this class.</p>
            </mat-card-content>
          </mat-card>
        }
      }

      <!-- Priority 4: class schedule, aggregated across all active classes (architect decision 2 -- raw schedule text only, never a computed date). -->
      <mat-card class="priority-card">
        <mat-card-content>
          <p class="priority-title">Class schedule</p>
          @for (c of classes(); track c.classId) {
            @if (c.schedule) {
              <p class="schedule-line">{{ c.className }}: {{ c.schedule }}</p>
            } @else {
              <p class="schedule-line schedule-unavailable">{{ c.className }}: schedule unavailable</p>
            }
          }
        </mat-card-content>
      </mat-card>
    }
  `
})
export class StudentLearningHomeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentLearningApiService);
  private destroyRef = inject(DestroyRef);
  context = inject(StudentLearningContextService);

  studentId = signal<number>(0);
  home = signal<StudentLearningHomeDTO | null>(null);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);

  classes = computed(() => this.context.classes());

  ngOnInit() {
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    this.studentId.set(studentId);
    this.load(studentId);
  }

  private load(studentId: number) {
    this.loading.set(true);
    this.loadError.set(null);
    const classId = this.context.selectedClassId() ?? undefined;
    this.api.home(studentId, classId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: h => {
        this.loading.set(false);
        this.home.set(h);
        if (h.selectedClassId != null) this.context.selectClass(h.selectedClassId);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadError.set(toCurriculumUiError(err));
      }
    });
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind);
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId());
  }
}
