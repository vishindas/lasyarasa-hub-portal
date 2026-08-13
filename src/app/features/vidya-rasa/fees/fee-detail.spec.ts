import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterLink, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Fee } from '../../../core/models/fee.model';
import { FeeDetailComponent } from './fee-detail';

describe('FeeDetailComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FeeDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '241' } } }
        }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('links the Student panel name to the canonical student detail route', () => {
    const fixture = TestBed.createComponent(FeeDetailComponent);
    fixture.detectChanges();

    const fee: Fee = {
      id: 241,
      studentId: 73,
      studentName: 'Preetha Prem',
      amount: 100,
      dueDate: '2026-08-12',
      paidAt: null,
      status: 'PENDING',
      notes: ''
    };

    httpMock.expectOne(`${environment.apiUrl}/school/fees/241`).flush(fee);
    httpMock.expectOne(`${environment.apiUrl}/school/v2/students/73`).flush({
      guardians: [],
      enrollments: []
    });
    httpMock.expectOne(`${environment.apiUrl}/school/settings/fee-tiers`).flush([]);
    fixture.detectChanges();

    const link = fixture.debugElement.query(By.directive(RouterLink));
    expect(link.nativeElement.textContent.trim()).toBe('Preetha Prem');
    expect(link.nativeElement.getAttribute('href')).toBe('/vidya-rasa/students/73');
  });

  it('shows active classes as links and available guardian details below the student name', () => {
    const fixture = TestBed.createComponent(FeeDetailComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/school/fees/241`).flush({
      id: 241, studentId: 73, studentName: 'Preetha Prem', amount: 100,
      dueDate: '2026-08-12', paidAt: null, status: 'PENDING', notes: ''
    } satisfies Fee);
    httpMock.expectOne(`${environment.apiUrl}/school/v2/students/73`).flush({
      guardians: [{ firstName: 'Anita', lastName: 'Prem', relationship: 'Mother' }],
      enrollments: [
        { classId: 12, className: 'Saturday Beginners', status: 'ACTIVE' },
        { classId: 13, className: 'Previous Class', status: 'DROPPED' }
      ]
    });
    httpMock.expectOne(`${environment.apiUrl}/school/settings/fee-tiers`).flush([]);
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.directive(RouterLink));
    const classLink = links.find(link => link.nativeElement.textContent.trim() === 'Saturday Beginners');
    expect(classLink?.nativeElement.getAttribute('href')).toBe('/vidya-rasa/classes/12');
    expect(fixture.nativeElement.textContent).toContain('Anita Prem');
    expect(fixture.nativeElement.textContent).toContain('(Mother)');
    expect(fixture.nativeElement.textContent).not.toContain('Previous Class');
  });
});
