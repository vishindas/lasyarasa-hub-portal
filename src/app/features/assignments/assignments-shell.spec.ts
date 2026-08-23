import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AssignmentsShellComponent } from './assignments-shell';
import { AssignmentCapabilityStateService } from '../../core/services/assignment-capability-state.service';

describe('AssignmentsShellComponent (capability route states, correction pass item 2)', () => {
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/school/assignments/capability`;

  function setup() {
    TestBed.configureTestingModule({
      imports: [AssignmentsShellComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    // In real operation, ShellComponent's field injection / assignment-route.guard.ts
    // has already triggered this before AssignmentsShellComponent ever renders --
    // this component itself never issues its own request (Plan §9: no duplicate
    // independent capability requests). Simulate that here explicitly.
    TestBed.inject(AssignmentCapabilityStateService).refresh();
    const fixture = TestBed.createComponent(AssignmentsShellComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('renders neither the outage block nor the retry block while loading', () => {
    const fixture = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.outage')).toBeFalsy();
    expect(el.querySelector('.retry-block')).toBeFalsy();
    httpMock.expectOne(url).flush({ globalEnabled: true, providerEnabled: true, effectiveEnabled: true });
  });

  it('renders the router-outlet (not blocked) once capability resolves enabled', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ globalEnabled: true, providerEnabled: true, effectiveEnabled: true });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.outage')).toBeFalsy();
    expect(el.querySelector('.retry-block')).toBeFalsy();
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('renders the established full-outage block on FULL_OUTAGE, not a retry/disabled state', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ code: 'FULL_OUTAGE', message: 'down', resource: null }, { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.outage')).toBeTruthy();
    expect(el.querySelector('.retry-block')).toBeFalsy();
  });

  it('renders a distinct retryable error state on an unknown/network failure, with a Retry action that calls refresh()', () => {
    const fixture = setup();
    httpMock.expectOne(url).error(new ProgressEvent('network error'), { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.retry-block')).toBeTruthy();
    expect(el.querySelector('.outage')).toBeFalsy();

    const capabilityState = TestBed.inject(AssignmentCapabilityStateService);
    // Only asserting the button wires to refresh() -- refresh()'s own network
    // behavior is covered by assignment-capability-state.service.spec.ts;
    // mocked here so this test doesn't leave an unflushed HTTP request behind.
    const refreshSpy = vi.spyOn(capabilityState, 'refresh').mockImplementation(() => {});
    const retryButton = el.querySelector('.retry-block button') as HTMLButtonElement;
    retryButton.click();
    expect(refreshSpy).toHaveBeenCalled();
  });
});
