import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AssignmentCapabilityStateService } from './assignment-capability-state.service';
import { AuthService } from '../auth/auth.service';

describe('AssignmentCapabilityStateService', () => {
  let service: AssignmentCapabilityStateService;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  const url = `${environment.apiUrl}/school/assignments/capability`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    service = TestBed.inject(AssignmentCapabilityStateService);
  });

  afterEach(() => httpMock.verify());

  it('starts idle with no capability known', () => {
    expect(service.loadState()).toBe('idle');
    expect(service.enabled()).toBe(false);
  });

  it('refresh() resolves to loaded + enabled on a normal 200 response with effectiveEnabled true', () => {
    service.refresh();
    const req = httpMock.expectOne(url);
    req.flush({ globalEnabled: true, providerEnabled: true, effectiveEnabled: true });
    expect(service.loadState()).toBe('loaded');
    expect(service.enabled()).toBe(true);
    expect(service.isOutage()).toBe(false);
    expect(service.unavailable()).toBe(false);
  });

  it('refresh() resolves to loaded + disabled on a normal 200 response with effectiveEnabled false (this is what WRITE_FROZEN looks like to this service -- it is a safe method, so it always gets a normal 200, never a 423)', () => {
    service.refresh();
    const req = httpMock.expectOne(url);
    req.flush({ globalEnabled: false, providerEnabled: false, effectiveEnabled: false });
    expect(service.loadState()).toBe('loaded');
    expect(service.enabled()).toBe(false);
    expect(service.unavailable()).toBe(false);
  });

  it('sets isOutage() true on a 503 (FULL_OUTAGE) response', () => {
    service.refresh();
    const req = httpMock.expectOne(url);
    req.flush({ code: 'FULL_OUTAGE', message: 'down', resource: null }, { status: 503, statusText: 'Service Unavailable' });
    expect(service.loadState()).toBe('error');
    expect(service.isOutage()).toBe(true);
    expect(service.unavailable()).toBe(true);
    expect(service.enabled()).toBe(false);
  });

  it('sets unavailable() true WITHOUT isOutage() on a non-503 failure (network error / unknown 5xx)', () => {
    service.refresh();
    const req = httpMock.expectOne(url);
    req.error(new ProgressEvent('network error'), { status: 0, statusText: 'Unknown Error' });
    expect(service.loadState()).toBe('error');
    expect(service.isOutage()).toBe(false);
    expect(service.unavailable()).toBe(true);
  });

  it('de-duplicates: calling refresh() again while one is already loading issues no second HTTP call', () => {
    service.refresh();
    httpMock.expectOne(url); // first call in flight, not flushed yet
    service.refresh(); // should be a no-op
    httpMock.verify(); // would throw if a second request were made
  });

  it("triggers exactly one refresh() when AuthService.currentUser() transitions from null to populated (ShellComponent's field-injection trigger, Plan §9.4)", () => {
    TestBed.flushEffects();
    httpMock.expectNone(url); // no providerId yet -- no refresh fired

    auth.currentUser.set({ email: 'a@b.com', role: 'SCHOOL_ADMIN', providerId: 7 });
    TestBed.flushEffects();

    const req = httpMock.expectOne(url);
    req.flush({ globalEnabled: true, providerEnabled: true, effectiveEnabled: true });
    expect(service.enabled()).toBe(true);
  });
});
