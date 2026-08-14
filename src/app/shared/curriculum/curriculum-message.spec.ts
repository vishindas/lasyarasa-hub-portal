import { TestBed } from '@angular/core/testing';
import { CurriculumMessageComponent } from './curriculum-message';
import { CurriculumUiError } from '../../core/services/curriculum-api-error.util';

describe('CurriculumMessageComponent', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [CurriculumMessageComponent] });
    return TestBed.createComponent(CurriculumMessageComponent);
  }

  it('renders Reload for conflict, unaffected by the Slice 12 backLabel addition', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', { kind: 'conflict', message: 'stale', resource: null } satisfies CurriculumUiError);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Reload');
    expect(text).not.toContain('Retry');
  });

  it('renders Retry for unknown, unaffected by the Slice 12 backLabel addition', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', { kind: 'unknown', message: 'oops', resource: null } satisfies CurriculumUiError);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent ?? '').toContain('Retry');
  });

  it('existing not-found kind renders no action button when backLabel is not supplied (pre-Slice-12 behavior preserved)', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', { kind: 'not-found', message: 'gone', resource: 'X' } satisfies CurriculumUiError);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('Slice 12 addition: renders the supplied backLabel as a button and emits back on click, for a student-context-unavailable error', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', { kind: 'student-context-unavailable', message: 'You can no longer access this student.', resource: null } satisfies CurriculumUiError);
    fixture.componentRef.setInput('backLabel', 'Back to My Students');
    let emitted = false;
    fixture.componentInstance.back.subscribe(() => emitted = true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Back to My Students');
    button.click();
    expect(emitted).toBe(true);
  });

  it('write-frozen/full-outage are still never rendered here, even with a backLabel supplied', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', { kind: 'full-outage', message: 'down', resource: null } satisfies CurriculumUiError);
    fixture.componentRef.setInput('backLabel', 'Back');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.msg')).toBeNull();
  });
});
