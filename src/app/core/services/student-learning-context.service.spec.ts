import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { StudentLearningContextService } from './student-learning-context.service';

describe('StudentLearningContextService', () => {
  let service: StudentLearningContextService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StudentLearningContextService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('clearForNewStudent clears the selected class and refetches classes for the new student (correction 1 security property)', () => {
    service.selectClass(301);
    expect(service.selectedClassId()).toBe(301);

    service.clearForNewStudent(2);
    expect(service.selectedClassId()).toBeNull();
    expect(service.classes()).toEqual([]); // no stale data from the previous student visible even before the new fetch resolves

    httpMock.expectOne(`${environment.apiUrl}/account/students/2/learning/classes`).flush([
      { classId: 401, className: 'New Student Class', schedule: 'Mon' }
    ]);
    expect(service.classes()[0].className).toBe('New Student Class');
  });

  it('a failed classes fetch degrades to an empty list, not an unhandled error', () => {
    service.clearForNewStudent(3);
    httpMock.expectOne(`${environment.apiUrl}/account/students/3/learning/classes`)
      .flush({ code: 'STUDENT_CONTEXT_UNAVAILABLE', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' });
    expect(service.classes()).toEqual([]);
  });
});
