import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ModuleDetailComponent } from './module-detail';
import { StudentAssignmentSummaryDTO } from '../../student-assignments/data-access/student-assignment.model';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

function assignment(overrides: Partial<StudentAssignmentSummaryDTO> = {}): StudentAssignmentSummaryDTO {
  return { id: 1, instanceId: 1, title: 'Quiz', dueAt: '2026-12-01T00:00:00', status: 'DRAFT', attemptNumber: 0, ...overrides };
}

describe('ModuleDetailComponent', () => {
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/account/students/1/learning/classes/2/modules/9`;
  const assignmentsUrl = `${environment.apiUrl}/account/students/1/learning/assignments/by-module/9`;

  function setup() {
    TestBed.configureTestingModule({
      imports: [ModuleDetailComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '1', classId: '2', moduleId: '9' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ModuleDetailComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('a LOCKED/WITHDRAWN direct request is rejected with the shared LEARNING_CONTENT_NOT_FOUND state -- no distinct "locked" screen here (Part VII.2)', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ code: 'LEARNING_CONTENT_NOT_FOUND', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' });
    httpMock.expectOne(assignmentsUrl).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()?.kind).toBe('learning-content-not-found');
  });

  it('never shows a per-student completion count or badge (correction 2)', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({
      moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', objectives: 'Learn.',
      lessons: [{ lessonId: 1, title: 'L1', contentType: 'TEXT', lessonOrder: 1 }]
    });
    httpMock.expectOne(assignmentsUrl).flush([]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toMatch(/\d+\s*of\s*\d+\s*lessons?\s*completed/i);
    expect(text).not.toMatch(/completed/i);
  });

  it('empty published-lessons list renders an honest empty row, module header still shown', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', objectives: 'Learn.', lessons: [] });
    httpMock.expectOne(assignmentsUrl).flush([]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Basic Adavus');
    expect(text).toContain('No lessons have been published for this module yet.');
  });

  // ---- UX-7C: Related Assignments ----

  it('UX-7C: renders related assignments alongside lessons, and never repeats "Module: X" inside the module\'s own page', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', lessons: [{ lessonId: 1, title: 'L1', contentType: 'TEXT', lessonOrder: 1 }] });
    httpMock.expectOne(assignmentsUrl).flush([assignment({ title: 'Quiz 1' })]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Related Assignments');
    expect(text).toContain('Quiz 1');
    expect(text).not.toContain('Module:');
  });

  it('UX-7C: lessons only -- an honest empty note for Related Assignments, independent of the lessons section', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', lessons: [{ lessonId: 1, title: 'L1', contentType: 'TEXT', lessonOrder: 1 }] });
    httpMock.expectOne(assignmentsUrl).flush([]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No assignments for this module yet.');
    expect(text).toContain('L1');
  });

  it('UX-7C: assignments only -- lessons\' own empty note and Related Assignments both render independently', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', lessons: [] });
    httpMock.expectOne(assignmentsUrl).flush([assignment({ title: 'Quiz 1' })]);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No lessons have been published for this module yet.');
    expect(text).toContain('Quiz 1');
  });

  it('UX-7C: a related-assignments fetch failure never blocks lesson content, and is shown as its own error', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', lessons: [{ lessonId: 1, title: 'L1', contentType: 'TEXT', lessonOrder: 1 }] });
    httpMock.expectOne(assignmentsUrl).flush({ code: 'LEARNING_CONTENT_NOT_FOUND', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBeNull();
    expect(fixture.componentInstance.relatedAssignmentsError()?.kind).toBe('feature-unavailable');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Basic Adavus');
    expect(text).toContain('L1');
    expect(text).toContain('Assignments are not available right now.');
  });

  it('UX-7C: clicking a related assignment navigates to the existing Assignment Detail route', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', lessons: [] });
    httpMock.expectOne(assignmentsUrl).flush([assignment({ id: 42 })]);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.row-action') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain('/my-students/1/assignments/42');
  });
});
