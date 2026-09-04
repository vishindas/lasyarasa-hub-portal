import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentLearningContextService } from '../../../core/services/student-learning-context.service';
import { LearningPathComponent } from './learning-path';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

describe('LearningPathComponent', () => {
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/account/students/1/learning/classes/2/learning-path`;

  function setup() {
    TestBed.configureTestingModule({
      imports: [LearningPathComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '1', classId: '2' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LearningPathComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('no numeric progress bar is ever rendered (Draft 1.3 Appendix A.3)', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({
      curriculumTitle: 'Foundations', level: 'Beginner',
      modules: [{ moduleId: 1, title: 'M1', moduleOrder: 1, status: 'RELEASED', objectives: 'x', publishedLessonCount: 2 }]
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('progress, [role="progressbar"], mat-progress-bar')).toBeNull();
  });

  it('empty modules list renders an honest empty row, not a blank screen', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ curriculumTitle: 'Foundations', level: 'Beginner', modules: [] });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No modules have been released yet.');
  });

  it('no curriculum assignment at all: the shared LEARNING_CONTENT_NOT_FOUND state renders, not an empty modules list', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ code: 'LEARNING_CONTENT_NOT_FOUND', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()?.kind).toBe('learning-content-not-found');
  });

  it('UX-2: arriving here establishes this class as the active context, so the persistent class-context bar stays accurate regardless of how this screen was reached', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ curriculumTitle: 'Foundations', level: 'Beginner', modules: [] });
    fixture.detectChanges();

    const context = TestBed.inject(StudentLearningContextService);
    expect(context.selectedClassId()).toBe(2);
  });
});
