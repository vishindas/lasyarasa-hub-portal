import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentLearningApiService } from '../../../core/services/student-learning-api.service';
import { ClassInfoDTO } from '../../../core/models/student-learning.model';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../student-learning-recovery.util';

/** Light stub per Foundation §10.2 -- full page-specific design left open for a later slice (Part IX). */
@Component({
  selector: 'app-class-info',
  standalone: true,
  imports: [MatProgressSpinnerModule, CurriculumMessageComponent],
  styles: [`
    :host { display: block; max-width: 640px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.4rem; color: #1C1A16; margin: 0 0 16px; }
    dl { margin: 0; }
    dt { font-size: 0.75rem; text-transform: uppercase; color: #6B6255; margin-top: 12px; }
    dd { margin: 2px 0 0; color: #1C1A16; }
  `],
  template: `
    <h1 tabindex="-1">Class Info</h1>
    @if (loadError(); as e) {
      <app-curriculum-message [error]="e" [backLabel]="recoveryLabel(e.kind)" (back)="onBack(e.kind)" />
    } @else if (loading()) {
      <mat-spinner diameter="36" />
    } @else if (info(); as i) {
      <dl>
        <dt>Class</dt><dd>{{ i.className }}</dd>
        <dt>Schedule</dt><dd>{{ i.schedule || 'Not available' }}</dd>
        @if (i.curriculumTitle) { <dt>Curriculum</dt><dd>{{ i.curriculumTitle }}@if (i.level) { &nbsp;·&nbsp;{{ i.level }} }</dd> }
        @if (i.providerDisplayName) { <dt>Provider</dt><dd>{{ i.providerDisplayName }}</dd> }
      </dl>
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

  ngOnInit() {
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    const classId = Number(this.route.snapshot.paramMap.get('classId'));
    this.studentId.set(studentId);
    this.classId.set(classId);
    this.api.classInfo(studentId, classId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: i => { this.loading.set(false); this.info.set(i); },
      error: (err: HttpErrorResponse) => { this.loading.set(false); this.loadError.set(toCurriculumUiError(err)); }
    });
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind, 'Home');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId());
  }
}
