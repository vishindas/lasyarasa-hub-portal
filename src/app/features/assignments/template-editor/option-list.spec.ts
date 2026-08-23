import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OptionList } from './option-list';
import { AssignmentQuestionDTO } from '../data-access/assignment-staff.model';
import { EnsureDraftOutcome } from './ensure-draft-outcome.model';

/**
 * T3 DEFECT FIX -- integration-style coverage (architect follow-up review
 * of 7143f85): every one of these tests exercises a mutation on an EXISTING
 * (published) question's options, through a T3 auto-draft that has to
 * clone -- exactly the scenario where a captured question/option id/
 * rowVersion is untrustworthy. Each asserts the actual HTTP call targets
 * the CLONE's ids/rowVersions, never the published ones.
 */
describe('OptionList (T5/T6 + T3 auto-draft target resolution)', () => {
  let httpMock: HttpTestingController;
  const questionsBase = `${environment.apiUrl}/school/assignments/questions`;
  const optionsBase = `${environment.apiUrl}/school/assignments/options`;

  const publishedQuestion: AssignmentQuestionDTO = {
    id: 1, templateVersionId: 1000, questionType: 'SINGLE_CHOICE', prompt: 'Published Q1', questionOrder: 1, maxSelections: null, rowVersion: 3,
    options: [
      { id: 11, questionId: 1, optionLabel: 'A', optionOrder: 1, isCorrect: true, rowVersion: 2 },
      { id: 12, questionId: 1, optionLabel: 'B', optionOrder: 2, isCorrect: false, rowVersion: 2 }
    ]
  };

  // Same questionOrder/optionOrder, brand-new ids, reset rowVersions -- a real startDraft() clone's shape.
  const clonedQuestion: AssignmentQuestionDTO = {
    id: 501, templateVersionId: 2000, questionType: 'SINGLE_CHOICE', prompt: 'Published Q1', questionOrder: 1, maxSelections: null, rowVersion: 0,
    options: [
      { id: 511, questionId: 501, optionLabel: 'A', optionOrder: 1, isCorrect: true, rowVersion: 0 },
      { id: 512, questionId: 501, optionLabel: 'B', optionOrder: 2, isCorrect: false, rowVersion: 0 }
    ]
  };

  function draftVersion(questions: AssignmentQuestionDTO[]) {
    return { id: 2000, templateId: 1, moduleId: 1, curriculumVersionId: 1, versionNumber: 2, status: 'DRAFT' as const, title: 't', clonedFromVersionId: 1000, rowVersion: 0, createdAt: '', createdBy: 1, publishedAt: null, publishedBy: null, archivedAt: null, archivedBy: null, questions };
  }

  function setup(opts: { dialogResult?: unknown; ensureDraft: () => Observable<EnsureDraftOutcome>; question?: AssignmentQuestionDTO }) {
    const dialogOpenSpy = vi.fn().mockReturnValue({ afterClosed: () => of(opts.dialogResult ?? null) });
    TestBed.configureTestingModule({
      imports: [OptionList],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialog, useValue: { open: dialogOpenSpy } }]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OptionList);
    fixture.componentRef.setInput('question', opts.question ?? publishedQuestion);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('mutationsDisabled', false);
    fixture.componentRef.setInput('ensureDraft', opts.ensureDraft);
    fixture.detectChanges();
    return { fixture, dialogOpenSpy };
  }

  afterEach(() => httpMock.verify());

  it('T3 DEFECT FIX -- add an option to an EXISTING (published) question after auto-draft: targets the cloned draft question id, not the published one', () => {
    const { fixture } = setup({
      dialogResult: { optionLabel: 'C', isCorrect: false },
      ensureDraft: () => of({ version: draftVersion([clonedQuestion]), freshlyCreated: true })
    });
    fixture.componentInstance.addOption();
    const req = httpMock.expectOne(`${questionsBase}/501/options`); // clone's question id, not published id 1
    expect(req.request.method).toBe('POST');
    req.flush({ id: 513, questionId: 501, optionLabel: 'C', optionOrder: 3, isCorrect: false, rowVersion: 0 });
  });

  it('T3 DEFECT FIX -- edit an EXISTING (published) option after auto-draft: PUT targets the cloned option id/rowVersion, never the published one', () => {
    const { fixture } = setup({
      dialogResult: { optionLabel: 'A (edited)', isCorrect: true },
      ensureDraft: () => of({ version: draftVersion([clonedQuestion]), freshlyCreated: true })
    });
    // User clicks edit on the PUBLISHED option A (id 11, rowVersion 2).
    fixture.componentInstance.editOption(publishedQuestion.options[0]);
    const req = httpMock.expectOne(`${optionsBase}/511`); // clone's option id, not published id 11
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.expectedRowVersion).toBe(0); // clone's rowVersion, not published row's 2
    expect(req.request.body.optionLabel).toBe('A (edited)');
    req.flush({ ...clonedQuestion.options[0], optionLabel: 'A (edited)' });
  });

  it('T3 DEFECT FIX -- delete an EXISTING (published) option after auto-draft: confirm dialog opens against the clone\'s version/question/option ids, DELETE targets the clone', () => {
    const dialogOpenSpy = vi.fn().mockReturnValue({ afterClosed: () => of({ expectedRowVersion: 0 }) });
    TestBed.configureTestingModule({
      imports: [OptionList],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialog, useValue: { open: dialogOpenSpy } }]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OptionList);
    fixture.componentRef.setInput('question', publishedQuestion);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('mutationsDisabled', false);
    fixture.componentRef.setInput('ensureDraft', () => of({ version: draftVersion([clonedQuestion]), freshlyCreated: true }));
    fixture.detectChanges();

    fixture.componentInstance.deleteOption(publishedQuestion.options[0]); // published option A, id 11

    expect(dialogOpenSpy).toHaveBeenCalledWith(expect.anything(), { data: { versionId: 2000, questionId: 501, optionId: 511 } });

    const req = httpMock.expectOne(`${optionsBase}/511`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ expectedRowVersion: 0 });
    req.flush(null);
  });

  it('T3 DEFECT FIX -- reordering an EXISTING (published) question\'s options after auto-draft sends the clone\'s ids/rowVersions in the user\'s intended order', () => {
    const { fixture } = setup({
      ensureDraft: () => of({ version: draftVersion([clonedQuestion]), freshlyCreated: true })
    });
    // User drags published option B above published option A -- moveUp(1) swaps positions 0/1.
    fixture.componentInstance.moveUp(1);
    const req = httpMock.expectOne(`${questionsBase}/501/options/reorder`); // clone's question id
    expect(req.request.method).toBe('PUT');
    // Intended order: B first, A second -- via the CLONE's ids (512, 511), not published (12, 11).
    expect(req.request.body).toEqual({ entries: [{ id: 512, expectedRowVersion: 0 }, { id: 511, expectedRowVersion: 0 }] });
    req.flush([clonedQuestion.options[1], clonedQuestion.options[0]]);
  });

  it('non-clone case (draft already existed): resolves the target directly from the current @Input question, matching by id as before', () => {
    const { fixture } = setup({
      dialogResult: { optionLabel: 'A (edited)', isCorrect: true },
      ensureDraft: () => of({ version: draftVersion([clonedQuestion]), freshlyCreated: false }),
      question: clonedQuestion // the @Input already reflects the draft -- no clone happens this call
    });
    fixture.componentInstance.editOption(clonedQuestion.options[0]);
    const req = httpMock.expectOne(`${optionsBase}/511`);
    expect(req.request.body.expectedRowVersion).toBe(0);
    req.flush({ ...clonedQuestion.options[0], optionLabel: 'A (edited)' });
  });

  it('final review item 1: editing an option\'s isCorrect (no-clone case) emits questionUpdated with the new answer key and no freshlyCreatedGraph, so Preview/publish validation see it immediately', () => {
    const { fixture } = setup({
      dialogResult: { optionLabel: 'A', isCorrect: false }, // flips the answer key: A was correct, now B should become the sole correct answer via a follow-up edit in real usage; here we assert THIS option's isCorrect update propagates
      ensureDraft: () => of({ version: draftVersion([clonedQuestion]), freshlyCreated: false }),
      question: clonedQuestion
    });
    let emitted: { question: AssignmentQuestionDTO; freshlyCreatedGraph?: AssignmentQuestionDTO[] } | null = null;
    fixture.componentInstance.questionUpdated.subscribe(e => (emitted = e));

    fixture.componentInstance.editOption(clonedQuestion.options[0]); // option A, currently isCorrect: true
    const req = httpMock.expectOne(`${optionsBase}/511`);
    req.flush({ ...clonedQuestion.options[0], isCorrect: false });

    expect(emitted).toBeTruthy();
    expect(emitted!.freshlyCreatedGraph).toBeUndefined();
    const updatedOption = emitted!.question.options.find(o => o.id === 511);
    expect(updatedOption?.isCorrect).toBe(false);
  });

  it('final review item 1: an option edit that ITSELF triggers the auto-draft clone emits questionUpdated with the FULL cloned sibling graph (mutated question patched in), never a mix of published/cloned ids', () => {
    const siblingQuestion: AssignmentQuestionDTO = { id: 2, templateVersionId: 1000, questionType: 'SHORT_TEXT', prompt: 'Published Q2', questionOrder: 2, maxSelections: null, rowVersion: 1, options: [] };
    const clonedSibling: AssignmentQuestionDTO = { ...siblingQuestion, id: 502, templateVersionId: 2000, rowVersion: 0 };
    const { fixture } = setup({
      dialogResult: { optionLabel: 'A (edited)', isCorrect: true },
      ensureDraft: () => of({ version: draftVersion([clonedQuestion, clonedSibling]), freshlyCreated: true }),
      question: publishedQuestion // still the PUBLISHED snapshot -- this call is what triggers the clone
    });
    let emitted: { question: AssignmentQuestionDTO; freshlyCreatedGraph?: AssignmentQuestionDTO[] } | null = null;
    fixture.componentInstance.questionUpdated.subscribe(e => (emitted = e));

    fixture.componentInstance.editOption(publishedQuestion.options[0]);
    const req = httpMock.expectOne(`${optionsBase}/511`);
    req.flush({ ...clonedQuestion.options[0], optionLabel: 'A (edited)' });

    expect(emitted).toBeTruthy();
    expect(emitted!.freshlyCreatedGraph).toBeTruthy();
    // Every question in the graph carries a CLONE id -- no leftover published ids (1, 2).
    expect(emitted!.freshlyCreatedGraph!.map(q => q.id)).toEqual([501, 502]);
    const mutatedInGraph = emitted!.freshlyCreatedGraph!.find(q => q.id === 501);
    expect(mutatedInGraph?.options.find(o => o.id === 511)?.optionLabel).toBe('A (edited)');
  });

  it('final review item 1: option delete emits questionUpdated with the option removed from the question', () => {
    const dialogOpenSpy = vi.fn().mockReturnValue({ afterClosed: () => of({ expectedRowVersion: 0 }) });
    TestBed.configureTestingModule({
      imports: [OptionList],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialog, useValue: { open: dialogOpenSpy } }]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OptionList);
    fixture.componentRef.setInput('question', clonedQuestion);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('mutationsDisabled', false);
    fixture.componentRef.setInput('ensureDraft', () => of({ version: draftVersion([clonedQuestion]), freshlyCreated: false }));
    fixture.detectChanges();

    let emitted: { question: AssignmentQuestionDTO; freshlyCreatedGraph?: AssignmentQuestionDTO[] } | null = null;
    fixture.componentInstance.questionUpdated.subscribe(e => (emitted = e));

    fixture.componentInstance.deleteOption(clonedQuestion.options[0]);
    const req = httpMock.expectOne(`${optionsBase}/511`);
    req.flush(null);

    expect(emitted!.question.options.map(o => o.id)).toEqual([512]);
  });

  it('final review item 1: option reorder emits questionUpdated with the server-returned option order', () => {
    const { fixture } = setup({
      ensureDraft: () => of({ version: draftVersion([clonedQuestion]), freshlyCreated: false }),
      question: clonedQuestion
    });
    let emitted: { question: AssignmentQuestionDTO; freshlyCreatedGraph?: AssignmentQuestionDTO[] } | null = null;
    fixture.componentInstance.questionUpdated.subscribe(e => (emitted = e));

    fixture.componentInstance.moveUp(1);
    const req = httpMock.expectOne(`${questionsBase}/501/options/reorder`);
    const reorderedOptions = [clonedQuestion.options[1], clonedQuestion.options[0]];
    req.flush(reorderedOptions);

    expect(emitted!.question.options.map(o => o.id)).toEqual([512, 511]);
  });
});
