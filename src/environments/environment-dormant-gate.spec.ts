import { environment as devEnvironment } from './environment';
import { environment as prodEnvironment } from './environment.prod';

/**
 * Slice 12 verification-closure item #5: my-students.spec.ts only ever
 * exercised the live `environment` import, which the Angular test builder
 * always resolves to environment.ts -- ng test never applies the
 * production fileReplacement, so environment.prod.ts's committed value was
 * never actually asserted by any test. These two imports reference each
 * environment file by its own explicit path (not the replaceable
 * './environment' specifier), so both are read as real committed source
 * regardless of build configuration.
 */
describe('Student Learning dormant deployment gate (architect decision 4) -- both committed environment files', () => {
  it('environment.ts commits studentLearningEntryEnabled: false', () => {
    expect(devEnvironment.studentLearningEntryEnabled).toBe(false);
  });

  it('environment.prod.ts commits studentLearningEntryEnabled: false', () => {
    expect(prodEnvironment.studentLearningEntryEnabled).toBe(false);
  });
});
