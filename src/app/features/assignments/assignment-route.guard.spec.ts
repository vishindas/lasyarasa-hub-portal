import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { assignmentRouteGuard } from './assignment-route.guard';
import { AssignmentCapabilityStateService } from '../../core/services/assignment-capability-state.service';

/**
 * Corrected four-state contract (architect correction pass item 2):
 * enabled -> true; disabled -> redirect to /dashboard, false; outage/unknown
 * -> true (let AssignmentsShellComponent render in place, no redirect).
 */
describe('assignmentRouteGuard', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  const url = `${environment.apiUrl}/school/assignments/capability`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  function runGuard(): Promise<boolean> {
    const result = TestBed.runInInjectionContext(() => assignmentRouteGuard({} as never, {} as never));
    return firstValueFrom(result as Observable<boolean>);
  }

  it('allows activation when capability resolves enabled, without redirecting', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const resultPromise = runGuard();
    httpMock.expectOne(url).flush({ globalEnabled: true, providerEnabled: true, effectiveEnabled: true });
    expect(await resultPromise).toBe(true);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('redirects to /dashboard when capability resolves disabled', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const resultPromise = runGuard();
    httpMock.expectOne(url).flush({ globalEnabled: false, providerEnabled: false, effectiveEnabled: false });
    expect(await resultPromise).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('allows activation (does NOT redirect) on FULL_OUTAGE -- the shell renders the outage block in place', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const resultPromise = runGuard();
    httpMock.expectOne(url).flush({ code: 'FULL_OUTAGE', message: 'down', resource: null }, { status: 503, statusText: 'Service Unavailable' });
    expect(await resultPromise).toBe(true);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('allows activation (does NOT redirect) on an unknown/network failure -- the shell renders the retry state in place', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const resultPromise = runGuard();
    httpMock.expectOne(url).error(new ProgressEvent('network error'), { status: 0, statusText: 'Unknown Error' });
    expect(await resultPromise).toBe(true);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does not issue a duplicate capability request when one is already loaded (loadState !== idle)', async () => {
    const capabilityState = TestBed.inject(AssignmentCapabilityStateService);
    capabilityState.refresh();
    httpMock.expectOne(url).flush({ globalEnabled: true, providerEnabled: true, effectiveEnabled: true });

    const resultPromise = runGuard();
    expect(await resultPromise).toBe(true);
    httpMock.expectNone(url);
  });
});
