import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ClassCurriculumManagementComponent } from './class-curriculum-management';

describe('ClassCurriculumManagementComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [ClassCurriculumManagementComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideAnimationsAsync(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(ClassCurriculumManagementComponent);
  }

  afterEach(() => httpMock.verify());

  it('a 404 on the current assignment is treated as the "no curriculum assigned" empty state, not a load error', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/school/classes/7/curriculum-assignment`)
      .flush({ code: 'RESOURCE_NOT_FOUND', message: 'none', resource: 'ClassCurriculumAssignment' }, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance.assignment()).toBeNull();
    expect(fixture.componentInstance.loadError()).toBeNull();
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('joins modules to module states by moduleId, sorted by moduleOrder', () => {
    const fixture = setup();
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/school/classes/7/curriculum-assignment`)
      .flush({ id: 50, classId: 7, curriculumVersionId: 20, activeFrom: '', activeTo: null, endedBy: null, rowVersion: 0 });
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/20/modules`).flush([
      { id: 1, curriculumVersionId: 20, title: 'Second', objectives: null, moduleOrder: 2, contentStatus: 'PUBLISHED', rowVersion: 0, publishedAt: '', publishedBy: 1, archivedAt: null, archivedBy: null },
      { id: 2, curriculumVersionId: 20, title: 'First', objectives: null, moduleOrder: 1, contentStatus: 'PUBLISHED', rowVersion: 0, publishedAt: '', publishedBy: 1, archivedAt: null, archivedBy: null }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/school/classes/7/curriculum-assignment/module-states`).flush([
      { id: 100, classCurriculumAssignmentId: 50, moduleId: 1, status: 'LOCKED', rowVersion: 0, releasedAt: null, releasedBy: null, completedAt: null, completedBy: null, withdrawnAt: null, withdrawnBy: null, withdrawReason: null, relockedAt: null, relockedBy: null, firstLearnerInteractionAt: null, firstLearnerInteractionBy: null, relockEligible: true },
      { id: 101, classCurriculumAssignmentId: 50, moduleId: 2, status: 'LOCKED', rowVersion: 0, releasedAt: null, releasedBy: null, completedAt: null, completedBy: null, withdrawnAt: null, withdrawnBy: null, withdrawReason: null, relockedAt: null, relockedBy: null, firstLearnerInteractionAt: null, firstLearnerInteractionBy: null, relockEligible: true }
    ]);

    const rows = fixture.componentInstance.rows();
    expect(rows.map(r => r.module.title)).toEqual(['First', 'Second']);
    expect(rows[0].state.id).toBe(101);
  });

  function flushReleasedModuleRow(relockEligible: boolean) {
    httpMock.expectOne(`${environment.apiUrl}/school/classes/7/curriculum-assignment`)
      .flush({ id: 50, classId: 7, curriculumVersionId: 20, activeFrom: '', activeTo: null, endedBy: null, rowVersion: 0 });
    httpMock.expectOne(`${environment.apiUrl}/school/curricula/versions/20/modules`).flush([
      { id: 1, curriculumVersionId: 20, title: 'Module', objectives: null, moduleOrder: 1, contentStatus: 'PUBLISHED', rowVersion: 0, publishedAt: '', publishedBy: 1, archivedAt: null, archivedBy: null }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/school/classes/7/curriculum-assignment/module-states`).flush([
      { id: 100, classCurriculumAssignmentId: 50, moduleId: 1, status: 'RELEASED', rowVersion: 0, releasedAt: '', releasedBy: 1, completedAt: null, completedBy: null, withdrawnAt: null, withdrawnBy: null, withdrawReason: null, relockedAt: null, relockedBy: null, firstLearnerInteractionAt: relockEligible ? null : '2026-06-01T00:00:00', firstLearnerInteractionBy: relockEligible ? null : 900, relockEligible }
    ]);
  }

  function findRelockButton(fixture: { nativeElement: HTMLElement }): HTMLButtonElement {
    const button = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find(b => b.textContent?.trim().includes('Re-lock')) as HTMLButtonElement | undefined;
    expect(button).toBeTruthy(); // Re-lock button should be rendered for a RELEASED module
    return button!;
  }

  it('disables the Re-lock button when relockEligible is false (interaction or issued assignment since release)', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushReleasedModuleRow(false);
    fixture.detectChanges();

    const relockButton = findRelockButton(fixture);
    expect(relockButton.disabled).toBe(true);
  });

  it('enables the Re-lock button when relockEligible is true', () => {
    const fixture = setup();
    fixture.detectChanges();
    flushReleasedModuleRow(true);
    fixture.detectChanges();

    const relockButton = findRelockButton(fixture);
    expect(relockButton.disabled).toBe(false);
  });
});
