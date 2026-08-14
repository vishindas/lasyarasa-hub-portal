import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ClassPickerComponent } from './class-picker';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

/**
 * Architect decision 3 (Class Picker curriculum-name enrichment): parallel
 * fetch, bounded to the trusted classes list, one failure never blanks the
 * whole screen, class name/schedule always come from StudentClassDTO.
 */
describe('ClassPickerComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [ClassPickerComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '42' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(ClassPickerComponent);
  }

  afterEach(() => httpMock.verify());

  it('fetches Class Info for every returned class in parallel (all requests open before any is flushed), never sequentially', () => {
    const fixture = setup();
    fixture.detectChanges();

    const classesReq = httpMock.expectOne(`${environment.apiUrl}/account/students/42/learning/classes`);
    classesReq.flush([
      { classId: 301, className: 'Saturday Beginners', schedule: 'Sat 10am' },
      { classId: 302, className: 'Weekday Intensive', schedule: 'Tue 5pm' }
    ]);
    fixture.detectChanges();

    // Both Class Info calls must already be open before either is answered -- proves parallel, not chained.
    const req301 = httpMock.expectOne(`${environment.apiUrl}/account/students/42/learning/classes/301/class-info`);
    const req302 = httpMock.expectOne(`${environment.apiUrl}/account/students/42/learning/classes/302/class-info`);
    expect(req301).toBeTruthy();
    expect(req302).toBeTruthy();

    req301.flush({ className: 'Saturday Beginners', schedule: 'Sat 10am', curriculumTitle: 'Foundations', level: 'Beginner' });
    req302.flush({ className: 'Weekday Intensive', schedule: 'Tue 5pm' });
    fixture.detectChanges();

    const cards = fixture.componentInstance.cards();
    expect(cards[0].curriculumState).toContain('Foundations');
    expect(cards[1].curriculumState).toBe('none');
  });

  it('one failed Class Info call degrades only that card, never blanks the whole picker', () => {
    const fixture = setup();
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/account/students/42/learning/classes`).flush([
      { classId: 301, className: 'Saturday Beginners', schedule: 'Sat 10am' },
      { classId: 302, className: 'Weekday Intensive', schedule: 'Tue 5pm' }
    ]);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/account/students/42/learning/classes/301/class-info`)
      .flush({ code: 'LEARNING_CONTENT_NOT_FOUND', message: 'x', resource: null }, { status: 404, statusText: 'Not Found' });
    httpMock.expectOne(`${environment.apiUrl}/account/students/42/learning/classes/302/class-info`)
      .flush({ className: 'Weekday Intensive', schedule: 'Tue 5pm', curriculumTitle: 'Technique' });
    fixture.detectChanges();

    const cards = fixture.componentInstance.cards();
    expect(cards.length).toBe(2); // the whole picker is not blanked
    expect(cards[0].curriculumState).toBe('unavailable'); // the one failure degrades only its own card
    expect(cards[0].className).toBe('Saturday Beginners'); // name/schedule still come from StudentClassDTO, unaffected
    expect(cards[1].curriculumState).toContain('Technique');
  });

  it('class name and schedule always come from StudentClassDTO, never overwritten by the Class Info enrichment call', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/students/42/learning/classes`).flush([
      { classId: 301, className: 'Saturday Beginners', schedule: 'Sat 10am' }
    ]);
    fixture.detectChanges();
    // Class Info deliberately returns a DIFFERENT className to prove the picker never trusts it for identity.
    httpMock.expectOne(`${environment.apiUrl}/account/students/42/learning/classes/301/class-info`)
      .flush({ className: 'Should Not Be Used', schedule: 'Should Not Be Used', curriculumTitle: 'Foundations' });
    fixture.detectChanges();

    expect(fixture.componentInstance.cards()[0].className).toBe('Saturday Beginners');
    expect(fixture.componentInstance.cards()[0].schedule).toBe('Sat 10am');
  });
});
