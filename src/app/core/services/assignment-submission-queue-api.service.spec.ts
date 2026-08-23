import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AssignmentSubmissionQueueApiService } from './assignment-submission-queue-api.service';

describe('AssignmentSubmissionQueueApiService (1 core, answer-key-free endpoint)', () => {
  let service: AssignmentSubmissionQueueApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/school/assignments/submissions`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AssignmentSubmissionQueueApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('queue() -> GET /submissions with paging', () => {
    service.queue(0, 20).subscribe();
    const req = httpMock.expectOne(`${base}?page=0&size=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });
});
