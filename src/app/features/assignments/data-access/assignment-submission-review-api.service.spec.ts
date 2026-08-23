import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AssignmentSubmissionReviewApiService } from './assignment-submission-review-api.service';

describe('AssignmentSubmissionReviewApiService (3 feature-scoped, answer-key-bearing endpoints)', () => {
  let service: AssignmentSubmissionReviewApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/school/assignments/submissions`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AssignmentSubmissionReviewApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getDetail() -> GET /submissions/:id', () => {
    service.getDetail(1).subscribe();
    const req = httpMock.expectOne(`${base}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('validate() -> POST /submissions/:id/validate with expectedRowVersion + expectedAttemptId', () => {
    const body = { expectedRowVersion: 3, expectedAttemptId: 99 };
    service.validate(1, body).subscribe();
    const req = httpMock.expectOne(`${base}/1/validate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });

  it('requestRevision() -> POST /submissions/:id/request-revision', () => {
    const body = { expectedRowVersion: 3, expectedAttemptId: 99, flaggedQuestionIds: [1], feedback: 'try again' };
    service.requestRevision(1, body).subscribe();
    const req = httpMock.expectOne(`${base}/1/request-revision`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });
});
