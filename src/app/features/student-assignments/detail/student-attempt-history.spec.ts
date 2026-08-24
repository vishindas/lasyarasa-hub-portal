import { TestBed } from '@angular/core/testing';
import { StudentAttemptHistoryComponent } from './student-attempt-history';
import { AttemptDTO, StudentAssignmentQuestionDTO } from '../data-access/student-assignment.model';

const questions: StudentAssignmentQuestionDTO[] = [
  { id: 1, questionType: 'SHORT_TEXT', prompt: 'Explain?', questionOrder: 1, maxSelections: null, options: [], editable: false },
  { id: 2, questionType: 'SINGLE_CHOICE', prompt: 'Pick?', questionOrder: 2, maxSelections: null, editable: false,
    options: [{ id: 10, optionLabel: 'Alpha', optionOrder: 1 }, { id: 11, optionLabel: 'Beta', optionOrder: 2 }] }
];

const attempt1: AttemptDTO = {
  attemptNumber: 1, submittedAt: '2026-01-01T00:00:00', reviewDecision: 'REVISION_REQUESTED', reviewedAt: '2026-01-02T00:00:00', reviewedBy: 9,
  feedback: 'Please expand.',
  responses: [{ questionId: 1, outcome: 'NEEDS_REVISION', textResponse: 'first answer', selectedOptionIds: [] },
              { questionId: 2, outcome: 'AUTO_CORRECT', textResponse: null, selectedOptionIds: [10] }]
};
const attempt2: AttemptDTO = {
  attemptNumber: 2, submittedAt: '2026-01-03T00:00:00', reviewDecision: null, reviewedAt: null, reviewedBy: null, feedback: null,
  responses: [{ questionId: 1, outcome: null, textResponse: 'second, expanded answer', selectedOptionIds: [] },
              { questionId: 2, outcome: 'AUTO_CORRECT', textResponse: null, selectedOptionIds: [10] }]
};

function setup(history: AttemptDTO[], currentAttemptNumber: number) {
  TestBed.configureTestingModule({ imports: [StudentAttemptHistoryComponent] });
  const fixture = TestBed.createComponent(StudentAttemptHistoryComponent);
  fixture.componentRef.setInput('history', history);
  fixture.componentRef.setInput('questions', questions);
  fixture.componentRef.setInput('currentAttemptNumber', currentAttemptNumber);
  fixture.detectChanges();
  return fixture;
}

describe('StudentAttemptHistoryComponent', () => {
  it('shows only attempts strictly before the current one, oldest first', () => {
    const fixture = setup([attempt1, attempt2], 2);
    const comp = fixture.componentInstance;
    expect(comp.pastAttempts().map(a => a.attemptNumber)).toEqual([1]);
  });

  it('renders each historical attempt\'s own actual response content, distinct per attempt', () => {
    const fixture = setup([attempt1, attempt2], 3);
    const comp = fixture.componentInstance;
    expect(comp.answerText(questions[0], attempt1)).toBe('first answer');
    expect(comp.answerText(questions[0], attempt2)).toBe('second, expanded answer');
  });

  it('renders a choice answer by option label, never a raw id', () => {
    const fixture = setup([attempt1], 2);
    expect(fixture.componentInstance.answerText(questions[1], attempt1)).toBe('Alpha');
  });

  it('shows the outcome badge from that specific attempt\'s response', () => {
    const fixture = setup([attempt1], 2);
    expect(fixture.componentInstance.outcomeFor(questions[0], attempt1)).toEqual({ label: 'Needs revision', tone: 'warning' });
  });

  it('shows the attempt-level feedback for a past attempt', () => {
    const fixture = setup([attempt1], 2);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Please expand.');
  });

  it('renders nothing when there is no earlier attempt (current is attempt 1)', () => {
    const fixture = setup([attempt1], 1);
    expect(fixture.componentInstance.pastAttempts()).toEqual([]);
  });
});
