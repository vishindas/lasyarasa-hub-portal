import { TestBed } from '@angular/core/testing';
import { ClassroomLiteModeService } from './classroom-lite-mode.service';

describe('ClassroomLiteModeService', () => {
  let service: ClassroomLiteModeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClassroomLiteModeService);
  });

  it('starts NORMAL with mutations enabled', () => {
    expect(service.mode()).toBe('NORMAL');
    expect(service.mutationsDisabled()).toBe(false);
  });

  it('setWriteFrozen() switches to WRITE_FROZEN and disables mutations', () => {
    service.setWriteFrozen();
    expect(service.mode()).toBe('WRITE_FROZEN');
    expect(service.mutationsDisabled()).toBe(true);
  });

  it('setFullOutage() switches to FULL_OUTAGE', () => {
    service.setFullOutage();
    expect(service.mode()).toBe('FULL_OUTAGE');
    expect(service.mutationsDisabled()).toBe(true);
  });

  it('once FULL_OUTAGE, a later setWriteFrozen() does not downgrade the mode', () => {
    service.setFullOutage();
    service.setWriteFrozen();
    expect(service.mode()).toBe('FULL_OUTAGE');
  });

  it('mode persists across multiple setWriteFrozen() calls for the session', () => {
    service.setWriteFrozen();
    service.setWriteFrozen();
    expect(service.mode()).toBe('WRITE_FROZEN');
  });
});
