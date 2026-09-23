import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, Router, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AssignmentTemplatePreviewDTO } from '../../../core/models/assignment.model';
import { CurriculumAssignmentPreviewComponent } from './curriculum-assignment-preview';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const FULL_PREVIEW: AssignmentTemplatePreviewDTO = {
  templateId: 6, publishedVersionId: 7, title: 'Indian Classical Dance — Lesson 1 Review',
  questions: [
    {
      id: 6, questionOrder: 1, questionType: 'SINGLE_CHOICE', prompt: 'Which form originated in Andhra Pradesh?', maxSelections: null,
      options: [
        { id: 1, optionOrder: 1, optionLabel: 'Kuchipudi' },
        { id: 2, optionOrder: 2, optionLabel: 'Bharatanatyam' }
      ]
    },
    {
      id: 7, questionOrder: 2, questionType: 'MULTIPLE_CHOICE', prompt: 'Which forms originated in Kerala? Select two.', maxSelections: 2,
      options: [
        { id: 5, optionOrder: 1, optionLabel: 'Kathakali' },
        { id: 6, optionOrder: 2, optionLabel: 'Mohiniyattam' }
      ]
    },
    { id: 9, questionOrder: 4, questionType: 'SHORT_TEXT', prompt: 'Name the eight forms introduced in this lesson.', maxSelections: null, options: [] },
    { id: 10, questionOrder: 5, questionType: 'LONG_TEXT', prompt: 'Explain two differences between classical and folk dance.', maxSelections: null, options: [] }
  ]
};

/**
 * Issue #56 -- CurriculumAssignmentPreviewComponent: read-only rendering of
 * all four question types, no answer-key indication anywhere in the DOM,
 * back navigation returns to the module's Related-Assignments-bearing
 * Preview screen, and accessible/keyboard-correct back control.
 */
describe('CurriculumAssignmentPreviewComponent -- Issue #56', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [CurriculumAssignmentPreviewComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '8', versionId: '11', moduleId: '14', templateId: '6' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(CurriculumAssignmentPreviewComponent);
  }

  afterEach(() => httpMock.verify());

  function flush(fixture: ReturnType<typeof setup>, body: AssignmentTemplatePreviewDTO = FULL_PREVIEW) {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/assignments/templates/6/preview`).flush(body);
    fixture.detectChanges();
  }

  // ---- Requirement 6: all four question types render correctly ----

  it('renders the title and all four question types with their prompts', () => {
    const fixture = setup();
    flush(fixture);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Indian Classical Dance — Lesson 1 Review');
    expect(text).toContain('Which form originated in Andhra Pradesh?');
    expect(text).toContain('Which forms originated in Kerala? Select two.');
    expect(text).toContain('Name the eight forms introduced in this lesson.');
    expect(text).toContain('Explain two differences between classical and folk dance.');
  });

  it('SINGLE_CHOICE renders its options as read-only radio-style markers', () => {
    const fixture = setup();
    flush(fixture);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Kuchipudi');
    expect(text).toContain('Bharatanatyam');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('◯');
  });

  it('MULTIPLE_CHOICE renders its options and the max-selection instruction', () => {
    const fixture = setup();
    flush(fixture);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Kathakali');
    expect(text).toContain('Mohiniyattam');
    expect(text).toContain('Select up to 2.');
    expect(text).toContain('☐');
  });

  it('SHORT_TEXT renders a disabled single-line input, not a real editable form', () => {
    const fixture = setup();
    flush(fixture);
    const input = (fixture.nativeElement as HTMLElement).querySelector('input.text-answer') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.disabled).toBe(true);
  });

  it('LONG_TEXT renders a disabled multi-line textarea, not a real editable form', () => {
    const fixture = setup();
    flush(fixture);
    const textarea = (fixture.nativeElement as HTMLElement).querySelector('textarea.text-answer') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.disabled).toBe(true);
  });

  // ---- Requirement 7: no answer-key indication anywhere in the rendered DOM ----

  it('the rendered DOM never contains isCorrect, a correct-answer marker, or any answer-key text', () => {
    const fixture = setup();
    flush(fixture);
    const html = (fixture.nativeElement as HTMLElement).innerHTML.toLowerCase();

    expect(html).not.toContain('iscorrect');
    expect(html).not.toContain('correct_option');
    expect(html).not.toContain('answerkey');
    expect(html).not.toContain('(correct)');
    expect(html).not.toContain('class="option correct"');
  });

  // ---- No authoring/mutation controls of any kind ----

  it('renders no authoring, publish, archive, assign, edit, or grading controls', () => {
    const fixture = setup();
    flush(fixture);
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map(b => b.textContent?.trim() ?? '');
    for (const label of ['Publish', 'Archive', 'Assign', 'Edit', 'Save', 'Delete', 'Validate', 'Request Revision']) {
      expect(buttons.some(t => t.includes(label))).toBe(false);
    }
  });

  it('makes no mutation request -- GET only, and no assignment_instance-creating call', () => {
    TestBed.configureTestingModule({
      imports: [CurriculumAssignmentPreviewComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ curriculumId: '8', versionId: '11', moduleId: '14', templateId: '6' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CurriculumAssignmentPreviewComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne(`${environment.apiUrl}/school/assignments/templates/6/preview`);
    expect(req.request.method).toBe('GET');
    req.flush(FULL_PREVIEW);
    fixture.detectChanges();
    // afterEach's httpMock.verify() additionally proves this was the only request ever made.
  });

  // ---- Requirement: preview wording does not imply release ----

  it('the preview banner does not claim the assignment is released or live', () => {
    const fixture = setup();
    flush(fixture);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nothing here is released to students');
  });

  // ---- Requirement 9: back navigation returns to the module Preview flow ----

  it('the back control navigates to the module\'s lessons/preview screen', () => {
    const fixture = setup();
    flush(fixture);
    const router = TestBed.inject(Router);
    const navigateSpy = router.navigate = vi.fn().mockResolvedValue(true);

    fixture.componentInstance.close();

    expect(navigateSpy).toHaveBeenCalledWith(['/vidya-rasa/curricula', 8, 'versions', 11, 'modules', 14, 'lessons', 'preview']);
  });

  // ---- Requirement 10: accessible name on the back control ----

  it('the back button has a clear accessible name', () => {
    const fixture = setup();
    flush(fixture);
    const backButton = (fixture.nativeElement as HTMLElement).querySelector('button[mat-icon-button]');
    expect(backButton?.getAttribute('aria-label')).toBe('Back to Related Assignments');
  });

  // ---- Existing empty/loading/error states ----

  it('shows a loading state before the response arrives', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading');
    httpMock.expectOne(`${environment.apiUrl}/school/assignments/templates/6/preview`).flush(FULL_PREVIEW);
  });

  it('shows the shared error state on a failed load', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/assignments/templates/6/preview`)
      .flush({ code: 'RESOURCE_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-curriculum-message')).not.toBeNull();
  });

  it('shows a graceful empty state for a published version with no questions yet', () => {
    const fixture = setup();
    flush(fixture, { ...FULL_PREVIEW, questions: [] });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('This assignment has no questions yet.');
  });
});
