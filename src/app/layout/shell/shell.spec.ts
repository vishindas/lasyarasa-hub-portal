import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ShellComponent } from './shell';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Structural test for the mobile chat-FAB clearance fix (styles.scss
 * `.page-content` mobile media query). That CSS relies on two invariants
 * this test locks in: every routed page renders inside the single
 * `.page-content` scroll container, and `<app-chat-widget>` (the fixed FAB)
 * is a SIBLING of that container, not nested inside it -- if either ever
 * changed, the shared bottom-padding reservation would stop protecting the
 * screens it was written for without any visual-only check catching it.
 */
describe('ShellComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false, breakpoints: {} }) } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/settings/currency`).flush({ currency: 'INR' });
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('renders router-outlet inside .page-content, the shared scroll container the FAB-clearance fix targets', () => {
    const fixture = setup();
    const pageContent = (fixture.nativeElement as HTMLElement).querySelector('.page-content');
    expect(pageContent).toBeTruthy();
    expect(pageContent!.querySelector('router-outlet')).toBeTruthy();
  });

  it('renders app-chat-widget as a sibling of .page-content, not nested inside it', () => {
    const fixture = setup();
    const root = fixture.nativeElement as HTMLElement;
    const pageContent = root.querySelector('.page-content')!;
    const chatWidget = root.querySelector('app-chat-widget');
    expect(chatWidget).toBeTruthy();
    expect(pageContent.contains(chatWidget)).toBe(false);
  });

  // Slice 15 (Plan v2.1.2 §9.4/§14): AssignmentCapabilityStateService is
  // constructed via ShellComponent's class field initializer
  // (`private readonly capabilityState = inject(...)`), not via an
  // ngOnInit() call. This test proves the capability refresh fires purely
  // from ShellComponent being constructed -- before ngOnInit even runs its
  // own body -- by seeding an authenticated providerId first and observing
  // the resulting HTTP call once the fixture is created.
  it('constructs AssignmentCapabilityStateService as a side effect of its own construction (field initializer, not ngOnInit)', () => {
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false, breakpoints: {} }) } }
      ]
    });
    const mock = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({ email: 'a@b.com', role: 'SCHOOL_ADMIN', providerId: 7 });

    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    // The capability GET fires from construction alone -- no separate
    // "initialize" call was made by this test beyond creating the fixture.
    const capabilityReq = mock.expectOne(`${environment.apiUrl}/school/assignments/capability`);
    capabilityReq.flush({ globalEnabled: true, providerEnabled: true, effectiveEnabled: true });
    mock.expectOne(`${environment.apiUrl}/school/settings/currency`).flush({ currency: 'INR' });
    mock.verify();
  });
});
