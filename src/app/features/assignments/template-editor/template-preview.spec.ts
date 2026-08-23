import { TestBed } from '@angular/core/testing';
import { TemplatePreviewComponent } from './template-preview';
import { AssignmentQuestionDTO } from '../data-access/assignment-staff.model';

describe('TemplatePreviewComponent (T7)', () => {
  function render(questions: AssignmentQuestionDTO[]) {
    TestBed.configureTestingModule({ imports: [TemplatePreviewComponent] });
    const fixture = TestBed.createComponent(TemplatePreviewComponent);
    fixture.componentRef.setInput('questions', questions);
    fixture.detectChanges();
    return fixture;
  }

  it('renders no mutation controls of any kind (no buttons)', () => {
    const fixture = render([
      { id: 1, templateVersionId: 1, questionType: 'SINGLE_CHOICE', prompt: 'p', questionOrder: 1, maxSelections: null, rowVersion: 0, options: [
        { id: 1, questionId: 1, optionLabel: 'A', optionOrder: 1, isCorrect: true, rowVersion: 0 }
      ] }
    ]);
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  it('renders a SINGLE_CHOICE question with its options and marks the correct one', () => {
    const fixture = render([
      { id: 1, templateVersionId: 1, questionType: 'SINGLE_CHOICE', prompt: 'Pick one', questionOrder: 1, maxSelections: null, rowVersion: 0, options: [
        { id: 1, questionId: 1, optionLabel: 'Right', optionOrder: 1, isCorrect: true, rowVersion: 0 },
        { id: 2, questionId: 1, optionLabel: 'Wrong', optionOrder: 2, isCorrect: false, rowVersion: 0 }
      ] }
    ]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Pick one');
    expect(text).toContain('Right');
    expect(text).toContain('Wrong');
    const correctEl = (fixture.nativeElement as HTMLElement).querySelector('.option.correct');
    expect(correctEl?.textContent).toContain('Right');
  });

  it('renders a MULTIPLE_CHOICE question with its maxSelections hint', () => {
    const fixture = render([
      { id: 2, templateVersionId: 1, questionType: 'MULTIPLE_CHOICE', prompt: 'Pick some', questionOrder: 1, maxSelections: 2, rowVersion: 0, options: [
        { id: 3, questionId: 2, optionLabel: 'X', optionOrder: 1, isCorrect: true, rowVersion: 0 },
        { id: 4, questionId: 2, optionLabel: 'Y', optionOrder: 2, isCorrect: true, rowVersion: 0 }
      ] }
    ]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Select up to 2');
  });

  it('renders a SHORT_TEXT question as a disabled single-line answer placeholder', () => {
    const fixture = render([
      { id: 3, templateVersionId: 1, questionType: 'SHORT_TEXT', prompt: 'Name it', questionOrder: 1, maxSelections: null, rowVersion: 0, options: [] }
    ]);
    const input = (fixture.nativeElement as HTMLElement).querySelector('input.text-answer') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.disabled).toBe(true);
  });

  it('renders a LONG_TEXT question as a disabled multi-line answer placeholder', () => {
    const fixture = render([
      { id: 4, templateVersionId: 1, questionType: 'LONG_TEXT', prompt: 'Explain', questionOrder: 1, maxSelections: null, rowVersion: 0, options: [] }
    ]);
    const textarea = (fixture.nativeElement as HTMLElement).querySelector('textarea.text-answer') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.disabled).toBe(true);
  });

  it('shows an empty-state message when there are no questions', () => {
    const fixture = render([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No questions to preview yet');
  });
});
