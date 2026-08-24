import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentAssignmentSummaryComponent } from './student-assignment-summary';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { StudentAssignmentSummaryDTO } from '../data-access/student-assignment.model';

function activatedRouteStub(params: Record<string, string>, query: Record<string, string> = {}) {
  return { snapshot: { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap(query) } };
}

const LIST_URL = `${environment.apiUrl}/account/students/201/learning/assignments`;

function row(overrides: Partial<StudentAssignmentSummaryDTO>): StudentAssignmentSummaryDTO {
  return { id: 1, instanceId: 10, title: 'T', dueAt: '2026-12-01T00:00:00', status: 'DRAFT', attemptNumber: 0, ...overrides };
}

describe('StudentAssignmentSummaryComponent', () => {
  let httpMock: HttpTestingController;

  function setup(query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [StudentAssignmentSummaryComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '201' }, query) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentAssignmentSummaryComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('renders all 5 tabs (To do / Awaiting validation / Revision requested / Validated / Closed)', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const label of ['To do', 'Awaiting validation', 'Revision requested', 'Validated', 'Closed']) {
      expect(text).toContain(label);
    }
  });

  it('renders the honest empty-state copy for a tab with no assignments', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No open assignments right now.');
  });

  it('groups assignments by status into the correct tab', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([
      row({ id: 1, title: 'Draft one', status: 'DRAFT' }),
      row({ id: 2, title: 'Awaiting one', status: 'SUBMITTED' }),
      row({ id: 3, title: 'Revision one', status: 'REVISION_REQUESTED' })
    ]);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.rowsForTab('todo').map(a => a.title)).toEqual(['Draft one']);
    expect(comp.rowsForTab('awaiting').map(a => a.title)).toEqual(['Awaiting one']);
    expect(comp.rowsForTab('revision').map(a => a.title)).toEqual(['Revision one']);
  });

  it('sorts the To do tab overdue-first, then soonest due', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([
      row({ id: 1, title: 'Due later', status: 'DRAFT', dueAt: '2026-12-31T00:00:00' }),
      row({ id: 2, title: 'Overdue', status: 'DRAFT', dueAt: '2020-01-01T00:00:00' }),
      row({ id: 3, title: 'Due sooner', status: 'DRAFT', dueAt: '2026-06-01T00:00:00' })
    ]);
    fixture.detectChanges();
    const titles = fixture.componentInstance.rowsForTab('todo').map(a => a.title);
    expect(titles[0]).toBe('Overdue');
    expect(titles[1]).toBe('Due sooner');
    expect(titles[2]).toBe('Due later');
  });

  it('CTA label: Start for DRAFT, "Revise and resubmit" for REVISION_REQUESTED, View for everything else', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.ctaLabel(row({ status: 'DRAFT' }))).toBe('Start');
    expect(comp.ctaLabel(row({ status: 'REVISION_REQUESTED' }))).toBe('Revise and resubmit');
    expect(comp.ctaLabel(row({ status: 'SUBMITTED' }))).toBe('View');
    expect(comp.ctaLabel(row({ status: 'VALIDATED' }))).toBe('View');
    expect(comp.ctaLabel(row({ status: 'CLOSED' }))).toBe('View');
  });

  it('?tab= query param selects the initial tab', () => {
    const fixture = setup({ tab: 'validated' });
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.tabIndex()).toBe(3);
  });

  it('disables the write-oriented CTA (Start/Revise) under WRITE_FROZEN but never the read-only View CTA', () => {
    const fixture = setup();
    const mode = TestBed.inject(ClassroomLiteModeService);
    mode.setWriteFrozen();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.ctaDisabled(row({ status: 'DRAFT' }))).toBe(true);
    expect(comp.ctaDisabled(row({ status: 'REVISION_REQUESTED' }))).toBe(true);
    expect(comp.ctaDisabled(row({ status: 'SUBMITTED' }))).toBe(false);
    expect(comp.ctaDisabled(row({ status: 'VALIDATED' }))).toBe(false);
  });

  it('renders a retryable message on load failure', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush({ code: 'LEARNING_CONTENT_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Assignments are not available right now.');
  });
});
