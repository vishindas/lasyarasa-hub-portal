import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { StudentAssignmentConfirmComponent } from './student-assignment-confirm';

function activatedRouteStub(params: Record<string, string>, query: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap(query) } };
}

function setup(query: Record<string, string>) {
  TestBed.configureTestingModule({
    imports: [StudentAssignmentConfirmComponent],
    providers: [provideRouter([]), { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '201' }, query) }]
  });
  const fixture = TestBed.createComponent(StudentAssignmentConfirmComponent);
  fixture.detectChanges();
  return fixture;
}

describe('StudentAssignmentConfirmComponent', () => {
  it('shows "Submitted" when resubmitted is not set', () => {
    const fixture = setup({});
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Submitted');
  });

  it('shows "Resubmitted" when ?resubmitted=1', () => {
    const fixture = setup({ resubmitted: '1' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Resubmitted');
  });

  /**
   * UX-7D (revised): SUBMITTED no longer lives on the primary To Do inbox
   * (a submitted assignment requires no further student action), so this
   * links to the secondary Assignment Activity destination instead, with
   * its Awaiting validation tab pre-selected -- not "Back to To Do".
   */
  it('links to Assignment Activity with the Awaiting validation tab selected, labeled "View submission status"', () => {
    const fixture = setup({});
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('View submission status');
    expect(link.getAttribute('href')).toBe('/my-students/201/assignments/history?tab=awaiting');
  });
});
