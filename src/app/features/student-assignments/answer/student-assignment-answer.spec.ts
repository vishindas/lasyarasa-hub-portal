import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentAssignmentAnswerComponent } from './student-assignment-answer';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { StudentAssignmentDetailDTO } from '../data-access/student-assignment.model';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const base = `${environment.apiUrl}/account/students/201/learning/assignments`;
const DETAIL_URL = `${base}/5001`;
const DRAFTS_URL = `${base}/5001/draft`;
const ATTEMPTS_URL = `${base}/5001/attempts`;

function detailWithQuestions(status: StudentAssignmentDetailDTO['status'] = 'DRAFT'): StudentAssignmentDetailDTO {
  return {
    id: 5001, instanceId: 6001, title: 'Quiz', dueAt: '2026-12-01T00:00:00', status, attemptNumber: status === 'DRAFT' ? 0 : 1,
    rowVersion: 0, instanceStatus: 'ACTIVE',
    questions: [
      { id: 1, questionType: 'SHORT_TEXT', prompt: 'Explain?', questionOrder: 1, maxSelections: null, options: [], editable: true },
      { id: 2, questionType: 'SINGLE_CHOICE', prompt: 'Pick one?', questionOrder: 2, maxSelections: null, editable: true,
        options: [{ id: 10, optionLabel: 'A', optionOrder: 1 }, { id: 11, optionLabel: 'B', optionOrder: 2 }] },
      { id: 3, questionType: 'MULTIPLE_CHOICE', prompt: 'Pick up to 2?', questionOrder: 3, maxSelections: 2, editable: true,
        options: [{ id: 20, optionLabel: 'X', optionOrder: 1 }, { id: 21, optionLabel: 'Y', optionOrder: 2 }, { id: 22, optionLabel: 'Z', optionOrder: 3 }] },
      { id: 4, questionType: 'LONG_TEXT', prompt: 'Describe.', questionOrder: 4, maxSelections: null, options: [], editable: true }
    ]
  };
}

describe('StudentAssignmentAnswerComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [StudentAssignmentAnswerComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '201', studentAssignmentId: '5001' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentAssignmentAnswerComponent);
    fixture.detectChanges();
    return fixture;
  }

  function flushInitialLoad(fixture: ReturnType<typeof setup>, status: StudentAssignmentDetailDTO['status'] = 'DRAFT', drafts: unknown[] = []) {
    httpMock.expectOne(DETAIL_URL).flush(detailWithQuestions(status));
    if (status === 'REVISION_REQUESTED') {
      httpMock.expectOne(ATTEMPTS_URL).flush([{ attemptNumber: 1, submittedAt: '2026-01-01T00:00:00', reviewDecision: 'REVISION_REQUESTED', reviewedAt: '2026-01-02T00:00:00', reviewedBy: 9, feedback: 'Please expand.', responses: [] }]);
    }
    httpMock.expectOne(DRAFTS_URL).flush(drafts);
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('renders all 4 question types with their real inputs', () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('input[type=text]').length).toBe(1);
    expect(el.querySelectorAll('input[type=radio]').length).toBe(2);
    expect(el.querySelectorAll('input[type=checkbox]').length).toBe(3);
    expect(el.querySelectorAll('textarea').length).toBe(1);
  });

  it('prefills existing drafts on load', () => {
    const fixture = setup();
    flushInitialLoad(fixture, 'DRAFT', [{ questionId: 1, textResponse: 'already saved', selectedOptionIds: [], rowVersion: 2 }]);
    expect((fixture.nativeElement.querySelector('input[type=text]') as HTMLInputElement).value).toBe('already saved');
  });

  it('single-choice: saves immediately on change, no debounce, using the current rowVersion (null for a first-ever save)', () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    fixture.componentInstance.onSingleChoiceChange(fixture.componentInstance.questionStates()[1], 10);
    const req = httpMock.expectOne(`${base}/5001/draft/2`);
    expect(req.request.body).toEqual({ textResponse: null, selectedOptionIds: [10], expectedDraftRowVersion: null });
    req.flush({ questionId: 2, textResponse: null, selectedOptionIds: [10], rowVersion: 0 });
    fixture.detectChanges();
    expect(fixture.componentInstance.questionStates()[1].saveState).toBe('saved');
  });

  it('multiple-choice: enforces maxSelections by disabling further checkboxes once the cap is reached', () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    const qs = fixture.componentInstance.questionStates()[2];
    fixture.componentInstance.onMultiChoiceToggle(qs, 20, { target: { checked: true } } as unknown as Event);
    httpMock.expectOne(`${base}/5001/draft/3`).flush({ questionId: 3, textResponse: null, selectedOptionIds: [20], rowVersion: 0 });
    fixture.detectChanges();
    fixture.componentInstance.onMultiChoiceToggle(fixture.componentInstance.questionStates()[2], 21, { target: { checked: true } } as unknown as Event);
    httpMock.expectOne(`${base}/5001/draft/3`).flush({ questionId: 3, textResponse: null, selectedOptionIds: [20, 21], rowVersion: 1 });
    fixture.detectChanges();
    const boxes = Array.from(fixture.nativeElement.querySelectorAll('input[type=checkbox]')) as HTMLInputElement[];
    const thirdUnchecked = boxes.find(b => b.value === '22')!;
    expect(thirdUnchecked.disabled).toBe(true);
  });

  it('text input debounces ~800ms after the last keystroke before saving -- not on every keystroke', () => {
    vi.useFakeTimers();
    try {
      const fixture = setup();
      flushInitialLoad(fixture);
      const qs = fixture.componentInstance.questionStates()[0];
      fixture.componentInstance.onTextInput(qs, { target: { value: 'a' } } as unknown as Event);
      vi.advanceTimersByTime(300);
      fixture.componentInstance.onTextInput(qs, { target: { value: 'ab' } } as unknown as Event);
      vi.advanceTimersByTime(300);
      httpMock.expectNone(`${base}/5001/draft/1`); // still within debounce window, no save fired yet
      vi.advanceTimersByTime(800);
      const req = httpMock.expectOne(`${base}/5001/draft/1`);
      expect(req.request.body.textResponse).toBe('ab'); // the LATEST value, not the first keystroke
      req.flush({ questionId: 1, textResponse: 'ab', selectedOptionIds: [], rowVersion: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * Regression test for a real race condition found during manual browser
   * verification: two rapid, back-to-back changes to the SAME question
   * (e.g. two multiple-choice toggles) must not fire two overlapping PUTs
   * against the same stale rowVersion -- the second would incorrectly
   * conflict with the first's own in-flight, not-yet-applied write.
   */
  it('coalesces two rapid changes to the same question: only ONE request in flight at a time, never two concurrent overlapping PUTs, and the second change is not lost', () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    const qs = fixture.componentInstance.questionStates()[2];
    fixture.componentInstance.onMultiChoiceToggle(qs, 20, { target: { checked: true } } as unknown as Event);
    // The second toggle arrives while the first's request is already in flight
    // (real rowVersion not yet known) -- it must NOT fire a second, concurrent
    // request against the same stale rowVersion; it queues instead.
    fixture.componentInstance.onMultiChoiceToggle(fixture.componentInstance.questionStates()[2], 21, { target: { checked: true } } as unknown as Event);

    // Exactly one in-flight request at this point, carrying whatever state was
    // current when it was actually sent.
    const first = httpMock.expectOne(`${base}/5001/draft/3`);
    expect(first.request.body.selectedOptionIds).toEqual([20]);
    expect(first.request.body.expectedDraftRowVersion).toBeNull();
    first.flush({ questionId: 3, textResponse: null, selectedOptionIds: [20], rowVersion: 0 });
    fixture.detectChanges();

    // The queued second change is not lost -- a trailing save fires
    // automatically, using the just-updated rowVersion from the first
    // response, carrying the full latest selection.
    const second = httpMock.expectOne(`${base}/5001/draft/3`);
    expect(second.request.body.selectedOptionIds).toEqual([20, 21]);
    expect(second.request.body.expectedDraftRowVersion).toBe(0);
    second.flush({ questionId: 3, textResponse: null, selectedOptionIds: [20, 21], rowVersion: 1 });
    fixture.detectChanges();

    httpMock.expectNone(`${base}/5001/draft/3`);
    expect(fixture.componentInstance.questionStates()[2].saveState).toBe('saved');
  });

  it('a genuinely stale conflict (409) blocks further silent saves and requires an explicit Reload, never auto-retries or discards the answer', () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    const qs = fixture.componentInstance.questionStates()[1];
    fixture.componentInstance.onSingleChoiceChange(qs, 10);
    httpMock.expectOne(`${base}/5001/draft/2`).flush({ code: 'DRAFT_SAVE_CONFLICT' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.componentInstance.questionStates()[1].saveState).toBe('conflict');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reload');
  });

  it('a question with editable=false renders read-only, with no input at all', () => {
    const fixture = setup();
    const d = detailWithQuestions('REVISION_REQUESTED');
    d.questions[0].editable = false;
    httpMock.expectOne(DETAIL_URL).flush(d);
    httpMock.expectOne(ATTEMPTS_URL).flush([{ attemptNumber: 1, submittedAt: '2026-01-01T00:00:00', reviewDecision: 'REVISION_REQUESTED', reviewedAt: '2026-01-02T00:00:00', reviewedBy: 9, feedback: 'fix', responses: [] }]);
    httpMock.expectOne(DRAFTS_URL).flush([]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Already validated — no changes needed');
  });

  it('REVISION_REQUESTED: the shared feedback is shown once, and the seeded draft prefills the flagged question', () => {
    const fixture = setup();
    flushInitialLoad(fixture, 'REVISION_REQUESTED', [{ questionId: 1, textResponse: 'seeded prior answer', selectedOptionIds: [], rowVersion: 0 }]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.match(/Please expand\./g)?.length).toBe(1);
    expect((fixture.nativeElement.querySelector('input[type=text]') as HTMLInputElement).value).toBe('seeded prior answer');
  });

  it('disables every input under WRITE_FROZEN and shows the frozen note instead of Review answers', () => {
    const fixture = setup();
    const mode = TestBed.inject(ClassroomLiteModeService);
    mode.setWriteFrozen();
    flushInitialLoad(fixture);
    const inputs = Array.from(fixture.nativeElement.querySelectorAll('input, textarea')) as (HTMLInputElement | HTMLTextAreaElement)[];
    expect(inputs.every(i => i.disabled)).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Review answers');
  });

  it('Review answers flushes a pending debounced save before navigating, using the latest typed value', async () => {
    vi.useFakeTimers();
    try {
      const fixture = setup();
      flushInitialLoad(fixture);
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate');
      const qs = fixture.componentInstance.questionStates()[0];
      fixture.componentInstance.onTextInput(qs, { target: { value: 'partial' } } as unknown as Event);
      vi.advanceTimersByTime(300); // well before the 800ms debounce would otherwise fire
      const navPromise = fixture.componentInstance.goReview();
      const req = httpMock.expectOne(`${base}/5001/draft/1`);
      expect(req.request.body.textResponse).toBe('partial');
      req.flush({ questionId: 1, textResponse: 'partial', selectedOptionIds: [], rowVersion: 0 });
      await navPromise;
      expect(navSpy).toHaveBeenCalledWith(['/my-students', 201, 'assignments', 5001, 'review']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Save and exit flushes a pending debounced save before navigating away -- it genuinely saves before exiting', async () => {
    vi.useFakeTimers();
    try {
      const fixture = setup();
      flushInitialLoad(fixture);
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate');
      const qs = fixture.componentInstance.questionStates()[0];
      fixture.componentInstance.onTextInput(qs, { target: { value: 'exit-value' } } as unknown as Event);
      vi.advanceTimersByTime(200);
      const navPromise = fixture.componentInstance.onExitClick({ preventDefault: () => {} } as unknown as Event);
      const req = httpMock.expectOne(`${base}/5001/draft/1`);
      expect(req.request.body.textResponse).toBe('exit-value');
      req.flush({ questionId: 1, textResponse: 'exit-value', selectedOptionIds: [], rowVersion: 0 });
      await navPromise;
      expect(navSpy).toHaveBeenCalledWith(['/my-students', 201, 'assignments', 5001]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('navigating while a choice save is in flight with a trailing coalesced change waits for BOTH saves to settle, in order, before navigating', async () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    const qs = fixture.componentInstance.questionStates()[1];
    fixture.componentInstance.onSingleChoiceChange(qs, 10);
    // A trailing change arrives while the first save is still in flight.
    fixture.componentInstance.onSingleChoiceChange(fixture.componentInstance.questionStates()[1], 11);
    const navPromise = fixture.componentInstance.goReview();

    const first = httpMock.expectOne(`${base}/5001/draft/2`);
    expect(first.request.body.selectedOptionIds).toEqual([10]);
    first.flush({ questionId: 2, textResponse: null, selectedOptionIds: [10], rowVersion: 0 });
    fixture.detectChanges();

    const second = httpMock.expectOne(`${base}/5001/draft/2`);
    expect(second.request.body.selectedOptionIds).toEqual([11]);
    expect(second.request.body.expectedDraftRowVersion).toBe(0);
    expect(navSpy).not.toHaveBeenCalled(); // must not navigate until the trailing save also settles
    second.flush({ questionId: 2, textResponse: null, selectedOptionIds: [11], rowVersion: 1 });

    await navPromise;
    expect(navSpy).toHaveBeenCalledWith(['/my-students', 201, 'assignments', 5001, 'review']);
  });

  it('a failed (non-conflict) save prevents navigation, leaving the existing recovery UI in place', async () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    const qs = fixture.componentInstance.questionStates()[1];
    fixture.componentInstance.onSingleChoiceChange(qs, 10);
    const navPromise = fixture.componentInstance.goReview();
    httpMock.expectOne(`${base}/5001/draft/2`).flush({ code: 'UNKNOWN' }, { status: 500, statusText: 'Server Error' });
    await navPromise;
    fixture.detectChanges();
    expect(navSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.questionStates()[1].saveState).toBe('error');
    expect(fixture.componentInstance.navigating()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Couldn't save");
  });

  it('a stale conflict prevents navigation, leaving the existing recovery UI in place', async () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    const qs = fixture.componentInstance.questionStates()[1];
    fixture.componentInstance.onSingleChoiceChange(qs, 10);
    const navPromise = fixture.componentInstance.goReview();
    httpMock.expectOne(`${base}/5001/draft/2`).flush({ code: 'DRAFT_SAVE_CONFLICT' }, { status: 409, statusText: 'Conflict' });
    await navPromise;
    fixture.detectChanges();
    expect(navSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.questionStates()[1].saveState).toBe('conflict');
    expect(fixture.componentInstance.navigating()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reload');
  });

  it('once a question is in conflict, further edits issue no additional PUTs until Reload succeeds, after which a new edit uses the refreshed rowVersion', () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    const qs = fixture.componentInstance.questionStates()[1];
    fixture.componentInstance.onSingleChoiceChange(qs, 10);
    httpMock.expectOne(`${base}/5001/draft/2`).flush({ code: 'DRAFT_SAVE_CONFLICT' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.componentInstance.questionStates()[1].saveState).toBe('conflict');

    // Another change before Reload -- must not issue a new PUT for this question.
    fixture.componentInstance.onSingleChoiceChange(fixture.componentInstance.questionStates()[1], 11);
    httpMock.expectNone(`${base}/5001/draft/2`);

    // Reload rebuilds state fresh from the server, clearing the conflict.
    fixture.componentInstance.load();
    httpMock.expectOne(DETAIL_URL).flush(detailWithQuestions('DRAFT'));
    httpMock.expectOne(DRAFTS_URL).flush([{ questionId: 2, textResponse: null, selectedOptionIds: [10], rowVersion: 5 }]);
    fixture.detectChanges();
    expect(fixture.componentInstance.questionStates()[1].saveState).toBe('idle');

    // A new change now uses the refreshed rowVersion.
    fixture.componentInstance.onSingleChoiceChange(fixture.componentInstance.questionStates()[1], 11);
    const req = httpMock.expectOne(`${base}/5001/draft/2`);
    expect(req.request.body.expectedDraftRowVersion).toBe(5);
    req.flush({ questionId: 2, textResponse: null, selectedOptionIds: [11], rowVersion: 6 });
  });

  it('REVISION_REQUESTED: an attempt-history failure does not silently drop into an editable answer screen with no feedback -- shows retry, never fetches drafts on the failed read', () => {
    const fixture = setup();
    const d = detailWithQuestions('REVISION_REQUESTED');
    httpMock.expectOne(DETAIL_URL).flush(d);
    httpMock.expectOne(ATTEMPTS_URL).flush({ code: 'UNKNOWN' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    httpMock.expectNone(DRAFTS_URL);
    expect(fixture.nativeElement.querySelectorAll('input, textarea').length).toBe(0);
    expect(fixture.nativeElement.querySelector('button')?.textContent?.trim()).toBe('Retry');
  });

  it('retrying after a failed attempt-history read (REVISION_REQUESTED) re-fetches the complete required read set and renders normally', () => {
    const fixture = setup();
    const d = detailWithQuestions('REVISION_REQUESTED');
    httpMock.expectOne(DETAIL_URL).flush(d);
    httpMock.expectOne(ATTEMPTS_URL).flush({ code: 'UNKNOWN' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    fixture.componentInstance.load();
    httpMock.expectOne(DETAIL_URL).flush(d);
    httpMock.expectOne(ATTEMPTS_URL).flush([{ attemptNumber: 1, submittedAt: '2026-01-01T00:00:00', reviewDecision: 'REVISION_REQUESTED', reviewedAt: '2026-01-02T00:00:00', reviewedBy: 9, feedback: 'Please expand.', responses: [] }]);
    httpMock.expectOne(DRAFTS_URL).flush([]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Please expand.');
    expect(fixture.nativeElement.querySelectorAll('input, textarea').length).toBeGreaterThan(0);
  });

  it('a naturally-completed debounce save does not leave a stale timer entry that re-fires a redundant PUT on navigation', async () => {
    vi.useFakeTimers();
    try {
      const fixture = setup();
      flushInitialLoad(fixture);
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate');
      const qs = fixture.componentInstance.questionStates()[0];
      fixture.componentInstance.onTextInput(qs, { target: { value: 'final answer' } } as unknown as Event);
      vi.advanceTimersByTime(800); // let the debounce fire and complete on its own
      const req = httpMock.expectOne(`${base}/5001/draft/1`);
      expect(req.request.body.textResponse).toBe('final answer');
      req.flush({ questionId: 1, textResponse: 'final answer', selectedOptionIds: [], rowVersion: 0 });

      // Navigating afterward must not re-fire a save for the already-settled question.
      const navPromise = fixture.componentInstance.goReview();
      httpMock.expectNone(`${base}/5001/draft/1`);
      await navPromise;
      expect(navSpy).toHaveBeenCalledWith(['/my-students', 201, 'assignments', 5001, 'review']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a stale in-flight save response arriving BEFORE Reload completes does not overwrite the freshly reloaded state', () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    const comp = fixture.componentInstance;

    const qA = comp.questionStates()[1]; // SINGLE_CHOICE id 2 -- driven into conflict
    comp.onSingleChoiceChange(qA, 10);
    httpMock.expectOne(`${base}/5001/draft/2`).flush({ code: 'DRAFT_SAVE_CONFLICT' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(comp.questionStates()[1].saveState).toBe('conflict');

    const qB = comp.questionStates()[2]; // MULTIPLE_CHOICE id 3 -- still in flight when Reload starts
    comp.onMultiChoiceToggle(qB, 20, { target: { checked: true } } as unknown as Event);
    const bReq = httpMock.expectOne(`${base}/5001/draft/3`);

    comp.load(); // Reload, before B's response arrives
    const detailReq = httpMock.expectOne(DETAIL_URL);

    bReq.flush({ questionId: 3, textResponse: null, selectedOptionIds: [20], rowVersion: 0 }); // stale response arrives first, before either reload GET has resolved

    detailReq.flush(detailWithQuestions('DRAFT'));
    httpMock.expectOne(DRAFTS_URL).flush([{ questionId: 3, textResponse: null, selectedOptionIds: [], rowVersion: 9 }]);
    fixture.detectChanges();

    const freshB = comp.questionStates()[2];
    expect(freshB.saveState).toBe('idle');
    expect(freshB.selectedOptionIds).toEqual([]);
    expect(freshB.rowVersion).toBe(9);
    httpMock.expectNone(`${base}/5001/draft/3`); // no trailing PUT from the discarded stale response

    comp.onMultiChoiceToggle(comp.questionStates()[2], 21, { target: { checked: true } } as unknown as Event);
    const req = httpMock.expectOne(`${base}/5001/draft/3`);
    expect(req.request.body.expectedDraftRowVersion).toBe(9); // next real edit uses the refreshed rowVersion
    req.flush({ questionId: 3, textResponse: null, selectedOptionIds: [21], rowVersion: 10 });
  });

  it('a stale in-flight save response arriving AFTER Reload completes does not overwrite the freshly reloaded state', () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    const comp = fixture.componentInstance;

    const qA = comp.questionStates()[1];
    comp.onSingleChoiceChange(qA, 10);
    httpMock.expectOne(`${base}/5001/draft/2`).flush({ code: 'DRAFT_SAVE_CONFLICT' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    const qB = comp.questionStates()[2];
    comp.onMultiChoiceToggle(qB, 20, { target: { checked: true } } as unknown as Event);
    const bReq = httpMock.expectOne(`${base}/5001/draft/3`);

    comp.load();
    httpMock.expectOne(DETAIL_URL).flush(detailWithQuestions('DRAFT'));
    httpMock.expectOne(DRAFTS_URL).flush([{ questionId: 3, textResponse: null, selectedOptionIds: [], rowVersion: 9 }]);
    fixture.detectChanges();

    bReq.flush({ questionId: 3, textResponse: null, selectedOptionIds: [20], rowVersion: 0 }); // stale response arrives after reload completed
    fixture.detectChanges();

    const freshB = comp.questionStates()[2];
    expect(freshB.saveState).toBe('idle');
    expect(freshB.selectedOptionIds).toEqual([]);
    expect(freshB.rowVersion).toBe(9);
    httpMock.expectNone(`${base}/5001/draft/3`);

    comp.onMultiChoiceToggle(comp.questionStates()[2], 21, { target: { checked: true } } as unknown as Event);
    const req = httpMock.expectOne(`${base}/5001/draft/3`);
    expect(req.request.body.expectedDraftRowVersion).toBe(9);
    req.flush({ questionId: 3, textResponse: null, selectedOptionIds: [21], rowVersion: 10 });
  });

  it('answer-key isolation: rendered DOM never contains isCorrect/correctOption for any question type', () => {
    const fixture = setup();
    flushInitialLoad(fixture);
    const html = (fixture.nativeElement as HTMLElement).outerHTML.toLowerCase();
    expect(html).not.toContain('iscorrect');
    expect(html).not.toContain('correctoption');
  });

  it('UX-7B: folds module context into the existing meta line, no new line/card/banner', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush({ ...detailWithQuestions(), moduleTitle: 'Foundations' });
    httpMock.expectOne(DRAFTS_URL).flush([]);
    fixture.detectChanges();

    const meta = (fixture.nativeElement as HTMLElement).querySelector('.meta');
    expect(meta?.textContent?.trim()).toBe('4 questions · Module: Foundations');
  });
});
