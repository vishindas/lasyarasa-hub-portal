import { TestBed } from '@angular/core/testing';
import { StudentAccessLossService } from './student-access-loss.service';

/** Correction 10: lost access is scoped per-student, never a session-global flag. */
describe('StudentAccessLossService', () => {
  it('starts with no lost access recorded', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(StudentAccessLossService).lostAccessFor()).toBeNull();
  });

  it('marking student A lost does not affect a check for student B (per-student scoping)', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(StudentAccessLossService);
    service.markLost(1);
    expect(service.lostAccessFor()).toBe(1);
    expect(service.lostAccessFor() === 2).toBe(false); // the currently-viewed-student check a consumer performs
  });

  it('clear() resets it, e.g. on navigating to a fresh student', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(StudentAccessLossService);
    service.markLost(1);
    service.clear();
    expect(service.lostAccessFor()).toBeNull();
  });
});
