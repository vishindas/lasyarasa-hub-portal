import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PortalAccessApiService } from './portal-access-api.service';

describe('PortalAccessApiService', () => {
  let service: PortalAccessApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/school/v2/students`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PortalAccessApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getStatus() -> GET /students/:id/portal-access-status', () => {
    service.getStatus(42).subscribe();
    const req = httpMock.expectOne(`${base}/42/portal-access-status`);
    expect(req.request.method).toBe('GET');
    req.flush({ self: { accessStatus: null, userId: null, credentialsEstablished: null, hasLiveInvitation: false, pendingInvitationEmail: null }, guardians: [] });
  });

  it('invite() -> POST /students/:id/invite-access with the exact body', () => {
    const body = { accessType: 'SELF' as const, guardianId: null, confirmed: true };
    service.invite(42, body).subscribe();
    const req = httpMock.expectOne(`${base}/42/invite-access`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ invitationId: 1, expiresAt: '2026-01-01T00:00:00', delivered: true });
  });

  it('enableAccess() -> POST /students/:id/enable-portal-access with the exact body', () => {
    const body = { loginEmail: 'typed@example.com', accessType: 'GUARDIAN' as const, guardianId: 7 };
    service.enableAccess(42, body).subscribe();
    const req = httpMock.expectOne(`${base}/42/enable-portal-access`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ outcome: 'GRANTED_AND_INVITED', userId: 5, accessId: 9 });
  });
});
