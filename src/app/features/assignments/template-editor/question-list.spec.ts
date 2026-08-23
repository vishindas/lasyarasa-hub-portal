import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { QuestionList } from './question-list';
import { AssignmentQuestionDTO, AssignmentTemplateVersionDTO } from '../data-access/assignment-staff.model';
import { EnsureDraftOutcome } from './ensure-draft-outcome.model';

describe('QuestionList (T4/T6 + WRITE_FROZEN disabling + T3 auto-draft target resolution + stale-conflict reload)', () => {
  let httpMock: HttpTestingController;
  const versionsBase = `${environment.apiUrl}/school/assignments/versions`;
  const questionsBase = `${environment.apiUrl}/school/assignments/questions`;

  const publishedQuestions: AssignmentQuestionDTO[] = [
    {
      id: 1, templateVersionId: 1000, questionType: 'SINGLE_CHOICE', prompt: 'Published Q1', questionOrder: 1, maxSelections: null, rowVersion: 3,
      options: [
        { id: 11, questionId: 1, optionLabel: 'A', optionOrder: 1, isCorrect: true, rowVersion: 2 },
        { id: 12, questionId: 1, optionLabel: 'B', optionOrder: 2, isCorrect: false, rowVersion: 2 }
      ]
    },
    { id: 2, templateVersionId: 1000, questionType: 'SHORT_TEXT', prompt: 'Published Q2', questionOrder: 2, maxSelections: null, rowVersion: 5, options: [] }
  ];

  // The auto-created draft's clone -- SAME questionOrder/optionOrder values,
  // brand-new ids and reset rowVersions, exactly as a real startDraft() clone
  // behaves. This is the shape a correct T3 fix must resolve targets from.
  const clonedDraftQuestions: AssignmentQuestionDTO[] = [
    {
      id: 501, templateVersionId: 2000, questionType: 'SINGLE_CHOICE', prompt: 'Published Q1', questionOrder: 1, maxSelections: null, rowVersion: 0,
      options: [
        { id: 511, questionId: 501, optionLabel: 'A', optionOrder: 1, isCorrect: true, rowVersion: 0 },
        { id: 512, questionId: 501, optionLabel: 'B', optionOrder: 2, isCorrect: false, rowVersion: 0 }
      ]
    },
    { id: 502, templateVersionId: 2000, questionType: 'SHORT_TEXT', prompt: 'Published Q2', questionOrder: 2, maxSelections: null, rowVersion: 0, options: [] }
  ];

  function draftVersion(questions: AssignmentQuestionDTO[], id = 2000): AssignmentTemplateVersionDTO {
    return { id, templateId: 1, moduleId: 1, curriculumVersionId: 1, versionNumber: 2, status: 'DRAFT', title: 't', clonedFromVersionId: 1000, rowVersion: 0, createdAt: '', createdBy: 1, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null, questions };
  }

  function setup(opts: {
    dialogResult?: unknown;
    mutationsDisabled?: boolean;
    ensureDraft?: () => Observable<EnsureDraftOutcome>;
    initialQuestions?: AssignmentQuestionDTO[];
  } = {}) {
    const dialogOpenSpy = vi.fn().mockReturnValue({ afterClosed: () => of(opts.dialogResult ?? null) });
    TestBed.configureTestingModule({
      imports: [QuestionList],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MatDialog, useValue: { open: dialogOpenSpy } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(QuestionList);
    fixture.componentRef.setInput('versionId', 1000);
    fixture.componentRef.setInput('initialQuestions', opts.initialQuestions ?? publishedQuestions);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('mutationsDisabled', opts.mutationsDisabled ?? false);
    // Default: draft already exists (freshlyCreated: false) and its id matches versionId (1000) --
    // the fast path's outcome.version.id must equal what's already bound as versionId.
    fixture.componentRef.setInput('ensureDraft', opts.ensureDraft ?? (() => of({ version: draftVersion(publishedQuestions, 1000), freshlyCreated: false })));
    fixture.detectChanges();
    return { fixture, dialogOpenSpy };
  }

  /** Simulates ensureDraft() actually cloning a draft this call -- the exact scenario the T3 defect only manifested in. */
  function freshClone(): () => Observable<EnsureDraftOutcome> {
    return () => of({ version: draftVersion(clonedDraftQuestions), freshlyCreated: true });
  }

  afterEach(() => httpMock.verify());

  it('disables "Add Question" while mutationsDisabled() (WRITE_FROZEN/FULL_OUTAGE) is true', () => {
    const { fixture } = setup({ mutationsDisabled: true });
    const addButton = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  it('enables "Add Question" when mutationsDisabled() is false', () => {
    const { fixture } = setup({ mutationsDisabled: false });
    const addButton = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    expect(addButton.disabled).toBe(false);
  });

  it('T3: addQuestion() on a template with no prior draft targets the freshly-cloned draft version id', () => {
    const { fixture } = setup({
      dialogResult: { questionType: 'SHORT_TEXT', prompt: 'New question', maxSelections: null },
      ensureDraft: freshClone(), initialQuestions: publishedQuestions
    });
    fixture.componentInstance.addQuestion();
    // Must target the CLONE's version id (2000), never the published version id (1000).
    const req = httpMock.expectOne(`${versionsBase}/2000/questions`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 503, templateVersionId: 2000, questionType: 'SHORT_TEXT', prompt: 'New question', questionOrder: 3, maxSelections: null, rowVersion: 0, options: [] });
  });

  it('T3 DEFECT FIX -- edit an EXISTING (published) question after auto-draft: POST /draft fires once, then PUT targets the cloned draft question id/rowVersion, never the published one', () => {
    let draftCalls = 0;
    const ensureDraft = () => { draftCalls++; return of({ version: draftVersion(clonedDraftQuestions), freshlyCreated: true }); };
    const { fixture } = setup({
      dialogResult: { questionType: 'SINGLE_CHOICE', prompt: 'Edited prompt', maxSelections: null },
      ensureDraft, initialQuestions: publishedQuestions
    });

    // The user clicks edit on the PUBLISHED Q1 (id 1, rowVersion 3) -- captured exactly as question-list-row would pass it.
    fixture.componentInstance.editQuestion(publishedQuestions[0]);

    expect(draftCalls).toBe(1);
    const req = httpMock.expectOne(`${questionsBase}/501`); // the CLONE's id, not published id 1
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.expectedRowVersion).toBe(0); // the clone's rowVersion, not the published row's 3
    expect(req.request.body.prompt).toBe('Edited prompt');
    req.flush({ ...clonedDraftQuestions[0], prompt: 'Edited prompt' });
  });

  it('T3 DEFECT FIX -- delete an EXISTING (published) question after auto-draft: confirm dialog opens against the cloned draft version+question id, and the DELETE targets the clone', () => {
    const dialogOpenSpy = vi.fn()
      .mockReturnValueOnce({ afterClosed: () => of({ expectedRowVersion: 0 }) }); // DeleteQuestionConfirmDialog result
    TestBed.configureTestingModule({
      imports: [QuestionList],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialog, useValue: { open: dialogOpenSpy } }]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(QuestionList);
    fixture.componentRef.setInput('versionId', 1000);
    fixture.componentRef.setInput('initialQuestions', publishedQuestions);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('mutationsDisabled', false);
    fixture.componentRef.setInput('ensureDraft', () => of({ version: draftVersion(clonedDraftQuestions), freshlyCreated: true }));
    fixture.detectChanges();

    fixture.componentInstance.deleteQuestion(publishedQuestions[0]); // published Q1, id 1

    // The confirm dialog must have been opened with the CLONE's version+question id.
    expect(dialogOpenSpy).toHaveBeenCalledWith(expect.anything(), { data: { versionId: 2000, questionId: 501 } });

    const req = httpMock.expectOne(`${questionsBase}/501`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ expectedRowVersion: 0 });
    req.flush(null);
  });

  it('T3 DEFECT FIX -- reordering EXISTING (published) questions after auto-draft sends the clone\'s ids/rowVersions in the user\'s intended order, targeting the clone\'s version id', () => {
    const { fixture } = setup({ ensureDraft: freshClone(), initialQuestions: publishedQuestions });

    // User drags published Q2 above published Q1 -- moveUp(1) swaps positions 0/1.
    fixture.componentInstance.moveUp(1);

    const req = httpMock.expectOne(`${versionsBase}/2000/questions/reorder`); // clone's version id, not 1000
    expect(req.request.method).toBe('PUT');
    // Intended order: Q2 first, Q1 second -- expressed via the CLONE's ids (502, 501), not published (2, 1).
    expect(req.request.body).toEqual({ entries: [{ id: 502, expectedRowVersion: 0 }, { id: 501, expectedRowVersion: 0 }] });
    req.flush([clonedDraftQuestions[1], clonedDraftQuestions[0]]);
  });

  it('shows the stale-conflict message and emits reload when a reorder is rejected with STALE_VERSION (no-clone / already-draft case)', () => {
    const { fixture } = setup(); // default ensureDraft: freshlyCreated false, versionId 1000
    const component = fixture.componentInstance;
    let reloadEmitted = false;
    component.reload.subscribe(() => (reloadEmitted = true));

    component.moveDown(0);
    const req = httpMock.expectOne(`${versionsBase}/1000/questions/reorder`);
    req.flush({ code: 'STALE_VERSION', message: 'stale', resource: null }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('changed since you opened it');
    const reloadButton = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Reload') as HTMLButtonElement;
    expect(reloadButton).toBeTruthy();
    reloadButton.click();
    expect(reloadEmitted).toBe(true);
  });

  it('identity-permutation reorder (no actual change) issues no HTTP call', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;
    component.moveUp(0); // i === 0, no-op guarded before any reorder logic runs
    httpMock.expectNone(`${versionsBase}/1000/questions/reorder`);
  });

  it('final review item 1: empty draft -> addQuestion() emits questionsChanged with the new question (parent can sync its authoritative graph)', () => {
    const { fixture } = setup({
      dialogResult: { questionType: 'SHORT_TEXT', prompt: 'First question', maxSelections: null },
      ensureDraft: () => of({ version: draftVersion([], 1000), freshlyCreated: false }),
      initialQuestions: []
    });
    let emitted: AssignmentQuestionDTO[] | null = null;
    fixture.componentInstance.questionsChanged.subscribe((qs: AssignmentQuestionDTO[]) => (emitted = qs));

    fixture.componentInstance.addQuestion();
    const req = httpMock.expectOne(`${versionsBase}/1000/questions`);
    req.flush({ id: 900, templateVersionId: 1000, questionType: 'SHORT_TEXT', prompt: 'First question', questionOrder: 1, maxSelections: null, rowVersion: 0, options: [] });

    expect(emitted).toEqual([{ id: 900, templateVersionId: 1000, questionType: 'SHORT_TEXT', prompt: 'First question', questionOrder: 1, maxSelections: null, rowVersion: 0, options: [] }]);
  });

  it('final review item 1: editQuestion() emits questionsChanged with the updated question reflected (no-clone case)', () => {
    const { fixture } = setup({ dialogResult: { questionType: 'SINGLE_CHOICE', prompt: 'Edited', maxSelections: null } });
    let emitted: AssignmentQuestionDTO[] | null = null;
    fixture.componentInstance.questionsChanged.subscribe((qs: AssignmentQuestionDTO[]) => (emitted = qs));

    fixture.componentInstance.editQuestion(publishedQuestions[0]);
    const req = httpMock.expectOne(`${questionsBase}/1`);
    req.flush({ ...publishedQuestions[0], prompt: 'Edited' });

    expect(emitted![0].prompt).toBe('Edited');
    expect(emitted!.length).toBe(2);
  });

  it('final review item 1: deleteQuestion() emits questionsChanged without the removed question', () => {
    const dialogOpenSpy = vi.fn().mockReturnValueOnce({ afterClosed: () => of({ expectedRowVersion: 5 }) });
    TestBed.configureTestingModule({
      imports: [QuestionList],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialog, useValue: { open: dialogOpenSpy } }]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(QuestionList);
    fixture.componentRef.setInput('versionId', 1000);
    fixture.componentRef.setInput('initialQuestions', publishedQuestions);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('mutationsDisabled', false);
    fixture.componentRef.setInput('ensureDraft', () => of({ version: draftVersion(publishedQuestions, 1000), freshlyCreated: false }));
    fixture.detectChanges();

    let emitted: AssignmentQuestionDTO[] | null = null;
    fixture.componentInstance.questionsChanged.subscribe((qs: AssignmentQuestionDTO[]) => (emitted = qs));

    fixture.componentInstance.deleteQuestion(publishedQuestions[1]);
    const req = httpMock.expectOne(`${questionsBase}/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(emitted).toEqual([publishedQuestions[0]]);
  });

  it('final review item 1: reorder emits questionsChanged with the server-returned order (Preview stays in sync without a full reload)', () => {
    const { fixture } = setup(); // default: freshlyCreated false, versionId 1000
    let emitted: AssignmentQuestionDTO[] | null = null;
    fixture.componentInstance.questionsChanged.subscribe((qs: AssignmentQuestionDTO[]) => (emitted = qs));

    fixture.componentInstance.moveUp(1);
    const req = httpMock.expectOne(`${versionsBase}/1000/questions/reorder`);
    const reordered = [publishedQuestions[1], publishedQuestions[0]];
    req.flush(reordered);

    expect(emitted).toEqual(reordered);
  });

  it('final review item 1: onQuestionUpdated with a freshlyCreatedGraph (option-level clone trigger) adopts the WHOLE clone graph, never a mix of published/cloned ids, and emits questionsChanged', () => {
    const { fixture } = setup({ initialQuestions: publishedQuestions }); // local state still describes the published snapshot
    let emitted: AssignmentQuestionDTO[] | null = null;
    fixture.componentInstance.questionsChanged.subscribe((qs: AssignmentQuestionDTO[]) => (emitted = qs));

    const patchedClonedQ1 = { ...clonedDraftQuestions[0], options: [{ ...clonedDraftQuestions[0].options[0], isCorrect: false }, { ...clonedDraftQuestions[0].options[1], isCorrect: true }] };
    fixture.componentInstance.onQuestionUpdated({
      question: patchedClonedQ1,
      freshlyCreatedGraph: [patchedClonedQ1, clonedDraftQuestions[1]]
    });

    // Every question now carries a CLONE id -- no leftover published ids (1, 2) anywhere.
    expect(fixture.componentInstance.questions().map(q => q.id)).toEqual([501, 502]);
    expect(emitted!.map(q => q.id)).toEqual([501, 502]);
  });
});
