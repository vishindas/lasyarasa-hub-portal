import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentAssignmentSummaryComponent } from './student-assignment-summary';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { StudentAssignmentSummaryDTO } from '../data-access/student-assignment.model';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const LIST_URL = `${environment.apiUrl}/account/students/201/learning/assignments`;

function row(overrides: Partial<StudentAssignmentSummaryDTO>): StudentAssignmentSummaryDTO {
  return { id: 1, instanceId: 10, title: 'T', dueAt: '2026-12-01T00:00:00', status: 'DRAFT', attemptNumber: 0, ...overrides };
}

describe('StudentAssignmentSummaryComponent (UX-7D: generic To Do inbox)', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [StudentAssignmentSummaryComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '201' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentAssignmentSummaryComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('page heading is "To Do"', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('To Do');
  });

  it('no tabs -- the page is a plain, section-based inbox', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([row({ status: 'DRAFT' })]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]').length).toBe(0);
  });

  it('shows the "Assignments" section heading only when there is at least one actionable (DRAFT/REVISION_REQUESTED) row', () => {
    const empty = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    empty.detectChanges();
    expect((empty.nativeElement as HTMLElement).textContent).not.toContain('Assignments');
  });

  it('renders the "Assignments" section when a DRAFT row exists', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([row({ title: 'Quiz', status: 'DRAFT' })]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Assignments');
    expect(text).toContain('Quiz');
  });

  /**
   * UX-7D correction: cards use --sp-radius (12px, "Provider's mat-card
   * radius"), not --sp-radius-sm (8px, reserved for compact rows like
   * module-summary-row.ts) -- same token correction already applied to
   * Dashboard's own cards. Asserts the raw var() expression rather than a
   * resolved pixel value: jsdom (this test environment) does not resolve
   * CSS custom-property fallbacks the way a real browser does --
   * getComputedStyle returns the literal declaration text, which is
   * actually the more precise proof that this rule is wired to the
   * --sp-radius token itself.
   */
  it('renders each card with the standard --sp-radius (12px) student-portal card radius, not the row-scale --sp-radius-sm (8px)', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([row({ title: 'Quiz', status: 'DRAFT' })]);
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector('.row') as HTMLElement;
    expect(card).toBeTruthy();
    expect(getComputedStyle(card).borderRadius).toBe('var(--sp-radius, 12px)');
  });

  /** UX-7D correction: status color lives in the chip only -- no row/card-level background tint for REVISION_REQUESTED or any other status. */
  it('never applies a background-color tint to a card based on status -- only the chip carries status color', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([row({ id: 1, status: 'REVISION_REQUESTED' })]);
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector('.row') as HTMLElement;
    expect(card.className.trim()).toBe('row');
  });

  it('"Revision requested" sub-heading appears only when a REVISION_REQUESTED row exists', () => {
    const withoutRevision = setup();
    httpMock.expectOne(LIST_URL).flush([row({ status: 'DRAFT' })]);
    withoutRevision.detectChanges();
    expect((withoutRevision.nativeElement as HTMLElement).textContent).not.toContain('Revision requested');
  });

  it('"Revision requested" sub-heading and its row render when a REVISION_REQUESTED row exists', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([row({ id: 2, title: 'Needs revision', status: 'REVISION_REQUESTED' })]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Revision requested');
    expect(text).toContain('Needs revision');
  });

  /**
   * UX-7D: SUBMITTED/VALIDATED/CLOSED are fetched (same single list() call)
   * but never rendered on this page -- they belong to the secondary
   * Assignment Activity destination. This is the core "not an Assignments
   * page, a To Do inbox" behavior.
   */
  it('never renders SUBMITTED, VALIDATED, or CLOSED rows -- only DRAFT and REVISION_REQUESTED', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([
      row({ id: 1, title: 'Awaiting one', status: 'SUBMITTED' }),
      row({ id: 2, title: 'Validated one', status: 'VALIDATED' }),
      row({ id: 3, title: 'Closed one', status: 'CLOSED' })
    ]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Awaiting one');
    expect(text).not.toContain('Validated one');
    expect(text).not.toContain('Closed one');
    // With nothing actionable, the whole-page empty state shows instead of the Assignments section.
    expect(text).toContain('Nothing needs your attention right now.');
  });

  it('the "Assignments" section and the whole-page empty state are mutually exclusive', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nothing needs your attention right now.');
  });

  /** UX-7D: always-visible secondary-access link, same pattern as student-fees.ts's "View payment history". */
  it('always renders a "View assignment history" link to the secondary Assignment Activity route, even when the inbox is empty', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.history-link') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('/my-students/201/assignments/history');
  });

  /**
   * UX-7D: the source-level section container -- establishes the two
   * visual levels (source section > individual task cards) so a second
   * source can later sit as an equally-weighted sibling without
   * restructuring this page. Heading, cards, and the history link all
   * live inside it when the Assignments source has actionable content.
   */
  it('wraps the Assignments heading, cards, and history link in one source-level section container when populated', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([row({ id: 1, title: 'Quiz', status: 'DRAFT' })]);
    fixture.detectChanges();
    const section = (fixture.nativeElement as HTMLElement).querySelector('.source-section') as HTMLElement;
    expect(section).toBeTruthy();
    expect(section.querySelector('.source-heading')?.textContent?.trim()).toBe('Assignments');
    expect(section.querySelector('.row-title')?.textContent?.trim()).toBe('Quiz');
    expect(section.querySelector('a.history-link')).toBeTruthy();
  });

  /** UX-7D: when there's nothing actionable, the section container doesn't render at all -- only the page-level empty state and history link do, kept reachable outside any (absent) container. */
  it('does not render the source-section container when the inbox is empty -- only the page-level empty state', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.source-section')).toBeNull();
    expect(el.querySelector('a.history-link')).toBeTruthy();
  });

  /** UX-7D: same container rule applies on a load failure -- no source-section, but the history link is still reachable as a sibling of the error message. */
  it('does not render the source-section container on a load failure either', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush({ code: 'LEARNING_CONTENT_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.source-section')).toBeNull();
    expect(el.querySelector('a.history-link')).toBeTruthy();
  });

  it('groups assignments by status into the correct bucket', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([
      row({ id: 1, title: 'Draft one', status: 'DRAFT' }),
      row({ id: 2, title: 'Revision one', status: 'REVISION_REQUESTED' }),
      row({ id: 3, title: 'Awaiting one', status: 'SUBMITTED' })
    ]);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.draftRows().map(a => a.title)).toEqual(['Draft one']);
    expect(comp.revisionRows().map(a => a.title)).toEqual(['Revision one']);
  });

  it('sorts the actionable Assignments section overdue-first, then soonest due', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([
      row({ id: 1, title: 'Due later', status: 'DRAFT', dueAt: '2026-12-31T00:00:00' }),
      row({ id: 2, title: 'Overdue', status: 'DRAFT', dueAt: '2020-01-01T00:00:00' }),
      row({ id: 3, title: 'Due sooner', status: 'DRAFT', dueAt: '2026-06-01T00:00:00' })
    ]);
    fixture.detectChanges();
    const titles = fixture.componentInstance.draftRows().map(a => a.title);
    expect(titles[0]).toBe('Overdue');
    expect(titles[1]).toBe('Due sooner');
    expect(titles[2]).toBe('Due later');
  });

  it('CTA label: Start for DRAFT, "Revise and resubmit" for REVISION_REQUESTED', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.ctaLabel(row({ status: 'DRAFT' }))).toBe('Start');
    expect(comp.ctaLabel(row({ status: 'REVISION_REQUESTED' }))).toBe('Revise and resubmit');
  });

  /**
   * UX-7D correction: the chip states, the button acts -- a
   * REVISION_REQUESTED card must show BOTH "Revision requested" (chip)
   * and "Revise and resubmit" (button), never the same words twice.
   */
  it('REVISION_REQUESTED card shows "Revision requested" as the chip and "Revise and resubmit" as the button, not the same text twice', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([row({ id: 1, status: 'REVISION_REQUESTED' })]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.sp-chip')?.textContent?.trim()).toBe('Revision requested');
    expect(el.querySelector('a.row-action')?.textContent?.trim()).toBe('Revise and resubmit');
  });

  it('disables the write-oriented CTA (Start/Revise) under WRITE_FROZEN', () => {
    const fixture = setup();
    const mode = TestBed.inject(ClassroomLiteModeService);
    mode.setWriteFrozen();
    httpMock.expectOne(LIST_URL).flush([]);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.ctaDisabled(row({ status: 'DRAFT' }))).toBe(true);
    expect(comp.ctaDisabled(row({ status: 'REVISION_REQUESTED' }))).toBe(true);
  });

  it('renders a retryable message on load failure', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush({ code: 'LEARNING_CONTENT_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Assignments are not available right now.');
  });

  /**
   * UX-7D correction: the empty-inbox copy ("Nothing needs your attention
   * right now") must never render alongside the error banner -- true-empty
   * and source-unavailable are mutually exclusive states. Before this fix,
   * an error left assignments() at its initial [] and the empty branch
   * rendered unconditionally, so a failed load looked like an empty page
   * with a stray banner rather than an honest error state.
   */
  it('on load failure, shows only the error message -- never the "Nothing needs your attention" empty copy at the same time', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush({ code: 'LEARNING_CONTENT_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Assignments are not available right now.');
    expect(text).not.toContain('Nothing needs your attention right now.');
  });

  /** UX-7D: no technical reason a failed actionable-list fetch should also block navigating to Assignment Activity, which is its own independent request. */
  it('"View assignment history" remains available even when the Assignments source fails to load', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush({ code: 'LEARNING_CONTENT_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.history-link') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('/my-students/201/assignments/history');
  });

  it('UX-7B: renders "Module: {title}" when moduleTitle is present, never as a status chip', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([row({ id: 1, title: 'Quiz', moduleId: 30, moduleTitle: 'Foundations' })]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.row-module')?.textContent?.trim()).toBe('Module: Foundations');
    expect(Array.from(el.querySelectorAll('.sp-chip')).some(c => c.textContent?.includes('Foundations'))).toBe(false);
  });

  it('UX-7B: omits the module line entirely when moduleTitle is absent -- never renders "Module: null/undefined"', () => {
    const fixture = setup();
    httpMock.expectOne(LIST_URL).flush([row({ id: 1, title: 'Quiz' })]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.row-module')).toBeNull();
    expect(el.textContent).not.toContain('Module:');
  });
});
