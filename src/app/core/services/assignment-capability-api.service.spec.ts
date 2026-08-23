import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AssignmentCapabilityApiService } from './assignment-capability-api.service';

describe('AssignmentCapabilityApiService', () => {
  let service: AssignmentCapabilityApiService;
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/school/assignments/capability`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AssignmentCapabilityApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('get() -> GET /capability', () => {
    service.get().subscribe();
    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush({ globalEnabled: false, providerEnabled: false, effectiveEnabled: false });
  });
});
