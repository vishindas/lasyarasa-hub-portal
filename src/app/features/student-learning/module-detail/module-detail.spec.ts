import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ModuleDetailComponent } from './module-detail';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

describe('ModuleDetailComponent', () => {
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/account/students/1/learning/classes/2/modules/9`;

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
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()?.kind).toBe('learning-content-not-found');
  });

  it('never shows a per-student completion count or badge (correction 2)', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({
      moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', objectives: 'Learn.',
      lessons: [{ lessonId: 1, title: 'L1', contentType: 'TEXT', lessonOrder: 1 }]
    });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toMatch(/\d+\s*of\s*\d+\s*lessons?\s*completed/i);
    expect(text).not.toMatch(/completed/i);
  });

  it('empty published-lessons list renders an honest empty row, module header still shown', () => {
    const fixture = setup();
    httpMock.expectOne(url).flush({ moduleId: 9, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED', objectives: 'Learn.', lessons: [] });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Basic Adavus');
    expect(text).toContain('No lessons have been published for this module yet.');
  });
});
