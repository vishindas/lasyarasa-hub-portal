import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AssignmentAuthoringApiService } from './assignment-authoring-api.service';

describe('AssignmentAuthoringApiService (11 feature-scoped, answer-key-bearing endpoints)', () => {
  let service: AssignmentAuthoringApiService;
  let httpMock: HttpTestingController;
  const templates = `${environment.apiUrl}/school/assignments/templates`;
  const versions = `${environment.apiUrl}/school/assignments/versions`;
  const questions = `${environment.apiUrl}/school/assignments/questions`;
  const options = `${environment.apiUrl}/school/assignments/options`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AssignmentAuthoringApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('startDraft() -> POST /templates/:id/draft', () => {
    service.startDraft(1).subscribe();
    const req = httpMock.expectOne(`${templates}/1/draft`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('getVersion() -> GET /versions/:id', () => {
    service.getVersion(10).subscribe();
    const req = httpMock.expectOne(`${versions}/10`);
    expect(req.request.method).toBe('GET');
    req.flush({ questions: [] });
  });

  it('updateTitle() -> PUT /versions/:id/title', () => {
    service.updateTitle(10, { expectedRowVersion: 0, title: 't' }).subscribe();
    const req = httpMock.expectOne(`${versions}/10/title`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('createQuestion() -> POST /versions/:id/questions', () => {
    const body = { questionType: 'SHORT_TEXT' as const, prompt: 'p', questionOrder: 1, maxSelections: null };
    service.createQuestion(10, body).subscribe();
    const req = httpMock.expectOne(`${versions}/10/questions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('updateQuestion() -> PUT /questions/:id', () => {
    service.updateQuestion(30, { expectedRowVersion: 0, prompt: 'p', questionOrder: 1, maxSelections: null }).subscribe();
    const req = httpMock.expectOne(`${questions}/30`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('deleteQuestion() -> DELETE /questions/:id with expectedRowVersion body', () => {
    service.deleteQuestion(30, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${questions}/30`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ expectedRowVersion: 0 });
    req.flush(null);
  });

  it('createOption() -> POST /questions/:id/options', () => {
    service.createOption(30, { optionLabel: 'A', optionOrder: 1, isCorrect: true }).subscribe();
    const req = httpMock.expectOne(`${questions}/30/options`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('updateOption() -> PUT /options/:id', () => {
    service.updateOption(40, { expectedRowVersion: 0, optionLabel: 'A', optionOrder: 1, isCorrect: true }).subscribe();
    const req = httpMock.expectOne(`${options}/40`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('deleteOption() -> DELETE /options/:id with expectedRowVersion body', () => {
    service.deleteOption(40, { expectedRowVersion: 0 }).subscribe();
    const req = httpMock.expectOne(`${options}/40`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ expectedRowVersion: 0 });
    req.flush(null);
  });

  it('reorderQuestions() -> PUT /versions/:id/questions/reorder', () => {
    const body = { entries: [{ id: 1, expectedRowVersion: 0 }] };
    service.reorderQuestions(10, body).subscribe();
    const req = httpMock.expectOne(`${versions}/10/questions/reorder`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush([]);
  });

  it('reorderOptions() -> PUT /questions/:id/options/reorder', () => {
    const body = { entries: [{ id: 1, expectedRowVersion: 0 }] };
    service.reorderOptions(30, body).subscribe();
    const req = httpMock.expectOne(`${questions}/30/options/reorder`);
    expect(req.request.method).toBe('PUT');
    req.flush([]);
  });
});
