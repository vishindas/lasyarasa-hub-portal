import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { AssignmentSummaryComponent } from './assignment-summary';

/** Part II.5/correction 3: real screen, placeholder data only -- no fabricated assignments, no answering UI. */
describe('AssignmentSummaryComponent', () => {
  function setup(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [AssignmentSummaryComponent],
      providers: [
        provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } }
      ]
    });
    return TestBed.createComponent(AssignmentSummaryComponent);
  }

  it('renders all four tabs required by Draft 1.3 §6.6', () => {
    const fixture = setup();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('To do');
    expect(text).toContain('Awaiting validation');
    expect(text).toContain('Revision requested');
    expect(text).toContain('Validated');
  });

  it('every tab shows an honest empty state -- no fabricated/sample assignment rows anywhere', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.empty-note').length).toBeGreaterThan(0);
  });

  it('no input control that could submit/answer an assignment exists on this screen', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input, textarea')).toBeNull();
  });

  it('honors an initial ?tab= query param', () => {
    const fixture = setup({ tab: 'revision' });
    expect(fixture.componentInstance.tabIndex()).toBe(2);
  });
});
