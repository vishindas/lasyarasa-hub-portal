import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { StudentLearningApiService } from './student-learning-api.service';

describe('StudentLearningApiService', () => {
  let service: StudentLearningApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/account/students/7/learning`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StudentLearningApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('classes() calls GET .../learning/classes', () => {
    service.classes(7).subscribe();
    httpMock.expectOne(`${base}/classes`).flush([]);
  });

  it('home() with no classId omits the query param', () => {
    service.home(7).subscribe();
    httpMock.expectOne(`${base}/home`).flush({ classSelectionRequired: false });
  });

  it('home() with a classId includes it as a query param', () => {
    service.home(7, 301).subscribe();
    httpMock.expectOne(`${base}/home?classId=301`).flush({ classSelectionRequired: false });
  });

  it('learningPath() calls the exact deployed Slice 11 path', () => {
    service.learningPath(7, 301).subscribe();
    httpMock.expectOne(`${base}/classes/301/learning-path`).flush({ curriculumTitle: 'x', level: null, modules: [] });
  });

  it('moduleDetail() calls the exact deployed Slice 11 path', () => {
    service.moduleDetail(7, 301, 9).subscribe();
    httpMock.expectOne(`${base}/classes/301/modules/9`).flush({ moduleId: 9, title: 'x', moduleOrder: 1, status: 'RELEASED' });
  });

  it('lessonDetail() calls the exact deployed Slice 11 path -- no shortcut/alias route (matches the backend controller doc comment)', () => {
    service.lessonDetail(7, 301, 9, 501).subscribe();
    httpMock.expectOne(`${base}/classes/301/modules/9/lessons/501`).flush({ lessonId: 501, moduleId: 9, title: 'x', contentType: 'TEXT', lessonOrder: 1 });
  });

  it('classInfo() calls the exact deployed Slice 11 path', () => {
    service.classInfo(7, 301).subscribe();
    httpMock.expectOne(`${base}/classes/301/class-info`).flush({ className: 'x', schedule: null });
  });
});
