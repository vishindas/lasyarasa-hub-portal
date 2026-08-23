import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AssignmentInstanceApiService } from './assignment-instance-api.service';

describe('AssignmentInstanceApiService (all 7 endpoints)', () => {
  let service: AssignmentInstanceApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/school/assignments/instances`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AssignmentInstanceApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('assign() -> POST /instances', () => {
    const body = { templateId: 1, classId: 2, dueAt: '2026-01-01', idempotencyKey: 'k' };
    service.assign(body).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('list() -> GET /instances with classId + paging', () => {
    service.list(9, 0, 20).subscribe();
    const req = httpMock.expectOne(`${base}?page=0&size=20&classId=9`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('get() -> GET /instances/:id', () => {
    service.get(1).subscribe();
    const req = httpMock.expectOne(`${base}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('students() -> GET /instances/:id/students', () => {
    service.students(1).subscribe();
    const req = httpMock.expectOne(`${base}/1/students`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('lateEnrollees() -> GET /instances/:id/late-enrollees', () => {
    service.lateEnrollees(1).subscribe();
    const req = httpMock.expectOne(`${base}/1/late-enrollees`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('issue() -> POST /instances/:id/students/:sid/issue', () => {
    service.issue(1, 5).subscribe();
    const req = httpMock.expectOne(`${base}/1/students/5/issue`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('skip() -> POST /instances/:id/students/:sid/skip', () => {
    service.skip(1, 5).subscribe();
    const req = httpMock.expectOne(`${base}/1/students/5/skip`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });
});
