import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentAssignmentDetailComponent } from './student-assignment-detail';
import { StudentAssignmentDetailDTO } from '../data-access/student-assignment.model';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const base = `${environment.apiUrl}/account/students/201/learning/assignments`;
const DETAIL_URL = `${base}/5001`;
const ATTEMPTS_URL = `${base}/5001/attempts`;
const DRAFTS_URL = `${base}/5001/draft`;

function detail(overrides: Partial<StudentAssignmentDetailDTO>): StudentAssignmentDetailDTO {
  return {
    id: 5001, instanceId: 6001, title: 'Quiz', dueAt: '2026-12-01T00:00:00', status: 'DRAFT',
    attemptNumber: 0, rowVersion: 0, instanceStatus: 'ACTIVE',
    questions: [
      { id: 1, questionType: 'SHORT_TEXT', prompt: 'Explain?', questionOrder: 1, maxSelections: null, options: [], editable: true }
    ],
    ...overrides
  };
}

describe('StudentAssignmentDetailComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [StudentAssignmentDetailComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '201', studentAssignmentId: '5001' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentAssignmentDetailComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('DRAFT, never started -> "Start" CTA; fetches drafts to determine started state', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({ status: 'DRAFT' }));
    httpMock.expectOne(DRAFTS_URL).flush([]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Start');
    expect(text).not.toContain('Continue');
  });

  it('DRAFT with an existing draft row -> "Continue" CTA', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({ status: 'DRAFT' }));
    httpMock.expectOne(DRAFTS_URL).flush([{ questionId: 1, textResponse: 'partial', selectedOptionIds: [], rowVersion: 0 }]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Continue');
  });

  it('WITHDRAWN instance -> S15 unavailable state, regardless of status, no CTA', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({ status: 'DRAFT', instanceStatus: 'WITHDRAWN' }));
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("isn't available right now");
    expect(text).not.toContain('Start');
    httpMock.expectNone(DRAFTS_URL);
  });

  it('SUBMITTED -> read-only, shows outcome badges from the current attempt, never editable inputs', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({
      status: 'SUBMITTED', attemptNumber: 1,
      questions: [{ id: 1, questionType: 'SHORT_TEXT', prompt: 'Explain?', questionOrder: 1, maxSelections: null, options: [], editable: false }]
    }));
    httpMock.expectOne(ATTEMPTS_URL).flush([
      { attemptNumber: 1, submittedAt: '2026-01-01T00:00:00', reviewDecision: null, reviewedAt: null, reviewedBy: null, feedback: null,
        responses: [{ questionId: 1, outcome: null, textResponse: 'My answer', selectedOptionIds: [] }] }
    ]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("awaiting your teacher's review");
    expect(text).toContain('My answer');
    expect(fixture.nativeElement.querySelectorAll('input, textarea').length).toBe(0);
  });

  it('SUBMITTED with attemptNumber > 1 -> "Resubmitted" wording', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({ status: 'SUBMITTED', attemptNumber: 2 }));
    httpMock.expectOne(ATTEMPTS_URL).flush([
      { attemptNumber: 1, submittedAt: '2026-01-01T00:00:00', reviewDecision: 'REVISION_REQUESTED', reviewedAt: '2026-01-02T00:00:00', reviewedBy: 9, feedback: 'fix', responses: [] },
      { attemptNumber: 2, submittedAt: '2026-01-03T00:00:00', reviewDecision: null, reviewedAt: null, reviewedBy: null, feedback: null, responses: [] }
    ]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Resubmitted');
  });

  it('VALIDATED -> success banner + outcome badges, no CTA', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({
      status: 'VALIDATED', attemptNumber: 1,
      questions: [{ id: 1, questionType: 'SHORT_TEXT', prompt: 'Explain?', questionOrder: 1, maxSelections: null, options: [], editable: false }]
    }));
    httpMock.expectOne(ATTEMPTS_URL).flush([
      { attemptNumber: 1, submittedAt: '2026-01-01T00:00:00', reviewDecision: 'VALIDATED', reviewedAt: '2026-01-02T00:00:00', reviewedBy: 9, feedback: null,
        responses: [{ questionId: 1, outcome: 'ACCEPTED', textResponse: 'Good answer', selectedOptionIds: [] }] }
    ]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Completed and validated');
    expect(text).toContain('Good answer');
    expect(text).toContain('Looks good');
  });

  it('REVISION_REQUESTED -> shared feedback shown once at top, flagged question visually marked, editability from the API flag only', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({
      status: 'REVISION_REQUESTED', attemptNumber: 1,
      questions: [
        { id: 1, questionType: 'SHORT_TEXT', prompt: 'Flagged Q', questionOrder: 1, maxSelections: null, options: [], editable: true },
        { id: 2, questionType: 'SHORT_TEXT', prompt: 'Not flagged Q', questionOrder: 2, maxSelections: null, options: [], editable: false }
      ]
    }));
    httpMock.expectOne(ATTEMPTS_URL).flush([
      { attemptNumber: 1, submittedAt: '2026-01-01T00:00:00', reviewDecision: 'REVISION_REQUESTED', reviewedAt: '2026-01-02T00:00:00', reviewedBy: 9,
        feedback: 'Please expand your answer.',
        responses: [{ questionId: 1, outcome: 'NEEDS_REVISION', textResponse: 'short', selectedOptionIds: [] }, { questionId: 2, outcome: 'ACCEPTED', textResponse: 'fine', selectedOptionIds: [] }] }
    ]);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    const text = html.textContent ?? '';
    // Shown exactly once, not duplicated per question.
    expect(text.match(/Please expand your answer\./g)?.length).toBe(1);
    expect(text).toContain('Flagged for revision');
    expect(text).toContain('Already validated — no changes needed');
    expect(html.querySelectorAll('.q-card.flagged').length).toBe(1);
    expect(text).toContain('Revise and resubmit');
  });

  it('CLOSED with a real attempt (attemptNumber > 0) -> read-only from the last attempt', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({ status: 'CLOSED', attemptNumber: 1 }));
    httpMock.expectOne(ATTEMPTS_URL).flush([
      { attemptNumber: 1, submittedAt: '2026-01-01T00:00:00', reviewDecision: null, reviewedAt: null, reviewedBy: null, feedback: null,
        responses: [{ questionId: 1, outcome: null, textResponse: 'closed answer', selectedOptionIds: [] }] }
    ]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Closed');
    expect(text).toContain('closed answer');
  });

  it('CLOSED, never submitted, HAD draft answers -> shows the draft content read-only (the approved S14 distinction via GET draft)', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({ status: 'CLOSED', attemptNumber: 0 }));
    httpMock.expectOne(DRAFTS_URL).flush([{ questionId: 1, textResponse: 'unsubmitted draft answer', selectedOptionIds: [], rowVersion: 0 }]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('as you left them; they were not reviewed');
    expect(text).toContain('unsubmitted draft answer');
  });

  it('CLOSED, never submitted, NO draft answers -> "never started" copy, no question list', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({ status: 'CLOSED', attemptNumber: 0 }));
    httpMock.expectOne(DRAFTS_URL).flush([]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('before you started this assignment');
    expect(text).not.toContain('Explain?');
  });

  it('renders single/multiple-choice answers by option LABEL, never a raw option id', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({
      status: 'SUBMITTED', attemptNumber: 1,
      questions: [{ id: 1, questionType: 'SINGLE_CHOICE', prompt: 'Pick?', questionOrder: 1, maxSelections: null, editable: false,
        options: [{ id: 100, optionLabel: 'Alpha', optionOrder: 1 }, { id: 101, optionLabel: 'Beta', optionOrder: 2 }] }]
    }));
    httpMock.expectOne(ATTEMPTS_URL).flush([
      { attemptNumber: 1, submittedAt: '2026-01-01T00:00:00', reviewDecision: null, reviewedAt: null, reviewedBy: null, feedback: null,
        responses: [{ questionId: 1, outcome: 'AUTO_CORRECT', textResponse: null, selectedOptionIds: [100] }] }
    ]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Alpha');
    expect(text).not.toContain('100');
  });

  it('answer-key isolation: rendered DOM never contains isCorrect/correctOption, even with a fully populated SINGLE_CHOICE question and graded outcome', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail({
      status: 'VALIDATED', attemptNumber: 1,
      questions: [{ id: 1, questionType: 'SINGLE_CHOICE', prompt: 'Pick?', questionOrder: 1, maxSelections: null, editable: false,
        options: [{ id: 100, optionLabel: 'Alpha', optionOrder: 1 }, { id: 101, optionLabel: 'Beta', optionOrder: 2 }] }]
    }));
    httpMock.expectOne(ATTEMPTS_URL).flush([
      { attemptNumber: 1, submittedAt: '2026-01-01T00:00:00', reviewDecision: 'VALIDATED', reviewedAt: '2026-01-02T00:00:00', reviewedBy: 9, feedback: null,
        responses: [{ questionId: 1, outcome: 'AUTO_CORRECT', textResponse: null, selectedOptionIds: [100] }] }
    ]);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).outerHTML.toLowerCase();
    expect(html).not.toContain('iscorrect');
    expect(html).not.toContain('correctoption');
  });
});
