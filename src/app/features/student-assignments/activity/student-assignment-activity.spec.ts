import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentAssignmentActivityComponent } from './student-assignment-activity';
import { StudentAssignmentSummaryDTO } from '../data-access/student-assignment.model';

function activatedRouteStub(params: Record<string, string>, query: Record<string, string> = {}) {
  return { snapshot: { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap(query) } };
}

const LIST_URL = `${environment.apiUrl}/account/students/201/learning/assignments`;

function row(overrides: Partial<StudentAssignmentSummaryDTO>): StudentAssignmentSummaryDTO {
  return { id: 1, instanceId: 10, title: 'T', dueAt: '2026-12-01T00:00:00', status: 'SUBMITTED', attemptNumber: 1, ...overrides };
}

describe('StudentAssignmentActivityComponent (UX-7D: secondary destination for SUBMITTED/VALIDATED/CLOSED)', () => {
  let httpMock: HttpTestingController;

  function setup(query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [StudentAssignmentActivityComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '201' }, query) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentAssignmentActivityComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('page heading is "Assignment Activity" -- not plain "History", since SUBMITTED is not historical', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Assignment Activity');
  });

  it('renders exactly 2 tabs: Awaiting validation, History', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Awaiting validation');
    expect(text).toContain('History');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]').length).toBe(2);
  });

  /** UX-7D route cleanup: canonical To Do route is now /todo (was /assignments, now only a backward-compat redirect). */
  it('has a back link to the primary To Do page', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.back-link') as HTMLAnchorElement;
    expect(link.textContent).toContain('Back to To Do');
    expect(link.getAttribute('href')).toBe('/my-students/201/todo');
  });

  it('groups SUBMITTED into Awaiting validation, VALIDATED + CLOSED into History', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([
      row({ id: 1, title: 'Awaiting one', status: 'SUBMITTED' }),
      row({ id: 2, title: 'Validated one', status: 'VALIDATED' }),
      row({ id: 3, title: 'Closed one', status: 'CLOSED' })
    ]);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.awaitingRows().map(a => a.title)).toEqual(['Awaiting one']);
    expect(comp.historyRows().map(a => a.title)).toEqual(['Validated one', 'Closed one']);
  });

  /** UX-7D: co-located for navigation only -- never merged semantically. Each row keeps its own real status chip. */
  it('History keeps Validated and Closed as distinct status chips even though they share one tab', () => {
    const fixture = setup({ tab: 'history' });
    httpMock.expectOne(LIST_URL).flush([
      row({ id: 1, title: 'Validated one', status: 'VALIDATED' }),
      row({ id: 2, title: 'Closed one', status: 'CLOSED' })
    ]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Completed');
    expect(text).toContain('Closed');
  });

  /**
   * UX-7D polish: a Validated row previously got a full green
   * (--sp-tone-positive-bg) fill, which made completed history compete
   * visually with actionable To Do cards. Completion state now lives only
   * in the "Completed" chip -- the row itself shares the exact same
   * neutral surface class as a Closed row, since both are equally
   * non-actionable history, just for different reasons.
   */
  it('Validated and Closed rows share the same neutral row surface -- Validated no longer gets its own green fill', () => {
    const fixture = setup({ tab: 'history' });
    httpMock.expectOne(LIST_URL).flush([
      row({ id: 1, title: 'Validated one', status: 'VALIDATED' }),
      row({ id: 2, title: 'Closed one', status: 'CLOSED' })
    ]);
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.row');
    expect(getComputedStyle(rows[0]).backgroundColor).toBe(getComputedStyle(rows[1]).backgroundColor);
  });

  it('?tab= selects the initial tab (0 = awaiting, 1 = history)', () => {
    const fixture = setup({ tab: 'history' });
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.tabIndex()).toBe(1);
  });

  it('an unrecognized ?tab= value falls back to the default (Awaiting validation) tab', () => {
    const fixture = setup({ tab: 'todo' });
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.tabIndex()).toBe(0);
  });

  it('empty-state copy for Awaiting validation', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nothing is waiting on a teacher right now.');
  });

  it('empty-state copy for History', () => {
    const fixture = setup({ tab: 'history' });
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No completed or closed assignments yet.');
  });

  it('rows navigate to Assignment Detail via "View"', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([row({ id: 42, title: 'Quiz' })]);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.row-action') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('View');
    expect(link.getAttribute('href')).toBe('/my-students/201/assignments/42');
  });

  it('renders "Module: {title}" when present', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([row({ id: 1, title: 'Quiz', moduleId: 30, moduleTitle: 'Foundations' })]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.row-module')?.textContent?.trim()).toBe('Module: Foundations');
  });

  it('renders a retryable message on load failure', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush({ code: 'LEARNING_CONTENT_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Assignments are not available right now.');
  });
});
