import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { QuestionList } from './question-list';
import { AssignmentQuestionDTO, AssignmentTemplateVersionDTO } from '../data-access/assignment-staff.model';

describe('QuestionList (T4/T6 + WRITE_FROZEN disabling + T3 auto-draft + stale-conflict reload)', () => {
  let httpMock: HttpTestingController;
  const versionsBase = `${environment.apiUrl}/school/assignments/versions`;

  const oneQuestion: AssignmentQuestionDTO[] = [
    { id: 1, templateVersionId: 1000, questionType: 'SHORT_TEXT', prompt: 'Q1', questionOrder: 1, maxSelections: null, rowVersion: 0, options: [] },
    { id: 2, templateVersionId: 1000, questionType: 'SHORT_TEXT', prompt: 'Q2', questionOrder: 2, maxSelections: null, rowVersion: 0, options: [] }
  ];

  function setup(opts: { dialogResult?: unknown; mutationsDisabled?: boolean; ensureDraft?: () => Observable<AssignmentTemplateVersionDTO> } = {}) {
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
    fixture.componentRef.setInput('initialQuestions', oneQuestion);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('mutationsDisabled', opts.mutationsDisabled ?? false);
    fixture.componentRef.setInput('ensureDraft', opts.ensureDraft ?? (() => of({ id: 1000, status: 'DRAFT' } as unknown as AssignmentTemplateVersionDTO)));
    fixture.detectChanges();
    return { fixture, dialogOpenSpy };
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

  it('T3: addQuestion() resolves ensureDraft() before calling createQuestion, and only after the dialog produces a result', () => {
    const ensureDraft = vi.fn().mockReturnValue(of({ id: 2000, status: 'DRAFT' } as unknown as AssignmentTemplateVersionDTO));
    const { fixture } = setup({
      dialogResult: { questionType: 'SHORT_TEXT', prompt: 'New question', maxSelections: null },
      ensureDraft
    });
    const component = fixture.componentInstance;
    component.addQuestion();

    expect(ensureDraft).toHaveBeenCalledTimes(1);
    // createQuestion targets the version ensureDraft() resolved to (2000), not the original versionId input (1000).
    const req = httpMock.expectOne(`${versionsBase}/2000/questions`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 99, templateVersionId: 2000, questionType: 'SHORT_TEXT', prompt: 'New question', questionOrder: 3, maxSelections: null, rowVersion: 0, options: [] });
  });

  it('shows the stale-conflict message and emits reload when a reorder is rejected with STALE_VERSION', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;
    let reloadEmitted = false;
    component.reload.subscribe(() => (reloadEmitted = true));

    component.moveDown(0); // triggers applyReorder -> ensureDraft (immediate) -> reorderQuestions
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
});
