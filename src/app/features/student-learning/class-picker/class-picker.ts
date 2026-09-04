import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StudentLearningApiService } from '../../../core/services/student-learning-api.service';
import { StudentLearningContextService } from '../../../core/services/student-learning-context.service';
import { StudentClassDTO } from '../../../core/models/student-learning.model';
import { CurriculumMessageComponent } from '../../../shared/curriculum/curriculum-message';
import { CurriculumUiError, toCurriculumUiError } from '../../../core/services/curriculum-api-error.util';
import { backLabelFor, navigateForRecovery } from '../student-learning-recovery.util';

interface ClassPickerCard {
  classId: number;
  className: string;
  schedule: string | null;
  /** 'loading' | resolved title string | 'none' (confirmed no curriculum) | 'unavailable' (that one Class Info call failed -- correction 3: never blanks the whole picker) */
  curriculumState: 'loading' | 'none' | 'unavailable' | string;
}

/**
 * Part II.1a, new in v1.1 (correction 1). Trigger condition (enforced by
 * the caller, Dashboard/route guards feeding this route, not here): more
 * than one active class and none selected yet. Never shown for a single-
 * or zero-class student.
 *
 * UX-2: "My Classes" per the architect's approved Class-Context-Selector-
 * vs-My-Classes model -- this screen is the intentional overview/directory
 * of the student's accessible classes, distinct from the persistent
 * class-context bar's quick-switch dropdown (rendered by the shell, not
 * this component). Picking a card here establishes that same active
 * context (via StudentLearningContextService.selectClass) before
 * navigating, so the two are never out of sync with each other -- not two
 * competing "choose a class" mechanisms, one directory and one switcher
 * sharing the same underlying selection.
 *
 * Curriculum-name enrichment is architect decision 3, MVP-accepted with
 * requirements: parallel (forkJoin, not sequential .subscribe-chaining),
 * bounded to exactly the classes the trusted /learning/classes endpoint
 * returned, one failure never blanks the whole screen (each inner call is
 * caught and degrades to its own card's "unavailable" state), class
 * name/schedule always come from StudentClassDTO (never from the
 * per-class Class Info call, which is enrichment only), no caching across
 * navigations (a fresh forkJoin runs on every ngOnInit -- this component
 * is destroyed and recreated on every studentId route change, so nothing
 * needs to be manually invalidated), and takeUntilDestroyed cancels any
 * in-flight enrichment call if the student is switched before it resolves.
 */
@Component({
  selector: 'app-class-picker',
  standalone: true,
  imports: [MatCardModule, MatProgressSpinnerModule, CurriculumMessageComponent],
  styles: [`
    /* UX-01 refinement: widened from 720px -- container only, the card list
       itself is unchanged ahead of its own future redesign slice. */
    :host { display: block; max-width: 1200px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 1.5rem; color: #1C1A16; margin: 0 0 20px; }
    .cards { display: grid; gap: 12px; }
    .class-card { border-radius: 8px !important; border: 1px solid #E3DCC8 !important; min-height: 44px; cursor: pointer; }
    .class-card:focus-visible, .class-card:hover { outline: 2px solid #7A5419; outline-offset: 2px; }
    .class-name { margin: 0 0 4px; font-weight: 700; color: #1C1A16; }
    .schedule { margin: 0 0 6px; font-size: 0.85rem; color: #6B6255; }
    .curriculum-line { font-size: 0.8rem; color: #6B6255; }
  `],
  template: `
    <h1 tabindex="-1">Choose a class</h1>
    @if (loadError(); as e) {
      <app-curriculum-message [error]="e" [backLabel]="recoveryLabel(e.kind)" (back)="onBack(e.kind)" />
    } @else if (loading()) {
      <mat-spinner diameter="36" />
    } @else {
      <div class="cards">
        @for (c of cards(); track c.classId) {
          <mat-card class="class-card" tabindex="0" role="button" [attr.aria-label]="'Choose ' + c.className" (click)="choose(c.classId)" (keydown.enter)="choose(c.classId)" (keydown.space)="choose(c.classId)">
            <mat-card-content>
              <p class="class-name">{{ c.className }}</p>
              @if (c.schedule) { <p class="schedule">{{ c.schedule }}</p> }
              <p class="curriculum-line">
                @if (c.curriculumState === 'loading') { Loading curriculum… }
                @else if (c.curriculumState === 'none') { No curriculum assigned yet }
                @else if (c.curriculumState === 'unavailable') { Curriculum information unavailable right now }
                @else { {{ c.curriculumState }} }
              </p>
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `
})
export class ClassPickerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(StudentLearningApiService);
  private context = inject(StudentLearningContextService);
  private destroyRef = inject(DestroyRef);

  studentId = signal<number>(0);
  cards = signal<ClassPickerCard[]>([]);
  loading = signal(true);
  loadError = signal<CurriculumUiError | null>(null);

  ngOnInit() {
    const studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    this.studentId.set(studentId);
    this.load(studentId);
  }

  private load(studentId: number) {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.classes(studentId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: classes => {
        this.loading.set(false);
        this.seedCards(classes);
        this.enrich(studentId, classes);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadError.set(toCurriculumUiError(err));
      }
    });
  }

  private seedCards(classes: StudentClassDTO[]) {
    this.cards.set(classes.map(c => ({ classId: c.classId, className: c.className, schedule: c.schedule, curriculumState: 'loading' as const })));
  }

  /** Correction/architect decision 3: parallel, bounded to `classes`, one failure never blanks the screen. */
  private enrich(studentId: number, classes: StudentClassDTO[]) {
    const calls = classes.map(c =>
      this.api.classInfo(studentId, c.classId).pipe(
        catchError(() => of(null))
      )
    );
    forkJoin(calls).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(results => {
      this.cards.update(cards => cards.map((card, i) => {
        const info = results[i];
        if (info === null) return { ...card, curriculumState: 'unavailable' };
        return { ...card, curriculumState: info.curriculumTitle ? `${info.curriculumTitle}${info.level ? ' · ' + info.level : ''}` : 'none' };
      }));
    });
  }

  choose(classId: number) {
    // UX-2: establishes the active class context (the same state the
    // persistent class-context bar reads/writes) before navigating, so
    // picking a class from this directory and picking one from the
    // switcher dropdown are never out of sync with each other.
    this.context.selectClass(classId);
    this.router.navigate(['/my-students', this.studentId(), 'classes', classId, 'path']);
  }

  recoveryLabel(kind: CurriculumUiError['kind']): string | null {
    return backLabelFor(kind, 'Dashboard');
  }

  onBack(kind: CurriculumUiError['kind']) {
    navigateForRecovery(this.router, kind, this.studentId());
  }
}
