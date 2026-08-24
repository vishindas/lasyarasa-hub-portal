import { TestBed } from '@angular/core/testing';
import { StudentAssignmentMessageComponent } from './student-assignment-message';

function setup() {
  TestBed.configureTestingModule({ imports: [StudentAssignmentMessageComponent] });
  return TestBed.createComponent(StudentAssignmentMessageComponent);
}

describe('StudentAssignmentMessageComponent', () => {
  it('renders nothing when error is null', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });

  it('never renders write-frozen/full-outage locally -- those are owned by the shared shell/mode banner', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', { kind: 'write-frozen', message: 'x', resource: null });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });

  it('stale-version and draft-conflict show a Reload action', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', { kind: 'stale-version', message: 'changed', resource: null });
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.textContent?.trim()).toBe('Reload');
  });

  it('emits reload when the Reload button is clicked', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', { kind: 'draft-conflict', message: 'changed', resource: null });
    let reloaded = false;
    fixture.componentInstance.reload.subscribe(() => (reloaded = true));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(reloaded).toBe(true);
  });

  it('not-found/feature-unavailable show the provided backLabel and emit back', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', { kind: 'feature-unavailable', message: 'unavailable', resource: null });
    fixture.componentRef.setInput('backLabel', 'Back to Assignments');
    let backed = false;
    fixture.componentInstance.back.subscribe(() => (backed = true));
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.textContent?.trim()).toBe('Back to Assignments');
    btn.click();
    expect(backed).toBe(true);
  });

  it('unknown/validation show a Retry action', () => {
    const fixture = setup();
    fixture.componentRef.setInput('error', { kind: 'unknown', message: 'oops', resource: null });
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).textContent?.trim()).toBe('Retry');
  });
});
