import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { studentLearningAccessInterceptor } from './student-learning-access.interceptor';
import { StudentAccessLossService } from './student-access-loss.service';

describe('studentLearningAccessInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let loss: StudentAccessLossService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([studentLearningAccessInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    loss = TestBed.inject(StudentAccessLossService);
  });

  afterEach(() => httpMock.verify());

  it('records the studentId (extracted from the URL) on a STUDENT_CONTEXT_UNAVAILABLE 404, and still propagates the error', () => {
    let errored = false;
    http.get('/api/account/students/42/learning/home').subscribe({ error: () => errored = true });
    httpMock.expectOne('/api/account/students/42/learning/home')
      .flush({ code: 'STUDENT_CONTEXT_UNAVAILABLE', message: 'x', resource: 'Student' }, { status: 404, statusText: 'Not Found' });
    expect(loss.lostAccessFor()).toBe(42);
    expect(errored).toBe(true);
  });

  it('does not record loss for a different error code on the same route family', () => {
    http.get('/api/account/students/42/learning/home').subscribe({ error: () => {} });
    httpMock.expectOne('/api/account/students/42/learning/home')
      .flush({ code: 'LEARNING_CONTENT_NOT_FOUND', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' });
    expect(loss.lostAccessFor()).toBeNull();
  });

  it('does not touch the pre-existing My Students list endpoint (no /learning/ segment)', () => {
    http.get('/api/account/students').subscribe({ error: () => {} });
    httpMock.expectOne('/api/account/students').flush({}, { status: 404, statusText: 'Not Found' });
    expect(loss.lostAccessFor()).toBeNull();
  });
});
