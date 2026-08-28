import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentLearningContextService } from '../../../core/services/student-learning-context.service';
import { ClassInfoComponent } from './class-info';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

/**
 * D2: Class Details. Reuses classInfo() + learningPath() (already deployed,
 * no new endpoint) and ModuleSummaryRowComponent (already deployed, no
 * duplicated row logic). The two calls are independent -- these tests
 * cover both full-page and section-scoped failure.
 */
describe('ClassInfoComponent (D2 Class Details)', () => {
  let httpMock: HttpTestingController;
  const infoUrl = `${environment.apiUrl}/account/students/117/learning/classes/11/class-info`;
  const pathUrl = `${environment.apiUrl}/account/students/117/learning/classes/11/learning-path`;

  function setup() {
    TestBed.configureTestingModule({
      imports: [ClassInfoComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '117', classId: '11' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ClassInfoComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('selected-class identity is unambiguous: the H1 is the real class name, not a generic label', () => {
    const fixture = setup();
    httpMock.expectOne(infoUrl).flush({ className: 'PILOT Assignment Class', schedule: 'Sat 10am', providerDisplayName: 'Dev Dance School' });
    httpMock.expectOne(pathUrl).flush({ curriculumTitle: 'Kuchipudi', level: null, modules: [] });
    fixture.detectChanges();

    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent).toBe('PILOT Assignment Class');
  });

  it('renders schedule, curriculum/level, and school name from classInfo()', () => {
    const fixture = setup();
    httpMock.expectOne(infoUrl).flush({
      className: 'PILOT Assignment Class', schedule: 'Sat 10am', curriculumTitle: 'Kuchipudi', level: 'Beginner', providerDisplayName: 'Dev Dance School'
    });
    httpMock.expectOne(pathUrl).flush({ curriculumTitle: 'Kuchipudi', level: 'Beginner', modules: [] });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sat 10am');
    expect(text).toContain('Kuchipudi');
    expect(text).toContain('Beginner');
    expect(text).toContain('Dev Dance School');
  });

  it('D2 backend companion: renders Dance Style and Age Group clearly when classInfo() provides them', () => {
    const fixture = setup();
    httpMock.expectOne(infoUrl).flush({
      className: 'PILOT Assignment Class', schedule: 'Sat 10am', danceStyleName: 'Kuchipudi', ageGroupName: 'Under 12'
    });
    httpMock.expectOne(pathUrl).flush({ curriculumTitle: '', level: null, modules: [] });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const dts = Array.from(el.querySelectorAll('dt')).map(d => d.textContent);
    expect(dts).toContain('Dance Style');
    expect(dts).toContain('Age Group');
    expect(el.textContent).toContain('Kuchipudi');
    expect(el.textContent).toContain('Under 12');
  });

  it('missing-detail: no curriculum, dance style, or age group omits all three rows entirely rather than showing blank fields', () => {
    const fixture = setup();
    httpMock.expectOne(infoUrl).flush({ className: 'PILOT Assignment Class', schedule: null });
    httpMock.expectOne(pathUrl).flush({ curriculumTitle: '', level: null, modules: [] });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const dts = Array.from(el.querySelectorAll('dt')).map(d => d.textContent);
    expect(dts).not.toContain('Curriculum');
    expect(dts).not.toContain('Dance Style');
    expect(dts).not.toContain('Age Group');
    expect(el.textContent).toContain('Not available'); // schedule fallback
    expect(el.textContent).toContain('No modules have been released yet.');
  });

  it('renders the released-module summary using the existing ModuleSummaryRowComponent (reused, not duplicated)', () => {
    const fixture = setup();
    httpMock.expectOne(infoUrl).flush({ className: 'PILOT Assignment Class', schedule: 'Sat 10am' });
    httpMock.expectOne(pathUrl).flush({
      curriculumTitle: 'Kuchipudi', level: 'Beginner',
      modules: [
        { moduleId: 5, title: 'PILOT Lesson Module', moduleOrder: 1, status: 'RELEASED', objectives: 'x', publishedLessonCount: 1 },
        { moduleId: 6, title: 'Locked Module', moduleOrder: 2, status: 'LOCKED' }
      ]
    });
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('app-module-summary-row');
    expect(rows.length).toBe(2);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('PILOT Lesson Module');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Locked Module');
  });

  it('authorization/full-page error: a rejected classInfo() call shows the error state, never partial data', () => {
    const fixture = setup();
    httpMock.expectOne(infoUrl).flush(
      { code: 'CLASS_CONTEXT_UNAVAILABLE', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' }
    );
    httpMock.expectOne(pathUrl).flush({ curriculumTitle: 'Kuchipudi', level: null, modules: [] });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBeTruthy();
    expect(fixture.componentInstance.info()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Sat 10am');
  });

  it('partial-error: a failed learningPath() call degrades only the module section -- the class-info header still renders', () => {
    const fixture = setup();
    httpMock.expectOne(infoUrl).flush({ className: 'PILOT Assignment Class', schedule: 'Sat 10am', providerDisplayName: 'Dev Dance School' });
    httpMock.expectOne(pathUrl).flush(
      { code: 'LEARNING_CONTENT_NOT_FOUND', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PILOT Assignment Class');
    expect(text).toContain('Sat 10am');
    expect(text).toContain("Module details aren't available right now.");
    expect(fixture.componentInstance.loadError()).toBeNull();
  });

  // ---------- D2 correction: shell class-context synchronization ----------

  it('direct authorized class-info URL synchronizes the shell\'s selected class', () => {
    const fixture = setup();
    const context = TestBed.inject(StudentLearningContextService);
    expect(context.selectedClassId()).toBeNull(); // nothing exposed before authorization succeeds

    httpMock.expectOne(infoUrl).flush({ className: 'PILOT Assignment Class', schedule: 'Sat 10am' });
    httpMock.expectOne(pathUrl).flush({ curriculumTitle: '', level: null, modules: [] });
    fixture.detectChanges();

    expect(context.selectedClassId()).toBe(11);
  });

  it('unauthorized/invalid classId never syncs the shell context -- it never exposes the routed class name', () => {
    const fixture = setup();
    const context = TestBed.inject(StudentLearningContextService);

    httpMock.expectOne(infoUrl).flush(
      { code: 'CLASS_CONTEXT_UNAVAILABLE', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' }
    );
    httpMock.expectOne(pathUrl).flush({ curriculumTitle: '', level: null, modules: [] });
    fixture.detectChanges();

    expect(context.selectedClassId()).toBeNull();
  });

  it('switching class updates both the shell context and the details -- not just first-load initialization', () => {
    // Simulates arriving at this class-info route while the shell context
    // still names a PREVIOUSLY selected, different class (11's own route
    // param is 11, established by activatedRouteStub in setup()) --
    // proves the sync genuinely switches the value, not only sets it once
    // from null.
    const fixture = setup();
    const context = TestBed.inject(StudentLearningContextService);
    context.selectClass(999);
    expect(context.selectedClassId()).toBe(999);

    httpMock.expectOne(infoUrl).flush({ className: 'PILOT Assignment Class', schedule: 'Sat 10am' });
    httpMock.expectOne(pathUrl).flush({ curriculumTitle: '', level: null, modules: [] });
    fixture.detectChanges();

    expect(context.selectedClassId()).toBe(11);
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe('PILOT Assignment Class');
  });
});
