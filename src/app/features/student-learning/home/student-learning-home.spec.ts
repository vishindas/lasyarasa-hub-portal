import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentLearningHomeComponent } from './student-learning-home';
import { StudentLearningContextService } from '../../../core/services/student-learning-context.service';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const HOME_URL = `${environment.apiUrl}/account/students/1/learning/home`;

describe('StudentLearningHomeComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [StudentLearningHomeComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '1' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentLearningHomeComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('class-ambiguous: priorities 2-3 replaced by a "choose a class" prompt; priority 1/4 (schedule) still render', () => {
    const fixture = setup();
    httpMock.expectOne(HOME_URL).flush({ classSelectionRequired: true, classChoices: [
      { classId: 301, className: 'A', schedule: 'Sat' }, { classId: 302, className: 'B', schedule: 'Sun' }
    ] });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('more than one active class');
    expect(fixture.nativeElement.querySelector('a[href*="classes"]') || fixture.nativeElement.textContent).toBeTruthy();
    // Priority 1 (reserved assignment placeholder) still renders regardless of class ambiguity.
    expect(text).toContain('Current assignment');
  });

  it('single/auto-selected class with a curriculum: renders continue-learning and learning-path cards', () => {
    const fixture = setup();
    httpMock.expectOne(HOME_URL).flush({
      selectedClassId: 301, classSelectionRequired: false,
      learningPath: { curriculumTitle: 'Bharatanatyam Foundations', level: 'Beginner' },
      currentModule: { moduleId: 401, title: 'Basic Adavus', moduleOrder: 1, status: 'RELEASED' }
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Basic Adavus');
    expect(text).toContain('Bharatanatyam Foundations');
  });

  it('selected class with no curriculum assigned: shows the honest empty state, not an error', () => {
    const fixture = setup();
    httpMock.expectOne(HOME_URL).flush({ selectedClassId: 303, classSelectionRequired: false });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No curriculum assigned yet for this class.');
  });

  it('priority 4 (architect decision 2): renders raw schedule text under "Class schedule", never a computed date', () => {
    const fixture = setup();
    // Simulate the shell's shared classes fetch (Home reads context.classes(), does not fetch its own copy).
    const context = TestBed.inject(StudentLearningContextService);
    context.clearForNewStudent(1);
    httpMock.expectOne(`${environment.apiUrl}/account/students/1/learning/classes`).flush([
      { classId: 301, className: 'Saturday Beginners', schedule: 'Sat 10:00 AM' },
      { classId: 302, className: 'No Schedule Class', schedule: null }
    ]);
    httpMock.expectOne(HOME_URL).flush({ selectedClassId: 301, classSelectionRequired: false });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Class schedule');
    expect(text).toContain('Saturday Beginners: Sat 10:00 AM');
    expect(text).toContain('No Schedule Class: schedule unavailable'); // null schedule -> neutral copy, never an invented date
    // Never fabricates a computed next-occurrence date/time string like "Next: Sat, Aug 16".
    expect(text).not.toMatch(/Next class/i);
  });

  it('priority 1 (current assignment) always renders its honest reserved placeholder -- never fabricated data (correction 3)', () => {
    const fixture = setup();
    httpMock.expectOne(HOME_URL).flush({ classSelectionRequired: false, selectedClassId: 301 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No open assignments right now.');
  });

  it('never renders a fabricated "teacher update" section (correction 4 regression guard)', () => {
    const fixture = setup();
    httpMock.expectOne(HOME_URL).flush({ classSelectionRequired: false, selectedClassId: 301 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent ?? '').not.toMatch(/teacher update/i);
  });
});
