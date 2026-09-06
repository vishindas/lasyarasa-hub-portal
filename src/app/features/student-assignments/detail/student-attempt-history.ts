import { Component, input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { AttemptDTO, StudentAssignmentQuestionDTO } from '../data-access/student-assignment.model';
import { outcomeChip, spToneClass } from '../shared/student-assignment-status.util';

/**
 * Sub-component of S10 (SUBMITTED read-only) -- only ever rendered when
 * earlier (non-current) attempts exist, i.e. history.length > 1. Renders
 * every historical attempt's own actual response content, oldest first,
 * per the accepted plan's explicit requirement -- now real, since Slice
 * 14.2 widened AttemptDTO.responses with textResponse/selectedOptionIds.
 */
@Component({
  selector: 'app-student-attempt-history',
  standalone: true,
  imports: [MatExpansionModule],
  styles: [`
    :host { display: block; margin: 12px 0; }
    mat-expansion-panel { background: var(--sp-tone-neutral-bg, #f1f5f9) !important; }
    /* UX-5: recolored onto the shared attention tone (same family the
       mode-banner and answer-screen revision feedback box now use). */
    .attempt-feedback { background: var(--sp-tone-attention-bg, #fef3c7); color: var(--sp-tone-attention-text, #92400e); border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; margin: 8px 0; font-size: 0.85rem; }
    .q-row { padding: 10px 0; border-bottom: 1px solid var(--sp-border-subtle, #edf0f7); }
    .q-row:last-child { border-bottom: none; }
    .q-prompt { font-weight: 600; margin: 0 0 4px; }
    .q-answer { color: var(--sp-text, #1a1f36); margin: 0; }
    /* UX-5/Finding 7: migrated onto the shared .sp-chip/.sp-tone-* system -- see student-assignment-summary.ts. */
    .chip-margin { margin-left: 6px; }
  `],
  template: `
    <mat-accordion multi>
      @for (attempt of pastAttempts(); track attempt.attemptNumber) {
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Attempt {{ attempt.attemptNumber }}</mat-panel-title>
          </mat-expansion-panel-header>
          @if (attempt.feedback) {
            <div class="attempt-feedback">{{ attempt.feedback }}</div>
          }
          @for (q of questions(); track q.id) {
            <div class="q-row">
              <p class="q-prompt">{{ q.prompt }}</p>
              <p class="q-answer">
                {{ answerText(q, attempt) }}
                @if (outcomeFor(q, attempt); as o) {
                  <span class="sp-chip chip-margin {{ spToneClass(o.tone) }}">{{ o.label }}</span>
                }
              </p>
            </div>
          }
        </mat-expansion-panel>
      }
    </mat-accordion>
  `
})
export class StudentAttemptHistoryComponent {
  protected readonly spToneClass = spToneClass;
  history = input.required<AttemptDTO[]>();
  questions = input.required<StudentAssignmentQuestionDTO[]>();
  currentAttemptNumber = input.required<number>();

  pastAttempts(): AttemptDTO[] {
    return this.history()
      .filter(a => a.attemptNumber < this.currentAttemptNumber())
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
  }

  answerText(q: StudentAssignmentQuestionDTO, attempt: AttemptDTO): string {
    const r = attempt.responses.find(x => x.questionId === q.id);
    if (!r) return 'Not answered.';
    if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') {
      const labels = r.selectedOptionIds
        .map(id => q.options.find(o => o.id === id)?.optionLabel)
        .filter((l): l is string => !!l);
      return labels.length ? labels.join(', ') : 'Not answered.';
    }
    return r.textResponse ?? 'Not answered.';
  }

  outcomeFor(q: StudentAssignmentQuestionDTO, attempt: AttemptDTO) {
    const r = attempt.responses.find(x => x.questionId === q.id);
    return r ? outcomeChip(r.outcome) : null;
  }
}
