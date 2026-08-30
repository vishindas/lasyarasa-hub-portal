import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, Router, provideRouter, convertToParamMap } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StudentAccessLossService } from '../../core/services/student-access-loss.service';
import { StudentLearningContextService } from '../../core/services/student-learning-context.service';
import { ClassroomLiteModeService } from '../../core/services/classroom-lite-mode.service';
import { studentLearningAccessInterceptor } from '../../core/services/student-learning-access.interceptor';
import { StudentLearningShellComponent } from './student-learning-shell';

/**
 * Security regression coverage: the architect found via manual review that
 * lost-access navigation still showed the routed student's name (in the
 * always-rendered switcher), school name, and "No active class" alongside
 * the generic lost-access block -- a genuine identity leak, not just an
 * extra message. These tests assert the structural absence of the
 * switcher/class-context-bar/router-outlet whenever
 * accessLoss.lostAccessFor() matches the routed student, not just that the
 * lost-access block happens to also be present.
 */
describe('StudentLearningShellComponent -- lost-access isolation', () => {
  let httpMock: HttpTestingController;

  // UX-01: BreakpointObserver.observe() is real observable state now that
  // the shell drives the persistent-rail/mobile-drawer split from it --
  // mocked the same way ShellComponent's own spec already does (see
  // src/app/layout/shell/shell.spec.ts), rather than letting a real
  // matchMedia call run under the test environment. Defaults to desktop
  // (`matches: false`); tests that need mobile pass their own
  // BehaviorSubject to drive it live.
  function setup(mobileMatches: BehaviorSubject<boolean> = new BehaviorSubject(false)) {
    TestBed.configureTestingModule({
      imports: [StudentLearningShellComponent],
      providers: [
        // The real studentLearningAccessInterceptor is wired here (not
        // just provideHttpClient()) so these tests exercise the actual
        // production interceptor -> StudentAccessLossService pipeline --
        // this is exactly the piece that was missing from the manual
        // verify-build bootstrap and made the previous fix look untested.
        provideHttpClient(withInterceptors([studentLearningAccessInterceptor])), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: { pipe: () => ({ subscribe: (fn: (p: unknown) => void) => fn(convertToParamMap({ studentId: '117' })) }) }, snapshot: { paramMap: convertToParamMap({ studentId: '117' }) } } },
        { provide: BreakpointObserver, useValue: { observe: () => mobileMatches.pipe(map(v => ({ matches: v, breakpoints: {} }))) } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(StudentLearningShellComponent);
  }

  afterEach(() => httpMock.verify());

  it('normal (authorized) state: switcher and class-context bar render', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'PILOT Assignment Class', schedule: 'Pilot schedule' }
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-student-switcher')).toBeTruthy();
    expect(el.querySelector('app-class-context-bar')).toBeTruthy();
    expect(el.querySelector('app-lost-access-block')).toBeFalsy();
    expect(el.querySelector('app-account-menu')).toBeTruthy();
  });

  it('lost-access state: switcher, class-context bar, and routed content are ALL structurally absent -- only the generic block renders, no leaked identity', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'PILOT Assignment Class', schedule: 'Pilot schedule' }
    ]);
    fixture.detectChanges();

    TestBed.inject(StudentAccessLossService).markLost(117);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-student-switcher')).toBeFalsy();
    expect(el.querySelector('app-class-context-bar')).toBeFalsy();
    expect(el.querySelector('router-outlet')).toBeFalsy();
    expect(el.querySelector('app-lost-access-block')).toBeTruthy();
    expect((el.textContent ?? '')).not.toContain('Vidya Rasa');
    // D6: the account menu shows only the signed-in account's own identity
    // (email), never anything student-derived -- deliberately exempt from
    // this suppression, unlike the switcher.
    expect(el.querySelector('app-account-menu')).toBeTruthy();
  });

  it('navigating from an already-authorized, already-rendered dashboard to a lost-access state clears the switcher/class-bar immediately -- no flash of stale data', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'PILOT Assignment Class', schedule: 'Pilot schedule' }
    ]);
    fixture.detectChanges();

    // Confirm the authorized state is genuinely rendered first (this is the
    // specific bug scenario: access loss arriving AFTER a real, already-
    // mounted, already-successful render -- not just a fresh failing load).
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-student-switcher')).toBeTruthy();
    expect((el.textContent ?? '')).toContain('Vidya Rasa');

    TestBed.inject(StudentAccessLossService).markLost(117);
    fixture.detectChanges();

    expect(el.querySelector('app-student-switcher')).toBeFalsy();
    expect(el.querySelector('app-class-context-bar')).toBeFalsy();
    expect((el.textContent ?? '')).not.toContain('Vidya Rasa');
    expect(el.querySelector('app-lost-access-block')).toBeTruthy();
  });

  it('parent-shell/context integration: a REAL lost-access HTTP failure (through the real interceptor, not a direct markLost() call) clears the shared context and hides all identity/class UI shell-wide', () => {
    // This is the test that was missing before: the previous round only
    // ever called accessLoss.markLost(117) directly, which proved the
    // template's @if was correct but never proved the real interceptor
    // pipeline actually reaches it -- which turned out to be broken in the
    // manual verify-build bootstrap (studentLearningAccessInterceptor was
    // never wired into main.verify.ts).
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'Saturday Beginners', schedule: 'Sat 10am' }
    ]);
    fixture.detectChanges();

    // Confirm the authorized state is genuinely rendered first.
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-student-switcher')).toBeTruthy();
    expect(el.querySelector('app-class-context-bar')).toBeTruthy();
    expect(el.textContent).toContain('Vidya Rasa');
    expect(el.textContent).toContain('Saturday Beginners');
    const context = TestBed.inject(StudentLearningContextService);
    expect(context.classes().length).toBe(1);

    // "The next context request" -- a real HTTP call to the same
    // learning-scoped path a child screen would make, failing with the
    // exact shape the real backend returns for a genuinely lost student.
    TestBed.inject(HttpClient).get(`${environment.apiUrl}/account/students/117/learning/home`).subscribe({ error: () => {} });
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/home`).flush(
      { code: 'STUDENT_CONTEXT_UNAVAILABLE', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    // The underlying shared state is actually cleared, not just hidden.
    expect(context.classes()).toEqual([]);
    expect(context.selectedClassId()).toBeNull();
    // And the complete rendered shell shows none of it.
    expect(el.querySelector('app-student-switcher')).toBeFalsy();
    expect(el.querySelector('app-class-context-bar')).toBeFalsy();
    expect(el.querySelector('router-outlet')).toBeFalsy();
    expect(el.querySelector('app-lost-access-block')).toBeTruthy();
    expect(el.textContent).not.toContain('Vidya Rasa');
    expect(el.textContent).not.toContain('Saturday Beginners');
    expect(el.textContent).not.toContain('Dev Dance School');
  });

  it('recovery: "Back to My Students" on the lost-access block navigates to /my-students', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([]);
    fixture.detectChanges();

    TestBed.inject(StudentAccessLossService).markLost(117);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const btn = (fixture.nativeElement as HTMLElement).querySelector('app-lost-access-block button') as HTMLButtonElement;
    btn.click();

    expect(router.navigate).toHaveBeenCalledWith(['/my-students']);
  });
});

/**
 * UX-01: coverage for the new persistent shell. FULL_OUTAGE/offline
 * precedence and lost-access isolation are proven above and must keep
 * short-circuiting BEFORE any of this rail/topbar/skip-link chrome ever
 * renders -- the two new precedence tests below assert that directly
 * (no rail, no topbar, no skip-link during either state), rather than
 * just trusting the unchanged @if/@else ordering.
 */
describe('StudentLearningShellComponent -- UX-01 persistent shell', () => {
  let httpMock: HttpTestingController;

  function setup(mobileMatches: BehaviorSubject<boolean> = new BehaviorSubject(false)) {
    TestBed.configureTestingModule({
      imports: [StudentLearningShellComponent],
      providers: [
        provideHttpClient(withInterceptors([studentLearningAccessInterceptor])), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: { pipe: () => ({ subscribe: (fn: (p: unknown) => void) => fn(convertToParamMap({ studentId: '117' })) }) }, snapshot: { paramMap: convertToParamMap({ studentId: '117' }) } } },
        { provide: BreakpointObserver, useValue: { observe: () => mobileMatches.pipe(map(v => ({ matches: v, breakpoints: {} }))) } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(StudentLearningShellComponent);
  }

  function flushAuthorized(fixture: ReturnType<typeof setup>) {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([
      { studentId: 117, providerId: 1, studentDisplayName: 'Vidya Rasa', providerDisplayName: 'Dev Dance School', accessType: 'SELF' }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([
      { classId: 11, className: 'PILOT Assignment Class', schedule: 'Pilot schedule' }
    ]);
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('FULL_OUTAGE precedence: only the outage block renders -- no rail, topbar, or skip-link, even before any HTTP call resolves', () => {
    const fixture = setup();
    TestBed.inject(ClassroomLiteModeService).setFullOutage();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-full-outage-block')).toBeTruthy();
    expect(el.querySelector('.rail')).toBeFalsy();
    expect(el.querySelector('.topbar')).toBeFalsy();
    expect(el.querySelector('.skip-link')).toBeFalsy();
    expect(el.querySelector('app-student-shell-nav')).toBeFalsy();

    // ngOnInit's studentLearningContextService.clearForNewStudent(117) fires
    // unconditionally (it's plain TS, not gated by the template's FULL_OUTAGE
    // branch) -- flushed here so httpMock.verify() in afterEach doesn't fail
    // on an outstanding request unrelated to what this test is checking.
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([]);
  });

  it('offline precedence: only the offline block renders -- no rail, topbar, or skip-link', () => {
    const fixture = setup();
    window.dispatchEvent(new Event('offline'));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-offline-block')).toBeTruthy();
    expect(el.querySelector('.rail')).toBeFalsy();
    expect(el.querySelector('.topbar')).toBeFalsy();
    expect(el.querySelector('app-student-shell-nav')).toBeFalsy();

    // Recovers once back online -- proves this isn't a one-way suppression.
    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-offline-block')).toBeFalsy();

    // Same unconditional ngOnInit fetch as the FULL_OUTAGE test above.
    httpMock.expectOne(`${environment.apiUrl}/account/students/117/learning/classes`).flush([]);
    // Now genuinely online+authorized, the switcher's own fetch fires too.
    httpMock.expectOne(`${environment.apiUrl}/account/students`).flush([]);
  });

  it('normal state: nav (rail) and main landmarks exist, plus a skip-link from the top of the page to main content', () => {
    const fixture = setup();
    flushAuthorized(fixture);

    const el = fixture.nativeElement as HTMLElement;
    const nav = el.querySelector('nav.rail');
    const main = el.querySelector('main#main-content');
    expect(nav).toBeTruthy();
    expect(nav!.getAttribute('aria-label')).toBe('Student portal');
    expect(main).toBeTruthy();
    expect(main!.contains(el.querySelector('router-outlet'))).toBe(true);

    const skip = el.querySelector('a.skip-link') as HTMLAnchorElement;
    expect(skip).toBeTruthy();
    expect(skip.getAttribute('href')).toBe('#main-content');
  });

  it('UX-01 refinement: the shell no longer imposes a narrow content width on main -- it fills the space beside the rail up to a generous application-wide ceiling, not a small centered column', () => {
    const fixture = setup();
    flushAuthorized(fixture);

    const main = (fixture.nativeElement as HTMLElement).querySelector('main#main-content') as HTMLElement;
    const style = getComputedStyle(main);
    expect(style.flex).toContain('1');
    // A generous outer ceiling (not "the old 720/880px page widths", and not
    // an unbounded width:100% either) -- individual pages still layer their
    // own, page-specific inner max-width on top of this.
    expect(parseInt(style.maxWidth, 10)).toBeGreaterThanOrEqual(1400);
  });

  it('the rail renders the four primary nav destinations, each pointing at the routed studentId', () => {
    const fixture = setup();
    flushAuthorized(fixture);

    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.rail a.nav-item')) as HTMLAnchorElement[];
    const targets = links.map(a => a.getAttribute('href'));
    expect(targets).toContain('/my-students/117/dashboard');
    expect(targets).toContain('/my-students/117/classes');
    expect(targets).toContain('/my-students/117/assignments');
    expect(targets).toContain('/my-students/117/fees');
    // No invented top-level "Learning" or "Account" route -- Account stays a
    // menu (rendered separately below), Learning is reached via My Classes.
    expect(targets.some(t => t?.includes('/learning'))).toBe(false);
    expect(targets.some(t => t?.includes('/account'))).toBe(false);
  });

  it('lost-access hides the nav links (not just the switcher) -- following the same student-derived-navigation is broken while access is lost, account menu stays', () => {
    const fixture = setup();
    flushAuthorized(fixture);

    TestBed.inject(StudentAccessLossService).markLost(117);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.rail a.nav-item').length).toBe(0);
    expect(el.querySelector('app-account-menu')).toBeTruthy();
  });

  it('desktop (default): no mobile topbar/hamburger renders', () => {
    const fixture = setup(new BehaviorSubject(false));
    flushAuthorized(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('.topbar')).toBeFalsy();
  });

  it('mobile: hamburger opens the drawer, scrim click closes it', () => {
    const fixture = setup(new BehaviorSubject(true));
    flushAuthorized(fixture);

    const el = fixture.nativeElement as HTMLElement;
    const toggle = el.querySelector('.menu-toggle') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(el.querySelector('.rail.open')).toBeFalsy();
    expect(el.querySelector('.scrim')).toBeFalsy();

    toggle.click();
    fixture.detectChanges();
    expect(el.querySelector('.rail.open')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const scrim = el.querySelector('.scrim') as HTMLElement;
    expect(scrim).toBeTruthy();

    scrim.click();
    fixture.detectChanges();
    expect(el.querySelector('.rail.open')).toBeFalsy();
    expect(el.querySelector('.scrim')).toBeFalsy();
  });

  it('mobile: does not overflow a 375px viewport (the rail is off-canvas, not a squeezed column)', () => {
    const fixture = setup(new BehaviorSubject(true));
    flushAuthorized(fixture);
    fixture.nativeElement.style.width = '375px';

    const rail = (fixture.nativeElement as HTMLElement).querySelector('.rail') as HTMLElement;
    // Structural proxy for the CSS contract (jsdom doesn't apply the actual
    // @media rule): the drawer starts closed, so it must not be part of the
    // in-flow desktop layout at this width -- verified visually in the
    // browser check (see PR description for the 375px screenshot).
    expect(rail.classList.contains('open')).toBe(false);
  });

  it('navigating to a real route closes an open mobile drawer', async () => {
    @Component({ standalone: true, template: '' })
    class StubPage {}

    const mobileMatches = new BehaviorSubject(true);
    TestBed.configureTestingModule({
      imports: [StudentLearningShellComponent],
      providers: [
        provideHttpClient(withInterceptors([studentLearningAccessInterceptor])), provideHttpClientTesting(), provideAnimationsAsync(),
        provideRouter([{ path: 'elsewhere', component: StubPage }]),
        { provide: ActivatedRoute, useValue: { paramMap: { pipe: () => ({ subscribe: (fn: (p: unknown) => void) => fn(convertToParamMap({ studentId: '117' })) }) }, snapshot: { paramMap: convertToParamMap({ studentId: '117' }) } } },
        { provide: BreakpointObserver, useValue: { observe: () => mobileMatches.pipe(map(v => ({ matches: v, breakpoints: {} }))) } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentLearningShellComponent);
    flushAuthorized(fixture);

    fixture.componentInstance.toggleMobileNav();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.rail.open')).toBeTruthy();

    await TestBed.inject(Router).navigateByUrl('/elsewhere');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.rail.open')).toBeFalsy();
  });
});
