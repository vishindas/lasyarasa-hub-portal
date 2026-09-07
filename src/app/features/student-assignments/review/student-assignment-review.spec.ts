import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { StudentAssignmentReviewComponent } from './student-assignment-review';
import { ClassroomLiteModeService } from '../../../core/services/classroom-lite-mode.service';
import { StudentAssignmentDetailDTO } from '../data-access/student-assignment.model';

function activatedRouteStub(params: Record<string, string>) {
  return { snapshot: { paramMap: convertToParamMap(params) } };
}

const base = `${environment.apiUrl}/account/students/201/learning/assignments`;
const DETAIL_URL = `${base}/5001`;
const DRAFTS_URL = `${base}/5001/draft`;

function detail(status: StudentAssignmentDetailDTO['status'] = 'DRAFT'): StudentAssignmentDetailDTO {
  return {
    id: 5001, instanceId: 6001, title: 'Quiz', dueAt: '2026-12-01T00:00:00', status, attemptNumber: status === 'DRAFT' ? 0 : 1,
    rowVersion: 5, instanceStatus: 'ACTIVE',
    questions: [
      { id: 1, questionType: 'SHORT_TEXT', prompt: 'Explain?', questionOrder: 1, maxSelections: null, options: [], editable: true },
      { id: 2, questionType: 'SHORT_TEXT', prompt: 'Also explain?', questionOrder: 2, maxSelections: null, options: [], editable: true }
    ]
  };
}

describe('StudentAssignmentReviewComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [StudentAssignmentReviewComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub({ studentId: '201', studentAssignmentId: '5001' }) }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentAssignmentReviewComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('blocks Submit until every editable question is answered, with an accurate count', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail());
    httpMock.expectOne(DRAFTS_URL).flush([{ questionId: 1, textResponse: 'answered', selectedOptionIds: [], rowVersion: 0 }]);
    fixture.detectChanges();
    expect(fixture.componentInstance.unansweredCount()).toBe(1);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('1 question needs an answer');
    const submitBtn = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(b => b.textContent?.trim() === 'Submit')!;
    expect(submitBtn.disabled).toBe(true);
  });

  it('enables Submit once every editable question has an answer', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail());
    httpMock.expectOne(DRAFTS_URL).flush([
      { questionId: 1, textResponse: 'a', selectedOptionIds: [], rowVersion: 0 },
      { questionId: 2, textResponse: 'b', selectedOptionIds: [], rowVersion: 0 }
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance.unansweredCount()).toBe(0);
  });

  it('submit() calls POST submit for a DRAFT assignment, resubmit() for REVISION_REQUESTED', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush(detail('REVISION_REQUESTED'));
    httpMock.expectOne(DRAFTS_URL).flush([
      { questionId: 1, textResponse: 'a', selectedOptionIds: [], rowVersion: 0 },
      { questionId: 2, textResponse: 'b', selectedOptionIds: [], rowVersion: 0 }
    ]);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    fixture.componentInstance.submit();
    const req = httpMock.expectOne(`${base}/5001/resubmit`);
    expect(req.request.body).toEqual({ expectedRowVersion: 5 });
    req.flush(detail('SUBMITTED'));
    expect(navSpy).toHaveBeenCalledWith(['/my-students', 201, 'assignments', 5001, 'confirmed'], { queryParams: { resubmitted: '1' } });
  });

  it('disables Submit under WRITE_FROZEN and shows the frozen note instead', () => {
    const fixture = setup();
    const mode = TestBed.inject(ClassroomLiteModeService);
    mode.setWriteFrozen();
    httpMock.expectOne(DETAIL_URL).flush(detail());
    httpMock.expectOne(DRAFTS_URL).flush([
      { questionId: 1, textResponse: 'a', selectedOptionIds: [], rowVersion: 0 },
      { questionId: 2, textResponse: 'b', selectedOptionIds: [], rowVersion: 0 }
    ]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('paused while learning is read-only');
  });

  it('UX-7B: folds module context into the existing meta line alongside the assignment title', () => {
    const fixture = setup();
    httpMock.expectOne(DETAIL_URL).flush({ ...detail(), moduleTitle: 'Foundations' });
    httpMock.expectOne(DRAFTS_URL).flush([]);
    fixture.detectChanges();

    const meta = (fixture.nativeElement as HTMLElement).querySelector('.meta');
    expect(meta?.textContent?.trim()).toBe('Quiz · Module: Foundations');
  });
});
