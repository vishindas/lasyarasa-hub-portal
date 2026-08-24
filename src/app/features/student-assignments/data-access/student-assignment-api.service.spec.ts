import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { StudentAssignmentApiService } from './student-assignment-api.service';

describe('StudentAssignmentApiService (all 7 endpoints)', () => {
  let service: StudentAssignmentApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/account/students/201/learning/assignments`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StudentAssignmentApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() -> GET .../assignments', () => {
    service.list(201).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getDetail() -> GET .../assignments/:id', () => {
    service.getDetail(201, 5001).subscribe();
    const req = httpMock.expectOne(`${base}/5001`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getAttemptHistory() -> GET .../assignments/:id/attempts', () => {
    service.getAttemptHistory(201, 5001).subscribe();
    const req = httpMock.expectOne(`${base}/5001/attempts`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('listDrafts() -> GET .../assignments/:id/draft', () => {
    service.listDrafts(201, 5001).subscribe();
    const req = httpMock.expectOne(`${base}/5001/draft`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('saveDraft() -> PUT .../assignments/:id/draft/:questionId with the exact body', () => {
    const body = { textResponse: 'answer', selectedOptionIds: null, expectedDraftRowVersion: 0 };
    service.saveDraft(201, 5001, 7001, body).subscribe();
    const req = httpMock.expectOne(`${base}/5001/draft/7001`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('submit() -> POST .../assignments/:id/submit with the exact body', () => {
    service.submit(201, 5001, { expectedRowVersion: 3 }).subscribe();
    const req = httpMock.expectOne(`${base}/5001/submit`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ expectedRowVersion: 3 });
    req.flush({});
  });

  it('resubmit() -> POST .../assignments/:id/resubmit with the exact body', () => {
    service.resubmit(201, 5001, { expectedRowVersion: 4 }).subscribe();
    const req = httpMock.expectOne(`${base}/5001/resubmit`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ expectedRowVersion: 4 });
    req.flush({});
  });
});
